import { useEffect, useRef, useState } from "react";
import { counts, initialState, type ElementGroup, type Request, type State } from "../model.ts";
import { toMarkdown } from "../report.ts";
import { Icon } from "./icons.tsx";

export function App() {
  const [state, setState] = useState<State>({ ...initialState });
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [access, setAccess] = useState(false);
  const [filter, setFilter] = useState<"all" | "issue" | "review">("all");
  const [notice, setNotice] = useState("");
  const tabId = useRef<number | null>(null);
  const loadSequence = useRef(0);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const sequence = ++loadSequence.current;
      const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (sequence !== loadSequence.current) return;
      tabId.current = current?.id ?? null;
      setTab(current ?? null);
      setState({ ...initialState });
      setAccess(false);
      setNotice("");
      if (!current?.id || !/^https?:/.test(current.url || "")) return;
      try {
        const next = await chrome.tabs.sendMessage(current.id, { type: "GLANCE_GET" });
        if (sequence === loadSequence.current) {
          setState(next as State);
          setAccess(true);
        }
      } catch {
        /* The toolbar action is the only entry point that grants activeTab. */
      }
    }
    const activate = () => {
      void load();
    };
    const update = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId.current && info.status === "loading") {
        setState({ ...initialState });
        setAccess(false);
      }
      if (id === tabId.current && info.status === "complete") void load();
    };
    const message = (
      message: { type?: string; state?: State; tabId?: number; error?: string },
      sender: chrome.runtime.MessageSender,
    ) => {
      if (sender.id !== chrome.runtime.id) return;
      if (message.type === "GLANCE_STATE" && sender.tab?.id === tabId.current && message.state) {
        setState(message.state);
        setAccess(true);
      }
      if (message.type === "GLANCE_FAILURE" && message.tabId === tabId.current)
        setState((s) => ({
          ...s,
          status: "error",
          error: message.error || "Inspection is unavailable here.",
        }));
    };
    void load();
    chrome.tabs.onActivated.addListener(activate);
    chrome.tabs.onUpdated.addListener(update);
    chrome.runtime.onMessage.addListener(message);
    return () => {
      loadSequence.current++;
      chrome.tabs.onActivated.removeListener(activate);
      chrome.tabs.onUpdated.removeListener(update);
      chrome.runtime.onMessage.removeListener(message);
    };
  }, []);

  useEffect(() => {
    if (state.selectedId && state.selectedId !== lastSelected.current) detailTitle.current?.focus();
    if (!state.selectedId && lastSelected.current)
      document.getElementById(`row-${lastSelected.current}`)?.focus();
    lastSelected.current = state.selectedId;
  }, [state.selectedId]);

  async function send(request: Request) {
    if (!tabId.current) return;
    const target = tabId.current;
    try {
      await chrome.tabs.sendMessage(target, request);
    } catch {
      if (target === tabId.current) {
        setAccess(false);
        setState((s) => ({
          ...s,
          stale: Boolean(s.report),
          status: "error",
          error:
            "This page changed or access expired. Click the extension's toolbar icon to reconnect.",
        }));
      }
    }
  }

  function download(group?: ElementGroup) {
    if (!state.report) return;
    const url = URL.createObjectURL(
      new Blob([toMarkdown(state.report, state.stale, group)], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `a11y-glance-${group ? group.id : "all-issues"}-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(group ? "Element report downloaded." : "Full report downloaded.");
  }

  const busy = state.status === "scanning";
  const summary = counts(state.report);
  const selected = state.report?.groups.find((group) => group.id === state.selectedId);
  const groups =
    state.report?.groups.filter(
      (group) => filter === "all" || group.findings.some((finding) => finding.kind === filter),
    ) ?? [];
  const hostname = (() => {
    try {
      return new URL(state.report?.url || tab?.url || "").hostname;
    } catch {
      return "Current page";
    }
  })();
  const unavailable = Boolean(tab?.url && !/^https?:/.test(tab.url));

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="icons/icon-32.png" width="28" height="28" alt="" />
          <span>
            A11y <strong>Glance</strong>
          </span>
          <span className="beta">Preview</span>
        </div>
        <button
          className="icon-button"
          title={state.showHighlights ? "Hide page highlights" : "Show page highlights"}
          aria-label={state.showHighlights ? "Hide page highlights" : "Show page highlights"}
          aria-pressed={state.showHighlights}
          disabled={!state.report || busy || !access}
          onClick={() => void send({ type: "GLANCE_HIGHLIGHTS", enabled: !state.showHighlights })}
        >
          <Icon name={state.showHighlights ? "eye" : "eye-off"} />
        </button>
      </header>
      <div className="page-context">
        <span className="page-glyph">
          <Icon name="page" />
        </span>
        <div>
          <span className="eyebrow">CURRENT PAGE</span>
          <p title={hostname}>{hostname}</p>
        </div>
        <span className="local-indicator" title="Analysis stays in your browser">
          <span />
          Local
        </span>
      </div>
      <main>
        <div className="scan-heading">
          <div>
            <h1>{selected ? "Element details" : "A closer look."}</h1>
            <p>
              {selected
                ? "Understand it. Then take it to your code."
                : "Find the small things that get in the way."}
            </p>
          </div>
        </div>
        <button
          className="primary scan-button"
          disabled={busy || !access}
          onClick={() => void send({ type: "GLANCE_SCAN" })}
        >
          <Icon name="scan" />
          {busy ? "Scanning this page…" : state.report ? "Scan again" : "Scan this page"}
          {!busy && <Icon name="arrow" className="push-right" />}
        </button>
        <p className="sr-only" role="status">
          {busy
            ? "Accessibility scan in progress."
            : state.report
              ? `${summary.issues} issues and ${summary.reviews} review findings across ${summary.elements} elements.`
              : "Activate A11y Glance from the extension toolbar icon."}
        </p>
        {state.stale && (
          <div className="callout review" role="status">
            <Icon name="review" />
            <div>
              <strong>Page changed since this scan</strong>
              <p>Scan again before relying on these results.</p>
            </div>
          </div>
        )}
        {state.error && (
          <div className="callout issue" role="alert">
            <Icon name="issue" />
            <p>{state.error}</p>
          </div>
        )}
        {!access && !busy && (
          <section className="empty">
            <span className="empty-mark">
              <Icon name="scan" />
            </span>
            <h2>{unavailable ? "This page is off limits" : "Your next glance starts here"}</h2>
            <p>
              {unavailable
                ? "Chrome protects its settings, store, and internal pages. Open a regular website to inspect it."
                : "Click A11y Glance in Chrome’s toolbar to inspect this tab. Page access is granted only when you ask. Protected Chrome pages cannot be scanned."}
            </p>
            <div className="steps">
              <span>1</span>Open a website
              <Icon name="chevron" />
              <span>2</span>Click the icon
            </div>
          </section>
        )}
        {busy && (
          <div className="scanning-state">
            <span className="scan-line" />
            <p>Checking rendered elements and contrast.</p>
            <small>Large pages can take a moment.</small>
          </div>
        )}
        {state.report &&
          !busy &&
          (selected ? (
            <section className="detail">
              <button
                className="back-button"
                onClick={() => void send({ type: "GLANCE_SELECT", id: null })}
              >
                <Icon name="back" />
                All elements
              </button>
              <div className="detail-heading">
                <span className="element-symbol">&lt;/&gt;</span>
                <div>
                  <h2 tabIndex={-1} ref={detailTitle}>
                    {selected.label}
                  </h2>
                  <p>
                    {selected.findings.length}{" "}
                    {selected.findings.length === 1 ? "finding" : "findings"} on this element
                  </p>
                </div>
              </div>
              <code className="locator">{selected.selector}</code>
              {!selected.available && (
                <p className="callout review">
                  This element cannot be located now. The finding remains in the report; rescan to
                  check the current page.
                </p>
              )}
              {selected.findings.map((finding, index) => (
                <article className="finding" key={`${finding.rule}-${index}`}>
                  <div className="finding-meta">
                    <span className={`status-label ${finding.kind}`}>
                      <Icon name={finding.kind === "issue" ? "issue" : "review"} />
                      {finding.kind === "issue" ? "Issue" : "Needs review"}
                    </span>
                    <span className="impact">{finding.impact}</span>
                  </div>
                  <h3>{finding.title}</h3>
                  <p className="engine-summary">
                    {finding.summary || "Inspect this element against the linked rule."}
                  </p>
                  <div className="rule-line">
                    <code>{finding.rule}</code>
                    <a href={finding.helpUrl} target="_blank" rel="noreferrer">
                      How to fix
                      <Icon name="external" />
                    </a>
                  </div>
                  <p className="criteria">{finding.tags.join(" · ")}</p>
                  <button
                    className="single-download"
                    onClick={() => download({ ...selected, findings: [finding] })}
                  >
                    <Icon name="download" />
                    Download this issue
                  </button>
                </article>
              ))}
              <button className="primary export-button" onClick={() => download(selected)}>
                <Icon name="download" />
                Download this element’s issues
              </button>
            </section>
          ) : (
            <section aria-label="Scan results">
              <div className="summary">
                <div>
                  <strong className="issue-count">{summary.issues}</strong>
                  <span>
                    <span className="dot issue" />
                    Issues
                  </span>
                </div>
                <div>
                  <strong className="review-count">{summary.reviews}</strong>
                  <span>
                    <span className="dot review" />
                    Need review
                  </span>
                </div>
                <div>
                  <strong>{summary.elements}</strong>
                  <span>Elements</span>
                </div>
              </div>
              <div className="list-heading">
                <h2>On this page</h2>
                <span>
                  {state.report.viewport.width} × {state.report.viewport.height}
                </span>
              </div>
              <div className="filters" aria-label="Filter findings">
                {(["all", "issue", "review"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value === "all" ? "All" : value === "issue" ? "Issues" : "Need review"}
                  </button>
                ))}
              </div>
              {groups.length ? (
                <ol className="element-list">
                  {groups.map((group) => {
                    const number = state.report!.groups.indexOf(group) + 1;
                    const isIssue = group.findings.some((finding) => finding.kind === "issue");
                    return (
                      <li key={group.id}>
                        <button
                          id={`row-${group.id}`}
                          className="element-row"
                          onClick={() => void send({ type: "GLANCE_SELECT", id: group.id })}
                        >
                          <span className={`element-number ${isIssue ? "issue" : "review"}`}>
                            {number}
                          </span>
                          <span className="row-content">
                            <span className="row-title">
                              {group.label}
                              <span>
                                {group.findings.length}{" "}
                                {group.findings.length === 1 ? "finding" : "findings"}
                              </span>
                            </span>
                            <span className="row-description">{group.findings[0].title}</span>
                            <code>{group.selector}</code>
                          </span>
                          <Icon name="chevron" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="no-findings">
                  <Icon name="scan" />
                  <h3>
                    {filter === "all" ? "No automatic findings" : "No findings in this filter"}
                  </h3>
                  <p>Keyboard, screen reader, and content checks still need a person.</p>
                </div>
              )}
              <button className="primary export-button" onClick={() => download()}>
                <Icon name="download" />
                Download all issues<span className="format-label">.md</span>
              </button>
            </section>
          ))}
        <p className="download-notice" role="status">
          {notice}
        </p>
      </main>
      <footer>
        <div>
          <span className="local-dot" />
          No uploads. No account.
        </div>
        <p>
          Automated checks are a starting point, not a compliance certificate.
          {state.report?.frameCount
            ? ` ${state.report.frameCount} iframe document(s) not scanned.`
            : ""}
        </p>
        {state.report && (
          <small>
            Markdown exports include selectors. Review sensitive information before sharing.
          </small>
        )}
        <span className="footer-wordmark">LESS FRICTION. MORE ACCESS.</span>
      </footer>
    </div>
  );
}
