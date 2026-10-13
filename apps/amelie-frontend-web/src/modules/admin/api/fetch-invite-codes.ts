import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { InviteCodeListResponseSchema } from "../schemas";

export const fetchInviteCodes = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(apiClient.get("/admin/invite-codes", InviteCodeListResponseSchema));

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load invite codes");
  }

  if (!data.data) {
    throw new Error("Failed to load invite codes");
  }

  return data.data;
});
