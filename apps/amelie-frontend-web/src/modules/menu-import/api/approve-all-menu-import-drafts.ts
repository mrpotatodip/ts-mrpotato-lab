import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { FetchImportInputSchema, ImportDetailResponseSchema } from "../schemas";

export const approveAllMenuImportDrafts = createServerFn({ method: "POST" })
  .validator(FetchImportInputSchema)
  .handler(async ({ data: { importId } }) => {
    const { data, error } = await tryCatch(
      apiClient.post(await withActiveTenant(`/imports/${importId}/approve-all`), ImportDetailResponseSchema),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to approve the drafts");
    }

    if (!data.data) {
      throw new Error("Failed to approve the drafts");
    }

    return data.data;
  });
