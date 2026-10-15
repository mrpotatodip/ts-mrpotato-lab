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
  getPublicChatAppearanceAPI,
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

publicChatBotRestAPI.route("/", getPublicChatFramePolicyAPI);
publicChatBotRestAPI.route("/", getPublicChatAppearanceAPI);
publicChatBotRestAPI.route("/", publicHydrateOrJoinChatBotAPI);
publicChatBotRestAPI.route("/", publicStreamChatBotAPI);

export default app;
