import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { listUnansweredQuestionsAPI, dismissUnansweredQuestionAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", listUnansweredQuestionsAPI);
app.route("/", dismissUnansweredQuestionAPI);

export default app;
export * from "./handlers";
export * from "./lib";
