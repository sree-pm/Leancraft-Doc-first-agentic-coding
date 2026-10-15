# LeanCraft: document-first product delivery

## 0. Understand
Start from a prompt or existing repo. Inspect source, tests, users, constraints and risks. Distinguish facts, assumptions and unanswered questions.

## 1. Research
Capture direct source URLs, publication dates, customer jobs, severity, contradictory evidence, pricing sources and confidence. Do not manufacture testimonials, interviews or metrics. Match evidence depth to product risk.

## 2. Specify
Describe goals, non-goals, flow IDs, FR/NFR IDs, personas, acceptance criteria, architecture, security/privacy/accessibility constraints, invariants and executable oracles. The original human docs are authoritative; agent context is a snapshot.

## 3. Review
Run:
```sh
leancraft validate
leancraft trace
leancraft lock
leancraft approve --by "Human Reviewer"
leancraft gate build
```
Approval identity is **self-declared** in the CLI, not authenticated. Require independent branch reviews for strong approval. Unlock/relock invalidates any prior review.

## 4. Deliver
Use `leancraft features --dry-run` to preview flow specs. New feature files are drafts until human-reviewed. Implement bounded slices, link each to FR/Flow/Persona and record rollback, tests and progress.

## 5. Verify
Add real argv-based commands under `quality.commands` in `.leancraft/config.json`:
```json
"quality": {"commands": [["node","--test"],["node","scripts/check-build.mjs"]],"timeoutMs":120000}
```
Run `leancraft verify` after committing code. This stores actual exit codes, SHA-256 output digests, tracked-tree cleanliness, commit and reviewed-contract fingerprint. It does not capture raw secrets or claim fabricated results.

## 6. Release
Run `leancraft gate release`. It rejects stale tests, changed contracts and dirty tracked worktrees. Also require remote green CI, independent code review and appropriate end-to-end, security and accessibility checks. The gate is **not** a security certification or deployer.

## 7. Maintain
Maintain agent/progress.md, preserve decision history, review changes to requirements explicitly and regenerate summaries using `leancraft sync`. `leancraft init --force` upgrades unchanged managed files, preserves edited project material and reports conflicts.

## Boundaries
LeanCraft does not sandbox unrestricted code agents, authenticate reviewers, verify all research claims, enforce model spending limits or prevent data exfiltration. Implement these outside the package.
