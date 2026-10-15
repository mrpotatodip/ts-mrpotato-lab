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
