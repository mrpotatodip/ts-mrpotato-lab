import { useState } from "react";
import { Link, useRouteContext, useRouterState } from "@tanstack/react-router";
import { ChevronUp, CreditCard, History, KeyRound, Settings, Wallet, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { cn } from "#/lib/utils";
import type { SETTINGS_PAGES } from "../constants";
import { settingsPagesFor } from "../utils";
import { NAV_ACTIVE, NAV_CHEVRON, NAV_ICON, NAV_ROW, NAV_TOGGLE, NavHint } from "./shell-nav";
import { TREE_ITEM, TREE_ITEM_LINE, TREE_LINK } from "./shell-repo-tree";

const PAGE_ICONS = {
  "/settings/budget": Wallet,
  "/settings/plan": CreditCard,
  "/settings/providers": KeyRound,
  "/settings/history": History,
} as const satisfies Record<(typeof SETTINGS_PAGES)[number]["to"], LucideIcon>;

// -----
// Settings with its pages under it, like Repositories with its repos. The
// group lists only the pages the reader's Powers open, and the Settings row
// leads to the first of them. It is open while the reader is in Settings, and
// a click on the chevron overrides that until the page is reloaded. The
// collapsed sidebar keeps one icon, which leads to the first page.
// -----
export function ShellSettingsNav({ collapsed }: { collapsed: boolean }) {
  const { user } = useRouteContext({ from: "/_app" });
  const pages = settingsPagesFor(user?.powers ?? []);
  const inSettings = useRouterState({ select: (state) => state.location.pathname.startsWith("/settings") });
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? inSettings;

  if (pages.length === 0) return null;
  const first = pages[0].to;

  if (collapsed) {
    return (
      <NavHint label="Settings" collapsed>
        <Link to={first} aria-label="Settings" className={cn(NAV_ROW, "justify-center px-0", inSettings && NAV_ACTIVE.className)}>
          <Settings className={NAV_ICON} strokeWidth={1.5} />
        </Link>
      </NavHint>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setChosen}>
      <div className="relative">
        <Link to={first} className={cn(NAV_ROW, "pr-10", inSettings && NAV_ACTIVE.className)}>
          <Settings className={NAV_ICON} strokeWidth={1.5} />
          Settings
        </Link>
        <CollapsibleTrigger aria-label={open ? "Hide settings pages" : "Show settings pages"} className={NAV_TOGGLE}>
          <ChevronUp className={NAV_CHEVRON} strokeWidth={1.5} />
        </CollapsibleTrigger>
      </div>
      <CollapsiblePanel>
        <ul aria-label="Settings pages" className="ml-[1.4rem] mt-0.5 grid grid-cols-[minmax(0,1fr)] pb-1">
          {pages.map(({ to, label }, index) => {
            const Icon = PAGE_ICONS[to];
            return (
              <li key={to} className={cn(TREE_ITEM, index < pages.length - 1 && TREE_ITEM_LINE)}>
                <Link to={to} className={TREE_LINK} activeProps={NAV_ACTIVE}>
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.5} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </CollapsiblePanel>
    </Collapsible>
  );
}
