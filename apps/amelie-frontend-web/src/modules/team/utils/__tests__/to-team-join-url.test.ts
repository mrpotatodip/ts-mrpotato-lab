import { describe, expect, it } from "vitest";

import { toTeamJoinPath, toTeamJoinUrl } from "../to-team-join-url";

describe("toTeamJoinUrl", () => {
  it("builds the join path from the token", () => {
    expect(toTeamJoinPath("abc")).toBe("/join/abc");
    expect(toTeamJoinUrl("http://localhost:3000", "abc")).toBe("http://localhost:3000/join/abc");
  });
});
