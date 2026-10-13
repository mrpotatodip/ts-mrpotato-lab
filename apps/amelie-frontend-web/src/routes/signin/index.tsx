import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { AuthHeader, AuthFirstRun, Signin } from "#/modules/auth";

const SigninSearchSchema = z.object({
  verify: z.enum(["sent", "confirmed"]).optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/signin/")({
  validateSearch: SigninSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: "/overview" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { verify, error } = Route.useSearch();

  // -----
  // Both screens render; the `.first-run` CSS in globals.css decides
  // which is visible, so nothing depends on hydration. This only
  // moves once the user taps through the interstitial.
  // -----
  const [firstRun, setFirstRun] = useState<"pending" | "dismissed">("pending");

  return (
    <main
      data-first-run={firstRun}
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12"
    >
      <div className="first-run w-fit flex-col items-center justify-center">
        <AuthFirstRun onContinue={() => setFirstRun("dismissed")} />
      </div>

      <div className="first-run-signin flex w-fit flex-col items-center justify-center gap-10">
        <AuthHeader />
        <Signin
          verificationSent={verify === "sent"}
          verificationConfirmed={verify === "confirmed" && !error}
          verificationError={error}
        />
      </div>
    </main>
  );
}
