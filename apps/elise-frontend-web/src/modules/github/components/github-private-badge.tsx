import { Lock } from "lucide-react";
import { Badge } from "#/components/ui/badge";

type GithubPrivateBadgeProps = {
  isPrivate: boolean | null | undefined;
  compact?: boolean;
};

// -----
// Shown for a repository GitHub said is private. It says nothing for a
// public one, or for one no connected install covers. Headings get the
// "Private" badge; dense rows (a scan in a list) get the lock alone, with
// the word kept for a screen reader and the hover.
// -----
export function GithubPrivateBadge({ isPrivate, compact = false }: GithubPrivateBadgeProps) {
  if (isPrivate !== true) return null;
  if (compact) {
    return (
      <span title="Private repository" className="ml-1 inline-flex shrink-0 items-center text-muted-foreground">
        <Lock aria-hidden="true" className="size-3" />
        <span className="sr-only">Private repository</span>
      </span>
    );
  }
  return (
    <Badge variant="outline">
      <Lock aria-hidden="true" className="size-3" />
      Private
    </Badge>
  );
}
