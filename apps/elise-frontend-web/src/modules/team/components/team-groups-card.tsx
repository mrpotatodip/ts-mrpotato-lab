import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { Pencil, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { addGroupMember, createGroup, deleteGroup, removeGroupMember, renameGroup } from "../api";
import { groupsQuery, teamKeys, teamQuery } from "../hooks";
import { TeamConfirmDialog } from "./team-confirm-dialog";
import { GroupNameDetailsSchema, type Group, type TeamMember } from "../schemas";

const failure = (what: string) => (error: Error) => toast.error(`We couldn't ${what}. ${error.message}`);

type GroupRenameFormProps = {
  group: Group;
  pending: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
};

function GroupRenameForm({ group, pending, onSave, onCancel }: GroupRenameFormProps) {
  const inputId = `rename-${group.id}`;
  const form = useForm({
    defaultValues: { name: group.name },
    validators: { onSubmit: GroupNameDetailsSchema },
    onSubmit: ({ value }) => onSave(value.name.trim()),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-1"
    >
      <form.Field name="name">
        {(field) => (
          <>
            <div className="flex items-center gap-2">
              <Label htmlFor={inputId} className="sr-only">
                New name for {group.name}
              </Label>
              <Input id={inputId} name={field.name} autoComplete="off" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} className="h-8 w-56" {...fieldAria(field, inputId)} />
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving" : "Save"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <FieldError id={inputId} message={fieldMessage(field)} />
          </>
        )}
      </form.Field>
    </form>
  );
}

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
  const rename = useMutation({
    mutationFn: (name: string) => renameGroup({ data: { groupId: group.id, name } }),
    onSuccess: async () => {
      setRenaming(false);
      await refresh();
    },
    onError: failure("rename the group"),
  });
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
          <GroupRenameForm group={group} pending={rename.isPending} onSave={(name) => rename.mutate(name)} onCancel={() => setRenaming(false)} />
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
            <SelectTrigger aria-label={`Add a person to ${group.name}`} className="w-36">
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

function GroupCreateForm() {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (input: { name: string }) => createGroup({ data: input }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: teamKeys.groups() });
    },
    onError: (error) => toast.error(`We couldn't create the group. ${error.message}`),
  });
  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: GroupNameDetailsSchema },
    onSubmit: ({ value }) => create.mutate({ name: value.name.trim() }),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-2"
    >
      <form.Field name="name">
        {(field) => (
          <>
            <Label htmlFor="group-name">What should the new group be called?</Label>
            <div className="flex gap-2">
              <Input id="group-name" name={field.name} autoComplete="off" placeholder="Security reviewers" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} className="h-9" {...fieldAria(field, "group-name")} />
              <Button type="submit" variant="outline" size="sm" disabled={create.isPending}>
                {create.isPending ? "Creating" : "Create group"}
              </Button>
            </div>
            <FieldError id="group-name" message={fieldMessage(field)} />
          </>
        )}
      </form.Field>
    </form>
  );
}

export function TeamGroupsCard() {
  const [{ data: groups }, { data: team }] = useSuspenseQueries({ queries: [groupsQuery(), teamQuery()] });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <GroupCreateForm />
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
