import { z } from "zod";
import {
  ImportDetailSchema,
  ImportDraftSchema,
  ImportListSchema,
  ImportSummarySchema,
  CountryIdSchema,
  LocationIdSchema,
  PublishedImportSchema,
  UpdateImportDraftBodySchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const ImportListResponseSchema = apiResponseSchema(ImportListSchema);
export const ImportSummaryResponseSchema = apiResponseSchema(ImportSummarySchema);
export const ImportDetailResponseSchema = apiResponseSchema(ImportDetailSchema);
export const ImportDraftResponseSchema = apiResponseSchema(ImportDraftSchema);
export const PublishedImportResponseSchema = apiResponseSchema(PublishedImportSchema);

export const FetchImportInputSchema = z.object({ importId: z.uuid() });
export const UpdateImportDraftInputSchema = z.object({
  importId: z.uuid(),
  draftId: z.uuid(),
  body: UpdateImportDraftBodySchema,
});
export const PublishImportInputSchema = z.object({
  importId: z.uuid(),
  mode: z.enum(["replace", "add"]),
  locationId: LocationIdSchema.optional(),
  countryId: CountryIdSchema.optional(),
});

// -----
// What a draft editor's boxes hold: text as typed, by
// field name, and whether an hours draft is Closed.
// -----
export const MenuImportDraftFormValuesSchema = z.object({
  text: z.record(z.string(), z.string()),
  isClosed: z.boolean(),
});

export type MenuImportDraftFormValues = z.infer<typeof MenuImportDraftFormValuesSchema>;
