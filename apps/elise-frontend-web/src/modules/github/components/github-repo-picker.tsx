import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { githubReposQuery } from "../hooks";

type GithubRepoPickerProps = { onPick: (url: string) => void };

const NONE = "none";

function GithubRepoPickerView({ onPick }: GithubRepoPickerProps) {
  const { data: repos } = useSuspenseQuery(githubReposQuery());
  if (repos.length === 0) return null;

  const items = [{ value: NONE, label: "Choose a repository…" }, ...repos.map((repo) => ({ value: repo.url, label: repo.fullName }))];

  return (
    <div className="grid gap-2">
      <Label htmlFor="add-repo-github">From your connected GitHub</Label>
      <Select value={NONE} items={items} onValueChange={(next) => next !== null && next !== NONE && onPick(next)}>
        <SelectTrigger id="add-repo-github">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
              {repos.find((repo) => repo.url === item.value)?.private && <Lock aria-label="Private" className="size-3 text-muted-foreground" />}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">The repositories EliseLAB can read. Picking one fills in the link below.</p>
    </div>
  );
}

// -----
// Shows nothing while it loads, and nothing when no GitHub is connected
// or the list cannot be read: pasting a link always still works.
// -----
export function GithubRepoPicker({ onPick }: GithubRepoPickerProps) {
  return (
    <Suspense fallback={<Skeleton className="h-10 w-full" />}>
      <GithubRepoPickerView onPick={onPick} />
    </Suspense>
  );
}
