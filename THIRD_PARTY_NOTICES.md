# Third-party notices

A11y Glance's original code and artwork are licensed under MIT. Dependencies retain their own licenses.

| Dependency                  | License                    | Source                                |
| --------------------------- | -------------------------- | ------------------------------------- |
| axe-core                    | Mozilla Public License 2.0 | https://github.com/dequelabs/axe-core |
| React, React DOM, scheduler | MIT                        | https://github.com/facebook/react     |

The build bundles unmodified axe-core from the exact package-lock version and retains its license notice. Its corresponding published source is available from the repository's matching version tag and the npm package. Full runtime dependency license texts are included in `dist/licenses/` and every release ZIP. The project's MIT license does not replace axe-core's MPL terms. Contributions changing dependency code must preserve the relevant license obligations.

Build and test dependencies are not shipped in the extension. See `package-lock.json` for their exact versions and license metadata. The icon and UI symbols are original SVG artwork. No Apple or Google brand assets or proprietary fonts are bundled.
