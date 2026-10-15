import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repo, "bin/leancraft.js");
test("MCP negotiates modern and legacy protocols, recovers after parse errors and denies path traversal", t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "lc-mcp-"));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const init = spawnSync(process.execPath, [cli, "init"], { cwd, encoding: "utf8", timeout: 20000 });
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const server = path.join(cwd, ".leancraft/runtime/mcp-server.mjs");
  const payloads = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    { jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2024-11-05" } },
    { jsonrpc: "2.0", id: 3, method: "tools/list" },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "leancraft_propose_change",
      arguments: { target: "human/../../etc/passwd", reason: "test", diff: "+anything" } } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "leancraft_check_gate", arguments: { stage: "bad" } } },
    { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "leancraft_status", arguments: {} } },
    { jsonrpc: "2.0", id: 7, method: "nonexistent" },
  ];
  const input = payloads.slice(0,3).map(JSON.stringify).join("\n") + "\n{not-json\n" + payloads.slice(3).map(JSON.stringify).join("\n") + "\n";
  const p = spawnSync(process.execPath, [server], { cwd, encoding: "utf8", input, timeout: 20000 });
  assert.equal(p.status, 0, p.stderr);
  const responses = p.stdout.trim().split("\n").map(JSON.parse);
  assert.equal(responses.length, payloads.length + 1);
  assert.equal(responses[0].result.protocolVersion, "2025-06-18");
  assert.equal(responses[1].result.protocolVersion, "2024-11-05");
  assert.ok(responses[2].result.tools.some(t => t.name === "leancraft_check_gate"));
  assert.equal(responses[3].error.code, -32700);
  assert.equal(responses[4].result.isError, true);
  assert.equal(responses[5].result.isError, true);
  assert.equal(responses[6].result.isError, false);
  assert.equal(responses[7].error.code, -32601);
});
