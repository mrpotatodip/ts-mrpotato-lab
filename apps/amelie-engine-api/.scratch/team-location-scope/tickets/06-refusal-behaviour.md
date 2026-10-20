---
type: grilling
status: closed
blocked-by: [04-binding-shape.md, 05-which-powers-are-bound.md]
claimed-by: claude
---
# What does a bound member get outside their binding?

## Question

403 on writes to another Location, filtered lists for reads (location picker, hours, threads)? What does a Chat thread or unanswered question for an out-of-scope Location look like to them?

## Resolution

- A marked write at a Location outside the binding is refused with 403 and a plain message ("Your Role does not cover this Location"). Nothing is written.
- A marked read of one Location outside the binding is refused the same way: a binding limits the Power as a whole. Lists of Locations (the picker, any Location list) show only covered Locations.
- A request with no Location named follows the existing default, applied to the covered Locations. One covered Location is used without naming it. Several covered and none named answers "needs location" with only the covered options. A Country binding with one Location in it behaves like the one-Location case.
- A request naming several Locations (`locationIds`) is refused whole if any is uncovered: 403, nothing written, the message names the uncovered Locations.
- Customer threads and unanswered questions stay open as their Role grants (their Powers are unmarked, ticket 5). Filtering them by binding is a possible later option, not decided here.
- The dashboard hides uncovered Locations from every picker and list. A deep link to one shows the "Your Role does not cover this Location" message, built on the 403.
