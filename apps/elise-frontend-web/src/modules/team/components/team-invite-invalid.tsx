import { Link } from "@tanstack/react-router";
import { LinkIcon } from "lucide-react";
import { buttonVariants } from "#/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { ShellBrand } from "#/modules/shell";

export function TeamInviteInvalid() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-8 p-6">
      <div className="justify-self-center text-center">
        <ShellBrand />
      </div>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LinkIcon />
          </EmptyMedia>
          <EmptyTitle>This invite can't be used</EmptyTitle>
          <EmptyDescription>It may have expired, been revoked, or already been accepted. Ask the person who invited you for a new link.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/signin" className={buttonVariants({ variant: "outline" })}>
            Go to sign in
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
