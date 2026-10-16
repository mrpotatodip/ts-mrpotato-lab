import { createFileRoute } from "@tanstack/react-router";

import { fetchTeamInvitePreview, TeamJoinExpired, TeamJoinMain } from "#/modules/team";

export const Route = createFileRoute("/join/$token")({
  loader: ({ params }) => fetchTeamInvitePreview({ data: { token: params.token } }),
  component: RouteComponent,
  errorComponent: TeamJoinExpired,
});

function RouteComponent() {
  const preview = Route.useLoaderData();
  const { token } = Route.useParams();
  const { user } = Route.useRouteContext();

  return <TeamJoinMain token={token} preview={preview} sessionEmail={user?.email ?? null} />;
}

