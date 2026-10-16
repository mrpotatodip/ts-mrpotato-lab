import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listUnansweredQuestionsSvc } from "#/modules/unanswered-question/handlers";
import { listUnansweredQuestionsDoc } from "#/modules/unanswered-question/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.get("/", listUnansweredQuestionsDoc,
  requirePower("company:unanswered:questions:read"), async (c) => {
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(listUnansweredQuestionsSvc(db, c.get("tenantId")));
  return c.json({ data, error: null });
});

export default app;
