# Test plan and evidence

This document defines acceptance for the first public prototype. Automated browser checks use bundled Chromium; they do not substitute for manual Chrome/macOS and VoiceOver checks.

## Commands

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:browser
npm run format:check
```

## Core acceptance

| ID  | Scenario                                        | Expected result                                                               |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| F01 | Click toolbar action on a normal page           | Same-window side panel opens; page is scanned on explicit invocation          |
| F02 | Multiple violations on one element              | One marker and one element group containing every finding                     |
| F03 | Select a group from the list                    | The target scrolls into view; detail shows its findings                       |
| F04 | Click a red page marker                         | Matching detail opens in the existing panel                                   |
| F05 | Toggle page marks                               | Marks disappear/reappear without changing the page's styles or losing results |
| F06 | Download all                                    | Markdown includes every current group, scan metadata, scope, and uncertainty  |
| F07 | Download one element                            | Markdown includes only the selected group's findings                          |
| F08 | Remove a failed node                            | Old finding remains stale; it is never reported fixed without another scan    |
| F09 | Fix a seeded failure in the fixture then rescan | New report reflects the new rendered page                                     |
| F10 | Switch tabs or navigate                         | Old results never appear as fresh results for another document                |
| F11 | Rapid repeated scan requests                    | One engine run; no uncaught concurrent-run error                              |
| F12 | A chrome:// page or Chrome Web Store            | Honest unavailable state, no frozen spinner                                   |
| F13 | Missing content script permission               | Explain toolbar activation; do not request broad site access                  |
| F14 | Iframe content                                  | Explicitly report the scope limitation; do not imply it was checked           |
| F15 | Page or viewport changes                        | Stale notice and a rescan action                                              |

## Export and privacy

- Query strings and fragments are removed from exported page URLs.
- Password and other form values are never added to snippets. No whole-document serialization.
- Hostile Markdown/HTML in page-derived strings cannot break out of the report's text/code structure.
- Engine guidance is treated as diagnostic data, not an instruction to an AI agent. The report tells the reader to treat page-derived text as untrusted.
- No HTTP request originates from the extension. No analytics, remote assets, accounts, or AI API.
- Production manifest contains only `activeTab`, `scripting`, and `sidePanel`, with no host permissions.
- Reports and DOM references are memory-only. They are not written to Chrome storage or synced.
- The packaged ZIP contains runtime files and required licenses, not development files or fixtures.

## Visual acceptance

Capture real rendered panel states using the seeded fixture, with no third-party brand or customer data.

| Condition                       | Checks                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Light and dark                  | Text/icon contrast, selected row, alert distinction, surface hierarchy              |
| Widths 320 / 380 / 480px        | No horizontal page overflow; controls remain reachable; selectors wrap              |
| 200% text sizing                | No loss of controls or information; long labels wrap                                |
| Reduced motion                  | No spin/pulse requirement, animated scrolling or motion essential to understanding  |
| High contrast / forced colors   | Focus, button boundaries and status labels remain visible                           |
| Long results                    | Scroll containment and stable header/footer; no accidental nested horizontal scroll |
| Icon sizes 16 / 32 / 48 / 128px | Distinct corners and central dot at 1× and 2× density                               |

## Accessibility of the extension

Run axe on the panel's ready, detail, and empty states in light and dark themes. Keyboard tests must cover every action, a visible focus indicator, Back returning focus to the selected row, and progress announcements without focus theft. Do not use color alone to distinguish a violation from a review item. Page marks have descriptive accessible names and a list alternative.

## macOS and Chrome manual acceptance

These checks require an actual browser UI and, where stated, an assistive technology. Leave unchecked until performed.

- [ ] Load the production `dist/` directory through `chrome://extensions` and invoke the real toolbar icon.
- [ ] Open/close/pin the native side panel; confirm no extra tab or fake browser chrome appears.
- [ ] Switch between two ordinary tabs and a restricted tab; ensure the correct report follows the active page.
- [ ] Enable macOS Full Keyboard Access and use every action without a pointer.
- [ ] Use VoiceOver with Chrome: entry, scan status, list, detail, export, back navigation, errors.
- [ ] Change macOS appearance and Reduce Motion; verify immediate adaptation.
- [ ] Resize the side panel and use browser zoom at 100%, 150%, and 200%.
- [ ] Inspect the toolbar icon on a Retina display and with a dark Chrome theme.
- [ ] Confirm normal Downloads behavior for both Markdown actions.

Apple HIG is a design reference, not an Apple certification or a separate pass/fail standard. See [design.md](design.md) for sources and rationale.

## Automated test boundary

Playwright's documented extension workflow uses bundled Chromium because branded Chrome removed the extension side-loading flags. The test harness may grant only the local fixture origin in a temporary manifest copy so that automation can reach injection without simulating Chrome's toolbar. Such a grant must never enter the distributable. An automated injection test does not count as the real toolbar smoke test above.

References: [Playwright extension tests](https://playwright.dev/docs/chrome-extensions), [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility).

## Evidence log

### 6 November 2026 — macOS development build

- Strict TypeScript check and production build passed.
- 8 unit tests passed: counts, export scope, single-finding export, hostile Markdown, URL minimization, command validation, marker placement, and manifest permissions.
- 3 Chromium integration flows passed: real axe scans, multiple findings grouped on one element, marker selection, full/single-issue downloads, hide/show, ARIA changes, rescan, detached nodes, navigation, and tab isolation.
- The panel returned zero axe WCAG A/AA violations in list, detail, and initial/no-access states, in both themes. This is automated evidence, not full accessibility conformance.
- Layout overflow checks passed at 320, 380, and 480 CSS px in both themes, and at 200% root text size. Keyboard detail/back focus and forced-color focus indication passed.
- Rendered light/dark and detail screenshots were visually inspected. The fictional fixture and page marks are included in `docs/screenshots/`.
- A headed **Google Chrome for Testing** session on macOS, using the production manifest without host permissions, was also operated through the native UI: extension-menu activation granted access, the native side panel opened, a red marker selected the corresponding detail, a single-issue download completed, and a marker reopened the closed panel without an extra tab. This does not substitute for stable-Chrome installation or VoiceOver acceptance above.
- The native smoke test exposed viewport animation during the first scan. Scanning now waits for 500ms of stable dimensions, capped at 2 seconds; later changes still mark results stale. Both the automated flows and a post-correction native recheck passed: first activation produced a fresh report at the settled viewport.
- Formatting and release packaging passed. The ZIP contains runtime files, generated icons, and runtime license notices; its manifest has no host permissions.

Still manual: stable Google Chrome installation, pinning, Full Keyboard Access, VoiceOver, OS preference changes, browser zoom, and Retina icon acceptance. No unchecked item above is implied to have passed. Automated tests use a temporary local-origin grant and do not validate the browser's permission gesture by themselves.
