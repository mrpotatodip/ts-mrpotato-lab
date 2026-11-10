import { createFileRoute, redirect } from "@tanstack/react-router";
import { GithubCallback, GithubCallbackSearchSchema } from "#/modules/github";
import { ShellPageHeader } from "#/modules/shell";
import { hasAccessPower } from "@repo/contracts/elise";

export const Route = createFileRoute("/_app/github/callback")({
  head: () => ({ meta: [{ title: "Connect GitHub · EliseLAB" }] }),
  validateSearch: GithubCallbackSearchSchema,
  beforeLoad: ({ context }) => {
    if (!hasAccessPower(context.user?.powers ?? [], "company:github:installations:create")) throw redirect({ to: "/connections" });
  },
  component: GithubCallbackPage,
});

function GithubCallbackPage() {
  const search = Route.useSearch();
  return (
    <>
      <ShellPageHeader title="Connect GitHub" description="Let EliseLAB read the repositories you chose on GitHub, so it can scan the private ones." />
      <GithubCallback search={search} />
    </>
  );
}
