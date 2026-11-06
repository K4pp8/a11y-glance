# Architecture

One package, four runtime responsibilities. The inspected website never needs an integration script or a source-code change.

## Runtime boundaries

| Component                 | Runs in                                             | Owns                                                                    |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| Background service worker | Extension                                           | Toolbar gesture, native panel opening, packaged injection               |
| Content script            | Chrome's isolated world in the granted top document | axe scan, serializable report, live element references, stale detection |
| Markers                   | Shadow DOM attached by the content script           | Temporary outlines, numbered buttons, page-to-panel selection           |
| React side panel          | Extension origin                                    | List/detail presentation, active-tab context, local Markdown download   |

`model.ts` contains the serializable contract. `report.ts` is a pure serializer shared with unit tests. Raw DOM references stay in the content script and never cross messages.

## Entry

The toolbar action grants temporary `activeTab` access. The worker calls `sidePanel.open` within that user gesture, then pings the current tab. If no content script exists, it injects `content.js` from the installed package. `GLANCE_ENABLE` enables marks and starts a scan only if no current usable report exists.

The panel is not a popup. It stays available while someone clicks on the inspected page. A page marker can request reopening the same native panel through the background worker during its click gesture.

## Commands and updates

- `GLANCE_GET`: returns the current in-memory state.
- `GLANCE_ENABLE`: enables marks and, where needed, scans.
- `GLANCE_SCAN`: explicit new scan; concurrent requests are ignored.
- `GLANCE_SELECT`: selects a group and locates its retained DOM element.
- `GLANCE_HIGHLIGHTS`: controls temporary marks without deleting results.
- `GLANCE_STATE`: content script broadcasts a new snapshot to extension listeners.
- `GLANCE_OPEN`: marker click requests the native panel.

Commands validate their shape and extension sender. The panel matches `sender.tab.id` to its current active tab and ignores other tabs' updates. There is no `window.postMessage` bridge, externally connectable API, arbitrary code execution command, or remote script.

## Scan lifecycle

`idle → scanning → ready` or `error`. The previous report may remain available after an error, but it stays stale. Markers are removed during scanning so they cannot obscure contrast targets. A short layout settling delay allows the side panel to resize the page before the scan captures viewport metadata.

axe runs the WCAG 2.0/2.1/2.2 A/AA tags with element references enabled and iframe scanning disabled. Violations and incomplete results become different finding kinds. Results sharing an actual element are grouped together; unresolved targets use their engine locator as the fallback identity.

There is no promise that every unknown result is an error, or that no detected errors means conformity. The report records scope and unknowns.

## Freshness and navigation

DOM/content changes, relevant accessibility/style attributes, user input, viewport changes, and URL changes invalidate the snapshot. A lightweight URL check covers SPA navigation that isolated-world history hooks cannot reliably intercept. It does not run axe. Document unload naturally removes the session; browser back/forward cache restoration retains the report as stale.

The side panel drops its previous state when active-tab context changes. An async request is guarded by a load sequence so a late response cannot replace a newer tab's state. Unreachable nodes remain documented; they are never counted as fixed solely because they vanished.

## Page marks

A Shadow DOM keeps the marker styles separate from most host CSS. It is not a security boundary against the website, which can still remove its host or visually overlap it. The list remains the fallback.

The marker layer does not block unrelated clicks. Only numbered buttons accept pointer input. Geometry updates follow scroll and resize notifications with animation-frame coalescing. Marker placement avoids collisions; overly dense groups stay selectable from the list. The scanner does not set or replace host-element inline styles.

## Persistence and exports

No report is stored in Chrome storage, disk, or a server automatically. The service worker keeps no report cache. This avoids losing correctness when Chrome suspends it. The page's content script is the report authority for that document.

Downloads are explicit local Blob URLs from the extension origin. Export can select all groups, one group, or a one-finding subset of a group. Markdown fences adapt to embedded backticks. Page URLs omit credentials/query/hash, structural snippets omit content/form values, and the report describes the residual privacy risk of selectors and messages.

## Build and delivery

TypeScript and esbuild produce three entry points: worker, content script, and panel. axe is bundled locally; no CDN is allowed. The build also generates icon PNGs from original SVG sources and includes all runtime licenses. The shipping manifest has no host permissions. The package command creates a loadable ZIP and checks that package/manifest versions agree.

Do not add an abstraction layer for other browsers until there is an implemented second browser target. Do not add a database, cloud account, scheduler, visual fix editor, or model provider to solve a local diagnostic use case.
