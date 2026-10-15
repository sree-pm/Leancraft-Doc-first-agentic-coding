#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
function hashes(dir, base = dir) {
  const result = {};
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Cannot lock symbolic links in human documents: " + full);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result[path.relative(base, full).split(path.sep).join("/")] = createHash("sha256").update(fs.readFileSync(full)).digest("hex");
    }
  }
  visit(dir);
  return result;
}

const action = process.argv[2];
if (!["lock", "unlock"].includes(action)) { console.error("Usage: leancraft lock|unlock"); process.exit(2); }
const configPath = path.join(process.cwd(), ".leancraft/config.json");
if (!fs.existsSync(configPath)) { console.error("Run 'leancraft init' first."); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (action === "lock") {
  try {
    execFileSync(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], { cwd: process.cwd(), stdio: "inherit" });
  } catch { console.error("Cannot lock while validation fails."); process.exit(1); }
}
cfg.locked = action === "lock";
// Any re-lock or unlock invalidates the previous explicit approval, even if files are identical.
delete cfg.review;
if (cfg.locked) cfg.lockedFiles = hashes(path.join(process.cwd(), ".leancraft/human"));
else delete cfg.lockedFiles;
cfg.lockedAt = cfg.locked ? new Date().toISOString() : null;
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
console.log(cfg.locked ? "Review state: LOCKED. Agents must submit proposals." : "Review state: UNLOCKED. Revalidate before locking again.");
console.log("Note: CLI lock cannot restrict a process with filesystem or shell write permissions.");
