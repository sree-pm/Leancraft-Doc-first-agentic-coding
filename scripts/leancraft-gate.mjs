#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { contractDigest } from "./leancraft-contract.mjs";

const kind = process.argv[2] || "build";
if (!["build", "release"].includes(kind)) { console.error("Usage: leancraft gate build|release"); process.exit(2); }
const cwd = process.cwd(), root = path.join(cwd, ".leancraft");
const cfgFile = path.join(root, "config.json"), errors = [];
if (!fs.existsSync(cfgFile)) { console.error("Run init first."); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
function check(label, okay) { console.log((okay ? "PASS " : "FAIL ") + label); if (!okay) errors.push(label); }
const validation = execFileSyncSafe(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], cwd);
check("document contract", validation);
check("human contract locked", cfg.locked === true && cfg.lockedFiles && Object.keys(cfg.lockedFiles).length > 0);
check("human review recorded for current lock", Boolean(cfg.review?.approvedBy && cfg.review?.approvalId && cfg.review?.lockedAt === cfg.lockedAt));
check("review matches current configuration and human documents", Boolean(cfg.review?.contractDigest === contractDigest(cfg)));
check("all PRD flows and FRs traced into valid feature specs", execFileSyncSafe(process.execPath, [fileURLToPath(new URL("./leancraft-trace.mjs", import.meta.url))], cwd));
if (kind === "release") {
  let report;
  try { report = JSON.parse(fs.readFileSync(path.join(root, "joint/verification.json"), "utf8")); } catch {}
  check("verification report exists and passes", Boolean(report && report.passed === true && report.results?.length > 0 && report.results.every(r => r.passed && r.exitCode === 0)));
  const manifest = createHash("sha256").update(JSON.stringify(cfg.lockedFiles || {})).digest("hex");
  check("verification matches current approved contract", Boolean(report && report.manifest === manifest && report.reviewApprovalId === cfg.review?.approvalId && report.contractDigest === contractDigest(cfg)));
  let sha = null, clean = false;
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    clean = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "";
  } catch {}
  check("verification matches Git commit and no tracked changes", Boolean(report && sha && report.commit === sha && clean && report.cleanTrackedTree));
}
console.log((errors.length ? "BLOCKED" : "READY") + " [" + kind + " gate] " + errors.length + " failed condition(s).");
if (errors.length) process.exitCode = 1;
function execFileSyncSafe(file, args, cwd) {
  try { execFileSync(file, args, { cwd, stdio: "pipe", timeout: 30000 }); return true; }
  catch { return false; }
}
