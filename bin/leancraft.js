#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args[0];
const cwd = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));

function run(script, extra = args.slice(1)) {
  try {
    execFileSync(process.execPath, [path.join(pkgRoot, "scripts", script), ...extra], { cwd, stdio: "inherit" });
  } catch (error) {
    process.exit(error.status || 1);
  }
}
function init() { run("leancraft-init.mjs", args.slice(1)); }
function help() {
  console.log("LeanCraft " + pkg.version + "\n" +
    "  npx leancraft init [--force]    Scaffold or refresh managed runtime without replacing human docs\n" +
    "  npx leancraft validate [--fetch]  Validate user-authored documents\n" +
    "  npx leancraft templates        Check bundled templates and registry\n" +
    "  npx leancraft lock|unlock      Record human document review state\n" +
    "  npx leancraft sync             Refresh derived context; preserve progress\n" +
    "  npx leancraft features         Draft documents for PRD flows (when unlocked)\n" +
    "  npx leancraft approve --by <human>  Record a self-declared review after lock\n" +
    "  npx leancraft revoke --by <human> --reason <text>\n" +
    "  npx leancraft verify           Execute configured quality commands and record evidence\n" +
    "  npx leancraft gate build|release  Check readiness and freshness\n" +
    "  npx leancraft trace            Report FR, Flow and Persona traceability\n" +
    "  npx leancraft doctor|status|budget|mcp\n");
}
if (!command || ["help", "-h", "--help"].includes(command)) help();
else if (["version", "-v", "--version"].includes(command)) console.log(pkg.version);
else if (command === "init") init();
else if (command === "validate") run("leancraft-validate.mjs");
else if (command === "templates") run("leancraft-validate.mjs", ["--templates"]);
else if (command === "lock" || command === "unlock") run("leancraft-lock.mjs", [command]);
else if (command === "sync") run("leancraft-sync.mjs");
else if (command === "features") run("leancraft-features.mjs");
else if (command === "doctor") run("leancraft-doctor.mjs");
else if (command === "approve" || command === "revoke") run("leancraft-review.mjs", [command, ...args.slice(1)]);
else if (command === "verify") run("leancraft-verify.mjs", []);
else if (command === "gate") run("leancraft-gate.mjs");
else if (command === "trace") run("leancraft-trace.mjs", []);
else if (command === "budget") run("leancraft-budget.mjs");
else if (command === "status") run("leancraft-validate.mjs");
else if (command === "mcp") console.log(JSON.stringify({ mcpServers: { leancraft: { command: process.execPath, args: [path.join(cwd, ".leancraft/runtime/mcp-server.mjs")] } } }, null, 2));
else { console.error("Unknown command: " + command); help(); process.exitCode = 2; }
