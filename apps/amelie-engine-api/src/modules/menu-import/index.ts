import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  approveAllImportDraftsAPI,
  createImportAPI,
  getImportAPI,
  listImportsAPI,
  publishImportAPI,
  updateImportDraftAPI,
} from "./api";

// -----
// Menu imports: any member reads; a tenant_admin or store_admin
// uploads, reviews and publishes.
// -----
const app = new Hono<AppEnv>();

app.route("/", createImportAPI);
app.route("/", listImportsAPI);
app.route("/", getImportAPI);
app.route("/", updateImportDraftAPI);
app.route("/", approveAllImportDraftsAPI);
app.route("/", publishImportAPI);

export default app;
export * from "./handlers";
export { handleImportQueue } from "./lib";
