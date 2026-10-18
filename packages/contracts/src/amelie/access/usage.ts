import type { AccessPower } from "./catalogue";

export type AccessPowerUsage = {
  routes: readonly string[];
  tools: readonly string[];
};

// -----
// Where each Power is checked: the API routes and the
// Assistant tools that refuse without it. A Power absent
// here is not checked anywhere yet. Generated: run the
// engine tests with UPDATE_POWER_USAGE=1 to rewrite it.
// -----
export const ACCESS_POWER_USAGE: Readonly<Partial<Record<AccessPower, AccessPowerUsage>>> = {
  "company:profile:business_profile:read": { routes: ["GET /business-profile"], tools: [] },
  "company:profile:business_profile:update": { routes: ["PUT /business-profile"], tools: ["updateBusinessProfile"] },
  "company:profile:countries:read": { routes: ["GET /countries"], tools: [] },
  "company:profile:countries:create": { routes: ["POST /countries"], tools: [] },
  "company:profile:countries:update": { routes: ["PATCH /countries/:countryId"], tools: [] },
  "company:profile:countries:archive": { routes: ["POST /countries/:countryId/archive"], tools: [] },
  "company:profile:locations:read": { routes: ["GET /locations"], tools: [] },
  "company:profile:locations:create": { routes: ["POST /locations"], tools: [] },
  "company:profile:locations:update": { routes: ["PATCH /locations/:locationId"], tools: [] },
  "company:profile:locations:archive": { routes: ["POST /locations/:locationId/archive"], tools: [] },
  "company:profile:region:update": { routes: ["PATCH /tenants/:tenantId/region"], tools: [] },
  "company:team:members:read": { routes: ["GET /team", "GET /team/roles"], tools: [] },
  "company:team:members:update": { routes: ["PATCH /team/members/:partyId"], tools: [] },
  "company:team:members:delete": { routes: ["DELETE /team/members/:partyId"], tools: [] },
  "company:team:invites:create": { routes: ["POST /team/invites"], tools: [] },
  "company:team:invites:update": { routes: ["PATCH /team/invites/:inviteId"], tools: [] },
  "company:team:invites:delete": { routes: ["DELETE /team/invites/:inviteId"], tools: [] },
  "company:menu:categories:create": { routes: ["POST /menu/categories"], tools: ["addMenuCategory"] },
  "company:menu:categories:update": { routes: ["PUT /menu/categories/:categoryId"], tools: [] },
  "company:menu:categories:delete": { routes: ["DELETE /menu/categories/:categoryId"], tools: [] },
  "company:menu:categories:reorder": { routes: ["PUT /menu/categories/order"], tools: [] },
  "company:menu:items:read": { routes: ["GET /menu"], tools: [] },
  "company:menu:items:create": { routes: ["POST /menu/items"], tools: [] },
  "company:menu:items:update": { routes: ["PUT /menu/items/:itemId"], tools: [] },
  "company:menu:items:delete": { routes: ["DELETE /menu/items/:itemId"], tools: [] },
  "company:menu:items:reorder": { routes: ["PUT /menu/categories/:categoryId/items/order"], tools: [] },
  "company:menu:locations:update": { routes: ["PUT /menu/items/:itemId/locations"], tools: [] },
  "company:menu:country_prices:update": { routes: ["PUT /menu/items/:itemId/countries/:countryId"], tools: ["updateMenuItemPrice"] },
  "company:menu:images:create": { routes: ["POST /menu/items/:itemId/images"], tools: [] },
  "company:menu:images:update": { routes: ["PUT /menu/items/:itemId/images/:imageId/cover"], tools: [] },
  "company:menu:images:delete": { routes: ["DELETE /menu/items/:itemId/images/:imageId"], tools: [] },
  "company:menu:images:reorder": { routes: ["PUT /menu/items/:itemId/images/order"], tools: [] },
  "company:menu:imports:read": { routes: ["GET /imports", "GET /imports/:importId"], tools: [] },
  "company:menu:imports:create": { routes: ["POST /imports"], tools: [] },
  "company:menu:imports:publish": { routes: ["POST /imports/:importId/publish"], tools: [] },
  "company:menu:import_drafts:update": { routes: ["PATCH /imports/:importId/drafts/:draftId", "POST /imports/:importId/approve-all"], tools: [] },
  "company:faqs:faqs:read": { routes: ["GET /faqs"], tools: [] },
  "company:faqs:faqs:create": { routes: ["POST /faqs"], tools: ["addFaq"] },
  "company:faqs:faqs:update": { routes: ["PUT /faqs/:faqId"], tools: ["updateFaq"] },
  "company:faqs:faqs:delete": { routes: ["DELETE /faqs/:faqId"], tools: [] },
  "company:faqs:categories:create": { routes: ["POST /faqs/categories"], tools: [] },
  "company:faqs:categories:update": { routes: ["PUT /faqs/categories/:categoryId"], tools: [] },
  "company:faqs:categories:delete": { routes: ["DELETE /faqs/categories/:categoryId"], tools: [] },
  "company:chats:threads:read": { routes: ["GET /customer-threads", "GET /customer-threads/:threadId"], tools: [] },
  "company:unanswered:questions:read": { routes: ["GET /unanswered-questions"], tools: [] },
  "company:unanswered:questions:dismiss": { routes: ["POST /unanswered-questions/:messageId/dismiss"], tools: [] },
  "company:assistant:threads:read": { routes: ["GET /chat-bot", "GET /chat-bot/threads", "GET /chat-bot/threads/:id"], tools: [] },
  "company:assistant:threads:create": { routes: ["POST /chat-bot"], tools: [] },
  "company:assistant:threads:update": { routes: ["PATCH /chat-bot/threads/:id"], tools: [] },
  "company:assistant:threads:delete": { routes: ["DELETE /chat-bot/threads/:id"], tools: [] },
  "store:hours:weekly:read": { routes: ["GET /schedule"], tools: [] },
  "store:hours:weekly:update": { routes: ["PUT /schedule/hours/:dayOfWeek"], tools: ["setBusinessHours"] },
  "store:hours:overrides:update": { routes: ["PUT /schedule/overrides/:date"], tools: ["setHoursOverride"] },
  "store:hours:overrides:delete": { routes: ["DELETE /schedule/overrides/:date"], tools: ["removeHoursOverride"] },
  "store:menu:availability:update": { routes: ["PUT /menu/items/:itemId/sold-out-locations"], tools: ["setMenuItemAvailability", "setMenuItemsAvailability"] },
  "integration:widget:origins:update": { routes: ["PUT /tenants/:tenantId/allowed-origins"], tools: [] },
  "integration:widget:look:update": { routes: ["PUT /tenants/:tenantId/customer-chat"], tools: [] },
};
