#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lcRoot = path.resolve(root, ".leancraft");
const configPath = path.join(lcRoot, "config.json");
if (!fs.existsSync(configPath)) { console.error("LeanCraft not initialised; denying write."); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const target = process.argv[2];
if (!target) { console.error("Usage: guard-write <file-path>"); process.exit(2); }
const managed = /^(human|agent|joint|templates|runtime)\//.test(target.replace(/\\/g, "/"));
const abs = path.isAbsolute(target) ? path.resolve(target) : path.resolve(root, managed ? ".leancraft/" + target : target);
const relative = path.relative(lcRoot, abs).split(path.sep).join("/");
const forbidden = relative === "human" || relative.startsWith("human/");
if (cfg.locked && forbidden) {
  console.error("BLOCKED: human documents are locked. Create a proposal under .leancraft/agent/proposals/.");
  process.exit(1);
}
if (relative.startsWith("../") || relative === "..") { console.error("Path outside LeanCraft tree."); process.exit(1); }
console.log("ALLOWED: " + relative);
