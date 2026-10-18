import type { AccessPower } from "./catalogue";

export type AccessPowerUsage = {
  guard: "plain" | "bound" | null;
  routes: readonly string[];
  tools: readonly string[];
};

// -----
// Where each Power is checked: the API routes and the
// Assistant tools that refuse without it, and the route guard:
// "bound" (requireBoundPower, limited by a team member's
// bindings), "plain" (requirePower) or null (tools only). A Power absent
// here is not checked anywhere yet. Generated: run the
// engine tests with UPDATE_POWER_USAGE=1 to rewrite it.
// -----
export const ACCESS_POWER_USAGE: Readonly<Partial<Record<AccessPower, AccessPowerUsage>>> = {
  "company:profile:business_profile:read": { guard: "plain", routes: ["GET /business-profile"], tools: [] },
  "company:profile:business_profile:update": { guard: "plain", routes: ["PUT /business-profile"], tools: ["updateBusinessProfile"] },
  "company:profile:countries:read": { guard: "plain", routes: ["GET /countries"], tools: [] },
  "company:profile:countries:create": { guard: "plain", routes: ["POST /countries"], tools: [] },
  "company:profile:countries:update": { guard: "plain", routes: ["PATCH /countries/:countryId"], tools: [] },
  "company:profile:countries:archive": { guard: "plain", routes: ["POST /countries/:countryId/archive"], tools: [] },
  "company:profile:locations:read": { guard: "plain", routes: ["GET /locations"], tools: [] },
  "company:profile:locations:create": { guard: "plain", routes: ["POST /locations"], tools: [] },
  "company:profile:locations:update": { guard: "plain", routes: ["PATCH /locations/:locationId"], tools: [] },
  "company:profile:locations:archive": { guard: "plain", routes: ["GET /locations/:locationId/archive-preview", "POST /locations/:locationId/archive"], tools: [] },
  "company:profile:region:update": { guard: "plain", routes: ["PATCH /tenants/:tenantId/region"], tools: [] },
  "company:team:members:read": { guard: "plain", routes: ["GET /team", "GET /team/roles"], tools: [] },
  "company:team:members:update": { guard: "plain", routes: ["PATCH /team/members/:partyId"], tools: [] },
  "company:team:members:delete": { guard: "plain", routes: ["DELETE /team/members/:partyId"], tools: [] },
  "company:team:invites:create": { guard: "plain", routes: ["POST /team/invites"], tools: [] },
  "company:team:invites:update": { guard: "plain", routes: ["PATCH /team/invites/:inviteId"], tools: [] },
  "company:team:invites:delete": { guard: "plain", routes: ["DELETE /team/invites/:inviteId"], tools: [] },
  "company:menu:categories:create": { guard: "plain", routes: ["POST /menu/categories"], tools: ["addMenuCategory"] },
  "company:menu:categories:update": { guard: "plain", routes: ["PUT /menu/categories/:categoryId"], tools: [] },
  "company:menu:categories:delete": { guard: "plain", routes: ["DELETE /menu/categories/:categoryId"], tools: [] },
  "company:menu:categories:reorder": { guard: "plain", routes: ["PUT /menu/categories/order"], tools: [] },
  "company:menu:items:read": { guard: "plain", routes: ["GET /menu"], tools: [] },
  "company:menu:items:create": { guard: "plain", routes: ["POST /menu/items"], tools: [] },
  "company:menu:items:update": { guard: "plain", routes: ["PUT /menu/items/:itemId"], tools: [] },
  "company:menu:items:delete": { guard: "plain", routes: ["DELETE /menu/items/:itemId"], tools: [] },
  "company:menu:items:reorder": { guard: "plain", routes: ["PUT /menu/categories/:categoryId/items/order"], tools: [] },
  "company:menu:locations:update": { guard: "plain", routes: ["PUT /menu/items/:itemId/locations"], tools: [] },
  "company:menu:country_prices:update": { guard: "plain", routes: ["PUT /menu/items/:itemId/countries/:countryId"], tools: ["updateMenuItemPrice"] },
  "company:menu:images:create": { guard: "plain", routes: ["POST /menu/items/:itemId/images"], tools: [] },
  "company:menu:images:update": { guard: "plain", routes: ["PUT /menu/items/:itemId/images/:imageId/cover"], tools: [] },
  "company:menu:images:delete": { guard: "plain", routes: ["DELETE /menu/items/:itemId/images/:imageId"], tools: [] },
  "company:menu:images:reorder": { guard: "plain", routes: ["PUT /menu/items/:itemId/images/order"], tools: [] },
  "company:menu:imports:read": { guard: "plain", routes: ["GET /imports", "GET /imports/:importId"], tools: [] },
  "company:menu:imports:create": { guard: "plain", routes: ["POST /imports"], tools: [] },
  "company:menu:imports:publish": { guard: "plain", routes: ["POST /imports/:importId/publish"], tools: [] },
  "company:menu:import_drafts:update": { guard: "plain", routes: ["PATCH /imports/:importId/drafts/:draftId", "POST /imports/:importId/approve-all"], tools: [] },
  "company:faqs:faqs:read": { guard: "plain", routes: ["GET /faqs"], tools: [] },
  "company:faqs:faqs:create": { guard: "plain", routes: ["POST /faqs"], tools: ["addFaq"] },
  "company:faqs:faqs:update": { guard: "plain", routes: ["PUT /faqs/:faqId"], tools: ["updateFaq"] },
  "company:faqs:faqs:delete": { guard: "plain", routes: ["DELETE /faqs/:faqId"], tools: [] },
  "company:faqs:categories:create": { guard: "plain", routes: ["POST /faqs/categories"], tools: [] },
  "company:faqs:categories:update": { guard: "plain", routes: ["PUT /faqs/categories/:categoryId"], tools: [] },
  "company:faqs:categories:delete": { guard: "plain", routes: ["DELETE /faqs/categories/:categoryId"], tools: [] },
  "company:chats:threads:read": { guard: "plain", routes: ["GET /customer-threads", "GET /customer-threads/:threadId"], tools: [] },
  "company:unanswered:questions:read": { guard: "plain", routes: ["GET /unanswered-questions"], tools: [] },
  "company:unanswered:questions:dismiss": { guard: "plain", routes: ["POST /unanswered-questions/:messageId/dismiss"], tools: [] },
  "company:assistant:threads:read": { guard: "plain", routes: ["GET /chat-bot", "GET /chat-bot/threads", "GET /chat-bot/threads/:id"], tools: [] },
  "company:assistant:threads:create": { guard: "plain", routes: ["POST /chat-bot"], tools: [] },
  "company:assistant:threads:update": { guard: "plain", routes: ["PATCH /chat-bot/threads/:id"], tools: [] },
  "company:assistant:threads:delete": { guard: "plain", routes: ["DELETE /chat-bot/threads/:id"], tools: [] },
  "store:hours:weekly:read": { guard: "bound", routes: ["GET /schedule"], tools: [] },
  "store:hours:weekly:update": { guard: "bound", routes: ["PUT /schedule/hours/:dayOfWeek"], tools: ["setBusinessHours"] },
  "store:hours:overrides:update": { guard: "bound", routes: ["PUT /schedule/overrides/:date"], tools: ["setHoursOverride"] },
  "store:hours:overrides:delete": { guard: "bound", routes: ["DELETE /schedule/overrides/:date"], tools: ["removeHoursOverride"] },
  "store:menu:availability:update": { guard: "bound", routes: ["PUT /menu/items/:itemId/sold-out-locations"], tools: ["setMenuItemAvailability", "setMenuItemsAvailability"] },
  "integration:widget:origins:update": { guard: "plain", routes: ["PUT /tenants/:tenantId/allowed-origins"], tools: [] },
  "integration:widget:look:update": { guard: "plain", routes: ["PUT /tenants/:tenantId/customer-chat"], tools: [] },
};
