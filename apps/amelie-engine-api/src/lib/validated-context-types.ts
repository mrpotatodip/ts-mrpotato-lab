import type { Context } from "hono";
import type { AppEnv } from "#/types/variables";

export type ValidatedInput = { query?: object; param?: object; json?: object };

export type ValidatedContext<Valid extends ValidatedInput> = Context<AppEnv, string, { out: Valid }>;
