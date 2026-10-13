import type { BusinessProfile } from "#/modules/business-profile";

// -----
// Points the Customer at the Tenant's own
// phone and email once the chat is closed.
// -----
export const publicChatDailyLimitMessage = (
  tenantName: string,
  profile: Pick<BusinessProfile, "phone" | "email">,
): string => {
  const contacts = [
    profile.phone,
    profile.email,
  ].filter((contact) => contact !== null);
  const reach = contacts.length > 0 ? ` at ${contacts.join(" or ")}` : "";
  return `Our assistant is resting for today. Contact ${tenantName}${reach}.`;
};
