import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { listOpenCountryRefsEffect } from "#/modules/country";
import type { Coverage } from "@repo/contracts/amelie";
import { listActiveLocationsEffect, listActiveLocationsInCountryEffect } from "#/modules/location";
import { requireCovered } from "#/modules/tenant";
import { Conflict, Forbidden, Invalid, NotFound, type DbError } from "#/lib/effect-query";
import {
  deleteFaqCategoryEffect,
  deleteFaqEffect,
  insertFaqCategoryEffect,
  insertFaqEffect,
  listFaqCategoriesEffect,
  listFaqsEffect,
  renameFaqCategoryEffect,
  updateFaqEffect,
} from "#/modules/faq/queries";
import {
  FAQ_CATEGORY_EXISTS, FAQ_CATEGORY_NOT_FOUND,
  FAQ_COUNTRY_AND_LOCATION,
  FAQ_COUNTRY_NOT_FOUND,
  FAQ_LOCATION_NOT_FOUND,
  FAQ_NOT_FOUND,
} from "#/modules/faq/constants";
import type { Faq, FaqCategory, FaqList, FaqScope } from "#/modules/faq/types";

export const listFaqsSvc = (
  db: DbConnectType,
  tenantId: string,
  scope: FaqScope = { kind: "all" },
): Effect.Effect<FaqList, DbError> =>
  Effect.all(
    { categories: listFaqCategoriesEffect(db, tenantId), faqs: listFaqsEffect(db, tenantId, scope) },
    { concurrency: "unbounded" },
  );

const findFaq = (db: DbConnectType, tenantId: string, faqId: string) =>
  listFaqsEffect(db, tenantId).pipe(
    Effect.flatMap((faqs) => {
      const faq = faqs.find((f) => f.id === faqId);
      return faq ? Effect.succeed(faq) : Effect.fail(new NotFound({ message: FAQ_NOT_FOUND }));
    }),
  );

const checkActiveLocation = (db: DbConnectType, tenantId: string, locationId: string) =>
  listActiveLocationsEffect(db, tenantId).pipe(
    Effect.flatMap((active) =>
      active.some((location) => location.id === locationId)
        ? Effect.void
        : Effect.fail(new NotFound({ message: FAQ_LOCATION_NOT_FOUND })),
    ),
  );

const checkOpenCountry = (db: DbConnectType, tenantId: string, countryId: string) =>
  listOpenCountryRefsEffect(db, tenantId).pipe(
    Effect.flatMap((open) =>
      open.some((country) => country.id === countryId)
        ? Effect.void
        : Effect.fail(new NotFound({ message: FAQ_COUNTRY_NOT_FOUND })),
    ),
  );

// -----
// What the FAQ applies to: at most one of a Country
// and a Location, refused here with a clear message
// before the database check. Both must be this
// Tenant's own, open ones.
// -----
const checkScope = (db: DbConnectType, tenantId: string, scope: { locationId: string | null; countryId: string | null }) =>
  Effect.gen(function* () {
    if (scope.locationId !== null && scope.countryId !== null) {
      return yield* new Invalid({ message: FAQ_COUNTRY_AND_LOCATION });
    }
    if (scope.locationId !== null) yield* checkActiveLocation(db, tenantId, scope.locationId);
    if (scope.countryId !== null) yield* checkOpenCountry(db, tenantId, scope.countryId);
  });

const requireScopeCovered = (
  db: DbConnectType,
  tenantId: string,
  coverage: Coverage,
  scope: { locationId: string | null; countryId: string | null },
): Effect.Effect<void, DbError | Forbidden> => {
  if (coverage === "all") return Effect.void;
  if (scope.locationId !== null) return requireCovered(coverage, [scope.locationId]);
  if (scope.countryId === null) return Effect.void;
  return listActiveLocationsInCountryEffect(db, tenantId, scope.countryId).pipe(
    Effect.flatMap((locations) =>
      requireCovered(
        coverage,
        locations.map((location) => location.id),
      ),
    ),
  );
};

// -----
// The category, Country and Location must be this
// Tenant's, checked here so the model hears a clear reason.
// -----
export const addFaqSvc = (
  db: DbConnectType,
  tenantId: string,
  faq: {
    categoryId: string | null;
    locationId?: string | null;
    countryId?: string | null;
    question: string;
    answer: string;
  },
  coverage: Coverage = "all",
): Effect.Effect<Faq, DbError | NotFound | Invalid | Forbidden> =>
  Effect.gen(function* () {
    const locationId = faq.locationId ?? null;
    const countryId = faq.countryId ?? null;
    yield* requireScopeCovered(db, tenantId, coverage, { locationId, countryId });
    yield* checkScope(db, tenantId, { locationId, countryId });
    if (faq.categoryId !== null) {
      const categories = yield* listFaqCategoriesEffect(db, tenantId);
      if (!categories.some((c) => c.id === faq.categoryId)) {
        return yield* new Invalid({ message: FAQ_CATEGORY_NOT_FOUND });
      }
    }
    const { id } = yield* insertFaqEffect(db, tenantId, { ...faq, locationId, countryId });
    return yield* findFaq(db, tenantId, id);
  });

// -----
// Moving an FAQ needs the category to be this
// Tenant's too; null puts it back in General.
// A scope left out of the change stays as it was,
// so the result is checked, not just the change.
// -----
export const updateFaqSvc = (
  db: DbConnectType,
  tenantId: string,
  faqId: string,
  change: {
    question?: string;
    answer?: string;
    categoryId?: string | null;
    locationId?: string | null;
    countryId?: string | null;
  },
  coverage: Coverage = "all",
): Effect.Effect<Faq, DbError | NotFound | Invalid | Forbidden> =>
  Effect.gen(function* () {
    const scopeChanges = change.locationId !== undefined || change.countryId !== undefined;
    if (scopeChanges || coverage !== "all") {
      const current = yield* findFaq(db, tenantId, faqId);
      const next = {
        locationId: change.locationId === undefined ? current.locationId : change.locationId,
        countryId: change.countryId === undefined ? current.countryId : change.countryId,
      };
      yield* requireScopeCovered(db, tenantId, coverage, current);
      yield* requireScopeCovered(db, tenantId, coverage, next);
      if (scopeChanges) yield* checkScope(db, tenantId, next);
    }
    if (change.categoryId) {
      const categories = yield* listFaqCategoriesEffect(db, tenantId);
      if (!categories.some((c) => c.id === change.categoryId)) {
        return yield* new Invalid({ message: FAQ_CATEGORY_NOT_FOUND });
      }
    }
    yield* updateFaqEffect(db, tenantId, faqId, change);
    return yield* findFaq(db, tenantId, faqId);
  });

export const deleteFaqSvc = (
  db: DbConnectType,
  tenantId: string,
  faqId: string,
  coverage: Coverage = "all",
): Effect.Effect<{ id: string }, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    if (coverage !== "all") {
      const current = yield* findFaq(db, tenantId, faqId);
      yield* requireScopeCovered(db, tenantId, coverage, current);
    }
    return yield* deleteFaqEffect(db, tenantId, faqId);
  });

// -----
// Names are unique per Tenant, ignoring case,
// so the dashboard never shows two alike.
// -----
const checkCategoryNameFree = (db: DbConnectType, tenantId: string, name: string, exceptId?: string) =>
  listFaqCategoriesEffect(db, tenantId).pipe(
    Effect.flatMap((categories) =>
      categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase())
        ? Effect.fail(new Conflict({ message: FAQ_CATEGORY_EXISTS }))
        : Effect.void,
    ),
  );

export const addFaqCategorySvc = (
  db: DbConnectType,
  tenantId: string,
  name: string,
): Effect.Effect<FaqCategory, DbError | Conflict> =>
  checkCategoryNameFree(db, tenantId, name).pipe(Effect.andThen(insertFaqCategoryEffect(db, tenantId, name)));

export const renameFaqCategorySvc = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
  name: string,
): Effect.Effect<FaqCategory, DbError | NotFound | Conflict> =>
  checkCategoryNameFree(db, tenantId, name, categoryId).pipe(
    Effect.andThen(renameFaqCategoryEffect(db, tenantId, categoryId, name)),
  );

export const deleteFaqCategorySvc = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> => deleteFaqCategoryEffect(db, tenantId, categoryId);
