import { createServerFn } from "@tanstack/react-start";
import { engineJson, jsonPost } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import { UpdateUsageBudgetBodySchema, UsageSchema } from "../schemas";

export const fetchUsage = createServerFn({ method: "GET" }).handler(async () => engineJson(UsageSchema, "/usage", {}, await engineAuth()));

export const updateUsageBudget = createServerFn({ method: "POST" })
  .validator(UpdateUsageBudgetBodySchema)
  .handler(async ({ data }) => engineJson(UsageSchema, "/usage/budget", { ...jsonPost(JSON.stringify(data)), method: "PATCH" }, await engineAuth()));
