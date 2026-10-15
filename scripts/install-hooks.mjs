#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
let gitDir;
try {
  gitDir = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch {
  console.error("LeanCraft: no git repository; skipped optional commit hook.");
  process.exit(0);
}
const hooksDir = path.resolve(root, gitDir);
const hook = path.join(hooksDir, "pre-commit");
if (fs.existsSync(hook)) {
  console.error("LeanCraft: existing pre-commit hook preserved. Integrate 'node .leancraft/runtime/leancraft-validate.mjs' manually if desired.");
  process.exit(0);
}
fs.mkdirSync(hooksDir, { recursive: true });
const content = [
  "#!/bin/sh",
  "# LeanCraft optional local check. CI is the authoritative gate.",
  "set -eu",
  "if [ -f .leancraft/config.json ]; then",
  "  node .leancraft/runtime/leancraft-validate.mjs",
  "fi",
  ""
].join("\n");
fs.writeFileSync(hook, content, { mode: 0o755 });
console.log("LeanCraft optional pre-commit validation hook installed.");
