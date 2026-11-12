import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { SIGN_UP_PASSWORD_MIN } from "@repo/contracts/elise";
import { toast } from "sonner";
import { ShellPublicBrand, ShellPublicThemeSwitch } from "#/modules/shell";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage, focusFirstInvalidField } from "#/lib/form-field";
import { signIn, signUp } from "../api";
import { AUTH_COPY } from "../constants";
import { AuthBrandPanel } from "./auth-brand-panel";
import { ForgotPasswordFields } from "./forgot-password-fields";
import { ResetPasswordFields } from "./reset-password-fields";
import { authKeys } from "../hooks";
import { SignInSchema, SignUpInputSchema } from "../schemas";

// -----
// After a sign-in or sign-up: forget the old session and go to the app.
// A failure from the server is a toast; a bad field is an inline error.
// -----
function useAuthDone() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return {
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: authKeys.session() });
      await router.invalidate();
      await navigate({ to: "/overview" });
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  };
}

function SignInFields() {
  const done = useAuthDone();
  const signInMutation = useMutation({ mutationFn: (input: typeof SignInSchema._output) => signIn({ data: input }), ...done });
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: SignInSchema },
    onSubmit: ({ value }) => signInMutation.mutate(value),
    onSubmitInvalid: focusFirstInvalidField,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-5"
    >
      <form.Field name="email">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name={field.name} type="email" autoComplete="email" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "email")} />
            <FieldError id="email" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name={field.name} type="password" autoComplete="current-password" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "password")} />
            <FieldError id="password" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={signInMutation.isPending}>
        {signInMutation.isPending ? "Please wait…" : AUTH_COPY.signin.submit}
      </Button>
      <Link to={AUTH_COPY.signin.forgotTo} className="justify-self-start rounded-sm text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {AUTH_COPY.signin.forgot}
      </Link>
    </form>
  );
}

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function SignUpFields() {
  const done = useAuthDone();
  const signUpMutation = useMutation({ mutationFn: (input: typeof SignUpInputSchema._output) => signUp({ data: input }), ...done });
  const form = useForm({
    defaultValues: { inviteCode: "", firstName: "", lastName: "", accountName: "", email: "", password: "", timezone: browserTimezone() },
    validators: { onSubmit: SignUpInputSchema },
    onSubmit: ({ value }) => signUpMutation.mutate(value),
    onSubmitInvalid: focusFirstInvalidField,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-5"
    >
      <form.Field name="inviteCode">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="inviteCode">Invite code</Label>
            <Input id="inviteCode" name={field.name} autoComplete="off" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "inviteCode", "inviteCode-help")} />
            <p id="inviteCode-help" className="text-sm leading-relaxed text-muted-foreground">
              {AUTH_COPY.signup.inviteCodeHelp}
            </p>
            <FieldError id="inviteCode" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="firstName">
          {(field) => (
            <div className="grid content-start gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name={field.name} autoComplete="given-name" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "firstName")} />
              <FieldError id="firstName" message={fieldMessage(field)} />
            </div>
          )}
        </form.Field>
        <form.Field name="lastName">
          {(field) => (
            <div className="grid content-start gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name={field.name} autoComplete="family-name" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "lastName")} />
              <FieldError id="lastName" message={fieldMessage(field)} />
            </div>
          )}
        </form.Field>
      </div>
      <form.Field name="accountName">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="accountName">Account name</Label>
            <Input id="accountName" name={field.name} autoComplete="organization" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "accountName", "accountName-help")} />
            <p id="accountName-help" className="text-sm leading-relaxed text-muted-foreground">
              {AUTH_COPY.signup.accountNameHelp}
            </p>
            <FieldError id="accountName" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <form.Field name="email">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name={field.name} type="email" autoComplete="email" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "email")} />
            <FieldError id="email" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "password", "password-hint")} />
            <p id="password-hint" className="text-sm leading-relaxed text-muted-foreground">
              At least {SIGN_UP_PASSWORD_MIN} characters.
            </p>
            <FieldError id="password" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <p className="text-sm leading-relaxed text-muted-foreground">{AUTH_COPY.signup.consequence}</p>
      <Button type="submit" size="lg" className="w-full" disabled={signUpMutation.isPending}>
        {signUpMutation.isPending ? "Please wait…" : AUTH_COPY.signup.submit}
      </Button>
    </form>
  );
}

type AuthMode = "signin" | "signup" | "forgot" | "reset";

function AuthFields({ mode, token }: { mode: AuthMode; token: string | undefined }) {
  if (mode === "signup") return <SignUpFields />;
  if (mode === "forgot") return <ForgotPasswordFields />;
  if (mode === "reset") return <ResetPasswordFields token={token} />;
  return <SignInFields />;
}

// -----
// `token` is only read by the reset page: the one from the emailed link.
// -----
export function AuthForm({ mode, token }: { mode: AuthMode; token?: string }) {
  const copy = AUTH_COPY[mode];

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-6xl lg:grid-cols-2">
      <ShellPublicThemeSwitch />
      <AuthBrandPanel />
      <div className="mx-auto grid w-full max-w-lg content-center gap-8 p-6 lg:p-12">
        <div className="grid lg:hidden">
          <ShellPublicBrand />
        </div>
        <Card className="shadow-raised">
          <CardHeader className="gap-1.5 px-8 pb-9 pt-8">
            <h1 className="text-xl font-semibold leading-none tracking-tight">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.hint}</p>
          </CardHeader>
          <CardContent className="p-8">
            <AuthFields mode={mode} token={token} />
          </CardContent>
        </Card>
        <Link to={copy.to} className="inline-flex min-h-6 items-center justify-self-center rounded-sm text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {copy.swap}
        </Link>
      </div>
    </main>
  );
}
