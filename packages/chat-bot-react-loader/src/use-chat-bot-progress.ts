import { EventType, type StreamChunk } from "@tanstack/ai";
import { useCallback, useReducer } from "react";
import {
  aguiLoadingStackedReducer,
  initialAGUILoadingStackedState,
  type AGUILoadingStackedEvent,
  type AGUILoadingStackedState,
} from "./agui-loading";
import { toStackedEvent } from "./to-stacked-event";

// -----
// Pressing send starts the turn on its own. The stream's
// own RUN_STARTED would otherwise wipe the rows mid-turn.
// -----
const TURN_STARTED: AGUILoadingStackedEvent = { type: EventType.RUN_STARTED, runId: "turn" };

type Action = { type: "turn" } | { type: "event"; event: AGUILoadingStackedEvent };

const isLive = (state: AGUILoadingStackedState) => state.status === "running" || state.status === "waiting";

function reduce(state: AGUILoadingStackedState, action: Action): AGUILoadingStackedState {
  if (action.type === "turn") {
    return aguiLoadingStackedReducer(initialAGUILoadingStackedState, TURN_STARTED);
  }
  const { event } = action;
  if (event.type === EventType.RUN_STARTED && isLive(state)) return state;
  // -----
  // A resumed stream starts a turn; a finished turn
  // ignores stragglers.
  // -----
  const startsTurn = state.status === "idle" || event.type === EventType.RUN_STARTED;
  const base = startsTurn
    ? aguiLoadingStackedReducer(initialAGUILoadingStackedState, TURN_STARTED)
    : state;
  return aguiLoadingStackedReducer(base, event);
}

// -----
// The progress of the current turn. Hand onChunk and
// onTurnStart to ChatBotRoom; draw `state` with
// <ChatBotProgress />. Rows stay after the turn ends and
// clear when the next message is sent.
// -----
export function useChatBotProgress() {
  const [state, dispatch] = useReducer(reduce, initialAGUILoadingStackedState);
  const onChunk = useCallback((chunk: StreamChunk) => {
    const event = toStackedEvent(chunk);
    if (event) dispatch({ type: "event", event });
  }, []);
  const onTurnStart = useCallback(() => dispatch({ type: "turn" }), []);
  return { state, onChunk, onTurnStart };
}
