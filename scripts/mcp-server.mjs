#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const cwd = process.cwd(), lc = path.join(cwd, ".leancraft");
const read = p => fs.readFileSync(path.join(lc, p), "utf8");
const registry = [
 { name: "leancraft_read_intent", description: "Read the current human-authored contract and guardrails before work.", inputSchema: { type: "object", properties: {} } },
 { name: "leancraft_get_context", description: "Read derived context, then consult original definition docs.", inputSchema: { type: "object", properties: {} } },
 { name: "leancraft_propose_change", description: "Create a reviewable proposal only; never modifies protected human files.", inputSchema: { type: "object", properties: {
   target: { type: "string" }, reason: { type: "string" }, diff: { type: "string" }
 }, required: ["target", "reason", "diff"] } },
 { name: "leancraft_validate", description: "Run document contract validation.", inputSchema: { type: "object", properties: {} } },
 { name: "leancraft_status", description: "Read review state and actual validation status.", inputSchema: { type: "object", properties: {} } }
];
function tool(name, args = {}) {
  const cfg = JSON.parse(read("config.json"));
  if (name === "leancraft_read_intent") return { locked: Boolean(cfg.locked), intent: read("human/definition/intent.md"), guardrails: read("human/definition/guardrails.md"), budgetIsAdvisory: true };
  if (name === "leancraft_get_context") return { context: read("agent/context.md"), note: "This is a derived summary." };
  if (name === "leancraft_propose_change") {
    if (![args.target, args.reason, args.diff].every(x => typeof x === "string" && x.trim())) throw new Error("target, reason and diff must be nonempty strings");
    if (args.diff.length > 100000 || args.reason.length > 2000) throw new Error("Proposal exceeds size limits");
    const normalized = path.posix.normalize(args.target.replace(/\\/g, "/"));
    if (!normalized.startsWith("human/") || normalized.includes("../") || normalized === "human/") throw new Error("Target must be a human/ document");
    const proposalDir = path.join(lc, "agent/proposals");
    fs.mkdirSync(proposalDir, { recursive: true });
    const filename = randomUUID() + ".md";
    const proposal = [
      "# Change proposal", "", "Target: " + normalized, "Reason: " + args.reason,
      "Status: PENDING HUMAN REVIEW", "", "## Proposed diff", "", "~~~diff", args.diff, "~~~", ""
    ].join("\n");
    fs.writeFileSync(path.join(proposalDir, filename), proposal, { flag: "wx" });
    return { created: "agent/proposals/" + filename, applied: false, humanReviewRequired: true };
  }
  if (name === "leancraft_validate" || name === "leancraft_status") {
    let pass = false, output;
    try {
      output = execFileSync(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], { cwd, encoding: "utf8", timeout: 30000 });
      pass = true;
    } catch (e) { output = e.stdout?.toString() || e.message; }
    return { locked: Boolean(cfg.locked), validationPass: pass, output };
  }
  throw new Error("Unknown tool " + name);
}
function send(id, result, error) {
  if (id === undefined || id === null) return;
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...(error ? { error } : { result }) }) + "\n");
}
function handle(message) {
  if (!message || message.jsonrpc !== "2.0") return send(message?.id, null, { code: -32600, message: "Invalid JSON-RPC request" });
  if (message.method === "notifications/initialized") return;
  if (message.method === "initialize") return send(message.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "leancraft", version: "0.2.0" } });
  if (message.method === "ping") return send(message.id, {});
  if (message.method === "tools/list") return send(message.id, { tools: registry });
  if (message.method === "tools/call") {
    try {
      const result = tool(message.params?.name, message.params?.arguments || {});
      return send(message.id, { content: [{ type: "text", text: JSON.stringify(result) }], isError: false });
    } catch (e) {
      return send(message.id, { content: [{ type: "text", text: "LeanCraft tool error: " + e.message }], isError: true });
    }
  }
  return send(message.id, null, { code: -32601, message: "Method not found" });
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  if (buffer.length > 2000000) { console.error("Oversized MCP input"); process.exit(1); }
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); }
    catch { send(null, null, { code: -32700, message: "Parse error" }); }
  }
});
