import type { AccessPower } from "./catalogue";

export type AccessPowerUsage = {
  guard: "plain" | "bound" | null;
  routes: readonly string[];
  tools: readonly string[];
};

// -----
// Where each Power is checked: the API routes and the
// here is not checked anywhere yet. Generated: run the
// engine tests with UPDATE_POWER_USAGE=1 to rewrite it.
// -----
export const ACCESS_POWER_USAGE: Readonly<Partial<Record<AccessPower, AccessPowerUsage>>> = {
  "company:team:members:read": { guard: "plain", routes: ["GET /team", "GET /team/roles"], tools: [] },
  "company:team:members:update": { guard: "plain", routes: ["PATCH /team/members/:partyId"], tools: [] },
  "company:team:members:delete": { guard: "plain", routes: ["DELETE /team/members/:partyId"], tools: [] },
  "company:team:invites:create": { guard: "plain", routes: ["POST /team/invites"], tools: [] },
  "company:team:invites:update": { guard: "plain", routes: ["PATCH /team/invites/:inviteId"], tools: [] },
  "company:team:invites:delete": { guard: "plain", routes: ["DELETE /team/invites/:inviteId"], tools: [] },
  "company:chats:threads:read": { guard: "plain", routes: ["GET /customer-threads", "GET /customer-threads/:threadId"], tools: [] },
  "company:unanswered:questions:read": { guard: "plain", routes: ["GET /unanswered-questions"], tools: [] },
  "company:unanswered:questions:dismiss": { guard: "plain", routes: ["POST /unanswered-questions/:messageId/dismiss"], tools: [] },
  "company:assistant:threads:read": { guard: "plain", routes: ["GET /chat-bot", "GET /chat-bot/threads", "GET /chat-bot/threads/:id"], tools: [] },
  "company:assistant:threads:create": { guard: "plain", routes: ["POST /chat-bot"], tools: [] },
  "company:assistant:threads:update": { guard: "plain", routes: ["PATCH /chat-bot/threads/:id"], tools: [] },
  "company:assistant:threads:delete": { guard: "plain", routes: ["DELETE /chat-bot/threads/:id"], tools: [] },
};
