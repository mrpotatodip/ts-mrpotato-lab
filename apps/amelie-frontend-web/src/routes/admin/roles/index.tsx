import { createFileRoute } from "@tanstack/react-router";

import { adminQueries, AdminRolesLanding } from "#/modules/admin";
import { PageHeader } from "#/modules/shared";

export const Route = createFileRoute("/admin/roles/")({
  loader: ({ context }) => context.queryClient.query(adminQueries.roles()),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader
        title="Roles"
        description="The user types every cafe can give its team. Set up a role here, then enable it."
      />
      <AdminRolesLanding />
    </>
  );
}
