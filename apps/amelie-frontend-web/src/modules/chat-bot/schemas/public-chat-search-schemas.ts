import { z } from "zod";
import { PublicChatCountrySchema, PublicChatLocationSchema } from "@repo/contracts/amelie";

// -----
// A value the router may have turned into a number
// (digits only). A blank or too long one is ignored
// and the chat starts without it.
// -----
const optionalText = (schema: z.ZodType<string, string>) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .pipe(schema)
    .optional()
    .catch(undefined);

// -----
// `/chat/sorella?location=airport` ties the chat to
// one Location, `?country=CA` (code, name or id) to
// one Country. With both, the engine takes the
// Location's Country and refuses a mismatch.
// -----
export const PublicChatSearchSchema = z.object({
  location: optionalText(PublicChatLocationSchema),
  country: optionalText(PublicChatCountrySchema),
});

export type PublicChatSearch = z.infer<typeof PublicChatSearchSchema>;
