import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthHeader, Signup, SignUpSearchSchema } from "#/modules/auth";

export const Route = createFileRoute("/signup/")({
  validateSearch: SignUpSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: "/overview" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { code } = Route.useSearch();

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="flex flex-col gap-10 w-fit justify-center items-center">
        <AuthHeader />
        <Signup inviteCode={code} />
      </div>
    </main>
  );
}
