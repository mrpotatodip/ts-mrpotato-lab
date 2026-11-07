import { z } from "zod";

export const AccountHeaderSchema = z.object({
  "x-account-id": z.uuid().meta({
    description: "The ID of the account (a tenant) that owns the scan. The dashboard server sets it from the signed-in session.",
    example: "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4",
  }),
});

export type AccountHeader = z.infer<typeof AccountHeaderSchema>;
