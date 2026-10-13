import { createServerFn } from "@tanstack/react-start";
import { apiClient } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { setAuthCookie } from "#/lib/auth-cookie";
import { clearActiveTenant } from "#/lib/active-tenant";
import { APP_BASE_URL } from "#/lib/app-base-url";
import { SigninFormSchema, SigninResponseSchema } from "../schemas/signin-schemas";

export const signinEmail = createServerFn({ method: "POST" })
  .validator(SigninFormSchema)
  .handler(async ({ data }) => {
    const { data: result, error } = await tryCatch(
      apiClient.post("/auth/sign-in/email", SigninResponseSchema, {
        ...data,
        // -----
        // requireEmailVerification + sendOnSignIn means an
        // unverified sign-in attempt re-sends the verification
        // email — and the email links back to /signin.
        // -----
        callbackURL: `${APP_BASE_URL}/signin?verify=confirmed`,
      }),
    );

    if (error) throw new Error("account not found");

    clearActiveTenant();
    if (result.token) setAuthCookie(result.token);

    return result;
  });
