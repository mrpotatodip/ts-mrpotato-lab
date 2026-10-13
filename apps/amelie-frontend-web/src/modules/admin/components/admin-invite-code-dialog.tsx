import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { CreatedInviteCode } from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { APP_BASE_URL } from "#/lib/app-base-url";
import { tryCatch } from "#/lib/try-catch";
import { buildInviteCodeSignUpLink } from "../utils";

type AdminInviteCodeDialogProps = {
  created: CreatedInviteCode | null;
  onDismiss: () => void;
};

type CopyButtonProps = {
  label: string;
  text: string;
};

function CopyButton({ label, text }: CopyButtonProps) {
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
// Shows the plain code once. Closing it clears the
// parent's state, so the code is gone for good.
// -----
export function AdminInviteCodeDialog({ created, onDismiss }: AdminInviteCodeDialogProps) {
  return (
    <Dialog
      open={created !== null}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite code created</DialogTitle>
          <DialogDescription>
            Copy it now. This is the only time the code is shown.
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="flex flex-col gap-4">
            <p className="bg-muted rounded-md px-3 py-2 text-center font-mono text-lg tracking-wider break-all select-all">
              {created.code}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CopyButton label="Copy code" text={created.code} />
              <CopyButton
                label="Copy sign-up link"
                text={buildInviteCodeSignUpLink(APP_BASE_URL, created.code)}
              />
            </div>
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
