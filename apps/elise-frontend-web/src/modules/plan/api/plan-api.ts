import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { engineJson } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import { CreditEntriesSchema, PlanDetailsSchema } from "../schemas";

export const fetchPlan = createServerFn({ method: "GET" }).handler(async () => engineJson(PlanDetailsSchema, "/usage/plan", {}, await engineAuth()));

const CreditEntriesInputSchema = z.object({ cursor: z.uuid().optional() });

export const fetchCreditEntries = createServerFn({ method: "GET" })
  .validator(CreditEntriesInputSchema)
  .handler(async ({ data }) => {
    const query = data.cursor ? `?cursor=${data.cursor}` : "";
    return engineJson(CreditEntriesSchema, `/usage/credit/entries${query}`, {}, await engineAuth());
  });
