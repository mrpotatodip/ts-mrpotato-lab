# Customer widget embed

Decided in the grill for lab issues #2–#5. Replaces the paused #329 gap in `PRD.md`.

## What it is

A cafe pastes one script tag. That script draws an unbranded bubble. First click opens an iframe of Amelie's existing `/chat/<slug>` page (`PublicChatRoom`, `customer` agent, public chat API). No new agent and no second chat API.

## Snippet

```html
<script src="https://<amelie-origin>/widget.js" data-slug="sorella" defer></script>
```

Optional `data-location` and `data-country` become the same search params `/chat/$slug` already reads. `widget.js` is a static vanilla file. It takes its origin from its own `src`. Missing or invalid `data-slug` logs once and draws nothing. The first tag wins.

## Cafe page

Bottom-right bubble, "Chat with us". First click creates a ~380×640 iframe (near-full viewport on small screens) with `sandbox="allow-scripts allow-same-origin allow-forms"`. Later clicks hide and show that iframe. No `postMessage`. No mid-page embed. No cafe colors or logo. The chat composer is a form; without `allow-forms` the browser blocks submit inside the sandbox.

## Identity

Anonymous id and per-slug thread id stay in the iframe (Amelie `localStorage`). Resume after reload in the embed is best-effort if the browser partitions third-party storage.

## Who may frame

The Amelie chat page sets `Content-Security-Policy: frame-ancestors` from a slug-only engine lookup (`GET /public/chat-bot/frame-policy?slug=`). Empty Allowed origins or unknown slug: `'none'`. The lookup never returns a Tenant id. `widget.js` does not check origins. Local cafe testing requires that origin in `allowed_origins`. No `*` bypass.

The engine's `Origin` check on chat turns still sees Amelie's origin when the chat runs in the iframe. CSP on the chat page is the embed lock.

## Dashboard

Widget under Your cafe: read-only snippet with the Tenant slug, plus a link to `/chat/$slug`. No live preview. An owner or manager edits Allowed origins on that page (paste site URLs, Save replaces the list). Staff see the list and the snippet and cannot save. Sign-up `website` still seeds the first Allowed origin when given. The Business profile website stays a contact fact.

## Local cafe host

`amelie-frontend-host` is a stand-in cafe site at `http://localhost:5174`. It loads `widget.js` from `http://localhost:3000`. Query params: `slug`, `location`, `country`, `amelie`. Seed puts that origin on Sorella when Allowed origins is empty.

## Out of this work

Cafe branding, `postMessage`, dashboard live preview, menu item images, agent / prompt / public-chat API changes.
