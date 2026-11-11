import { describe, expect, it } from "vitest";
import { SignInSchema, SignUpInputSchema } from "#/modules/auth/schemas/auth-schemas";

const messagesOf = (result: { success: boolean; error?: { issues: readonly { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));

describe("SignUpInputSchema", () => {
  it.each([
    ["inviteCode", "Enter your invite code."],
    ["firstName", "Enter your first name."],
    ["lastName", "Enter your last name."],
    ["accountName", "Enter a name for your account."],
    ["email", "Enter your email address."],
    ["password", "Use at least 8 characters."],
  ])("tells a person what to enter in %s, not which rule failed", (field, message) => {
    const result = SignUpInputSchema.safeParse({ inviteCode: "", firstName: "", lastName: "", accountName: "", email: "", password: "", timezone: "Europe/Rome" });

    expect(messagesOf(result)[field]).toBe(message);
  });

  it("counts a name of only spaces as empty", () => {
    const result = SignUpInputSchema.safeParse({ inviteCode: "code", firstName: "   ", lastName: "Doe", accountName: "Acme", email: "a@b.co", password: "long-enough", timezone: "Europe/Rome" });

    expect(messagesOf(result).firstName).toBe("Enter your first name.");
  });
});

describe("SignInSchema", () => {
  it("asks for an email and for a password", () => {
    expect(messagesOf(SignInSchema.safeParse({ email: "", password: "" }))).toEqual({ email: "Enter your email address.", password: "Enter your password." });
  });

  it("says what is wrong with an email that was typed", () => {
    expect(messagesOf(SignInSchema.safeParse({ email: "nope", password: "x" }))).toEqual({ email: "Enter a valid email address, like name@company.com." });
  });
});
