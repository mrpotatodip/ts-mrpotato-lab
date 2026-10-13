import { z } from "zod";

// -----
// A Location the model names: an id, slug or
// name. It is matched against the Tenant's
// Locations, so any text is accepted here and
// a miss is answered, never rejected.
// -----
export const ToolLocationRefSchema = z.string().trim().max(120).nullish();

export type ToolLocationRef = z.infer<typeof ToolLocationRefSchema>;

// -----
// A Country the model names: an id, code (CA) or
// name. Matched against the Tenant's open Countries;
// a miss is answered, never rejected.
// -----
export const ToolCountryRefSchema = z.string().trim().max(120).nullish();

export type ToolCountryRef = z.infer<typeof ToolCountryRefSchema>;

// -----
// Where an FAQ applies: "all", a Country (id, code or
// name) or a Location (id, slug or name). Matched
// strictly against the Tenant's own; a miss is
// answered with the choices, never rejected.
// -----
export const ToolFaqScopeRefSchema = z.string().trim().max(120).nullish();

export type ToolFaqScopeRef = z.infer<typeof ToolFaqScopeRefSchema>;
