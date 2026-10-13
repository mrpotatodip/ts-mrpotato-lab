import type { DbConnectType } from "#/lib/db-connection";
import type { Bindings } from "#/types/variables";
import type { ImportRuntime } from "#/modules/menu-import/types";
import { createOpenAiMenuExtractor } from "./extract-menu";

// -----
// The real R2 bucket, queue and model behind the
// ports the services use; tests pass fakes instead.
// -----
export const createImportRuntime = (env: Bindings, db: DbConnectType): ImportRuntime => ({
  db,
  storage: {
    put: async (key, bytes, contentType) => {
      await env.IMPORT_FILES.put(key, bytes, { httpMetadata: { contentType } });
    },
    get: async (key) => {
      const object = await env.IMPORT_FILES.get(key);
      return object ? object.arrayBuffer() : null;
    },
    delete: async (key) => {
      await env.IMPORT_FILES.delete(key);
    },
  },
  queue: {
    send: async (message) => {
      await env.IMPORT_QUEUE.send(message);
    },
  },
  extract: createOpenAiMenuExtractor(env.OPENAI_API_KEY),
});
