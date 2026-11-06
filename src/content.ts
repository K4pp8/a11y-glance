import axe from "axe-core";
import { initialState, isRequest, safePageUrl, type ElementGroup, type State } from "./model.ts";
import { Markers } from "./markers.ts";

declare global {
  var __a11yGlanceInstalled: boolean | undefined;
}

if (!globalThis.__a11yGlanceInstalled) {
  globalThis.__a11yGlanceInstalled = true;
  let state: State = { ...initialState };
  let elements = new Map<string, Element>();
  let marks: Markers | null = null;
  let revision = 0;
  let lastUrl = location.href;
  let staleTimer: ReturnType<typeof setTimeout> | undefined;

  const publish = () => {
    void chrome.runtime.sendMessage({ type: "GLANCE_STATE", state }).catch(() => {});
  };
  const renderMarks = () => {
    if (!state.showHighlights || !state.report || state.status === "scanning") {
      marks?.destroy();
      marks = null;
      return;
    }
    if (!marks)
      marks = new Markers((id) => {
        void chrome.runtime.sendMessage({ type: "GLANCE_OPEN" }).catch(() => {});
        select(id);
      });
    marks.update(state.report.groups, elements, state.selectedId);
  };
  const invalidate = () => {
    revision++;
    if (!state.report || state.stale) return;
    state = { ...state, stale: true };
    clearTimeout(staleTimer);
    staleTimer = setTimeout(publish, 100);
  };
  const select = (id: string | null) => {
    state = { ...state, selectedId: id };
    const element = id ? elements.get(id) : null;
    if (element?.isConnected)
      element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    else if (id) {
      if (state.report)
        state.report = {
          ...state.report,
          groups: state.report.groups.map((group) =>
            group.id === id ? { ...group, available: false } : group,
          ),
        };
      state.stale = true;
    }
    renderMarks();
    publish();
  };

  async function scan() {
    if (state.status === "scanning") return;
    state = { ...state, status: "scanning", error: null, selectedId: null };
    renderMarks();
    publish();
    // Native panel opening animates the viewport. Wait for a quiet interval,
    // with a deadline so continuous resizing cannot leave the scan waiting forever.
    let size = `${innerWidth}:${innerHeight}`;
    let stableSince = performance.now();
    const deadline = stableSince + 2000;
    while (performance.now() < deadline && performance.now() - stableSince < 500) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const nextSize = `${innerWidth}:${innerHeight}`;
      if (nextSize !== size) {
        size = nextSize;
        stableSince = performance.now();
      }
    }
    const startedRevision = revision;
    const scannedUrl = location.href;
    const viewport = { width: innerWidth, height: innerHeight };
    try {
      const results = await axe.run(
        { exclude: [["[data-a11y-glance]"]] },
        {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          },
          elementRef: true,
          iframes: false,
        },
      );
      const groups: ElementGroup[] = [];
      const byElement = new Map<Element | string, ElementGroup>();
      const nextElements = new Map<string, Element>();
      for (const kind of ["violations", "incomplete"] as const)
        for (const result of results[kind])
          for (const node of result.nodes) {
            const selector = node.target
              .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
              .join(" › ");
            const element =
              node.element instanceof Element && node.element.ownerDocument === document
                ? node.element
                : undefined;
            const key = element || selector;
            let group = byElement.get(key);
            if (!group) {
              const id = `element-${groups.length + 1}`;
              // Structural snippets intentionally exclude text, IDs, classes, and form values.
              const tag = element?.localName || "element";
              const role = element?.getAttribute("role")?.replace(/[^a-z -]/gi, "") || "";
              group = {
                id,
                selector,
                snippet: `<${tag}${role ? ` role="${role}"` : ""}>…</${tag}>`,
                label: element ? `${tag}${role ? ` · ${role}` : ""}` : "Page element",
                available: Boolean(element?.isConnected),
                findings: [],
              };
              byElement.set(key, group);
              groups.push(group);
              if (element) nextElements.set(id, element);
            }
            group.findings.push({
              rule: result.id,
              kind: kind === "violations" ? "issue" : "review",
              title: result.help,
              summary:
                node.failureSummary ||
                [...node.any, ...node.all, ...node.none].map((check) => check.message).join("\n"),
              impact: node.impact || result.impact || "unspecified",
              tags: result.tags.filter((tag) => /^wcag\d/.test(tag)),
              helpUrl: result.helpUrl,
            });
          }
      elements = nextElements;
      state = {
        ...state,
        status: "ready",
        stale:
          revision !== startedRevision ||
          location.href !== scannedUrl ||
          innerWidth !== viewport.width ||
          innerHeight !== viewport.height,
        report: {
          url: safePageUrl(scannedUrl),
          scannedAt: results.timestamp,
          engine: results.testEngine.version,
          viewport,
          groups,
          frameCount: document.querySelectorAll("iframe, frame").length,
        },
      };
    } catch {
      state = {
        ...state,
        status: "error",
        stale: Boolean(state.report),
        error: "The scan could not finish. Wait for the page to settle and try again.",
      };
    }
    renderMarks();
    publish();
  }

  const observer = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          !(
            record.target instanceof Element ? record.target : record.target.parentElement
          )?.closest("[data-a11y-glance]"),
      )
    )
      invalidate();
  });
  observer.observe(document.body || document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  });
  window.addEventListener("resize", invalidate);
  window.addEventListener("input", invalidate, true);
  // Isolated-world history hooks cannot observe every SPA router. Only URL checks run here, never scans.
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      invalidate();
    }
  }, 1000);
  window.addEventListener("pagehide", () => {
    marks?.destroy();
    marks = null;
    state.stale = Boolean(state.report);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      renderMarks();
      publish();
    }
  });

  chrome.runtime.onMessage.addListener((request: unknown, sender, respond) => {
    if (sender.id !== chrome.runtime.id || !isRequest(request)) return;
    if (request.type === "GLANCE_GET") {
      respond(state);
      return;
    }
    if (request.type === "GLANCE_SCAN") void scan();
    if (request.type === "GLANCE_ENABLE") {
      state = { ...state, showHighlights: true };
      if (!state.report || state.stale) void scan();
      else {
        renderMarks();
        publish();
      }
    }
    if (request.type === "GLANCE_SELECT") select(request.id);
    if (request.type === "GLANCE_HIGHLIGHTS") {
      state = { ...state, showHighlights: request.enabled };
      renderMarks();
      publish();
    }
    respond({ accepted: true });
  });
}
