import { Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { dataTableColumns, dataTableFeatures } from "#/lib/data-table";
import { createTeamInvite, revokeTeamInvite } from "../api";
import { groupsQuery, teamKeys, teamQuery } from "../hooks";
import type { CreateInviteInput } from "../schemas";
import { teamRoleLabel } from "../utils";
import { TeamConfirmDialog } from "./team-confirm-dialog";
import { TeamInviteDialog } from "./team-invite-dialog";

const DATE = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

type PersonRow = {
  id: string;
  kind: "member" | "invite";
  name: string;
  email: string;
  roleLabel: string;
  groupNames: string[];
  you: boolean;
  expiresAt: string;
  busy: boolean;
  resend: () => void;
  revoke: () => Promise<void>;
};

const noAction = () => undefined;

const column = dataTableColumns<PersonRow>();

const columns = column.columns([
  column.display({
    id: "name",
    header: "Name",
    cell: ({ row }) => {
      const person = row.original;
      if (person.kind === "member") {
        return (
          <>
            <span className="flex items-center gap-2 font-medium">
              {person.name}
              {person.you && <Badge variant="secondary">You</Badge>}
            </span>
            <span className="block text-xs text-muted-foreground">{person.email}</span>
          </>
        );
      }
      return (
        <>
          <span className="flex items-center gap-2 font-medium">
            {person.email}
            <Badge variant="warning">Invited</Badge>
          </span>
          <span className="block text-xs text-muted-foreground">Link expires {DATE.format(new Date(person.expiresAt))}</span>
        </>
      );
    },
  }),
  column.display({ id: "role", header: "Role", cell: ({ row }) => <Badge variant="outline">{row.original.roleLabel}</Badge> }),
  column.display({
    id: "groups",
    header: "Groups",
    cell: ({ row }) => (
      <span className="flex flex-wrap gap-1.5">
        {row.original.groupNames.map((name) => (
          <Badge key={name} variant="secondary">
            {name}
          </Badge>
        ))}
        {row.original.groupNames.length === 0 && <span className="text-muted-foreground">-</span>}
      </span>
    ),
  }),
  column.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    meta: { head: "w-24", cell: "text-right" },
    cell: ({ row }) => {
      const person = row.original;
      if (person.kind === "member") return null;
      return (
        <>
          <Button variant="ghost" size="sm" aria-label={`Send the invite to ${person.email} again`} disabled={person.busy} onClick={person.resend}>
            Resend
          </Button>
          <TeamConfirmDialog
            triggerLabel="Revoke"
            triggerAriaLabel={`Revoke the invite for ${person.email}`}
            title="Revoke this invite?"
            description={`${person.email} will no longer be able to join with the link you sent. You can invite them again later.`}
            confirmLabel="Revoke invite"
            pending={person.busy}
            onConfirm={person.revoke}
          />
        </>
      );
    },
  }),
]);

export function TeamMembersCard({ email }: { email: string }) {
  const [{ data }, { data: groups }] = useSuspenseQueries({ queries: [teamQuery(), groupsQuery()] });
  const queryClient = useQueryClient();
  const groupNames = (ids: readonly string[]) => ids.flatMap((id) => groups.find((g) => g.id === id)?.name ?? []);

  const revoke = useMutation({
    mutationFn: (inviteId: string) => revokeTeamInvite({ data: { inviteId } }),
    onSuccess: async () => {
      toast.success("Invite revoked.");
      await queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
    onError: (error) => toast.error(`We couldn't revoke the invite. ${error.message}`),
  });

  const resend = useMutation({
    mutationFn: (input: CreateInviteInput) => createTeamInvite({ data: input }),
    onSuccess: async (created) => {
      toast.success(`We emailed a new invite to ${created.invite.email}. The earlier link no longer works.`);
      await queryClient.invalidateQueries({ queryKey: teamKeys.members() });
    },
    onError: (error) => toast.error(`We couldn't send the invite again. ${error.message}`),
  });

  const rows: PersonRow[] = [
    ...data.members.map((member) => ({
      id: `member-${member.partyId}`,
      kind: "member" as const,
      name: member.name,
      email: member.email,
      roleLabel: teamRoleLabel(member.role, member.roleLabel),
      groupNames: groupNames(member.groupIds),
      you: member.email.toLowerCase() === email.toLowerCase(),
      expiresAt: "",
      busy: false,
      resend: noAction,
      revoke: async () => undefined,
    })),
    ...data.invites.map((invite) => ({
      id: `invite-${invite.id}`,
      kind: "invite" as const,
      name: "",
      email: invite.email,
      roleLabel: teamRoleLabel(invite.role, invite.roleLabel),
      groupNames: groupNames(invite.groupIds),
      you: false,
      expiresAt: invite.expiresAt,
      busy: resend.isPending || revoke.isPending,
      resend: () => resend.mutate({ email: invite.email, role: invite.role, groupIds: [...invite.groupIds] }),
      revoke: async () => {
        await revoke.mutateAsync(invite.id);
      },
    })),
  ];
  const table = useTable({ features: dataTableFeatures, columns, data: rows, getRowId: (person) => person.id });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>People</CardTitle>
        <Suspense fallback={<Skeleton className="h-8 w-20" />}>
          <TeamInviteDialog />
        </Suspense>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <DataTable table={table} />
      </CardContent>
    </Card>
  );
}
