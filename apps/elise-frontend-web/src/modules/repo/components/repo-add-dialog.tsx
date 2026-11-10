import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { GitBranch, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { GithubRepoPicker } from "#/modules/github";
import { scanKeys } from "#/modules/scan";
import { addRepo } from "../api";
import { repoKeys } from "../hooks";
import { AddRepoDetailsSchema, AddRepoInputSchema, REPO_BRANCH_LIMIT } from "../schemas";

type BranchRow = { id: string; name: string };

const noBranches = (): BranchRow[] => [];

type RepoAddFormProps = { onDone: () => void };

function RepoAddForm({ onDone }: RepoAddFormProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const add = useMutation({
    mutationFn: (input: typeof AddRepoInputSchema._output) => addRepo({ data: input }),
    onSuccess: async (repo) => {
      onDone();
      toast.success("Repository added. Nothing was scanned.");
      await Promise.all([queryClient.invalidateQueries({ queryKey: repoKeys.all }), queryClient.invalidateQueries({ queryKey: scanKeys.all })]);
      await navigate({ to: "/repos/$repoId", params: { repoId: repo.id } });
    },
  });

  const form = useForm({
    defaultValues: { repo: "", branches: noBranches() },
    validators: { onSubmit: AddRepoDetailsSchema },
    onSubmit: ({ value }) => {
      const branches = value.branches.map((row) => row.name).filter((name) => name !== "");
      add.mutate({ repo: value.repo.trim(), ...(branches.length > 0 && { branches }) });
    },
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
        <GithubRepoPicker onPick={(picked) => form.setFieldValue("repo", picked)} />
        <form.Field name="repo">
          {(field) => (
        <div className="grid gap-2">
          <Label htmlFor="add-repo-url">Link to the GitHub repository</Label>
          <Input id="add-repo-url" name={field.name} autoComplete="off" placeholder="https://github.com/owner/name" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "add-repo-url", "add-repo-help")} />
          <FieldError id="add-repo-url" message={fieldMessage(field)} />
          <p id="add-repo-help" className="text-xs text-muted-foreground">
            Paste the link to a public GitHub repository, or to a private one you connected. Adding it does not scan it, and nothing is checked on GitHub. Private repository?{" "}
            <Link to="/connections" className="font-medium text-foreground underline underline-offset-2">
              Connect GitHub first
            </Link>
            .
          </p>
        </div>
          )}
        </form.Field>

        <form.Field name="branches" mode="array">
          {(branches) => (
            <fieldset className="grid gap-3">
              <legend className="flex w-full items-baseline justify-between gap-3 text-sm font-medium">
                <span>Branches to track (optional)</span>
                <span className="text-xs font-normal tabular-nums text-muted-foreground">
                  {branches.state.value.length} of {REPO_BRANCH_LIMIT}
                </span>
              </legend>
              <p className="text-xs text-muted-foreground">Each branch keeps its own history of findings. Type the exact name: capital letters count, and a wrong name only fails when you scan it.</p>
              {branches.state.value.map((row, index) => (
                <form.Field key={row.id} name={`branches[${index}].name`}>
                  {(field) => (
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`add-branch-${row.id}`} className="sr-only">
                          Branch {index + 1}
                        </Label>
                        <div className="relative flex-1">
                          <GitBranch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={`add-branch-${row.id}`}
                            name={field.name}
                            className="pl-9 font-mono"
                            autoComplete="off"
                            placeholder="main"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            {...fieldAria(field, `add-branch-${row.id}`)}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove branch ${index + 1}`} onClick={() => void branches.removeValue(index)}>
                          <X />
                        </Button>
                      </div>
                      <FieldError id={`add-branch-${row.id}`} message={fieldMessage(field)} />
                    </div>
                  )}
                </form.Field>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" disabled={branches.state.value.length >= REPO_BRANCH_LIMIT} onClick={() => void branches.pushValue({ id: crypto.randomUUID(), name: "" })}>
                <Plus className="size-3.5" />
                Add a branch
              </Button>
            </fieldset>
          )}
        </form.Field>

        {add.error && (
          <p role="alert" className="text-sm text-destructive">
            {add.error.message}
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        <div className="flex items-center justify-end gap-3">
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? "Adding…" : "Add repository"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

type RepoAddDialogProps = { label?: string; size?: "default" | "sm"; variant?: "default" | "outline" };

export function RepoAddDialog({ label = "Add repository", size = "sm", variant = "outline" }: RepoAddDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant={variant} />}>
        <Plus className="size-3.5" />
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a repository</DialogTitle>
          <DialogDescription>Add a repository and its branches without scanning it. When you start a scan later, you pick them from a list.</DialogDescription>
        </DialogHeader>
        {open && <RepoAddForm onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
