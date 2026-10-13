import { IMPORT_IMAGE_TYPES } from "@repo/contracts/amelie";

// -----
// Menu imports
// -----
export const IMPORT_MODEL = "gpt-6-luna";
export const IMPORT_LIST_LIMIT = 20;
export const IMPORT_NOT_FOUND = "There is no Import with that id";
export const IMPORT_DRAFT_NOT_FOUND = "There is no draft with that id in this Import";
export const IMPORT_REPLACE_NEEDS_ONE_COUNTRY =
  "Replace would delete the menu in every country. Use Add when the cafe sells in several countries.";
export const IMPORT_NOT_READY = "This Import is not ready to publish";
export const IMPORT_ALREADY_PUBLISHED = "This Import is already published";
export const IMPORT_NO_FILES = "Send one PDF or up to 10 images";
export const IMPORT_TOO_MANY_FILES = "Send one PDF or up to 10 images, not both";
export const IMPORT_FILE_TOO_LARGE = "A file is larger than 10 MB";
export const IMPORT_FILE_TYPE_REFUSED = "Only PDF, JPEG, PNG and WebP files are accepted";
export const IMPORT_EXTRACTION_FAILED = "The menu could not be read";
export const IMPORT_FILE_MISSING = "A stored file could not be found";
export const IMPORT_ACCEPTED_TYPES: ReadonlyArray<string> = [...IMPORT_IMAGE_TYPES, "application/pdf"];
