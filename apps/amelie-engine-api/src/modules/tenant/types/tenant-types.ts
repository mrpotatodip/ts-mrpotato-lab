import type { RouterRoute } from "hono/types";

export type PublicTenant = {
  id: string;
  name: string;
  timezone: string;
  allowedOrigins: string[];
  customerChatLabel: string;
  customerChatAccent: string | null;
};

export type PublicTenantListing = { name: string; slug: string };

export type TenantClock = { date: string; time: string };

export type TenantClockReading = { timezone: string; clock: TenantClock };

export type PowerGuardKind = "plain" | "bound";

export type RouteHandler = RouterRoute["handler"];

export type CountryScope = "all" | string[];
