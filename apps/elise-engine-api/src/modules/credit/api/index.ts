import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import getCreditAPI from "./get-credit";

const app = new Hono<AppEnv>();

app.route("/", getCreditAPI);

export default app;
