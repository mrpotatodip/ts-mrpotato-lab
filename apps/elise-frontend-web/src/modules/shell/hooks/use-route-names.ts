import { useRouterState } from "@tanstack/react-router";
import { z } from "zod";

const SidebarBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  latestScanAt: z.string().nullable(),
  status: z.enum(["queued", "running", "succeeded", "failed"]).nullable(),
});

const RouteNamesSchema = z.object({
  name: z.string(),
  branch: z.string().optional(),
  repoId: z.string().optional(),
  branchId: z.string().optional(),
  commit: z.string().optional(),
  branches: z.array(SidebarBranchSchema).optional(),
});

export type SidebarBranch = z.infer<typeof SidebarBranchSchema>;
export type RouteNames = z.infer<typeof RouteNamesSchema>;

// -----
// The names a repository route puts in its loader data, so the breadcrumb
// and the sidebar can show where the reader is without a request of their own.
// A route that sends none gives null.
// -----
export function useRouteNames(): RouteNames | null {
  const loaderData = useRouterState({ select: (state) => state.matches.at(-1)?.loaderData });
  const parsed = RouteNamesSchema.safeParse(loaderData);
  return parsed.success ? parsed.data : null;
}
