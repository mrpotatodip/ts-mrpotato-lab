import { Link } from "@tanstack/react-router";

import type { DashboardRoute } from "../types";

type DashboardViewAllLinkProps = {
  to: DashboardRoute;
};

export function DashboardViewAllLink({ to }: DashboardViewAllLinkProps) {
  return (
    <Link to={to} className="text-muted-foreground hover:text-foreground shrink-0 text-sm whitespace-nowrap">
      View all
    </Link>
  );
}
