import { Suspense } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { Skeleton } from "#/components/ui/skeleton";
import { inviteQuery, TeamInviteAccept, TeamInviteInvalid } from "#/modules/team";

const FailureStatusSchema = z.object({ status: z.number() });

// -----
// An invite the engine does not know, has expired or has revoked is the
// reader's problem, not a server fault: it answers 404, not 500. The engine
// says 403 for these (it will not tell a guesser which). Any other failure
// (the engine down, a rate limit, a broken contract) stays an error.
// -----
const UNUSABLE_INVITE_STATUSES = new Set([400, 403, 404, 410]);

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Join · EliseLAB" }] }),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query({ ...inviteQuery(params.token), staleTime: "static" });
    } catch (error) {
      const failure = FailureStatusSchema.safeParse(error);
      if (failure.success && UNUSABLE_INVITE_STATUSES.has(failure.data.status)) throw notFound();
      throw error;
    }
  },
  notFoundComponent: TeamInviteInvalid,
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
