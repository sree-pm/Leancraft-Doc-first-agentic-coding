# LeanCraft

**Document-first, human-reviewed workflow for AI-assisted software development.**

LeanCraft makes the product contract explicit and traceable before coding, persists context between sessions and provides portable scaffolding for different agent hosts. It is an open-source CLI and MCP companion, **not** an autonomous coding agent or secure sandbox.

## Installation

Requires Node.js 20 or newer. From a project directory:

```sh
npx leancraft@latest init
npx leancraft validate
npx leancraft doctor
```

The first validation is expected to fail, because research and specification templates have not been filled. Do not invent content merely to pass the validator.

For pinned team installations use `npm install --save-dev leancraft@0.2.0` then `npx leancraft init`. The `--force` init option refreshes managed runtime, agent skills and templates without overwriting existing human research or decisions.

## Six-stage workflow

1. **Understand:** inspect the existing repository, problem, users and constraints; distinguish facts and assumptions.
2. **Discover:** gather documented pain, competitor and user evidence with source URLs, dates and confidence.
3. **Define:** write requirements, flows, feature specifications, invariants, oracles, architecture, privacy and accessibility constraints.
4. **Human review:** validate the contract, approve decisions and lock. Agents propose rather than edit locked human documents.
5. **Build and verify:** implement bounded feature slices with unit, integration, E2E, security and regression tests. Maintain persistent progress.
6. **Release and learn:** review pull requests, CI, packaging, licence, telemetry and post-release outcomes. Update contracts through human review.

The default template registry has detailed requirements. Adapt depth to your project's risk and stage by explicitly reviewing the registry, not by making up evidence.

## Workspace

| Directory | Responsibility |
| --- | --- |
| `.leancraft/human/discovery/` | Human-reviewed research and PRD |
| `.leancraft/human/definition/` | Intent, invariants, architecture, guardrails and feature specs |
| `.leancraft/agent/progress.md` | Persistent agent progress, never overwritten by sync |
| `.leancraft/agent/context.md` | Short derived context for agent handoffs |
| `.leancraft/agent/proposals/` | Unapplied change proposals for human review |
| `.leancraft/joint/` | Decision history, test reports and observed ledger events |
| `.leancraft/templates/` | Registry templates |
| `.leancraft/runtime/` | Portable scripts used by project-local MCP and hooks |

The scaffold includes shared `AGENTS.md`, Claude Code skills, OpenCode skills and Cursor rules. Verify each host actually loads its integration. The local MCP server is configured by `.mcp.json`, and `npx leancraft mcp` prints its launch configuration.

## Commands

```sh
npx leancraft init [--force]
npx leancraft validate [--fetch]
npx leancraft templates
npx leancraft lock
npx leancraft unlock
npx leancraft features
npx leancraft sync
npx leancraft status
npx leancraft budget
npx leancraft doctor
npx leancraft mcp
```

`validate` checks document structure, required sections, distinct IDs and source URL formatting. With `--fetch` it can make bounded HTTP HEAD checks. It **does not** verify quotes, pricing accuracy or that software works. Only real implementation tests can do that.

`lock` records cooperative review state. Shell-capable agents can bypass the CLI, Git hooks and Markdown instructions. Strong control requires isolated execution, scoped credentials, protected branches and reviewer approvals. Spending limits and network restrictions in configuration are advisory.

## Contributing

Clone `https://github.com/sree-pm/Leancraft-Doc-first-agentic-coding.git` and run `npm run verify` to execute fixture-based CLI/MCP/security tests and dry-run package contents. See [Workflow](docs/WORKFLOW.md), [Architecture](docs/ARCHITECTURE.md), [Security](SECURITY.md), [Contributing](CONTRIBUTING.md) and [Release Checklist](docs/RELEASE_CHECKLIST.md).

MIT licensed.
