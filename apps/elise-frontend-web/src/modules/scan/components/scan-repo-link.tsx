import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";
import { useScanLinkMode } from "../hooks";
import { scanRepoName } from "../utils";

type ScanRepoLinkProps = {
  scanId: string;
  repo: string | null | undefined;
  stretch?: boolean;
};

const LINK_CLASS =
  "group/link inline-flex min-w-0 items-baseline gap-0.5 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STRETCH = "after:absolute after:inset-0";

export function ScanRepoLink({ scanId, repo, stretch = false }: ScanRepoLinkProps) {
  const mode = useScanLinkMode();
  const { owner, name } = scanRepoName(repo, scanId);
  const label = (
    <>
      {owner && <span className={cn("truncate text-muted-foreground group-hover/link:text-foreground")}>{owner}/</span>}
      <span className="truncate">{name}</span>
    </>
  );

  if (mode === "demo") {
    return (
      <Link to="/prototype/scans/$scanId" params={{ scanId }} className={cn(LINK_CLASS, stretch && STRETCH)}>
        {label}
      </Link>
    );
  }
  return (
    <Link to="/scans/$scanId" params={{ scanId }} className={cn(LINK_CLASS, stretch && STRETCH)}>
      {label}
    </Link>
  );
}
