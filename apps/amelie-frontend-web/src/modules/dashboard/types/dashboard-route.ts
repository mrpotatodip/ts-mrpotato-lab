import type { DASHBOARD_MENU_SUBNAV, DashboardNavItem } from "../constants";

// -----
// Any screen the dashboard nav links to. Links and
// cards take this, so a new screen needs no new union.
// -----
export type DashboardRoute = DashboardNavItem["to"] | (typeof DASHBOARD_MENU_SUBNAV)[number]["to"];
