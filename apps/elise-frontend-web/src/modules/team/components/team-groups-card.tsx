import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { Pencil, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { addGroupMember, createGroup, deleteGroup, removeGroupMember, renameGroup } from "../api";
import { groupsQuery, teamKeys, teamQuery } from "../hooks";
import { TeamConfirmDialog } from "./team-confirm-dialog";
import { CreateGroupInputSchema, type Group, type TeamMember } from "../schemas";

const failure = (what: string) => (error: Error) => toast.error(`We couldn't ${what}. ${error.message}`);

function GroupRow({ group, members }: { group: Group; members: readonly TeamMember[] }) {
  const queryClient = useQueryClient();
  const refresh = () => Promise.all([teamKeys.groups(), teamKeys.members()].map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const add = useMutation({
    mutationFn: (partyId: string) => addGroupMember({ data: { groupId: group.id, partyId } }),
    onSuccess: refresh,
    onError: failure("add that person"),
  });
  const remove = useMutation({
    mutationFn: (partyId: string) => removeGroupMember({ data: { groupId: group.id, partyId } }),
    onSuccess: refresh,
    onError: failure("remove that person"),
  });
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const rename = useMutation({
    mutationFn: (name: string) => renameGroup({ data: { groupId: group.id, name } }),
    onSuccess: async () => {
      setRenaming(false);
      await refresh();
    },
    onError: failure("rename the group"),
  });
  const submitRename = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = CreateGroupInputSchema.safeParse({ name: draft });
    if (parsed.success) rename.mutate(parsed.data.name);
  };
  const drop = useMutation({
    mutationFn: () => deleteGroup({ data: { groupId: group.id } }),
    onSuccess: refresh,
    onError: failure("delete the group"),
  });

  const inGroup = members.filter((m) => group.memberIds.includes(m.partyId));
  const candidates = members.filter((m) => !group.memberIds.includes(m.partyId));

  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <form onSubmit={submitRename} className="flex items-center gap-2">
            <Label htmlFor={`rename-${group.id}`} className="sr-only">
              New name for {group.name}
            </Label>
            <Input id={`rename-${group.id}`} name="group-rename" autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} className="h-8 w-56" />
            <Button type="submit" size="sm" disabled={rename.isPending || draft.trim() === ""}>
              {rename.isPending ? "Saving" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRenaming(false);
                setDraft(group.name);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <span className="flex items-baseline gap-2">
            <span className="font-medium">{group.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{inGroup.length} {inGroup.length === 1 ? "person" : "people"}</span>
            <button
              type="button"
              aria-label={`Rename the group ${group.name}`}
              onClick={() => setRenaming(true)}
              className="grid size-6 place-items-center self-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        )}
        <TeamConfirmDialog
          triggerLabel="Delete"
          triggerAriaLabel={`Delete the group ${group.name}`}
          title={`Delete ${group.name}?`}
          description="The people in it stay on the team. They only lose this group."
          confirmLabel="Delete group"
          pending={drop.isPending}
          onConfirm={async () => {
            await drop.mutateAsync();
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {inGroup.map((m) => (
          <Badge key={m.partyId} variant="secondary" className="gap-1">
            {m.name}
            <button
              type="button"
              aria-label={`Remove ${m.name} from ${group.name}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(m.partyId)}
              className="-mr-1.5 grid size-6 place-items-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {inGroup.length === 0 && <span className="text-xs text-muted-foreground">No one yet.</span>}
        {candidates.length > 0 && (
          <Select value="" disabled={add.isPending} items={candidates.map((m) => ({ value: m.partyId, label: m.name }))} onValueChange={(next) => next && add.mutate(next)}>
            <SelectTrigger aria-label={`Add a person to ${group.name}`} className="h-7 w-36 text-xs">
              <SelectValue placeholder={add.isPending ? "Adding" : "Add a person"} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((m) => (
                <SelectItem key={m.partyId} value={m.partyId}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </li>
  );
}

export function TeamGroupsCard() {
  const [{ data: groups }, { data: team }] = useSuspenseQueries({ queries: [groupsQuery(), teamQuery()] });
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: { name: string }) => createGroup({ data: input }),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: teamKeys.groups() });
    },
    onError: (error) => toast.error(`We couldn't create the group. ${error.message}`),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = CreateGroupInputSchema.safeParse({ name });
    if (!parsed.success) {
      setNameError("Give the group a name before you create it.");
      return;
    }
    create.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form onSubmit={submit} className="grid gap-2">
          <Label htmlFor="group-name">What should the new group be called?</Label>
          <div className="flex gap-2">
            <Input
              id="group-name"
              name="group-name"
              autoComplete="off"
              placeholder="Security reviewers"
              value={name}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "group-name-error" : undefined}
              onChange={(event) => {
                setNameError(null);
                setName(event.target.value);
              }}
              className="h-9"
            />
            <Button type="submit" variant="outline" size="sm" disabled={create.isPending}>
              {create.isPending ? "Creating" : "Create group"}
            </Button>
          </div>
          {nameError && (
            <p id="group-name-error" role="alert" className="text-xs text-status-danger">
              {nameError}
            </p>
          )}
        </form>
        {groups.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No groups yet</EmptyTitle>
              <EmptyDescription>Name a group above, then add people to it.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y">
            {groups.map((group) => (
              <GroupRow key={group.id} group={group} members={team.members} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
