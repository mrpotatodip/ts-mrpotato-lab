import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { prefetchTeamPage } from "#/modules/dashboard";
import { TeamSuspensePanelMain } from "#/modules/team";
import { TeamBindingPrototype } from "#/modules/team/prototype/team-binding-prototype";

export const Route = createFileRoute("/_dashboard/team")({
  validateSearch: z.object({ variant: z.enum(["A", "B", "C"]).optional() }),
  loader: ({ context }) => prefetchTeamPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  const { variant } = Route.useSearch();
  if (variant) return <TeamBindingPrototype variant={variant} />;
  return <TeamSuspensePanelMain />;
}
