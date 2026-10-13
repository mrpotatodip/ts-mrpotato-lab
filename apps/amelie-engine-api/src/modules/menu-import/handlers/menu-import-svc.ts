import { Effect } from "effect";
import {
  BusinessHoursDraftDataSchema,
  BusinessProfileDraftDataSchema,
  ImportDraftSchema,
  MenuCategoryDraftDataSchema,
  MenuItemDraftDataSchema,
  type ImportDetail,
  type ImportDraft,
  type ImportList,
  type ImportSummary,
  type PublishedImport,
  type UpdateImportDraftBody,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Conflict, ExternalError, Invalid, NotFound, type DbError, type NeedsLocation } from "#/lib/effect-query";
import { chooseCountryIdSvc, listOpenCountryRefsEffect } from "#/modules/country";
import { listDietaryTagsSvc } from "#/modules/menu";
import {
  IMPORT_ALREADY_PUBLISHED,
  IMPORT_DRAFT_NOT_FOUND,
  IMPORT_EXTRACTION_FAILED,
  IMPORT_FILE_MISSING,
  IMPORT_LIST_LIMIT,
  IMPORT_REPLACE_NEEDS_ONE_COUNTRY,
} from "#/modules/menu-import/constants";
import { checkUpload, importFileKey } from "#/modules/menu-import/lib";
import {
  approveAllDraftsEffect,
  finishImportEffect,
  getImportEffect,
  insertImportEffect,
  listDraftsEffect,
  listImportsEffect,
  publishImportEffect,
  replaceDraftsEffect,
  updateDraftEffect,
} from "#/modules/menu-import/queries";
import type {
  DraftChange,
  DraftRow,
  ImportQueueMessage,
  ImportRow,
  ImportRuntime,
  NewDraft,
  StoredImportFile,
  UploadedFile,
} from "#/modules/menu-import/types";

const toImportSummary = (row: ImportRow): ImportSummary => ({
  id: row.id,
  status: row.status === "ready" || row.status === "failed" ? row.status : "running",
  error: row.error,
  files: row.files.map(({ name, contentType, size }) => ({ name, contentType, size })),
  createdAt: row.createdAt.toISOString(),
  finishedAt: row.finishedAt?.toISOString() ?? null,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  pendingCount: row.pendingCount,
  approvedCount: row.approvedCount,
  discardedCount: row.discardedCount,
});

// -----
// A draft that no longer fits its schema is left out
// of the review rather than shown half-broken.
// -----
const toImportDraft = (row: DraftRow): ImportDraft[] => {
  const parsed = ImportDraftSchema.safeParse(row);
  return parsed.success ? [parsed.data] : [];
};

const shorten = (message: string): string => message.slice(0, 300);

// -----
// The upload: files to storage, one row, one queue
// message. If storing or queueing fails the Import is
// kept, marked failed, so the Tenant sees what happened.
// -----
export const createImportSvc = (
  runtime: ImportRuntime,
  tenantId: string,
  files: ReadonlyArray<UploadedFile>,
): Effect.Effect<ImportSummary, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    const refused = checkUpload(files);
    if (refused) return yield* new Invalid({ message: refused });
    const importId = crypto.randomUUID();
    const stored: StoredImportFile[] = files.map((file, index) => ({
      key: importFileKey(tenantId, importId, index, file.name),
      name: file.name,
      contentType: file.contentType,
      size: file.bytes.byteLength,
    }));
    yield* insertImportEffect(runtime.db, tenantId, importId, stored);
    const sent = yield* Effect.tryPromise({
      try: async () => {
        for (const [index, file] of files.entries()) {
          await runtime.storage.put(stored[index].key, file.bytes, file.contentType);
        }
        await runtime.queue.send({ tenantId, importId });
      },
      catch: (cause) => new ExternalError({ cause }),
    }).pipe(Effect.either);
    if (sent._tag === "Left") {
      console.error("menu import: storing or queueing failed", sent.left.cause);
      yield* finishImportEffect(runtime.db, tenantId, importId, {
        status: "failed",
        error: "The files could not be saved. Try again.",
      });
    }
    return toImportSummary(yield* getImportEffect(runtime.db, tenantId, importId));
  });

// -----
// The queue consumer. A retry of a finished Import does
// nothing; any failure marks the Import failed with why.
// -----
export const runImportSvc = (
  runtime: ImportRuntime,
  { tenantId, importId }: ImportQueueMessage,
): Effect.Effect<void, DbError> =>
  Effect.gen(function* () {
    const found = yield* getImportEffect(runtime.db, tenantId, importId).pipe(Effect.either);
    if (found._tag === "Left" || found.right.status !== "running") return;
    const slugs = (yield* listDietaryTagsSvc(runtime.db)).map((tag) => tag.slug);
    const extracted = yield* Effect.tryPromise({
      try: async () => {
        const drafts: NewDraft[] = [];
        for (const file of found.right.files) {
          const bytes = await runtime.storage.get(file.key);
          if (!bytes) throw new Error(IMPORT_FILE_MISSING);
          const records = await runtime.extract({ name: file.name, contentType: file.contentType, bytes }, slugs);
          for (const record of records) drafts.push({ ...record, sourceFile: file.name, sortOrder: drafts.length });
        }
        return drafts;
      },
      catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
    }).pipe(Effect.either);
    if (extracted._tag === "Left") {
      console.error("menu import: extraction failed", extracted.left);
      return yield* finishImportEffect(runtime.db, tenantId, importId, {
        status: "failed",
        error: shorten(extracted.left.message || IMPORT_EXTRACTION_FAILED),
      });
    }
    yield* replaceDraftsEffect(runtime.db, tenantId, importId, extracted.right);
    yield* finishImportEffect(runtime.db, tenantId, importId, { status: "ready" });
  });

export const listImportsSvc = (db: DbConnectType, tenantId: string): Effect.Effect<ImportList, DbError> =>
  listImportsEffect(db, tenantId, IMPORT_LIST_LIMIT).pipe(Effect.map((rows) => rows.map(toImportSummary)));

export const getImportSvc = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
): Effect.Effect<ImportDetail, DbError | NotFound> =>
  Effect.all(
    { row: getImportEffect(db, tenantId, importId), drafts: listDraftsEffect(db, tenantId, importId) },
    { concurrency: "unbounded" },
  ).pipe(Effect.map(({ row, drafts }) => ({ ...toImportSummary(row), drafts: drafts.flatMap(toImportDraft) })));

const draftSchemas = {
  menu_category: MenuCategoryDraftDataSchema,
  menu_item: MenuItemDraftDataSchema,
  business_hours: BusinessHoursDraftDataSchema,
  business_profile: BusinessProfileDraftDataSchema,
};

// -----
// Edit the data of a draft, change its status, or both.
// The data is checked by the schema of the draft's kind.
// -----
export const updateImportDraftSvc = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  draftId: string,
  body: UpdateImportDraftBody,
): Effect.Effect<ImportDraft, DbError | NotFound | Invalid | Conflict> =>
  Effect.gen(function* () {
    const row = yield* getImportEffect(db, tenantId, importId);
    if (row.publishedAt) return yield* new Conflict({ message: IMPORT_ALREADY_PUBLISHED });
    const draft = (yield* listDraftsEffect(db, tenantId, importId)).find((d) => d.id === draftId);
    const kind = draft?.kind;
    if (!draft || !(kind === "menu_category" || kind === "menu_item" || kind === "business_hours" || kind === "business_profile")) {
      return yield* new NotFound({ message: IMPORT_DRAFT_NOT_FOUND });
    }
    const parsed = body.data === undefined ? null : draftSchemas[kind].safeParse(body.data);
    if (parsed && !parsed.success) {
      return yield* new Invalid({ message: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` });
    }
    const change: DraftChange = {};
    if (parsed?.success) change.data = parsed.data;
    if (body.status) change.status = body.status;
    const updated = yield* updateDraftEffect(db, tenantId, importId, draftId, change);
    const [shown] = toImportDraft(updated);
    return shown ?? (yield* new NotFound({ message: IMPORT_DRAFT_NOT_FOUND }));
  });

export const approveAllImportDraftsSvc = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
): Effect.Effect<ImportDetail, DbError | NotFound | Conflict> =>
  Effect.gen(function* () {
    const row = yield* getImportEffect(db, tenantId, importId);
    if (row.publishedAt) return yield* new Conflict({ message: IMPORT_ALREADY_PUBLISHED });
    yield* approveAllDraftsEffect(db, tenantId, importId);
    return yield* getImportSvc(db, tenantId, importId);
  });

// -----
// Menu drafts are priced in one Country: the one named,
// or the cafe's only one. Replace mode deletes categories,
// which would take other Countries' prices with them, so
// it is refused when several Countries are open. Hours and
// contact drafts need no Country. All checked before any write.
// -----
export const publishImportSvc = (
  db: DbConnectType,
  tenantId: string,
  importId: string,
  mode: "replace" | "add",
  locationId?: string,
  countryId?: string,
): Effect.Effect<PublishedImport, DbError | NotFound | Conflict | NeedsLocation | Invalid> =>
  Effect.gen(function* () {
    const drafts = yield* listDraftsEffect(db, tenantId, importId);
    const hasMenu = drafts.some((d) => d.status === "approved" && (d.kind === "menu_category" || d.kind === "menu_item"));
    if (!hasMenu) return yield* publishImportEffect(db, tenantId, importId, mode, locationId);
    if (mode === "replace" && (yield* listOpenCountryRefsEffect(db, tenantId)).length > 1) {
      return yield* new Invalid({ message: IMPORT_REPLACE_NEEDS_ONE_COUNTRY });
    }
    const chosen = yield* chooseCountryIdSvc(db, tenantId, countryId);
    return yield* publishImportEffect(db, tenantId, importId, mode, locationId, chosen);
  });
