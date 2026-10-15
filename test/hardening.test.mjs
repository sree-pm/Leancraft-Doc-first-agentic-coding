import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(pkg, "bin/leancraft.js");
function dir(t) { const p = fs.mkdtempSync(path.join(os.tmpdir(),"lc-adversarial-"));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
function exec(cwd, args) { return spawnSync(process.execPath,[cli,...args],{cwd,encoding:"utf8",timeout:20000}); }
test("source fetching is default-deny and refuses localhost/IP URLs", t => {
  const cwd=dir(t);
  assert.equal(exec(cwd,["init"]).status,0);
  const research=path.join(cwd,".leancraft/human/discovery/02-research.md");
  fs.writeFileSync(research,"# Source\n\nhttps://127.0.0.1/private-metadata\n");
  const r=exec(cwd,["validate","--fetch"]);
  assert.notEqual(r.status,0);
  assert.match(r.stdout,/External source checks disabled by default/);
  assert.match(r.stdout,/Skipped unapproved or unsafe source URL/);
});
test("proposal tool refuses symlinked agent/proposals parent", t => {
  const cwd=dir(t), outside=dir(t);
  assert.equal(exec(cwd,["init"]).status,0);
  const proposals=path.join(cwd,".leancraft/agent/proposals");
  fs.rmSync(proposals,{recursive:true,force:true});
  try { fs.symlinkSync(outside,proposals,process.platform==="win32"?"junction":"dir"); }
  catch { t.skip("Directory symlink unavailable on this host"); return; }
  const server=path.join(cwd,".leancraft/runtime/mcp-server.mjs");
  const request={jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"leancraft_propose_change",arguments:{
    target:"human/definition/intent.md",reason:"Untrusted action",diff:"+malicious"}}};
  const r=spawnSync(process.execPath,[server],{cwd,encoding:"utf8",input:JSON.stringify(request)+"\n",timeout:10000});
  assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(r.stdout.trim()).result.isError,true);
  assert.deepEqual(fs.readdirSync(outside),[]);
});
test("feature generator denies symlinked human feature folder",t=>{
  const cwd=dir(t), outside=dir(t);
  assert.equal(exec(cwd,["init"]).status,0);
  const featureDir=path.join(cwd,".leancraft/human/definition/features");
  fs.rmSync(featureDir,{recursive:true,force:true});
  try { fs.symlinkSync(outside,featureDir,process.platform==="win32"?"junction":"dir"); }
  catch { t.skip("Directory symlink unavailable on this host"); return; }
  const result=exec(cwd,["features"]);
  assert.notEqual(result.status,0);
  assert.deepEqual(fs.readdirSync(outside),[]);
});
