# Design specification

Status: implemented direction for the first public prototype. Written before implementation on 6 November 2026. Manual macOS acceptance is tracked in [test.md](test.md).

## Product promise

Accessibility issues, one glance away.

A11y Glance helps a developer or designer notice a problem, locate the element, understand the finding, and export it for a human or AI coding assistant. It is a diagnostic instrument, not a visual editor or a compliance certificate.

The core path is: toolbar icon → scan → select an element → download a focused report. Opening another browser tab is never part of the product flow. The Chrome side panel is the persistent workspace. The inspected page gets optional temporary outlines and numbered markers only.

## Design research and decisions

Sources checked on 6 November 2026:

- [Apple: Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos): use familiar keyboard and pointer interactions, readable information density, and few nested levels.
- [Apple: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): redundant status cues, legible contrast, larger text, reduced motion, and explicit dismissal.
- [Chrome: extension UI components](https://developer.chrome.com/docs/extensions/develop/ui): use the action for entry and a side panel for persistent inspection alongside a page.
- [Chrome: Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel): let Chrome own the container and its window placement.
- [Anthropic: frontend design](https://claude.com/plugins/frontend-design) and [design through skills](https://claude.com/resources/articles/improving-frontend-design-through-skills): choose a contextual visual direction before coding and make typography, composition, and interaction deliberate.

The agent-design guidance is a research reference, not a package installed in this repository. Recommendations for expressive marketing pages do not all belong in a compact browser utility. System fonts are intentional here. No copied Apple artwork, SF Symbols assets, fake traffic-light controls, branding, or implied Apple/Google endorsement.

## Visual direction

Quiet precision. It should feel comfortable next to Chrome's controls on a Mac, while remaining usable on Windows and Linux. This is a web extension, not an AppKit application.

- Use system-ui and the platform's font rendering. Do not download fonts.
- Keep a stable header, one primary scan action, a compact summary, a list, and a detail view.
- Prefer rows and separators to a stack of nested cards. Use generous space around the main action and tighter spacing within related metadata.
- Use a restrained blue accent for actions and selection. Reserve red and amber for findings.
- Keep surfaces opaque. Translucent glass behind diagnostics can compromise contrast and is unnecessary inside Chrome's own frame.
- Follow the system light/dark preference. Do not create another settings page for theme selection.
- Avoid completion scores, celebratory green shields, streaks, AI sparkle icons, and decorative charts.

## Brand and icon

Name: **A11y Glance**. Repository: `a11y-glance`.

The mark consists of four rounded inspection corners and a central attention dot. The corners represent an element in context; the dot represents a finding. The dot is not a pass/fail state. Use the same silhouette in README, toolbar, and panel.

Editable sources: `assets/icon.svg` and an optically simplified `assets/toolbar.svg`. Generate PNG sizes 16, 32, 48, and 128 with the build script. The toolbar mark must remain identifiable at actual size on both themes. The brand uses deep blue, white, and a warm pale yellow dot. Product status colors are separate tokens.

## Tokens

Tokens live in `src/panel/styles.css`. Change tokens instead of scattering alternate colors through components.

| Purpose        | Light     | Dark      |
| -------------- | --------- | --------- |
| Canvas         | `#f6f6f8` | `#18191c` |
| Surface        | `#ffffff` | `#222429` |
| Main text      | `#202127` | `#f1f2f5` |
| Secondary text | `#626570` | `#b0b4c0` |
| Separator      | `#e2e3e8` | `#3a3d45` |
| Action         | `#254dd8` | `#a7baff` |
| Action text    | `#ffffff` | `#15214f` |
| Issue text     | `#ad2925` | `#ffb4ab` |
| Review text    | `#795300` | `#efcc80` |

Spacing scale: 4, 8, 12, 16, 20, 24, 32 CSS px. Body: 13px/1.5, major heading: 22px/1.2, section labels: 11px with modest tracking, issue titles: 14px/1.4. Text is expressed in rem so browser font preferences can scale it. Small metadata never carries the only explanation.

Control target: at least 32 × 32 CSS px; primary controls at least 36px high. Keyboard focus uses a 2px outline with 3px offset. Corner radius: 7px for controls, 10px for functional surfaces. Avoid pill shapes except status dots. Icons use a consistent 20px viewbox and 1.7px stroke.

## Interaction contract

### Entry and scanning

- Clicking the extension icon opens the panel in the same window and enables a scan on the current eligible tab.
- Do not request access to every website at installation. Ask Chrome for temporary access through `activeTab`.
- Do not rescan continuously. A visible Scan again action controls expensive work.
- While scanning, disable duplicate requests, announce progress, and retain a calm layout. Hide injected markers during measurement.
- Restricted pages explain why inspection is unavailable and how to continue on a normal web page.

### Results

- Group findings by element, not by rule. A button with three findings is one element row.
- Separate definite issues and needs-review findings. Use wording, symbols, and border patterns as well as color.
- Show element and finding counts separately; these are not percentages of compliance.
- Clicking a row scrolls to and marks its element. Clicking a page marker selects the corresponding group in the open side panel.
- A small eye control turns all page marks on/off. It does not delete the report.
- Markers must not capture unrelated clicks. Dense or unreachable targets remain available from the list. Shadow DOM targets can be selected through retained element references; iframe documents are explicitly outside the first-version scope.

### Detail

One level deep, with an All elements back control. Show the element locator, each finding's short explanation, impact, WCAG tags, original engine guidance, and an external reference link. Offer Download this element's issues and a Download this issue action beside each finding. Exports contain only the chosen scope, even when the full report has many groups.

The detail view is not an editor. No color picker, CSS input, auto-fix, or AI chat box.

### Export

- Download all issues from the list; download the selected element's issues from detail.
- Use Markdown with readable issue descriptions and structured technical context.
- Include scan time, engine version, URL without query/hash, viewport, stale status, scope limits, selectors, structural snippets, and next verification steps.
- Never claim a source file location inferred solely from a DOM selector. Instruct the coding assistant to find the responsible source component.
- Omit input values and page text from structural snippets. Locators and engine messages may still contain identifying data. Explain that reports require review before sharing sensitive pages.
- No external AI request is sent. The user chooses where to take the downloaded file.

### Changes and navigation

When content, significant accessibility attributes, URL, or viewport changes, mark the report stale. Do not silently label vanished nodes as fixed. Clear the panel when the active tab changes so results are never attributed to another page. A new document has a new in-memory session. Closing the browser loses the report. There is no audit history in version one.

## Required states

| State              | What the user sees                        | Main action          |
| ------------------ | ----------------------------------------- | -------------------- |
| No access yet      | Brief explanation and toolbar instruction | Activate on the page |
| Scanning           | Progress text; no invented percentage     | Wait                 |
| Results            | Counts, list, page marks                  | Select an element    |
| Detail             | One element and all its findings          | Export element       |
| No detected issues | Neutral result with review limitations    | Scan again           |
| Needs review only  | Amber count and explicit uncertainty      | Inspect findings     |
| Stale              | Compact persistent notice                 | Scan again           |
| Restricted page    | Specific explanation                      | Open a regular page  |
| Detached element   | Finding retained, location unavailable    | Scan again           |
| Engine failure     | Plain error, report not marked fresh      | Retry                |

## Agent implementation loop

1. Read this file and the relevant test cases before editing UI.
2. Implement real states with realistic short and long content. Keep fixtures separate from production code.
3. Inspect light/dark screenshots at 320, 380, and 480px. Review density, hierarchy, wrapping, clipping, and focus.
4. Run keyboard and axe checks on the extension itself, not only on the sample page.
5. Correct what the rendered result reveals. Update documentation when behavior changes.
6. Record actual evidence in `test.md`. An unchecked manual test is not a pass.

Do not turn generic design advice into extra product features. All text and project documentation are English. Technical IDs may stay in the engine's original vocabulary.
