# Glossary — amelie-engine-api

Domain glossary for Amelie, an AI customer assistant that answers a small business's customer questions from that business's own information. Use these terms exactly in code, issues, tests, and ADRs — don't drift to synonyms.

## Parties and tenants

- **Party** — any actor Amelie knows about: a **Person** or an **Organization**. Party answers "who is this?". _Avoid_: entity, actor.

- **Person** — a Party that is an individual (e.g. Jayson Cantones). A signed-in dashboard login belongs to one Person. _Avoid_: user (reserve for the auth login record).

- **Organization** — a Party that is a business or company (e.g. Sorella Cafe). _Avoid_: business (as a data term), company, client.

- **Tenant** — an isolated Amelie account owned by one Organization. It is the security boundary: every piece of business data (profile, hours, menu, FAQs, anonymous Threads) belongs to exactly one Tenant. Tenant answers "which Amelie account does this data belong to?" and is never the same thing as a Party. _Avoid_: business, account, workspace.

- **Role** — a named set of powers. Every Tenant has three: **owner** and **manager** (`can_edit` true) and **staff** (`can_edit` false). One global **superuser** Role belongs to no Tenant. Code decides what a Person may do from the Role's `can_edit` flag, never from its name. _Avoid_: permission, level, admin, member.

- **Party role** — a Person holding one Role, in one Tenant (a `party_roles` row; a superuser row has no Tenant). A Person has at most one Party role per Tenant, and may hold Party roles in several Tenants (e.g. someone who runs two cafés). In prose, "team member" means a Person with a Party role in the Tenant. _Avoid_: Tenant Member, membership, seat.

- **Country** — one country a Tenant sells in (e.g. Canada), with its Currency. A Tenant has one or more, and every Location belongs to exactly one, fixed when the Location is created. A Tenant has at most one Country per country code, and adding an archived one restores it. A Country with open Locations cannot be archived, and the last open Country cannot be. Picked at sign-up for the first one; an owner or manager adds the rest. _Avoid_: location, region (as a data term), market. _See ADR-0002. The profile Region card is for cafes with one Country, and only there is the country code editable; with two or more, the server refuses a Region edit and the Countries settings replace the card (the code is the identity, so only the Currency is edited there)._

- **Currency** — the money unit of a Country (e.g. CAD), an ISO-4217 code on the Country, never on a Menu item or the Tenant. Every price in a Country is in it. Changing it relabels the existing prices and converts nothing: 4.50 stays 4.50. _Avoid_: money, locale, per-item currency. _See ADR-0002._

- **Country price** — what a Menu item costs in one Country: a price, or Variant prices, in that Country's Currency, plus a sold-here flag. A Menu item is sold in a Country only when it has a Country price that is sold there. Turning sold-here off keeps the price. Owners enter every Country price by hand: nothing is converted, and there is no per-Location price. _Avoid_: base price, converted price, local price. _See ADR-0002. The Menu page prices one Country at a time (a Country switcher with two or more); a price is always saved against an explicit Country, and an item with no price in a Country shows muted there until one is entered._

- **Business** — informal word for what a Tenant represents to people (a café, restaurant, or local shop). Fine in UI copy and conversation; in data and code say **Tenant** or **Organization**.

- **Location** — one physical place a Tenant operates from (e.g. Downtown, Airport). Every Tenant has at least one, and each belongs to one Country, chosen when it is added and never changed (see ADR-0002). A new Location's timezone starts from the last Location created in its Country, else the Tenant's, and stays editable. Contact details (address, phone), timezone and opening hours belong to a Location; the menu, FAQs, team and Roles belong to the Tenant. Archived, never deleted. A request about hours or contact details names a Location, or uses the Tenant's only one; with several and none named, the answer is "needs location" plus the options. _Avoid_: branch, store, outlet, site. See ADR-0001.

## Business knowledge

- **Business profile** — a Tenant's general information: description, website, email. Phone and address belong to a Location; the Business profile API still returns them, read from the chosen Location.

- **Business hours** — a Location's regular opening hours for each day of the week, including days it is closed.

- **Hours override** — a Location's opening hours for one specific date, replacing the Business hours for that day (e.g. closed 25 Dec, open late 13 Dec). _Avoid_: holiday hours, exception.

- **Menu category** / **Menu item** — a Tenant's structured menu. A Menu item belongs to the same Tenant as its Menu category. A sold-out or out-of-season Menu item is unavailable, not deleted. A Menu category can carry a note that applies to all its items (e.g. "served with a petite green salad").

- **Menu item image** — one photo of a Menu item, owned by that item. A Menu item can have several, in order; the first is the one shown where only one photo is needed. They are cafe-wide, not per Location. An item can have none. _Avoid_: gallery, media, asset, `image_url` (the old column on the item).

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
