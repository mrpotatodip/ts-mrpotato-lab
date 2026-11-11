import { describe, expect, it } from "vitest";
import { GithubCallbackSearchSchema } from "#/modules/github";

describe("GithubCallbackSearchSchema", () => {
  it("reads what GitHub puts in the address, and turns the install number into a number", () => {
    const search = GithubCallbackSearchSchema.parse({ code: "a1b2", installation_id: "180358836", state: "signed.state", setup_action: "install" });

    expect(search).toEqual({ code: "a1b2", installation_id: 180358836, state: "signed.state" });
  });

  it("leaves out what is missing, so the page can say so", () => {
    expect(GithubCallbackSearchSchema.parse({})).toEqual({});
    expect(GithubCallbackSearchSchema.parse({ code: "a1b2" })).toEqual({ code: "a1b2" });
  });

  it.each([["abc"], ["0"], ["-3"], ["1.5"]])("drops an install number that is not a positive whole number: %j", (value) => {
    expect(GithubCallbackSearchSchema.parse({ code: "c", installation_id: value, state: "s" })).toEqual({ code: "c", state: "s" });
  });

  it("drops an empty code or state", () => {
    expect(GithubCallbackSearchSchema.parse({ code: "", installation_id: "7", state: "" })).toEqual({ installation_id: 7 });
  });
});
