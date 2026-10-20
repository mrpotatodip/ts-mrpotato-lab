import { createContext, use, type ComponentProps, type ReactNode } from "react";

import { AnimatePresence, motion } from "motion/react";

import {
  SLIDE_DURATION_MS,
  type AGUILoadingStackedState,
  type AGUILoadingStackedStep,
} from "../../..";
import { cn } from "../cn";

import { useAGUILoadingStackedContext } from "./agui-loading-stacked";

const ROW_TRANSITION = { duration: SLIDE_DURATION_MS / 1000, ease: "easeOut" } as const;

const AGUILoadingStackedStepContext = createContext<AGUILoadingStackedStep | null>(
  null,
);

// The row's step. Throws if a row part is used outside Steps.
export function useAGUILoadingStackedStep(part: string) {
  const step = use(AGUILoadingStackedStepContext);
  if (!step) throw new Error(`${part} must be inside AGUILoadingStackedSteps`);
  return step;
}

export type AGUILoadingStackedStepsProps = Omit<ComponentProps<"ol">, "children"> & {
  // The row. It repeats one time for each step.
  children: ReactNode;
  // Classes for each row. Style rows with data-status and data-kind.
  rowClassName?: string;
  // Slide new rows in and fade old rows out. Default true.
  animate?: boolean;
  // Draw tree lines so a subagent's rows hang under its own row. Default false.
  tree?: boolean;
};

type Guides = { pipes: boolean[]; elbow: boolean };

// -----
// The tree lines for one row: a pipe in each ancestor
// column whose branch continues below, then a tee (more
// siblings follow) or an elbow (this is the last one).
// -----
function guidesFor(
  state: AGUILoadingStackedState,
  visibleIds: string[],
  lastIndexByOwner: Map<string, number>,
  index: number,
): Guides | null {
  const ownerOf = (step: AGUILoadingStackedStep) =>
    step.kind === "subagent" ? step.parentSubagentRunId : step.subagentRunId;
  const hasLater = (step: AGUILoadingStackedStep, at: number) => {
    const owner = ownerOf(step);
    return owner != null && at < (lastIndexByOwner.get(owner) ?? -1);
  };

  const step = state.steps[visibleIds[index]!]!;
  if (ownerOf(step) == null) return null;

  const pipes: boolean[] = [];
  let parentId = state.subagentStepIds[ownerOf(step)!];
  while (parentId) {
    const parent = state.steps[parentId];
    if (!parent || ownerOf(parent) == null) break;
    pipes.unshift(hasLater(parent, visibleIds.indexOf(parentId)));
    parentId = state.subagentStepIds[ownerOf(parent)!];
  }
  return { pipes, elbow: !hasLater(step, index) };
}

// -----
// One row per step, with data-status, data-kind and
// data-subagent (the subagent the row belongs to).
// -----
export function AGUILoadingStackedSteps({
  children,
  rowClassName,
  animate = true,
  tree = false,
  className,
  ...props
}: AGUILoadingStackedStepsProps) {
  const { state, view, maxVisible } = useAGUILoadingStackedContext(
    "AGUILoadingStackedSteps",
  );

  if (view === "summary") return null;

  const visibleIds =
    maxVisible != null && maxVisible > 0 ? state.stepOrder.slice(-maxVisible) : state.stepOrder;

  const lastIndexByOwner = new Map<string, number>();
  if (tree) {
    visibleIds.forEach((id, i) => {
      const step = state.steps[id]!;
      const owner = step.kind === "subagent" ? step.parentSubagentRunId : step.subagentRunId;
      if (owner != null) lastIndexByOwner.set(owner, i);
    });
  }

  const rows = visibleIds.map((id, index) => {
    const step = state.steps[id]!;
    const guides = tree ? guidesFor(state, visibleIds, lastIndexByOwner, index) : null;
    // A subagent's own row belongs to the subagent that started it.
    const owner = step.kind === "subagent" ? step.parentSubagentRunId : step.subagentRunId;
    const rowProps = {
      "data-status": step.status,
      "data-kind": step.kind,
      "data-subagent": owner ?? undefined,
      className: cn("cbl-row", rowClassName),
    };
    const row = (
      <AGUILoadingStackedStepContext value={step}>
        {guides && (
          <span aria-hidden className="cbl-tree">
            {guides.pipes.map((pipe, i) => (
              <span key={i} className={pipe ? "cbl-tree-pipe" : "cbl-tree-gap"} />
            ))}
            <span className={guides.elbow ? "cbl-tree-elbow" : "cbl-tree-tee"} />
          </span>
        )}
        {children}
      </AGUILoadingStackedStepContext>
    );

    return animate ? (
      <motion.li
        key={id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={ROW_TRANSITION}
        {...rowProps}
      >
        {row}
      </motion.li>
    ) : (
      <li key={id} {...rowProps}>
        {row}
      </li>
    );
  });

  return (
    <ol className={cn("cbl-list", className)} {...props}>
      {animate ? <AnimatePresence initial={false}>{rows}</AnimatePresence> : rows}
    </ol>
  );
}
