import { createFileRoute } from "@tanstack/react-router";
import { FileList, FilesSearchSchema, filesQuery } from "#/modules/file";
import { ShellPageHeader } from "#/modules/shell";

export const Route = createFileRoute("/_app/files")({
  head: () => ({ meta: [{ title: "Files · EliseLAB" }] }),
  validateSearch: FilesSearchSchema,
  loaderDeps: ({ search }) => ({ filters: search }),
  loader: ({ context, deps }) => context.queryClient.query({ ...filesQuery(deps.filters), staleTime: "static" }),
  component: FilesPage,
});

function FilesPage() {
  return (
    <>
      <ShellPageHeader title="Files" description="The reports your scans wrote, newest first. Download a file, or open its scan to read the findings." />
      <FileList />
    </>
  );
}
