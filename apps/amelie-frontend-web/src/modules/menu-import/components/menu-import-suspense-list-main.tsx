import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { cn } from "#/lib/utils";
import { DashboardStatusBadge } from "#/modules/dashboard/components/dashboard-status-badge";
import { DASHBOARD_ROW_LINK_CLASS } from "#/modules/dashboard/constants/dashboard-nav";
import { LocalDateTime, PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useSuspenseMenuImports } from "../hooks";
import { importListStatus } from "../utils";
import { MenuImportListSkeleton } from "./menu-import-list-skeleton";
import { MenuImportUpload } from "./menu-import-upload";

const LIST_TITLE = "Your uploads";
const LIST_DESCRIPTION = "Open one to review what was read from it.";

// -----
// Upload a menu, and see the uploads so far. The header and
// the upload card show at once; the list waits behind
// its skeleton.
// -----
export function MenuImportSuspenseListMain() {
  const { canEdit } = useActiveTenantRole();

  return (
    <>
      <PageHeader title="Menu import" description="Upload a menu file, review what was read from it, then publish it." />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        {canEdit ? (
          <MenuImportUpload />
        ) : (
          <PageCard title="Upload a menu" description="One PDF, or up to 10 photos.">
            <p className="text-muted-foreground text-sm">Only a tenant_admin or store_admin can upload a menu.</p>
          </PageCard>
        )}
        <Suspense fallback={<MenuImportListSkeleton />}>
          <MenuImportListView />
        </Suspense>
      </div>
    </>
  );
}

function MenuImportListView() {
  const { data } = useSuspenseMenuImports();

  return (
    <PageCard title={LIST_TITLE} description={LIST_DESCRIPTION} contentClassName="p-0">
      {data.length === 0 ? (
        <p className="text-muted-foreground p-6 text-sm">No menu uploaded yet.</p>
      ) : (
        <ul className="divide-y">
          {data.map((item) => {
            const status = importListStatus(item);
            return (
              <li key={item.id}>
                <Link
                  to="/imports/$importId"
                  params={{ importId: item.id }}
                  className={cn(DASHBOARD_ROW_LINK_CLASS, "items-center justify-between gap-4")}
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="truncate text-sm font-medium">{item.files.map((file) => file.name).join(", ")}</p>
                    <p className="stat-label">
                      <LocalDateTime iso={item.createdAt} />
                      {item.status === "ready"
                        ? ` · ${item.pendingCount} to review, ${item.approvedCount} approved, ${item.discardedCount} discarded`
                        : ""}
                    </p>
                    {item.error ? <p className="text-xs text-destructive">{item.error}</p> : null}
                  </div>
                  <DashboardStatusBadge tone={status.tone}>{status.label}</DashboardStatusBadge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageCard>
  );
}
