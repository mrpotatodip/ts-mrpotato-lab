import type { QueryClient } from "@tanstack/react-query";

import { businessProfileQueries } from "#/modules/business-profile";
import { chooseCountry, countriesQueries, activeCountries } from "#/modules/country";
import { customerThreadsQueries } from "#/modules/customer-thread";
import { faqsQueries } from "#/modules/faq";
import { activeLocations, chooseLocation, locationsQueries } from "#/modules/location";
import { menuQueries } from "#/modules/menu";
import { menuImportsQueries } from "#/modules/menu-import";
import { tenantHoursQueries } from "#/modules/schedule";
import { unansweredQuestionsQueries } from "#/modules/unanswered-question";
import { prefetchQuietly } from "./prefetch-quietly";

// -----
// The Countries and Locations every dashboard screen
// needs, loaded once by the _dashboard layout loader.
// It also works out the Country and Location a screen
// opens on, the same default its selection hook picks,
// because the menu, hours and profile are keyed by it.
// With one of each that is the "only" key. A page loader
// calls this too: the layout's fetch is shared and the
// data is fresh, so it is read from the cache.
// -----
export async function prefetchDashboardScope(queryClient: QueryClient) {
  const [countries, locations] = await Promise.all([
    prefetchQuietly(queryClient.query(countriesQueries.list())),
    prefetchQuietly(queryClient.query(locationsQueries.list())),
  ]);
  return {
    countryId: chooseCountry(activeCountries(countries), null)?.id,
    locationId: chooseLocation(activeLocations(locations), null)?.id,
  };
}

// -----
// What each screen reads beyond that, started from its
// route loader so hovering the nav link fills the cache.
// -----
export async function prefetchBusinessProfilePage(queryClient: QueryClient) {
  const { locationId } = await prefetchDashboardScope(queryClient);
  await prefetchQuietly(queryClient.query(businessProfileQueries.detail(locationId)));
}

export async function prefetchHoursPage(queryClient: QueryClient) {
  const { locationId } = await prefetchDashboardScope(queryClient);
  await prefetchQuietly(queryClient.query(tenantHoursQueries.detail(locationId)));
}

export async function prefetchMenuPage(queryClient: QueryClient) {
  const { countryId } = await prefetchDashboardScope(queryClient);
  await prefetchQuietly(queryClient.query(menuQueries.editor(countryId)));
}

export async function prefetchFaqsPage(queryClient: QueryClient) {
  await prefetchQuietly(queryClient.query(faqsQueries.list()));
}

export async function prefetchImportsPage(queryClient: QueryClient) {
  await prefetchQuietly(queryClient.query(menuImportsQueries.list()));
}

export async function prefetchImportPage(queryClient: QueryClient, importId: string) {
  await prefetchQuietly(queryClient.query(menuImportsQueries.detail(importId)));
}

export async function prefetchUnansweredPage(queryClient: QueryClient) {
  await prefetchQuietly(queryClient.query(unansweredQuestionsQueries.list()));
}

export async function prefetchCustomersPage(queryClient: QueryClient) {
  await prefetchQuietly(queryClient.query(customerThreadsQueries.list()));
}

export async function prefetchCustomerThreadPage(queryClient: QueryClient, threadId: string) {
  await prefetchQuietly(queryClient.query(customerThreadsQueries.detail(threadId)));
}
