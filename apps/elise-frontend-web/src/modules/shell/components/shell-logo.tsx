// -----
// The Elise mark: an "E" of three equal bars, like lines of a report, with
// square corners. It sits in a diamond (a
// square turned 45 degrees) and is turned 45 degrees the other way, so its bars
// point up and to the right. It is drawn with the theme's own action
// colours, so it is dark on a light page and light on a dark one, and needs no
// second file per theme. It is decorative: the word "Elise" always sits next
// to it.
// -----
export function ShellLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect x="4" y="4" width="24" height="24" rx="5" transform="rotate(45 16 16)" fill="var(--primary)" />
      <g fill="var(--primary-foreground)" transform="rotate(-45 16 16) translate(16 16) scale(0.8) translate(-16 -16)">
        <rect x="9" y="8" width="4" height="16" />
        <rect x="9" y="8" width="14" height="4" />
        <rect x="9" y="14" width="14" height="4" />
        <rect x="9" y="20" width="14" height="4" />
      </g>
    </svg>
  );
}
