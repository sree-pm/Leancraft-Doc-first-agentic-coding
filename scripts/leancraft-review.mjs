#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { contractDigest } from "./leancraft-contract.mjs";

const root = path.join(process.cwd(), ".leancraft");
const configPath = path.join(root, "config.json");
const action = process.argv[2];
if (!["approve", "revoke"].includes(action)) {
  console.error("Usage: leancraft approve --by <reviewer> [--reason <text>] | leancraft revoke --by <reviewer> --reason <text>");
  process.exit(2);
}
if (!fs.existsSync(configPath)) { console.error("Run leancraft init first"); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
function value(name) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const reviewer = value("by"), reason = value("reason") || (action === "approve" ? "Reviewed documented contract" : "");
if (!reviewer || !reviewer.trim() || reviewer.length > 150 || reason.length > 2000) {
  console.error("Provide a named reviewer using --by, and keep the reason concise.");
  process.exit(2);
}
if (action === "approve" && !cfg.locked) {
  console.error("Lock a fully validated contract before recording review.");
  process.exit(1);
}
if (action === "revoke" && !reason.trim()) {
  console.error("A revocation reason is required.");
  process.exit(2);
}
const record = {
  id: randomUUID(), action, reviewer: reviewer.trim(), reason: reason.trim(),
  timestamp: new Date().toISOString(),
  lockedAt: cfg.lockedAt || null
};
if (action === "approve") cfg.review = { approvedBy: reviewer.trim(), approvalId: record.id, lockedAt: cfg.lockedAt, approvedAt: record.timestamp, contractDigest: contractDigest(cfg) };
else delete cfg.review;
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
const log = path.join(root, "joint/reviews.jsonl");
fs.mkdirSync(path.dirname(log), { recursive: true });
fs.appendFileSync(log, JSON.stringify(record) + "\n");
console.log("Review recorded: " + action + " by " + reviewer + ".");
console.log("Review identity is self-declared, not authenticated. Enforce protected-branch approval externally.");
