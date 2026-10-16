import type { ImportQueueMessage } from "#/modules/menu-import/types";

export type HonoVariables = {
  userId: string;
  tenantId: string;
  powers: string[];
};

export type Bindings = {
  ENVIRONMENT: string;
  HYPERDRIVE: Hyperdrive;
  // Same origin as HYPERDRIVE, caching disabled — for reads that must
  // reflect a write from the same request flow (e.g. "am I subscribed
  // right now"). Hyperdrive has no per-query cache invalidation; a
  // cached SELECT can't be told an INSERT/DELETE just changed its rows,
  // so read-after-write consistency requires bypassing the cache
  // entirely rather than a shorter TTL (elise ADR-0018).
  HYPERDRIVE_REALTIME: Hyperdrive;
  OPENAI_API_KEY: string;
  TYPESAFE_API_KEY: string;
  AUTH_SECRET: string;
  AUTH_BASE_URL: string;
  AUTH_TRUSTED_ORIGINS: string;
  AGENT_API_KEY: string;
  PUBLIC_CHAT_MESSAGE_LIMITER: RateLimit;
  PUBLIC_CHAT_NEW_THREAD_LIMITER: RateLimit;
  AUTH_SIGN_IN_LIMITER: RateLimit;
  // Optional: absent in local dev, where sign-up is not limited.
  SIGN_UP_LIMITER?: RateLimit;
  IMPORT_FILES: R2Bucket;
  IMPORT_QUEUE: Queue<ImportQueueMessage>;
};

export type AppEnv = { Bindings: Bindings; Variables: HonoVariables };
