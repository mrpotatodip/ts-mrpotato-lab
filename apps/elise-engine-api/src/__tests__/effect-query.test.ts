import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { AppError } from "#/lib/errors";
import {
  Conflict,
  ExternalError,
  Forbidden,
  Invalid,
  NotFound,
  ParseError,
  RateLimited,
  runEffect,
  toAppError,
} from "#/lib/effect-query";

describe("toAppError", () => {
  it.each([
    [new NotFound({ message: "gone" }), 404, "NOT_FOUND"],
    [new Conflict({ message: "twice" }), 409, "CONFLICT"],
    [new Forbidden({ message: "no" }), 403, "FORBIDDEN"],
    [new Invalid({ message: "bad" }), 400, "VALIDATION_ERROR"],
    [new RateLimited({ code: "TOO_MANY_ACTIVE_SCANS", message: "slow down" }), 429, "TOO_MANY_ACTIVE_SCANS"],
    [new ExternalError({ cause: new Error("r2 down") }), 502, "EXTERNAL_SERVICE_ERROR"],
    [new ParseError({ cause: new Error("bad json") }), 502, "EXTERNAL_SERVICE_ERROR"],
  ])("maps %o to status %i and code %s", (failure, status, code) => {
    const error = toAppError(failure);

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
  });

  it("keeps the user message of a domain tag", () => {
    expect(toAppError(new NotFound({ message: "Scan not found" })).message).toBe("Scan not found");
  });

  it("keeps the cause of an infrastructure tag and hides it from the message", () => {
    const error = toAppError(new ExternalError({ cause: new Error("secret detail") }));

    expect(error.message).toBe("External service failed");
    expect(error.cause).toBeDefined();
  });
});

describe("runEffect", () => {
  it("returns the value of a success", async () => {
    expect(await runEffect(Effect.succeed(7))).toBe(7);
  });

  it("throws the AppError of a typed failure", async () => {
    const error = await runEffect(Effect.fail(new NotFound({ message: "Scan not found" }))).catch((cause) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
  });

  it("turns a defect into an internal error with a fixed message", async () => {
    const error = await runEffect(Effect.die(new Error("bug with details"))).catch((cause) => cause);

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe("Unexpected failure");
  });
});
