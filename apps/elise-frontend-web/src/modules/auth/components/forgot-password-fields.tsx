import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage, focusFirstInvalidField } from "#/lib/form-field";
import { requestPasswordReset } from "../api";
import { AUTH_COPY } from "../constants";
import { ForgotPasswordSchema } from "../schemas";

// -----
// After the request the form gives way to one line that is the same for every
// email, so the page never says which addresses have an account.
// -----
export function ForgotPasswordFields() {
  const mutation = useMutation({
    mutationFn: (input: typeof ForgotPasswordSchema._output) => requestPasswordReset({ data: input }),
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });
  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: ForgotPasswordSchema },
    onSubmit: ({ value }) => mutation.mutate(value),
    onSubmitInvalid: focusFirstInvalidField,
  });

  if (mutation.isSuccess) {
    return (
      <output className="block text-sm leading-relaxed">{AUTH_COPY.forgot.sent}</output>
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
      <form.Field name="email">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name={field.name} type="email" autoComplete="email" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} {...fieldAria(field, "email")} />
            <FieldError id="email" message={fieldMessage(field)} />
          </div>
        )}
      </form.Field>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Please wait…" : AUTH_COPY.forgot.submit}
      </Button>
    </form>
  );
}
