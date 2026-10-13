import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { useSuspenseInviteCodes } from "../hooks";
import { formatInviteCodeUses } from "../utils";
import { AdminInviteCodeRevokeButton } from "./admin-invite-code-revoke-button";
import { AdminInviteCodeStatusBadge } from "./admin-invite-code-status-badge";
import { LocalDateTime } from "#/modules/shared";

export function AdminInviteCodeTable() {
  const { data } = useSuspenseInviteCodes();
  if (data.length === 0) {
    return <p className="stat-label p-6">No invite codes yet. Generate the first one on the left.</p>;
  }

  return (
    <Table className="min-w-[48rem] whitespace-nowrap">
      <TableHeader>
        <TableRow>
          <TableHead>Note</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uses</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((inviteCode) => (
          <TableRow key={inviteCode.id}>
            <TableCell className="max-w-56 truncate">{inviteCode.note || "-"}</TableCell>
            <TableCell>
              <AdminInviteCodeStatusBadge status={inviteCode.status} />
            </TableCell>
            <TableCell className="tabular-nums">
              {formatInviteCodeUses(inviteCode.useCount, inviteCode.maxUses)}
            </TableCell>
            <TableCell className="whitespace-nowrap"><LocalDateTime iso={inviteCode.createdAt} /></TableCell>
            <TableCell className="whitespace-nowrap">{inviteCode.expiresAt === null ? "Never" : <LocalDateTime iso={inviteCode.expiresAt} />}</TableCell>
            <TableCell>{inviteCode.createdByName}</TableCell>
            <TableCell className="text-right">
              <AdminInviteCodeRevokeButton inviteCode={inviteCode} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
