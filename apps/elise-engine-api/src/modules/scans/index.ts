import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { createScanAPI, detailScanAPI, listScansAPI, readScanFileAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", createScanAPI);
app.route("/", listScansAPI);
app.route("/", detailScanAPI);
app.route("/", readScanFileAPI);

export default app;
