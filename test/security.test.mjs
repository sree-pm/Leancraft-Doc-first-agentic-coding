import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repo, "bin/leancraft.js");
function run(root, cmd, args = []) { return spawnSync(process.execPath, [cmd, ...args], { cwd: root, encoding: "utf8", timeout: 10000 }); }
test("shell metacharacters remain ordinary CLI arguments, never executed", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "leancraft-sec-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const sentinel = path.join(dir, "INJECTED");
  run(dir, cli, ["init"]);
  run(dir, cli, ["validate", ";touch " + sentinel]);
  assert.equal(fs.existsSync(sentinel), false);
});
test("write guard rejects locked paths and does not misclassify unrelated paths", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "leancraft-sec-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(run(dir, cli, ["init"]).status, 0);
  const configPath = path.join(dir, ".leancraft/config.json");
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8")); cfg.locked = true;
  fs.writeFileSync(configPath, JSON.stringify(cfg));
  const guard = path.join(dir, ".leancraft/runtime/guard-write.mjs");
  assert.notEqual(run(dir, guard, ["human/definition/intent.md"]).status, 0);
  assert.notEqual(run(dir, guard, [".leancraft/human/discovery/01-vision.md"]).status, 0);
  assert.equal(run(dir, guard, ["agent/proposals/new.md"]).status, 0);
  assert.notEqual(run(dir, guard, ["../../outside"]).status, 0);
});
