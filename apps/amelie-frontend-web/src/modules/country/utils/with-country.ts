// -----
// Adds ?countryId= to an engine path. Left out,
// the engine uses the cafe's only Country.
// -----
export function withCountry(path: string, countryId: string | undefined): string {
  if (!countryId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}countryId=${encodeURIComponent(countryId)}`;
}
