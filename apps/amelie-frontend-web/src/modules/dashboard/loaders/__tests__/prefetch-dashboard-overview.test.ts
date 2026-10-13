import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { customerThreadsKeys } from "#/modules/customer-thread";
import { faqsKeys } from "#/modules/faq";
import { menuKeys } from "#/modules/menu";
import { menuImportsKeys } from "#/modules/menu-import";
import { tenantHoursKeys } from "#/modules/schedule";
import { unansweredQuestionsKeys } from "#/modules/unanswered-question";
import { prefetchDashboardOverview } from "../prefetch-dashboard-overview";

describe("prefetchDashboardOverview", () => {
  it("starts the six queries the overview cards read", async () => {
    const queryClient = new QueryClient();
    const query = vi.spyOn(queryClient, "query").mockResolvedValue(undefined);

    await prefetchDashboardOverview(queryClient);

    const keys = query.mock.calls.map(([options]) => options.queryKey);
    expect(keys).toEqual([
      customerThreadsKeys.all,
      unansweredQuestionsKeys.all,
      menuKeys.editor(undefined),
      faqsKeys.all,
      menuImportsKeys.all,
      tenantHoursKeys.detail(undefined),
    ]);
  });

  it("still resolves when every request fails, so the route loads", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(queryClient, "query").mockRejectedValue(new Error("api down"));

    await expect(prefetchDashboardOverview(queryClient)).resolves.toHaveLength(6);
  });
});
