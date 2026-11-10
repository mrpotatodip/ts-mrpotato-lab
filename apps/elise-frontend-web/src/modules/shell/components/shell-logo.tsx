// -----
// The EliseLAB mark: an "E" of three bars, the middle one shorter, like lines of
// a report with a finding marked. It is drawn with the theme's own action
// colours, so it is dark on a light page and light on a dark one, and needs no
// second file per theme. It is decorative: the word "EliseLAB" always sits next
// to it.
// -----
export function ShellLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <g fill="var(--primary-foreground)">
        <rect x="9" y="8" width="4" height="16" rx="2" />
        <rect x="9" y="8" width="14" height="4" rx="2" />
        <rect x="9" y="14" width="10" height="4" rx="2" />
        <rect x="9" y="20" width="14" height="4" rx="2" />
      </g>
    </svg>
  );
}
