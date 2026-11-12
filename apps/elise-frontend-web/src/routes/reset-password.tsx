import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "#/modules/auth";

const SearchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "New password · Elise" }] }),
  validateSearch: SearchSchema,
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: "/overview" });
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  return <AuthForm mode="reset" token={token} />;
}
