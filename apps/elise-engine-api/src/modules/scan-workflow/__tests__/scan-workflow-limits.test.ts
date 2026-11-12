import { describe, expect, it } from "vitest";
import { SCAN_WORKFLOW_FULL_MAX_POLLS, SCAN_WORKFLOW_FULL_PHASE_MINUTES, SCAN_WORKFLOW_MAX_POLLS, SCAN_WORKFLOW_POLL_SECONDS } from "#/modules/scan-workflow/constants";

const minutesOf = (polls: number) => (polls * SCAN_WORKFLOW_POLL_SECONDS) / 60;

describe("the time limits of the two paths", () => {
  it("gives a lite scan 40 minutes and a full scan 90", () => {
    expect([minutesOf(SCAN_WORKFLOW_MAX_POLLS), minutesOf(SCAN_WORKFLOW_FULL_MAX_POLLS)]).toEqual([40, 90]);
  });

  it("gives the phases slots that add up to the full total, so none can take the time of the ones after it", () => {
    const slots = Object.values(SCAN_WORKFLOW_FULL_PHASE_MINUTES);
    expect(slots.reduce((sum, minutes) => sum + minutes, 0)).toBe(minutesOf(SCAN_WORKFLOW_FULL_MAX_POLLS));
  });
});
