import { Suspense, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { ScanRepoLink, ScanStatusBadge, ScanTime, scanBytes } from "#/modules/scan";
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
  const total = `${files.length}${nextCursor ? "+" : ""}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>All files</CardTitle>
        <span className="text-xs tabular-nums text-muted-foreground">
          {total} {files.length === 1 && !nextCursor ? "file" : "files"}
        </span>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <FileFilters filters={filters} onChange={onChange} />
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
                <TableHead>File</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Scan</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Download</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={rowKey(file)}>
                  <TableCell>
                    <span className="block font-medium">{FILE_LABELS[file.name].label}</span>
                    <span className="block text-xs text-muted-foreground">{file.name}</span>
                  </TableCell>
                  <TableCell className="max-w-[18rem]">
                    <ScanRepoLink scanId={file.scanId} repo={file.repo} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{file.branch ?? "Default"}</TableCell>
                  <TableCell>
                    <ScanStatusBadge status={file.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{scanBytes(file.sizeBytes)}</TableCell>
                  <TableCell>
                    <ScanTime value={file.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <FileDownloadButton scanId={file.scanId} name={file.name} label={FILE_LABELS[file.name].label} />
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
