import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { stopScan } from "../api";
import { isScanActive, scanKeys } from "../hooks";
import type { ScanStatus } from "../schemas";

export const canStopScan = (scan: Pick<ScanStatus, "status">): boolean => isScanActive(scan.status);

export function ScanStopButton({ scanId, onRunner, size = "sm", className }: { scanId: string; onRunner: boolean; size?: "sm" | "default"; className?: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const stop = useMutation({
    mutationFn: () => stopScan({ data: { scanId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scanKeys.all });
      setOpen(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) stop.reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size={size} className={className} />}>Stop</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stop this scan?</DialogTitle>
          <DialogDescription>
            {onRunner
              ? "The scan ends at once. No report and no findings are kept. Findings found so far are dropped. A Runner built before this change keeps running until it finishes, and its result is dropped."
              : "The scan ends at once and its sandbox is destroyed. No report and no findings are kept. Findings found so far are dropped. The cost so far is still charged."}
          </DialogDescription>
        </DialogHeader>
        {stop.isError && <p role="alert" className="text-sm text-status-danger">{stop.error.message}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep running</DialogClose>
          <Button variant="destructive" disabled={stop.isPending} onClick={() => stop.mutate()}>
            {stop.isPending ? "Stopping" : "Stop scan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
