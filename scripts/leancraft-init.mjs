#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwd = process.cwd(), root = path.join(cwd, ".leancraft");
const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
const refresh = process.argv.includes("--force");
const fresh = !fs.existsSync(root);
function hash(file) { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function noSymlink(file) {
  const parts = path.relative(cwd, file).split(path.sep);
  if (parts[0] === "..") throw new Error("Write outside the project: " + file);
  let segment = cwd;
  for (const part of parts) {
    segment = path.join(segment, part);
    if (fs.existsSync(segment) && fs.lstatSync(segment).isSymbolicLink())
      throw new Error("Refusing symlinked managed path: " + segment);
  }
}
noSymlink(root);
const manifestFile = path.join(root, "runtime/install-manifest.json");
let manifest = { schema: 1, files: {} };
if (fs.existsSync(manifestFile)) {
  noSymlink(manifestFile);
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (manifest.schema !== 1 || !manifest.files || typeof manifest.files !== "object") throw new Error("invalid format");
  } catch {
    console.error("Installer manifest malformed. Refusing automated overwrites.");
    process.exit(1);
  }
}
const next = { schema: 1, packageVersion: pkg.version, files: { ...manifest.files } };
let added = 0, updated = 0, preserved = 0, conflicts = [];
function managed(src, dst, { allowLegacyRuntime = false } = {}) {
  if (!fs.existsSync(src)) return;
  noSymlink(dst);
  if (fs.lstatSync(src).isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const child of fs.readdirSync(src)) managed(path.join(src, child), path.join(dst, child), { allowLegacyRuntime });
    return;
  }
  const relative = path.relative(cwd, dst).split(path.sep).join("/");
  const sourceHash = hash(src), present = fs.existsSync(dst);
  if (!present) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    next.files[relative] = sourceHash;
    added++;
    return;
  }
  const currentHash = hash(dst);
  if (currentHash === sourceHash) { next.files[relative] = sourceHash; return; }
  const previousHash = manifest.files[relative];
  if (refresh && (previousHash && previousHash === currentHash)) {
    fs.copyFileSync(src, dst); next.files[relative] = sourceHash; updated++; return;
  }
  if (refresh && allowLegacyRuntime && !previousHash) {
    const backup = dst + ".pre-leancraft-" + pkg.version + ".bak";
    if (!fs.existsSync(backup)) fs.copyFileSync(dst, backup);
    fs.copyFileSync(src, dst); next.files[relative] = sourceHash; updated++;
    console.log("Backed up legacy runtime before updating " + relative);
    return;
  }
  preserved++; conflicts.push(relative);
}
if (fresh) {
  fs.cpSync(path.join(pkgRoot, ".leancraft"), root, { recursive: true, errorOnExist: false });
  fs.writeFileSync(path.join(root, "joint/ledger.jsonl"), "");
  fs.writeFileSync(path.join(root, "joint/decisions.log.md"), "# Decisions\n\nRecord reviewed decisions and evidence here.\n");
  fs.writeFileSync(path.join(root, "agent/progress.md"), "# Agent progress\n\nNo implementation work has been verified.\n");
  fs.writeFileSync(path.join(root, "joint/reviews.jsonl"), "");
}
const localConfig = path.join(root, "config.json");
if (fs.existsSync(localConfig)) {
  noSymlink(localConfig);
  const cfg = JSON.parse(fs.readFileSync(localConfig, "utf8"));
  let changed = false;
  if (!cfg.quality) {
    cfg.quality = { commands: [], timeoutMs: 120000, explanation: "Set argv commands for your real test runner." };
    changed = true;
  }
  if (!cfg.reviewPolicy) {
    cfg.reviewPolicy = { attestation: "self-declared", requireLockedReview: true, externalHumanApprovalRequired: true };
    changed = true;
  }
  if (changed) {
    const backup = localConfig + ".pre-v0.3.bak";
    if (!fs.existsSync(backup)) fs.copyFileSync(localConfig, backup);
    fs.writeFileSync(localConfig, JSON.stringify(cfg, null, 2) + "\n");
  }
}
// Only managed files can be upgraded. User authored docs, progress and decisions are NEVER refreshed.
managed(path.join(pkgRoot, ".leancraft/templates"), path.join(root, "templates"));
managed(path.join(pkgRoot, "scripts"), path.join(root, "runtime"), { allowLegacyRuntime: true });
for (const rel of ["AGENTS.md","CLAUDE.md",".mcp.json",
  ".claude/skills/leancraft/SKILL.md",".opencode/skills/leancraft/SKILL.md",
  ".cursor/rules/leancraft.mdc"]) managed(path.join(pkgRoot, rel), path.join(cwd, rel));
// Fresh scaffold already includes templates. Mark unchanged defaults as package managed for subsequent upgrades.
function indexTemplates(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const child of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, child.name), b = path.join(dst, child.name);
    if (child.isDirectory()) indexTemplates(a, b);
    else if (fs.existsSync(b) && hash(a) === hash(b))
      next.files[path.relative(cwd, b).split(path.sep).join("/")] = hash(a);
  }
}
indexTemplates(path.join(pkgRoot, ".leancraft/templates"), path.join(root, "templates"));
fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
fs.writeFileSync(manifestFile, JSON.stringify(next, null, 2) + "\n");
try { execFileSync(process.execPath, [path.join(pkgRoot, "scripts/install-hooks.mjs")], { cwd, stdio: "inherit" }); }
catch { console.error("Optional hook installation failed; no project documents were rolled back."); }
if (fresh) try { execFileSync(process.execPath, [path.join(pkgRoot, "scripts/leancraft-sync.mjs")], { cwd, stdio: "inherit" }); }
catch { console.error("Initial derived context unavailable; run leancraft sync."); }
console.log("LeanCraft " + pkg.version + " init: " + added + " new, " + updated + " updated, " + preserved + " user-modified files preserved.");
if (conflicts.length) console.log("Files requiring manual merge:\n" + conflicts.map(p => "  " + p).join("\n"));
console.log("Human documents are drafts until validated and explicitly reviewed. Lock state does not provide OS sandboxing.");
