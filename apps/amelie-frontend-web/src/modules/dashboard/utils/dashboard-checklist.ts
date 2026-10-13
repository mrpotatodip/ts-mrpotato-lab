import type { DashboardRoute } from "../types";

export type DashboardChecklistStepId = "menu" | "hours" | "faqs" | "chat";

export type DashboardChecklistStep = {
  id: DashboardChecklistStepId;
  label: string;
  hint: string;
  to: DashboardRoute;
  done: boolean;
};

export type DashboardChecklistInput = {
  menuItemCount: number;
  hasWeeklyHours: boolean;
  faqCount: number;
  chatCount: number;
};

// -----
// Hours count as set once any weekday has a saved row.
// A day saved as closed is still a decision, so it counts.
// -----
export function hasWeeklyHours(weekly: { isSet: boolean }[]): boolean {
  return weekly.some((day) => day.isSet);
}

// -----
// The four setup steps, each ticked from data that
// already exists. Nothing is stored for progress.
// -----
export function buildDashboardChecklist(input: DashboardChecklistInput): DashboardChecklistStep[] {
  return [
    {
      id: "menu",
      label: "Import your menu",
      hint: "Upload a menu so the assistant knows what you sell.",
      to: "/imports",
      done: input.menuItemCount > 0,
    },
    {
      id: "hours",
      label: "Set your hours",
      hint: "Tell customers when you are open.",
      to: "/hours",
      done: input.hasWeeklyHours,
    },
    {
      id: "faqs",
      label: "Add FAQs",
      hint: "Write answers to what customers ask most.",
      to: "/faqs",
      done: input.faqCount > 0,
    },
    {
      id: "chat",
      label: "Test the chat",
      hint: "Ask the assistant a question as a customer would.",
      to: "/chat-bot",
      done: input.chatCount > 0,
    },
  ];
}

// -----
// The card shows only while a step is left.
// -----
export function isChecklistComplete(steps: DashboardChecklistStep[]): boolean {
  return steps.every((step) => step.done);
}
