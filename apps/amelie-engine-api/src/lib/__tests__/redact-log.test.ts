import { describe, expect, it } from "vitest";
import { errorChainForLog, redactForLog } from "#/lib/redact-log";

const ANONYMOUS_ID = "3f2b8c1e-5d4a-4e6b-9a7c-1b2d3e4f5a6b";

describe("redactForLog", () => {
  it("drops a query's params and any id", () => {
    const text = `Failed query: select 1 where anonymous_id = $1\nparams: ${ANONYMOUS_ID}`;

    expect(redactForLog(text)).not.toContain(ANONYMOUS_ID);
  });

  it("walks the cause chain without leaking an id from a pg detail", () => {
    const cause = new Error(`Key (anonymous_id)=(${ANONYMOUS_ID}) is bad`);
    const error = new Error("Failed query", { cause });

    const logged = errorChainForLog(error);

    expect(logged).toContain("Failed query");
    expect(logged).not.toContain(ANONYMOUS_ID);
  });
});
