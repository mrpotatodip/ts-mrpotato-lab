import { describe, expect, it } from "vitest";
import { importListStatus } from "../menu-import-status";

describe("importListStatus", () => {
  it("is blue while Amelie is reading the files", () => {
    expect(importListStatus({ status: "running", publishedAt: null, pendingCount: 0 })).toEqual({
      tone: "info",
      label: "Reading...",
    });
  });

  it("is red when the read failed", () => {
    expect(importListStatus({ status: "failed", publishedAt: null, pendingCount: 0 })).toEqual({
      tone: "danger",
      label: "Failed",
    });
  });

  it("is amber while drafts still need a look", () => {
    expect(importListStatus({ status: "ready", publishedAt: null, pendingCount: 4 })).toEqual({
      tone: "warning",
      label: "Ready to review",
    });
  });

  it("is green after publish", () => {
    expect(importListStatus({ status: "ready", publishedAt: "2026-10-15T00:00:00.000Z", pendingCount: 0 })).toEqual({
      tone: "success",
      label: "Published",
    });
  });

  it("is neutral once every draft has been reviewed but not published", () => {
    expect(importListStatus({ status: "ready", publishedAt: null, pendingCount: 0 })).toEqual({
      tone: "neutral",
      label: "Reviewed",
    });
  });
});
