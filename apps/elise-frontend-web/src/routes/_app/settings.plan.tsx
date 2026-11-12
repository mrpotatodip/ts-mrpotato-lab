import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasAccessPower } from "@repo/contracts/elise";
import { creditEntriesQuery, planQuery } from "#/modules/plan";
import { SettingsPlanPage } from "#/modules/settings";

export const Route = createFileRoute("/_app/settings/plan")({
  head: () => ({ meta: [{ title: "Plan · Settings · Elise" }] }),
  beforeLoad: ({ context }) => {
    if (!hasAccessPower(context.user?.powers ?? [], "company:plan:read")) throw redirect({ to: "/settings/budget" });
  },
  loader: ({ context }) => Promise.all([context.queryClient.query({ ...planQuery(), staleTime: "static" }), context.queryClient.infiniteQuery({ ...creditEntriesQuery(), staleTime: "static" })]),
  component: SettingsPlanPage,
});
