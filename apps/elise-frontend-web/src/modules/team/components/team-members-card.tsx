import { Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { createTeamInvite, revokeTeamInvite } from "../api";
import { groupsQuery, teamKeys, teamQuery } from "../hooks";
import type { CreateInviteInput } from "../schemas";
import { TeamConfirmDialog } from "./team-confirm-dialog";
import { TeamInviteDialog } from "./team-invite-dialog";

const DATE = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>People</CardTitle>
        <Suspense fallback={<Skeleton className="h-8 w-20" />}>
          <TeamInviteDialog />
        </Suspense>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((member) => (
              <TableRow key={member.partyId}>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    {member.name}
                    {member.email.toLowerCase() === email.toLowerCase() && <Badge variant="secondary">You</Badge>}
                  </span>
                  <span className="block text-xs text-muted-foreground">{member.email}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{member.roleLabel}</Badge>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1.5">
                    {groupNames(member.groupIds).map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                    {member.groupIds.length === 0 && <span className="text-muted-foreground">-</span>}
                  </span>
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
            {data.invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    {invite.email}
                    <Badge variant="warning">Invited</Badge>
                  </span>
                  <span className="block text-xs text-muted-foreground">Link expires {DATE.format(new Date(invite.expiresAt))}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{invite.roleLabel}</Badge>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1.5">
                    {groupNames(invite.groupIds).map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                    {invite.groupIds.length === 0 && <span className="text-muted-foreground">-</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Send the invite to ${invite.email} again`}
                    disabled={resend.isPending}
                    onClick={() => resend.mutate({ email: invite.email, role: invite.role, groupIds: [...invite.groupIds] })}
                  >
                    Resend
                  </Button>
                  <TeamConfirmDialog
                    triggerLabel="Revoke"
                    triggerAriaLabel={`Revoke the invite for ${invite.email}`}
                    title="Revoke this invite?"
                    description={`${invite.email} will no longer be able to join with the link you sent. You can invite them again later.`}
                    confirmLabel="Revoke invite"
                    pending={revoke.isPending}
                    onConfirm={async () => {
                      await revoke.mutateAsync(invite.id);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
