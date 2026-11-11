import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { createRunner } from "../api";
import { runnerKeys } from "../hooks";
import { RunnerDetailsSchema, type CreatedRunner, type RunnerDetails } from "../schemas";
import { runnerWhen } from "../utils";

const NAME_ID = "runner-name";
const NAME_HELP_ID = "runner-name-help";

export function RunnerAddDialog() {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreatedRunner | null>(null);
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: (input: RunnerDetails) => createRunner({ data: input }),
    onSuccess: async (runner) => {
      setCreated(runner);
      await queryClient.invalidateQueries({ queryKey: runnerKeys.list() });
    },
    onError: (error) => toast.error(`We couldn't make the code. ${error.message}`),
  });

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: RunnerDetailsSchema },
    onSubmit: ({ value }) => add.mutate({ name: value.name.trim() }),
  });

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset();
      setCreated(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-3.5" />
        Add a runner
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a runner</DialogTitle>
          <DialogDescription>A runner is a computer that runs scans for this account. We make a code that you type into the EliseLAB Runner app on that computer.</DialogDescription>
        </DialogHeader>
        {created ? (
          <>
            <DialogBody className="grid gap-3">
              <p className="text-sm">
                Open the EliseLAB Runner app on <span className="font-medium">{created.name}</span> and type this code. It works once and expires at {runnerWhen(created.expiresAt)}.
              </p>
              <Label htmlFor="runner-code">Pairing code</Label>
              <Input id="runner-code" readOnly value={created.pairingCode} onFocus={(event) => event.target.select()} className="h-12 text-center font-mono text-2xl tracking-widest" />
              <p className="text-sm text-muted-foreground">We show it only once. If you lose it, remove this runner and add it again.</p>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(created.pairingCode).then(() => toast.success("Code copied."));
                }}
              >
                <Copy className="size-3.5" />
                Copy code
              </Button>
              <Button onClick={() => reset(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody className="grid gap-4">
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={NAME_ID}>What is this computer called?</Label>
                    <Input
                      id={NAME_ID}
                      name={field.name}
                      type="text"
                      autoComplete="off"
                      placeholder="Jayson’s MacBook"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      {...fieldAria(field, NAME_ID, NAME_HELP_ID)}
                    />
                    {fieldMessage(field) ? (
                      <FieldError id={NAME_ID} message={fieldMessage(field)} />
                    ) : (
                      <p id={NAME_HELP_ID} className="text-xs text-muted-foreground">
                        Pick a name you will recognise in this list. You can add as many computers as you like.
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </DialogBody>
            <DialogFooter>
              <form.Subscribe selector={(state) => state.values.name}>
                {(name) => (
                  <p className="mr-auto text-xs text-muted-foreground">
                    {name.trim() === "" ? "We make a one-time code, good for 10 minutes." : `You're about to add ${name.trim()}. We make a one-time code, good for 10 minutes.`}
                  </p>
                )}
              </form.Subscribe>
              <Button type="submit" disabled={add.isPending}>
                {add.isPending ? "Making the code" : "Make the code"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
