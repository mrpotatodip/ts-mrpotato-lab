import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import {
  getOpeningScheduleTool,
  removeHoursOverrideTool,
  setBusinessHoursTool,
  setHoursOverrideTool,
} from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_EDITOR_ONLY, CHAT_BOT_TOOL_ERROR_INVALID_INPUT } from "#/modules/chat-bot/constants";
import type { ChatBotOwner, ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import {
  SCHEDULE_OVERRIDE_NOT_FOUND,
  SCHEDULE_OVERRIDE_PAST,
} from "#/modules/schedule/constants";
import {
  createTestDb,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let owner: ChatBotOwner;
let member: ChatBotOwner;

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], who: ChatBotOwner) => {
  const runtime: ChatBotRuntime = { db, owner: who };
  return Effect.runPromise(tool.execute(input, runtime));
};

const scheduleFor = (who: ChatBotOwner) => run(getOpeningScheduleTool, {}, who);

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  const ownerLogin = await insertPersonWithLogin(db, "owner@sorella.test");
  const memberLogin = await insertPersonWithLogin(db, "member@sorella.test");
  await insertMember(db, sorellaId, ownerLogin.partyId, "tenant_admin");
  await insertMember(db, sorellaId, memberLogin.partyId, "store_staff");
  owner = { kind: "user", tenantId: sorellaId, userId: ownerLogin.userId };
  member = { kind: "user", tenantId: sorellaId, userId: memberLogin.userId };
});

describe("setHoursOverride", () => {
  it("saves one date for an owner, and saving it again replaces it", async () => {
    const closed = { date: "2999-12-25", isClosed: true, opensAt: null, closesAt: null, note: "Christmas" };
    expect(await run(setHoursOverrideTool, closed, owner)).toEqual(closed);

    const lateOpening = { ...closed, isClosed: false, opensAt: "08:00", closesAt: "20:00", note: null };
    expect(await run(setHoursOverrideTool, lateOpening, owner)).toEqual(lateOpening);
    expect(await scheduleFor(owner)).toHaveProperty("specialDates", [lateOpening]);
  });

  it("refuses a date already past in the Tenant's timezone", async () => {
    const input = { date: "2000-01-01", isClosed: true, opensAt: null, closesAt: null, note: null };

    expect(await run(setHoursOverrideTool, input, owner)).toEqual({ error: SCHEDULE_OVERRIDE_PAST });
  });

  it.each([
    ["closed with times", { isClosed: true, opensAt: "08:00", closesAt: "16:00" }],
    ["open without times", { isClosed: false, opensAt: null, closesAt: null }],
    ["closing before opening", { isClosed: false, opensAt: "16:00", closesAt: "08:00" }],
    ["a time that isn't HH:MM", { isClosed: false, opensAt: "8am", closesAt: "16:00" }],
    ["a date that doesn't exist", { date: "2999-02-30", isClosed: true, opensAt: null, closesAt: null }],
  ])("rejects %s before writing", async (_, hours) => {
    const input = { date: "2999-12-24", note: null, ...hours };

    expect(await run(setHoursOverrideTool, input, owner)).toEqual({ error: CHAT_BOT_TOOL_ERROR_INVALID_INPUT });
  });
});

describe("removeHoursOverride", () => {
  it("removes a date's special hours, then reports there are none", async () => {
    const date = "2999-11-11";
    await run(setHoursOverrideTool, { date, isClosed: true, opensAt: null, closesAt: null, note: null }, owner);

    expect(await run(removeHoursOverrideTool, { date }, owner)).toEqual({ date });
    expect(await run(removeHoursOverrideTool, { date }, owner)).toEqual({
      error: SCHEDULE_OVERRIDE_NOT_FOUND,
    });
  });
});

describe("setBusinessHours", () => {
  it("sets a weekday's regular hours, then closes it", async () => {
    const open = { weekday: "Monday", isClosed: false, opensAt: "07:00", closesAt: "15:00" };
    expect(await run(setBusinessHoursTool, open, owner)).toEqual({ ...open, isSet: true });

    const closed = { weekday: "Monday", isClosed: true, opensAt: null, closesAt: null };
    expect(await run(setBusinessHoursTool, closed, owner)).toEqual({ ...closed, isSet: true });
    expect(await scheduleFor(owner)).toHaveProperty("weekly.1", { ...closed, isSet: true });
  });
});

// -----
// Who may write: the role is read from the
// database on every call, never from input.
// -----
describe("admin hours tools access", () => {
  const sunday = { weekday: "Sunday", isClosed: true, opensAt: null, closesAt: null };

  it("refuses a member who is not a tenant_admin or store_admin", async () => {
    expect(await run(setBusinessHoursTool, sunday, member)).toEqual({ error: CHAT_BOT_EDITOR_ONLY });
    expect(await scheduleFor(owner)).toHaveProperty("weekly.0.isSet", false);
  });

  it("refuses an anonymous Customer", async () => {
    const customer: ChatBotOwner = { kind: "anonymous", tenantId: sorellaId, anonymousId: "a-1" };

    expect(await run(setBusinessHoursTool, sunday, customer)).toEqual({ error: CHAT_BOT_EDITOR_ONLY });
  });

  it("never writes to a Tenant the login doesn't belong to", async () => {
    const elsewhere: ChatBotOwner = { ...owner, tenantId: otherCafeId };

    expect(await run(setBusinessHoursTool, sunday, elsewhere)).toHaveProperty("error");
    expect(await scheduleFor(elsewhere)).toHaveProperty("weekly.0.isSet", false);
  });
});
