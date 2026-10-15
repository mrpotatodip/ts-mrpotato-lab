import { describeChatBotStoreContract } from "../testing";
import { createMemoryChatBotStore } from "../memory";

describeChatBotStoreContract("memory store", async () => ({
  store: createMemoryChatBotStore({
    triggers: ["chat", "widget"],
    modules: ["chat", "customer"],
  }),
  scopes: { a: "scope-a", b: "scope-b" },
  users: { one: "user-one", two: "user-two" },
  start: { trigger: "chat", module: "chat" },
  refused: { trigger: "nope", module: "chat" },
}));
