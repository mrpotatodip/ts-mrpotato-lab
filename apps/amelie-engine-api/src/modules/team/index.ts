import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  acceptTeamInviteAPI,
  createTeamInviteAPI,
  getTeamInvitePreviewAPI,
  listTeamAPI,
  listTeamRolesAPI,
  removeTeamMemberAPI,
  revokeTeamInviteAPI,
  updateTeamInviteAPI,
  updateTeamMemberAPI,
} from "./api";

const app = new Hono<AppEnv>();

app.route("/", listTeamAPI);
app.route("/", listTeamRolesAPI);
app.route("/", createTeamInviteAPI);
app.route("/", updateTeamInviteAPI);
app.route("/", revokeTeamInviteAPI);
app.route("/", updateTeamMemberAPI);
app.route("/", removeTeamMemberAPI);

export const publicTeamInviteAPI = new Hono<AppEnv>();
publicTeamInviteAPI.route("/", getTeamInvitePreviewAPI);
publicTeamInviteAPI.route("/", acceptTeamInviteAPI);

export default app;
export * from "./handlers";
export * from "./lib";
