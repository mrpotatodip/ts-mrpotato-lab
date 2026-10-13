import type { InviteCodeStatusValue } from "@repo/contracts/amelie";
import { inviteCodeStatusLabel, inviteCodeStatusTone } from "../utils";

export function AdminInviteCodeStatusBadge({ status }: { status: InviteCodeStatusValue }) {
  return (
    <span className="status-badge" data-status={inviteCodeStatusTone(status)}>
      {inviteCodeStatusLabel(status)}
    </span>
  );
}
