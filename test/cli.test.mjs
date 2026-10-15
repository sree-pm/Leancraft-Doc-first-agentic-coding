import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(packageRoot, "bin/leancraft.js");
function execute(root, args = []) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", timeout: 20000 });
}
function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "leancraft-test-")); }
function write(root, relative, value) {
  const file = path.join(root, ".leancraft", relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function makeValid(root) {
  const lc = path.join(root, ".leancraft");
  const config = JSON.parse(fs.readFileSync(path.join(lc, "config.json"), "utf8"));
  for (const [group, docs] of Object.entries(config.docRegistry)) {
    if (group === "conditional") continue;
    for (const [file, spec] of Object.entries(docs)) {
      if (file.includes("*") || !spec.required) continue;
      let content = "# Test " + file + "\n\n" + (spec.sections || []).map(h => "## " + h + "\n\nTested content.\n").join("\n");
      if (file === "02-research.md") for (let i = 1; i <= 12; i++)
        content += "\n### P" + i + ": Real reported pain\n\n- Quote: \"A customer statement\"\n- Source: https://example.org/pain/" + i + " - Date: 2026-09-01\n";
      if (file === "03-competitive.md") {
        content += "\n| Competitor | URL | Price |\n|---|---|---|\n";
        for (let i = 1; i <= 9; i++) content += "| Company " + i + " | https://example.org/competitor/" + i + " | $10 |\n";
        for (let i = 1; i <= 5; i++) content += "\n" + i + ". Wedge strategy " + i + "\n";
      }
      if (file === "04-personas.md") for (let i = 1; i <= 5; i++) content += "\n## Persona " + i + "\n\nNeeds verified workflow\n";
      if (file === "06-prd.md") {
        for (let i = 1; i <= 3; i++) content += "\n### Flow " + i + ": Workflow " + i + "\n\nUser acts then system responds.\n";
        for (let i = 1; i <= 10; i++) content += "\n- FR-" + String(i).padStart(2, "0") + ": requirement " + i + "\n";
      }
      if (file === "intent.md") content += "\n- **I1:** invariant\n- **I2:** invariant\n- **I3:** invariant\n- **O1:** oracle\n- **O2:** oracle\n";
      write(root, "human/" + group + "/" + file, content);
    }
  }
  for (let i = 1; i <= 3; i++)
    write(root, "human/definition/features/" + String(i + 41).padStart(3, "0") + "-feature-" + i + ".md",
      "# Feature\n\n## Intent\n\n## Invariants\n\n## Oracles\n\n## Acceptance\n\nSource Trace: FR-01 Persona 1 Flow " + i + "\n");
}
test("fresh init installs every runtime component and preserves project files", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let r = execute(dir, ["init"]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, ".leancraft/runtime/mcp-server.mjs")));
  assert.ok(fs.existsSync(path.join(dir, ".opencode/skills/leancraft/SKILL.md")));
  assert.ok(fs.existsSync(path.join(dir, ".cursor/rules/leancraft.mdc")));
  assert.ok(fs.existsSync(path.join(dir, ".mcp.json")));
  const human = path.join(dir, ".leancraft/human/discovery/01-vision.md");
  fs.writeFileSync(human, "protected human text");
  r = execute(dir, ["init", "--force"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(human, "utf8"), "protected human text");
  assert.notEqual(execute(dir, ["validate"]).status, 0);
  const ledger = fs.readFileSync(path.join(dir, ".leancraft/joint/ledger.jsonl"), "utf8");
  assert.doesNotMatch(ledger, /2026-08-30T20:27:03/);
  assert.equal(fs.existsSync(path.join(dir, ".github/CODEOWNERS")), false);
  assert.equal(execute(dir, ["templates"]).status, 0);
});
test("validated docs allow locking and locked feature generation is rejected", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(execute(dir, ["init"]).status, 0);
  makeValid(dir);
  let r = execute(dir, ["validate"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  r = execute(dir, ["lock"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, ".leancraft/config.json"), "utf8"));
  assert.equal(cfg.locked, true);
  assert.ok(Object.keys(cfg.lockedFiles).length > 10);
  fs.appendFileSync(path.join(dir, ".leancraft/human/definition/guardrails.md"), "\nNew undocumented change.\n");
  assert.notEqual(execute(dir, ["validate"]).status, 0, "post-review human-document drift must fail");
  assert.equal(execute(dir, ["unlock"]).status, 0);
  assert.equal(execute(dir, ["lock"]).status, 0, "human may review and re-lock the changed contract");
  assert.notEqual(execute(dir, ["features"]).status, 0);
  assert.equal(execute(dir, ["unlock"]).status, 0);
  assert.equal(execute(dir, ["features"]).status, 0);
});
test("sync retains manual progress and does not fabricate metering", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(execute(dir, ["init"]).status, 0);
  write(dir, "agent/progress.md", "Verified end-to-end test on build 4.\n");
  assert.equal(execute(dir, ["sync"]).status, 0);
  assert.equal(execute(dir, ["sync"]).status, 0);
  assert.match(fs.readFileSync(path.join(dir, ".leancraft/agent/progress.md"), "utf8"), /Verified end-to-end/);
  assert.match(execute(dir, ["budget"]).stdout, /Unknown usage/);
});
test("MCP handshake, tool discovery and non-applying proposal", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(execute(dir, ["init"]).status, 0);
  const script = path.join(dir, ".leancraft/runtime/mcp-server.mjs");
  const calls = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "leancraft_propose_change",
      arguments: { target: "human/definition/intent.md", reason: "New user request", diff: "+New invariant" } } }
  ];
  const result = spawnSync(process.execPath, [script], { cwd: dir, input: calls.map(JSON.stringify).join("\n") + "\n", encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const messages = result.stdout.trim().split("\n").map(JSON.parse);
  assert.equal(messages.length, 3);
  assert.ok(messages[1].result.tools.some(x => x.name === "leancraft_propose_change"));
  assert.equal(messages[2].result.isError, false);
  assert.equal(fs.readdirSync(path.join(dir, ".leancraft/agent/proposals")).filter(f => f.endsWith(".md")).length >= 2, true);
});


test("invalid pain evidence and duplicate requirements fail document validation", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(execute(dir, ["init"]).status, 0);
  makeValid(dir);
  assert.equal(execute(dir, ["validate"]).status, 0);
  const research = path.join(dir, ".leancraft/human/discovery/02-research.md");
  const original = fs.readFileSync(research, "utf8");
  fs.writeFileSync(research, original.replace("https://example.org/pain/3", "https://..."));
  assert.notEqual(execute(dir, ["validate"]).status, 0, "bogus source link should not pass");
  fs.writeFileSync(research, original);
  const prd = path.join(dir, ".leancraft/human/discovery/06-prd.md");
  const body = fs.readFileSync(prd, "utf8");
  fs.writeFileSync(prd, body.replace("FR-02", "FR-01"));
  assert.notEqual(execute(dir, ["validate"]).status, 0, "duplicated requirement IDs should not satisfy minimum");
});
