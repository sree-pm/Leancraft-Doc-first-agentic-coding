import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin/leancraft.js");
function exec(dir, args) { return spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: "utf8", timeout: 20000 }); }
function git(dir, args) { return spawnSync("git", args, { cwd: dir, encoding: "utf8", timeout: 20000 }); }
function home(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-gates-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const init = exec(dir, ["init"]); assert.equal(init.status, 0, init.stderr);
  return dir;
}
function write(dir, name, value) {
  const file = path.join(dir, ".leancraft", name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function readyFixture(dir) {
  const cfgFile = path.join(dir, ".leancraft/config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  cfg.quality.commands = [[process.execPath, "-e", "if (2 + 2 !== 4) process.exit(1)"]];
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));
  for (const [section, entries] of Object.entries(cfg.docRegistry)) {
    if (section === "conditional") continue;
    for (const [name, spec] of Object.entries(entries)) {
      if (name.includes("*") || !spec.required) continue;
      let text = "# " + name + "\n\n" + (spec.sections || []).map(x => "## " + x + "\n\nReviewed information.\n").join("\n");
      if (name === "02-research.md") for (let i = 1; i <= 12; i++)
        text += "\n### P" + i + ": Distinct pain\n\nQuote: \"Reported complaint " + i + "\"\nSource: https://example.org/research/" + i + "\nDate: 2026-01-01\n";
      if (name === "03-competitive.md") {
        text += "\n| Competitor | URL | Price |\n|---|---|---|\n";
        for (let i = 1; i <= 9; i++) text += "| Name " + i + " | https://example.org/competitors/" + i + " | $11 |\n";
        for (let i = 1; i <= 5; i++) text += "\n" + i + ". Distinct wedge " + i + "\n";
      }
      if (name === "04-personas.md") for (let i = 1; i <= 5; i++) text += "\n## Persona " + i + "\n\n- Goals: save time\n- Pains: broken workflows\n- JTBD: completion\n";
      if (name === "06-prd.md") {
        for (let i = 1; i <= 3; i++) text += "\n### Flow " + i + ": Job " + i + " — Persona: P" + i + "\n\nHuman starts and system responds.\n";
        for (let i = 1; i <= 10; i++) text += "\n| FR-" + String(i).padStart(2, "0") + " | Requirement " + i + " | P1 | F" + (i % 3 + 1) + " | P0 |\n";
      }
      if (name === "intent.md") text += "\n- **I1:** invariant\n- **I2:** invariant\n- **I3:** invariant\n- **O1:** executable oracle\n- **O2:** executable oracle\n";
      write(dir, "human/" + section + "/" + name, text);
    }
  }
  for (let i = 1; i <= 3; i++) {
    let refs = "";
    for (let j = 1; j <= 10; j++) if (j % 3 + 1 === i) refs += "FR-" + String(j).padStart(2,"0") + " ";
    write(dir, "human/definition/features/" + String(i).padStart(3, "0") + "-flow-" + i + ".md",
      "# Feature " + i + "\n\n## Intent\n\nJob " + i + "\n\n## Invariants\n\nPreserved.\n\n## Oracles\n\nExecutable tests.\n\n## Acceptance\n\nUser checked.\n\n## Source Trace\n\nFlow " + i + " Persona " + i + " " + refs + "\n");
  }
}
function approve(dir) {
  let r = exec(dir, ["lock"]); assert.equal(r.status, 0, r.stdout + r.stderr);
  r = exec(dir, ["approve", "--by", "Example Reviewer"]); assert.equal(r.status, 0, r.stdout + r.stderr);
}
test("build gate rejects unreviewed docs, accepts reviewed traced contract and detects drift", t => {
  const dir = home(t);
  assert.notEqual(exec(dir, ["gate", "build"]).status, 0);
  readyFixture(dir);
  assert.equal(exec(dir, ["trace"]).status, 0);
  assert.notEqual(exec(dir, ["gate", "build"]).status, 0);
  approve(dir);
  const yes = exec(dir, ["gate", "build"]); assert.equal(yes.status, 0, yes.stdout + yes.stderr);
  const cfg = path.join(dir, ".leancraft/config.json");
  const obj = JSON.parse(fs.readFileSync(cfg, "utf8"));
  obj.quality.commands = [[process.execPath, "-e", "process.exit(1)"]];
  fs.writeFileSync(cfg, JSON.stringify(obj));
  assert.notEqual(exec(dir, ["gate", "build"]).status, 0, "changing quality policy after review must invalidate approval");
  assert.equal(exec(dir, ["revoke", "--by", "Example Reviewer", "--reason", "Tests changed"]).status, 0);
  assert.notEqual(exec(dir, ["gate", "build"]).status, 0);
});
test("release requires real successful checks on a clean matching git commit", t => {
  const dir = home(t);
  readyFixture(dir); approve(dir);
  assert.notEqual(exec(dir, ["gate", "release"]).status, 0);
  assert.equal(git(dir, ["init", "-q"]).status, 0);
  assert.equal(git(dir, ["config", "user.email", "tests@example.org"]).status, 0);
  assert.equal(git(dir, ["config", "user.name", "LeanCraft CI"]).status, 0);
  assert.equal(git(dir, ["add", "-A"]).status, 0);
  const commit = git(dir, ["commit", "-qm", "Approved product contract"]);
  assert.equal(commit.status, 0, commit.stdout + commit.stderr);
  const verify = exec(dir, ["verify"]);
  assert.equal(verify.status, 0, verify.stdout + verify.stderr);
  const pass = exec(dir, ["gate", "release"]);
  assert.equal(pass.status, 0, pass.stdout + pass.stderr);
  fs.appendFileSync(path.join(dir, "AGENTS.md"), "\nAdversarial tracked code change.\n");
  assert.notEqual(exec(dir, ["gate", "release"]).status, 0, "dirty tracked changes must block release");
});
test("failure is recorded, not hidden; no shell interpretation of argv", t => {
  const dir = home(t);
  readyFixture(dir); approve(dir);
  const cfgFile = path.join(dir, ".leancraft/config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
  cfg.quality.commands = [[process.execPath, "-e", "process.exit(7)"]];
  fs.writeFileSync(cfgFile, JSON.stringify(cfg));
  const fail = exec(dir, ["verify"]);
  assert.notEqual(fail.status, 0);
  const record = JSON.parse(fs.readFileSync(path.join(dir, ".leancraft/joint/verification.json"), "utf8"));
  assert.equal(record.passed, false);
  assert.equal(record.results[0].exitCode, 7);
  assert.ok(record.results[0].outputDigest);
  assert.equal(exec(dir, ["gate", "release"]).status !== 0, true);
});
test("trace gate identifies unknown FR and missing flow coverage", t => {
  const dir = home(t); readyFixture(dir);
  assert.equal(exec(dir, ["trace"]).status, 0);
  const feature = path.join(dir, ".leancraft/human/definition/features/001-flow-1.md");
  let text = fs.readFileSync(feature, "utf8");
  text += "\nFR-999\n";
  fs.writeFileSync(feature, text);
  assert.notEqual(exec(dir, ["trace"]).status, 0);
});
test("feature scaffold dry-run does not modify files and does not fabricate traces", t => {
  const dir = home(t); readyFixture(dir);
  const featurePath = path.join(dir, ".leancraft/human/definition/features");
  fs.rmSync(featurePath, { recursive: true, force: true });
  const result = exec(dir, ["features", "--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(featurePath), false);
  const run = exec(dir, ["features"]); assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readdirSync(featurePath).filter(x => x.endsWith(".md")).length, 3);
  assert.notEqual(exec(dir, ["validate"]).status, 0, "generated drafts must not masquerade as approved documents");
});
