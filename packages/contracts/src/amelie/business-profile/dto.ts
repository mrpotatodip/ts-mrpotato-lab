import { z } from "zod";

// -----
// Requests: a profile field left null is cleared;
// the dashboard always sends the whole profile.
// -----
const profileText = (max: number) => z.string().trim().min(1).max(max).nullable();

export const UpdateBusinessProfileBodySchema = z.object({
  description: profileText(500),
  websiteUrl: z.url().nullable(),
  phone: profileText(40),
  email: z.string().trim().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).nullable(),
  address: profileText(200),
});

// -----
// Responses: what customers are told about the cafe
// -----
export const BusinessProfileSchema = z.object({
  description: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
});

export type UpdateBusinessProfileBody = z.infer<typeof UpdateBusinessProfileBodySchema>;
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
