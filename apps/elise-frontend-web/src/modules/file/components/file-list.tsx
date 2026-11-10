import { Suspense, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap px-3 sm:px-5">File</TableHead>
                <TableHead className="whitespace-nowrap px-3 sm:px-5">Repository</TableHead>
                <TableHead className="hidden whitespace-nowrap md:table-cell">Branch</TableHead>
                <TableHead className="hidden whitespace-nowrap lg:table-cell">Scan status</TableHead>
                <TableHead className="hidden whitespace-nowrap text-right lg:table-cell">Size</TableHead>
                <TableHead className="hidden whitespace-nowrap md:table-cell">Saved (UTC)</TableHead>
                <TableHead className="px-3 text-right sm:px-5">
                  <span className="sr-only">Download</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={rowKey(file)}>
                  <TableCell className="whitespace-nowrap px-3 sm:px-5">
                    <span className="block font-medium">{FILE_LABELS[file.name].label}</span>
                    <span className="block text-xs text-muted-foreground">{file.name}</span>
                  </TableCell>
                  <TableCell className="min-w-36 max-w-[18rem] px-3 sm:min-w-44 sm:px-5">
                    <ScanRepoLink scanId={file.scanId} repo={file.repo} />
                    <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
                      {file.branch ?? "Default branch"} · <ScanTime value={file.createdAt} utc /> UTC
                    </span>
                  </TableCell>
                  <TableCell className="hidden min-w-48 break-words text-muted-foreground md:table-cell">{file.branch ?? "Default branch"}</TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
                    <ScanStatusBadge status={file.status} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground lg:table-cell">{scanBytes(file.sizeBytes)}</TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">
                    <ScanTime value={file.createdAt} utc />
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 text-right sm:px-5">
                    <FileDownloadButton scanId={file.scanId} name={file.name} description={downloadLabel(file)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
