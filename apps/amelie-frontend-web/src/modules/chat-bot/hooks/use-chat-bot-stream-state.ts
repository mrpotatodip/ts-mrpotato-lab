import { useSyncExternalStore } from "react";
import {
  initialAGUILoadingStackedState,
  type AGUILoadingStackedState,
} from "@repo/chat-bot-react-loader/agui-loading";

import { chatBotStreamStateStore } from "../stores";

export function useChatBotStreamState(): AGUILoadingStackedState {
  return useSyncExternalStore(
    chatBotStreamStateStore.subscribe,
    chatBotStreamStateStore.get,
    () => initialAGUILoadingStackedState,
  );
}
