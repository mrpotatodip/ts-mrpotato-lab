import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasAccessPower } from "@repo/contracts/elise";
import { SettingsPage } from "#/modules/settings";
import { budgetChangesQuery, usageQuery } from "#/modules/usage";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · EliseLAB" }] }),
  beforeLoad: ({ context }) => {
    if (!hasAccessPower(context.user?.powers ?? [], "company:usage:budget:update")) throw redirect({ to: "/overview" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.query({ ...usageQuery(), staleTime: "static" }), context.queryClient.query({ ...budgetChangesQuery(), staleTime: "static" })]),
  component: SettingsPage,
});
