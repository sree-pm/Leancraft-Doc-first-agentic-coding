#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = process.cwd(), lc = path.join(root, ".leancraft");
const read = rel => { try { return fs.readFileSync(path.join(lc, rel), "utf8"); } catch { return ""; } };
if (!read("config.json")) { console.error("Run 'leancraft init' first."); process.exit(1); }
const cfg = JSON.parse(read("config.json"));
const now = new Date().toISOString();
let sha = "unavailable";
try { sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
const progressPath = path.join(lc, "agent/progress.md");
if (!fs.existsSync(progressPath)) fs.writeFileSync(progressPath, "# Agent Progress (persistent)\n\nRecord actual completed work, blockers and verification evidence here. This file is never overwritten by sync.\n");
const excerpt = (value, max = 2000) => value.slice(0, max).trim() || "(not documented)";
const dir = path.join(lc, "human/definition/features");
const features = fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith(".md") && !x.includes("example")) : [];
const context = [
  "# LeanCraft Context (derived, not authoritative)",
  "Generated: " + now + " | HEAD: " + sha + " | locked: " + Boolean(cfg.locked),
  "Always read the original human definition docs for decisions. This summary may be incomplete.",
  "## Intent", excerpt(read("human/definition/intent.md")),
  "## Guardrails", excerpt(read("human/definition/guardrails.md")),
  "## System", excerpt(read("human/definition/system.md")),
  "## Feature files", ...features.map(x => "- " + x),
  "## Persistent agent progress", excerpt(read("agent/progress.md"), 3000),
  "## Recent human decisions", excerpt(read("joint/decisions.log.md").split("\n").slice(-45).join("\n"), 3000),
  ""
].join("\n");
fs.mkdirSync(path.join(lc, "agent"), { recursive: true });
fs.writeFileSync(path.join(lc, "agent/context.md"), context.split("\n").slice(0, 500).join("\n"));
let validation = "not checked";
try {
  execFileSync(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], { cwd: root, stdio: "pipe" });
  validation = "PASS";
} catch { validation = "FAIL"; }
fs.writeFileSync(path.join(lc, "agent/status.md"), [
  "# LeanCraft Status (derived)", "Updated: " + now, "Commit: " + sha,
  "Documents: " + validation, "Review lock: " + Boolean(cfg.locked),
  "Feature documents: " + features.length,
  "Ongoing work is maintained in agent/progress.md, not this generated file.",
  "Budget: unavailable unless real metered usage events are recorded.",
  ""
].join("\n"));
fs.mkdirSync(path.join(lc, "joint"), { recursive: true });
fs.appendFileSync(path.join(lc, "joint/ledger.jsonl"), JSON.stringify({ ts: now, commit: sha, event: "sync", validation, metering: "unavailable" }) + "\n");
console.log("Context and derived status refreshed; persistent progress preserved; validation " + validation);
