import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(pkg, "bin/leancraft.js");
const run = (cwd, args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: 25000 });
function tmp(t) {const p=fs.mkdtempSync(path.join(os.tmpdir(), "lc-profile-"));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
test("named profile changes numerical minimums and never bypasses locked contract", t => {
  const root = tmp(t);
  assert.equal(run(root, ["init"]).status, 0);
  const cfgFile = path.join(root, ".leancraft/config.json");
  let cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  assert.equal(cfg.profile, "assured");
  assert.notEqual(run(root, ["profile", "lean"]).status, 0);
  const choose = run(root, ["profile", "lean", "--by", "Product reviewer", "--reason", "Low-risk single-purpose utility"]);
  assert.equal(choose.status, 0, choose.stdout + choose.stderr);
  cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  assert.equal(cfg.profile, "lean");
  assert.equal(cfg.docRegistry.discovery["02-research.md"].rules.minPainThemes, 3);
  assert.equal(cfg.docRegistry.discovery["06-prd.md"].rules.minFunctionalReqs, 3);
  assert.ok(fs.existsSync(path.join(root, ".leancraft/joint/profile-decisions.jsonl")));
  cfg.locked = true; fs.writeFileSync(cfgFile, JSON.stringify(cfg));
  assert.notEqual(run(root, ["profile", "assured", "--by", "Product reviewer", "--reason", "Scope expanded"]).status, 0);
});
test("npm verification command runs cross-platform as program rather than shell code", t => {
  const root=tmp(t);
  assert.equal(run(root, ["init"]).status, 0);
  const configFile=path.join(root, ".leancraft/config.json");
  const cfg=JSON.parse(fs.readFileSync(configFile, "utf8"));
  cfg.quality.commands=[["npm","--version"]];
  fs.writeFileSync(configFile, JSON.stringify(cfg));
  const x=run(root, ["verify"]);
  assert.equal(x.status, 0, x.stdout + x.stderr);
  const evidence=JSON.parse(fs.readFileSync(path.join(root, ".leancraft/joint/verification.json"),"utf8"));
  assert.equal(evidence.results[0].passed, true);
});
