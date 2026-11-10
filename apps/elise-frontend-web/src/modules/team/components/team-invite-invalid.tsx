import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { LinkIcon } from "lucide-react";
import { buttonVariants } from "#/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from "#/components/ui/empty";
import { ShellPublicBrand, ShellPublicThemeSwitch } from "#/modules/shell";
import { TEAM_INVITE_INVALID_COPY } from "../constants";

// -----
// The route's own title says "Join", which is wrong for a link that cannot be
// used, so this page names itself once it is on screen.
// -----
export function TeamInviteInvalid() {
  useEffect(() => {
    document.title = TEAM_INVITE_INVALID_COPY.tabTitle;
  }, []);

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-8 p-6">
      <ShellPublicThemeSwitch />
      <ShellPublicBrand />
      <Empty>
        <EmptyHeader className="gap-1.5">
          <EmptyMedia variant="icon">
            <LinkIcon />
          </EmptyMedia>
          <h1 className="text-xl font-semibold leading-none tracking-tight">{TEAM_INVITE_INVALID_COPY.title}</h1>
          <EmptyDescription>{TEAM_INVITE_INVALID_COPY.description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/signin" className={buttonVariants({ variant: "outline" })}>
            {TEAM_INVITE_INVALID_COPY.action}
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
