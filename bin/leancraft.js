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
function copyMissing(src, dest, refresh = false) {
  if (!fs.existsSync(src)) return;
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) copyMissing(path.join(src, name), path.join(dest, name), refresh);
  } else if (!fs.existsSync(dest) || refresh) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}
function init() {
  const refresh = args.includes("--force");
  const root = path.join(cwd, ".leancraft");
  const fresh = !fs.existsSync(root);
  const source = path.join(pkgRoot, ".leancraft");
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(source)) {
      // Never overwrite human decisions, research, agent progress or joint audit trails.
      copyMissing(path.join(source, entry), path.join(root, entry), refresh && entry === "templates");
    }
  } else {
    copyMissing(source, root);
  }
  if (fresh) {
    // An installed project must not inherit example repository history or stale agent context.
    fs.writeFileSync(path.join(root, "joint/ledger.jsonl"), "");
    fs.writeFileSync(path.join(root, "joint/decisions.log.md"), "# Decisions\n\nRecord approved decisions with sources.\n");
    fs.writeFileSync(path.join(root, "agent/progress.md"), "# Agent Progress\n\nNo implementation has been verified yet.\n");
  }
  const runtime = path.join(root, "runtime");
  fs.mkdirSync(runtime, { recursive: true });
  for (const name of fs.readdirSync(path.join(pkgRoot, "scripts"))) {
    if (name.endsWith(".mjs")) copyMissing(path.join(pkgRoot, "scripts", name), path.join(runtime, name), refresh);
  }
  fs.writeFileSync(path.join(runtime, "VERSION"), pkg.version + "\n");
  for (const file of [
    "AGENTS.md", "CLAUDE.md", ".mcp.json", ".claude/skills/leancraft/SKILL.md",
    ".opencode/skills/leancraft/SKILL.md", ".cursor/rules/leancraft.mdc"
  ]) copyMissing(path.join(pkgRoot, file), path.join(cwd, file), refresh && file !== ".github/CODEOWNERS" && file !== "AGENTS.md" && file !== "CLAUDE.md" && file !== ".mcp.json");
  run("install-hooks.mjs", []);
  if (fresh) run("leancraft-sync.mjs", []);
  console.log("Set CODEOWNERS and branch rules explicitly for YOUR repository owner. LeanCraft will not inject its own maintainer.");
  console.log("LeanCraft scaffold ready. Fill human docs, run 'npx leancraft validate', then 'npx leancraft lock'.");
  console.log("Existing human docs were preserved. The lock is a workflow safeguard, not an OS sandbox.");
}
function help() {
  console.log("LeanCraft " + pkg.version + "\n" +
    "  npx leancraft init [--force]    Scaffold or refresh managed runtime without replacing human docs\n" +
    "  npx leancraft validate [--fetch]  Validate user-authored documents\n" +
    "  npx leancraft templates        Check bundled templates and registry\n" +
    "  npx leancraft lock|unlock      Record human document review state\n" +
    "  npx leancraft sync             Refresh derived context; preserve progress\n" +
    "  npx leancraft features         Draft documents for PRD flows (when unlocked)\n" +
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
else if (command === "budget") run("leancraft-budget.mjs");
else if (command === "status") run("leancraft-validate.mjs");
else if (command === "mcp") console.log(JSON.stringify({ mcpServers: { leancraft: { command: process.execPath, args: [path.join(cwd, ".leancraft/runtime/mcp-server.mjs")] } } }, null, 2));
else { console.error("Unknown command: " + command); help(); process.exitCode = 2; }
