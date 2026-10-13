import { runEffect } from "#/lib/effect-query";
import { listPublicTenantsSvc } from "#/modules/tenant";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { ListTenantsResult } from "#/modules/chat-bot/schemas";
import type { ListTenantsInput } from "./schema";

// -----
// Not about one Tenant: it only reads runtime.db.
// -----
export const listTenants = async (
  _input: ListTenantsInput,
  runtime: ChatBotRuntime,
): Promise<ListTenantsResult> => ({ tenants: await runEffect(listPublicTenantsSvc(runtime.db)) });
