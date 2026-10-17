import { createFileRoute } from "@tanstack/react-router";

import { adminQueries, AdminRolePage } from "#/modules/admin";

export const Route = createFileRoute("/admin/roles/$roleId")({
  loader: ({ context, params }) => context.queryClient.query(adminQueries.role(params.roleId)),
  component: RouteComponent,
});

function RouteComponent() {
  const { roleId } = Route.useParams();

  return <AdminRolePage key={roleId} roleId={roleId} />;
}
