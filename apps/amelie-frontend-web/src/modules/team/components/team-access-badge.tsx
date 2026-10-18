import { TriangleAlert } from "lucide-react";
import type { Country, Location, TeamMember } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { describeBindings, hasNoActiveLocations } from "../utils";

export function TeamAccessBadge({
  member,
  countries,
  locations,
}: {
  member: TeamMember;
  countries: Country[];
  locations: Location[];
}) {
  if (!member.canBeBound) {
    return <span className="stat-label">Whole cafe (this Role is never limited)</span>;
  }
  const whole = member.bindings.length === 0;
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={whole ? "outline" : "secondary"} className="w-fit font-normal">
        {describeBindings(member.bindings, countries, locations)}
      </Badge>
      {hasNoActiveLocations(member.bindings, countries, locations) ? (
        <span className="text-status-warning flex items-center gap-1 text-xs">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          No active Locations: every limited action is refused until you reassign.
        </span>
      ) : null}
    </div>
  );
}
