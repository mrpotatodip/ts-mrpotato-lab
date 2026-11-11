import { mergeConfig } from "vitest/config";
import base from "./vitest.config";

// -----
// Only tools/live-get.live.ts, started by tools/live-get.mjs. The normal
// `vitest run` never reaches it: its name has no `.test.`.
// -----
export default mergeConfig(base, { test: { include: ["tools/live-get.live.ts"] } });
