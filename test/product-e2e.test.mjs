import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repo, "bin/leancraft.js");
const exec = (cwd, args) => spawnSync(process.execPath, [cli, ...args], {cwd,encoding:"utf8",timeout:30000});
const git = (cwd, args) => spawnSync("git", args, {cwd,encoding:"utf8",timeout:30000});
function write(dir, relative, content) {
  const file = path.join(dir, relative); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, content);
}
test("real toy application is blocked when broken and allowed only after actual tested fix", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),"leancraft-real-e2e-"));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  let r=exec(dir, ["init"]); assert.equal(r.status,0,r.stdout+r.stderr);
  r=exec(dir, ["profile","lean","--by","Test Owner","--reason","Single-feature isolated fixture"]);
  assert.equal(r.status,0,r.stdout+r.stderr);
  const cfgFile=path.join(dir,".leancraft/config.json");
  const cfg=JSON.parse(fs.readFileSync(cfgFile,"utf8"));
  cfg.quality.commands=[[process.execPath,"--test","tests/discount.test.mjs"]];
  fs.writeFileSync(cfgFile,JSON.stringify(cfg,null,2));
  const lc=path.join(dir,".leancraft");
  for (const [section, docs] of Object.entries(cfg.docRegistry)) {
    if(section==="conditional")continue;
    for(const [name,spec] of Object.entries(docs)) {
      if(name.includes("*")||!spec.required)continue;
      let text="# "+name+"\n"+(spec.sections||[]).map(x=>"\n## "+x+"\n\nDocumentation.\n").join("");
      if(name==="02-research.md")for(let i=1;i<=3;i++)text+="\n### P"+i+": Pricing problem\n\nQuote: \"Reported issue\"\nSource: https://example.org/fixture/"+i+"\nDate: 2026-01-01\n";
      if(name==="03-competitive.md"){
        text+="\n| Product | URL | Price |\n|---|---|---|\n";
        for(let i=1;i<=2;i++)text+="| Competitor "+i+" | https://example.org/product/"+i+" | $10 |\n";
        text+="\n1. Validated wedge hypothesis\n";
      }
      if(name==="04-personas.md")text+="\n## Persona 1\n\nGoals: correct pricing\nPains: incorrect discounts\nJTBD: accurate checkout\n";
      if(name==="06-prd.md"){
        text+="\n### Flow 1: Calculate checkout total — Persona: P1\n\nUser sees final amount.\n";
        for(let i=1;i<=3;i++)text+="\n| FR-0"+i+" | Pricing requirement "+i+" | P1 | F1 | P0 |\n";
      }
      if(name==="intent.md")text+="\n- **I1:** Calculations must match the stated equation.\n- **O1:** Run discount.test.mjs\n";
      write(dir,path.join(".leancraft/human",section,name),text);
    }
  }
  write(dir,".leancraft/human/definition/features/001-discount.md",
    "# Discount\n\n## Intent\n\nDiscount correctly.\n\n## Invariants\n\nPrices are non-negative.\n\n## Oracles\n\nRun discount.test.mjs.\n\n## Acceptance\n\nUser sees correct discounted totals.\n\n## Source Trace\n\nFlow 1 Persona 1 FR-01 FR-02 FR-03\n");
  write(dir,"src/discount.mjs","export const discounted=(price,pct)=>price-pct;\n");
  write(dir,"tests/discount.test.mjs",[
    'import test from "node:test";',
    'import assert from "node:assert/strict";',
    'import { discounted } from "../src/discount.mjs";',
    'test("correct percentage pricing",()=>assert.equal(discounted(200,10),180));',
    'test("full discount",()=>assert.equal(discounted(100,100),0));',
    ''
  ].join("\n"));
  assert.equal(exec(dir,["validate"]).status,0,"Synthetic fixture contract must be structurally complete");
  assert.equal(exec(dir,["trace"]).status,0);
  assert.equal(exec(dir,["lock"]).status,0);
  assert.equal(exec(dir,["approve","--by","Test Owner"]).status,0);
  assert.equal(exec(dir,["gate","build"]).status,0);
  assert.equal(git(dir,["init","-q"]).status,0);
  assert.equal(git(dir,["config","user.email","ci@example.org"]).status,0);
  assert.equal(git(dir,["config","user.name","LeanCraft E2E"]).status,0);
  assert.equal(git(dir,["add","-A"]).status,0);
  assert.equal(git(dir,["commit","-qm","Reviewed contract and buggy app"]).status,0);
  const detachedTestEnv = { ...process.env }; delete detachedTestEnv.NODE_TEST_CONTEXT;
  const direct=spawnSync(process.execPath, ["--test","tests/discount.test.mjs"],{cwd:dir,env:detachedTestEnv,encoding:"utf8",timeout:30000});
  assert.notEqual(direct.status,0,"Broken app unexpectedly passed standalone Node tests: "+direct.stdout+" "+direct.stderr);
  const first=exec(dir,["verify"]);
  const evidenceFirst=fs.existsSync(path.join(lc,"joint/verification.json"))?
    fs.readFileSync(path.join(lc,"joint/verification.json"),"utf8"):"missing evidence";
  assert.notEqual(first.status,0,"Broken implementation must fail: stdout="+first.stdout+" stderr="+first.stderr+" evidence="+evidenceFirst);
  assert.notEqual(exec(dir,["gate","release"]).status,0);
  write(dir,"src/discount.mjs","export const discounted=(price,pct)=>price*(1-pct/100);\n");
  assert.equal(git(dir,["add","-A"]).status,0);
  assert.equal(git(dir,["commit","-qm","Fix actual discount calculation"]).status,0);
  const second=exec(dir,["verify"]);
  assert.equal(second.status,0,second.stdout+second.stderr);
  const gate=exec(dir,["gate","release"]);
  assert.equal(gate.status,0,gate.stdout+gate.stderr);
  const record=JSON.parse(fs.readFileSync(path.join(lc,"joint/verification.json"),"utf8"));
  assert.equal(record.passed,true);
  assert.equal(record.results[0].exitCode,0);
});
