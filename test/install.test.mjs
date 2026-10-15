import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repo, "bin/leancraft.js");
const run = (dir, args) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: "utf8", timeout: 20000 });
function temp(t) { const p = fs.mkdtempSync(path.join(os.tmpdir(),"lc-inst-")); t.after(()=>fs.rmSync(p,{recursive:true,force:true})); return p; }
test("managed init preserves custom agent skills, PRD, progress and config on --force", t => {
  const dir = temp(t);
  assert.equal(run(dir, ["init"]).status, 0);
  const manifest = path.join(dir, ".leancraft/runtime/install-manifest.json");
  assert.ok(fs.existsSync(manifest));
  const skill = path.join(dir, ".claude/skills/leancraft/SKILL.md");
  const prd = path.join(dir, ".leancraft/human/discovery/06-prd.md");
  const progress = path.join(dir, ".leancraft/agent/progress.md");
  const cfg = path.join(dir, ".leancraft/config.json");
  const before = JSON.parse(fs.readFileSync(cfg, "utf8"));
  fs.writeFileSync(skill, "# This agent skill belongs to the project\n");
  fs.writeFileSync(prd, "My actual roadmap\n");
  fs.writeFileSync(progress, "I completed real work\n");
  fs.writeFileSync(cfg, JSON.stringify({...before, name:"my-app"}));
  let r = run(dir, ["init", "--force"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(skill, "utf8"), /belongs to the project/);
  assert.equal(fs.readFileSync(prd, "utf8"), "My actual roadmap\n");
  assert.equal(fs.readFileSync(progress, "utf8"), "I completed real work\n");
  assert.equal(JSON.parse(fs.readFileSync(cfg, "utf8")).name, "my-app");
  assert.match(r.stdout, /manual merge/);
});
test("clean fresh scaffold succeeds doctor, incomplete drafts are warnings; strict doctor fails", t => {
  const dir = temp(t);
  assert.equal(run(dir, ["init"]).status, 0);
  const a = run(dir, ["doctor"]);
  assert.equal(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /WARN document contract complete/);
  assert.notEqual(run(dir, ["doctor", "--strict"]).status, 0);
  const state = run(dir, ["status", "--json"]);
  assert.equal(state.status, 0);
  assert.equal(JSON.parse(state.stdout).documentValid, false);
});
test("symlinked managed project directory is rejected rather than followed", t => {
  const dir = temp(t);
  const outside = temp(t);
  try {
    fs.symlinkSync(outside, path.join(dir, ".leancraft"), process.platform === "win32" ? "junction" : "dir");
  } catch { t.skip("Current system cannot create directory symlinks"); return; }
  const result = run(dir, ["init"]);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(outside, "config.json")), false);
});
