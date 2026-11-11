import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { GITHUB_NOTICE } from "../constants";
import { useGithubActions } from "../hooks";
import type { GithubCallbackSearch } from "../schemas";

type GithubCallbackProps = { search: GithubCallbackSearch };

// -----
// Where GitHub sends the browser after the install. Nothing is saved
// until the person ticks the notice and presses the button: the code in
// the address is good once, for a few minutes.
// -----
export function GithubCallback({ search }: GithubCallbackProps) {
  const [accepted, setAccepted] = useState(false);
  const { finish } = useGithubActions();
  const { code, installation_id: installationId, state } = search;

  if (code === undefined || installationId === undefined || state === undefined) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          This page is where GitHub sends you after you install EliseLAB. It did not get what it needs. Start again from{" "}
          <Link to="/connections" className="font-medium underline underline-offset-2">
            Connections
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Finish connecting GitHub</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">GitHub installed EliseLAB. One step is left before EliseLAB can read your private repositories.</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="flex cursor-pointer gap-3 rounded-xl border border-input bg-background/40 p-3.5 text-sm leading-relaxed has-[[data-checked]]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <Checkbox checked={accepted} onCheckedChange={setAccepted} />
          <span>{GITHUB_NOTICE}</span>
        </label>
        {finish.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {finish.error.message}{" "}
              <Link to="/connections" className="font-medium underline underline-offset-2">
                Start again
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-3">
        <Link to="/connections" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button disabled={!accepted || finish.isPending} onClick={() => finish.mutate({ installationId, code, state, noticeAccepted: true })}>
          {finish.isPending ? "Connecting…" : "Finish connecting"}
        </Button>
      </CardFooter>
    </Card>
  );
}
