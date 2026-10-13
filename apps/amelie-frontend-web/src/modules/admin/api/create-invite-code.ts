import { createServerFn } from "@tanstack/react-start";
import { CreateInviteCodeBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { CreatedInviteCodeResponseSchema } from "../schemas";

// -----
// The response carries the plain code, the one
// time it exists. Callers must not cache it.
// -----
export const createInviteCode = createServerFn({ method: "POST" })
  .validator(CreateInviteCodeBodySchema)
  .handler(async ({ data: body }) => {
    const { data, error } = await tryCatch(
      apiClient.post("/admin/invite-codes", CreatedInviteCodeResponseSchema, body),
    );

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to create the invite code");
    }

    if (!data.data) {
      throw new Error("Failed to create the invite code");
    }

    return data.data;
  });
