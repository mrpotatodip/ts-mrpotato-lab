import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "#/modules/auth";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in · EliseLAB" }] }),
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: "/overview" });
  },
  component: () => <AuthForm mode="signin" />,
});
