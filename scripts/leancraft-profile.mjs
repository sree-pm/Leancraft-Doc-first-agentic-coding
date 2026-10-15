#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const profiles = {
  lean: { minPainThemes: 3, minSources: 3, minCompetitors: 2, minWedges: 1,
    minPersonas: 1, minUserFlows: 1, minFunctionalReqs: 3, minInvariants: 1, minOracles: 1 },
  standard: { minPainThemes: 8, minSources: 8, minCompetitors: 5, minWedges: 3,
    minPersonas: 3, minUserFlows: 2, minFunctionalReqs: 6, minInvariants: 2, minOracles: 2 },
  assured: { minPainThemes: 12, minSources: 12, minCompetitors: 9, minWedges: 5,
    minPersonas: 5, minUserFlows: 3, minFunctionalReqs: 10, minInvariants: 3, minOracles: 2 }
};
const target = process.argv[2], root = path.join(process.cwd(), ".leancraft"), cfgFile = path.join(root, "config.json");
if (!fs.existsSync(cfgFile)) { console.error("Run leancraft init first."); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
if (!target || target === "show") {
  console.log("Current profile: " + (cfg.profile || "assured (legacy defaults)"));
  console.log("Available: lean, standard, assured. No preset guarantees security or legal compliance.");
  process.exit(0);
}
if (!profiles[target]) { console.error("Usage: leancraft profile lean|standard|assured --by <reviewer> --reason <why>"); process.exit(2); }
if (cfg.locked) { console.error("Unlock, revise and re-review the human contract before changing validation thresholds."); process.exit(1); }
function value(name) { const idx = process.argv.indexOf("--" + name); return idx >= 0 ? process.argv[idx+1] : null; }
const by = value("by"), reason = value("reason");
if (!by || !by.trim() || !reason || !reason.trim()) {
  console.error("Profile changes require --by and --reason, recorded as a self-declared decision.");
  process.exit(2);
}
const min = profiles[target];
const mapping = [
  ["discovery","02-research.md",["minPainThemes","minSources"]],
  ["discovery","03-competitive.md",["minCompetitors","minWedges"]],
  ["discovery","04-personas.md",["minPersonas"]],
  ["discovery","06-prd.md",["minUserFlows","minFunctionalReqs"]],
  ["definition","intent.md",["minInvariants","minOracles"]]
];
for (const [section,file,keys] of mapping) {
  const rule = cfg.docRegistry?.[section]?.[file]?.rules;
  if (!rule) throw new Error("Malformed registry: missing " + section + "/" + file + " rules");
  for (const key of keys) rule[key] = min[key];
}
const before = cfg.profile || "legacy-defaults";
cfg.profile = target;
delete cfg.review;
fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + "\n");
const log = path.join(root, "joint/profile-decisions.jsonl");
fs.mkdirSync(path.dirname(log), { recursive: true });
fs.appendFileSync(log, JSON.stringify({
  id: randomUUID(), time: new Date().toISOString(), by: by.trim(), reason: reason.trim(), from: before, to: target,
  selfDeclared: true
}) + "\n");
console.log("Profile changed: " + before + " -> " + target + ". Review and lock the revised contract.");
console.log("Profiles change quantity thresholds only; evidence authenticity and operational security still require independent checks.");
