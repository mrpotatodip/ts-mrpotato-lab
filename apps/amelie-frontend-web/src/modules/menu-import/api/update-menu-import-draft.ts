import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ImportDraftResponseSchema, UpdateImportDraftInputSchema } from "../schemas";

export const updateMenuImportDraft = createServerFn({ method: "POST" })
  .validator(UpdateImportDraftInputSchema)
  .handler(async ({ data: { importId, draftId, body } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(await withActiveTenant(`/imports/${importId}/drafts/${draftId}`), ImportDraftResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to save the draft");
    }

    if (!data.data) {
      throw new Error("Failed to save the draft");
    }

    return data.data;
  });
