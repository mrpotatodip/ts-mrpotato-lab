import { EventType } from "@tanstack/ai";

import {
  AGUILoadingStacked,
  AGUILoadingStackedEarlier,
  AGUILoadingStackedStepIcon,
  AGUILoadingStackedStepText,
  AGUILoadingStackedSteps,
} from "#/components/agui-loading/adapters/react";
import type { AGUILoadingStackedByEvent } from "#/components/agui-loading";
import {
  CHAT_BOT_ANSWER_BUSY_TEXTS,
  CHAT_BOT_ANSWER_DONE_TEXT,
  CHAT_BOT_PROSE_BUSY_TEXTS,
  CHAT_BOT_PROSE_DONE_TEXT,
  CHAT_BOT_RUN_BUSY_TEXTS,
  CHAT_BOT_RUN_DONE_TEXT,
} from "../constants";
import { useChatBotStreamState } from "../hooks/use-chat-bot-stream-state";
import { isChatBotAnswerStep } from "../stores";
import { toChatBotStepLabel } from "../utils";

// -----
// Tool-loop prose is hidden in the chat,
// so its row reads as thinking.
// -----
const BUSY_BY_EVENT: AGUILoadingStackedByEvent<readonly string[]> = {
  [EventType.RUN_STARTED]: CHAT_BOT_RUN_BUSY_TEXTS,
  [EventType.TOOL_CALL_START]: (step) => [toChatBotStepLabel(step.toolCallName).busy],
  [EventType.SUBAGENT_STARTED]: (step) => [toChatBotStepLabel(step.subagentName).busy],
  [EventType.TEXT_MESSAGE_START]: (step) =>
    isChatBotAnswerStep(step.id)
      ? CHAT_BOT_ANSWER_BUSY_TEXTS
      : CHAT_BOT_PROSE_BUSY_TEXTS,
};

const DONE_BY_EVENT: AGUILoadingStackedByEvent<string> = {
  [EventType.RUN_STARTED]: CHAT_BOT_RUN_DONE_TEXT,
  [EventType.TOOL_CALL_START]: (step) => toChatBotStepLabel(step.toolCallName).done,
  [EventType.SUBAGENT_STARTED]: (step) => toChatBotStepLabel(step.subagentName).done,
  [EventType.TEXT_MESSAGE_START]: (step) =>
    isChatBotAnswerStep(step.id) ? CHAT_BOT_ANSWER_DONE_TEXT : CHAT_BOT_PROSE_DONE_TEXT,
};

// -----
// One row per step of the turn; kept after it
// ends, cleared when the next turn is sent.
// -----
export function ChatBotLoadingStacked() {
  const state = useChatBotStreamState();

  return (
    <AGUILoadingStacked
      whenDone="keep"
      state={state}
      maxVisible={6}
      className="shrink-0 px-4 text-sm text-muted-foreground"
    >
      <AGUILoadingStackedEarlier />
      <AGUILoadingStackedSteps rowClassName="flex items-center gap-2">
        <AGUILoadingStackedStepIcon />
        <AGUILoadingStackedStepText
          busyByEvent={BUSY_BY_EVENT}
          doneByEvent={DONE_BY_EVENT}
        />
      </AGUILoadingStackedSteps>
    </AGUILoadingStacked>
  );
}
