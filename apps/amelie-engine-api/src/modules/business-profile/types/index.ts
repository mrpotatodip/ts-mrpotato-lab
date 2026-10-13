export type BusinessProfile = {
  description: string | null;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type BusinessProfileChange = Partial<BusinessProfile>;

export type TenantProfile = Omit<BusinessProfile, "address" | "phone">;

export type TenantProfileChange = Partial<TenantProfile>;
