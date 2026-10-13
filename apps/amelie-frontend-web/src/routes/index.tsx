import { createFileRoute, redirect } from "@tanstack/react-router";

// -----
// Overview is the home screen.
// -----
export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: "/overview" });
    throw redirect({ to: "/signin" });
  },
});
