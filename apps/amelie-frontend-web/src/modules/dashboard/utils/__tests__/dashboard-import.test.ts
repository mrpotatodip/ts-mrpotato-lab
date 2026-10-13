import { describe, expect, it } from "vitest";

import { describeImport } from "../dashboard-import";

describe("describeImport", () => {
  it("says nothing without an import", () => {
    expect(describeImport(undefined)).toBeUndefined();
  });

  it("shows a running import as info", () => {
    expect(describeImport({ status: "running", pendingCount: 0 })).toEqual({
      tone: "info",
      badge: "Running",
      detail: "Reading your files…",
    });
  });

  it("shows the failure message, or a default one", () => {
    expect(describeImport({ status: "failed", pendingCount: 0, error: "Bad file" })?.detail).toBe("Bad file");
    expect(describeImport({ status: "failed", pendingCount: 0, error: null })?.detail).toBe("The import failed.");
  });

  it("asks for review only while drafts are left", () => {
    expect(describeImport({ status: "ready", pendingCount: 3 })).toEqual({
      tone: "warning",
      badge: "Review",
      detail: "3 to review",
    });
    expect(describeImport({ status: "ready", pendingCount: 0 })).toBeUndefined();
  });
});
