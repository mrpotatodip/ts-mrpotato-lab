import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, Link2 } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { GITHUB_ASK_ADMIN, GITHUB_INSTALLATIONS_URL, GITHUB_NOT_CONNECTED } from "../constants";
import { githubInstallationsQuery, useGithubActions } from "../hooks";
import type { GithubInstallation } from "../schemas";
import { GithubDisconnectDialog } from "./github-disconnect-dialog";

const DATE = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const STATUS = {
  active: { label: "Connected", variant: "success" },
  suspended: { label: "Suspended on GitHub", variant: "warning" },
  removed: { label: "Removed", variant: "neutral" },
} as const satisfies Record<GithubInstallation["status"], { label: string; variant: "success" | "warning" | "neutral" }>;

const SELECTION = {
  all: "All repositories",
  selected: "Selected repositories",
} satisfies Record<GithubInstallation["repositorySelection"], string>;

type GithubConnectCardProps = { canConnect: boolean };

function GithubConnectView({ canConnect }: GithubConnectCardProps) {
  const { data: installs } = useSuspenseQuery(githubInstallationsQuery());
  const { connect } = useGithubActions();

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>GitHub</CardTitle>
          <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{installs.length === 0 ? (canConnect ? GITHUB_NOT_CONNECTED : GITHUB_ASK_ADMIN) : "EliseLAB reads the repositories you chose. It can read code and cannot change it."}</p>
        </div>
        {canConnect && (
          <Button size="sm" variant={installs.length === 0 ? "default" : "outline"} disabled={connect.isPending} onClick={() => connect.mutate()}>
            <Link2 className="size-3.5" />
            {connect.isPending ? "Opening GitHub…" : installs.length === 0 ? "Connect GitHub" : "Connect another account"}
          </Button>
        )}
      </CardHeader>
      {installs.length > 0 && (
        <CardContent className="overflow-hidden p-0">
          <ul className="divide-y">
            {installs.map((install) => (
              <li key={install.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3">
                <span className="grid gap-0.5">
                  <span className="font-medium">{install.accountLogin}</span>
                  <span className="text-xs text-muted-foreground">
                    {SELECTION[install.repositorySelection]} · connected {DATE.format(new Date(install.connectedAt))}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Badge variant={STATUS[install.status].variant}>{STATUS[install.status].label}</Badge>
                  {install.status !== "removed" && (
                    <a
                      href={install.manageUrl ?? GITHUB_INSTALLATIONS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-6 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                      Manage on GitHub
                    </a>
                  )}
                  {canConnect && install.status !== "removed" && <GithubDisconnectDialog install={install} />}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

export function GithubConnectCard({ canConnect }: GithubConnectCardProps) {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full" />}>
      <GithubConnectView canConnect={canConnect} />
    </Suspense>
  );
}
