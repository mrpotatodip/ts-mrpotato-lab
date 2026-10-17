import { createFileRoute } from "@tanstack/react-router";
import { AdminRolesPreview, AdminRolesPreviewSearchSchema } from "#/modules/admin/prototypes";

export const Route = createFileRoute("/prototype/admin-roles")({
  validateSearch: AdminRolesPreviewSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { view } = Route.useSearch();
  return <AdminRolesPreview view={view} />;
}
