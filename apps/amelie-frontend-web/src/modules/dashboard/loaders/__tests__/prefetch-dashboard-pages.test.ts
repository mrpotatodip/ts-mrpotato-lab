import { QueryClient } from "@tanstack/react-query";
import type { Country, Location } from "@repo/contracts/amelie";
import { describe, expect, it, vi } from "vitest";

import { businessProfileKeys } from "#/modules/business-profile";
import { countriesKeys } from "#/modules/country";
import { customerThreadsKeys } from "#/modules/customer-thread";
import { faqsKeys } from "#/modules/faq";
import { locationsKeys } from "#/modules/location";
import { menuKeys } from "#/modules/menu";
import { menuImportsKeys } from "#/modules/menu-import";
import { tenantHoursKeys } from "#/modules/schedule";
import { unansweredQuestionsKeys } from "#/modules/unanswered-question";
import {
  prefetchBusinessProfilePage,
  prefetchCustomersPage,
  prefetchCustomerThreadPage,
  prefetchDashboardScope,
  prefetchFaqsPage,
  prefetchHoursPage,
  prefetchImportPage,
  prefetchImportsPage,
  prefetchMenuPage,
  prefetchUnansweredPage,
} from "../prefetch-dashboard-pages";

// SAFETY: the loaders only read id and archivedAt; the rest of a Country is never touched.
const country = (id: string, archivedAt: string | null = null) => ({ id, archivedAt }) as Country;
// SAFETY: the loaders only read id and archivedAt; the rest of a Location is never touched.
const location = (id: string, archivedAt: string | null = null) => ({ id, archivedAt }) as Location;

// -----
// A client whose query() answers the Countries and
// Locations lists and records every key it was asked for.
// -----
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

describe("the layout's scope", () => {
  it("loads the Countries and Locations lists once and returns the default ids", async () => {
    const { queryClient, asked } = fakeClient([country("c1"), country("c2")], [location("l1")]);

    const scope = await prefetchDashboardScope(queryClient);

    expect(asked).toEqual([countriesKeys.all, locationsKeys.all]);
    expect(scope).toEqual({ countryId: "c1", locationId: undefined });
  });
});

describe("one Country and one Location", () => {
  const setup = () => fakeClient([country("c1")], [location("l1")]);

  it("preloads the menu, hours and profile under the 'only' keys", async () => {
    const menu = setup();
    await prefetchMenuPage(menu.queryClient);
    expect(menu.asked).toContainEqual(menuKeys.editor(undefined));

    const hours = setup();
    await prefetchHoursPage(hours.queryClient);
    expect(hours.asked).toContainEqual(tenantHoursKeys.detail(undefined));

    const profile = setup();
    await prefetchBusinessProfilePage(profile.queryClient);
    expect(profile.asked).toContainEqual(businessProfileKeys.detail(undefined));
  });
});

describe("several Countries and Locations", () => {
  const setup = () =>
    fakeClient(
      [country("c-archived", "2026-01-01"), country("c-oldest"), country("c-newer")],
      [location("l-archived", "2026-01-01"), location("l-oldest"), location("l-newer")],
    );

  it("opens on the oldest open one, as the screen's selection does", async () => {
    const menu = setup();
    await prefetchMenuPage(menu.queryClient);
    expect(menu.asked).toContainEqual(menuKeys.editor("c-oldest"));

    const hours = setup();
    await prefetchHoursPage(hours.queryClient);
    expect(hours.asked).toContainEqual(tenantHoursKeys.detail("l-oldest"));

    const profile = setup();
    await prefetchBusinessProfilePage(profile.queryClient);
    expect(profile.asked).toContainEqual(businessProfileKeys.detail("l-oldest"));
  });
});

describe("the other screens", () => {
  const setup = () => fakeClient([country("c1")], [location("l1")]);

  it("loads each screen's own list or detail", async () => {
    const faqs = setup();
    await prefetchFaqsPage(faqs.queryClient);
    expect(faqs.asked).toEqual([faqsKeys.all]);

    const imports = setup();
    await prefetchImportsPage(imports.queryClient);
    expect(imports.asked).toEqual([menuImportsKeys.all]);

    const importDetail = setup();
    await prefetchImportPage(importDetail.queryClient, "imp-1");
    expect(importDetail.asked).toEqual([menuImportsKeys.detail("imp-1")]);

    const unanswered = setup();
    await prefetchUnansweredPage(unanswered.queryClient);
    expect(unanswered.asked).toEqual([unansweredQuestionsKeys.all]);

    const customers = setup();
    await prefetchCustomersPage(customers.queryClient);
    expect(customers.asked).toEqual([customerThreadsKeys.all]);

    const thread = setup();
    await prefetchCustomerThreadPage(thread.queryClient, "t-1");
    expect(thread.asked).toEqual([customerThreadsKeys.detail("t-1")]);
  });

  it("still resolves when every request fails, so the route loads", async () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, "query").mockRejectedValue(new Error("api down"));

    await expect(prefetchMenuPage(queryClient)).resolves.toBeUndefined();
    await expect(prefetchFaqsPage(queryClient)).resolves.toBeUndefined();
  });
});
