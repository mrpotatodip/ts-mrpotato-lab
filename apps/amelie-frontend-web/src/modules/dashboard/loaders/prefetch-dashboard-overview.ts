import type { QueryClient } from "@tanstack/react-query";

import { customerThreadsQueries } from "#/modules/customer-thread";
import { faqsQueries } from "#/modules/faq";
import { menuQueries } from "#/modules/menu";
import { menuImportsQueries } from "#/modules/menu-import";
import { tenantHoursQueries } from "#/modules/schedule";
import { unansweredQuestionsQueries } from "#/modules/unanswered-question";
import { prefetchDashboardScope } from "./prefetch-dashboard-pages";
import { prefetchQuietly } from "./prefetch-quietly";

// -----
// Starts the queries the overview reads, so hovering
// the nav link (or landing on the page) fills the cache
// before the cards render. Menu and hours use the same
// Country and Location the other screens open on.
// -----
export async function prefetchDashboardOverview(queryClient: QueryClient) {
  const { countryId, locationId } = await prefetchDashboardScope(queryClient);
  return Promise.all([
    prefetchQuietly(queryClient.query(customerThreadsQueries.list())),
    prefetchQuietly(queryClient.query(unansweredQuestionsQueries.list())),
    prefetchQuietly(queryClient.query(menuQueries.editor(countryId))),
    prefetchQuietly(queryClient.query(faqsQueries.list())),
    prefetchQuietly(queryClient.query(menuImportsQueries.list())),
    prefetchQuietly(queryClient.query(tenantHoursQueries.detail(locationId))),
  ]);
}
