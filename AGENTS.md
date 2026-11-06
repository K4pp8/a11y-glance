# Working in A11y Glance

Read `design.md` for UI changes and `test.md` for behavior/verification. Keep public text and documentation in English. Read `docs/architecture.md` before changing message flow.

Preserve the product's small scope: inspect, understand, export. No fix editor, account, telemetry, backend, or new host permissions without a concrete user requirement. Never copy real customer pages, credentials, or proprietary brand assets into fixtures or screenshots.

Use existing design tokens, system typography, native buttons, and semantic headings. Implement light/dark, focus, narrow layouts, and reduced motion together. Inspect rendered screenshots; compilation alone is not visual verification.

Keep page-derived data untrusted. Never render diagnostic HTML with `innerHTML`, execute page content, or invent source-file mappings. Preserve incomplete results and stale state. A missing element is not a verified fix.

Run meaningful checks for the change. Do not mark manual Chrome, macOS, or VoiceOver checks as passed based on headless Chromium. Keep the temporary local-origin permission in the test harness only, never in `public/manifest.json` or a release ZIP.
