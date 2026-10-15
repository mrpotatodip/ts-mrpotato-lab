import { describe, expect, it } from "vitest";
import { unansweredWeekCopy } from "../unanswered-question-week-copy";

describe("unansweredWeekCopy", () => {
  it("uses singular verbs when the counts are one", () => {
    expect(unansweredWeekCopy(1, 1)).toEqual({
      lead: "1 question in the last 7 days",
      need: "1 needs information",
    });
  });

  it("uses plural verbs when the counts are not one", () => {
    expect(unansweredWeekCopy(18, 0)).toEqual({
      lead: "18 questions in the last 7 days",
      need: "0 need information",
    });
  });
});
