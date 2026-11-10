type ShellListCountProps = {
  shown: number;
  total: number;
  more?: boolean;
  noun: string;
  plural: string;
};

// -----
// The count in a list card's header, the same on every list:
// "12 scans", "3 of 12 scans" when a filter hides some, and a "+"
// when `more` says older pages are still to load.
// -----
export function ShellListCount({ shown, total, more = false, noun, plural }: ShellListCountProps) {
  const sum = `${total}${more ? "+" : ""}`;
  const text = shown === total ? `${sum} ${total === 1 && !more ? noun : plural}` : `${shown} of ${sum} ${plural}`;
  return <span className="text-xs tabular-nums text-muted-foreground">{text}</span>;
}
