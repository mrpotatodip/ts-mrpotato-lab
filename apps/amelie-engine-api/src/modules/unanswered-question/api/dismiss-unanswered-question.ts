import { Hono } from "hono";
import { UnansweredQuestionParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { dismissUnansweredQuestionSvc } from "#/modules/unanswered-question/handlers";
import { dismissUnansweredQuestionDoc } from "#/modules/unanswered-question/openapi";
import { requirePower } from "#/modules/tenant";

const app = new Hono<AppEnv>();

app.post("/:messageId/dismiss", dismissUnansweredQuestionDoc,
  requirePower("company:unanswered:questions:dismiss"), zValidator("param", UnansweredQuestionParamSchema), async (c) => {
  const { messageId } = c.req.valid("param");
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  await runEffect(dismissUnansweredQuestionSvc(db, c.get("tenantId"), messageId));
  return c.json({ data: { messageId }, error: null });
});

export default app;
