import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SIGN_UP_PASSWORD_MIN } from "@repo/contracts/elise";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authKeys } from "#/modules/auth";
import { ShellBrand } from "#/modules/shell";
import { acceptTeamInvite } from "../api";
import { inviteQuery } from "../hooks";

type Errors = { firstName?: string; lastName?: string; password?: string };

const validate = (firstName: string, lastName: string, password: string): Errors => ({
  firstName: firstName.trim() === "" ? "Tell us your first name." : undefined,
  lastName: lastName.trim() === "" ? "Tell us your last name." : undefined,
  password: password.length < SIGN_UP_PASSWORD_MIN ? `Use at least ${SIGN_UP_PASSWORD_MIN} characters so it is hard to guess.` : undefined,
});

type FieldErrorProps = { id: string; message: string | undefined };

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-status-danger">
      {message}
    </p>
  );
}

export function TeamInviteAccept({ token, signedIn }: { token: string; signedIn: boolean }) {
  const { data: invite } = useSuspenseQuery(inviteQuery(token));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const needsDetails = !invite.hasAccount;
  const needsSignIn = invite.hasAccount && !signedIn;

  const accept = useMutation({
    mutationFn: () => acceptTeamInvite({ data: needsDetails ? { token, firstName, lastName, password } : { token } }),
    onSuccess: async () => {
      toast.success(`You joined ${invite.accountName}.`);
      queryClient.removeQueries({ queryKey: authKeys.session() });
      await navigate({ to: signedIn ? "/overview" : "/signin" });
    },
    onError: (error) => toast.error(`We couldn't accept the invite. ${error.message}`),
  });

  const clear = (field: keyof Errors) => setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (needsDetails) {
      const found = validate(firstName, lastName, password);
      setErrors(found);
      if (found.firstName || found.lastName || found.password) return;
    }
    accept.mutate();
  };

  const hint = needsDetails ? `You were invited as ${invite.roleLabel}. Set up your login to join.` : `You were invited as ${invite.roleLabel}.`;

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-sm content-center gap-8 p-6">
      <div className="justify-self-center text-center">
        <ShellBrand />
      </div>
      <Card className="shadow-raised">
        <CardHeader className="gap-1.5 px-6 pb-9 pt-6">
          <CardTitle className="text-xl">Join {invite.accountName}</CardTitle>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </CardHeader>
        <CardContent className="p-6">
          <form className="grid gap-4" onSubmit={submit} noValidate>
            {needsDetails && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="first-name">What is your first name?</Label>
                  <Input
                    id="first-name"
                    name="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={errors.firstName ? "first-name-error" : undefined}
                    onChange={(event) => {
                      clear("firstName");
                      setFirstName(event.target.value);
                    }}
                  />
                  <FieldError id="first-name-error" message={errors.firstName} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">And your last name?</Label>
                  <Input
                    id="last-name"
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    aria-invalid={errors.lastName ? true : undefined}
                    aria-describedby={errors.lastName ? "last-name-error" : undefined}
                    onChange={(event) => {
                      clear("lastName");
                      setLastName(event.target.value);
                    }}
                  />
                  <FieldError id="last-name-error" message={errors.lastName} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Choose a password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? "password-error" : "password-help"}
                    onChange={(event) => {
                      clear("password");
                      setPassword(event.target.value);
                    }}
                  />
                  {errors.password ? (
                    <FieldError id="password-error" message={errors.password} />
                  ) : (
                    <p id="password-help" className="text-xs text-muted-foreground">
                      At least {SIGN_UP_PASSWORD_MIN} characters.
                    </p>
                  )}
                </div>
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
              {needsSignIn ? "You already have a login. Sign in, then open this link again." : `You will join ${invite.accountName} as ${invite.roleLabel}.`}
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
