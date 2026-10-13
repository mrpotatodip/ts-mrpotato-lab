import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, type DbError, type NotFound, type Forbidden, type RateLimited } from "#/lib/effect-query";
import { readCountryIdEffect, resolveCountryRefSvc } from "#/modules/country";
import { resolveLocationRefSvc } from "#/modules/location";
import { CHAT_BOT_COUNTRY_LOCATION_MISMATCH } from "#/modules/chat-bot/constants";
import { findPublicTenantSvc, type PublicTenant } from "#/modules/tenant";
import { chatBotCustomerAgent } from "#/modules/chat-bot/agents";
import { lookupChatBotRunEffect } from "#/modules/chat-bot/queries";
import type { ChatBotCustomerTurn, PublicChatTurnRequest } from "#/modules/chat-bot/types";
import { checkPublicChatOriginEffect, guardPublicChatTurnSvc } from "./guard-public-chat-turn-svc";

// -----
// Slug to Tenant on the server, then the
// calling website must be one it allows.
// -----
export const findPublicChatTenantSvc = (
  db: DbConnectType,
  slug: string,
  origin: string | undefined,
  ownOrigins: ReadonlyArray<string>,
): Effect.Effect<PublicTenant, DbError | NotFound | Forbidden> =>
  findPublicTenantSvc(db, slug).pipe(
    Effect.tap((tenant) => checkPublicChatOriginEffect(tenant, origin, ownOrigins)),
  );

// -----
// The specialists look the Tenant's
// facts up per turn.
// -----
export const prepareCustomerTurn = (
  tenant: PublicTenant,
  anonymousId: string,
  locationId: string | null,
  countryId: string | null,
): ChatBotCustomerTurn => ({
  owner: { kind: "anonymous", tenantId: tenant.id, anonymousId },
  agent: chatBotCustomerAgent,
  locationId,
  countryId,
});

// -----
// Tenant by slug and origin, then the limits.
// Rejoining a running reply is never limited.
// The embed's location and country count only
// when they start a Thread, and must be the
// Tenant's own. With both, the Location's
// Country wins and a country that is not it is
// refused.
// -----
export const startPublicChatTurnSvc = (
  request: PublicChatTurnRequest,
): Effect.Effect<ChatBotCustomerTurn, DbError | NotFound | Invalid | Forbidden | RateLimited> =>
  Effect.gen(function* () {
    const { db, runId, anonymousId } = request;
    const tenant = yield* findPublicChatTenantSvc(db, request.slug, request.origin, request.ownOrigins);
    const startsThread = request.threadId === undefined;
    const location =
      startsThread && request.location !== undefined
        ? yield* resolveLocationRefSvc(db, tenant.id, request.location)
        : null;
    const country =
      startsThread && request.country !== undefined
        ? yield* resolveCountryRefSvc(db, tenant.id, request.country)
        : null;
    if (location && country) {
      const locationCountryId = yield* readCountryIdEffect(db, tenant.id, location.id);
      if (locationCountryId !== country.id) {
        return yield* new Invalid({ message: CHAT_BOT_COUNTRY_LOCATION_MISMATCH });
      }
    }
    const turn = prepareCustomerTurn(tenant, anonymousId, location?.id ?? null, country?.id ?? null);
    const existing = runId ? yield* lookupChatBotRunEffect(db, turn.owner, runId) : null;
    if (!existing) {
      yield* guardPublicChatTurnSvc({
        db,
        tenant,
        owner: turn.owner,
        threadId: request.threadId,
        ip: request.ip,
        limiters: request.limiters,
      });
    }
    return turn;
  });
