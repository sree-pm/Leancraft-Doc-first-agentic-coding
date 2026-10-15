#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
let hooksPath;
try { hooksPath = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
catch { console.error("LeanCraft: git not initialised. Optional hook skipped."); process.exit(0); }
const dir = path.resolve(root, hooksPath), target = path.join(dir, "pre-commit");
if (fs.existsSync(target)) { console.error("LeanCraft: existing pre-commit hook preserved; configure validation in your hook manager."); process.exit(0); }
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(target, [
 "#!/bin/sh", "# LeanCraft cooperative local guard; branch protections and CI provide review enforcement.",
 "set -eu", "if [ -f .leancraft/config.json ] && [ -f .leancraft/runtime/leancraft-validate.mjs ]; then",
 "  LOCKED=$(node -p \"JSON.parse(require('fs').readFileSync('.leancraft/config.json','utf8')).locked\" 2>/dev/null || echo false)",
 "  if [ \"$LOCKED\" = \"true\" ]; then node .leancraft/runtime/leancraft-validate.mjs; fi",
 "fi", ""
].join("\n"), { mode: 0o755 });
console.log("LeanCraft optional lock-state validation hook installed.");
