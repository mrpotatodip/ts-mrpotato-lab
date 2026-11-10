import { describe, expect, it } from "vitest";
import { scanFailure } from "#/modules/scan/utils/scan-format";

// -----
// The error text is what `scan-sandbox` throws: "command exited N: " and the
// last of git's output. The git lines are copied from a real run with no terminal.
// -----
const NOT_FOUND = "command exited 128: Cloning into '/workspace/repo'...\nremote: Repository not found.\nfatal: repository 'https://github.com/o/n/' not found";
const NO_USERNAME = "command exited 128: fatal: could not read Username for 'https://github.com': No such device or address";
const NO_REF = "command exited 128: fatal: couldn't find remote ref nope-branch";
const TIMEOUT = "command exited 124: Cloning into '/workspace/repo'...";

describe("scanFailure", () => {
  it.each([
    ["a repository that is missing or private", NOT_FOUND, "Elise could not read this repository."],
    ["a clone git would prompt for a login on", NO_USERNAME, "Elise could not read this repository."],
    ["a branch, tag or commit that does not exist", NO_REF, "That branch, tag or commit was not found in the repository."],
    ["a clone the timeout killed", TIMEOUT, "Cloning the repository took too long and was stopped."],
    ["an agent that ran out of memory", "claude exited 1: RangeError: Out of memory", "The agent ran out of memory while it read the repository."],
  ])("names the cause of %s", (_name, error, title) => {
    expect(scanFailure(error).title).toBe(title);
  });

  it("points a missing repository at the Connections page, since a private one looks the same", () => {
    expect(scanFailure(NOT_FOUND).advice).toContain("Connections");
  });

  it("keeps git's own text as the detail", () => {
    expect(scanFailure(NOT_FOUND).detail).toContain("fatal: repository");
  });

  it("falls back to the first line when it knows no cause", () => {
    expect(scanFailure("the agent stopped\nmore").title).toBe("the agent stopped");
  });
});
