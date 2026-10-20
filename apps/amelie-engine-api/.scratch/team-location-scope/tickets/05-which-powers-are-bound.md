---
type: grilling
status: closed
blocked-by: [01-which-routes-name-a-location.md]
claimed-by: claude
---
# Which Powers does a binding limit?

## Question

Only Location-level Powers (hours, store menu, availability), or every Power? Company-level Powers have no Location to compare. Needs the route facts first.

## Resolution

- A Power is limited by a binding only when the catalogue marks it. The marker is explicit and typed like the rest of the catalogue; the `store:` name prefix does not decide it.
- Marked Powers: all `store:` Powers (business hours, hours overrides, Location availability); `company:profile:locations:update` and `archive`; `company:menu:locations:update`; FAQ writes when the FAQ is scoped to a Location or Country; and business profile update, but only when the request names a Location (phone and address). The cafe-wide profile fields (description, website, email) stay open to any holder of the Power.
- Open to a bound member, as their Role grants: Team, master menu items, categories, images and import, Country management and Country prices, the widget, and the assistant.
- Creating a Location: allowed only inside a Country the member is bound to. A Location-only member cannot create one. An unbound member can create anywhere, as today.
- Changing what `store_admin` holds is out of scope here: a separate Role decision. A superuser can already make a narrower Role.
- The chat assistant's admin tools must apply the same marked-Power check (they use `requireChatBotPower`, not `requirePower`).
