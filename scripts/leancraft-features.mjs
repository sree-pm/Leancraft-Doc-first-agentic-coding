#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd(), lc = path.join(cwd, ".leancraft");
const cfgFile = path.join(lc, "config.json");
if (!fs.existsSync(cfgFile)) { console.error("Run init first."); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
if (cfg.locked) { console.error("Human contract locked. Submit a change proposal, then unlock for human review."); process.exit(1); }
const dry = process.argv.includes("--dry-run");
const prdFile = path.join(lc, "human/discovery/06-prd.md");
if (!fs.existsSync(prdFile)) { console.error("Missing discovery PRD."); process.exit(1); }
const prd = fs.readFileSync(prdFile, "utf8");
const flows = [...prd.matchAll(/^###\s+Flow\s+(\d+)\s*:\s*(.+)$/gm)].map(m => ({
  id: m[1], description: m[2].trim()
}));
if (!flows.length) { console.error("No numbered ### Flow N: headings found in PRD."); process.exit(1); }
const fileDir = path.join(lc, "human/definition/features");
const template = fs.readFileSync(path.join(lc, "templates/definition/feature.md"), "utf8");
if (!dry) fs.mkdirSync(fileDir, { recursive: true });
const refs = new Map(flows.map(f => [f.id, []]));
for (const line of prd.split(/\r?\n/)) {
  const cells = line.split("|").map(x => x.trim());
  if (cells.length < 6) continue;
  const id = /^FR-(\d+)$/.exec(cells[1] || "");
  const flow = /^F(?:low\s*)?(\d+)$/i.exec(cells[4] || "");
  if (id && flow && refs.has(flow[1])) refs.get(flow[1]).push("FR-" + id[1]);
}
let created = 0, existing = 0;
for (const flow of flows) {
  const slug = flow.description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "feature";
  const filename = String(flow.id).padStart(3, "0") + "-" + slug + ".md";
  const target = path.join(fileDir, filename);
  // Never replace prior user-authored feature contracts.
  if (fs.existsSync(target)) { existing++; continue; }
  let doc = template.replace(/\[NNN-kebab-case, e\.g\., 042-pdf-export\]/, filename.slice(0, -3))
    .replace(/\[1 paragraph, distilled from 06-prd\.md Flow N\]/, "Flow " + flow.id + ": " + flow.description);
  const persona = /\bPersona:\s*(?:P(?:ersona)?\s*)?(\d+)/i.exec(flow.description);
  doc += "\n## Traceability (draft; validate before lock)\n\n";
  doc += "- Flow " + flow.id + "\n";
  doc += "- Persona " + (persona ? persona[1] : "TODO: identify in PRD") + "\n";
  doc += "- Requirements: " + (refs.get(flow.id).join(", ") || "TODO: link FR IDs") + "\n";
  if (!dry) fs.writeFileSync(target, doc, { flag: "wx" });
  console.log((dry ? "WOULD CREATE " : "CREATED ") + filename);
  created++;
}
console.log(flows.length + " flows, " + created + (dry ? " pending" : " created") + ", " + existing + " already present.");
console.log("New feature files are DRAFT. Complete the acceptance criteria and real source traces before locking.");
