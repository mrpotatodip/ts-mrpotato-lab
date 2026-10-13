import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { isActiveLocation } from "#/modules/location/queries";
import { upsertCountryPrice } from "#/modules/menu/queries";
import { Effect } from "effect";
import {
  dietaryTags,
  importDrafts,
  imports,
  tenantBusinessHours,
  tenantBusinessProfiles,
  tenantLocations,
  tenantMenuCategories,
  tenantMenuItemDietaryTags,
  tenantMenuItemImages,
  tenantMenuItems,
} from "@repo/db-amelie";
import type { BusinessProfileDraftData, PublishedImport } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, NotFound, toDbError, type DbError, type NeedsLocation } from "#/lib/effect-query";
import { chooseLocation, locationChoiceToEffect, type LocationChoice } from "#/modules/location";
import {
  IMPORT_ALREADY_PUBLISHED,
  IMPORT_DRAFT_NOT_FOUND,
  IMPORT_NOT_FOUND,
  IMPORT_NOT_READY,
} from "#/modules/menu-import/constants";
import { planPublish } from "#/modules/menu-import/lib";
import type { DraftChange, DraftRow, ImportRow, NewDraft, PublishPlanInput, StoredImportFile } from "#/modules/menu-import/types";

const PROFILE_FIELDS = ["description", "websiteUrl", "email"] as const;
const CONTACT_FIELDS = ["phone", "address"] as const;

type PublishOutcome =
  | { problem: "missing" | "published" | "not-ready" }
  | { problem: "location"; choice: LocationChoice }
  | { problem: null; counts: PublishedImport; removedImageKeys: string[] };

const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

const draftCount = (status: string) =>
  sql<number>`(select count(*)::int from import_drafts d where d.import_id = imports.id and d.status = ${status})`;

const importColumns = {
  id: imports.id,
  status: imports.status,
  error: imports.error,
  files: imports.files,
  createdAt: imports.createdAt,
  finishedAt: imports.finishedAt,
  publishedAt: imports.publishedAt,
  pendingCount: draftCount("pending"),
  approvedCount: draftCount("approved"),
  discardedCount: draftCount("discarded"),
};

// -----
// Every query here filters on tenant_id; the
// tenantId comes from server context.
// -----
export const insertImportEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  files: StoredImportFile[],
): Effect.Effect<void, DbError> =>
  query(() => db.insert(imports).values({ id: importId, tenantId, files })).pipe(Effect.asVoid);

export const finishImportEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  result: { status: "ready" } | { status: "failed"; error: string },
): Effect.Effect<void, DbError> =>
  query(() =>
    db
      .update(imports)
      .set({ status: result.status, error: result.status === "failed" ? result.error : null, finishedAt: new Date() })
      .where(and(eq(imports.tenantId, tenantId), eq(imports.id, importId))),
  ).pipe(Effect.asVoid);

export const listImportsEffect = (
  db: DbConnectType,
  tenantId: string,
  limit: number,
): Effect.Effect<ImportRow[], DbError> =>
  query(() =>
    db.select(importColumns).from(imports).where(eq(imports.tenantId, tenantId)).orderBy(desc(imports.createdAt)).limit(limit),
  );

export const getImportEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
): Effect.Effect<ImportRow, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db.select(importColumns).from(imports).where(and(eq(imports.tenantId, tenantId), eq(imports.id, importId))),
    );
    if (!row) return yield* new NotFound({ message: IMPORT_NOT_FOUND });
    return row;
  });

export const listDraftsEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
): Effect.Effect<DraftRow[], DbError> =>
  query(() =>
    db
      .select({
        id: importDrafts.id,
        kind: importDrafts.kind,
        data: importDrafts.data,
        sourceFile: importDrafts.sourceFile,
        reviewNote: importDrafts.reviewNote,
        status: importDrafts.status,
      })
      .from(importDrafts)
      .where(and(eq(importDrafts.tenantId, tenantId), eq(importDrafts.importId, importId)))
      .orderBy(asc(importDrafts.sortOrder)),
  );

// -----
// A re-run starts clean: its old drafts go first.
// -----
export const replaceDraftsEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  drafts: NewDraft[],
): Effect.Effect<void, DbError> =>
  query(() =>
    db.transaction(async (tx) => {
      await tx.delete(importDrafts).where(and(eq(importDrafts.tenantId, tenantId), eq(importDrafts.importId, importId)));
      if (drafts.length === 0) return;
      await tx.insert(importDrafts).values(
        drafts.map((draft) => ({
          tenantId,
          importId,
          kind: draft.kind,
          data: draft.data,
          sourceFile: draft.sourceFile,
          reviewNote: draft.reviewNote,
          sortOrder: draft.sortOrder,
        })),
      );
    }),
  );

export const updateDraftEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  draftId: string,
  change: DraftChange,
): Effect.Effect<DraftRow, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .update(importDrafts)
        .set(change)
        .where(
          and(
            eq(importDrafts.tenantId, tenantId),
            eq(importDrafts.importId, importId),
            eq(importDrafts.id, draftId),
          ),
        )
        .returning({
          id: importDrafts.id,
          kind: importDrafts.kind,
          data: importDrafts.data,
          sourceFile: importDrafts.sourceFile,
          reviewNote: importDrafts.reviewNote,
          status: importDrafts.status,
        }),
    );
    if (!row) return yield* new NotFound({ message: IMPORT_DRAFT_NOT_FOUND });
    return row;
  });

export const approveAllDraftsEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
): Effect.Effect<void, DbError> =>
  query(() =>
    db
      .update(importDrafts)
      .set({ status: "approved" })
      .where(
        and(eq(importDrafts.tenantId, tenantId), eq(importDrafts.importId, importId), eq(importDrafts.status, "pending")),
      ),
  ).pipe(Effect.asVoid);

// -----
// Publishing is one transaction: any failure rolls
// everything back, so the live data never half-changes.
// Hours, phone and address go to one Location: the one
// named, or the Tenant's only one. When that can't be
// told, nothing is written. Items are priced in the one
// Country the caller chose, and nowhere else.
// -----
export const publishImportEffect = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  mode: PublishPlanInput["mode"],
  locationId?: string,
  countryId?: string,
): Effect.Effect<{ published: PublishedImport; removedImageKeys: string[] }, DbError | NotFound | Conflict | NeedsLocation> =>
  query(() =>
    db.transaction(async (tx): Promise<PublishOutcome> => {
      const [imp] = await tx
        .select({ status: imports.status, publishedAt: imports.publishedAt })
        .from(imports)
        .where(and(eq(imports.tenantId, tenantId), eq(imports.id, importId)))
        .for("update");
      if (!imp) return { problem: "missing" };
      if (imp.publishedAt) return { problem: "published" };
      if (imp.status !== "ready") return { problem: "not-ready" };

      const approved = await tx
        .select({ kind: importDrafts.kind, data: importDrafts.data })
        .from(importDrafts)
        .where(
          and(
            eq(importDrafts.tenantId, tenantId),
            eq(importDrafts.importId, importId),
            eq(importDrafts.status, "approved"),
          ),
        )
        .orderBy(asc(importDrafts.sortOrder));
      const plan = planPublish(mode, approved);

      const touchesLocation =
        plan.businessHours.length > 0 ||
        (plan.businessProfile !== null && CONTACT_FIELDS.some((field) => plan.businessProfile?.[field] != null));
      let location: { id: string; phone: string | null; address: string | null } | null = null;
      if (touchesLocation) {
        const active = await tx
          .select({
            id: tenantLocations.id,
            name: tenantLocations.name,
            address: tenantLocations.address,
            phone: tenantLocations.phone,
            timezone: tenantLocations.timezone,
          })
          .from(tenantLocations)
          .where(and(eq(tenantLocations.tenantId, tenantId), isActiveLocation))
          .orderBy(asc(tenantLocations.createdAt), asc(tenantLocations.id));
        const choice = chooseLocation(active, locationId);
        if (choice.kind !== "chosen") return { problem: "location", choice };
        location = choice.location;
      }

      let categoryIds = new Map<string, string>();
      let removedImageKeys: string[] = [];
      if (plan.menuCategories.length > 0) {
        if (mode === "replace") {
          const imageRows = await tx
            .select({ objectKey: tenantMenuItemImages.objectKey })
            .from(tenantMenuItemImages)
            .where(eq(tenantMenuItemImages.tenantId, tenantId));
          removedImageKeys = imageRows.map((row) => row.objectKey);
          await tx.delete(tenantMenuCategories).where(eq(tenantMenuCategories.tenantId, tenantId));
        } else {
          const existing = await tx
            .select({ id: tenantMenuCategories.id, name: tenantMenuCategories.name })
            .from(tenantMenuCategories)
            .where(eq(tenantMenuCategories.tenantId, tenantId));
          categoryIds = new Map(existing.map((category) => [category.name.toLowerCase(), category.id]));
        }
        const [{ top }] = await tx
          .select({ top: sql<number>`coalesce(max(${tenantMenuCategories.sortOrder}), 0)::int` })
          .from(tenantMenuCategories)
          .where(eq(tenantMenuCategories.tenantId, tenantId));
        let sortOrder = top;
        for (const category of plan.menuCategories) {
          if (categoryIds.has(category.name.toLowerCase())) continue;
          sortOrder += 1;
          const [created] = await tx
            .insert(tenantMenuCategories)
            .values({ tenantId, name: category.name, note: category.note, sortOrder })
            .returning({ id: tenantMenuCategories.id });
          categoryIds.set(category.name.toLowerCase(), created.id);
        }
      }

      const slugs = [...new Set(plan.menuItems.flatMap((item) => item.dietaryTags))];
      const tagRows = slugs.length
        ? await tx.select({ id: dietaryTags.id, slug: dietaryTags.slug }).from(dietaryTags).where(inArray(dietaryTags.slug, slugs))
        : [];
      if (plan.menuItems.length > 0 && countryId === undefined) throw new Error("no Country chosen for the items");
      for (const [index, item] of plan.menuItems.entries()) {
        const categoryId = categoryIds.get(item.categoryName.toLowerCase());
        if (!categoryId) throw new Error(`no category for ${item.name}`);
        const [created] = await tx
          .insert(tenantMenuItems)
          .values({
            tenantId,
            categoryId,
            name: item.name,
            description: item.description,
            sortOrder: index,
          })
          .returning({ id: tenantMenuItems.id });
        if (countryId !== undefined) {
          await upsertCountryPrice(tx, tenantId, created.id, countryId, { price: item.price, variants: item.variants }, true);
        }
        const itemTags = tagRows.filter((tag) => item.dietaryTags.includes(tag.slug));
        if (itemTags.length > 0) {
          await tx
            .insert(tenantMenuItemDietaryTags)
            .values(itemTags.map((tag) => ({ tenantId, menuItemId: created.id, dietaryTagId: tag.id })));
        }
      }

      if (plan.businessHours.length > 0) {
        if (!location) throw new Error("no Location chosen for the hours");
        const hoursLocationId = location.id;
        await tx.delete(tenantBusinessHours).where(eq(tenantBusinessHours.locationId, hoursLocationId));
        await tx
          .insert(tenantBusinessHours)
          .values(plan.businessHours.map((hours) => ({ tenantId, locationId: hoursLocationId, ...hours })));
      }

      let profileFieldsFilled = 0;
      if (plan.businessProfile) {
        const [current] = await tx
          .select()
          .from(tenantBusinessProfiles)
          .where(eq(tenantBusinessProfiles.tenantId, tenantId));
        const fill: Partial<BusinessProfileDraftData> = {};
        for (const field of PROFILE_FIELDS) {
          const value = plan.businessProfile[field];
          const existing = current?.[field];
          if (value !== null && (existing === null || existing === undefined || existing === "")) fill[field] = value;
        }
        profileFieldsFilled = Object.keys(fill).length;
        if (profileFieldsFilled > 0) {
          await tx
            .insert(tenantBusinessProfiles)
            .values({ tenantId, ...fill })
            .onConflictDoUpdate({ target: tenantBusinessProfiles.tenantId, set: { ...fill, updatedAt: new Date() } });
        }
        if (location) {
          const contactFill: Partial<Pick<BusinessProfileDraftData, "phone" | "address">> = {};
          for (const field of CONTACT_FIELDS) {
            const value = plan.businessProfile[field];
            const existing = location[field];
            if (value !== null && (existing === null || existing === "")) contactFill[field] = value;
          }
          if (Object.keys(contactFill).length > 0) {
            await tx
              .update(tenantLocations)
              .set(contactFill)
              .where(and(eq(tenantLocations.id, location.id), eq(tenantLocations.tenantId, tenantId)));
          }
          profileFieldsFilled += Object.keys(contactFill).length;
        }
      }

      await tx.update(imports).set({ publishedAt: new Date() }).where(eq(imports.id, importId));
      return {
        problem: null,
        counts: {
          menuCategories: plan.menuCategories.length,
          menuItems: plan.menuItems.length,
          businessHours: plan.businessHours.length,
          profileFieldsFilled,
        },
        removedImageKeys,
      };
    }),
  ).pipe(
    Effect.flatMap((result): Effect.Effect<{ published: PublishedImport; removedImageKeys: string[] }, NotFound | Conflict | NeedsLocation> => {
      if (result.problem === "missing") return Effect.fail(new NotFound({ message: IMPORT_NOT_FOUND }));
      if (result.problem === "published") return Effect.fail(new Conflict({ message: IMPORT_ALREADY_PUBLISHED }));
      if (result.problem === "not-ready") return Effect.fail(new Conflict({ message: IMPORT_NOT_READY }));
      if (result.problem === "location") {
        return locationChoiceToEffect(result.choice).pipe(Effect.flatMap(() => Effect.fail(new NotFound({ message: IMPORT_NOT_FOUND }))));
      }
      if (result.problem === null) return Effect.succeed({ published: result.counts, removedImageKeys: result.removedImageKeys });
      return Effect.fail(new NotFound({ message: IMPORT_NOT_FOUND }));
    }),
  );
