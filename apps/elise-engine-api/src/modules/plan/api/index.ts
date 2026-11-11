import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import getPlanAPI from "./get-plan";

const app = new Hono<AppEnv>();

app.route("/", getPlanAPI);

export default app;
