---
type: grilling
status: closed
blocked-by: []
claimed-by: claude
---
# How does the check learn the target Location, and where does it run?

## Question

Marked Powers must be compared with the Location a request names (query, path or body, after the 'only Location' default). Does the check live in the shared requirePower middleware (which would need a per-route way to say where the target is) or in each service? How does it also cover the chat assistant's separate check (requireChatBotPower), a body with several Locations, and the filtered Location lists? What is the single place a reviewer looks to see a Power is bound?

## Resolution

- The binding check runs in a shared route guard, `requireBoundPower(power, locate)`, placed after the validator so the request is already parsed. `locate` returns the Location ids the request names, from the query, path or body. Plain `requirePower` stays for Powers that are not bound.
- The catalogue marker (ticket 5) produces a `BoundPower` type. `requirePower` accepts only unbound Powers and `requireBoundPower` only bound ones; the wrong guard is a compile error. The usage-map test also records which routes use which guard, so a reviewer sees it in one place.
- Coverage is loaded once per request next to the member's Powers, as either "all" or the list of covered open Location ids with Countries already expanded. Members with no bindings skip the extra query. The route guard, the chat assistant, the Location lists and the dashboard all read this one value.
- The "only Location" default keeps its existing resolution code, which now receives the member's covered Location ids as the candidates. Routes and the assistant's `resolveToolLocation` share that one helper. The guard checks the Locations a request names explicitly; the default for an omitted one happens in the helper, over the covered list.
- The chat assistant's admin tools use the same coverage value and the same bound/unbound split (through `requireChatBotPower`), so it cannot bypass a binding.
- The same coverage value goes out in the Tenant response the dashboard already loads, so pickers and lists can hide uncovered Locations. The server stays the authority and refuses with 403; the client only hides.
