import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { repoName } from "#/modules/repo";
import { scanRepoBranchesQuery, scanReposQuery } from "#/modules/scan";
import { FILE_LABELS } from "../constants";
import { FILE_LISTED_NAMES, type FilesSearch } from "../schemas";

const ALL = "all";

type FileFiltersProps = {
  filters: FilesSearch;
  onChange: (next: FilesSearch) => void;
};

type FileBranchSelectProps = {
  repoId: string;
  branch: string | undefined;
  onPick: (branch: string | undefined) => void;
};

function FileBranchSelect({ repoId, branch, onPick }: FileBranchSelectProps) {
  const { data } = useSuspenseQuery(scanRepoBranchesQuery(repoId));
  const items = [{ value: ALL, label: "All branches" }, ...data.branches.map((item) => ({ value: item.name, label: item.name }))];
  return (
    <Select value={branch ?? ALL} items={items} onValueChange={(next) => onPick(next === null || next === ALL ? undefined : next)}>
      <SelectTrigger id="file-branch" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FileFilters({ filters, onChange }: FileFiltersProps) {
  const { data: repoList } = useSuspenseQuery(scanReposQuery());
  const repoItems = [{ value: ALL, label: "All repositories" }, ...repoList.repos.map((repo) => ({ value: repo.id, label: repoName(repo.url) }))];
  const active = Object.values(filters).some((value) => value !== undefined);

  return (
    <div className="grid gap-3 border-b px-5 py-3">
      <Tabs
        value={filters.name ?? ALL}
        onValueChange={(value) => {
          const next = FILE_LISTED_NAMES.find((name) => name === value);
          onChange({ ...filters, name: next });
        }}
      >
        <TabsList aria-label="Filter files by type">
          <TabsTrigger value={ALL}>All files</TabsTrigger>
          {FILE_LISTED_NAMES.map((name) => (
            <TabsTrigger key={name} value={name} title={FILE_LABELS[name].hint}>
              {FILE_LABELS[name].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="file-repo" className="text-xs text-muted-foreground">
            Repository
          </Label>
          <Select
            value={filters.repoId ?? ALL}
            items={repoItems}
            onValueChange={(next) => onChange({ ...filters, repoId: next === null || next === ALL ? undefined : next, branch: undefined })}
          >
            <SelectTrigger id="file-repo" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {repoItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filters.repoId && (
          <div className="grid gap-1.5">
            <Label htmlFor="file-branch" className="text-xs text-muted-foreground">
              Branch
            </Label>
            <Suspense fallback={<Skeleton className="h-9 w-44" />}>
              <FileBranchSelect repoId={filters.repoId} branch={filters.branch} onPick={(branch) => onChange({ ...filters, branch })} />
            </Suspense>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="file-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input id="file-from" type="date" value={filters.from ?? ""} max={filters.to} onChange={(event) => onChange({ ...filters, from: event.target.value || undefined })} className="h-9 w-40" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="file-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input id="file-to" type="date" value={filters.to ?? ""} min={filters.from} onChange={(event) => onChange({ ...filters, to: event.target.value || undefined })} className="h-9 w-40" />
        </div>

        <form
          key={filters.q ?? ""}
          className="relative w-full sm:w-64"
          onSubmit={(event) => {
            event.preventDefault();
            const text = String(new FormData(event.currentTarget).get("q") ?? "").trim();
            onChange({ ...filters, q: text === "" ? undefined : text });
          }}
        >
          <Label htmlFor="file-search" className="sr-only">
            Search files by repository
          </Label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="file-search" name="q" type="search" autoComplete="off" placeholder="Search by repository, then press Enter" defaultValue={filters.q ?? ""} className="h-9 pl-9" />
        </form>

        {active && (
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
