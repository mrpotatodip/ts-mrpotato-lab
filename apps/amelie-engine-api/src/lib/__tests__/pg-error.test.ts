import { describe, it, expect } from "vitest";
import { PG_UNIQUE_VIOLATION, pgErrorCode, pgErrorConstraint } from "#/lib/pg-error";

describe("pgErrorConstraint", () => {
  it("finds the constraint a driver nested under cause", () => {
    const wrapped = new Error("insert failed", {
      cause: Object.assign(new Error("pg"), { code: PG_UNIQUE_VIOLATION, constraint: "uq_tenants_slug" }),
    });
    expect(pgErrorConstraint(wrapped)).toBe("uq_tenants_slug");
  });

  it("returns undefined when there is none", () => {
    expect(pgErrorConstraint(new Error("connection reset"))).toBeUndefined();
  });
});

function pgError(code: string): Error {
  return Object.assign(new Error("pg"), { code });
}

describe("pgErrorCode", () => {
  it("reads the code on the error itself", () => {
    expect(pgErrorCode(pgError(PG_UNIQUE_VIOLATION))).toBe(PG_UNIQUE_VIOLATION);
  });

  it("finds a code the driver nested under cause", () => {
    const wrapped = new Error("insert failed", {
      cause: new Error("query failed", { cause: pgError("23503") }),
    });
    expect(pgErrorCode(wrapped)).toBe("23503");
  });

  it("gives up after the depth limit", () => {
    let deep: Error = pgError(PG_UNIQUE_VIOLATION);
    for (let i = 0; i < 5; i++) deep = new Error("wrap", { cause: deep });
    expect(pgErrorCode(deep)).toBeUndefined();
  });

  it("returns undefined for anything without a code", () => {
    expect(pgErrorCode(new Error("connection reset"))).toBeUndefined();
    expect(pgErrorCode("boom")).toBeUndefined();
    expect(pgErrorCode(null)).toBeUndefined();
  });
});
