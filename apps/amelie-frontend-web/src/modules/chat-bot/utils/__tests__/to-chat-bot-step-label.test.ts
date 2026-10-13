import { describe, expect, it } from "vitest";

import { toChatBotStepLabel } from "../to-chat-bot-step-label";

describe("toChatBotStepLabel", () => {
  it("names a helper and a tool in plain words", () => {
    expect(toChatBotStepLabel("schedule").done).toBe("Checked the opening hours");
    expect(toChatBotStepLabel("findMenuItems").busy).toBe("Searching the menu");
  });

  it("never shows a code name it doesn't know", () => {
    expect(toChatBotStepLabel("someNewTool")).toEqual({ busy: "Working on it", done: "Finished a step" });
    expect(toChatBotStepLabel(null).done).toBe("Finished a step");
  });
});
