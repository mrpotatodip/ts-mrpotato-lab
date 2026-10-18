import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  archiveLocationAPI,
  archiveLocationPreviewAPI,
  createLocationAPI,
  listLocationsAPI,
  updateLocationAPI,
} from "./api";

// -----
// A Tenant's Locations: any member reads, a
// tenant_admin or store_admin adds, edits and archives.
// -----
const app = new Hono<AppEnv>();

app.route("/", listLocationsAPI);
app.route("/", createLocationAPI);
app.route("/", updateLocationAPI);
app.route("/", archiveLocationAPI);
app.route("/", archiveLocationPreviewAPI);

export default app;
export * from "./handlers";
export * from "./lib";
export * from "./queries";
export * from "./types";
