import { z } from "zod";
import {
  SIGN_UP_ACCOUNT_NAME_MAX,
  SIGN_UP_EMAIL_MAX,
  SIGN_UP_INVITE_CODE_MAX,
  SIGN_UP_PASSWORD_MAX,
  SIGN_UP_PASSWORD_MIN,
  SIGN_UP_PERSON_NAME_MAX,
  SignUpBodySchema,
} from "@repo/contracts/elise";
import { AUTH_ERRORS } from "../constants";

// -----
// An empty email and a wrong one need different words: the first says to type
// one, the second says what is wrong with what was typed.
// -----
const emailField = z.string().trim().min(1, AUTH_ERRORS.emailEmpty).pipe(z.email(AUTH_ERRORS.email));

export const SignInSchema = z.object({
  email: emailField,
  password: z.string().min(1, AUTH_ERRORS.password),
});

// -----
// The contract's rules, with a message a person can act on for each. The
// server still checks the contract's own schema, so the two cannot drift
// apart on what is allowed, only on what is said.
// -----
export const SignUpInputSchema = SignUpBodySchema.extend({
  inviteCode: z.string().trim().min(1, AUTH_ERRORS.inviteCode).max(SIGN_UP_INVITE_CODE_MAX, AUTH_ERRORS.tooLong(SIGN_UP_INVITE_CODE_MAX)),
  firstName: z.string().trim().min(1, AUTH_ERRORS.firstName).max(SIGN_UP_PERSON_NAME_MAX, AUTH_ERRORS.tooLong(SIGN_UP_PERSON_NAME_MAX)),
  lastName: z.string().trim().min(1, AUTH_ERRORS.lastName).max(SIGN_UP_PERSON_NAME_MAX, AUTH_ERRORS.tooLong(SIGN_UP_PERSON_NAME_MAX)),
  email: z.string().trim().min(1, AUTH_ERRORS.emailEmpty).pipe(z.email(AUTH_ERRORS.email).max(SIGN_UP_EMAIL_MAX, AUTH_ERRORS.tooLong(SIGN_UP_EMAIL_MAX)).toLowerCase()),
  password: z.string().min(SIGN_UP_PASSWORD_MIN, AUTH_ERRORS.newPasswordTooShort(SIGN_UP_PASSWORD_MIN)).max(SIGN_UP_PASSWORD_MAX, AUTH_ERRORS.tooLong(SIGN_UP_PASSWORD_MAX)),
  accountName: z.string().trim().min(1, AUTH_ERRORS.accountName).max(SIGN_UP_ACCOUNT_NAME_MAX, AUTH_ERRORS.tooLong(SIGN_UP_ACCOUNT_NAME_MAX)),
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;
