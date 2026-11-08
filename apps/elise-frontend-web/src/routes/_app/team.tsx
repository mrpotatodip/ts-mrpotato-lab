import { createFileRoute, redirect } from "@tanstack/react-router";
import { groupsQuery, teamQuery, teamRolesQuery, TeamPage, TENANT_ADMIN_ROLE_KEY } from "#/modules/team";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team · Elise" }] }),
  beforeLoad: ({ context }) => {
    if (context.user?.role !== TENANT_ADMIN_ROLE_KEY) throw redirect({ to: "/overview" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(teamQuery()), context.queryClient.ensureQueryData(groupsQuery()), context.queryClient.ensureQueryData(teamRolesQuery())]),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  return <TeamPage email={user?.email ?? ""} />;
}
