import { lazy, Suspense, useState, type ComponentProps } from "react";
import { noop, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { githubReposQuery } from "#/modules/github";
import { scanReposQuery } from "../hooks";

const loadScanNewForm = () => import("./scan-new-form");
const ScanNewForm = lazy(() => loadScanNewForm().then((module) => ({ default: module.ScanNewForm })));

type ScanNewDialogProps = {
  label?: string;
  size?: "default" | "sm";
  variant?: "default" | "outline";
  repo?: string;
  startBranch?: string;
  startRef?: string;
  startOptions?: ComponentProps<typeof ScanNewForm>["startOptions"];
};

export function ScanNewDialog({ label = "New scan", size = "sm", variant = "default", repo, startBranch, startRef, startOptions }: ScanNewDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // -----
  // The form's code and the repositories it lists, scanned and on GitHub, load when the pointer or
  // focus reaches the button, so the dialog opens with both already in hand.
  // -----
  const warm = () => {
    void loadScanNewForm();
    void queryClient.query(scanReposQuery()).catch(noop);
    void queryClient.query(githubReposQuery()).catch(noop);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant={variant} onPointerEnter={warm} onFocus={warm} />}>
        <Plus className="size-3.5" />
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="pb-6">
          <DialogTitle>Start a security audit</DialogTitle>
        </DialogHeader>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <ScanNewForm repo={repo} startBranch={startBranch} startRef={startRef} startOptions={startOptions} onDone={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
