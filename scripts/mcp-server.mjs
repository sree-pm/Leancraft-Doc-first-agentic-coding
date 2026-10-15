#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const cwd = process.cwd(), lc = path.join(cwd, ".leancraft"), MAX_BYTES = 2_000_000;
const read = p => fs.readFileSync(path.join(lc, p), "utf8");
const tools = [
 { name: "leancraft_read_intent", description: "Read approved product intent, invariants, oracles and guardrails before implementation.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
 { name: "leancraft_get_context", description: "Read derived context. Check the original contract before decisions.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
 { name: "leancraft_get_progress", description: "Read durable agent work notes and blockers.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
 { name: "leancraft_get_trace", description: "Report actual FR, Flow and Persona trace coverage and unknown IDs.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
 { name: "leancraft_check_gate", description: "Check build or release stage gates without changing project files.", inputSchema: {
     type: "object", properties: { stage: { type: "string", enum: ["build", "release"] } }
   }, annotations: { readOnlyHint: true } },
 { name: "leancraft_propose_change", description: "Create a pending review draft. Does not apply human-document modifications.", inputSchema: { type: "object", properties: {
    target: { type: "string" }, reason: { type: "string" }, diff: { type: "string" }
 }, required: ["target", "reason", "diff"] }, annotations: { destructiveHint: false, idempotentHint: false } },
 { name: "leancraft_validate", description: "Run structural document contract checks.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
 { name: "leancraft_status", description: "Read current document, review and verification status.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }
];
function run(script, params = []) {
  const file = fileURLToPath(new URL("./" + script, import.meta.url));
  try {
    const output = execFileSync(process.execPath, [file, ...params], { cwd, encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 });
    return { passed: true, output };
  } catch (e) {
    return { passed: false, output: e.stdout?.toString() || "", error: e.message };
  }
}
function call(name, args) {
  const cfg = JSON.parse(read("config.json"));
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Arguments must be an object");
  if (name === "leancraft_read_intent") return { locked: Boolean(cfg.locked), reviewed: Boolean(cfg.review), intent: read("human/definition/intent.md"), guardrails: read("human/definition/guardrails.md") };
  if (name === "leancraft_get_context") return { context: read("agent/context.md"), derivedNotAuthoritative: true };
  if (name === "leancraft_get_progress") {
    const p = path.join(lc, "agent/progress.md");
    return { progress: fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "" };
  }
  if (name === "leancraft_get_trace") return run("leancraft-trace.mjs");
  if (name === "leancraft_check_gate") {
    if (!["build", "release"].includes(args.stage)) throw new Error("Stage must be build or release.");
    return run("leancraft-gate.mjs", [args.stage]);
  }
  if (name === "leancraft_validate") return run("leancraft-validate.mjs");
  if (name === "leancraft_status") return run("leancraft-status.mjs", ["--json"]);
  if (name === "leancraft_propose_change") {
    if (![args.target, args.reason, args.diff].every(x => typeof x === "string" && x.trim())) throw new Error("target, reason and diff must be nonempty strings");
    if (args.diff.length > 100000 || args.reason.length > 2000 || args.target.length > 300) throw new Error("Proposal exceeds size limit");
    const target = args.target.replace(/\\/g, "/");
    const normalized = path.posix.normalize(target);
    if (!target.startsWith("human/") || !normalized.startsWith("human/") || normalized === "human/" || target.includes("\0")) throw new Error("Human contract path required");
    const directory = path.join(lc, "agent/proposals");
    for (const dir of [lc, path.join(lc, "agent"), directory]) {
      if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error("Symlinked proposal path refused");
    }
    fs.mkdirSync(directory, { recursive: true });
    const filename = randomUUID() + ".md";
    fs.writeFileSync(path.join(directory, filename), [
      "# Human contract change proposal", "", "Target: " + normalized, "Reason: " + args.reason,
      "Status: PENDING HUMAN REVIEW", "", "## Proposed diff", "", "~~~diff", args.diff, "~~~", ""
    ].join("\n"), { flag: "wx", mode: 0o600 });
    return { path: "agent/proposals/" + filename, applied: false, requiresHumanReview: true };
  }
  throw new Error("Unknown tool: " + name);
}
function send(id, result, error) {
  if (id === undefined) return;
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...(error ? { error } : { result }) }) + "\n");
}
function handle(msg) {
  if (Array.isArray(msg)) {
    if (msg.length === 0) return send(null, null, { code: -32600, message: "Invalid empty JSON-RPC batch" });
    for (const part of msg) handle(part);
    return;
  }
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return send(msg && typeof msg === "object" ? msg.id ?? null : null, null, { code: -32600, message: "Invalid JSON-RPC request" });
  if (msg.method.startsWith("notifications/")) return;
  if (msg.method === "initialize") {
    const requested = msg.params?.protocolVersion;
    const supported = ["2025-06-18","2024-11-05"];
    const protocolVersion = supported.includes(requested) ? requested : "2025-06-18";
    return send(msg.id, { protocolVersion, capabilities: { tools: {} },
      serverInfo: { name: "leancraft", version: "0.3.0" },
      instructions: "Read intent and guardrails first. Human review is self-declared and security boundaries require external controls. Proposals are never auto-applied." });
  }
  if (msg.method === "ping") return send(msg.id, {});
  if (msg.method === "tools/list") return send(msg.id, { tools });
  if (msg.method === "tools/call") {
    try {
      const name = msg.params?.name;
      if (typeof name !== "string") throw new Error("Missing tool name");
      const payload = call(name, msg.params?.arguments || {});
      return send(msg.id, { content: [{ type: "text", text: JSON.stringify(payload) }], isError: false });
    } catch (error) {
      return send(msg.id, { content: [{ type: "text", text: "LeanCraft tool error: " + error.message }], isError: true });
    }
  }
  send(msg.id, null, { code: -32601, message: "Method not found" });
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  if (Buffer.byteLength(buffer, "utf8") > MAX_BYTES) { console.error("Input exceeded 2MB; closing."); process.exit(1); }
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); }
    catch (e) {
      if (e instanceof SyntaxError) send(null, null, { code: -32700, message: "Parse error" });
      else send(null, null, { code: -32603, message: "Internal error" });
    }
  }
});
