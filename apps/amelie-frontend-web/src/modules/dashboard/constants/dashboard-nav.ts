import {
  Bot,
  Clock,
  FileText,
  FileUp,
  KeyRound,
  LayoutDashboard,
  LayoutList,
  Code,
  MessageSquareWarning,
  MessagesSquare,
  Store,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const DASHBOARD_NAV_SEPARATOR = { kind: "separator" } as const;

// -----
// The sidebar, grouped by what the owner is doing:
// looking, setting up the Tenant (catalog then chats),
// running a Location, or installing Amelie.
// -----
export const DASHBOARD_NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Company",
    items: [
      { to: "/business-profile", label: "Profile", icon: Store },
      { to: "/team", label: "Team", icon: Users },
      { to: "/menu", label: "Master menu", icon: UtensilsCrossed },
      { to: "/faqs", label: "FAQs", icon: FileText },
      DASHBOARD_NAV_SEPARATOR,
      { to: "/customers", label: "Chats", icon: MessagesSquare },
      { to: "/unanswered", label: "Unanswered", icon: MessageSquareWarning },
      { to: "/chat-bot", label: "Assistant", icon: Bot },
    ],
  },
  {
    label: "Store",
    items: [
      { to: "/hours", label: "Hours", icon: Clock },
      { to: "/store-menu", label: "Menu", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Integration",
    items: [{ to: "/widget", label: "Widget", icon: Code }],
  },
] as const;

export const DASHBOARD_MENU_SUBNAV = [
  { to: "/menu", label: "Items", icon: LayoutList },
  { to: "/imports", label: "Import", icon: FileUp },
] as const;

// -----
// Superusers only: the platform, not one cafe.
// -----
export const DASHBOARD_ADMIN_GROUP = {
  label: "Admin",
  items: [{ to: "/admin", label: "Invite codes", icon: KeyRound }],
} as const;

type DashboardNavGroupEntry = (typeof DASHBOARD_NAV_GROUPS)[number]["items"][number];

export type DashboardNavItem =
  | Exclude<DashboardNavGroupEntry, { kind: "separator" }>
  | (typeof DASHBOARD_ADMIN_GROUP)["items"][number];

export function isDashboardNavItem(
  item: DashboardNavGroupEntry | (typeof DASHBOARD_ADMIN_GROUP)["items"][number],
): item is DashboardNavItem {
  return !("kind" in item);
}

export const DASHBOARD_NAV_ITEMS = [...DASHBOARD_NAV_GROUPS, DASHBOARD_ADMIN_GROUP].flatMap<DashboardNavItem>(
  (group) => group.items.filter(isDashboardNavItem),
);

export const DASHBOARD_ACTIVITY_DAYS = 7;
export const DASHBOARD_RECENT_LIMIT = 5;

// -----
// Shared by every row link on the overview cards.
// -----
export const DASHBOARD_ROW_LINK_CLASS = "hover:bg-accent/40 flex px-6 py-5 transition-colors";
