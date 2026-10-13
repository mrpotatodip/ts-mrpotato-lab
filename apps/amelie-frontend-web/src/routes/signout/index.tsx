import { createFileRoute, redirect } from "@tanstack/react-router";

import { signOut, Signout } from "#/modules/auth";
import { AppErrorComponent } from "#/modules/shared";

// -----
// Signing out is the loader's job, not a mount effect.
// The cache is cleared so no cafe data outlives the
// session, then `/` hops a signed-out visitor to marketing.
// -----
export const Route = createFileRoute("/signout/")({
  loader: async ({ context }) => {
    await signOut();
    context.queryClient.clear();
    throw redirect({ to: "/" });
  },
  pendingMs: 0,
  pendingComponent: SignoutPending,
  component: SignoutPending,
  errorComponent: AppErrorComponent,
});

function SignoutPending() {
  return <Signout />;
}
