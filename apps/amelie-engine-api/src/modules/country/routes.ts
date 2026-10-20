import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { archiveCountryAPI, createCountryAPI, listCountriesAPI, updateCountryAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", listCountriesAPI);
app.route("/", createCountryAPI);
app.route("/", updateCountryAPI);
app.route("/", archiveCountryAPI);

export default app;
