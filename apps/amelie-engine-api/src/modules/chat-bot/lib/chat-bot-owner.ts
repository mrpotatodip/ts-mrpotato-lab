import type { Context } from "hono";
import type { AppEnv } from "#/types/variables";
import type { ChatBotOwner } from "#/modules/chat-bot/types";

// -----
// The signed-in owner: the session's user, in
// the Tenant requireTenantMember checked.
// -----
export const chatBotSignedInOwner = (c: Context<AppEnv>): ChatBotOwner => ({
  kind: "user",
  tenantId: c.get("tenantId"),
  userId: c.get("userId"),
});
