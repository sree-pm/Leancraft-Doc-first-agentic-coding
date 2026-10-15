# LeanCraft workspace

The `config.json` registry is the starting document contract. `human/` holds reviewed product direction, `agent/progress.md` holds durable implementation progress, `agent/context.md` is derived, `agent/proposals/` holds unapplied edits, and `joint/` stores joint records.

`templates/` are intentionally incomplete. `runtime/` contains project-local tools and MCP entrypoint installed with `npx leancraft init`. After updating LeanCraft, `npx leancraft init --force` refreshes managed files without erasing human authored docs.

A lock is a cooperative review marker and cannot secure documents from shell-capable agents. External permissions and branch protections enforce actual access boundaries.
