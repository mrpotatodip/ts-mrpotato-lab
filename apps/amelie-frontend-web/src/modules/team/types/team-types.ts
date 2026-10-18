import type { TeamBinding } from "@repo/contracts/amelie";

export type TeamAccess = { mode: "whole" } | { mode: "bound"; bindings: TeamBinding[] } | null;
