import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import type { Country } from "@repo/contracts/amelie";

import { countryName } from "#/modules/shared";

export function DashboardEmptyPlace({ country }: { country: Country }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>No open locations in this country</EmptyTitle>
        <EmptyDescription>
          {countryName(country.country)} has no open locations. You can still price the menu. Hours and contact details wait until you add a location here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
