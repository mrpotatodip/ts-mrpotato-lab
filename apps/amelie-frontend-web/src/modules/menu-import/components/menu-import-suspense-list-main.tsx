import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { Badge } from "#/components/ui/badge";
import { LocalDateTime, PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { STATUS_LABEL } from "../constants";
import { useSuspenseMenuImports } from "../hooks";
import { MenuImportListSkeleton } from "./menu-import-list-skeleton";
import { MenuImportUpload } from "./menu-import-upload";


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
      <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr] lg:gap-x-10">
        {canEdit ? <MenuImportUpload /> : <p className="text-muted-foreground text-xs">Only an owner or manager can upload a menu.</p>}
        <Suspense fallback={<MenuImportListSkeleton />}>
          <MenuImportListView />
        </Suspense>
      </div>
    </>
  );
}

function MenuImportListView() {
  const { data } = useSuspenseMenuImports();

  if (data.length === 0) return <p className="text-muted-foreground text-sm">No menu uploaded yet.</p>;

  return (
    <PageCard title="Your uploads" description="Open one to review what was read from it." contentClassName="p-0">
      <ul className="divide-y">
        {data.map((item) => (
          <li key={item.id}>
            <Link to="/imports/$importId" params={{ importId: item.id }} className="hover:bg-accent/40 flex items-center justify-between gap-4 p-6 transition-colors">
              <div className="min-w-0 space-y-2">
                <p className="truncate text-sm font-medium">{item.files.map((file) => file.name).join(", ")}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <LocalDateTime iso={item.createdAt} />
                  {item.status === "ready"
                    ? ` · ${item.pendingCount} to review, ${item.approvedCount} approved, ${item.discardedCount} discarded`
                    : ""}
                </p>
                {item.error ? <p className="text-xs text-destructive">{item.error}</p> : null}
              </div>
              <Badge variant={item.status === "failed" ? "destructive" : "secondary"}>{STATUS_LABEL[item.status]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </PageCard>
  );
}
