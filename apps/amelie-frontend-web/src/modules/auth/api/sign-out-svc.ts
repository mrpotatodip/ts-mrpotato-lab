import { createServerFn } from "@tanstack/react-start";
import { apiClient } from "#/lib/api-client";
import { clearAuthCookie, getAuthCookie } from "#/lib/auth-cookie";
import { clearActiveTenant } from "#/lib/active-tenant";
import { tryCatch } from "#/lib/try-catch";
import { SignOutResponseSchema } from "../schemas/session-schemas";

// -----
// Always drops the local cookie, even if the remote sign-out call fails —
// the goal is "this browser is logged out," not "the server confirmed it."
// -----
export const signOut = createServerFn({ method: "POST" }).handler(
  async () => {
    if (getAuthCookie()) {
      await tryCatch(
        apiClient.post("/auth/sign-out", SignOutResponseSchema, {}),
      );
    }

    clearAuthCookie();
    clearActiveTenant();
  },
);
