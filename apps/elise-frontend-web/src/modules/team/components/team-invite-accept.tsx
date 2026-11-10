import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SIGN_UP_PASSWORD_MIN } from "@repo/contracts/elise";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { authKeys } from "#/modules/auth";
import { ShellPublicBrand, ShellPublicThemeSwitch } from "#/modules/shell";
import { acceptTeamInvite } from "../api";
import { teamRoleLabel } from "../utils";
import { inviteQuery } from "../hooks";
import { AcceptInviteDetailsSchema, type AcceptInviteInput } from "../schemas";

export function TeamInviteAccept({ token, signedIn }: { token: string; signedIn: boolean }) {
  const { data: invite } = useSuspenseQuery(inviteQuery(token));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const needsDetails = !invite.hasAccount;
  const needsSignIn = invite.hasAccount && !signedIn;

  const accept = useMutation({
    mutationFn: (input: AcceptInviteInput) => acceptTeamInvite({ data: input }),
    onSuccess: async () => {
      toast.success(`You joined ${invite.accountName}.`);
      queryClient.removeQueries({ queryKey: authKeys.session() });
      await navigate({ to: signedIn ? "/overview" : "/signin" });
    },
    onError: (error) => toast.error(`We couldn't accept the invite. ${error.message}`),
  });

  const form = useForm({
    defaultValues: { firstName: "", lastName: "", password: "" },
    validators: needsDetails ? { onSubmit: AcceptInviteDetailsSchema } : undefined,
    onSubmit: ({ value }) => accept.mutate(needsDetails ? { token, ...value } : { token }),
  });

  const roleLabel = teamRoleLabel(invite.role, invite.roleLabel);
  const hint = needsDetails ? `You were invited as ${roleLabel}. Set up your login to join.` : `You were invited as ${roleLabel}.`;

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-lg content-center gap-8 p-6">
      <ShellPublicThemeSwitch />
      <ShellPublicBrand />
      <Card className="shadow-raised">
        <CardHeader className="gap-1.5 px-8 pb-9 pt-8">
          <CardTitle className="text-xl">Join {invite.accountName}</CardTitle>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </CardHeader>
        <CardContent className="p-8">
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            {needsDetails && (
              <>
                <form.Field name="firstName">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="first-name">What is your first name?</Label>
                      <Input id="first-name" name={field.name} autoComplete="given-name" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "first-name")} />
                      <FieldError id="first-name" message={fieldMessage(field)} />
                    </div>
                  )}
                </form.Field>
                <form.Field name="lastName">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="last-name">And your last name?</Label>
                      <Input id="last-name" name={field.name} autoComplete="family-name" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "last-name")} />
                      <FieldError id="last-name" message={fieldMessage(field)} />
                    </div>
                  )}
                </form.Field>
                <form.Field name="password">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="password">Choose a password</Label>
                      <Input id="password" name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "password", "password-help")} />
                      {fieldMessage(field) ? (
                        <FieldError id="password" message={fieldMessage(field)} />
                      ) : (
                        <p id="password-help" className="text-xs text-muted-foreground">
                          At least {SIGN_UP_PASSWORD_MIN} characters.
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </>
            )}
            {needsSignIn ? (
              <Button type="button" onClick={() => void navigate({ to: "/signin" })}>
                Sign in to accept
              </Button>
            ) : (
              <Button type="submit" disabled={accept.isPending}>
                {accept.isPending ? "Joining" : "Accept invite"}
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {needsSignIn ? "You already have a login. Sign in, then open this link again." : `You will join ${invite.accountName} as ${roleLabel}.`}
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
