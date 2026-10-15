# Architecture and trust boundaries

LeanCraft comprises a Node.js CLI, a registry of Markdown/JSON templates, a project-local copy of runtime scripts, a JSON-RPC MCP stdio server and optional Git hooks. The package is zero runtime third-party dependencies.

The CLI uses argument-array child processes, not user-supplied shell strings. Installation copies required runtime scripts to `.leancraft/runtime/`; MCP reads reviewed source files and writes UUID-named proposal drafts only.

`sync` regenerates context and status but never overwrites `agent/progress.md`. It appends events without inventing token usage. Validation checks sections, unique identifiers, source URL format and traces, not quote truth or code safety.

At lock time, SHA-256 digests of the human-owned document tree are stored in the configuration and validated on subsequent checks. This catches accidental drift but can itself be rewritten by an unrestricted shell process. The Git hook and locked flag are voluntary cooperation mechanisms. A process with full shell access can bypass them. Use OS isolation and GitHub branch rules for actual enforcement. Implement secret control, network control and metering outside this package. Do not expose the MCP tool to untrusted remote clients without authentication and authorisation.

Version npm packages separately from the workspace config schema. During upgrades keep authored research, decisions and progress intact.
