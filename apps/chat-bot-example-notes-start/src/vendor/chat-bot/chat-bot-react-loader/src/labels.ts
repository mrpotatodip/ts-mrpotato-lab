import { EventType } from "@tanstack/ai";
import type { AGUILoadingStackedByEvent } from "./agui-loading";

export type ChatBotStepLabel = { busy: string; done: string };

// -----
// The words on each row. busy texts rotate while the step
// runs; done is what it reads once it has finished.
//   run        the turn starting
//   reply      the model writing text
//   tools      by tool name: "lookupOrder" -> "Looking up your order"
//   subagents  by subagent name
//   fallback   any tool or subagent not listed
// Tool and subagent names are code names; never show them as they are.
// -----
export type ChatBotProgressLabels = {
  run?: { busy: readonly string[]; done: string };
  reply?: { busy: readonly string[]; done: string };
  tools?: Record<string, ChatBotStepLabel>;
  subagents?: Record<string, ChatBotStepLabel>;
  fallback?: ChatBotStepLabel;
};

export const DEFAULT_PROGRESS_LABELS = {
  run: { busy: ["Thinking", "Getting started"], done: "Got your message" },
  reply: { busy: ["Writing a reply", "Almost ready"], done: "Reply written" },
  tools: {},
  subagents: {},
  fallback: { busy: "Working on it", done: "Finished a step" },
} satisfies Required<ChatBotProgressLabels>;

const pick = (table: Record<string, ChatBotStepLabel> | undefined, name: string | null | undefined): ChatBotStepLabel | undefined =>
  name == null ? undefined : table?.[name];

// -----
// Which text each kind of event gets.
// -----
export function textsFor(labels: ChatBotProgressLabels = {}) {
  const run = labels.run ?? DEFAULT_PROGRESS_LABELS.run;
  const reply = labels.reply ?? DEFAULT_PROGRESS_LABELS.reply;
  const fallback = labels.fallback ?? DEFAULT_PROGRESS_LABELS.fallback;
  const tool = (name: string | null | undefined) => pick(labels.tools, name) ?? fallback;
  const subagent = (name: string | null | undefined) => pick(labels.subagents, name) ?? fallback;

  const busy: AGUILoadingStackedByEvent<readonly string[]> = {
    [EventType.RUN_STARTED]: run.busy,
    [EventType.TOOL_CALL_START]: (step) => [tool(step.toolCallName).busy],
    [EventType.SUBAGENT_STARTED]: (step) => [subagent(step.subagentName).busy],
    [EventType.TEXT_MESSAGE_START]: reply.busy,
  };
  const done: AGUILoadingStackedByEvent<string> = {
    [EventType.RUN_STARTED]: run.done,
    [EventType.TOOL_CALL_START]: (step) => tool(step.toolCallName).done,
    [EventType.SUBAGENT_STARTED]: (step) => subagent(step.subagentName).done,
    [EventType.TEXT_MESSAGE_START]: reply.done,
  };
  return { busy, done };
}
