# Follow-ups found while implementing

- **Assistant availability tools are not Location-scoped (from ticket 09).** `setMenuItemAvailability` and `setMenuItemsAvailability` flip the item's own `isAvailable` flag, which is one value for the whole cafe, under `store:menu:availability:update` checked with no Location named. A bound member can therefore make an item unavailable at Locations they do not cover. Scoping them needs a per-Location write (the sold-out Location rows, as `PUT /menu/items/:itemId/sold-out-locations` does) and a decision on what the tool's `isAvailable` then means.
