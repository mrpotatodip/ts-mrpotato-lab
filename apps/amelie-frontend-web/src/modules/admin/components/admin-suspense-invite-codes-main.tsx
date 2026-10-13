import { Suspense } from "react";

import { AdminInviteCodeTable } from "./admin-invite-code-table";
import { AdminInviteCodesSkeleton } from "./admin-invite-codes-skeleton";

// -----
// The "All codes" list. The table waits behind the
// skeleton; the form beside it shows at once.
// -----
export function AdminSuspenseInviteCodesMain() {
  return (
    <Suspense fallback={<AdminInviteCodesSkeleton />}>
      <AdminInviteCodeTable />
    </Suspense>
  );
}
