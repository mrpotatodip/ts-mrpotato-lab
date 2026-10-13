import { useForm } from "@tanstack/react-form";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";

import { useAuthActions } from "../hooks";
import { SigninFormSchema } from "../schemas/signin-schemas";

export function SigninForm() {
  const { signin } = useAuthActions();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: ({ value }) => {
        const result = SigninFormSchema.safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((i) => i.message).join(", ");
      },
    },
    onSubmit: ({ value }) => {
      const validated = SigninFormSchema.parse(value);
      signin.mutate(validated);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signin-email"
              className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide"
            >
              Email
            </label>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="you@example.com"
            />
            {field.state.meta.errors.map((e, i) => (
              <span key={i} className="text-xs text-destructive">
                {String(e)}
              </span>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signin-password"
              className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide"
            >
              Password
            </label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="••••••••"
            />
            {field.state.meta.errors.map((e, i) => (
              <span key={i} className="text-xs text-destructive">
                {String(e)}
              </span>
            ))}
          </div>
        )}
      </form.Field>

      {signin.isError && (
        <p className="text-xs text-destructive">
          {signin.error instanceof Error
            ? signin.error.message
            : "Failed to sign in"}
        </p>
      )}

      <Button type="submit" disabled={signin.isPending} className="w-full">
        {signin.isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
