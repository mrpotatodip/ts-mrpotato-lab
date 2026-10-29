import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useChatBotSoundPreference } from "../use-chat-bot-sound-preference";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  const { result } = renderHook(() => useChatBotSoundPreference());
  act(() => result.current.setMuted(true));
  cleanup();
});

describe("useChatBotSoundPreference", () => {
  it("is muted until someone turns the sound on", () => {
    const { result } = renderHook(() => useChatBotSoundPreference());

    expect(result.current.muted).toBe(true);
  });

  it("unmutes and mutes, and remembers the choice in the browser", () => {
    const { result } = renderHook(() => useChatBotSoundPreference());

    act(() => result.current.setMuted(false));
    expect(result.current.muted).toBe(false);
    expect(window.localStorage.getItem("chat-bot-sound")).toBe("on");

    act(() => result.current.setMuted(true));
    expect(result.current.muted).toBe(true);
    expect(window.localStorage.getItem("chat-bot-sound")).toBe("off");
  });

  it("starts unmuted when the browser already remembers on", () => {
    window.localStorage.setItem("chat-bot-sound", "on");

    const { result } = renderHook(() => useChatBotSoundPreference());

    expect(result.current.muted).toBe(false);
  });
});
