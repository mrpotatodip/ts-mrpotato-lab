import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "#/components/ui/button";
import { scanFileQuery } from "#/modules/scan";

type FileDownloadButtonProps = {
  scanId: string;
  name: string;
  description: string;
};

export function FileDownloadButton({ scanId, name, description }: FileDownloadButtonProps) {
  const queryClient = useQueryClient();
  const download = useMutation({
    mutationFn: () => queryClient.fetchQuery(scanFileQuery(scanId, name)),
    onSuccess: (text) => {
      const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${scanId}-${name}`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" title="Saves this file to your computer" disabled={download.isPending} aria-label={`Download ${description}`} onClick={() => download.mutate()}>
        <Download aria-hidden="true" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{download.isPending ? "Downloading" : "Download"}</span>
      </Button>
      {download.isError && (
        <span role="alert" className="text-xs text-status-danger">
          Could not download this file. Check your connection and try again.
        </span>
      )}
    </span>
  );
}
