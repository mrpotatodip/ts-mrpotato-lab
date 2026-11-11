import { createServerFn } from "@tanstack/react-start";
import { engineJson } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import { CreditBalanceSchema } from "../schemas";

export const fetchCredit = createServerFn({ method: "GET" }).handler(async () => engineJson(CreditBalanceSchema, "/usage/credit", {}, await engineAuth()));
