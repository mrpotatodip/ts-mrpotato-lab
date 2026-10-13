# PRD — Amelie customer assistant MVP

> Assembled from the wayfinder map [mrpotatodip/ts-elise#325](https://github.com/mrpotatodip/ts-elise/issues/325) on 2026-10-04. Each decision links to the ticket that holds its detail. Glossary: `apps/amelie-engine-api/CONTEXT.md`. Data foundation: `party-model-spec.md` (same folder). Where this PRD and the spec differ, this PRD wins.
>
> **Design change (2026-10-04):** Customers chat in **anonymous threads** of the existing chat bot (`chat_bot_threads` / `_runs` / `_messages`, with ownership in `chat_bot_thread_sessions`), answered by a `customer` agent with streaming. The planned `chat_sessions` / `chat_messages` tables are dropped from the plan.
>
> **Open gap**, marked ⚠️ below: menu item images in R2 (#334). The embeddable widget is decided in `widget-embed.md` (same folder).

## Problem Statement

A small café or restaurant gets the same customer questions all day: "What time do you open?", "Do you have anything gluten-free?", "How much is a large latte?", "Is there parking?". Staff answer them by phone, by Instagram DM, or not at all after hours. The answers already exist (the menu, the hours, the address), but a customer on the website can't ask them. The café also has no idea which questions it keeps failing to answer.

## Solution

Amelie is an AI customer assistant a business embeds on its website. A Customer opens it, asks a question in plain language, and gets a short, accurate answer drawn only from that business's own information: menu (with prices, sizes, dietary tags), opening hours (including one-off dates like Christmas), contact details, and free-form facts like catering. When the information isn't there, the assistant says so and points the Customer to the café's phone or email, without making anything up. Each such gap is logged as an **Unanswered question**, so the café can see what it should add.

Businesses get their knowledge in by uploading their menu (PDF or photos). Amelie reads it into drafts for review before anything goes live. Each business is fully isolated from every other.

## User Stories

### Customer (anonymous, on a business's website)

1. As a Customer, I want to ask a question without creating an account, so that I can get an answer in seconds.
2. As a Customer, I want to ask when the café opens on a given day, so that I don't turn up when it's closed.
3. As a Customer, I want to ask whether the café is open on a specific date (e.g. Christmas Day), so that I get special-date closures right.
4. As a Customer, I want "today", "tomorrow" and "now" to mean the café's local time, so that answers are right even if I'm in another timezone.
5. As a Customer, I want to ask what's on the menu in a category (e.g. breakfast), so that I can decide before I go.
6. As a Customer, I want to ask the price of an item, including a specific size (e.g. a large latte), so that I know what I'll pay.
7. As a Customer, I want to ask for items matching a dietary need (vegan, vegetarian, gluten-free, …), so that I know what I can eat.
8. As a Customer, I want section-wide details included (e.g. "sandwiches come with a green salad", "gluten-free bread +$2"), so that answers are complete.
9. As a Customer, I want to describe what I feel like ("something light", "something filling"), so that I get suggestions from the real menu.
10. As a Customer, I want the assistant to say clearly when an item isn't on the menu (e.g. Eggs Benedict), so that I'm not given an invented price.
11. As a Customer, I want allergy questions answered with the relevant ingredients and a prompt to check with staff, so that I'm never falsely told something is safe.
12. As a Customer, I want the café's address, phone and email, so that I can find or contact them.
13. As a Customer, I want an honest "I don't have that information" plus the café's contact details when the assistant can't answer, so that I still have a next step.
14. As a Customer, I want menu items the assistant mentions shown as cards with name and price, so that I can scan them quickly.
15. As a Customer, I want my chat to continue while I keep asking within a visit, so that follow-up questions have context.
16. As a Customer, I want a new chat to start on its own when I come back later, so that I'm not stuck with an expired one.
17. As a Customer, I want a clear message if I send messages too fast, so that I know to wait a moment.
18. As a Customer, I want to be offered a fresh chat when one gets very long, so that I can keep going.
19. As a Customer, I want the café's contact details if the assistant is unavailable for the day, so that I'm never left with nothing.
20. As a Customer, I want my questions not kept forever, so that anything personal I typed doesn't linger.

### Tenant Member (business owner or staff, signed in to the dashboard)

21. As a Tenant Member, I want to sign in to a dashboard for my business, so that I can manage what the assistant knows.
22. As a Tenant Member who runs two cafés, I want to manage both from one login, so that I don't need two accounts.
23. As a Tenant Member, I want to upload my menu as a PDF or up to 10 photos, so that I don't have to type it in.
24. As a Tenant Member, I want the uploaded menu turned into drafts, not published straight away, so that nothing wrong goes live.
25. As a Tenant Member, I want drafts the reader was unsure about flagged ("two prices with no size labels"), so that I check the right things.
26. As a Tenant Member, I want to edit, approve or discard each draft, or approve all, so that review is quick.
27. As a Tenant Member, I want to choose whether a menu import replaces my menu or adds to it, so that I can do a full refresh or a partial update.
28. As a Tenant Member, I want to see which file each draft came from, so that I can spot an old menu.
29. As a Tenant Member, I want to edit my business profile (description, website, phone, email, address), so that contact answers are right.
30. As a Tenant Member, I want to set weekly opening hours, including closed days, so that hours answers are right.
31. As a Tenant Member, I want to add one-off date hours (closed Christmas, open late on 13 Dec), so that special dates are answered correctly.
32. As a Tenant Member, I want to manage menu categories, including a note for the whole category, so that shared details are answered.
33. As a Tenant Member, I want to manage menu items with price, size variants, dietary tags and availability, so that menu answers are accurate.
34. As a Tenant Member, I want to mark a seasonal or sold-out item unavailable without deleting it, so that I can bring it back later.
35. As a Tenant Member, I want to manage FAQs, so that I can answer common questions in my own words.
36. As a Tenant Member, I want to add free-form topics (parking, catering, private events), so that the assistant can answer them without new fields.
37. As a Tenant Member, I want to see past Customer threads, so that I know what Customers ask.
38. As a Tenant Member, I want a list of Unanswered questions with what was missing, so that I know what information to add.
39. As a Tenant Member, I want to dismiss an Unanswered question, so that my list stays useful.
40. As a Tenant Member, I want only the websites I list to be able to show my widget, so that nobody else can burn through my daily limit.
41. As a Tenant Member, I want my business's data invisible to every other business, so that I can trust the platform.

### Operator (Amelie team)

42. As the operator, I want to create a business (Organization, Tenant, slug, owner) by hand for the pilot, so that onboarding doesn't need self-serve sign-up yet.
43. As the operator, I want a daily message cap per business, so that a bot can't run up an unbounded AI bill.
44. As the operator, I want token counts stored on every assistant reply, so that usage and billing can be added later without backfilling.

## Implementation Decisions

### Apps and stack

- `amelie-engine-api` (Hono on Cloudflare Workers) is built from the existing untracked elise copy, stripping the elise-specific parts (TCG R2 bucket, email, elise auth and DB). `amelie-frontend-web` (TanStack Start) hosts the dashboard and (⚠️ #329) the widget.
- New `@repo/db-amelie` package with its own Neon database, following `@repo/db-elise`'s conventions: uuid ids, `created_at`/`updated_at` timestamptz, auth user linked to a Party.
- Amelie has its own better-auth instance. Each auth login belongs to one Person. No self-serve sign-up: Persons, Organizations, Tenants and Tenant Members are created by hand for the pilot.
- AI: the existing chat-bot setup (TanStack AI + `@tanstack/ai-openai`, called directly with `OPENAI_API_KEY`). No Cloudflare AI Gateway. A Customer agent with schedule, menu and FAQ helpers behind an agent router (added after #338; the Customer agent also has the read-only tools itself, so a router miss still gets an answer). Model: `gpt-6-luna`, reasoning effort `low`, about 400 max output tokens. ([#326](https://github.com/mrpotatodip/ts-elise/issues/326))

### Data model

Base: the Party-model spec (`party-model-spec.md`): `parties` (person | organization), `persons`, `organizations`, `tenants` (owned by an Organization, unique `slug`), `tenant_members` (Person + Tenant + role `owner | admin | member`, unique per pair), `business_profiles`, `business_hours`, `menu_categories`, `menu_items`, `faqs`, `knowledge_documents`, `chat_sessions`, `chat_messages`. **Every Tenant-owned table carries its own `tenant_id`.**

Additions and changes decided on the map:

| Table | Change | Ticket |
|---|---|---|
| `tenants` | + `allowed_origins text[]` (websites allowed to embed the widget) | [#330](https://github.com/mrpotatodip/ts-elise/issues/330) |
| `tenants` | + `timezone` (IANA, e.g. `America/New_York`): drives "today"/"now" and day boundaries | [#335](https://github.com/mrpotatodip/ts-elise/issues/335) |
| `business_hours_overrides` | new: `tenant_id`, `date`, `opens_at`, `closes_at`, `is_closed`, `note`; unique `(tenant_id, date)` | [#328](https://github.com/mrpotatodip/ts-elise/issues/328) |
| `menu_categories` | + `note` (applies to every item in the category) | [#327](https://github.com/mrpotatodip/ts-elise/issues/327) |
| `menu_items` | + `variants jsonb` (`[{ name, price }]`, Zod-checked, nullable; `price` = lowest variant), + `sort_order`; prices `numeric(10,2)` + `currency`; `is_available` covers seasonal and sold-out; no allergen field | [#328](https://github.com/mrpotatodip/ts-elise/issues/328) |
| `dietary_tags` | new **shared** reference table (no `tenant_id`): `id`, `slug`, `label`; seeded vegan, vegetarian, gluten-free, dairy-free, nut-free, halal | [#328](https://github.com/mrpotatodip/ts-elise/issues/328) |
| `menu_item_dietary_tags` | new: `tenant_id`, `menu_item_id`, `dietary_tag_id`; PK `(menu_item_id, dietary_tag_id)` | [#328](https://github.com/mrpotatodip/ts-elise/issues/328) |
| `business_profiles` | contact facts only (description, website, phone, email, address); free-form topics are FAQs (knowledge_documents was merged into `tenant_faqs`), grouped by the Tenant's own `tenant_faq_categories` | [#328](https://github.com/mrpotatodip/ts-elise/issues/328) |
| `chat_bot_threads` | `user_id` moves off; a thread has no owner columns | 2026-10-04 design change |
| `chat_bot_thread_sessions` | new, one per thread: `tenant_id` (required), and either `user_id` (signed-in) or `anonymous_id` + `expires_at` (anonymous). CHECK enforces exactly one | 2026-10-04 design change |
| `chat_bot_messages` | + `tenant_id` (required; composite FK to its Thread session's Tenant), + `dismissed_at`. Missing topics and menu cards live in `tools_used` / `structure` | 2026-10-04 design change |
| `chat_bot_runs` | + `model`, `input_tokens`, `cached_tokens`, `output_tokens` (one run = one model turn) | 2026-10-04 design change |
| `chat_bot_triggers` / `chat_bot_modules` | + rows trigger `widget`, module `customer` | 2026-10-04 design change |
| `imports` | new: `tenant_id`, `status` (`running | ready | failed`), `error`, `created_at`, `finished_at` | [#333](https://github.com/mrpotatodip/ts-elise/issues/333) |
| `import_drafts` | new: `tenant_id`, `import_id`, `kind` (`menu_category | menu_item | business_hours | hours_override | faq | knowledge_document | business_profile`), `data jsonb` (one Zod schema per kind), `source_file` (R2 key), `review_note`, `status` (`pending | approved | discarded`) | [#333](https://github.com/mrpotatodip/ts-elise/issues/333) |

Application-level integrity checks: a Menu item's category, and each dietary-tag link's Menu item, must have the same `tenant_id` as the row pointing at them.

### Tenant isolation

- `tenant_id` is the only isolation key. Every Tenant-owned query filters `WHERE tenant_id = ?`.
- On the public chat, the Tenant is resolved **once**, from the slug, when an anonymous thread starts. After that the Tenant is read from the thread row. The browser never sends a `tenant_id`, and public endpoints never return one.
- In the dashboard, the Tenant comes from the signed-in Person's Tenant Member rows.
- No generic query function exists. The model never chooses a Tenant.

### Knowledge layer and the agent ([#327](https://github.com/mrpotatodip/ts-elise/issues/327))

- One Tenant-scoped knowledge layer: query functions for the menu (categories with notes, items, Variants, Dietary tags), Business hours + Hours overrides, the Business profile, and FAQs by category. Each one takes `tenantId`. The loader also renders "right now" (open or closed in the Tenant's timezone) and the next 7 real dates.
- The agent reads knowledge only through this layer. For the MVP, `loadTenantKnowledge(tenantId)` renders the Tenant's whole knowledge into the system prompt (≈2K tokens for a café's menu, ~95% served from OpenAI's prompt cache). Menu item ids are visible to the model so replies can reference them.
- Scoped tools (`searchMenu`, `getBusinessHours`, …) can be added later on the same functions, when a Tenant's knowledge gets too big for the prompt. That's an optimisation, not a structural change.
- The assistant is a new chat-bot agent, `agents/customer/`: its prompt is the shared guard rail plus `loadTenantKnowledge(thread.tenantId)`, and it runs on the existing chat-bot pipeline (runs, streaming, resume). Each model call sends the last 20 Messages (`CHAT_BOT_MODEL_MESSAGE_LIMIT`).

Prototype evidence (La Sorella's real menu, 21 questions): whole prompt ≈ $0.00006 and 1.9 s per question, versus tools ≈ $0.00020 and 3.8 s.

### Reply shape ([#331](https://github.com/mrpotatodip/ts-elise/issues/331), revised)

The reply streams as text, like every chat-bot reply. Two server-side tools on the `customer` agent carry the structured parts; their results land in the message's `tools_used` and `structure`, as calculator results do today:

- `reportMissingInformation({ topic })` when any part of the question can't be answered from the Tenant's knowledge. A partial answer counts as missing ("Vegan options, and do you have parking?" reports `"parking"`).
- `showMenuItems({ ids })` for items the reply recommends. It keeps only ids belonging to the thread's Tenant and returns name, price, Variants and image for the cards.

### Public chat API ([#330](https://github.com/mrpotatodip/ts-elise/issues/330), revised)

Separate public routes beside the signed-in `/chat-bot/*`, e.g. `/public/chat-bot/*`:

- **Start an anonymous thread** with `{ slug }` and an `X-Anonymous-Id` header (generated by the server if missing). The server resolves the Tenant, creates the thread (trigger `widget`, module `customer`) and returns its id, never a `tenant_id`.
- **Stream a turn** and **read a thread** with the thread id plus `X-Anonymous-Id`. The server only accepts the thread if both match and it hasn't expired.
- **Expiry:** 30 minutes idle, 24 hours hard cap. `expires_at` slides forward on each message until the cap. When it has expired, the widget quietly starts a new thread and history isn't carried over.
- **`anonymous_id`:** a random id the widget creates once and keeps. It's half of the thread credential and the per-Customer rate-limit key, never a way to list past threads.
- **Limits** (named constants, not per Tenant):

  | Limit | Value | Enforced by |
  |---|---|---|
  | Message length | 500 characters | Zod |
  | Request body | 4 KB | Hono body limit |
  | New anonymous threads per IP | 10 a minute | Workers Rate Limiting binding |
  | Messages per `anonymous_id` (or IP) | 10 a minute | Workers Rate Limiting binding |
  | Messages per anonymous thread | 30 | DB count |
  | Messages per Tenant per day (Tenant's timezone) | 1,000 | DB count |

  No Turnstile.
- **Errors:** `429` in the standard envelope `{ data: null, error: { code, message } }`:
  - `RATE_LIMITED`: "You're sending messages quickly. Try again in a moment."
  - `THREAD_LIMIT`: "This chat is getting long. Start a new one?"
  - `TENANT_DAILY_LIMIT`: "Our assistant is resting for today. Contact <business> at <phone> or <email>."
- **Allowed origins:** the chat page sends `Content-Security-Policy: frame-ancestors <allowed_origins>`. If the list is empty, or the slug is unknown, it sends `frame-ancestors 'none'` and the page cannot be framed. Top-level Amelie chat still works. See `widget-embed.md`.

### Menu import ([#333](https://github.com/mrpotatodip/ts-elise/issues/333))

- **Uploads only:** one PDF or up to 10 images per Import, stored in R2 under `imports/<tenant_id>/<import_id>/…`. Website crawling is out of scope.
- **Create Import** stores the files, creates the `imports` row and sends **one queue message**. The consumer extracts each file with `gpt-6-luna` (it reads menu images; verified on La Sorella's JPG) and writes one `import_drafts` row per extracted record, with a `review_note` where the extractor is unsure (unlabelled size prices, section-wide notes, a menu that looks old).
- **Dashboard API:** list an Import's drafts, edit a draft, approve or discard a draft, approve all, and publish the Import.
- **Publish** copies the approved drafts into the live tables in **one transaction**:
  - Menu: "replace the menu" (the default) or "add to the menu".
  - Hours replace the weekly hours.
  - Profile fields fill in only what's empty.
- A re-import creates fresh drafts, with no comparison against what's live.
- The assistant never reads `import_drafts`.

### Dashboard (`amelie-frontend-web`, signed in)

- **Knowledge editing:** Business profile, weekly hours, Hours overrides, Menu categories (with note), Menu items (Variants, Dietary tags, availability), FAQs with categories, and menu Imports with draft review.
- **Customer threads list** (anonymous threads of the Tenant).
- **Unanswered list:** newest first. Each row shows the Customer's question (the preceding `user` Message), the topic from `reportMissingInformation` in the assistant message's `structure`, and the date, with a weekly count on top. Rows can be dismissed (`dismissed_at`). No topic grouping.
- Uses the existing server-function pattern (`createServerFn` + `apiClient`).
- Screen layout is design work, not specified here.

### Retention ([#336](https://github.com/mrpotatodip/ts-elise/issues/336))

A daily cron job deletes anonymous threads 90 days after `expires_at`, with their runs and Messages. Signed-in threads are untouched. The 90 days is a named constant.

### Embeddable widget

Decided. See `widget-embed.md` in this folder (lab issues #2–#5). A script tag opens an iframe of `/chat/<slug>`. CSP `frame-ancestors` is the embed lock.

### ⚠️ Gap: menu item images ([#334](https://github.com/mrpotatodip/ts-elise/issues/334), paused)

Still open:
- what `menu_items.image_url` holds (an R2 key or a public URL)
- the upload endpoint and its limits
- how images are served
- the per-Tenant key layout
- what happens to an image on delete or re-import

## Testing Decisions

- Test **external behaviour through the public interfaces** (HTTP routes and the knowledge layer's functions), not internals. Prior art: the vitest suites in `amelie-engine-api` (`src/__tests__/`, `modules/chat-bot/__tests__/`), which run without the Cloudflare plugin.
- **Tenant boundary** (from the Party-model spec), run against two seeded Tenants:
  1. Sorella can read its own menu.
  2. Another Tenant can't read Sorella's menu.
  3. An anonymous thread belongs to exactly one Tenant.
  4. A Message is reachable only through its thread (and, for an anonymous thread, the matching anonymous id).
  5. A Tenant Member can't reach another Tenant's resources.
  6. A Menu item can't reference another Tenant's category. Also: a dietary-tag link can't cross Tenants.
- **Reply filtering:** a reply whose `menuItemIds` include a foreign or made-up id returns and stores only the Tenant's own ids.
- **Public chat:** expired-thread handling; a wrong `X-Anonymous-Id` is refused; each 429 code at its limit; message-length and body-size rejection; a `tenant_id` in the request is ignored.
- **Import publishing:** replace vs add for the menu; discarded drafts never go live; publishing is all-or-nothing.
- **Retention:** the cron job deletes only anonymous threads past 90 days, never signed-in ones.
- The model itself is not unit-tested. Answer quality is checked with the retrieval prototype's question set (on branch `research/amelie-retrieval-prototype`) as part of agent tuning.

## Out of Scope

- **Agent quality tuning:** prompt wording, a precomputed next-7-days schedule, `reportMissingInformation` calibration, scoped tools for large menus, system prompt and prompt-injection hardening, streaming.
- **Usage and cost:** model prices, per-message cost, import usage, the dashboard usage card. Token counts are still stored.
- **Website crawling** for Imports (research on [#332](https://github.com/mrpotatodip/ts-elise/issues/332)).
- **Members:** inviting a second Tenant Member; `admin` vs `member` permissions.
- **Unanswered follow-ups:** grouping similar Unanswered topics; one-click "turn an unanswered question into an FAQ".
- **Accounts:** self-serve sign-up and email verification.
- **Search:** vector search / pgvector.
- **Business actions:** reservations, ordering, payments, POS/CRM, WhatsApp, voice, Customer accounts.
- **Widget look:** branding beyond the business name.

## Further Notes

- **Pilot:** "Sorella Cafe", added by hand. Its real URL is still unconfirmed. The prototypes used La Sorella (Fishkill, NY) as a stand-in.
- **New bindings `amelie-engine-api` needs:** a queue (Imports), an R2 bucket (import files; images ⚠️ #334), Workers Rate Limiting, and a cron trigger (retention).
- **Primary sources:**
  - research: `research/amelie-model-ai-gateway`, `research/amelie-website-import`
  - prototype: `research/amelie-retrieval-prototype`
