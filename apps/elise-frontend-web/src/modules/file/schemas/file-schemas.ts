import { z } from "zod";
import { FILE_LISTED_NAMES, FileListSchema, FileNameSchema, FilesQuerySchema } from "@repo/contracts/elise";

export { FILE_LISTED_NAMES, FileListSchema, FileNameSchema };
export type { FileEntry, FileName } from "@repo/contracts/elise";

// -----
// The filters live in the page URL, so a filtered list can be
// bookmarked or shared with the Team. A bad value in the link is dropped,
// not an error. Dates are whole days (YYYY-MM-DD).
// -----
export const FilesSearchSchema = FilesQuerySchema.pick({ repoId: true, branch: true, name: true, q: true })
  .extend({ from: z.iso.date().optional(), to: z.iso.date().optional() })
  .catch({});

export const FilesInputSchema = FilesQuerySchema.pick({ cursor: true }).extend({ filters: FilesSearchSchema });

export type FilesSearch = z.infer<typeof FilesSearchSchema>;
export type FilesInput = z.infer<typeof FilesInputSchema>;
