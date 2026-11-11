import { z } from "zod";
import { ScanStateSchema } from "../scan/dto";

// -----
// The Files page lists the files a person reads. The
// machine-readable files (findings.json and the rest) stay
// per scan, so they are not listed here.
// -----
export const FILE_LISTED_NAMES = ["REPORT.md", "FINDINGS-DETAIL.md", "NEEDS-VALIDATION.md"] as const;

export const FileNameSchema = z.enum(FILE_LISTED_NAMES);

export const FileSchema = z.object({
  scanId: z.string(),
  name: FileNameSchema,
  repoId: z.uuid(),
  repo: z.string(),
  branch: z.string().nullable(),
  status: ScanStateSchema,
  sizeBytes: z.number().int().min(0),
  contentType: z.string(),
  createdAt: z.iso.datetime(),
});

export const FileCountSchema = z.object({ name: FileNameSchema, count: z.number().int().min(0) });

// -----
// counts is how many files each type has under every filter except the
// type itself, so a tab can say what it would show. It is optional so an
// older engine that does not send it still parses.
// -----
export const FileListSchema = z.object({
  files: z.array(FileSchema),
  nextCursor: z.string().nullable(),
  counts: z.array(FileCountSchema).optional(),
});

export const FilesQuerySchema = z.object({
  repoId: z.uuid().optional(),
  branch: z.string().min(1).optional(),
  name: FileNameSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().regex(/^\d+$/).optional(),
});

export type FileName = z.infer<typeof FileNameSchema>;
export type FileEntry = z.infer<typeof FileSchema>;
export type FileCount = z.infer<typeof FileCountSchema>;
export type FileList = z.infer<typeof FileListSchema>;
export type FilesQuery = z.infer<typeof FilesQuerySchema>;
