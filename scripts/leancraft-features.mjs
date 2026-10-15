#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const cwd = process.cwd(), lc = path.join(cwd, ".leancraft");
const cfg = JSON.parse(fs.readFileSync(path.join(lc, "config.json"), "utf8"));
if (cfg.locked) { console.error("Locked: create proposals instead of modifying human feature docs."); process.exit(1); }
const prd = fs.readFileSync(path.join(lc, "human/discovery/06-prd.md"), "utf8");
const flows = [...prd.matchAll(/^###\s+Flow\s+(?:\d+\s*:?\s*)?(.+)$/gm)].map(m => m[1].trim()).filter(Boolean);
const dest = path.join(lc, "human/definition/features"), template = fs.readFileSync(path.join(lc, "templates/definition/feature.md"), "utf8");
fs.mkdirSync(dest, { recursive: true });
let created = 0;
for (let i = 0; i < flows.length; i++) {
  const slug = flows[i].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "flow";
  const filename = String(i + 42).padStart(3, "0") + "-" + slug + ".md";
  const destFile = path.join(dest, filename);
  if (fs.existsSync(destFile)) continue;
  const text = template.replace(/\[NNN-kebab-case, e\.g\., 042-pdf-export\]/, filename.slice(0, -3)).replace(/\[1 paragraph, distilled from 06-prd\.md Flow N\]/, "Flow " + (i + 1) + ": " + flows[i]);
  fs.writeFileSync(destFile, text);
  created++;
}
console.log("PRD flows: " + flows.length + "; feature drafts created: " + created + ". Complete trace links, then validate.");
