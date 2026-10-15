import { Effect } from "effect";
import {
  CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN,
  CHAT_BOT_DURABLE_STREAM_START_OFFSET,
  checkChatBotDurableStreamOffset,
  isChatBotDurableStreamOffsetError,
  readChatBotDurableStreamResumeOffset,
} from "@repo/chat-bot-durable-stream";
import { CHAT_BOT_STREAM_OFFSET_INVALID, CHAT_BOT_STREAM_OFFSET_OTHER_RUN } from "../constants";
import { ChatBotInvalid } from "../errors";

// -----
// The offset must point into the run the server
// already authorised; it never picks the run.
// -----
export const readChatBotStreamOffsetForRunEffect = (
  request: Request,
  runId: string,
): Effect.Effect<string, ChatBotInvalid> =>
  Effect.gen(function* () {
    const offset =
      readChatBotDurableStreamResumeOffset(request) ?? CHAT_BOT_DURABLE_STREAM_START_OFFSET;
    const check = checkChatBotDurableStreamOffset(offset, runId);
    if (isChatBotDurableStreamOffsetError(check)) {
      return yield* new ChatBotInvalid({
        message:
          check.error === CHAT_BOT_DURABLE_STREAM_OFFSET_OTHER_RUN
            ? CHAT_BOT_STREAM_OFFSET_OTHER_RUN
            : CHAT_BOT_STREAM_OFFSET_INVALID,
      });
    }
    return offset;
  });
