# Versioned release checklist

- [ ] All Linux/macOS/Windows jobs on Node 22 and 24 green for exact release SHA.
- [ ] `npm run verify` and packed-package clean-install test green.
- [ ] Installer upgrade tests preserve user research, custom skills, agent history and Git hooks.
- [ ] Contract, trace, review, stale-evidence and MCP negative tests green.
- [ ] CodeQL analysis clean, plus reviewed dependency/secret risks.
- [ ] Documentation and examples match implemented commands and security boundaries.
- [ ] External GitHub branch rules require passing checks and independent human review.
- [ ] npm trusted publisher configured for this repo/workflow.
- [ ] Tag matches package.json; publish npm after tests, then GitHub release.
- [ ] Smoke test published archive in a fresh project with real coding-agent host where feasible.
- [ ] Maintain an honest list of unverified functionality. No claim of 100% certainty.
