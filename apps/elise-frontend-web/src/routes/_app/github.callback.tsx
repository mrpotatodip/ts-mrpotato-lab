import { createFileRoute, redirect } from "@tanstack/react-router";
import { GithubCallback, GithubCallbackSearchSchema } from "#/modules/github";
import { ShellPageHeader } from "#/modules/shell";
import { TENANT_ADMIN_ROLE_KEY } from "#/modules/team";

export const Route = createFileRoute("/_app/github/callback")({
  head: () => ({ meta: [{ title: "Connect GitHub · Elise" }] }),
  validateSearch: GithubCallbackSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.user?.role !== TENANT_ADMIN_ROLE_KEY) throw redirect({ to: "/connections" });
  },
  component: GithubCallbackPage,
});

function GithubCallbackPage() {
  const search = Route.useSearch();
  return (
    <>
      <ShellPageHeader title="Connect GitHub" description="Let Elise read the repositories you chose on GitHub, so it can scan the private ones." />
      <GithubCallback search={search} />
    </>
  );
}
