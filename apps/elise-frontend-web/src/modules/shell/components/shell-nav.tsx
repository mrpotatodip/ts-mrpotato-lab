import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";

export const NAV_ROW =
  "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const NAV_ACTIVE = { className: "bg-accent text-foreground" };
export const NAV_ICON = "size-[18px] shrink-0";
export const NAV_CHEVRON = "size-4 rotate-180 transition-transform group-data-[panel-open]:rotate-0";
export const NAV_TOGGLE =
  "group absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NavHint({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={<div className="w-full" />}>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
