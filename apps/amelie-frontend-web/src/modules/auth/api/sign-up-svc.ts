import { createServerFn } from "@tanstack/react-start";
import { SignUpBodySchema } from "@repo/contracts/amelie";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { SignUpResponseSchema } from "../schemas/sign-up-schemas";
import { signinEmail } from "./signin-email-svc";

function signUpMessage(error: Error): string {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 400) return "Some of the details are not valid. Check the form and try again.";
  if (status === 403) return "That invite code is not valid.";
  if (status === 409) return "An account with this email already exists. Sign in instead.";
  return "Could not start your cafe. Try again in a moment.";
}

// -----
// Starts the cafe, then signs the owner in through the normal
// sign-in so the session cookie is set exactly like a login.
// -----
export const signUpCafe = createServerFn({ method: "POST" })
  .validator(SignUpBodySchema)
  .handler(async ({ data }) => {
    const { error } = await tryCatch(
      apiClient.post("/public/sign-up", SignUpResponseSchema, data),
    );

    if (error) {
      throw new Error(signUpMessage(error));
    }

    const { error: signinError } = await tryCatch(
      signinEmail({ data: { email: data.email, password: data.password } }),
    );

    if (signinError) {
      throw new Error(
        "Your cafe was created, but signing in failed. Sign in with your new email and password.",
      );
    }
  });
