import { z } from "zod";

// -----
// Requests: one Customer thread is named by id
// -----
export const CustomerThreadParamSchema = z.object({
  threadId: z.uuid(),
});

// -----
// Responses: a Customer's conversation as the Tenant
// sees it. The Customer's anonymous id is never sent.
// -----
export const CustomerThreadSummarySchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  startedAt: z.iso.datetime(),
  lastMessageAt: z.iso.datetime(),
  messageCount: z.number().int(),
  unansweredCount: z.number().int(),
});

export const CustomerThreadListSchema = z.array(CustomerThreadSummarySchema);

export const CustomerThreadMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.iso.datetime(),
  missingTopics: z.array(z.string()),
  isDismissed: z.boolean(),
});

export const CustomerThreadDetailSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  startedAt: z.iso.datetime(),
  messages: z.array(CustomerThreadMessageSchema),
});

export type CustomerThreadParam = z.infer<typeof CustomerThreadParamSchema>;
export type CustomerThreadSummary = z.infer<typeof CustomerThreadSummarySchema>;
export type CustomerThreadList = z.infer<typeof CustomerThreadListSchema>;
export type CustomerThreadMessage = z.infer<typeof CustomerThreadMessageSchema>;
export type CustomerThreadDetail = z.infer<typeof CustomerThreadDetailSchema>;
