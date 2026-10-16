import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SIGN_UP_PASSWORD_MIN } from "@repo/contracts/amelie";
import type { TeamInvitePreview } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { AuthHeader, signinEmail } from "#/modules/auth";
import { switchTenant } from "#/modules/tenant";
import { acceptTeamInvite } from "../api";

type TeamJoinMainProps = {
  token: string;
  preview: TeamInvitePreview;
  sessionEmail: string | null;
};

const LABEL_CLASS = "text-[10px] text-muted-foreground font-medium uppercase tracking-wide";

function JoinShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="flex w-fit flex-col items-center justify-center gap-10">{children}</div>
    </main>
  );
}

export function TeamJoinExpired() {
  return (
    <JoinShell>
      <AuthHeader />
      <Card className="w-full max-w-sm border-0 shadow-floating">
        <CardHeader>
          <CardTitle>Invite expired</CardTitle>
          <CardDescription>
            This invite is no longer valid. Ask a tenant admin for a new join link.
          </CardDescription>
        </CardHeader>
      </Card>
    </JoinShell>
  );
}

// -----
// Same shell as sign-up: wordmark, then a
// floating card. Labels match sign-in.
// -----
export function TeamJoinMain({ token, preview, sessionEmail }: TeamJoinMainProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const roleLabel = preview.roleLabel;
  const wrongAccount = Boolean(preview.hasAccount && sessionEmail && sessionEmail !== preview.email);
  const signedInAsInvitee = sessionEmail === preview.email;

  const finish = async (tenantId: string) => {
    await switchTenant({ data: { tenantId } });
    await navigate({ to: "/overview" });
  };

  const submitNew = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const joined = await acceptTeamInvite({
        data: { token, firstName, lastName, password },
      });
      await signinEmail({ data: { email: preview.email, password } });
      await finish(joined.tenantId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to join");
    } finally {
      setPending(false);
    }
  };

  const submitExisting = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!signedInAsInvitee) {
        await signinEmail({ data: { email: preview.email, password } });
      }
      const joined = await acceptTeamInvite({ data: { token } });
      await finish(joined.tenantId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to join");
    } finally {
      setPending(false);
    }
  };

  return (
    <JoinShell>
      <AuthHeader />
      <Card className="w-full max-w-sm border-0 shadow-floating">
        <CardHeader>
          <CardTitle>Join {preview.cafeName}</CardTitle>
          <CardDescription>
            {preview.email} is invited as {roleLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {wrongAccount ? (
            <div className="rounded-md bg-status-danger-soft px-3 py-2 text-sm text-status-danger">
              This invite is for {preview.email}. You are signed in as {sessionEmail}. Sign out, then open this link
              again.
            </div>
          ) : preview.hasAccount ? (
            <form className="flex flex-col gap-5" onSubmit={submitExisting}>
              {signedInAsInvitee ? null : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-join-email" className={LABEL_CLASS}>
                      Email
                    </label>
                    <Input id="team-join-email" type="email" value={preview.email} disabled />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-join-password" className={LABEL_CLASS}>
                      Password
                    </label>
                    <Input
                      id="team-join-password"
                      type="password"
                      required
                      minLength={SIGN_UP_PASSWORD_MIN}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </>
              )}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Joining..." : `Join ${preview.cafeName}`}
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={submitNew}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="team-join-email" className={LABEL_CLASS}>
                  Email
                </label>
                <Input id="team-join-email" type="email" value={preview.email} disabled />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="team-join-first-name" className={LABEL_CLASS}>
                    First name
                  </label>
                  <Input
                    id="team-join-first-name"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="team-join-last-name" className={LABEL_CLASS}>
                    Last name
                  </label>
                  <Input
                    id="team-join-last-name"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="team-join-new-password" className={LABEL_CLASS}>
                  Password
                </label>
                <Input
                  id="team-join-new-password"
                  type="password"
                  required
                  minLength={SIGN_UP_PASSWORD_MIN}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Joining..." : "Create login and join"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </JoinShell>
  );
}
