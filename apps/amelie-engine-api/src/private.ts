import { Hono } from "hono";
import { requireSession } from "#/lib/require-session";
import type { AppEnv } from "#/types/variables";
import chatBotRestAPI from "#/modules/chat-bot";
import tenantRestAPI from "#/modules/tenant";
import unansweredQuestionRestAPI from "#/modules/unanswered-question";
import businessProfileRestAPI from "#/modules/business-profile";
import scheduleRestAPI from "#/modules/schedule";
import faqRestAPI from "#/modules/faq";
import locationRestAPI from "#/modules/location";
import countryRestAPI from "#/modules/country/routes";
import menuRestAPI from "#/modules/menu";
import customerThreadRestAPI from "#/modules/customer-thread";
import menuImportRestAPI from "#/modules/menu-import";
import meRestAPI from "#/modules/me";
import adminRestAPI, { requireSuperuser } from "#/modules/admin";
import adminRoleRestAPI from "#/modules/admin-role";
import inviteCodeRestAPI from "#/modules/invite-code";
import teamRestAPI from "#/modules/team";
import { requireTenantMember } from "#/modules/tenant";

// -----
// Signed-in only. Middleware is scoped to
// these paths, never "*": mounted at "/",
// "*" turns unknown routes' 404 into a 401,
// and would lock public.ts if mounted first.
// -----
const app = new Hono<AppEnv>();

app.use("/chat-bot", requireSession, requireTenantMember);
app.use("/chat-bot/*", requireSession, requireTenantMember);
app.use("/unanswered-questions/*", requireSession, requireTenantMember);
app.use("/unanswered-questions", requireSession, requireTenantMember);
app.use("/business-profile", requireSession, requireTenantMember);
app.use("/schedule/*", requireSession, requireTenantMember);
app.use("/schedule", requireSession, requireTenantMember);
app.use("/faqs/*", requireSession, requireTenantMember);
app.use("/faqs", requireSession, requireTenantMember);
app.use("/locations/*", requireSession, requireTenantMember);
app.use("/locations", requireSession, requireTenantMember);
app.use("/countries/*", requireSession, requireTenantMember);
app.use("/countries", requireSession, requireTenantMember);
app.use("/menu/*", requireSession, requireTenantMember);
app.use("/menu", requireSession, requireTenantMember);
app.use("/customer-threads/*", requireSession, requireTenantMember);
app.use("/customer-threads", requireSession, requireTenantMember);
app.use("/imports/*", requireSession, requireTenantMember);
app.use("/imports", requireSession, requireTenantMember);
app.use("/team/*", requireSession, requireTenantMember);
app.use("/team", requireSession, requireTenantMember);
app.use("/tenants", requireSession);
app.use("/tenants/*", requireSession);
app.use("/me", requireSession);
app.use("/admin", requireSession, requireSuperuser);
app.use("/admin/*", requireSession, requireSuperuser);

app.route("/chat-bot", chatBotRestAPI);
app.route("/tenants", tenantRestAPI);
app.route("/me", meRestAPI);
app.route("/admin", adminRestAPI);
app.route("/admin", adminRoleRestAPI);
app.route("/admin/invite-codes", inviteCodeRestAPI);
app.route("/unanswered-questions", unansweredQuestionRestAPI);
app.route("/business-profile", businessProfileRestAPI);
app.route("/schedule", scheduleRestAPI);
app.route("/faqs", faqRestAPI);
app.route("/locations", locationRestAPI);
app.route("/countries", countryRestAPI);
app.route("/menu", menuRestAPI);
app.route("/customer-threads", customerThreadRestAPI);
app.route("/imports", menuImportRestAPI);
app.route("/team", teamRestAPI);

export default app;
