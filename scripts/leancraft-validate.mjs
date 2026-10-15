#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd(), lc = path.join(root, ".leancraft");
const configFile = path.join(lc, "config.json");
const errors = [], warnings = [];
const templatesOnly = process.argv.includes("--templates");
const fetchURLs = process.argv.includes("--fetch");
function read(rel) { try { return fs.readFileSync(path.join(lc, rel), "utf8"); } catch { return null; } }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function headings(content) { return [...content.matchAll(/^#{2,4}\s+(.+)$/gm)].map(m => slug(m[1])); }
function validURLs(content) {
  const found = content.match(/https?:\/\/[^\s<>"'()[\]]+/g) || [];
  return [...new Set(found.map(x => x.replace(/[.,;:!]+$/, "")).filter(x => {
    try { const u = new URL(x); return ["http:", "https:"].includes(u.protocol) && u.hostname.includes(".") && !u.hostname.includes("..."); }
    catch { return false; }
  }))];
}
function placeholder(content) {
  return /\[FILL:[^\]]*\]|\[(?:verbatim|Theme|Name|persona|feature-specific|1 paragraph[^\]]*|e\.g\.[^\]]*)\]|\bTODO:\s*(?!completed)/i.test(content);
}
function sections(name, text, required) {
  const existing = headings(text);
  for (const heading of required || []) {
    if (!existing.some(h => h.includes(slug(heading)) || slug(heading).includes(h) && h.length >= 5))
      errors.push(name + ": missing heading " + heading);
  }
}
let cfg;
try { cfg = JSON.parse(fs.readFileSync(configFile, "utf8")); }
catch (e) { console.error("LeanCraft validation failed: invalid/missing .leancraft/config.json: " + e.message); process.exit(1); }
if (!cfg.docRegistry || typeof cfg.docRegistry !== "object") { console.error("Invalid docRegistry"); process.exit(1); }
for (const [group, docs] of Object.entries(cfg.docRegistry)) {
  for (const [name, spec] of Object.entries(docs)) {
    if (!spec || typeof spec !== "object") continue;
    if (spec.template && !read(spec.template)) errors.push("Missing bundled template " + spec.template);
    if (templatesOnly || group === "conditional") continue;
    if (name.includes("*")) continue;
    const rel = "human/" + group + "/" + name;
    const content = read(rel);
    if (content === null) { if (spec.required) errors.push("Missing required document " + rel); else warnings.push("Optional document absent " + rel); continue; }
    if (placeholder(content)) errors.push(rel + ": unresolved placeholder");
    sections(rel, content, spec.sections);
    const rules = spec.rules || {};
    const pains = [...content.matchAll(/^#{2,3}\s+(P\d+)\s*:/gm)];
    if (rules.minPainThemes && new Set(pains.map(m => m[1])).size < rules.minPainThemes) errors.push(rel + ": not enough distinct pain themes");
    if (rules.minSources && validURLs(content).length < rules.minSources) errors.push(rel + ": not enough distinct valid URLs");
    if (rules.requireQuoteAndURL) {
      const blocks = content.split(/^#{2,3}\s+P\d+\s*:/gm).slice(1);
      for (const [i, block] of blocks.entries()) {
        if (!/\bQuote\s*:/i.test(block) || !/\bDate\s*:/i.test(block) || validURLs(block).length === 0)
          errors.push(rel + ": pain block " + (i + 1) + " lacks quote, date or valid URL");
      }
    }
    if (rules.minCompetitors) {
      const rows = content.split("\n").filter(l => /^\|/.test(l) && !/^\|[\s\-:|]+\|?$/.test(l));
      // Require competitors with at least one link, rather than counting separator or header lines.
      if (rows.filter(l => validURLs(l).length > 0).length < rules.minCompetitors) errors.push(rel + ": fewer than " + rules.minCompetitors + " sourced competitor rows");
    }
    if (rules.requirePricingWithCurrency && !/[£€$]\s*\d/.test(content)) errors.push(rel + ": no numeric price with currency");
    if (rules.minWedges && (content.match(/^\s*\d+[.)]\s+.+$/gm) || []).length < rules.minWedges) errors.push(rel + ": insufficient numbered wedges");
    if (rules.minPersonas && new Set([...content.matchAll(/^##\s+Persona\s+(\d+)/gm)].map(m => m[1])).size < rules.minPersonas) errors.push(rel + ": insufficient distinct personas");
    if (rules.minUserFlows && new Set([...content.matchAll(/^###\s+Flow\s+(\d+)/gm)].map(m => m[1])).size < rules.minUserFlows) errors.push(rel + ": insufficient distinct user flows");
    if (rules.minFunctionalReqs && new Set([...content.matchAll(/\bFR-(\d+)\b/g)].map(m => m[1])).size < rules.minFunctionalReqs) errors.push(rel + ": insufficient distinct functional requirements");
    if (rules.minInvariants && new Set([...content.matchAll(/\*\*I(\d+):/g)].map(m => m[1])).size < rules.minInvariants) errors.push(rel + ": insufficient distinct invariants");
    if (rules.minOracles && new Set([...content.matchAll(/\*\*O(\d+):/g)].map(m => m[1])).size < rules.minOracles) errors.push(rel + ": insufficient distinct oracles");
  }
}
if (!templatesOnly && cfg.locked) {
  if (!cfg.lockedFiles || typeof cfg.lockedFiles !== "object") errors.push("Locked document manifest missing; unlock and relock after review");
  else {
    const dir = path.join(lc, "human");
    const found = {};
    function visit(current) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isSymbolicLink()) { errors.push("Locked document tree contains symbolic link " + full); continue; }
        if (entry.isDirectory()) visit(full);
        else if (entry.isFile()) found[path.relative(dir, full).split(path.sep).join("/")] = createHash("sha256").update(fs.readFileSync(full)).digest("hex");
      }
    }
    if (fs.existsSync(dir)) visit(dir);
    for (const name of new Set([...Object.keys(found), ...Object.keys(cfg.lockedFiles)]))
      if (found[name] !== cfg.lockedFiles[name]) errors.push("Locked human document changed: " + name);
  }
}
if (!templatesOnly) {
  const prd = read("human/discovery/06-prd.md") || "";
  const flows = new Set([...prd.matchAll(/^###\s+Flow\s+(\d+)/gm)].map(m => m[1])).size;
  const dir = path.join(lc, "human/definition/features");
  const features = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".md") && !f.includes("example")) : [];
  if (flows > features.length) errors.push("One feature document per PRD flow is required (" + flows + " flows, " + features.length + " feature documents)");
  for (const name of features) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    if (placeholder(text)) errors.push("Feature " + name + ": unresolved placeholder");
    sections(name, text, cfg.docRegistry.definition?.["features/*.md"]?.sections || []);
    if (!/\bFR-\d+\b/.test(text) || !/\bPersona\b/i.test(text) || !/\bFlow\b/i.test(text)) errors.push("Feature " + name + ": missing FR / Persona / Flow trace");
  }
  for (const name of Object.keys(cfg.docRegistry.conditional || {})) {
    const content = read("human/discovery/" + name);
    if (content && placeholder(content)) errors.push("Conditional doc " + name + ": unresolved placeholder");
  }
  if (fetchURLs) {
    for (const doc of ["human/discovery/02-research.md", "human/discovery/03-competitive.md"]) {
      for (const url of validURLs(read(doc) || "").slice(0, 20)) {
        try {
          const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "follow" });
          if (!response.ok) warnings.push(doc + ": HEAD status " + response.status + " for " + url);
        } catch (e) { warnings.push(doc + ": cannot verify URL " + url + ": " + e.message); }
      }
    }
    warnings.push("HTTP status is not proof that quotes, dates or prices are authentic.");
  }
}
console.log("LeanCraft " + (templatesOnly ? "template" : "document") + " validation");
for (const warning of warnings) console.log("WARN " + warning);
for (const error of errors) console.log("FAIL " + error);
console.log(errors.length ? "FAIL (" + errors.length + " errors)" : "PASS");
process.exitCode = errors.length ? 1 : 0;
