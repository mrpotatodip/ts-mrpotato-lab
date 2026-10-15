import { QueryClient } from "@tanstack/react-query";
import type { Country, Location } from "@repo/contracts/amelie";
import { describe, expect, it, vi } from "vitest";

import { countriesKeys } from "#/modules/country";
import { customerThreadsKeys } from "#/modules/customer-thread";
import { faqsKeys } from "#/modules/faq";
import { locationsKeys } from "#/modules/location";
import { menuKeys } from "#/modules/menu";
import { menuImportsKeys } from "#/modules/menu-import";
import { tenantHoursKeys } from "#/modules/schedule";
import { unansweredQuestionsKeys } from "#/modules/unanswered-question";
import { prefetchDashboardOverview } from "../prefetch-dashboard-overview";

// SAFETY: the loader only reads id and archivedAt; the rest of a Country is never touched.
const country = (id: string, archivedAt: string | null = null) => ({ id, archivedAt }) as Country;
// SAFETY: the loader only reads id and archivedAt; the rest of a Location is never touched.
const location = (id: string, archivedAt: string | null = null) => ({ id, archivedAt }) as Location;

function fakeClient(countries: Country[], locations: Location[]) {
  const queryClient = new QueryClient();
  const asked: unknown[] = [];
  vi.spyOn(queryClient, "query").mockImplementation(async (options) => {
    asked.push(options.queryKey);
    if (options.queryKey === countriesKeys.all) return countries;
    if (options.queryKey === locationsKeys.all) return locations;
    return undefined;
  });
  return { queryClient, asked };
}

describe("prefetchDashboardOverview", () => {
  it("preloads menu and hours under the 'only' keys when the cafe has one of each", async () => {
    const { queryClient, asked } = fakeClient([country("c1")], [location("l1")]);

    await prefetchDashboardOverview(queryClient);

    expect(asked).toEqual([
      countriesKeys.all,
      locationsKeys.all,
      customerThreadsKeys.all,
      unansweredQuestionsKeys.all,
      menuKeys.editor(undefined),
      faqsKeys.all,
      menuImportsKeys.all,
      tenantHoursKeys.detail(undefined),
    ]);
  });

  it("names the oldest open Country and Location when the cafe has several", async () => {
    const { queryClient, asked } = fakeClient(
      [country("c-archived", "2026-01-01"), country("c-oldest"), country("c-newer")],
      [location("l-archived", "2026-01-01"), location("l-oldest"), location("l-newer")],
    );

    await prefetchDashboardOverview(queryClient);

    expect(asked).toContainEqual(menuKeys.editor("c-oldest"));
    expect(asked).toContainEqual(tenantHoursKeys.detail("l-oldest"));
  });

  it("still resolves when every request fails, so the route loads", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(queryClient, "query").mockRejectedValue(new Error("api down"));

    await expect(prefetchDashboardOverview(queryClient)).resolves.toHaveLength(6);
  });
});
