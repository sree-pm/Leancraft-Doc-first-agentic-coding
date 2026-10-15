# LeanCraft

**Human-reviewed, document-first engineering for AI coding agents.** Make product decisions explicit, trace work to requirements, retain agent progress and prove changes using real tests.

LeanCraft is an open-source CLI, Markdown contract system and local MCP companion. It is not an AI model, an agent host, an OS sandbox, an authenticated approval server or a guarantee of correct software.

## Getting started

Node.js 22 or newer is required. Run in a new or existing project:

```sh
npx leancraft init
npx leancraft doctor
npx leancraft status
```

The first `validate` will normally **fail** because the project-specific human documents are drafts. That is intentional. Do not invent customer research or code verification to make it green.

**Upgrades:** `npx leancraft init --force` updates previously unmodified managed files, while preserving project-authored documents, progress, modified agent rules and Git hooks. Files requiring human merges are reported. Older runtimes are backed up during migration.

## Workflow: idea to reviewed release

| Stage | Purpose | Primary commands |
|---|---|---|
| Inspect | Assess project, constraints, existing code and tests | `doctor`, `status` |
| Discover | Document source-backed user pains, alternatives, jobs and risks | Human discovery docs |
| Specify | Document PRD flows, FR/NFR, UX/security, invariants and acceptance | `features --dry-run`, `features`, `validate` |
| Trace | Ensure PRD requirements, flows and personas appear in real feature docs | `trace` |
| Review | Lock reviewed contract; record named, **self-declared** human reviewer | `lock`, `approve --by "Reviewer"`, `gate build` |
| Implement | Build testable slices and preserve progress across AI sessions | `sync`, agent/progress.md |
| Prove | Execute real tests from quality.commands and store exit codes | `verify` |
| Release | Reject stale tests, changed contracts and dirty tracked code | `gate release` |

To undo a review, run `leancraft revoke --by "Reviewer" --reason "Changed requirement"`. Unlocking invalidates a previous approval. Real reviewers should operate through separately authenticated branch protections.

## Proportionate research profiles

Not every project needs twelve pain themes or nine competitor comparisons. Choose the explicitly reviewed documentation depth that matches its scope:

```sh
leancraft profile lean --by "Product Owner" --reason "Small low-risk utility"
leancraft profile standard --by "Product Owner" --reason "Commercial application"
leancraft profile assured --by "Product Owner" --reason "Research-intensive high-impact product"
```

Profiles change numerical research and specification minimums. They do **not** prove customer claims, regulatory compliance or security. Switching is blocked while the contract is locked, and decisions are recorded in the joint audit.

## Source verification safety

`leancraft validate --fetch` does not make outbound requests by default. The optional URL HEAD checker requires a manually vetted `research.fetchAllowlist` of public HTTPS hostnames; it does not follow redirects. Network isolation remains the operator's responsibility, and URL reachability is not evidence that a quote or price is accurate.

## Actual test execution

Add project-specific commands to `.leancraft/config.json`:

```json
"quality": {
  "commands": [["node", "--test"], ["node", "scripts/check-build.mjs"]],
  "timeoutMs": 120000
}
```

Each command is an executable with an argument array, not a shell snippet. LeanCraft runs commands and stores their actual exit status, duration and SHA-256 output digest. Release gating ties this report to Git HEAD, clean tracked files and the current approved contract. It does not execute or inspect an AI model or deploy a product.

## Coding-agent integrations

The scaffold includes shared `AGENTS.md` plus Claude Code and OpenCode skill files, Cursor rules and a local stdio MCP server. The MCP server can read current intent/context, run non-mutating readiness checks, report trace coverage and **draft** proposals for human-document changes without applying them.

Support inside any specific coding-agent host should be tested separately; a file existing on disk does not prove that a host loaded it.

## Trust and limitations

A local lock, hash, Git hook or self-declared reviewer cannot stop an unrestricted shell-capable agent from editing files. Strong control requires independent GitHub branch reviews, separate credentials, actual sandboxing and tightly scoped tool permissions. Document research URLs are not proof of quotes or prices; unit tests are not proof of universal correctness. Cost limits in the sample config remain advisory.

## Developers and maintainers

```sh
git clone https://github.com/sree-pm/Leancraft-Doc-first-agentic-coding.git
cd Leancraft-Doc-first-agentic-coding
npm run verify
```

CI runs on Linux, macOS and Windows with Node 22 and 24, including a clean installation from an npm tarball. The release workflow is gated by tests and requires npm trusted-publisher configuration before publishing.

See [Workflow](docs/WORKFLOW.md), [Architecture](docs/ARCHITECTURE.md), [Acceptance Matrix](docs/ACCEPTANCE_MATRIX.md), [Release Checklist](docs/RELEASE_CHECKLIST.md), [Security](SECURITY.md) and [Contributing](CONTRIBUTING.md).

**Current development version:** 0.3.0, not yet published. MIT licence.
