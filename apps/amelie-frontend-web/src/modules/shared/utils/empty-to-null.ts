// -----
// A blank box means "no value": it is sent as null.
// -----
export const emptyToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());
