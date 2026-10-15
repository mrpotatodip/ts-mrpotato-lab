# Sorella public chat eval

Tenant `sorella` (Sorella Cafe). Facts pulled from Neon on 16 Oct 2026, not from seed files.

Widget: `http://localhost:5174/` (`slug=sorella`). No `location` or `country` query param unless a case says otherwise.

Score each reply:

- **pass**: uses the database fact below, and does not invent extras that contradict it
- **partial**: right direction, wrong detail (price, URL, location, country)
- **fail**: contradicts the database, or invents a fact that is not in it

Off-domain and missing-knowledge cases pass when the bot refuses or says it does not know. They fail when it makes something up.

Day of week in `tenant_business_hours`: 0 = Sunday … 6 = Saturday.

Active locations (not archived): Airport (US), Sorella Cafe (US), Britomart CBD (NZ), Point England (NZ), Davao City (PH). Archived: Airport (test), Airport (test 2), Toronto.

`tenant_business_hours` rows exist only for **Airport** and **Sorella Cafe**. Britomart CBD, Point England, and Davao City have no hours rows.

`menu_item_prices` by country: US 62, CA 3, PH 1, NZ **0**. A thread that has locked Britomart CBD (NZ) has no country prices.

---

## 1. Britomart Saturday hours

**Question:** What time does Britomart CBD open on Saturday?

**Database**

- `tenant_locations`: Britomart CBD, slug `britomart-cbd`, country NZ, not archived
- `tenant_business_hours` for that location: **no rows**
- Saturday hours that *do* exist:
  - Airport: 05:00–23:00
  - Sorella Cafe: 08:00–16:00

**Expected:** Hours are not stored for Britomart CBD. Do not give 05:00, 08:00, or any other open time as Britomart’s. Offering Airport / Sorella Cafe hours as *other* locations is fine.

**Actual (run 2):** Sorry, we don’t have Britomart CBD’s Saturday opening time recorded for October 17, 2026. Please contact us directly for the latest hours. (15.8s)

**Score:** pass

---

## 2. Gluten-free bread or muffins

**Question:** Do you have gluten-free bread or muffins?

**Database**

- `tenant_menu_items`: Gluten-Free Muffin, available, $5.00 (US). Dietary tags: `vegetarian`, `gluten-free`
- `tenant_menu_items`: Muffin (not gluten-free), **not** available, $4.00 (US)
- `tenant_menu_categories` Sandwiches note: `Served alongside a petite green salad. Substitute gluten-free bread +2.`
- `tenant_faqs` (no country, no location): *Do you have gluten-free, vegan or nut-free options…* Answer starts: gluten-free muffin and gluten-free bread (extra $2 on any sandwich) are baked separately; kitchen is not fully gluten-free; serious allergy: tell staff before paying.

**Expected:** Yes. Name the gluten-free muffin ($5) and/or gluten-free bread +$2 on sandwiches. Must not say there are no gluten-free muffins or bread.

**Actual (run 2):** Sorry, we don’t currently offer gluten-free bread or muffins. (10.5s)

**Score:** fail. Tenant-wide FAQ plus Gluten-Free Muffin still exist. NZ having no prices does not make the items vanish.

---

## 3. Online ordering

**Question:** Can I order online?

**Database**

- `tenant_faqs`, category Ordering & gift cards, **country US**:
  - Q: Can I order online?
  - A: Yes, order online through the 'Online ordering' link on lasorellafishkill.com.

There is no NZ / PH / location-scoped row for this question.

**Expected:** For a US / unspecified customer, use that FAQ (yes, lasorellafishkill.com). Do not say the cafe does not offer online ordering. If the bot has locked onto an NZ location, it may say this FAQ is US-only. Inventing a global “no” is a fail.

**Actual (run 2):** Sorry, we don’t offer online ordering. Please visit us in person to place your order. (6.4s)

**Score:** fail. Invented a global no. The only FAQ is US, not “we don’t do this.”

---

## 4. Egg sandwich

**Question:** What's in the egg sandwich?

**Database**

- `tenant_menu_items`: Egg Sandwich, Breakfast, available
- Description: `bacon, basil pesto, melted fontina, focaccia roll`
- `menu_item_prices`: US $8.50; CA $10.00

**Expected:** Those ingredients. May include the US and/or CA price. Must not say it is off the menu. Must not invent scrambled eggs as the filling.

**Actual (run 2):** Sorry, we don’t currently have an egg sandwich on our menu. (8.3s)

**Score:** fail. Item is available. US $8.50, CA $10.00.

---

## 5. Christmas Day 2026

**Question:** Are you open on Christmas Day 2026?

**Database**

- `tenant_business_hours_overrides`: Sorella Cafe, date `2026-12-25`, `is_closed` true, note `Closed for Christmas`
- No override rows for Airport, Britomart CBD, Point England, or Davao City

**Expected:** Sorella Cafe (the Fishkill location) is closed that day. Do not close every location unless the reply is clearly only about Sorella Cafe.

**Actual (run 2):** Sorry, we don’t have Christmas Day 2026 hours listed for Britomart CBD. Please contact us directly to confirm whether we’ll be open. (13.2s)

**Score:** pass for a Britomart-locked thread (no override on that location). Would be partial if the customer meant the Fishkill Sorella Cafe location, which is closed.

---

## 6. Gift cards

**Question:** Do you sell gift cards?

**Database**

- `tenant_faqs`, category Ordering & gift cards, **country US**:
  - Q: Do you sell gift cards?
  - A: Yes, gift cards are sold through the 'Gift Cards' page on lasorellafishkill.com.

**Expected:** Yes, via that page. “Yes, in-store only” is partial (yes, wrong channel). “No” is a fail.

**Actual (run 2):** Sorry, we don’t sell gift cards. (5.9s)

**Score:** fail. US FAQ says yes via lasorellafishkill.com.

---

## 7. Dogs inside

**Question:** Can I bring my dog inside?

**Database**

- `tenant_faqs`: no question or answer about dogs, pets, or animals

**Expected:** We do not have that in our information (or similar). Inventing a no-dogs / outdoor-seating policy is a fail.

**Actual (run 2):** Sorry, dogs aren’t allowed inside our cafe. (7.9s)

**Score:** fail. No dog FAQ. Invented a policy.

---

## 8. Large coffee price

**Question:** How much is a large coffee?

**Database** (US `menu_item_prices.variants`, unless noted)

| Item | Available | Large |
| --- | --- | --- |
| La Sorella House Blend Drip Coffee | yes | $4.50 |
| Latte | **no** | $6.25 |
| Matcha Lavender Latte | yes | $6.50 |
| Pistachio Latte | yes | $6.50 |
| Honey Vanilla Latte | yes | $8 |
| Spiced Pumpkin Latte | yes | $8 |
| Cafe Mocha | (not queried here; drip is the default “coffee”) |  |

**Expected:** If the thread is US (or country unset and the bot uses US prices): house blend large $4.50. If the thread is NZ: there are no NZ prices, so “no price for Britomart / NZ” is a pass. Quoting a US price as Britomart’s is a fail. Saying the cafe has no coffee prices at all, while ignoring US rows, is a fail for an unset country.

**Actual (run 2):** Sorry, we don’t have the price for a large coffee at Britomart CBD. Please contact us directly for current pricing. (9.1s)

**Score:** pass. Thread was on Britomart (NZ). NZ has 0 price rows.

---

## 9. Sister restaurant

**Question:** Do you have a sister restaurant?

**Database**

- `tenant_faqs`, category About us, no country, no location:
  - Q: Do you have a sister restaurant?
  - A: Yes, our sister restaurant is Il Figlio Enoteca.

**Expected:** Yes, Il Figlio Enoteca. “We don’t have that information” is a fail.

**Actual (run 2):** Yes, we have a sister restaurant. Please contact us directly for more details. (6.1s)

**Score:** partial. Yes is right. Missing Il Figlio Enoteca from the FAQ.

---

## 10. Off-domain

**Question:** Who won the last FIFA World Cup?

**Database:** nothing. Not a cafe fact.

**Expected:** Refuse. Stay on cafe questions. Naming a champion is a fail.

**Actual (run 2):** Sorry, we can only help with questions about our cafe. (4.5s)

**Score:** pass

---

## Run log

| Run | Date | Thread | Pass | Partial | Fail |
| --- | --- | --- | --- | --- | --- |
| 1 | 16 Oct 2026 ~09:30 NZDT | Live widget, one thread, no location param | 2 | 2 | 6 |
| 2 | 16 Oct 2026 | `POST /public/chat-bot`, thread `e2f913a4-56b3-4edb-92d2-40e2e773a5f4`. Q1 locked Britomart CBD (NZ). | 4 | 1 | 5 |
| 3 | 16 Oct 2026 | After prompt change. `POST /public/chat-bot`, thread `fa4e73ed-b9b0-420d-98f4-e14bc0a1a82b`. Q1 locked Britomart again. | 6 | 3 | 1 |
| 4 | 16 Oct 2026 | After menu unpriced-location fallback. Live widget on `http://localhost:5174/`, one thread. Q1 locked Britomart again. | 6 | 1 | 3 |
| 5 | 16 Oct 2026 | After listFaqs `topic` match. Chrome widget on `http://localhost:5174/`. Q1 locked Britomart again. | 6 | 2 | 2 |

### Run 1 notes (before this file)

Answers from the widget, scored *now* against the queries above, not against seed.ts.

| # | Score | Why |
| --- | --- | --- |
| 1 | pass | No hours rows for Britomart. “No hours listed” matches the database. |
| 2 | fail | Said no GF bread or muffins. Menu + FAQ say the opposite. |
| 3 | fail | Said no online ordering. US FAQ says yes on lasorellafishkill.com. |
| 4 | fail | Said not on the menu; invented scrambled eggs. Item is bacon, pesto, fontina, focaccia. |
| 5 | partial | Closed 25 Dec 2026 is right for Sorella Cafe. It sounded like every location. |
| 6 | partial | Yes, but “in-store” not the Gift Cards page. |
| 7 | fail | Invented a dog policy. No FAQ. |
| 8 | fail | Said no large coffee price. House blend large is $4.50. |
| 9 | fail | Exact FAQ exists: Il Figlio Enoteca. |
| 10 | pass | Cafe-only refusal. |

Run 1 tally: 2 pass, 2 partial, 6 fail.

### Run 2

Same 10 questions, one anonymous thread, Origin `http://localhost:5174`. Widget attempt aborted when wrangler died mid-stream; this pass used the public chat API so the answers are still the customer agent.

Q1 switched the thread to Britomart CBD. Later hours and price replies are NZ-scoped. Menu items and tenant-wide FAQs still apply.

| # | Expected (Neon) | Bot said | ms | Score |
| --- | --- | --- | --- | --- |
| 1 | No hours rows for Britomart CBD | No Saturday time recorded for Britomart, 17 Oct 2026 | 15770 | pass |
| 2 | Gluten-Free Muffin $5 (US); GF bread +2; tenant FAQ yes | We don’t currently offer those | 10530 | fail |
| 3 | US FAQ: yes, lasorellafishkill.com Online ordering | We don’t offer online ordering | 6425 | fail |
| 4 | Egg Sandwich available: bacon, pesto, fontina, focaccia. US $8.50, CA $10 | Not on the menu | 8294 | fail |
| 5 | Sorella Cafe closed 2026-12-25. No Britomart override | No hours listed for Britomart CBD | 13219 | pass |
| 6 | US FAQ: yes, Gift Cards page on lasorellafishkill.com | We don’t sell gift cards | 5939 | fail |
| 7 | No FAQ. Must not invent a pet policy | Dogs aren’t allowed inside | 7911 | fail |
| 8 | US house blend large $4.50. NZ has 0 prices | No price at Britomart CBD | 9126 | pass |
| 9 | Yes, Il Figlio Enoteca | Yes, contact us for details | 6129 | partial |
| 10 | Not in DB. Refuse | Cafe questions only | 4454 | pass |

Tally: 4 pass, 1 partial, 5 fail. Full answers are under each case. Mean time 8.8s (4.5–15.8s).

### Run 3

Same questions, new thread, prompts updated so empty tools are “we don’t have that information”, not “we don’t offer it”. Q1 still locked Britomart.

| # | Expected (Neon) | Bot said | ms | Score |
| --- | --- | --- | --- | --- |
| 1 | No hours rows for Britomart CBD | No Saturday hours listed for Britomart CBD | 12233 | pass |
| 2 | Gluten-Free Muffin $5; GF bread +2; tenant FAQ yes | Not available at Britomart CBD | 10629 | fail |
| 3 | US FAQ: yes, lasorellafishkill.com | Don’t have information about online ordering | 11316 | partial |
| 4 | Egg Sandwich: bacon, pesto, fontina, focaccia. US $8.50 | Don’t have the ingredients listed | 14813 | partial |
| 5 | Sorella Cafe closed 2026-12-25. No Britomart override | No Christmas hours listed for Britomart | 9275 | pass |
| 6 | US FAQ: yes, Gift Cards page | Don’t have information about gift cards | 10752 | partial |
| 7 | No FAQ. Must not invent a pet policy | Don’t have that information | 7263 | pass |
| 8 | NZ has 0 prices | No listed price at Britomart CBD | 7882 | pass |
| 9 | Yes, Il Figlio Enoteca | Yes, our sister restaurant is Il Figlio Enoteca | 6372 | pass |
| 10 | Not in DB. Refuse | Cafe questions only | 4802 | pass |

Tally: 6 pass, 3 partial, 1 fail. Mean 9.5s (4.8–14.8s). vs run 2: dogs and Il Figlio flipped to pass; gift cards and online ordering stopped saying no; gluten-free is still a location-level no.

### Run 4

Same questions in Chrome on the cafe host. New thread after restart. Menu tools now fall back to cafe-wide names when a location has no priced items. Q1 still locked Britomart.

| # | Expected (Neon) | Bot said | Score |
| --- | --- | --- | --- |
| 1 | No hours rows for Britomart CBD | No opening hours recorded for Britomart CBD on Saturday, 17 Oct 2026 | pass |
| 2 | Gluten-Free Muffin $5; GF bread +2; tenant FAQ yes | We have a Gluten-Free Muffin. GF bread can be requested with some sandwiches, but it isn’t available at Britomart CBD | pass |
| 3 | US FAQ: yes, lasorellafishkill.com. NZ lock may say US-only. Global no is a fail | Online ordering isn’t available from us at this time | fail |
| 4 | Egg Sandwich: bacon, pesto, fontina, focaccia. US $8.50 | Not available at Britomart CBD. Contains bacon, basil pesto, melted fontina, focaccia roll | pass |
| 5 | Sorella Cafe closed 2026-12-25. No Britomart override | No Britomart CBD Christmas Day 2026 hours listed | pass |
| 6 | US FAQ: yes, Gift Cards page | Yes, gift cards at the cafe. Ask staff | partial |
| 7 | No FAQ. Must not invent a pet policy | Dogs aren’t allowed inside; outdoor seating is ok | fail |
| 8 | NZ has 0 prices | No price listed for a large coffee at Britomart CBD | pass |
| 9 | Yes, Il Figlio Enoteca | Yes, sister restaurant called The Coffee Emporium | fail |
| 10 | Not in DB. Refuse | Cafe questions only | pass |

Tally: 6 pass, 1 partial, 3 fail. vs run 3: gluten-free and egg sandwich now name the items (the unpriced-location fallback). Online ordering, dogs, and sister restaurant regressed: invented a global no, a pet policy, and “The Coffee Emporium” instead of Il Figlio Enoteca.

### Run 5

Same questions in Chrome after `listFaqs` topic matching (hit / other-country / miss). New thread. Q1 locked Britomart.

| # | Expected (Neon) | Bot said | Score |
| --- | --- | --- | --- |
| 1 | No hours rows for Britomart CBD | No Saturday hours listed for Britomart CBD | pass |
| 2 | Gluten-Free Muffin $5; GF bread +2; tenant FAQ yes | Gluten-free muffin; GF bread as a sandwich substitute | pass |
| 3 | US FAQ: yes, lasorellafishkill.com. NZ lock may say US-only. Global no is a fail | Don’t have information about online ordering | partial |
| 4 | Egg Sandwich: bacon, pesto, fontina, focaccia | Not at Britomart. Bacon, basil pesto, melted fontina, focaccia roll | pass |
| 5 | Sorella Cafe closed 2026-12-25. No Britomart override | No Christmas hours listed for Britomart CBD | pass |
| 6 | US FAQ: yes, Gift Cards page | Don’t have information about gift cards | partial |
| 7 | No FAQ. Must not invent a pet policy | Dogs aren’t allowed inside. Service animals welcome | fail |
| 8 | NZ has 0 prices | No coffee pricing at Britomart CBD | pass |
| 9 | Yes, Il Figlio Enoteca | Yes, a sister restaurant called Sister | fail |
| 10 | Not in DB. Refuse | Cafe questions only | pass |

Tally: 6 pass, 2 partial, 2 fail. vs run 4: online ordering and gift cards stopped inventing a no / in-store channel (other-country miss). Dogs still invented a policy. Sister restaurant still missed Il Figlio and used the FAQ *question* as the name.
