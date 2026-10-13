import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "#/components/ui/card";

import { AuthHeader } from "./auth-header";

// -----
// Shown while the route's loader signs out. The
// loader ends in a redirect, so this is never
// more than a pending screen.
// -----
export function Signout() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="flex flex-col gap-10 w-fit justify-center items-center">
        <AuthHeader />
        <Card className="w-full max-w-sm border-0 shadow-floating">
          <CardHeader>
            <CardTitle>Signing out</CardTitle>
            <CardDescription>Hang tight, we&apos;re signing you out.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
