import { createFileRoute, redirect } from "@tanstack/react-router";
import { groupsQuery, teamQuery, teamRolesQuery, TeamPage, TENANT_ADMIN_ROLE_KEY } from "#/modules/team";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team · EliseLAB" }] }),
  beforeLoad: ({ context }) => {
    if (context.user?.role !== TENANT_ADMIN_ROLE_KEY) throw redirect({ to: "/overview" });
  },
  loader: ({ context }) =>
    Promise.all([context.queryClient.query({ ...teamQuery(), staleTime: "static" }), context.queryClient.query({ ...groupsQuery(), staleTime: "static" }), context.queryClient.query({ ...teamRolesQuery(), staleTime: "static" })]),
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  return <TeamPage email={user?.email ?? ""} />;
}
