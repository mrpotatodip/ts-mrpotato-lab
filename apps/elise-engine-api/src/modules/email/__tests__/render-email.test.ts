import { describe, expect, it } from "vitest";
import { renderEmail } from "#/modules/email/utils";

const invite = {
  kind: "team-invite" as const,
  to: "bo@example.com",
  accountName: "Acme <script>",
  inviterName: 'Ada "the admin" & co',
  roleLabel: "Workspace member",
  link: "https://eliselab.com/invite/abc_123?x=1&y=2",
  expiresAt: "2026-11-15T09:00:00.000Z",
};

const reset = {
  kind: "password-reset" as const,
  to: "bo@example.com",
  link: "https://app.eliselab.com/reset-password?token=abc_123&x=<1>",
  expiresAt: "2026-11-15T09:30:00.000Z",
};

describe("renderEmail", () => {
  it("escapes names and the link in the HTML, and leaves the plain text as written", () => {
    const { html, text } = renderEmail(invite);

    expect(html).toContain("Acme &lt;script&gt;");
    expect(html).toContain("Ada &quot;the admin&quot; &amp; co");
    expect(html).toContain('href="https://eliselab.com/invite/abc_123?x=1&amp;y=2"');
    expect(html).not.toContain("<script>");
    expect(text).toContain("Ada \"the admin\" & co invited you to join Acme <script>");
    expect(text).toContain(invite.link);
  });

  it("names the inviter and account in the subject and gives the expiry in UTC", () => {
    const { subject, text } = renderEmail(invite);

    expect(subject).toBe('Ada "the admin" & co invited you to Acme <script> on EliseLAB');
    expect(text).toContain("expires on November 15, 2026 (UTC)");
  });

  it("escapes the reset link in the HTML, and leaves the plain text as written", () => {
    const { html, text } = renderEmail(reset);

    expect(html).toContain('href="https://app.eliselab.com/reset-password?token=abc_123&amp;x=&lt;1&gt;"');
    expect(html).not.toContain("<1>");
    expect(text).toContain(reset.link);
  });

  it("gives the reset expiry in UTC and does not name the account holder", () => {
    const { subject, text } = renderEmail(reset);

    expect(subject).toBe("Reset your EliseLAB password");
    expect(text).toContain("expires at 9:30 AM UTC");
    expect(text).not.toContain("bo@example.com");
  });
});
