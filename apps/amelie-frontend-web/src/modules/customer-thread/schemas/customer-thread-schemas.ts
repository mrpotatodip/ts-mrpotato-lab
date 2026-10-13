import { z } from "zod";
import { CustomerThreadDetailSchema, CustomerThreadListSchema } from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const CustomerThreadListResponseSchema = apiResponseSchema(CustomerThreadListSchema);
export const CustomerThreadDetailResponseSchema = apiResponseSchema(CustomerThreadDetailSchema);

export const FetchCustomerThreadInputSchema = z.object({ threadId: z.uuid() });
