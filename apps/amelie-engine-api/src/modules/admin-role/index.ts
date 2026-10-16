import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  listAdminRolesAPI,
  getAdminRoleAPI,
  createAdminRoleAPI,
  updateAdminRoleAPI,
  setAdminRoleEnabledAPI,
  setAdminRolePowersAPI,
  deleteAdminRoleAPI,
  listAdminAuditLogAPI,
} from "./api";

const app = new Hono<AppEnv>();

app.route("/", listAdminRolesAPI);
app.route("/", getAdminRoleAPI);
app.route("/", createAdminRoleAPI);
app.route("/", updateAdminRoleAPI);
app.route("/", setAdminRoleEnabledAPI);
app.route("/", setAdminRolePowersAPI);
app.route("/", deleteAdminRoleAPI);
app.route("/", listAdminAuditLogAPI);

export default app;
