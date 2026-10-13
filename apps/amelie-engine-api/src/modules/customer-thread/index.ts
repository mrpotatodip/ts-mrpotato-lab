import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getCustomerThreadAPI, listCustomerThreadsAPI } from "./api";

// -----
// What Customers said to the assistant, read-only:
// any team member may read their cafe's threads.
// -----
const app = new Hono<AppEnv>();

app.route("/", listCustomerThreadsAPI);
app.route("/", getCustomerThreadAPI);

export default app;
export * from "./handlers";
