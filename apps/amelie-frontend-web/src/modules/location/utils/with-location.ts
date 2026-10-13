// -----
// Adds ?locationId= to an engine path. Left out,
// the engine uses the cafe's only Location.
// -----
export function withLocation(path: string, locationId: string | undefined): string {
  if (!locationId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}locationId=${encodeURIComponent(locationId)}`;
}
