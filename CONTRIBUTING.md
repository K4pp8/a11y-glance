# Contributing

Thank you for taking a closer look. Keep changes small and explain the user problem they solve.

## Local setup

Use Node.js 22.6+ and npm. Run `npm ci`, `npm run build`, and load `dist/` in Chrome's extensions page. Reload the extension and refresh the inspected page after rebuilding. The project has no backend or required environment variables.

Read [design.md](design.md) before UI work and [test.md](test.md) before changing behavior. The application, source comments, issues, and documentation use English.

## Before a pull request

1. Reproduce the issue with a small, public or synthetic page. Never commit private page dumps or customer data.
2. Add a meaningful test for changed grouping, export, stale-state, messaging, or interaction behavior.
3. Run `npm run check`, `npm run test:browser`, and `npm run format:check`.
4. For UI changes, inspect light/dark screenshots at 320, 380, and 480px and check keyboard focus. Explain any snapshot updates.
5. Update the relevant specification when behavior changes. Report unperformed manual checks honestly.

In the PR description, state what was wrong, what happens now, and how it was verified. Include screenshots for visual changes. Do not claim Apple, WCAG, or legal certification based on automated results.

## Scope

This project focuses on inspect → understand → export. Discuss features that add persistent data, permissions, external network requests, or new workflows before implementing them. Prefer platform APIs and the existing dependencies. Keep tokens centralized and avoid unrelated cleanup.

## Releases

Update `package.json`, `package-lock.json`, and `public/manifest.json` to the same version. Record changes in `CHANGELOG.md`, run the full checks and the manual release checks in `test.md`, then use `npm run package`. Inspect the ZIP for secrets, development files, correct permissions, and license notices. A GitHub prerelease is distinct from Chrome Web Store distribution, which is not configured here.

Contributions use the repository's MIT license. Dependencies keep their own licenses. Be respectful, explain disagreements with evidence, and do not post sensitive security details in public issues.
