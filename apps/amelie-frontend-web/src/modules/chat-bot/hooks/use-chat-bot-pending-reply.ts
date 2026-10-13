import { useSyncExternalStore } from "react";

import { chatBotPendingReplyStore } from "../stores";

// -----
// null on the server and while hydrating,
// so server and first client render match.
// -----
export function useChatBotPendingReplyThread(): string | null {
  return useSyncExternalStore(
    chatBotPendingReplyStore.subscribe,
    chatBotPendingReplyStore.get,
    () => null,
  );
}
