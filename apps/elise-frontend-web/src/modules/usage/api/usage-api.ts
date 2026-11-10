import { createServerFn } from "@tanstack/react-start";
import { engineJson, jsonPost } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import { AnthropicKeySchema, SetAnthropicKeyBodySchema, UpdateUsageBudgetBodySchema, UsageBudgetChangesSchema, UsageSchema } from "../schemas";

export const fetchUsage = createServerFn({ method: "GET" }).handler(async () => engineJson(UsageSchema, "/usage", {}, await engineAuth()));

export const fetchBudgetChanges = createServerFn({ method: "GET" }).handler(async () => engineJson(UsageBudgetChangesSchema, "/usage/budget/changes", {}, await engineAuth()));

export const fetchAnthropicKey = createServerFn({ method: "GET" }).handler(async () => engineJson(AnthropicKeySchema, "/usage/anthropic-key", {}, await engineAuth()));

export const setAnthropicKey = createServerFn({ method: "POST" })
  .validator(SetAnthropicKeyBodySchema)
  .handler(async ({ data }) => engineJson(AnthropicKeySchema, "/usage/anthropic-key", { ...jsonPost(JSON.stringify(data)), method: "PUT" }, await engineAuth()));

export const removeAnthropicKey = createServerFn({ method: "POST" }).handler(async () =>
  engineJson(AnthropicKeySchema, "/usage/anthropic-key", { method: "DELETE" }, await engineAuth()),
);

export const updateUsageBudget = createServerFn({ method: "POST" })
  .validator(UpdateUsageBudgetBodySchema)
  .handler(async ({ data }) => engineJson(UsageSchema, "/usage/budget", { ...jsonPost(JSON.stringify(data)), method: "PATCH" }, await engineAuth()));
