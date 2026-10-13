# Tenant region: country and currency

Status: spec, agreed in a grilling session. No code yet.

## Problem

Currency is hardcoded to `USD` in three places: the `tenant_menu_items.currency` column default, the menu item form, and `IMPORT_DEFAULT_CURRENCY` in menu-import. It is stored per menu item, so an item the owner never edits stays USD. Country does not exist in Amelie. A tenant in Manila sees USD on every imported item and has no place to fix it.

## Decisions

1. **One currency per business.** Per-item currency goes away.
2. **Stored on `tenants`**, next to `timezone`. Not on `tenant_business_profiles` (contact facts only).
3. **Country** is an ISO-3166 alpha-2 code. Its only job for now is to pre-select the currency. Currency stays an independent, editable field (a business in Cambodia can pick USD).
4. **Set at sign-up and editable later.** Sign-up pre-fills country from the browser locale and currency from country. Both are editable afterward in settings.
5. **Backfill** existing tenants with `US` / `USD`. Drop the column default afterward, so new tenants must supply both.
6. **Read payloads keep `currency`**, filled from the tenant by a join. Only the write input loses it. Bot tool schemas, bot prompts and the dashboard row are unchanged.
7. **Changing currency relabels only.** Prices keep their numbers, nothing is converted. The UI shows a confirm dialog saying so.
8. **Fixed lists, not free text.** Country and currency are validated against constants in `@repo/contracts` (in `constants.ts`). Sign-up form, settings form and API share them.
9. **Permission:** same as business profile (`canEdit`).
10. **UI:** a "Region" card on the business-profile panel with country and currency. Timezone editing is out of scope.
11. **Country-to-currency map** is a static array of `{ country, currency }` in `@repo/contracts`. If the browser locale has no region or an unsupported one, the field stays blank and the user must choose. No silent fallback to US.
12. **Edit endpoint** is a `PATCH` in the `tenant` module. The Region card calls the tenant module's hook. Sign-up (`create-account-svc`) takes both fields in its body.
13. **No chat-bot admin tool** to change them. The bot reads currency through existing `list-menu` results and does not see country.

## Plan

1. **Contracts:** `countries` constant (`{ country, currency }`), ISO-4217 currency list, tenant DTOs with both fields.
2. **DB (`db-amelie`):**
   - add `tenants.country` and `tenants.currency`, NOT NULL, backfilled `US` / `USD`, default dropped.
   - keep the `^[A-Z]{3}$` style check on the new currency column.
   - drop `tenant_menu_items.currency` and its check constraint.
3. **API (`amelie-engine-api`):**
   - sign-up takes both fields.
   - `PATCH` on `tenant`, gated by `canEdit`.
   - menu queries join currency from the tenant.
   - menu write DTO loses `currency`.
   - menu-import stops writing it. Remove `IMPORT_DEFAULT_CURRENCY`.
4. **Frontend (`amelie-frontend-web`):**
   - sign-up form: country and currency selects, pre-filled from the browser locale.
   - Region card on the business-profile panel, with a confirm dialog on currency change.
   - menu item form loses its currency input.
5. **Tests:** update menu and menu-import tests that mention currency. Add tenant PATCH and sign-up validation tests.

## Out of scope

- Editing timezone.
- Currency conversion.
- Phone formatting or bot awareness of country.
- Mixed-currency menus.

## Rollout

Contract change (breaking for old clients): `TenantSchema` responses now require `country` and `currency`, the sign-up body requires both, and `currency` is removed from the menu item write body (reads keep it).

Deploy order:
1. Run migrations 0017 to 0019 (0019 carries a tenant's single non-USD item currency over to the tenant before dropping `tenant_menu_items.currency`).
2. Deploy `amelie-engine-api`.
3. Deploy `amelie-frontend-web` straight after. A frontend from before this change fails to parse tenant responses and sends `currency` on menu writes (ignored), so keep the gap short.

Before 0019 in production: check for tenants whose items use more than one currency. Those keep their existing tenant currency and lose the per-item values.
