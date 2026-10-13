import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getMenuAPI, addMenuCategoryAPI, reorderMenuCategoriesAPI, updateMenuCategoryAPI, deleteMenuCategoryAPI, reorderMenuItemsAPI, addMenuItemAPI, updateMenuItemAPI, deleteMenuItemAPI, setMenuItemLocationsAPI, setMenuItemCountryPriceAPI, addMenuItemImagesAPI, reorderMenuItemImagesAPI, deleteMenuItemImageAPI, setMenuItemImageCoverAPI } from "./api";

// -----
// A Tenant's menu: any member reads, an owner or
// admin changes. The order route is mounted before
// the id route, so "order" is never read as an id.
// -----
const app = new Hono<AppEnv>();

app.route("/", getMenuAPI);
app.route("/", addMenuCategoryAPI);
app.route("/", reorderMenuCategoriesAPI);
app.route("/", updateMenuCategoryAPI);
app.route("/", deleteMenuCategoryAPI);
app.route("/", reorderMenuItemsAPI);
app.route("/", addMenuItemAPI);
app.route("/", updateMenuItemAPI);
app.route("/", setMenuItemLocationsAPI);
app.route("/", setMenuItemCountryPriceAPI);
app.route("/", addMenuItemImagesAPI);
app.route("/", reorderMenuItemImagesAPI);
app.route("/", setMenuItemImageCoverAPI);
app.route("/", deleteMenuItemImageAPI);
app.route("/", deleteMenuItemAPI);

export default app;
export * from "./handlers";
export * from "./lib";
export * from "./types";
export { getMenuItemImageAPI } from "./api";
