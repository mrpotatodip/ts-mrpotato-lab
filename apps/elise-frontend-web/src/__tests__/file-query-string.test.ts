import { describe, expect, it } from "vitest";
import { FilesSearchSchema, fileQueryString } from "#/modules/file";

describe("fileQueryString", () => {
  it("sends nothing for no filters", () => {
    expect(fileQueryString({ filters: {} })).toBe("");
  });

  it("turns a day into the whole day in UTC", () => {
    const text = fileQueryString({ filters: { from: "2026-11-02", to: "2026-11-03" } });

    expect(new URLSearchParams(text).get("from")).toBe("2026-11-02T00:00:00.000Z");
    expect(new URLSearchParams(text).get("to")).toBe("2026-11-03T23:59:59.999Z");
  });

  it("encodes the other filters and the cursor", () => {
    const params = new URLSearchParams(fileQueryString({ filters: { branch: "feat/a b", name: "REPORT.md", q: "100%" }, cursor: "50" }));

    expect(Object.fromEntries(params)).toEqual({ branch: "feat/a b", name: "REPORT.md", q: "100%", cursor: "50" });
  });
});

describe("FilesSearchSchema", () => {
  it("drops a bad link instead of failing", () => {
    expect(FilesSearchSchema.parse({ name: "secret.txt", from: "yesterday" })).toEqual({});
  });

  it("keeps good filters", () => {
    expect(FilesSearchSchema.parse({ name: "REPORT.md", from: "2026-11-02" })).toEqual({ name: "REPORT.md", from: "2026-11-02" });
  });
});
