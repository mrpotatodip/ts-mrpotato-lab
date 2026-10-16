import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { listFaqsAPI, addFaqAPI, updateFaqAPI, deleteFaqAPI, addFaqCategoryAPI, renameFaqCategoryAPI, deleteFaqCategoryAPI } from "./api";

// -----
// A Tenant's FAQs and FAQ categories: any member
// reads, a tenant_admin or store_admin changes.
// -----
const app = new Hono<AppEnv>();

app.route("/", listFaqsAPI);
app.route("/", addFaqAPI);
app.route("/", updateFaqAPI);
app.route("/", deleteFaqAPI);
app.route("/", addFaqCategoryAPI);
app.route("/", renameFaqCategoryAPI);
app.route("/", deleteFaqCategoryAPI);

export default app;
export * from "./handlers";
export * from "./types";
