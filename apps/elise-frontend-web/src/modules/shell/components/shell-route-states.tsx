import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button, buttonVariants } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";

// -----
// Router-wide defaults. A route that loads data shows its shape the moment a
// navigation takes longer than the router's pending delay, instead of freezing
// on the old page.
// -----
export function ShellRoutePending() {
  return (
    <output className="grid gap-6" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-56 w-full" />
    </output>
  );
}

export function ShellRouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <Alert variant="destructive" className="mx-auto mt-8 max-w-xl">
      <TriangleAlert />
      <div className="grid gap-3">
        <AlertDescription className="font-medium">This page could not load.</AlertDescription>
        <AlertDescription>{error instanceof Error ? error.message : "Something went wrong."}</AlertDescription>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => void router.invalidate()}>
          Try again
        </Button>
      </div>
    </Alert>
  );
}

export function ShellRouteNotFound() {
  return (
    <div className="mx-auto mt-16 grid max-w-sm gap-3 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">That address does not match anything in Elise.</p>
      <Link to="/overview" className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-center" })}>
        Back to overview
      </Link>
    </div>
  );
}
