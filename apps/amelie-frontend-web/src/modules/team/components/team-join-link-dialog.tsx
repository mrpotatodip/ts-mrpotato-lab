import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { tryCatch } from "#/lib/try-catch";

type TeamJoinLinkDialogProps = {
  joinUrl: string | null;
  onDismiss: () => void;
};

function CopyButton({ label, text }: { label: string; text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    const { error } = await tryCatch(navigator.clipboard.writeText(text));
    setState(error ? "failed" : "copied");
  };

  return (
    <Button type="button" variant="outline" onClick={() => void copy()}>
      {state === "copied" ? <Check /> : <Copy />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}

// -----
// Shows the join URL once. Closing it clears the
// parent's state, so the link is gone for good.
// -----
export function TeamJoinLinkDialog({ joinUrl, onDismiss }: TeamJoinLinkDialogProps) {
  return (
    <Dialog
      open={joinUrl !== null}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join link created</DialogTitle>
          <DialogDescription>Copy it now. This is the only time the link is shown.</DialogDescription>
        </DialogHeader>
        {joinUrl ? (
          <div className="flex flex-col gap-4">
            <p className="bg-muted rounded-md px-3 py-2 text-center font-mono text-lg tracking-wider break-all select-all">
              {joinUrl}
            </p>
            <CopyButton label="Copy join link" text={joinUrl} />
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={onDismiss}>
            I have copied it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
