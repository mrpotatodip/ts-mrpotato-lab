import { z } from "zod";

export const ImportQueueMessageSchema = z.object({
  tenantId: z.uuid(),
  importId: z.uuid(),
});
