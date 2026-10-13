import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { handleMcpAPI, listTenantsMcpAPI } from "./api";

// -----
// A Tenant's public facts over MCP, by slug;
// the slug-less path lists the slugs.
// No login, read-only.
// -----
const app = new Hono<AppEnv>();

app.route("/", listTenantsMcpAPI);
app.route("/", handleMcpAPI);

export default app;
