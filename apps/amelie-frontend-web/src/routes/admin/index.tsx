import { createFileRoute } from "@tanstack/react-router";

import { adminQueries, AdminLanding } from "#/modules/admin";
import { PageHeader } from "#/modules/shared";

export const Route = createFileRoute("/admin/")({
  loader: ({ context }) => context.queryClient.query(adminQueries.inviteCodes()),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader
        title="Invite codes"
        description="Give a new cafe owner a code to sign up with. Each code works once, or as many times as you set."
      />
      <AdminLanding />
    </>
  );
}
