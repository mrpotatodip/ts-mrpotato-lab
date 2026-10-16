import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { archiveCountryAPI, createCountryAPI, listCountriesAPI, updateCountryAPI } from "./api";

// -----
// A Tenant's Countries: any member reads, a tenant_admin
// or store_admin adds, edits the Currency and archives.
// -----
const app = new Hono<AppEnv>();

app.route("/", listCountriesAPI);
app.route("/", createCountryAPI);
app.route("/", updateCountryAPI);
app.route("/", archiveCountryAPI);

export default app;
