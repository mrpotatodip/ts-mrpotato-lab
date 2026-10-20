import { ChatBot, ChatBotRoom, type ChatBotProps, type ChatBotRoomProps } from "@repo/chat-bot-react";
import { createContext, useContext } from "react";
import { ChatBotProgress, type ChatBotProgressProps } from "./chat-bot-progress";
import type { ChatBotProgressLabels } from "./labels";
import { useChatBotProgress } from "./use-chat-bot-progress";

type ProgressConfig = {
  labels?: ChatBotProgressLabels;
  maxVisible?: number;
  sounds?: ChatBotProgressProps["sounds"];
  tree?: ChatBotProgressProps["tree"];
};

const ProgressConfigContext = createContext<ProgressConfig>({});

// -----
// A ChatBotRoom that draws the turn's steps under the
// messages. It reads its words from the nearest
// <ChatBotWithProgress>, or uses the defaults.
// -----
export function ChatBotRoomWithProgress(props: ChatBotRoomProps) {
  const { labels, maxVisible, sounds, tree } = useContext(ProgressConfigContext);
  const progress = useChatBotProgress();
  return (
    <ChatBotRoom
      {...props}
      onChunk={(chunk) => {
        progress.onChunk(chunk);
        props.onChunk?.(chunk);
      }}
      onTurnStart={() => {
        progress.onTurnStart();
        props.onTurnStart?.();
      }}
      progress={<ChatBotProgress state={progress.state} labels={labels} maxVisible={maxVisible} sounds={sounds} tree={tree} />}
    />
  );
}

export type ChatBotWithProgressProps = ChatBotProps & ProgressConfig;

// -----
// <ChatBot /> with the step-by-step progress display:
//   <ChatBotWithProgress endpoint="/api/chat" labels={{ tools: { lookupOrder: { busy: "Looking up your order", done: "Found your order" } } }} />
// -----
export function ChatBotWithProgress({ labels, maxVisible, sounds, tree, ...props }: ChatBotWithProgressProps) {
  return (
    <ProgressConfigContext.Provider value={{ labels, maxVisible, sounds, tree }}>
      <ChatBot {...props} room={ChatBotRoomWithProgress} />
    </ProgressConfigContext.Provider>
  );
}
