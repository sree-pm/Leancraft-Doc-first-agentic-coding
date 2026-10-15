#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(process.cwd(), ".leancraft"), configFile = path.join(root, "config.json");
if (!fs.existsSync(configFile)) { console.error("Run leancraft init first."); process.exit(1); }
const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
let verified;
try { verified = JSON.parse(fs.readFileSync(path.join(root, "joint/verification.json"), "utf8")); } catch {}
let gitSha = null;
try { gitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
let valid = false;
try {
  execFileSync(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], { cwd: process.cwd(), stdio: "pipe" });
  valid = true;
} catch {}
const files = path.join(root, "human/definition/features");
const features = fs.existsSync(files) ? fs.readdirSync(files).filter(f => f.endsWith(".md") && !f.includes("example")).length : 0;
const report = {
  project: config.name || "project", documentValid: valid,
  reviewed: Boolean(config.review?.approvedBy), reviewer: config.review?.approvedBy || null,
  locked: Boolean(config.locked), features,
  verificationRecorded: Boolean(verified), verificationPassed: Boolean(verified?.passed),
  verificationMatchesCommit: Boolean(gitSha && verified?.commit === gitSha),
  gitSha, generatedAt: new Date().toISOString()
};
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else for (const [key, value] of Object.entries(report)) console.log(key + ": " + value);
