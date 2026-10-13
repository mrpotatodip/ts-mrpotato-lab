// -----
// A save's input without the Location, which
// useTenantHoursActions adds itself.
// -----
export type ForLocation<T> = { data: Omit<T, "locationId"> };
