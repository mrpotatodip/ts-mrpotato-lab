import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronUp, History, KeyRound, Settings, Wallet } from "lucide-react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "#/components/ui/collapsible";
import { cn } from "#/lib/utils";
import { NAV_ACTIVE, NAV_CHEVRON, NAV_ICON, NAV_ROW, NAV_TOGGLE, NavHint } from "./shell-nav";
import { TREE_ITEM, TREE_ITEM_LINE, TREE_LINK } from "./shell-repo-tree";

const CHILDREN = [
  { to: "/settings/budget", label: "Budget", icon: Wallet },
  { to: "/settings/providers", label: "Providers", icon: KeyRound },
  { to: "/settings/history", label: "History", icon: History },
] as const;

// -----
// Settings with its pages under it, like Repositories with its repos. The
// group is open while the reader is in Settings, and a click on the chevron
// overrides that until the page is reloaded. The collapsed sidebar keeps one
// icon, which leads to the first page.
// -----
export function ShellSettingsNav({ collapsed }: { collapsed: boolean }) {
  const inSettings = useRouterState({ select: (state) => state.location.pathname.startsWith("/settings") });
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? inSettings;

  if (collapsed) {
    return (
      <NavHint label="Settings" collapsed>
        <Link to="/settings/budget" aria-label="Settings" className={cn(NAV_ROW, "justify-center px-0", inSettings && NAV_ACTIVE.className)}>
          <Settings className={NAV_ICON} strokeWidth={1.5} />
        </Link>
      </NavHint>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setChosen}>
      <div className="relative">
        <Link to="/settings/budget" className={cn(NAV_ROW, "pr-10", inSettings && NAV_ACTIVE.className)}>
          <Settings className={NAV_ICON} strokeWidth={1.5} />
          Settings
        </Link>
        <CollapsibleTrigger aria-label={open ? "Hide settings pages" : "Show settings pages"} className={NAV_TOGGLE}>
          <ChevronUp className={NAV_CHEVRON} strokeWidth={1.5} />
        </CollapsibleTrigger>
      </div>
      <CollapsiblePanel>
        <ul aria-label="Settings pages" className="ml-[1.4rem] mt-0.5 grid grid-cols-[minmax(0,1fr)] pb-1">
          {CHILDREN.map(({ to, label, icon: Icon }, index) => (
            <li key={to} className={cn(TREE_ITEM, index < CHILDREN.length - 1 && TREE_ITEM_LINE)}>
              <Link to={to} className={TREE_LINK} activeProps={NAV_ACTIVE}>
                <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.5} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </CollapsiblePanel>
    </Collapsible>
  );
}
