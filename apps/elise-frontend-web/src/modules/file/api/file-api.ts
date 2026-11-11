import { createServerFn } from "@tanstack/react-start";
import { engineJson } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import { FileListSchema, FilesInputSchema } from "../schemas";
import { fileQueryString } from "../utils";

export const fetchFiles = createServerFn({ method: "GET" })
  .validator(FilesInputSchema)
  .handler(async ({ data }) => engineJson(FileListSchema, `/files${fileQueryString(data)}`, {}, await engineAuth()));
