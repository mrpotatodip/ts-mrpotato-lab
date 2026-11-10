import { Suspense, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTable } from "@tanstack/react-table";
import { FileText, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { repoName } from "#/modules/repo";
import { ScanRepoLink, ScanStatusBadge, ScanTime, scanBytes } from "#/modules/scan";
import { ShellListCount } from "#/modules/shell";
import { fetchFiles } from "../api";
import { FILE_LABELS } from "../constants";
import { useSuspenseFiles } from "../hooks";
import type { FileEntry, FilesSearch } from "../schemas";
import { FileDownloadButton } from "./file-download-button";
import { FileFilters } from "./file-filters";
import { FileListSkeleton } from "./file-list-skeleton";

type FileListViewProps = {
  filters: FilesSearch;
  onChange: (next: FilesSearch) => void;
};

const rowKey = (file: FileEntry) => `${file.scanId}/${file.name}`;

// -----
// The button's accessible name says which file it fetches, so the
// rows of one repository can be told apart. The time is UTC, the
// same on the server and in the browser.
// -----
const downloadLabel = (file: FileEntry) =>
  `${FILE_LABELS[file.name].label} of ${repoName(file.repo)} on ${file.branch ?? "the default branch"}, saved ${file.createdAt.slice(0, 19).replace("T", " ")} UTC, scan ${file.scanId.slice(-6)}`;

const column = dataTableColumns<FileEntry>();

const columns = column.columns([
  column.display({
    id: "file",
    header: "File",
    meta: { head: "whitespace-nowrap px-3 sm:px-5", cell: "whitespace-nowrap px-3 sm:px-5" },
    cell: ({ row }) => (
      <>
        <span className="block font-medium">{FILE_LABELS[row.original.name].label}</span>
        <span className="block text-xs text-muted-foreground">{row.original.name}</span>
      </>
    ),
  }),
  column.display({
    id: "repository",
    header: "Repository",
    meta: { head: "whitespace-nowrap px-3 sm:px-5", cell: "min-w-36 max-w-[18rem] px-3 sm:min-w-44 sm:px-5" },
    cell: ({ row }) => (
      <>
        <ScanRepoLink scanId={row.original.scanId} repo={row.original.repo} />
        <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
          {row.original.branch ?? "Default branch"} · <ScanTime value={row.original.createdAt} utc /> UTC
        </span>
      </>
    ),
  }),
  column.display({
    id: "branch",
    header: "Branch",
    meta: { head: "hidden whitespace-nowrap md:table-cell", cell: "hidden min-w-48 break-words text-muted-foreground md:table-cell" },
    cell: ({ row }) => row.original.branch ?? "Default branch",
  }),
  column.display({
    id: "status",
    header: "Scan status",
    meta: { head: "hidden whitespace-nowrap lg:table-cell", cell: "hidden whitespace-nowrap lg:table-cell" },
    cell: ({ row }) => <ScanStatusBadge status={row.original.status} />,
  }),
  column.display({
    id: "size",
    header: "Size",
    meta: { head: "hidden whitespace-nowrap text-right lg:table-cell", cell: "hidden whitespace-nowrap text-right tabular-nums text-muted-foreground lg:table-cell" },
    cell: ({ row }) => scanBytes(row.original.sizeBytes),
  }),
  column.display({
    id: "saved",
    header: "Saved (UTC)",
    meta: { head: "hidden whitespace-nowrap md:table-cell", cell: "hidden whitespace-nowrap md:table-cell" },
    cell: ({ row }) => <ScanTime value={row.original.createdAt} utc />,
  }),
  column.display({
    id: "download",
    header: () => <span className="sr-only">Download</span>,
    meta: { head: "px-3 text-right sm:px-5", cell: "whitespace-nowrap px-3 text-right sm:px-5" },
    cell: ({ row }) => <FileDownloadButton scanId={row.original.scanId} name={row.original.name} description={downloadLabel(row.original)} />,
  }),
]);

function FileListView({ filters, onChange }: FileListViewProps) {
  const { data } = useSuspenseFiles(filters);
  const [older, setOlder] = useState<readonly FileEntry[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);
  const filtered = Object.values(filters).some((value) => value !== undefined);

  const loadMore = useMutation({
    mutationFn: (cursor: string) => fetchFiles({ data: { filters, cursor } }),
    onSuccess: (page) => {
      setOlder((current) => [...current, ...page.files]);
      setOlderCursor(page.nextCursor);
    },
  });

  const nextCursor = olderCursor === undefined ? data.nextCursor : olderCursor;
  const firstKeys = new Set(data.files.map(rowKey));
  const files = [...data.files, ...older.filter((file) => !firstKeys.has(rowKey(file)))];
  const table = useTable({ features: dataTableFeatures, columns, data: files, getRowId: rowKey });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>All files</CardTitle>
        <ShellListCount shown={files.length} total={files.length} more={Boolean(nextCursor)} noun="file" plural="files" />
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <FileFilters filters={filters} counts={data.counts} showClear={filtered && files.length > 0} onChange={onChange} />
        {files.length === 0 ? (
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">{filtered ? <Search /> : <FileText />}</EmptyMedia>
              <EmptyTitle>{filtered ? "No files match" : "No files yet"}</EmptyTitle>
              <EmptyDescription>{filtered ? "Try another repository, file type or date range, or clear the filters." : "The reports of your scans show up here once a scan saves them."}</EmptyDescription>
            </EmptyHeader>
            {filtered && (
              <EmptyContent>
                <Button variant="outline" onClick={() => onChange({})}>
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <DataTable table={table} />
        )}
        {nextCursor && (
          <div className="flex flex-col items-center gap-2 border-t p-4">
            {loadMore.isError && (
              <p role="alert" className="text-xs text-status-danger">
                We could not load more files. Try again.
              </p>
            )}
            <Button variant="outline" size="sm" disabled={loadMore.isPending} onClick={() => loadMore.mutate(nextCursor)}>
              {loadMore.isPending ? "Loading" : "Load more files"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FileList() {
  const filters = useSearch({ from: "/_app/files" });
  const navigate = useNavigate({ from: "/files" });

  return (
    <Suspense fallback={<FileListSkeleton />}>
      <FileListView key={JSON.stringify(filters)} filters={filters} onChange={(next) => void navigate({ search: next, replace: true })} />
    </Suspense>
  );
}
