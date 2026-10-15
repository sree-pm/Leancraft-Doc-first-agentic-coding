# Release acceptance checklist

- [ ] Run `npm run verify` on clean Linux with Node 22 and 24.
- [ ] Exercise fresh `npx leancraft init`, validation, human lock, unlock, feature generation, sync and MCP interaction.
- [ ] Verify package tarball contains all advertised runtime skills, scripts and configs.
- [ ] Confirm all source URLs and public-facing claims are accurate, and the documentation does not claim active sandbox or budget enforcement.
- [ ] Review implementation tests, dependency risks, licensing, source maps, rollback plan and release notes.
- [ ] Match `package.json` version to the release tag.
- [ ] Configure trusted npm publisher at npmjs.com for THIS GitHub repository and `.github/workflows/publish.yml` (external account action).
- [ ] Require GitHub branch rules and CODEOWNERS review (external repository administration).
- [ ] Publish npm using OIDC after tests pass, then create a GitHub release.
- [ ] Smoke test the published version from a clean machine.
- [ ] Record residual risks, follow-up issues and operational owner.
