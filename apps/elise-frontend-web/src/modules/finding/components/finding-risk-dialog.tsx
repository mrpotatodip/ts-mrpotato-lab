import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { FINDING_ACCEPT_DAYS_DEFAULT, FINDING_ACCEPT_DAYS_OPTIONS } from "../constants";

export type RiskInput = { note: string; days: number };

type FindingRiskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingTitle: string;
  initialNote: string;
  pending: boolean;
  onConfirm: (input: RiskInput) => void;
};

type RiskFormProps = Pick<FindingRiskDialogProps, "findingTitle" | "initialNote" | "pending" | "onConfirm">;

function RiskForm({ findingTitle, initialNote, pending, onConfirm }: RiskFormProps) {
  const [note, setNote] = useState(initialNote);
  const [days, setDays] = useState(String(FINDING_ACCEPT_DAYS_DEFAULT));
  const [error, setError] = useState<string | null>(null);
  const noteField = useRef<HTMLTextAreaElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (note.trim() === "") {
      setError("Write why it is acceptable to ship with this, so the next person understands the decision.");
      noteField.current?.focus();
      return;
    }
    onConfirm({ note: note.trim(), days: Number(days) });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="grid content-start gap-6">
        <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm leading-relaxed">
          <span className="font-medium">{findingTitle}</span>
        </p>
        <div className="grid gap-2">
          <Label htmlFor="risk-reason">Why is it acceptable to ship with this?</Label>
          <Textarea
            id="risk-reason"
            ref={noteField}
            name="reason"
            rows={4}
            value={note}
            onChange={(event) => {
              setError(null);
              setNote(event.target.value);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "risk-reason-error" : "risk-reason-help"}
            placeholder="For example: only reachable from the internal network until the rewrite ships."
          />
          {error ? (
            <p id="risk-reason-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p id="risk-reason-help" className="text-xs text-muted-foreground">
              Everyone on the account can read this. It is saved with your name.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="risk-days">How long should the acceptance last?</Label>
          <Select value={days} items={FINDING_ACCEPT_DAYS_OPTIONS} onValueChange={(next) => next && setDays(next)}>
            <SelectTrigger id="risk-days" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FINDING_ACCEPT_DAYS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">After that date the finding counts as open again and blocks the Verdict.</p>
        </div>
      </DialogBody>
      <DialogFooter className="grid justify-stretch gap-3">
        <p className="text-sm leading-relaxed">You are about to accept this risk for {days} days. The decision is recorded in the audit trail.</p>
        <div className="flex items-center justify-end gap-3">
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving" : "Accept risk"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function FindingRiskDialog({ open, onOpenChange, ...form }: FindingRiskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept this risk?</DialogTitle>
          <DialogDescription>You are saying the team will ship with this finding for now. Only account admins can do this.</DialogDescription>
        </DialogHeader>
        <RiskForm {...form} />
      </DialogContent>
    </Dialog>
  );
}
