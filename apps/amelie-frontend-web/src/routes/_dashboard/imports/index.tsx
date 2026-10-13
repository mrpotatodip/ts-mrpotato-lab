import { createFileRoute } from "@tanstack/react-router";

import { prefetchImportsPage } from "#/modules/dashboard";
import { MenuImportSuspenseListMain } from "#/modules/menu-import";

// -----
// Upload a menu, and see the uploads so far.
// -----
export const Route = createFileRoute("/_dashboard/imports/")({
  loader: ({ context }) => prefetchImportsPage(context.queryClient),
  component: RouteComponent,
});

function RouteComponent() {
  return <MenuImportSuspenseListMain />;
}
