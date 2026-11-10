import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { FieldError } from "#/components/ui/field-error";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { FINDING_ACCEPT_DAYS_DEFAULT, FINDING_ACCEPT_DAYS_OPTIONS } from "../constants";
import { RiskDetailsSchema } from "../schemas";

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
  const noteField = useRef<HTMLTextAreaElement>(null);
  const form = useForm({
    defaultValues: { note: initialNote, days: String(FINDING_ACCEPT_DAYS_DEFAULT) },
    validators: { onSubmit: RiskDetailsSchema },
    onSubmit: ({ value }) => onConfirm({ note: value.note.trim(), days: Number(value.days) }),
    onSubmitInvalid: () => noteField.current?.focus(),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="grid content-start gap-6">
        <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm leading-relaxed">
          <span className="font-medium">{findingTitle}</span>
        </p>
        <form.Field name="note">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor="risk-reason">Why is it acceptable to ship with this?</Label>
              <Textarea
                id="risk-reason"
                ref={noteField}
                name={field.name}
                rows={4}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="For example: only reachable from the internal network until the rewrite ships."
                {...fieldAria(field, "risk-reason", "risk-reason-help")}
              />
              {fieldMessage(field) ? (
                <FieldError id="risk-reason" message={fieldMessage(field)} />
              ) : (
                <p id="risk-reason-help" className="text-xs text-muted-foreground">
                  Everyone on the account can read this. It is saved with your name.
                </p>
              )}
            </div>
          )}
        </form.Field>
        <form.Field name="days">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor="risk-days">How long should the acceptance last?</Label>
              <Select value={field.state.value} items={FINDING_ACCEPT_DAYS_OPTIONS} onValueChange={(next) => next && field.handleChange(next)}>
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
          )}
        </form.Field>
      </DialogBody>
      <DialogFooter className="grid justify-stretch gap-3">
        <form.Subscribe selector={(state) => state.values.days}>
          {(days) => <p className="text-sm leading-relaxed">You are about to accept this risk for {days} days. The decision is recorded in the audit trail.</p>}
        </form.Subscribe>
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
