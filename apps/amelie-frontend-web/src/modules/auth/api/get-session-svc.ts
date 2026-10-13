import { createServerFn } from "@tanstack/react-start";
import { apiClient } from "#/lib/api-client";
import { getAuthCookie } from "#/lib/auth-cookie";
import { tryCatch } from "#/lib/try-catch";
import { SessionResponseSchema } from "../schemas/session-schemas";
import type { SessionUser } from "../schemas/session-schemas";

// Returns the current user, or null if there's no session — never the
// bearer token itself, so it's safe to read from client components.
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    if (!getAuthCookie()) return null;

    const { data, error } = await tryCatch(
      apiClient.get("/auth/get-session", SessionResponseSchema),
    );

    if (error || !data) return null;
    return data.user;
  },
);
