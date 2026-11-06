# Security and privacy

## Threat model

The inspected page is untrusted. Findings, locators, and page-derived strings are data. The extension renders them as text, does not evaluate them, and does not expose a page-to-extension command bridge. Markdown exports warn downstream human and AI readers that the content is untrusted.

The content script runs in Chrome's isolated world. Only the user's explicit toolbar action grants temporary access. The shipping extension requests `activeTab`, `scripting`, and `sidePanel`; it has no persistent host permissions, remote code, telemetry, storage, or cloud service. The extension-origin CSP blocks network connections and inline/evaluated scripts.

Shadow DOM isolates styles, not trust. A hostile page can remove or obscure injected page marks. Use the extension-origin side panel and do not assume page marks are tamper-proof.

## Data handling

Reports and DOM references are memory-only. Explicit downloads are normal local files. Structural snippets exclude content and form values. Exported URLs omit credentials, query strings, and fragments. Selectors, URL paths, and engine guidance can still reveal identifying data. This feature is data minimization, not guaranteed anonymization.

Do not share reports from sensitive pages without reviewing them. A11y Glance never sends a report to an AI provider; the user controls that subsequent action.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** option when enabled for this repository. If private reporting is unavailable, open a minimal issue requesting a private contact channel without posting an exploit, credentials, private page content, or personal data. Do not assume a response time guarantee for this personal project.

## Supported versions

The latest commit on `main` and the latest preview are the maintained targets during this early stage. There is no long-term support promise. Update dependencies through reviewed pull requests and preserve their license notices.
