import { createFileRoute } from "@tanstack/react-router";

import { prefetchTeamPage } from "#/modules/dashboard";
import { TeamSuspensePanelMain } from "#/modules/team";

export const Route = createFileRoute("/_dashboard/team")({
  loader: ({ context }) => prefetchTeamPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamSuspensePanelMain />;
}
