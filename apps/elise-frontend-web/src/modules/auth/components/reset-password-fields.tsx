import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { SIGN_UP_PASSWORD_MIN } from "@repo/contracts/elise";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage, focusFirstInvalidField } from "#/lib/form-field";
import { resetPassword } from "../api";
import { AUTH_COPY } from "../constants";
import { ResetPasswordSchema } from "../schemas";

function AskAgainLink() {
  return (
    <Link to="/forgot-password" className="text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {AUTH_COPY.reset.askAgain}
    </Link>
  );
}

// -----
// The token comes from the emailed link. The form never shows it, and a spent
// one is told apart by the engine's answer, not guessed here.
// -----
export function ResetPasswordFields({ token }: { token: string | undefined }) {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (input: typeof ResetPasswordSchema._output) => resetPassword({ data: input }),
    onSuccess: async () => {
      toast.success(AUTH_COPY.reset.done);
      await navigate({ to: "/signin" });
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });
  const form = useForm({
    defaultValues: { token: token ?? "", password: "" },
    validators: { onSubmit: ResetPasswordSchema },
    onSubmit: ({ value }) => mutation.mutate(value),
    onSubmitInvalid: focusFirstInvalidField,
  });

  if (!token) {
    return (
      <div className="grid gap-4">
        <p role="alert" className="text-sm leading-relaxed">
          {AUTH_COPY.reset.noToken}
        </p>
        <AskAgainLink />
      </div>
    );
  }

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
      <form.Field name="password">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name={field.name} type="password" autoComplete="new-password" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "password", "password-hint")} />
            <p id="password-hint" className="text-sm leading-relaxed text-muted-foreground">
              At least {SIGN_UP_PASSWORD_MIN} characters.
            </p>
            <FieldError id="password" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Please wait…" : AUTH_COPY.reset.submit}
      </Button>
      {mutation.isError ? <AskAgainLink /> : null}
    </form>
  );
}
