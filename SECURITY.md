# Security policy

Report security vulnerabilities privately through https://github.com/sree-pm/Leancraft-Doc-first-agentic-coding/security/advisories/new

LeanCraft is a file-based CLI, scaffold and MCP tool. It does NOT implement an OS sandbox, a secure credential store, network isolation, authenticated human approvals or enforced API budgets. Lock flags and git hooks can be bypassed by actors with filesystem/shell privileges. Use least-privilege agent processes, branch protection, required code reviews, isolated execution and separately secured credentials. MCP proposals are untrusted and never applied automatically.

Supported: latest release and main branch. Fixes are prioritised by vulnerability impact.
