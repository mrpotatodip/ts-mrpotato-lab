import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { TeamListResponseSchema } from "../schemas";

export const fetchTeam = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(
    apiClient.get(await withActiveTenant("/team"), TeamListResponseSchema),
  );

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load the team");
  }

  if (!data.data) {
    throw new Error("Failed to load the team");
  }

  return data.data;
});
