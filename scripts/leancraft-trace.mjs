#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), ".leancraft");
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
const prd = read("human/discovery/06-prd.md");
const persona = read("human/discovery/04-personas.md");
if (!prd) { console.error("Missing PRD."); process.exit(1); }
const flows = [...new Set([...prd.matchAll(/^###\s+Flow\s+(\d+)\b/gmi)].map(x => x[1]))];
const requirements = [...new Set([...prd.matchAll(/\bFR-(\d+)\b/g)].map(x => x[1]))];
const personas = [...new Set([...persona.matchAll(/^##\s+Persona\s+(\d+)/gm)].map(x => x[1]))];
const directory = path.join(root, "human/definition/features");
const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(x => x.endsWith(".md") && !x.includes("example")) : [];
const source = files.map(name => ({ name, text: read("human/definition/features/" + name) }));
const issues = [];
for (const f of flows) if (!source.some(x => new RegExp("\\bFlow\\s+" + f + "\\b","i").test(x.text))) issues.push("Flow " + f + " has no feature trace");
for (const id of requirements) if (!source.some(x => new RegExp("\\bFR-" + id + "\\b").test(x.text))) issues.push("FR-" + id + " has no feature trace");
for (const feature of source) {
  for (const [, id] of feature.text.matchAll(/\bFR-(\d+)\b/g)) if (!requirements.includes(id)) issues.push(feature.name + ": unknown FR-" + id);
  for (const [, id] of feature.text.matchAll(/\bFlow\s+(\d+)\b/gi)) if (!flows.includes(id)) issues.push(feature.name + ": unknown Flow " + id);
  for (const [, id] of feature.text.matchAll(/\bPersona\s+(\d+)\b/gi)) if (!personas.includes(id)) issues.push(feature.name + ": unknown Persona " + id);
}
console.log(JSON.stringify({
  ok: issues.length === 0, flows: flows.length, requirements: requirements.length,
  personas: personas.length, features: files.length, issues
}, null, 2));
if (issues.length) process.exitCode = 1;
