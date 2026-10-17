import { Suspense } from "react";

import { AdminRoleTable } from "./admin-role-table";
import { AdminRolesSkeleton } from "./admin-roles-skeleton";

export function AdminSuspenseRolesMain() {
  return (
    <Suspense fallback={<AdminRolesSkeleton />}>
      <AdminRoleTable />
    </Suspense>
  );
}
