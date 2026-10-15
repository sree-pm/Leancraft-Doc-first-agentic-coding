# LeanCraft v0.3 architecture

The system is a dependency-light Node CLI plus portable local runtime, templates, agent rules, stdio JSON-RPC MCP tools and file-based review/verification history.

**Human layer:** reviewed discovery/PRD/feature contracts under .leancraft/human/. Lock records a SHA-256 manifest. Separate named review captures a digest of contract-bearing config and files.

**Agent layer:** durable progress, derived context and non-applying change proposals. Derived summaries never supersede the original contract.

**Evidence layer:** quality.commands stores executable argv vectors. The verifier uses no shell, records exit statuses and output digests, and binds the report to the current Git revision and contract. Build/release gates check actual evidence and trace FR, Flow and Persona.

**Distribution layer:** installer tracks versioned managed-file digests. It preserves human docs, custom agent rules and existing hooks; --force upgrades unchanged managed files and reports conflicts, backing up legacy runtimes. The repository ships Claude/OpenCode skills, Cursor rules and shared AGENTS.md.

**MCP:** local stdio newline-delimited JSON-RPC, protocol version negotiation for 2025-06-18 and legacy 2024-11-05. Tools read contract/context/progress/status/gates and write only pending proposals.

**Threat model:** A process with unrestricted filesystem/shell access can rewrite local locks, review records and verification files. True human authorisation requires external identity/branch protection. External sandbox/secret/network restrictions are required for malicious or compromised agents. Code changes, tests and research must still undergo independent validation.
