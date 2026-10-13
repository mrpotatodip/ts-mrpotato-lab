import { z } from "zod";

const field = (max: number) => z.string().trim().min(1).max(max).nullable();

export const UpdateBusinessProfileInputSchema = z
  .strictObject({
    description: field(500),
    websiteUrl: z.url().nullable(),
    phone: field(40),
    // -----
    // Not z.email(): its pattern uses lookaheads,
    // which OpenAI's strict tool schemas reject.
    // -----
    email: z.string().trim().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).nullable(),
    address: field(200),
  })
  .refine((input) => Object.values(input).some((value) => value !== null), {
    message: "pass at least one field to change",
  });

export type UpdateBusinessProfileInput = z.infer<typeof UpdateBusinessProfileInputSchema>;
