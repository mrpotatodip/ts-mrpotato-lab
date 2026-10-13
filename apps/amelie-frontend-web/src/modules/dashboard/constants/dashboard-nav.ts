import {
  Bot,
  Clock,
  FileUp,
  KeyRound,
  LayoutDashboard,
  Code,
  MessageSquareWarning,
  MessagesSquare,
  CircleQuestionMark,
  Store,
  UtensilsCrossed,
} from "lucide-react";

// -----
// The sidebar, grouped by what the owner is doing:
// looking, setting up the cafe, or watching Customers.
// -----
export const DASHBOARD_NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Your cafe",
    items: [
      { to: "/business-profile", label: "Profile", icon: Store },
      { to: "/hours", label: "Hours", icon: Clock },
      { to: "/menu", label: "Menu", icon: UtensilsCrossed },
      { to: "/imports", label: "Import", icon: FileUp },
      { to: "/faqs", label: "FAQs", icon: CircleQuestionMark },
      { to: "/widget", label: "Widget", icon: Code },
    ],
  },
  {
    label: "Customers",
    items: [
      { to: "/customers", label: "Chats", icon: MessagesSquare },
      { to: "/unanswered", label: "Unanswered", icon: MessageSquareWarning },
      { to: "/chat-bot", label: "Assistant", icon: Bot },
    ],
  },
] as const;

// -----
// Superusers only: the platform, not one cafe.
// -----
export const DASHBOARD_ADMIN_GROUP = {
  label: "Admin",
  items: [{ to: "/admin", label: "Invite codes", icon: KeyRound }],
} as const;

export type DashboardNavItem =
  | (typeof DASHBOARD_NAV_GROUPS)[number]["items"][number]
  | (typeof DASHBOARD_ADMIN_GROUP)["items"][number];

export const DASHBOARD_NAV_ITEMS = [...DASHBOARD_NAV_GROUPS, DASHBOARD_ADMIN_GROUP].flatMap<DashboardNavItem>(
  (group) => group.items,
);

export const DASHBOARD_ACTIVITY_DAYS = 7;
export const DASHBOARD_RECENT_LIMIT = 5;

// -----
// Shared by every row link on the overview cards.
// -----
export const DASHBOARD_ROW_LINK_CLASS = "hover:bg-accent/40 flex px-6 py-5 transition-colors";
