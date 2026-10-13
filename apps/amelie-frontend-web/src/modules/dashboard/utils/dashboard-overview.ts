import type { DashboardActivityDay } from "./dashboard-activity";

// -----
// The overview is built from lists the other screens
// already load. These are the small reductions over them.
// -----

export function sortByLastMessage<T extends { lastMessageAt: string }>(threads: T[]): T[] {
  return threads.toSorted((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt));
}

export function latestByCreatedAt<T extends { createdAt: string }>(items: T[]): T | undefined {
  return items.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

export function flattenMenuItems<T>(menu: { categories: { items: T[] }[] }): T[] {
  return menu.categories.flatMap((category) => category.items);
}

export function countUnavailable(items: { isAvailable: boolean }[]): number {
  return items.filter((item) => !item.isAvailable).length;
}

export function sumActivity(days: DashboardActivityDay[]): number {
  return days.reduce((sum, day) => sum + day.count, 0);
}
