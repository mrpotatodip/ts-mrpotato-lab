// -----
// The month's scans, against the plan's allowance when it has one.
// -----
export const creditScansLabel = (scans: number, allowance: number | null) => (allowance === null ? String(scans) : `${scans} of ${allowance}`);
