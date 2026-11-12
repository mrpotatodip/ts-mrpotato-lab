import { createFileRoute } from "@tanstack/react-router";
import { SettingsHistoryPage } from "#/modules/settings";
import { settingsChangesQuery } from "#/modules/usage";

export const Route = createFileRoute("/_app/settings/history")({
  head: () => ({ meta: [{ title: "History · Settings · Elise" }] }),
  loader: ({ context }) => context.queryClient.query({ ...settingsChangesQuery(), staleTime: "static" }),
  component: SettingsHistoryPage,
});
