import { Effect } from "effect";
import { hashPassword } from "better-auth/crypto";
import type { SignUp, SignUpBody } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, type DbError, type Forbidden } from "#/lib/effect-query";
import { hashInviteCode } from "#/modules/invite-code";
import {
  SIGN_UP_SLUG_EXHAUSTED,
  SIGN_UP_SLUG_MAX_ATTEMPTS,
} from "#/modules/sign-up/constants";
import { insertAccountEffect, pickFreeSlugEffect } from "#/modules/sign-up/queries";
import type { NewAccount } from "#/modules/sign-up/types";

type Failure = Forbidden | Conflict | DbError;

// -----
// Pick a slug and insert. If a concurrent sign-up
// took the slug between the two, pick again.
// -----
const insertWithFreshSlug = (
  db: DbConnectType,
  account: Omit<NewAccount, "slug">,
  attempt: number,
): Effect.Effect<SignUp, Forbidden | Conflict | DbError> =>
  Effect.gen(function* () {
    const slug = yield* pickFreeSlugEffect(db, account.cafeName);
    return yield* insertAccountEffect(db, { ...account, slug }).pipe(
      Effect.catchTag("SlugTaken", () =>
        attempt >= SIGN_UP_SLUG_MAX_ATTEMPTS
          ? Effect.fail(new Conflict({ message: SIGN_UP_SLUG_EXHAUSTED }))
          : insertWithFreshSlug(db, account, attempt + 1),
      ),
    );
  });

// -----
// An invited person starts their cafe. The invite
// code is used first, inside the same transaction,
// so a stranger learns nothing about which emails
// have an account and a failure gives the use back.
// -----
export const createAccountSvc = (
  db: DbConnectType,
  body: SignUpBody,
): Effect.Effect<SignUp, Failure> =>
  Effect.gen(function* () {
    const inviteCodeHash = yield* Effect.promise(() => hashInviteCode(body.inviteCode));
    const passwordHash = yield* Effect.promise(() => hashPassword(body.password));
    return yield* insertWithFreshSlug(
      db,
      {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        passwordHash,
        cafeName: body.cafeName,
        timezone: body.timezone,
        country: body.country,
        currency: body.currency,
        allowedOrigins: body.website ? [new URL(body.website).origin] : [],
        inviteCodeHash,
        now: new Date(),
      },
      1,
    );
  });
