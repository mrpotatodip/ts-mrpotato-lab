import { describe, expect, it } from "vitest";
import { renderPasswordResetEmail } from "#/modules/auth/utils";

const mail = {
  kind: "password-reset" as const,
  to: "bo@example.com",
  link: "https://app.eliselab.com/reset-password?token=abc_123&x=<1>",
  expiresAt: "2026-11-15T09:30:00.000Z",
};

describe("renderPasswordResetEmail", () => {
  it("escapes the link in the HTML, and leaves the plain text as written", () => {
    const { html, text } = renderPasswordResetEmail(mail);

    expect(html).toContain('href="https://app.eliselab.com/reset-password?token=abc_123&amp;x=&lt;1&gt;"');
    expect(html).not.toContain("<1>");
    expect(text).toContain(mail.link);
  });

  it("gives the expiry time in UTC and does not name the account holder", () => {
    const { subject, text } = renderPasswordResetEmail(mail);

    expect(subject).toBe("Reset your EliseLAB password");
    expect(text).toContain("expires at 9:30 AM UTC");
    expect(text).not.toContain("bo@example.com");
  });
});
