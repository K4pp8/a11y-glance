export type IconName =
  | "scan"
  | "eye"
  | "eye-off"
  | "download"
  | "back"
  | "chevron"
  | "external"
  | "issue"
  | "review"
  | "page"
  | "arrow";
const paths: Record<IconName, React.ReactNode> = {
  scan: (
    <>
      <path d="M7 3H5a2 2 0 0 0-2 2v2m10-4h2a2 2 0 0 1 2 2v2M3 13v2a2 2 0 0 0 2 2h2m10-4v2a2 2 0 0 1-2 2h-2" />
      <circle cx="10" cy="10" r="2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z" />
      <circle cx="10" cy="10" r="2" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m3 3 14 14M7 5.6A9 9 0 0 1 10 5c5 0 8 5 8 5a14 14 0 0 1-2 2.5M5 6.5A16 16 0 0 0 2 10s3 5 8 5a9 9 0 0 0 3-.6" />
    </>
  ),
  download: (
    <>
      <path d="M10 2v10m-4-4 4 4 4-4M3 13v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </>
  ),
  back: <path d="m11 4-6 6 6 6m-6-6h12" />,
  chevron: <path d="m8 5 5 5-5 5" />,
  external: (
    <>
      <path d="M11 3h6v6M17 3l-8 8M7 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
    </>
  ),
  issue: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v5m0 3h.01" />
    </>
  ),
  review: (
    <>
      <path d="m10 2 8 15H2L10 2Z" />
      <path d="M10 7v4m0 3h.01" />
    </>
  ),
  page: (
    <>
      <path d="M11 2H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-5-5Z" />
      <path d="M11 2v5h5M7 11h6m-6 3h4" />
    </>
  ),
  arrow: <path d="M3 10h14m-5-5 5 5-5 5" />,
};
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
