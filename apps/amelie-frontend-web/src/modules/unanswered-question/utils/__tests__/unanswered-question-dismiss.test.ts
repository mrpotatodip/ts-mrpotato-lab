import { describe, expect, it } from "vitest";
import type { UnansweredQuestionList } from "@repo/contracts/amelie";
import { withoutQuestion } from "../unanswered-question-dismiss";

const question = (messageId: string) => ({
  messageId,
  threadId: "00000000-0000-4000-8000-000000000001",
  question: "Do you open on Sundays?",
  topics: [],
  askedAt: "2026-10-12T08:00:00.000Z",
});

const list: UnansweredQuestionList = {
  summary: { weekQuestions: 5, weekUnanswered: 2 },
  questions: [question("a"), question("b")],
};

describe("withoutQuestion", () => {
  it("drops the dismissed question", () => {
    expect(withoutQuestion(list, "a").questions.map((entry) => entry.messageId)).toEqual(["b"]);
  });

  it("leaves the week's counts for the reload to settle", () => {
    expect(withoutQuestion(list, "a").summary).toBe(list.summary);
  });
});
