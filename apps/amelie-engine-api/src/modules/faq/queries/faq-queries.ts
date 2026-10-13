import { and, asc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import { tenantFaqCategories, tenantFaqs, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { FAQ_CATEGORY_NOT_FOUND, FAQ_NOT_FOUND } from "#/modules/faq/constants";
import type { Faq, FaqCategory, FaqScope } from "#/modules/faq/types";

// -----
// Every query here filters on tenant_id;
// the tenantId comes from server context.
// -----
const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

// -----
// A Location sees café-wide FAQs, its Country's and
// its own. A Country sees café-wide plus its own.
// With none resolved, only the café-wide ones.
// -----
const faqsInScope = (scope: FaqScope, tenantId: string): SQL | undefined => {
  const cafeWide = and(isNull(tenantFaqs.locationId), isNull(tenantFaqs.countryId));
  if (scope.kind === "all") return undefined;
  if (scope.kind === "tenantWide") return cafeWide;
  if (scope.kind === "country") return or(cafeWide, eq(tenantFaqs.countryId, scope.countryId));
  return or(
    cafeWide,
    eq(tenantFaqs.locationId, scope.locationId),
    eq(
      tenantFaqs.countryId,
      sql`(select ${tenantLocations.countryId} from ${tenantLocations} where ${tenantLocations.id} = ${scope.locationId} and ${tenantLocations.tenantId} = ${tenantId})`,
    ),
  );
};

// -----
// Uncategorised first, then each category
// in the Tenant's own order.
// -----
export const listFaqsEffect = (
  db: DbConnectType,
  tenantId: string,
  scope: FaqScope = { kind: "all" },
): Effect.Effect<Faq[], DbError> =>
  query(() =>
    db
      .select({
        id: tenantFaqs.id,
        categoryId: tenantFaqs.categoryId,
        category: tenantFaqCategories.name,
        locationId: tenantFaqs.locationId,
        countryId: tenantFaqs.countryId,
        question: tenantFaqs.question,
        answer: tenantFaqs.answer,
      })
      .from(tenantFaqs)
      .leftJoin(
        tenantFaqCategories,
        and(
          eq(tenantFaqCategories.id, tenantFaqs.categoryId),
          eq(tenantFaqCategories.tenantId, tenantFaqs.tenantId),
        ),
      )
      .where(and(eq(tenantFaqs.tenantId, tenantId), faqsInScope(scope, tenantId)))
      .orderBy(
        sql`${tenantFaqCategories.sortOrder} NULLS FIRST`,
        asc(tenantFaqCategories.name),
        asc(tenantFaqs.createdAt),
      ),
  );

export const listFaqCategoriesEffect = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<FaqCategory[], DbError> =>
  query(() =>
    db
      .select({ id: tenantFaqCategories.id, name: tenantFaqCategories.name })
      .from(tenantFaqCategories)
      .where(eq(tenantFaqCategories.tenantId, tenantId))
      .orderBy(asc(tenantFaqCategories.sortOrder), asc(tenantFaqCategories.name)),
  );

export const insertFaqEffect = (
  db: DbConnectType,
  tenantId: string,
  faq: { categoryId: string | null; locationId: string | null; countryId: string | null; question: string; answer: string },
): Effect.Effect<{ id: string }, DbError> =>
  query(() => db.insert(tenantFaqs).values({ tenantId, ...faq }).returning({ id: tenantFaqs.id })).pipe(
    Effect.map(([row]) => row),
  );

// -----
// By (tenant, id), so an id from another
// Tenant updates nothing.
// -----
export const updateFaqEffect = (
  db: DbConnectType,
  tenantId: string,
  faqId: string,
  change: { question?: string; answer?: string; categoryId?: string | null; locationId?: string | null; countryId?: string | null },
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .update(tenantFaqs)
        .set(change)
        .where(and(eq(tenantFaqs.tenantId, tenantId), eq(tenantFaqs.id, faqId)))
        .returning({ id: tenantFaqs.id }),
    );
    if (!row) return yield* new NotFound({ message: FAQ_NOT_FOUND });
    return row;
  });

export const deleteFaqEffect = (
  db: DbConnectType,
  tenantId: string,
  faqId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .delete(tenantFaqs)
        .where(and(eq(tenantFaqs.tenantId, tenantId), eq(tenantFaqs.id, faqId)))
        .returning({ id: tenantFaqs.id }),
    );
    if (!row) return yield* new NotFound({ message: FAQ_NOT_FOUND });
    return row;
  });

// -----
// A new category goes last in the Tenant's order.
// -----
export const insertFaqCategoryEffect = (
  db: DbConnectType,
  tenantId: string,
  name: string,
): Effect.Effect<FaqCategory, DbError> =>
  query(() =>
    db
      .insert(tenantFaqCategories)
      .values({
        tenantId,
        name,
        sortOrder: sql`(select coalesce(max(sort_order), 0) + 1 from tenant_faq_categories where tenant_id = ${tenantId})`,
      })
      .returning({ id: tenantFaqCategories.id, name: tenantFaqCategories.name }),
  ).pipe(Effect.map(([row]) => row));

export const renameFaqCategoryEffect = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
  name: string,
): Effect.Effect<FaqCategory, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .update(tenantFaqCategories)
        .set({ name })
        .where(and(eq(tenantFaqCategories.tenantId, tenantId), eq(tenantFaqCategories.id, categoryId)))
        .returning({ id: tenantFaqCategories.id, name: tenantFaqCategories.name }),
    );
    if (!row) return yield* new NotFound({ message: FAQ_CATEGORY_NOT_FOUND });
    return row;
  });

// -----
// The database moves its FAQs to General.
// -----
export const deleteFaqCategoryEffect = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .delete(tenantFaqCategories)
        .where(and(eq(tenantFaqCategories.tenantId, tenantId), eq(tenantFaqCategories.id, categoryId)))
        .returning({ id: tenantFaqCategories.id }),
    );
    if (!row) return yield* new NotFound({ message: FAQ_CATEGORY_NOT_FOUND });
    return row;
  });
