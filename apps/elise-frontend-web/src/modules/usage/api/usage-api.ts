import { createServerFn } from "@tanstack/react-start";
import { UsageSchema } from "@repo/contracts/elise";
import { engineJson } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";

export const fetchUsage = createServerFn({ method: "GET" }).handler(async () => engineJson(UsageSchema, "/usage", {}, await engineAuth()));
