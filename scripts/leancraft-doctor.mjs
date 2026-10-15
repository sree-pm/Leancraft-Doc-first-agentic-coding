#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = process.cwd(), lc = path.join(root, ".leancraft"), strict = process.argv.includes("--strict");
const checks = [];
function record(label, condition, critical = false, detail = "") {
  checks.push({ label, status: condition ? "PASS" : critical ? "FAIL" : "WARN", detail });
}
record("Node >=22", Number(process.versions.node.split(".")[0]) >= 22, true);
const configFile = path.join(lc, "config.json");
let cfg;
try { cfg = JSON.parse(fs.readFileSync(configFile, "utf8")); record("valid LeanCraft config", true); }
catch { record("valid LeanCraft config", false, true); }
record("local MCP and validator runtime", ["mcp-server.mjs","leancraft-validate.mjs","leancraft-init.mjs",
 "leancraft-gate.mjs","leancraft-review.mjs","leancraft-verify.mjs","leancraft-contract.mjs","leancraft-trace.mjs"]
 .every(name => fs.existsSync(path.join(lc, "runtime", name))), true);
record("shared AGENTS.md", fs.existsSync(path.join(root, "AGENTS.md")));
record("MCP host config", fs.existsSync(path.join(root, ".mcp.json")));
record("Claude and OpenCode skills", [".claude/skills/leancraft/SKILL.md",".opencode/skills/leancraft/SKILL.md"].every(p => fs.existsSync(path.join(root, p))));
let git = false;
try { execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, stdio: "ignore" }); git = true; } catch {}
record("git worktree", git, false, "Git recommended for branch rules and reproducible release evidence.");
if (cfg) {
  record("configured real test commands", Array.isArray(cfg.quality?.commands) && cfg.quality.commands.length > 0, false,
   "Set config.quality.commands before a release.");
  let valid = false;
  try {
    execFileSync(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], { cwd: root, stdio: "pipe", timeout: 30000 });
    valid = true;
  } catch {}
  record("document contract complete", valid, false, "Draft templates intentionally fail validation.");
  record("reviewed and locked", Boolean(cfg.locked && cfg.review?.approvedBy), false, "Requires independent human review.");
}
if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: checks.every(x => x.status !== "FAIL") && (!strict || checks.every(x => x.status === "PASS")), checks }, null, 2));
else {
  for (const c of checks) console.log(c.status + " " + c.label + (c.status !== "PASS" ? ": " + c.detail : ""));
  console.log("Diagnosis: " + checks.filter(x => x.status === "FAIL").length + " errors, " + checks.filter(x => x.status === "WARN").length + " warnings.");
}
process.exitCode = checks.some(x => x.status === "FAIL" || (strict && x.status === "WARN")) ? 1 : 0;
