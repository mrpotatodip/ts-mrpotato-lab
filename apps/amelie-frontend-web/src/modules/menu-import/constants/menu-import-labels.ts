import type { ImportDraft } from "@repo/contracts/amelie";
import type { PublishMode } from "../utils";

export const STATUS_LABEL = { running: "Reading...", ready: "Ready to review", failed: "Failed" } as const;

export const KIND_TITLE = {
  menu_category: "Menu categories",
  menu_item: "Menu items",
  business_hours: "Weekly hours",
  business_profile: "Contact details",
} as const satisfies Record<ImportDraft["kind"], string>;

export const MODE_LABEL = {
  replace: "Replace my menu (the old menu is deleted)",
  add: "Add to my menu (keep what I have)",
} as const satisfies Record<PublishMode, string>;
