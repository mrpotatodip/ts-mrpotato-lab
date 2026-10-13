import { z } from "zod";
import { PublicChatSlugSchema } from "@repo/contracts/amelie";

export const McpTenantParamSchema = z.object({
  slug: PublicChatSlugSchema,
});

export type McpTenantParam = z.infer<typeof McpTenantParamSchema>;
