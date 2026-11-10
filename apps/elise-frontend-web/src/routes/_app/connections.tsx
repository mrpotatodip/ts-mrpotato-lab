import { createFileRoute } from "@tanstack/react-router";
import { GithubConnectCard, GithubReadableRepos, githubInstallationsQuery } from "#/modules/github";
import { ShellPageHeader } from "#/modules/shell";
import { hasAccessPower } from "@repo/contracts/elise";

export const Route = createFileRoute("/_app/connections")({
  head: () => ({ meta: [{ title: "Connections · EliseLAB" }] }),
  loader: ({ context }) => context.queryClient.query({ ...githubInstallationsQuery(), staleTime: "static" }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { user } = Route.useRouteContext();
  return (
    <>
      <ShellPageHeader title="Connections" description="Where EliseLAB reads your code from. Connect GitHub to scan your private repositories; public ones need no connection." />
      <GithubConnectCard canConnect={hasAccessPower(user?.powers ?? [], "company:github:installations:create")} />
      <GithubReadableRepos />
    </>
  );
}
