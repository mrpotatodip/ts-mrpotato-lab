import type { Bindings } from "#/types/variables";
import type { PublicChatLimiters } from "#/modules/chat-bot/types";

// -----
// Amelie's own pages (the same list auth
// trusts) may always host a Tenant's chat.
// -----
export const publicChatOwnOrigins = (env: Bindings): string[] =>
  env.AUTH_TRUSTED_ORIGINS.split(",").filter((origin) => origin.trim() !== "");

export const publicChatLimiters = (env: Bindings): PublicChatLimiters => ({
  message: (key) => env.PUBLIC_CHAT_MESSAGE_LIMITER.limit({ key }).then((outcome) => outcome.success),
  newThread: (key) => env.PUBLIC_CHAT_NEW_THREAD_LIMITER.limit({ key }).then((outcome) => outcome.success),
});

// -----
// Cloudflare sets the caller's IP; local
// dev has none, so all share one key.
// -----
export const publicChatClientIp = (connectingIp: string | undefined): string =>
  connectingIp ?? "local";
