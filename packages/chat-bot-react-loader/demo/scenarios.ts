import { EventType, type StreamChunk } from "@tanstack/ai";

export type Step = { wait: number; chunk: Record<string, unknown> };
export type Scenario = { name: string; description: string; steps: Step[] };

const at = (wait: number, chunk: Record<string, unknown>): Step => ({ wait, chunk });

const runStarted = at(300, { type: EventType.RUN_STARTED, runId: "r1", threadId: "t1" });
const runFinished = (wait: number) => at(wait, { type: EventType.RUN_FINISHED, runId: "r1" });

const reply = (id: string, wait = 600): Step[] => [
  at(wait, { type: EventType.TEXT_MESSAGE_START, messageId: id, role: "assistant" }),
  at(1500, { type: EventType.TEXT_MESSAGE_CONTENT, messageId: id, delta: "Here you go." }),
  at(300, { type: EventType.TEXT_MESSAGE_END, messageId: id }),
];

const tool = (id: string, name: string, wait: number, took: number): Step[] => [
  at(wait, { type: EventType.TOOL_CALL_START, toolCallId: id, toolCallName: name }),
  at(took, { type: EventType.TOOL_CALL_END, toolCallId: id }),
  at(100, { type: EventType.TOOL_CALL_RESULT, toolCallId: id, content: "{}" }),
];

// A tool call made by a subagent, tagged with its run id.
const subTool = (agent: string, id: string, name: string, wait: number, took: number): Step[] => [
  at(wait, { type: EventType.TOOL_CALL_START, subagentRunId: agent, toolCallId: id, toolCallName: name }),
  at(took, { type: EventType.TOOL_CALL_END, subagentRunId: agent, toolCallId: id }),
  at(100, { type: EventType.TOOL_CALL_RESULT, subagentRunId: agent, toolCallId: id, content: "{}" }),
];

export const SCENARIOS: Scenario[] = [
  {
    name: "Plain reply",
    description: "No tools: the turn starts, then the model writes text.",
    steps: [runStarted, ...reply("m1"), runFinished(200)],
  },
  {
    name: "One tool",
    description: "A labelled tool call, then the reply.",
    steps: [runStarted, ...tool("c1", "lookupOrder", 500, 2500), ...reply("m1"), runFinished(200)],
  },
  {
    name: "Many tools",
    description: "More steps than maxVisible, so older rows fold into 'earlier steps'.",
    steps: [
      runStarted,
      ...tool("c1", "lookupOrder", 400, 1200),
      ...tool("c2", "checkStock", 300, 1200),
      ...tool("c3", "findCustomer", 300, 1200),
      ...tool("c4", "applyDiscount", 300, 1200),
      ...tool("c5", "sendReceipt", 300, 1200),
      ...tool("c6", "unlabelledTool", 300, 1200),
      ...tool("c7", "refundPayment", 300, 1200),
      ...reply("m1"),
      runFinished(200),
    ],
  },
  {
    name: "Subagent",
    description: "A specialist runs its own tool, tagged with its run id.",
    steps: [
      runStarted,
      at(500, { type: EventType.SUBAGENT_STARTED, subagentRunId: "s1", name: "researcher", description: "" }),
      at(500, { type: EventType.TOOL_CALL_START, subagentRunId: "s1", toolCallId: "c1", toolCallName: "lookupOrder" }),
      at(2000, { type: EventType.TOOL_CALL_END, subagentRunId: "s1", toolCallId: "c1" }),
      at(100, { type: EventType.TOOL_CALL_RESULT, subagentRunId: "s1", toolCallId: "c1", content: "{}" }),
      at(300, { type: EventType.SUBAGENT_FINISHED, subagentRunId: "s1" }),
      ...reply("m1"),
      runFinished(200),
    ],
  },
  {
    name: "Multi agent",
    description: "Two specialists with several tools each, and one of them starts a nested specialist.",
    steps: [
      runStarted,
      at(400, { type: EventType.SUBAGENT_STARTED, subagentRunId: "s1", name: "researcher", description: "" }),
      ...subTool("s1", "c1", "lookupOrder", 400, 1000),
      ...subTool("s1", "c2", "checkStock", 200, 1000),
      at(200, { type: EventType.SUBAGENT_FINISHED, subagentRunId: "s1" }),
      at(300, { type: EventType.SUBAGENT_STARTED, subagentRunId: "s2", name: "billing", description: "" }),
      ...subTool("s2", "c3", "applyDiscount", 400, 1000),
      at(300, {
        type: EventType.SUBAGENT_STARTED,
        subagentRunId: "s3",
        name: "auditor",
        description: "",
        parentSubagentRunId: "s2",
      }),
      ...subTool("s3", "c4", "checkStock", 400, 1000),
      ...subTool("s3", "c5", "refundPayment", 200, 1000),
      at(200, { type: EventType.SUBAGENT_FINISHED, subagentRunId: "s3" }),
      ...subTool("s2", "c6", "sendReceipt", 300, 1000),
      at(200, { type: EventType.SUBAGENT_FINISHED, subagentRunId: "s2" }),
      ...reply("m1"),
      runFinished(200),
    ],
  },
  {
    name: "Error",
    description: "The run fails part-way through a tool call.",
    steps: [
      runStarted,
      at(500, { type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "lookupOrder" }),
      at(1800, { type: EventType.RUN_ERROR, message: "The order service is down", code: "upstream" }),
    ],
  },
];

export const asChunk = (step: Step) => step.chunk as unknown as StreamChunk;
