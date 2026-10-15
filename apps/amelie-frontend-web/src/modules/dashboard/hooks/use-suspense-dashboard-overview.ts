import { useSuspenseCustomerThreads } from "#/modules/customer-thread";
import { useSuspenseFaqs } from "#/modules/faq";
import { useSuspenseMenu } from "#/modules/menu";
import { useSuspenseMenuImports } from "#/modules/menu-import";
import { useSuspenseTenantHours } from "#/modules/schedule";
import { useHydrated } from "#/modules/shared";
import { useSuspenseUnansweredQuestions } from "#/modules/unanswered-question";
import { DASHBOARD_ACTIVITY_DAYS } from "../constants";
import { useSuspenseDashboardScope } from "./use-dashboard-scope";
import {
  buildDashboardChecklist,
  countByDay,
  countUnavailable,
  flattenMenuItems,
  hasWeeklyHours,
  latestByCreatedAt,
  sortByLastMessage,
  sumActivity,
} from "../utils";

// -----
// Everything the overview shows, built from the
// queries the other screens already use. No new
// endpoint: each number is a count over a list.
// Menu and hours follow the dashboard Country and
// Location, because several of either need an id.
// -----
export function useSuspenseDashboardOverview() {
  const scope = useSuspenseDashboardScope();
  const { data: threads } = useSuspenseCustomerThreads();
  const { data: unanswered } = useSuspenseUnansweredQuestions();
  const { data: menu } = useSuspenseMenu(scope.countryId);
  const { data: faqs } = useSuspenseFaqs();
  const { data: imports } = useSuspenseMenuImports();
  const { data: hours } = useSuspenseTenantHours(scope.locationId ?? scope.profileLocationId);
  const hydrated = useHydrated();

  const activity = countByDay(
    threads.map((thread) => thread.startedAt),
    DASHBOARD_ACTIVITY_DAYS,
    !hydrated,
  );
  const menuItems = flattenMenuItems(menu);

  const checklist = buildDashboardChecklist({
    menuItemCount: menuItems.length,
    hasWeeklyHours: hasWeeklyHours(hours.weekly),
    faqCount: faqs.faqs.length,
    chatCount: threads.length,
  });

  return {
    checklist,
    unansweredSummary: unanswered.summary,
    unansweredQuestions: unanswered.questions,
    faqCount: faqs.faqs.length,
    faqCategoryCount: faqs.categories.length,
    activity,
    weekChats: sumActivity(activity),
    menuItemCount: menuItems.length,
    soldOutCount: countUnavailable(menuItems),
    recentThreads: sortByLastMessage(threads),
    latestImport: latestByCreatedAt(imports),
  };
}

export type DashboardOverviewData = ReturnType<typeof useSuspenseDashboardOverview>;
