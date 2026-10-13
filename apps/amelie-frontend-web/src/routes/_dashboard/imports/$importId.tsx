import { createFileRoute } from "@tanstack/react-router";

import { prefetchImportPage } from "#/modules/dashboard";
import { MenuImportSuspenseReviewMain } from "#/modules/menu-import";

// -----
// Review the drafts of one menu upload, then publish.
// -----
export const Route = createFileRoute("/_dashboard/imports/$importId")({
  loader: ({ context, params }) => prefetchImportPage(context.queryClient, params.importId),
  component: RouteComponent,
});

function RouteComponent() {
  const { importId } = Route.useParams();

  return <MenuImportSuspenseReviewMain importId={importId} />;
}
