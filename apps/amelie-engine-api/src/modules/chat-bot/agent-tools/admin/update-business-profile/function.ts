import { updateBusinessProfileSvc } from "#/modules/business-profile";
import type { BusinessProfileChange } from "#/modules/business-profile";
import { runAsChatBotEditor } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { BusinessProfileResult } from "#/modules/chat-bot/schemas";
import type { UpdateBusinessProfileInput } from "./schema";

// -----
// null means "keep it", so only the fields
// the model passed are written.
// -----
const toChange = (input: UpdateBusinessProfileInput): BusinessProfileChange => ({
  ...(input.description !== null && { description: input.description }),
  ...(input.websiteUrl !== null && { websiteUrl: input.websiteUrl }),
  ...(input.phone !== null && { phone: input.phone }),
  ...(input.email !== null && { email: input.email }),
  ...(input.address !== null && { address: input.address }),
});

export const updateBusinessProfile = (
  input: UpdateBusinessProfileInput,
  runtime: ChatBotRuntime,
): Promise<BusinessProfileResult> =>
  runAsChatBotEditor(runtime, updateBusinessProfileSvc(runtime.db, runtime.owner.tenantId, toChange(input)), "company:profile:business_profile:update");
