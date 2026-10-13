import type {
  BusinessHoursDraftData,
  BusinessProfileDraftData,
  PublishImportBody,
  MenuCategoryDraftData,
  MenuItemDraftData,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";

export type ImportQueueMessage = { tenantId: string; importId: string };

export type UploadedFile = { name: string; contentType: string; bytes: ArrayBuffer };

export type ImportStorage = {
  put: (key: string, bytes: ArrayBuffer, contentType: string) => Promise<void>;
  get: (key: string) => Promise<ArrayBuffer | null>;
  delete: (key: string) => Promise<void>;
};

export type ImportQueue = {
  send: (message: ImportQueueMessage) => Promise<void>;
};

export type DraftRecord =
  | { kind: "menu_category"; data: MenuCategoryDraftData; reviewNote: string | null }
  | { kind: "menu_item"; data: MenuItemDraftData; reviewNote: string | null }
  | { kind: "business_hours"; data: BusinessHoursDraftData; reviewNote: string | null }
  | { kind: "business_profile"; data: BusinessProfileDraftData; reviewNote: string | null };

export type MenuExtractor = (file: UploadedFile, dietaryTagSlugs: ReadonlyArray<string>) => Promise<DraftRecord[]>;

export type ImportRuntime = {
  db: DbConnectType;
  storage: ImportStorage;
  queue: ImportQueue;
  extract: MenuExtractor;
};

export type StoredImportFile = { key: string; name: string; contentType: string; size: number };

export type ImportRow = {
  id: string;
  status: string;
  error: string | null;
  files: StoredImportFile[];
  createdAt: Date;
  finishedAt: Date | null;
  publishedAt: Date | null;
  pendingCount: number;
  approvedCount: number;
  discardedCount: number;
};

export type DraftRow = {
  id: string;
  kind: string;
  data: unknown;
  sourceFile: string;
  reviewNote: string | null;
  status: string;
};

export type DraftChange = { data?: DraftRecord["data"]; status?: string };

export type NewDraft = DraftRecord & { sourceFile: string; sortOrder: number };

export type PublishPlanInput = {
  mode: PublishImportBody["mode"];
  drafts: DraftRecord[];
};
