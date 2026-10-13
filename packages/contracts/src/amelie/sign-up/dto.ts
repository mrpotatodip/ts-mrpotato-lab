import { z } from "zod";
import {
  SIGN_UP_CAFE_NAME_MAX,
  SIGN_UP_EMAIL_MAX,
  SIGN_UP_INVITE_CODE_MAX,
  SIGN_UP_PASSWORD_MAX,
  SIGN_UP_PASSWORD_MIN,
  SIGN_UP_PERSON_NAME_MAX,
  SIGN_UP_WEBSITE_MAX,
} from "../constants";
import { TenantRegionSchema, TenantSchema } from "../tenant";

// -----
// A real IANA zone, e.g. "Europe/Rome".
// Intl throws a RangeError for anything else.
// -----
const isTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

// -----
// Requests: one invited person starts their cafe
// -----
export const SignUpBodySchema = TenantRegionSchema.extend({
  inviteCode: z.string().min(1).max(SIGN_UP_INVITE_CODE_MAX),
  firstName: z.string().trim().min(1).max(SIGN_UP_PERSON_NAME_MAX),
  lastName: z.string().trim().min(1).max(SIGN_UP_PERSON_NAME_MAX),
  email: z.email().max(SIGN_UP_EMAIL_MAX).trim().toLowerCase(),
  password: z.string().min(SIGN_UP_PASSWORD_MIN).max(SIGN_UP_PASSWORD_MAX),
  cafeName: z.string().trim().min(1).max(SIGN_UP_CAFE_NAME_MAX),
  timezone: z.string().refine(isTimezone, "Must be an IANA timezone, e.g. Europe/Rome"),
  website: z.url({ protocol: /^https?$/ }).max(SIGN_UP_WEBSITE_MAX).optional(),
});

// -----
// Responses: the new login and its cafe,
// where the creator is the owner
// -----
export const SignUpSchema = z.object({
  userId: z.string(),
  tenant: TenantSchema,
});

export type SignUpBody = z.infer<typeof SignUpBodySchema>;
export type SignUp = z.infer<typeof SignUpSchema>;
