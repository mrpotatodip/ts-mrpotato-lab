import { TriangleAlert } from "lucide-react";
import type { Country, Location, TeamMember } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { describeBindings, hasNoActiveLocations } from "../utils";

// -----
// Where a member reaches, as one text badge: Whole cafe
// or the names. A Role that is never limited says so.
// A member whose Bindings are all archived is warned,
// because every limited action is refused for them.
// -----
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
