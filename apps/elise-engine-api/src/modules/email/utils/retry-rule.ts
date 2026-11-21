import { z } from "zod";
import type { RetryRule } from "#/modules/email/types";

const BACKOFF_CODES = new Set(["E_RATE_LIMIT_EXCEEDED", "E_DELIVERY_FAILED", "E_INTERNAL_SERVER_ERROR"]);

const SendErrorSchema = z.object({ code: z.string() });

export const sendErrorCode = (error: Error): string => {
  const parsed = SendErrorSchema.safeParse(error);
  return parsed.success ? parsed.data.code : "unknown";
};

export const retryRuleOf = (code: string): RetryRule => {
  if (code === "E_DAILY_LIMIT_EXCEEDED") return "long-wait";
  return BACKOFF_CODES.has(code) ? "backoff" : "drop";
};
