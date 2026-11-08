import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "#/components/ui/skeleton";
import { inviteQuery, TeamInviteAccept, TeamInviteInvalid } from "#/modules/team";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Join · Elise" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(inviteQuery(params.token)),
  errorComponent: TeamInviteInvalid,
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user } = Route.useRouteContext();
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-24 h-64 w-full max-w-md" />}>
      <TeamInviteAccept token={token} signedIn={user !== null} />
    </Suspense>
  );
}
