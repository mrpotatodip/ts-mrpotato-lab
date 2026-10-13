import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  streamChatBotAPI,
  hydrateOrJoinChatBotAPI,
  listChatBotThreadsAPI,
  getChatBotThreadAPI,
  updateChatBotThreadTitleAPI,
  deleteChatBotThreadAPI,
  publicStreamChatBotAPI,
  publicHydrateOrJoinChatBotAPI,
  getPublicChatFramePolicyAPI,
} from "./api";

const app = new Hono<AppEnv>();

app.route("/", listChatBotThreadsAPI);
app.route("/", getChatBotThreadAPI);
app.route("/", updateChatBotThreadTitleAPI);
app.route("/", deleteChatBotThreadAPI);
app.route("/", hydrateOrJoinChatBotAPI);
app.route("/", streamChatBotAPI);

// -----
// The widget's routes: no login; an anonymous
// id and a Tenant slug instead.
// -----
export const publicChatBotRestAPI = new Hono<AppEnv>();

publicChatBotRestAPI.route("/frame-policy", getPublicChatFramePolicyAPI);
publicChatBotRestAPI.route("/", publicHydrateOrJoinChatBotAPI);
publicChatBotRestAPI.route("/", publicStreamChatBotAPI);

export default app;
