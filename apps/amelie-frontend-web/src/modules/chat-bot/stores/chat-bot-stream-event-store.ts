import { EventType, type StreamChunk } from "@tanstack/ai";
import {
  aguiLoadingStackedReducer,
  initialAGUILoadingStackedState,
  type AGUILoadingStackedState,
} from "#/components/agui-loading";

import { CHAT_BOT_STRUCTURED_OUTPUT_START, CHAT_BOT_TURN_STARTED } from "../constants";
import { toChatBotStackedEvent } from "../utils";
import { createChatBotStore } from "./create-chat-bot-store";

export const chatBotStreamStateStore = createChatBotStore<AGUILoadingStackedState>(
  () => initialAGUILoadingStackedState,
);

let answerNext = false;
let answerStepIds: ReadonlySet<string> = new Set();

export function isChatBotAnswerStep(stepId: string): boolean {
  return answerStepIds.has(stepId);
}

// -----
// The message right after structured-output
// start is the answer; others are tool prose.
// -----
function trackAnswerStep(chunk: StreamChunk): void {
  if (chunk.type === EventType.CUSTOM && chunk.name === CHAT_BOT_STRUCTURED_OUTPUT_START) {
    answerNext = true;
    return;
  }
  if (chunk.type === EventType.TEXT_MESSAGE_START && answerNext) {
    answerNext = false;
    answerStepIds = new Set(answerStepIds).add(`message:${chunk.messageId}`);
  }
}

function resetAnswerSteps(): void {
  answerNext = false;
  answerStepIds = new Set();
}

function isTurnLive(current: AGUILoadingStackedState): boolean {
  return current.status === "running" || current.status === "waiting";
}

// -----
// Send starts the turn: the stream's own
// RUN_STARTED would wipe rows mid-turn.
// -----
export function startChatBotStreamTurn(): void {
  resetAnswerSteps();
  chatBotStreamStateStore.set(
    aguiLoadingStackedReducer(initialAGUILoadingStackedState, CHAT_BOT_TURN_STARTED),
  );
}

export function recordChatBotStreamEvent(chunk: StreamChunk): void {
  const event = toChatBotStackedEvent(chunk);
  const state = chatBotStreamStateStore.get();
  if (!event) {
    if (isTurnLive(state)) trackAnswerStep(chunk);
    return;
  }
  if (event.type === EventType.RUN_STARTED && isTurnLive(state)) return;
  // -----
  // A resumed stream starts a turn; a
  // finished turn ignores stragglers.
  // -----
  const startsTurn = state.status === "idle" || event.type === EventType.RUN_STARTED;
  if (startsTurn) resetAnswerSteps();
  const base = startsTurn
    ? aguiLoadingStackedReducer(initialAGUILoadingStackedState, CHAT_BOT_TURN_STARTED)
    : state;
  if (isTurnLive(base)) trackAnswerStep(chunk);
  chatBotStreamStateStore.set(aguiLoadingStackedReducer(base, event));
}
