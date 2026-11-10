import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { createTeamInvite } from "../api";
import { teamKeys, teamRolesQuery } from "../hooks";
import { CreateInviteInputSchema } from "../schemas";

const inviteLink = (token: string) => `${window.location.origin}/invite/${encodeURIComponent(token)}`;

export function TeamInviteDialog() {
  const { data: roles } = useSuspenseQuery(teamRolesQuery());
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState<{ email?: string; role?: string }>({});
  const [link, setLink] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setEmail("");
      setRole("");
      setErrors({});
      setLink(null);
    }
  };

  const invite = useMutation({
    mutationFn: (input: { email: string; role: string }) => createTeamInvite({ data: input }),
    onSuccess: async (created) => {
      setLink(inviteLink(created.token));
      await queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
    onError: (error) => toast.error(`We couldn't create the invite. ${error.message}`),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = CreateInviteInputSchema.safeParse({ email, role });
    const next = {
      email: parsed.success || !parsed.error.issues.some((i) => i.path[0] === "email") ? undefined : "That doesn't look like an email address. Use the form name@company.com.",
      role: role === "" ? "Pick what they should be able to do." : undefined,
    };
    setErrors(next);
    if (!parsed.success || next.role) return;
    invite.mutate(parsed.data);
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
        {link ? (
          <>
            <DialogBody className="grid gap-2">
              <p className="text-sm">We are emailing {email.trim()}. Check the spam folder if it does not arrive, or send them this link yourself.</p>
              <Label htmlFor="invite-link">Invite link</Label>
              <Input id="invite-link" readOnly value={link} onFocus={(event) => event.target.select()} />
            </DialogBody>
            <DialogFooter>
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(link).then(() => toast.success("Link copied."));
                }}
              >
                <Copy className="size-3.5" />
                Copy link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Who should we invite?</Label>
                <Input id="invite-email" type="email" autoComplete="off" placeholder="name@company.com" aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "invite-email-error" : "invite-email-help"} value={email} onChange={(event) => { setErrors((current) => ({ ...current, email: undefined })); setEmail(event.target.value); }} />
                {errors.email ? (
                  <p id="invite-email-error" role="alert" className="text-xs text-status-danger">
                    {errors.email}
                  </p>
                ) : (
                  <p id="invite-email-help" className="text-xs text-muted-foreground">
                    Use the address they sign in with. The invite expires after 7 days.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">What should they be able to do?</Label>
                <Select value={role} items={roles.map((r) => ({ value: r.key, label: r.label }))} onValueChange={(next) => { setErrors((current) => ({ ...current, role: undefined })); setRole(roles.find((r) => r.key === next)?.key ?? role); }}>
                  <SelectTrigger id="invite-role" aria-invalid={errors.role ? true : undefined} aria-describedby={errors.role ? "invite-role-error" : undefined}>
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
                {errors.role && (
                  <p id="invite-role-error" role="alert" className="text-xs text-status-danger">
                    {errors.role}
                  </p>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <p className="mr-auto text-xs text-muted-foreground">
                {email.trim() === "" || role === "" ? "We email them the link." : `You're about to invite ${email.trim()} as ${roles.find((r) => r.key === role)?.label}. We email them the link.`}
              </p>
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
