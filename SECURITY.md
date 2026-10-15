# LeanCraft security policy

Report vulnerabilities privately at https://github.com/sree-pm/Leancraft-Doc-first-agentic-coding/security/advisories/new

## Security boundary

LeanCraft manages file-based contract workflow, source-format checks, local MCP tools and test-evidence records. It is **not** a sandbox, a reviewer authentication system, an API-spending limiter, a network firewall or a secrets vault. A process with unrestricted shell access can rewrite configuration and evidence. Never treat local review attestations or hashes as proof of independent authorisation.

For strong protections, use separate human accounts, required GitHub branch reviews, least-privilege agent access, controlled credentials, sandboxed execution and monitored network egress.

## Untrusted inputs

User research, third-party websites, MCP requests, proposal diffs and model output are untrusted. No content from these sources should override trusted instructions. MCP human-document amendments remain unapplied pending review. Filesystem writes refuse selected symlinked paths; this is defence in depth, not complete isolation.

The optional `validate --fetch` command is **default-deny**. Network requests require explicitly configured research.fetchAllowlist hostnames, HTTPS and no redirect following. Allowlisting cannot rule out DNS rebinding or all internal-network access; execute remote fetches inside an appropriately controlled network environment. A successful HEAD request proves neither quotation nor pricing accuracy.

Run configured quality commands only for code you trust or inside a sandbox. The verifier does not store raw console output to reduce accidental secret retention, but scripts still inherit the invoking process's privileges.

## Supported versions

Latest published npm release and default development branch, subject to maintainer review. Do not disclose unpatched vulnerabilities in public issues.
