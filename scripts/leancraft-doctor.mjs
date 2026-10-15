#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = process.cwd(), lc = path.join(root, ".leancraft");
let failed = 0;
function check(label, fn) {
  try { if (!fn()) throw new Error("missing"); console.log("PASS " + label); }
  catch (e) { failed++; console.log("FAIL " + label + ": " + e.message); }
}
check("Node >=20", () => Number(process.versions.node.split(".")[0]) >= 20);
check("Configuration", () => fs.existsSync(path.join(lc, "config.json")));
check("Bundled local runtime", () => fs.existsSync(path.join(lc, "runtime/mcp-server.mjs")) && fs.existsSync(path.join(lc, "runtime/leancraft-validate.mjs")));
check("MCP configuration", () => fs.existsSync(path.join(root, ".mcp.json")));
check("Git repository", () => { execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, stdio: "ignore" }); return true; });
check("Document validation", () => { execFileSync(process.execPath, [fileURLToPath(new URL("./leancraft-validate.mjs", import.meta.url))], { cwd: root, stdio: "ignore" }); return true; });
console.log("Diagnosis: " + (failed ? failed + " failed checks" : "all checks passed"));
process.exitCode = failed ? 1 : 0;
