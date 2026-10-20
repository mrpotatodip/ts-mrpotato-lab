# Glossary — amelie-engine-api

Domain glossary for Amelie, an AI customer assistant that answers a small business's customer questions from that business's own information. Use these terms exactly in code, issues, tests, and ADRs — don't drift to synonyms.

## Parties and tenants

- **Party** — any actor Amelie knows about: a **Person** or an **Organization**. Party answers "who is this?". _Avoid_: entity, actor.

- **Person** — a Party that is an individual (e.g. Jayson Cantones). A signed-in dashboard login belongs to one Person. _Avoid_: user (reserve for the auth login record).

- **Organization** — a Party that is a business or company (e.g. Sorella Cafe). _Avoid_: business (as a data term), company, client.

- **Tenant** — an isolated Amelie account owned by one Organization. It is the security boundary: every piece of business data (profile, hours, menu, FAQs, anonymous Threads) belongs to exactly one Tenant. Tenant answers "which Amelie account does this data belong to?" and is never the same thing as a Party. _Avoid_: business, account, workspace.

- **Master Role** — the platform catalogue entry for one Role type (`access_master_roles`): a fixed `key`, an editable label and description, a scope (tenant or platform), an enabled flag and a system flag. Its Powers are its rows in `access_role_powers`. Superuser owns this list. A Master Role can be assigned only while enabled; disabling it blocks new assignments and leaves current holders alone. System roles (tenant_admin, superuser) cannot be deleted, disabled or lose Powers. _Avoid_: template role, role type, role master file.

- **Master Power** — the platform catalogue entry for one Power string (`access_master_powers`), with a scope that matches its path (`platform:` is platform, the rest tenant). A Master Power is granted to no Role by itself; `access_role_powers` pairs it with a Master Role, and only within the same scope. _Avoid_: permission list, power template.

- **Role** — what the party system points at (`roles`): one Master Role's instance in one Tenant, or the single global platform one with no Tenant. A Role carries no Powers of its own, so who holds a Role stays apart from what it may do. Code decides what a Person may do from the Master Role's Powers, never from the Role's name. Every Tenant gets a Role for each enabled tenant Master Role (`ensureTenantRoles`). _Avoid_: permission, level, member, owner, manager, staff.

- **Role audit log** — the append-only record (`access_audit_log`) of every change a superuser makes to a Master Role or its Powers: who, what, when, and the before and after. The database refuses to edit or delete an entry. _Avoid_: history table, change log.

- **Action** — the last segment of a Power: read, create, update, delete, archive, reorder, publish, dismiss. There is no write Action.

- **Power** — one exact colon path through the dashboard tree, ending in an Action (`company:menu:items:read`). Depth is not capped. A grant that is not a catalogue leaf is invalid. A parent path does not grant children, and `update` does not grant `read`. The Assistant's cafe-changing tools use the target path (e.g. `company:menu:items:update`), not `company:assistant:threads:create`. _Avoid_: permission, wildcard, capability.

- **Party role** — a Person holding one Role, in one Tenant (a `party_roles` row; a superuser row has no Tenant). A Person has at most one Party role per Tenant, and may hold Party roles in several Tenants (e.g. someone who runs two cafés). In prose, "team member" means a Person with a Party role in the Tenant. The team belongs to the Tenant, not to a Location; a team member can still be narrowed to part of the cafe by a **Binding**. _Avoid_: Tenant Member, membership, seat.

- **Team invite** — a pending offer for one email to hold one Role in one Tenant. The Person accepts it through a join link. It is not a platform invite code and does not start a cafe. _Avoid_: invitation, seat invite, member invite.

- **Country** — one country a Tenant sells in (e.g. Canada), with its Currency. A Tenant has one or more, and every Location belongs to exactly one, fixed when the Location is created. A Tenant has at most one Country per country code, and adding an archived one restores it. A Country with open Locations cannot be archived, and the last open Country cannot be. Picked at sign-up for the first one; a tenant_admin or store_admin adds the rest. _Avoid_: location, region (as a data term), market. _See ADR-0002. The profile Region card is for cafes with one Country, and only there is the country code editable; with two or more, the server refuses a Region edit and the Countries settings replace the card (the code is the identity, so only the Currency is edited there)._

- **Currency** — the money unit of a Country (e.g. CAD), an ISO-4217 code on the Country, never on a Menu item or the Tenant. Every price in a Country is in it. Changing it relabels the existing prices and converts nothing: 4.50 stays 4.50. _Avoid_: money, locale, per-item currency. _See ADR-0002._

- **Country price** — what a Menu item costs in one Country: a price, or Variant prices, in that Country's Currency, plus a sold-here flag. A Menu item is sold in a Country only when it has a Country price that is sold there. Turning sold-here off keeps the price. Owners enter every Country price by hand: nothing is converted, and there is no per-Location price. _Avoid_: base price, converted price, local price. _See ADR-0002. The dashboard sidebar picks one Country at a time when there are two or more; the Menu page prices that Country. A price is always saved against an explicit Country, and an item with no price in a Country shows muted there until one is entered._

- **Business** — informal word for what a Tenant represents to people (a café, restaurant, or local shop). Fine in UI copy and conversation; in data and code say **Tenant** or **Organization**.

- **Location** — one physical place a Tenant operates from (e.g. Downtown, Airport). Every Tenant has at least one, and each belongs to one Country, chosen when it is added and never changed (see ADR-0002). A new Location's timezone starts from the last Location created in its Country, else the Tenant's, and stays editable. Contact details (address, phone), timezone and opening hours belong to a Location; the menu, FAQs, team and Roles belong to the Tenant, though a team member's reach can be narrowed to some Locations (see **Binding** and **Covered Location**). Archived, never deleted. A request about hours or contact details names a Location, or uses the Tenant's only one; with several and none named, the answer is "needs location" plus the options. _Avoid_: branch, store, outlet, site. See ADR-0001.

## Scoped team members

- **Binding** — one Country or one Location that a team member is limited to. A member holds a list of Bindings and may mix Countries and Locations (all of Canada, and only the Airport in the US). A Country Binding covers every Location in that Country, including ones opened later; a Location Binding covers that Location alone. Only some Roles can carry Bindings, and the team page shows them on every member. _Avoid_: assignment, grant, branch access, permission.

- **Covered Location** — an open Location a team member's Bindings reach, through a Location Binding or through its Country. Archived Locations are never covered. A member whose Bindings reach no open Location covers nothing; they are not treated as whole-cafe. _Avoid_: assigned Location, allowed Location.

- **Bound Power** — a Power that a Binding limits, so the member holds it only at their Covered Locations. The Power catalogue marks each one; a Power not marked is open to a bound member as their Role grants it (team, master menu, Country prices). _Avoid_: scoped Power, location Power.

- **Whole-cafe member** — a team member with no Bindings, who reaches every Location, as every member did before Bindings existed. It is a deliberate choice on a Role that can carry Bindings, never a default left by omission. A member whose Role cannot carry Bindings is always whole-cafe. _Avoid_: unrestricted member, global member, unbound member.

## Business knowledge

- **Business profile** — a Tenant's general information: description, website, email. Phone and address belong to a Location; the Business profile API still returns them, read from the chosen Location. With several Countries, description, website and email belong to the first (sign-up) Country, not to a later one.

- **Business hours** — a Location's regular opening hours for each day of the week, including days it is closed.

- **Hours override** — a Location's opening hours for one specific date, replacing the Business hours for that day (e.g. closed 25 Dec, open late 13 Dec). _Avoid_: holiday hours, exception.

- **Menu category** / **Menu item** — a Tenant's structured menu. A Menu item belongs to the same Tenant as its Menu category. A sold-out or out-of-season Menu item is unavailable, not deleted. A Menu category can carry a note that applies to all its items (e.g. "served with a petite green salad").

- **Menu item image** — one photo of a Menu item, owned by that item. A Menu item can have several, in order; the first is the one shown where only one photo is needed. They are cafe-wide, not per Location. An item can have none. Bytes live in R2 at `menu-items/<tenantId>/<itemId>/<imageId>-<name>` and are served as `GET /menu-item-images/<imageId>` (the id is the capability; browsers may cache it for a year because a new photo gets a new id). Files are stored as uploaded: JPEG, PNG or WebP, up to 10 MB, not resized. A tenant_admin or store_admin adds them, same as other menu writes. Deleting the photo, the item, the category, or replacing the menu on Import also deletes the R2 object. The menu JSON field `coverPath` is that GET path for the first photo, not a stored column. _Avoid_: gallery, media, asset, `image_url` (the old column on the item).

- **Location availability** — where a Menu item is sold. By default it is sold at every Location, and a Location can mark it sold out (Iced Latte sold out Downtown, still sold at Airport). An item can instead be sold only at chosen Locations (the Airport sandwich). An item sold only at chosen Locations is never sold at a Location opened later until someone adds it. Off the menu everywhere is the item's own unavailable flag. These rules apply inside a Country: an item must first be sold in the Location's Country (see Country price). A request for the menu or FAQs without a Location is never refused: it gets the cafe-wide menu (no availability rows applied) and only the FAQs that apply to every Location (plus its Country's, when a Country is in play). Once a Tenant has several Countries, that answer carries no prices, because the currencies differ; a price needs a Location or a Country. _Avoid_: per-location menu, stock. See ADR-0001.

- **Variant** — one priced option of a Menu item (e.g. Latte Small 4.75, Large 6.25). Has no identity outside its Menu item. _Avoid_: size, option.

- **Dietary tag** — a shared label from Amelie's fixed list (vegan, vegetarian, gluten-free…) that a Tenant attaches to its Menu items. The list belongs to no Tenant; the attachment does. _Avoid_: allergen (Amelie makes no allergen claims), diet.

- **FAQ** — a question and answer the Tenant has written, optionally in one of its FAQ categories. Every free-form topic is an FAQ, e.g. "Is there parking?". Contact facts and hours are not FAQs; they live in the Business profile and Business hours. An FAQ applies to every Location unless it names one Country (all of its Locations) or one Location, and then it is shown only there. At most one of the two. _Avoid_: knowledge document, information section.

- **FAQ category** — a group a Tenant names for its own FAQs, e.g. "Parking & access" or "Kids & family". An FAQ with no category shows under "General". _Avoid_: topic, section.

- **Next 7 days** — the Tenant's opening hours on the coming seven real dates, with any Hours override replacing that day's Business hours, plus whether it is open right now in the Tenant's timezone.

- **Import** — one batch of menu files (a PDF or photos) a team member uploads for Amelie to read into Import drafts. _Avoid_: crawl, sync.

- **Import draft** — one piece of knowledge extracted from an Import that a team member has not yet reviewed. The assistant never answers from an Import draft; publishing turns it into Menu items, FAQs, Business hours, etc. _Avoid_: pending, unpublished item.

## Chat

- **Customer** — an anonymous visitor asking questions through a Tenant's chat widget. Has no account; recognised only by a random anonymous id kept in their browser. _Avoid_: user, visitor, guest.

- **Allowed origin** — a website a Tenant permits to embed its chat widget (e.g. `https://sorellacafe.com`). No Allowed origins means the widget only works on its own Amelie chat page. _Avoid_: domain, whitelist.

- **Thread** — one conversation in the chat bot. Every Thread is about one Tenant. A **signed-in thread** belongs to a login; an **anonymous thread** belongs to one Customer (by anonymous id). _Avoid_: chat session, conversation, session (alone: that means a signed-in login).

- **Thread session** — who a Thread belongs to and which Tenant it's about: the Tenant plus either a login or a Customer's anonymous id with an expiry, and optionally a Location and a Country (from the widget's `location` or `country`, fixed when the Thread starts; a Location's Country always wins). One per Thread. Always say "Thread session" in full.

- **Anonymous thread** — a Thread a Customer starts from a Tenant's widget. Its Tenant is fixed when it starts and never comes from the browser afterwards. It expires after 30 minutes idle or 24 hours at most; the widget then silently starts a new one.

- **Message** — one turn in a Thread: from the Customer or signed-in user (`user`) or from the assistant (`assistant`).

- **Missing topic** — a short label for what a Customer asked about that the Tenant's knowledge doesn't cover (e.g. "parking"). The assistant reports one (through a tool) whenever any part of the question went unanswered. _Avoid_: answered flag, gap, unknown.

- **Unanswered question** — a Customer's Message whose assistant reply reported a Missing topic. Team members see these in the dashboard and can dismiss them. _Avoid_: failed question, miss.
