import type { Country, Location } from "@repo/contracts/amelie";

export type WidgetLocationExample = {
  name: string;
  slug: string;
  country: string;
};

export function toWidgetLocationExamples(locations: Location[], countries: Country[]): WidgetLocationExample[] {
  const codeById = new Map(countries.map((country) => [country.id, country.country]));
  return locations.flatMap((location) => {
    const country = codeById.get(location.countryId);
    if (!country) return [];
    return [{ name: location.name, slug: location.slug, country }];
  });
}
