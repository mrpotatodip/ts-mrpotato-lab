import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import getCreditAPI from "./get-credit";
import getCreditEntriesAPI from "./get-credit-entries";

const app = new Hono<AppEnv>();

app.route("/", getCreditAPI);
app.route("/", getCreditEntriesAPI);

export default app;
