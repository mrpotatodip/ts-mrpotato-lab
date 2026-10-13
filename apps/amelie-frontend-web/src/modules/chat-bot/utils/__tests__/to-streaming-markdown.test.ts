import { describe, expect, it } from "vitest";
import { toStreamingMarkdown } from "../to-streaming-markdown";

describe("toStreamingMarkdown", () => {
  it("leaves balanced text alone", () => {
    expect(toStreamingMarkdown("The sum is **3**.")).toBe("The sum is **3**.");
    expect(toStreamingMarkdown("No bold here")).toBe("No bold here");
  });

  it("closes a bold that is still typing", () => {
    expect(toStreamingMarkdown("The sum is **3")).toBe("The sum is **3**");
  });

  it("drops half of a closing marker", () => {
    expect(toStreamingMarkdown("The sum is **3*")).toBe("The sum is **3**");
  });

  it("drops an opening marker with nothing after it yet", () => {
    expect(toStreamingMarkdown("The sum is **")).toBe("The sum is ");
    expect(toStreamingMarkdown("The sum is *")).toBe("The sum is ");
  });
});
