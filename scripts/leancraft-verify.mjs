#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { contractDigest } from "./leancraft-contract.mjs";

const cwd = process.cwd(), root = path.join(cwd, ".leancraft"), cfgFile = path.join(root, "config.json");
if (!fs.existsSync(cfgFile)) { console.error("Run leancraft init first."); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
const commands = cfg.quality?.commands;
if (!Array.isArray(commands) || commands.length === 0) {
  console.error("No verification commands configured. Set config.quality.commands to arrays of program and arguments, e.g. [[\"npm\",\"test\"]].");
  process.exit(2);
}
let gitSha = null, gitClean = false;
try {
  gitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  gitClean = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "";
} catch {}
const manifest = createHash("sha256").update(JSON.stringify(cfg.lockedFiles || {})).digest("hex");
const maxMs = Math.max(1000, Math.min(900000, Number(cfg.quality?.timeoutMs) || 120000));
const results = [];
for (const args of commands) {
  if (!Array.isArray(args) || !args.length || !args.every(x => typeof x === "string" && x.length > 0 && x.length < 1000)) {
    console.error("Verification commands must be nonempty arrays of string argv tokens.");
    process.exit(2);
  }
  const [executable, ...argv] = args;
  let binary = executable, realArgs = argv;
  // Windows npm.cmd is a command-shell shim; invoke its real JavaScript CLI without a shell.
  if (process.platform === "win32" && (executable === "npm" || executable === "npx")) {
    const probable = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    const cli = probable.endsWith(".js") && fs.existsSync(probable) ? probable :
      path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    if (fs.existsSync(cli)) {
      binary = process.execPath;
      realArgs = [cli, ...(executable === "npx" ? ["exec", "--"] : []), ...argv];
    }
  }
  console.log("RUN " + JSON.stringify(args));
  const started = Date.now();
  // node:test sets NODE_TEST_CONTEXT in its worker process. If inherited, a nested
  // 'node --test' invocation can silently SKIP tests with exit code 0.
  // Strip only that internal runner marker; preserve normal project environment.
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const run = spawnSync(binary, realArgs, { cwd, env: childEnv, shell: false, encoding: "utf8", timeout: maxMs, maxBuffer: 1024 * 1024 });
  const status = run.status === null ? 1 : run.status;
  const entry = {
    argv: args, exitCode: status, durationMs: Date.now() - started,
    passed: !run.error && status === 0,
    error: run.error ? run.error.code || run.error.message : null,
    outputDigest: createHash("sha256").update((run.stdout || "") + (run.stderr || "")).digest("hex")
  };
  results.push(entry);
  console.log((entry.passed ? "PASS " : "FAIL ") + JSON.stringify(args) + " (exit " + status + ")");
}
const output = {
  schemaVersion: 1, recordedAt: new Date().toISOString(), commit: gitSha, cleanTrackedTree: gitClean,
  reviewApprovalId: cfg.review?.approvalId || null, manifest, contractDigest: contractDigest(cfg),
  passed: results.every(x => x.passed), results
};
const file = path.join(root, "joint/verification.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(output, null, 2) + "\n");
console.log("Stored actual exit codes and SHA-256 output digests in .leancraft/joint/verification.json");
console.log("No raw console output, environment variables or secrets were stored in the report.");
if (!output.passed) process.exitCode = 1;
