// PROTOTYPE (throwaway): stub data and helpers for the binding forms.
export type ProtoCountry = { id: string; name: string };
export type ProtoLocation = { id: string; name: string; countryId: string; archived?: boolean };
export type ProtoBinding = { kind: "country"; id: string } | { kind: "location"; id: string };
// null = nothing chosen yet (the forms must force a choice)
export type ProtoAccess = { mode: "whole" } | { mode: "bound"; bindings: ProtoBinding[] } | null;
export type ProtoMember = { id: string; name: string; email: string; role: string; access: ProtoAccess };

export const PROTO_COUNTRIES: ProtoCountry[] = [
  { id: "ca", name: "Canada" },
  { id: "us", name: "United States" },
];
export const PROTO_LOCATIONS: ProtoLocation[] = [
  { id: "ca-dt", name: "Downtown", countryId: "ca" },
  { id: "ca-ap", name: "Airport", countryId: "ca" },
  { id: "ca-up", name: "Uptown", countryId: "ca" },
  { id: "us-se", name: "Seattle", countryId: "us" },
  { id: "us-po", name: "Portland", countryId: "us" },
  { id: "us-old", name: "Tacoma (archived)", countryId: "us", archived: true },
];
export const PROTO_ROLES = [
  { key: "tenant_admin", label: "Tenant admin", bindable: false },
  { key: "store_admin", label: "Store admin", bindable: true },
  { key: "store_staff", label: "Store staff", bindable: true },
];
export const PROTO_MEMBERS: ProtoMember[] = [
  { id: "m1", name: "Ana Reyes", email: "ana@cafe.test", role: "tenant_admin", access: { mode: "whole" } },
  {
    id: "m2",
    name: "Sam Okoye",
    email: "sam@cafe.test",
    role: "store_admin",
    access: { mode: "bound", bindings: [{ kind: "country", id: "ca" }, { kind: "location", id: "us-se" }] },
  },
  {
    id: "m3",
    name: "Priya Nair",
    email: "priya@cafe.test",
    role: "store_staff",
    access: { mode: "bound", bindings: [{ kind: "location", id: "ca-ap" }] },
  },
  {
    id: "m4",
    name: "Lee Tran",
    email: "lee@cafe.test",
    role: "store_staff",
    access: { mode: "bound", bindings: [{ kind: "location", id: "us-old" }] },
  },
  { id: "m5", name: "Jo Marsh", email: "jo@cafe.test", role: "store_admin", access: { mode: "whole" } },
];

export const protoRole = (key: string) => PROTO_ROLES.find((role) => role.key === key);
export const protoCountryName = (id: string) => PROTO_COUNTRIES.find((country) => country.id === id)?.name ?? id;
export const protoLocationName = (id: string) => PROTO_LOCATIONS.find((location) => location.id === id)?.name ?? id;

// Active Locations a member covers (Countries expand, archived ones drop out).
export function coveredLocations(access: ProtoAccess): ProtoLocation[] {
  if (!access || access.mode === "whole") return PROTO_LOCATIONS.filter((location) => !location.archived);
  return PROTO_LOCATIONS.filter(
    (location) =>
      !location.archived &&
      access.bindings.some(
        (binding) =>
          (binding.kind === "location" && binding.id === location.id) ||
          (binding.kind === "country" && binding.id === location.countryId),
      ),
  );
}

export const hasNoActiveLocations = (access: ProtoAccess): boolean =>
  access?.mode === "bound" && coveredLocations(access).length === 0;

export function describeAccess(access: ProtoAccess): string {
  if (!access) return "Not chosen";
  if (access.mode === "whole") return "Whole cafe";
  return access.bindings
    .map((binding) =>
      binding.kind === "country" ? `All of ${protoCountryName(binding.id)}` : protoLocationName(binding.id),
    )
    .join(", ");
}

export const isCountryBound = (access: ProtoAccess, countryId: string): boolean =>
  access?.mode === "bound" && access.bindings.some((b) => b.kind === "country" && b.id === countryId);
export const isLocationBound = (access: ProtoAccess, locationId: string): boolean =>
  access?.mode === "bound" && access.bindings.some((b) => b.kind === "location" && b.id === locationId);

export function toggleBinding(access: ProtoAccess, binding: ProtoBinding): ProtoAccess {
  const current = access?.mode === "bound" ? access.bindings : [];
  const exists = current.some((b) => b.kind === binding.kind && b.id === binding.id);
  const next = exists ? current.filter((b) => !(b.kind === binding.kind && b.id === binding.id)) : [...current, binding];
  return next.length === 0 ? null : { mode: "bound", bindings: next };
}

// Members left with no active Location if this one is archived.
export const affectedByArchive = (members: ProtoMember[], locationId: string): ProtoMember[] =>
  members.filter((member) => {
    if (member.access?.mode !== "bound" || hasNoActiveLocations(member.access)) return false;
    const after: ProtoAccess = {
      mode: "bound",
      bindings: member.access.bindings,
    };
    const remaining = coveredLocations(after).filter((location) => location.id !== locationId);
    return remaining.length === 0;
  });
