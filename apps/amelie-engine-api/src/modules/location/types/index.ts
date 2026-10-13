export type LocationOption = { id: string; name: string };

export type ActiveLocation = LocationOption & {
  address: string | null;
  phone: string | null;
  timezone: string;
};

export type LocationRef = LocationOption & { slug: string };

export type LocationChoice =
  | { kind: "chosen"; location: ActiveLocation }
  | { kind: "unknown" }
  | { kind: "needs-location"; options: LocationOption[] };
