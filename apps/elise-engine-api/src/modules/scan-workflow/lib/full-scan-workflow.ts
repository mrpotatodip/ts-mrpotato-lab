import { sandboxesOf } from "#/lib/scan-path";
import { SCAN_SANDBOX_FULL_PHASES, type FullPhase } from "#/modules/scan-sandbox";
import { SCAN_WORKFLOW_FULL_MAX_POLLS } from "#/modules/scan-workflow/constants";
import type { Bindings } from "#/types/variables";
import { ScanWorkflow } from "./scan-workflow";

// -----
// The Workflow of a full Scan: the same steps as the lite one, in its
// own Workflow, run in the full Sandbox class. It is still one run
// with no phases. Decisions: ADR 0006.
// -----
export class FullScanWorkflow extends ScanWorkflow {
  protected override get sandboxes(): Bindings["SANDBOX"] {
    return sandboxesOf(this.env, "full");
  }

  protected override get maxPolls(): number {
    return SCAN_WORKFLOW_FULL_MAX_POLLS;
  }

  protected override get phases(): readonly FullPhase[] {
    return SCAN_SANDBOX_FULL_PHASES;
  }
}
