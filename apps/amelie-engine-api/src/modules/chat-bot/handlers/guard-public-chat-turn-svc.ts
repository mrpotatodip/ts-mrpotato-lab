import { Effect } from "effect";
import { ExternalError, Forbidden, RateLimited, type DbError } from "#/lib/effect-query";
import { getBusinessProfileSvc, getTenantProfileSvc } from "#/modules/business-profile";
import type { PublicTenant } from "#/modules/tenant";
import {
  CHAT_BOT_PUBLIC_ORIGIN_NOT_ALLOWED,
  CHAT_BOT_PUBLIC_RATE_LIMITED,
  CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE,
  CHAT_BOT_PUBLIC_TENANT_DAILY_LIMIT,
  CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT,
  CHAT_BOT_PUBLIC_THREAD_LIMIT,
  CHAT_BOT_PUBLIC_THREAD_LIMIT_MESSAGE,
  CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT,
} from "#/modules/chat-bot/constants";
import { isPublicChatOriginAllowed, publicChatDailyLimitMessage } from "#/modules/chat-bot/lib";
import {
  countCustomerMessagesInThreadEffect,
  countTenantCustomerMessagesTodayEffect,
} from "#/modules/chat-bot/queries";
import type { PublicChatLimiter, PublicChatTurnGuard } from "#/modules/chat-bot/types";

// -----
// The Tenant's own websites, plus Amelie's
// own pages; anything else is a 403.
// -----
export const checkPublicChatOriginEffect = (
  tenant: PublicTenant,
  origin: string | undefined,
  ownOrigins: ReadonlyArray<string>,
): Effect.Effect<void, Forbidden> =>
  isPublicChatOriginAllowed(origin, [...tenant.allowedOrigins, ...ownOrigins])
    ? Effect.void
    : Effect.fail(new Forbidden({ message: CHAT_BOT_PUBLIC_ORIGIN_NOT_ALLOWED }));

// -----
// A limiter outage lets the message through;
// the key is never logged (it's a Customer id).
// -----
const underLimitEffect = (limiter: PublicChatLimiter, key: string): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: () => limiter(key),
    catch: (cause) => new ExternalError({ cause }),
  }).pipe(
    Effect.catchTag("ExternalError", (failure) =>
      Effect.sync(() => {
        console.warn("public-chat: rate limiter failed, allowing", failure.cause);
        return true;
      }),
    ),
  );

const rateLimited = () =>
  new RateLimited({ code: CHAT_BOT_PUBLIC_RATE_LIMITED, message: CHAT_BOT_PUBLIC_RATE_LIMITED_MESSAGE });

// -----
// Cheapest first: per-minute limits, then the
// thread cap, then the Tenant's day.
// -----
export const guardPublicChatTurnSvc = (
  guard: PublicChatTurnGuard,
): Effect.Effect<void, RateLimited | DbError> =>
  Effect.gen(function* () {
    const { db, tenant, owner, threadId, ip, limiters } = guard;

    if (!(yield* underLimitEffect(limiters.message, owner.anonymousId))) {
      return yield* rateLimited();
    }
    if (!threadId && !(yield* underLimitEffect(limiters.newThread, ip))) {
      return yield* rateLimited();
    }

    if (threadId) {
      const inThread = yield* countCustomerMessagesInThreadEffect(db, owner, threadId);
      if (inThread >= CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT) {
        return yield* new RateLimited({
          code: CHAT_BOT_PUBLIC_THREAD_LIMIT,
          message: CHAT_BOT_PUBLIC_THREAD_LIMIT_MESSAGE,
        });
      }
    }

    const today = yield* countTenantCustomerMessagesTodayEffect(db, tenant.id, tenant.timezone);
    if (today >= CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT) {
      const tenantWide = getTenantProfileSvc(db, tenant.id).pipe(
        Effect.map((facts) => ({ ...facts, phone: null })),
      );
      const profile = yield* getBusinessProfileSvc(db, tenant.id).pipe(
        Effect.catchTags({ NeedsLocation: () => tenantWide, NotFound: () => tenantWide }),
      );
      return yield* new RateLimited({
        code: CHAT_BOT_PUBLIC_TENANT_DAILY_LIMIT,
        message: publicChatDailyLimitMessage(tenant.name, profile),
      });
    }
  });
