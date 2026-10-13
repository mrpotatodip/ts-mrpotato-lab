import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { AdminAccessResponseSchema } from "../schemas";

// -----
// Whether the signed-in Person is a superuser.
// The /admin API checks again on every call.
// -----
export const fetchAdminAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(apiClient.get("/me", AdminAccessResponseSchema));

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load your access");
  }

  if (!data.data) {
    throw new Error("Failed to load your access");
  }

  return data.data;
});
