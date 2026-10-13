// -----
// The IANA zones the browser knows, plus the
// Location's saved one in case the list leaves it
// out (UTC on some engines).
// -----
export const timezoneOptions = (current: string): string[] => {
  const zones = Intl.supportedValuesOf("timeZone");
  return current && !zones.includes(current) ? [current, ...zones] : zones;
};
