import type { Location } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";

type DashboardLocationNotCoveredProps = {
  location: Location;
  fallback: Location | undefined;
  onUseFallback: (locationId: string) => void;
};

export function DashboardLocationNotCovered({ location, fallback, onUseFallback }: DashboardLocationNotCoveredProps) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Your Role does not cover this Location</EmptyTitle>
        <EmptyDescription>{location.name} is outside the Locations your Role covers.</EmptyDescription>
      </EmptyHeader>
      {fallback ? (
        <EmptyContent>
          <Button variant="outline" onClick={() => onUseFallback(fallback.id)}>
            Go to {fallback.name}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
