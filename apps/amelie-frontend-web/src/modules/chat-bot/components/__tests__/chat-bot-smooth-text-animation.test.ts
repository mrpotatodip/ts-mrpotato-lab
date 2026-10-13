import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { ChatBotSmoothTextAnimation } from "../animations/chat-bot-smooth-text-animation";

const renderText = (props: { animate: boolean; streaming?: boolean; onRevealed: () => void }) =>
  render(
    createElement(ChatBotSmoothTextAnimation, {
      text: "That comes to 5.",
      streaming: props.streaming ?? false,
      animate: props.animate,
      onRevealed: props.onRevealed,
    }),
  );

describe("ChatBotSmoothTextAnimation", () => {
  it("reports once a live reply is fully typed out", async () => {
    const onRevealed = vi.fn<() => void>();
    const { container } = renderText({ animate: true, onRevealed });

    await waitFor(() => expect(onRevealed).toHaveBeenCalled());
    expect(container.textContent).toBe("That comes to 5.");
  });

  it("does not report while the reply is still streaming", async () => {
    const onRevealed = vi.fn<() => void>();
    renderText({ animate: true, streaming: true, onRevealed });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onRevealed).not.toHaveBeenCalled();
  });

  it("keeps typing when more text arrives mid-reveal", async () => {
    const onRevealed = vi.fn<() => void>();
    const props = { streaming: true, animate: true, onRevealed };
    const { container, rerender } = render(
      createElement(ChatBotSmoothTextAnimation, { ...props, text: "That comes" }),
    );

    rerender(
      createElement(ChatBotSmoothTextAnimation, {
        ...props,
        streaming: false,
        text: "That comes to 5, and the next one is 7.",
      }),
    );

    await waitFor(() => expect(onRevealed).toHaveBeenCalled());
    expect(container.textContent).toBe("That comes to 5, and the next one is 7.");
  });

  it("never reports for a saved reply shown in full", () => {
    const onRevealed = vi.fn<() => void>();
    const { container } = renderText({ animate: false, onRevealed });

    expect(container.textContent).toBe("That comes to 5.");
    expect(onRevealed).not.toHaveBeenCalled();
  });
});
