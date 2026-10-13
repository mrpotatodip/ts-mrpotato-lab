import { IMPORT_MAX_FILE_BYTES, IMPORT_MAX_IMAGES, IMPORT_PDF_TYPE } from "@repo/contracts/amelie";
import {
  IMPORT_ACCEPTED_TYPES,
  IMPORT_FILE_TOO_LARGE,
  IMPORT_FILE_TYPE_REFUSED,
  IMPORT_NO_FILES,
  IMPORT_TOO_MANY_FILES,
} from "#/modules/menu-import/constants";
import type { UploadedFile } from "#/modules/menu-import/types";

// -----
// One PDF, or up to 10 images; each up to 10 MB.
// Returns the reason it is refused, or null.
// -----
export const checkUpload = (files: ReadonlyArray<UploadedFile>): string | null => {
  if (files.length === 0) return IMPORT_NO_FILES;
  if (files.some((file) => !IMPORT_ACCEPTED_TYPES.includes(file.contentType))) return IMPORT_FILE_TYPE_REFUSED;
  if (files.some((file) => file.bytes.byteLength > IMPORT_MAX_FILE_BYTES)) return IMPORT_FILE_TOO_LARGE;
  const pdfs = files.filter((file) => file.contentType === IMPORT_PDF_TYPE).length;
  if (pdfs > 1 || (pdfs === 1 && files.length > 1) || files.length > IMPORT_MAX_IMAGES) return IMPORT_TOO_MANY_FILES;
  return null;
};

// -----
// imports/<tenant>/<import>/<n>-<name>: the Tenant's
// own prefix, with a name that is safe as a key.
// -----
export const importFileKey = (tenantId: string, importId: string, index: number, name: string): string =>
  `imports/${tenantId}/${importId}/${index}-${name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80)}`;
