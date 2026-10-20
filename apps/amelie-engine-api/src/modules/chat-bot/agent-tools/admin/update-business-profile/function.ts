import { updateBusinessProfileSvc } from "#/modules/business-profile";
import type { BusinessProfileChange } from "#/modules/business-profile";
import { answerNeedsLocation, runAsBoundChatBotEditor } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { BusinessProfileResult, LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { UpdateBusinessProfileInput } from "./schema";

// -----
// null means "keep it", so only the fields
// the model passed are written.
// -----
const toChange = (input: Omit<UpdateBusinessProfileInput, "locationId">): BusinessProfileChange => ({
  ...(input.description !== null && { description: input.description }),
  ...(input.websiteUrl !== null && { websiteUrl: input.websiteUrl }),
  ...(input.phone !== null && { phone: input.phone }),
  ...(input.email !== null && { email: input.email }),
  ...(input.address !== null && { address: input.address }),
});

export const updateBusinessProfile = (
  { locationId, ...input }: UpdateBusinessProfileInput,
  runtime: ChatBotRuntime,
): Promise<BusinessProfileResult | LocationNeededResult> =>
  runAsBoundChatBotEditor(runtime, "company:profile:business_profile:update", locationId, (target) =>
    answerNeedsLocation(
      updateBusinessProfileSvc(runtime.db, runtime.owner.tenantId, toChange(input), target.locationId, target.coverage),
    ),
  );
