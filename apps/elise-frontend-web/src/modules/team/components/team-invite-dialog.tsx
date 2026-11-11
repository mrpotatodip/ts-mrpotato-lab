import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { createTeamInvite } from "../api";
import { teamKeys, teamRolesQuery } from "../hooks";
import { InviteDetailsSchema, type CreateInviteInput } from "../schemas";
import { teamRoleLabel } from "../utils";

const inviteLink = (token: string) => `${window.location.origin}/invite/${encodeURIComponent(token)}`;

type Sent = { email: string; link: string };

export function TeamInviteDialog() {
  const { data: roles } = useSuspenseQuery(teamRolesQuery());
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const queryClient = useQueryClient();

  const invite = useMutation({
    mutationFn: (input: CreateInviteInput) => createTeamInvite({ data: input }),
    onSuccess: async (created, input) => {
      setSent({ email: input.email.trim(), link: inviteLink(created.token) });
      await queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
    onError: (error) => toast.error(`We couldn't create the invite. ${error.message}`),
  });

  const form = useForm({
    defaultValues: { email: "", role: "" },
    validators: { onSubmit: InviteDetailsSchema },
    onSubmit: ({ value }) => invite.mutate(value),
  });

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset();
      setSent(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <UserPlus className="size-3.5" />
        Invite
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>We email them a one-time link. You also get a copy, shown only once, in case the email does not arrive.</DialogDescription>
        </DialogHeader>
        {sent ? (
          <>
            <DialogBody className="grid gap-2">
              <p className="text-sm">We are emailing {sent.email}. Check the spam folder if it does not arrive, or send them this link yourself.</p>
              <Label htmlFor="invite-link">Invite link</Label>
              <Input id="invite-link" readOnly value={sent.link} onFocus={(event) => event.target.select()} />
            </DialogBody>
            <DialogFooter>
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(sent.link).then(() => toast.success("Link copied."));
                }}
              >
                <Copy className="size-3.5" />
                Copy link
              </Button>
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
              <form.Field name="email">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="invite-email">Who should we invite?</Label>
                    <Input
                      id="invite-email"
                      name={field.name}
                      type="email"
                      autoComplete="off"
                      placeholder="name@company.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      {...fieldAria(field, "invite-email", "invite-email-help")}
                    />
                    {fieldMessage(field) ? (
                      <FieldError id="invite-email" message={fieldMessage(field)} />
                    ) : (
                      <p id="invite-email-help" className="text-xs text-muted-foreground">
                        Use the address they sign in with. The invite expires after 7 days.
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field name="role">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="invite-role">What should they be able to do?</Label>
                    <Select
                      value={field.state.value}
                      items={roles.map((r) => ({ value: r.key, label: teamRoleLabel(r.key, r.label) }))}
                      onValueChange={(next) => field.handleChange(roles.find((r) => r.key === next)?.key ?? field.state.value)}
                    >
                      <SelectTrigger id="invite-role" {...fieldAria(field, "invite-role")}>
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.key} value={r.key}>
                            <span className="grid">
                              <span>{r.label}</span>
                              {r.description && <span className="text-xs text-muted-foreground">{r.description}</span>}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError id="invite-role" message={fieldMessage(field)} />
                  </div>
                )}
              </form.Field>
            </DialogBody>
            <DialogFooter>
              <form.Subscribe selector={(state) => state.values}>
                {(values) => (
                  <p className="mr-auto text-xs text-muted-foreground">
                    {values.email.trim() === "" || values.role === ""
                      ? "We email them the link."
                      : `You're about to invite ${values.email.trim()} as ${teamRoleLabel(values.role, roles.find((r) => r.key === values.role)?.label ?? "")}. We email them the link.`}
                  </p>
                )}
              </form.Subscribe>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Creating" : "Create invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
