// -----
// One day's hours as a line: "Closed" or "08:00 to 17:00".
// -----
export const describeHours = (hours: { isClosed: boolean; opensAt: string | null; closesAt: string | null }): string =>
  hours.isClosed ? "Closed" : `${hours.opensAt} to ${hours.closesAt}`;
