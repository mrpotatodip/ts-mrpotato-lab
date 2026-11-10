import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasAccessPower } from "@repo/contracts/elise";
import { groupsQuery, teamQuery, teamRolesQuery, TeamPage } from "#/modules/team";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team · EliseLAB" }] }),
  beforeLoad: ({ context }) => {
    if (!hasAccessPower(context.user?.powers ?? [], "company:team:members:read")) throw redirect({ to: "/overview" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.query({ ...teamQuery(), staleTime: "static" }), context.queryClient.query({ ...groupsQuery(), staleTime: "static" }), context.queryClient.query({ ...teamRolesQuery(), staleTime: "static" })]),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  return <TeamPage email={user?.email ?? ""} />;
}
