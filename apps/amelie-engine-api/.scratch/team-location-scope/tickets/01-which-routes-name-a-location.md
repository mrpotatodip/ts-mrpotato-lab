---
type: research
status: closed
blocked-by: []
claimed-by: claude
---
# Which routes act on a Location or Country, and how do they name it?

## Question

List every Tenant API route and Chat/agent path that touches Location- or Country-level data (hours, availability, menu locations, FAQs, prices, threads). For each: does it take a locationId or countryId, from where (query, body, path), and is any route Tenant-wide but still Location-sensitive? Facts only; the answer feeds the Power and refusal decisions.

## Resolution

Facts only; routes grouped by how a request names its Location or Country.

**Query `locationId` (optional)**
- Hours: get weekly, set weekly, set override, remove override (`store:hours:*`).
- Business profile update (`company:profile:business_profile:update`): phone and address are Location-owned, yet the Power is company-level.
- Menu editor read (`locationId` and `countryId`) and FAQ list (`locationId`).
- When omitted: the Tenant's only Location is used; with several, the answer is "needs location". So an enforcement check must run on the *resolved* Location, after that defaulting.

**Path param**
- Location update and archive (`/:locationId`, both `company:profile:locations:*`).
- Country update and archive (`/:countryId`).
- Menu item Country price (`/items/:itemId/countries/:countryId`, `company:menu:country_prices:update`).

**Body**
- Menu item locations and sold-out Locations: the item is in the path, the Locations are a `locationIds` array in the body, so one request can touch several Locations (`company:menu:locations:update`, `store:menu:availability:update`).
- FAQ add and update: a nullable `locationId` (or Country) in the body, under company-level FAQ Powers.

**Chat assistant (a second check path)**
- Admin tools for hours, overrides and item prices take a Location in their arguments.
- They are guarded by `requireChatBotPower`, which checks only the Tenant's Powers, not `requirePower`. Any binding check must also be added there, or the assistant bypasses it.

**Not team members**
- Public widget and Customer threads carry a Location or Country on the Thread session. They are not affected by team bindings.

**Implications for the next tickets**
- Only the `store:` Powers (hours, availability) plus Location and Country management name one Location cleanly. Several company-level routes also touch a Location (business profile, FAQs, menu locations), which the Powers ticket must classify.
- The target is found in three places (query, path, body), and the body case can hold many Locations at once.
