export type Issue = {
  rule: string;
  kind: "issue" | "review";
  title: string;
  summary: string;
  impact: string;
  tags: string[];
  helpUrl: string;
};

export type ElementGroup = {
  id: string;
  label: string;
  selector: string;
  snippet: string;
  available: boolean;
  findings: Issue[];
};

export type Report = {
  url: string;
  scannedAt: string;
  engine: string;
  viewport: { width: number; height: number };
  groups: ElementGroup[];
  frameCount: number;
};

export type State = {
  status: "idle" | "scanning" | "ready" | "error";
  report: Report | null;
  stale: boolean;
  selectedId: string | null;
  showHighlights: boolean;
  error: string | null;
};

export const initialState: State = {
  status: "idle",
  report: null,
  stale: false,
  selectedId: null,
  showHighlights: true,
  error: null,
};

export type Request =
  | { type: "GLANCE_GET" | "GLANCE_SCAN" | "GLANCE_ENABLE" }
  | { type: "GLANCE_SELECT"; id: string | null }
  | { type: "GLANCE_HIGHLIGHTS"; enabled: boolean };

export function isRequest(value: unknown): value is Request {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  if (["GLANCE_GET", "GLANCE_SCAN", "GLANCE_ENABLE"].includes(String(value.type))) return true;
  if (value.type === "GLANCE_SELECT")
    return "id" in value && (value.id === null || typeof value.id === "string");
  return (
    value.type === "GLANCE_HIGHLIGHTS" && "enabled" in value && typeof value.enabled === "boolean"
  );
}

export function counts(report: Report | null) {
  const findings = report?.groups.flatMap((group) => group.findings) ?? [];
  return {
    issues: findings.filter((finding) => finding.kind === "issue").length,
    reviews: findings.filter((finding) => finding.kind === "review").length,
    elements: report?.groups.length ?? 0,
  };
}

export function safePageUrl(raw: string): string {
  const url = new URL(raw);
  return `${url.origin}${url.pathname}`;
}
