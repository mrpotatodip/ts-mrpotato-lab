import { useState } from "react";
import type { CreatedInviteCode } from "@repo/contracts/amelie";

import { PageCard } from "#/modules/shared";
import { AdminInviteCodeDialog } from "./admin-invite-code-dialog";
import { AdminInviteCodeForm } from "./admin-invite-code-form";
import { AdminSuspenseInviteCodesMain } from "./admin-suspense-invite-codes-main";

// -----
// The invite code generator. The created code lives
// in this state only, until the dialog is dismissed.
// -----
export function AdminLanding() {
  const [created, setCreated] = useState<CreatedInviteCode | null>(null);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Generate a code" description="A new code to hand to someone. It is shown once.">
        <AdminInviteCodeForm onCreated={setCreated} />
      </PageCard>
      <PageCard title="All codes" description="Every code, who made it, and whether it can still be used." contentClassName="p-0">
        <AdminSuspenseInviteCodesMain />
      </PageCard>
      <AdminInviteCodeDialog created={created} onDismiss={() => setCreated(null)} />
    </div>
  );
}
