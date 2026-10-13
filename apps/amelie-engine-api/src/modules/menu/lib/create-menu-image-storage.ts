import type { Bindings } from "#/types/variables";
import type { MenuImageStorage } from "#/modules/menu/types";

export const createMenuImageStorage = (env: Bindings): MenuImageStorage => ({
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
});
