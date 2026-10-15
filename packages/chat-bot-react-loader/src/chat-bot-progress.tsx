import {
  AGUILoadingStacked,
  AGUILoadingStackedEarlier,
  AGUILoadingStackedStepIcon,
  AGUILoadingStackedStepText,
  AGUILoadingStackedSteps,
} from "./agui-loading/adapters/react";
import type { AGUILoadingStackedState } from "./agui-loading";
import { textsFor, type ChatBotProgressLabels } from "./labels";

export type ChatBotProgressProps = {
  state: AGUILoadingStackedState;
  labels?: ChatBotProgressLabels;
  // Rows shown at once; older ones fold into "earlier steps". Default 6.
  maxVisible?: number;
  className?: string;
};

// -----
// One row per step of the turn, each with a spinner then a
// tick, and friendly rotating text.
// -----
export function ChatBotProgress({ state, labels, maxVisible = 6, className }: ChatBotProgressProps) {
  const { busy, done } = textsFor(labels);
  return (
    <AGUILoadingStacked
      whenDone="keep"
      state={state}
      maxVisible={maxVisible}
      className={className ? `cbl-progress ${className}` : "cbl-progress"}
    >
      <AGUILoadingStackedEarlier />
      <AGUILoadingStackedSteps rowClassName="cbl-row">
        <AGUILoadingStackedStepIcon />
        <AGUILoadingStackedStepText busyByEvent={busy} doneByEvent={done} />
      </AGUILoadingStackedSteps>
    </AGUILoadingStacked>
  );
}
