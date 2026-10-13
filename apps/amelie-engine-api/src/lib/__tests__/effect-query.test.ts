import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import {
  Conflict,
  DbError,
  ExternalError,
  Forbidden,
  Invalid,
  NotFound,
  ParseError,
  runEffect,
  runQuery,
} from "#/lib/effect-query";
import {
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  InternalServiceError,
  NotFoundError,
  ValidationError,
} from "#/lib/errors";

const onError = (cause: Error) => new InternalServiceError("query:test", { cause });

describe("runQuery", () => {
  it("returns the value on success", async () => {
    await expect(runQuery(Effect.succeed(1), onError)).resolves.toBe(1);
  });

  it.each([
    [new NotFound({ message: "gone" }), new NotFoundError("gone")],
    [new Conflict({ message: "taken" }), new ConflictError("taken")],
    [new Invalid({ message: "bad" }), new ValidationError("bad")],
  ])("maps the %s tag to its AppError", async (failure, expected) => {
    await expect(runQuery(Effect.fail(failure), onError)).rejects.toEqual(expected);
  });

  it("passes an infrastructure failure to onError with its cause", async () => {
    const dbError = new DbError({ cause: new Error("connection reset") });

    const result = runQuery(Effect.fail(dbError), onError);

    await expect(result).rejects.toBeInstanceOf(InternalServiceError);
    await expect(result).rejects.toMatchObject({ cause: dbError });
  });

  it("logs a defect's whole cause before passing it to onError", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runQuery(Effect.die(new Error("boom")), onError)).rejects.toBeInstanceOf(
      InternalServiceError,
    );

    expect(logged).toHaveBeenCalledWith(expect.stringContaining("boom"));
    logged.mockRestore();
  });
});

describe("runEffect", () => {
  it("returns the value on success", async () => {
    await expect(runEffect(Effect.succeed(1))).resolves.toBe(1);
  });

  it.each([
    [new NotFound({ message: "gone" }), new NotFoundError("gone")],
    [new Conflict({ message: "taken" }), new ConflictError("taken")],
    [new Forbidden({ message: "not yours" }), new ForbiddenError("not yours")],
    [new Invalid({ message: "bad" }), new ValidationError("bad")],
  ])("maps the %s tag to its AppError", async (failure, expected) => {
    await expect(runEffect(Effect.fail(failure))).rejects.toEqual(expected);
  });

  it("maps a DbError to a 500 that keeps the tag as its cause", async () => {
    const dbError = new DbError({ cause: new Error("connection reset") });

    const result = runEffect(Effect.fail(dbError));

    await expect(result).rejects.toBeInstanceOf(InternalServiceError);
    await expect(result).rejects.toMatchObject({ cause: dbError });
  });

  it("maps an ExternalError to a 502 that keeps the tag as its cause", async () => {
    const external = new ExternalError({ cause: new Error("upstream 503") });

    const result = runEffect(Effect.fail(external));

    await expect(result).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(result).rejects.toMatchObject({ cause: external });
  });

  it("maps a ParseError to a 502", async () => {
    const result = runEffect(Effect.fail(new ParseError({ cause: new Error("bad json") })));

    await expect(result).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(result).rejects.toMatchObject({ statusCode: 502 });
  });

  it("logs a defect with Cause.pretty and throws an internal error", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = runEffect(Effect.die(new Error("boom")));

    await expect(result).rejects.toBeInstanceOf(InternalServiceError);
    await expect(result).rejects.toMatchObject({ cause: new Error("boom") });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("boom"));
    logged.mockRestore();
  });
});
