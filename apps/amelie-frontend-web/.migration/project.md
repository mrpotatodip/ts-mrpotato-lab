# Radix to Base UI (whole project)

2026-10-11. Strategy: transformation engine on the project's own files (style `default` is legacy, so no golden-pair replay). Base UI 1.5.0. Verdict: all 12 Radix wrappers migrated, 11 `@radix-ui/*` packages removed.

## Changed

- Wrappers: `label` (native `<label>`), `separator`, `avatar`, `collapsible`, `checkbox`, `tabs`, `tooltip`, `button` (real `@base-ui/react/button`), `breadcrumb` (`useRender` + `mergeProps`), `sheet` (Base UI Dialog), `dropdown-menu` (Base UI Menu), `sidebar` (five `Slot` parts moved to `useRender`; Tooltip and Sheet usage updated).
- Call sites: `app-breadcrumb.tsx`, `dashboard-sidebar.tsx`, `chat-bot-thread-menu-item.tsx` (`asChild` to `render`), `chat-bot-thread-overflow.tsx` (`asChild` to `render`, `onSelect` to `onClick`).
- `package.json` and `pnpm-lock.yaml`: removed `@radix-ui/react-{avatar,checkbox,collapsible,dialog,dropdown-menu,label,select,separator,slot,tabs,tooltip}`. Other apps in the workspace keep their own Radix dependencies.
- Leftover scan: `grep -rn "radix" src` finds only a comment in `select.tsx`.

## Left alone

- `select`, `dialog`, `drawer`, `progress`, `bubble` were already Base UI. `sonner`, `recharts`, `embla` are not Radix.
- `components.json` still has style `default`: the CLI will deliver Radix variants for new components until it is changed.

## Behavior changes

- `Button` defaults to `type="button"` (it did not before). All 18 submit buttons set `type="submit"` explicitly and no bare button in a form relied on the old default.
- Tabs activate manually (focus then Enter/Space), not on focus. No `Tabs` consumer exists today.
- Menu items fire `onClick`, not `onSelect`; checkbox/radio menu items do not close on click by default. The `setTimeout(...)` around the rename and delete dialogs in the thread overflow menu was kept as it was and may no longer be needed.
- Tooltip provider takes `delay`, not `delayDuration`; the sidebar uses `delay={0}`.
- Tooltip, menu and sheet animations are transitions (`data-starting-style` / `data-ending-style`), not keyframes.

## Verify by hand

- Sidebar: click each nav link, check the active item, collapse and expand, narrow the window to get the mobile sheet. Hover a nav item while collapsed for its tooltip.
- Customer chat sheet: open, press Escape, check focus returns to the row (done in Chrome).
- Assistant page: with a saved thread, open the overflow menu, press Rename and Delete, use arrow keys and Escape. Not tested, because no thread exists in the dev data.
- Menu item form: toggle the tag and "available" checkboxes by clicking the label text.
- Sign-up: timezone select (already Base UI).
