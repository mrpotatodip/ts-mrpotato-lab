import { useState } from "react";
import type { TeamRole } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useTeamActions } from "../hooks";
import { toTeamJoinUrl } from "../utils";
import { TeamJoinLinkDialog } from "./team-join-link-dialog";
import { TeamRoleSelect } from "./team-role-select";

// -----
// Email and role. The join link is shown once
// in a dialog, like an invite code. The role
// starts on the one with the fewest Powers.
// -----
export function TeamInviteForm({ roles }: { roles: TeamRole[] }) {
  const { invite } = useTeamActions();
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const role = picked ?? roles[0]?.key ?? "";
  const roleLabel = roles.find((candidate) => candidate.key === role)?.label ?? "";
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  return (
    <>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          invite.mutate(
            { data: { email, role } },
            {
              onSuccess: (created) => {
                setJoinUrl(toTeamJoinUrl(window.location.origin, created.token));
                setEmail("");
                setPicked(null);
              },
            },
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="team-invite-email" className="stat-label">
            Email
          </label>
          <Input
            id="team-invite-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Who is this for?"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="team-invite-role" className="stat-label">
            Role
          </label>
          <TeamRoleSelect
            id="team-invite-role"
            aria-label="Role"
            roles={roles}
            value={role}
            valueLabel={roleLabel}
            onChange={setPicked}
          />
        </div>
        {invite.error ? <p className="text-xs text-destructive">{invite.error.message}</p> : null}
        <div className="mt-4">
          <Button type="submit" size="sm" disabled={invite.isPending || role === ""}>
            {invite.isPending ? "Inviting..." : "Invite"}
          </Button>
        </div>
      </form>
      <TeamJoinLinkDialog joinUrl={joinUrl} onDismiss={() => setJoinUrl(null)} />
    </>
  );
}
