import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { addGroupMemberAPI, createGroupAPI, deleteGroupAPI, listGroupsAPI, removeGroupMemberAPI, renameGroupAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", listGroupsAPI);
app.route("/", createGroupAPI);
app.route("/", renameGroupAPI);
app.route("/", deleteGroupAPI);
app.route("/", addGroupMemberAPI);
app.route("/", removeGroupMemberAPI);

export default app;
