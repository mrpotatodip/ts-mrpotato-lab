import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listUnansweredQuestionsSvc } from "#/modules/unanswered-question/handlers";
import { listUnansweredQuestionsDoc } from "#/modules/unanswered-question/openapi";

const app = new Hono<AppEnv>();

app.get("/", listUnansweredQuestionsDoc, async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listUnansweredQuestionsSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
