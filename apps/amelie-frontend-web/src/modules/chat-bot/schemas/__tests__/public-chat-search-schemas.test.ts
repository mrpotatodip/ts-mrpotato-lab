import { describe, expect, it } from "vitest";
import { PublicChatSearchSchema } from "../public-chat-search-schemas";

describe("PublicChatSearchSchema", () => {
  it("reads the location", () => {
    expect(PublicChatSearchSchema.parse({ location: "airport" })).toEqual({ location: "airport" });
  });

  it("trims the location", () => {
    expect(PublicChatSearchSchema.parse({ location: "  airport " }).location).toBe("airport");
  });

  it("reads a location the router turned into a number", () => {
    expect(PublicChatSearchSchema.parse({ location: 5 }).location).toBe("5");
  });

  it("leaves the location empty when it is missing or blank", () => {
    expect(PublicChatSearchSchema.parse({}).location).toBeUndefined();
    expect(PublicChatSearchSchema.parse({ location: "   " }).location).toBeUndefined();
  });

  it("drops a location the engine would refuse for length", () => {
    expect(PublicChatSearchSchema.parse({ location: "x".repeat(65) }).location).toBeUndefined();
    expect(PublicChatSearchSchema.parse({ location: "x".repeat(64) }).location).toBe("x".repeat(64));
  });

  it("reads the country the way it reads the location", () => {
    expect(PublicChatSearchSchema.parse({ country: "CA" })).toEqual({ country: "CA" });
    expect(PublicChatSearchSchema.parse({ country: "  Canada " }).country).toBe("Canada");
    expect(PublicChatSearchSchema.parse({ country: 12 }).country).toBe("12");
  });

  it("reads a country and a location together", () => {
    expect(PublicChatSearchSchema.parse({ country: "CA", location: "toronto" })).toEqual({
      country: "CA",
      location: "toronto",
    });
  });

  it("leaves the country empty when it is missing, blank or too long", () => {
    expect(PublicChatSearchSchema.parse({}).country).toBeUndefined();
    expect(PublicChatSearchSchema.parse({ country: "   " }).country).toBeUndefined();
    expect(PublicChatSearchSchema.parse({ country: "x".repeat(65) }).country).toBeUndefined();
    expect(PublicChatSearchSchema.parse({ country: "x".repeat(64) }).country).toBe("x".repeat(64));
  });
});
