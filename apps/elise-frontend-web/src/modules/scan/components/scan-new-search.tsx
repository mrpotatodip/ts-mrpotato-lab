import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Globe, Link2, Lock, Search } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { scanRepoPickMatches, type ScanRepoPick } from "../utils";

export function ScanRepoIcon({ pick }: { pick: ScanRepoPick }) {
  const Icon = pick.fromLink ? Link2 : pick.isPrivate ? Lock : Globe;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="size-4" />
    </span>
  );
}

type ScanNewSearchProps = {
  picks: readonly ScanRepoPick[];
  loading?: boolean;
  onPick: (pick: ScanRepoPick) => void;
  hint?: ReactNode;
};

// -----
// One field takes a name or a pasted link, so the person is never asked
// whether the repository is public or private: the list shows every
// repository the account can scan, a lock marks the private ones, and the
// choice itself says which kind it is. The arrow keys walk the field and the
// rows as one list. Until the GitHub connection's repositories have arrived
// the list cannot tell which scanned repositories are private, so it shows
// placeholders instead of rows that would move; a pasted link needs no list
// and shows at once.
// -----
export function ScanNewSearch({ picks, loading = false, onPick, hint }: ScanNewSearchProps) {
  const [query, setQuery] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const matches = scanRepoPickMatches(picks, query);
  const shown = loading ? matches.filter((item) => item.fromLink) : matches;
  const rows = [...shown.filter((item) => !item.isPrivate), ...shown.filter((item) => item.isPrivate)];

  const walk = (event: KeyboardEvent) => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    const stops = [...(wrap.current?.querySelectorAll<HTMLElement>("[data-stop]") ?? [])];
    const at = stops.findIndex((item) => item === document.activeElement);
    event.preventDefault();
    stops[Math.min(Math.max(at + step, 0), stops.length - 1)]?.focus();
  };

  return (
    <div ref={wrap} role="presentation" onKeyDown={walk} className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-stop
          aria-label="Find a repository"
          className="h-11 pl-9"
          placeholder="Search your repositories or paste a GitHub link"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            const first = rows[0];
            if (event.key === "Enter" && first) {
              event.preventDefault();
              onPick(first);
            }
          }}
        />
      </div>
      <div className="grid max-h-[min(24rem,50svh)] gap-0.5 overflow-y-auto" aria-busy={loading}>
        {loading &&
          [0, 1, 2].map((slot) => (
            <div key={slot} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <span className="grid flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-28" />
              </span>
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <p className="px-3 py-6 text-center text-sm leading-relaxed text-muted-foreground">{query.trim() === "" ? "Paste the link to a public GitHub repository to scan it." : "No repository matches. Paste the link to a public one to scan it."}</p>
        )}
        {rows.map((row, index) => {
          const group = row.fromLink ? null : row.isPrivate ? "Private" : "Public";
          const startsGroup = group !== null && rows.slice(0, index).every((item) => item.fromLink || (item.isPrivate ? "Private" : "Public") !== group);
          return (
            <div key={row.url} className="grid gap-0.5">
              {startsGroup && <p className="px-3 pb-0.5 pt-2 text-xs text-muted-foreground">{group}</p>}
              <button
                type="button"
                data-stop
                onClick={() => onPick(row)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ScanRepoIcon pick={row} />
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">{row.fromLink ? `Scan ${row.label}` : row.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{row.note}</span>
                </span>
                <span className="text-xs text-muted-foreground">{row.isPrivate ? "Private" : "Public"}</span>
              </button>
            </div>
          );
        })}
      </div>
      {hint}
    </div>
  );
}
