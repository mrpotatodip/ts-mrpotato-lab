import { describe, it, expect } from "vitest";
import {
  CHAT_BOT_CUSTOMER_AGENT_ID,
  CHAT_BOT_FAQ_ADMIN_AGENT_ID,
  CHAT_BOT_FAQ_AGENT_ID,
  CHAT_BOT_MAIN_AGENT_ID,
  CHAT_BOT_MAIN_ROUTE,
  CHAT_BOT_MENU_ADMIN_AGENT_ID,
  CHAT_BOT_MENU_AGENT_ID,
  CHAT_BOT_SCHEDULE_ADMIN_AGENT_ID,
  CHAT_BOT_SCHEDULE_AGENT_ID,
} from "#/modules/chat-bot/constants";
import {
  CHAT_BOT_CUSTOMER_GUARD_RAIL_PROMPT,
  CHAT_BOT_GUARD_RAIL_PROMPT,
  chatBotCustomerAgent,
  chatBotMainAgent,
} from "#/modules/chat-bot/agents";
import * as adminTools from "#/modules/chat-bot/agent-tools/admin";
import type { ChatBotAgent } from "#/modules/chat-bot/types";

const allAgents = (agent: ChatBotAgent): ChatBotAgent[] => [
  agent,
  ...agent.subagents.flatMap(allAgents),
];

const roots = [chatBotMainAgent, chatBotCustomerAgent];
const everyAgent = roots.flatMap(allAgents);

const AGENT_ID_FORMAT =
  /^([a-z][a-z0-9_]*)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const text = (agent: (typeof everyAgent)[number]) => agent.prompts.join("\n");

describe("chat-bot agent config", () => {
  it("wires the signed-in main to the admin specialists, reading data itself", () => {
    expect(chatBotMainAgent.id).toBe(CHAT_BOT_MAIN_AGENT_ID);
    expect(chatBotMainAgent.tools.map((t) => t.definition.name)).toEqual([
      "getOpeningSchedule",
      "findMenuItems",
      "listMenu",
      "listFaqs",
      "getBusinessProfile",
      "setThreadLocation",
      "setThreadCountry",
    ]);
    expect(chatBotMainAgent.subagents.map((sub) => sub.id)).toEqual([
      CHAT_BOT_SCHEDULE_ADMIN_AGENT_ID,
      CHAT_BOT_MENU_ADMIN_AGENT_ID,
      CHAT_BOT_FAQ_ADMIN_AGENT_ID,
    ]);
  });

  it("wires the Customer's main to the read-only specialists", () => {
    expect(chatBotCustomerAgent.id).toBe(CHAT_BOT_CUSTOMER_AGENT_ID);
    expect(chatBotCustomerAgent.subagents.map((sub) => sub.id)).toEqual([
      CHAT_BOT_SCHEDULE_AGENT_ID,
      CHAT_BOT_MENU_AGENT_ID,
      CHAT_BOT_FAQ_AGENT_ID,
    ]);
  });

  // -----
  // The widget is anonymous: nothing under
  // the Customer's main may change data.
  // -----
  it("never gives a Customer-facing agent an admin tool", () => {
    const adminToolNames = Object.keys(adminTools)
      .filter((name) => name.endsWith("Tool"))
      .map((name) => name.slice(0, -"Tool".length));
    const customerToolNames = allAgents(chatBotCustomerAgent).flatMap((agent) =>
      agent.tools.map((tool) => tool.definition.name),
    );

    expect(adminToolNames).not.toHaveLength(0);
    expect(customerToolNames.filter((name) => adminToolNames.includes(name))).toEqual([]);
  });

  // -----
  // Ids key chat_bot_runs / messages rows, so
  // they keep the seeded `{name}_{uuid}` form.
  // -----
  it("gives every agent an id of the form {name}_{uuid}", () => {
    for (const agent of everyAgent) {
      expect(agent.id.match(AGENT_ID_FORMAT)?.[1]).toBe(agent.name);
    }
  });

  it("gives every agent an id no other agent uses", () => {
    const ids = [...new Set(everyAgent)].map((agent) => agent.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every agent a guard rail", () => {
    const unguarded = everyAgent
      .filter(
        (agent) =>
          !agent.prompts.includes(CHAT_BOT_GUARD_RAIL_PROMPT) &&
          !agent.prompts.includes(CHAT_BOT_CUSTOMER_GUARD_RAIL_PROMPT),
      )
      .map((agent) => agent.name);

    expect(unguarded).toEqual([]);
  });

  // -----
  // The router's fallback is "main"; a child
  // with that name could never be picked.
  // -----
  it("never names a child after the router's fallback", () => {
    for (const root of roots) {
      for (const sub of root.subagents) {
        expect(sub.name).not.toBe(CHAT_BOT_MAIN_ROUTE);
      }
    }
  });

  // -----
  // A tool shared by two agents counts once;
  // two different tools must not share a name.
  // -----
  it("gives every tool a unique name", () => {
    const tools = [...new Set(everyAgent.flatMap((agent) => agent.tools))];
    const names = tools.map((tool) => tool.definition.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // -----
  // Real-model behaviour can't be tested here; this only
  // pins that the Country rules are written down where
  // the model reads them.
  // -----
  it("tells the customer-facing agents how to handle Countries", () => {
    const [schedule, menu] = chatBotCustomerAgent.subagents;

    expect(text(chatBotCustomerAgent)).toContain("setThreadCountry");
    expect(text(chatBotCustomerAgent)).toMatch(/never for prices/i);
    expect(text(menu)).toContain("setThreadCountry");
    expect(text(menu)).toMatch(/do not quote a price/i);
    expect(text(schedule)).toContain("setThreadCountry");
    expect(text(chatBotMainAgent)).toContain("setThreadCountry");
  });

  it("tells the signed-in agents to ask which country for a price change", () => {
    const menuAdmin = chatBotMainAgent.subagents.find((agent) => agent.id === CHAT_BOT_MENU_ADMIN_AGENT_ID);
    const priceTool = menuAdmin?.tools.find((tool) => tool.definition.name === "updateMenuItemPrice");

    expect(menuAdmin && text(menuAdmin)).toMatch(/needsCountry true/);
    expect(menuAdmin && text(menuAdmin)).toMatch(/Never choose a country/i);
    expect(text(chatBotMainAgent)).toMatch(/Never pick a country/i);
    expect(priceTool?.definition.description).toMatch(/countryId/);
    expect(priceTool?.definition.description).toMatch(/needsCountry true/);
  });

  it("documents countryId on the menu tools", () => {
    const menuTools = chatBotCustomerAgent.tools.filter((tool) =>
      ["listMenu", "findMenuItems", "showMenuItems"].includes(tool.definition.name),
    );

    expect(menuTools).toHaveLength(3);
    for (const tool of menuTools) {
      expect(tool.definition.description).toMatch(/countr/);
      expect(JSON.stringify(tool.definition.inputSchema)).toContain("countryId");
    }
  });
});
