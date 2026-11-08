import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { useScanLinkMode } from "../hooks";
import { ScanNewForm } from "./scan-new-form";

type ScanNewDialogProps = {
  label?: string;
  size?: "default" | "sm";
  variant?: "default" | "outline";
  repo?: string;
  startBranch?: string;
};

export function ScanNewDialog({ label = "New scan", size = "sm", variant = "default", repo, startBranch }: ScanNewDialogProps) {
  const [open, setOpen] = useState(false);
  const preview = useScanLinkMode() === "demo";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant={variant} />}>
        <Plus className="size-3.5" />
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a security audit</DialogTitle>
          <DialogDescription>Pick a repository you already scan, or add a new one. We'll clone it, review the code for security issues, and save a report to your account.</DialogDescription>
        </DialogHeader>
        <ScanNewForm preview={preview} repo={repo} startBranch={startBranch} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
