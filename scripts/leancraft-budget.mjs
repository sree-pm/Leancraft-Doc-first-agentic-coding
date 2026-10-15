#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd(), configFile = path.join(root, ".leancraft/config.json"), ledger = path.join(root, ".leancraft/joint/ledger.jsonl");
if (!fs.existsSync(configFile)) { console.error("No configuration. Run init."); process.exit(1); }
const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
let cost = 0, calls = 0, metered = 0, missing = 0;
if (fs.existsSync(ledger)) for (const row of fs.readFileSync(ledger, "utf8").split("\n").filter(Boolean)) {
  let entry; try { entry = JSON.parse(row); } catch { missing++; continue; }
  if (typeof entry.cost === "number" && typeof entry.calls === "number") { cost += entry.cost; calls += entry.calls; metered++; }
  else missing++;
}
console.log("Configured advisory budget: $" + config.budget.maxCostUSD + " / " + config.budget.maxToolCalls + " calls.");
console.log("Metered events: " + metered + "; cost $" + cost.toFixed(4) + "; calls " + calls + ".");
if (missing) console.log("Unknown usage: " + missing + " events have no verified metering. Do not treat the total as complete.");
console.log("No model API interception, spending limit or network sandbox is enforced by this CLI.");
