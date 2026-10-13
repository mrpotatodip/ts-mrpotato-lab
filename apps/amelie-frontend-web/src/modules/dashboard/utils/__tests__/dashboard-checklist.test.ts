import { describe, expect, it } from "vitest";
import { buildDashboardChecklist, hasWeeklyHours, isChecklistComplete } from "../dashboard-checklist";

const empty = { menuItemCount: 0, hasWeeklyHours: false, faqCount: 0, chatCount: 0 };

describe("buildDashboardChecklist", () => {
  it("leaves every step unticked for an empty cafe", () => {
    const steps = buildDashboardChecklist(empty);
    expect(steps.map((step) => step.done)).toEqual([false, false, false, false]);
    expect(steps[0].to).toBe("/imports");
  });

  it("ticks only the step whose data exists", () => {
    const steps = buildDashboardChecklist({ ...empty, faqCount: 2 });
    expect(steps.find((step) => step.id === "faqs")?.done).toBe(true);
    expect(steps.filter((step) => step.done)).toHaveLength(1);
  });

  it("is complete only when every step is done", () => {
    const full = { menuItemCount: 5, hasWeeklyHours: true, faqCount: 3, chatCount: 1 };
    expect(isChecklistComplete(buildDashboardChecklist(full))).toBe(true);
    expect(isChecklistComplete(buildDashboardChecklist({ ...full, chatCount: 0 }))).toBe(false);
  });
});

describe("hasWeeklyHours", () => {
  it("is false when no weekday is saved", () => {
    expect(hasWeeklyHours([{ isSet: false }, { isSet: false }])).toBe(false);
  });

  it("counts a day saved as closed", () => {
    expect(hasWeeklyHours([{ isSet: false }, { isSet: true }])).toBe(true);
  });
});
