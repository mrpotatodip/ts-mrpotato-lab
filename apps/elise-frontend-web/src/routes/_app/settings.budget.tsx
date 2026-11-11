import { createFileRoute } from "@tanstack/react-router";
import { SettingsBudgetPage } from "#/modules/settings";
import { usageQuery } from "#/modules/usage";

export const Route = createFileRoute("/_app/settings/budget")({
  head: () => ({ meta: [{ title: "Budget · Settings · EliseLAB" }] }),
  loader: ({ context }) => context.queryClient.query({ ...usageQuery(), staleTime: "static" }),
  component: SettingsBudgetPage,
});
