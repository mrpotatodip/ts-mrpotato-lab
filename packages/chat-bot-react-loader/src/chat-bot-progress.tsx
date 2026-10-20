import {
  AGUILoadingStacked,
  AGUILoadingStackedEarlier,
  AGUILoadingStackedStepIcon,
  AGUILoadingStackedStepText,
  AGUILoadingStackedSteps,
} from "./agui-loading/adapters/react";
import type { AGUILoadingStackedState } from "./agui-loading";
import { textsFor, type ChatBotProgressLabels } from "./labels";
import { useStepSounds, type ProgressSoundsConfig } from "./use-step-sounds";

export type ChatBotProgressProps = {
  state: AGUILoadingStackedState;
  labels?: ChatBotProgressLabels;
  // Rows shown at once; older ones fold into "earlier steps". Default 6.
  maxVisible?: number;
  // Sounds: true for the built-ins (ripple as a level starts, petal as it finishes),
  // or { start, end }, each true or a pick of levels.
  sounds?: ProgressSoundsConfig;
  // Draw tree lines so a subagent's rows hang under its own row. Default false.
  tree?: boolean;
  className?: string;
};

// -----
// One row per step of the turn, each with a spinner then a
// tick, and friendly rotating text.
// -----
export function ChatBotProgress({ state, labels, maxVisible = 6, sounds, tree, className }: ChatBotProgressProps) {
  useStepSounds(state, sounds);
  const { busy, done } = textsFor(labels);
  return (
    <AGUILoadingStacked
      whenDone="keep"
      state={state}
      maxVisible={maxVisible}
      className={className ? `cbl-progress ${className}` : "cbl-progress"}
    >
      <AGUILoadingStackedEarlier />
      <AGUILoadingStackedSteps rowClassName="cbl-row" tree={tree}>
        <AGUILoadingStackedStepIcon />
        <AGUILoadingStackedStepText busyByEvent={busy} doneByEvent={done} />
      </AGUILoadingStackedSteps>
    </AGUILoadingStacked>
  );
}
