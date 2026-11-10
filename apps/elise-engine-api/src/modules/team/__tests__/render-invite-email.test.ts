import { describe, expect, it } from "vitest";
import { renderInviteEmail } from "#/modules/team/utils";

const mail = {
  to: "bo@example.com",
  accountName: "Acme <script>",
  inviterName: 'Ada "the admin" & co',
  roleLabel: "Workspace member",
  link: "https://eliselab.com/invite/abc_123?x=1&y=2",
  expiresAt: "2026-11-15T09:00:00.000Z",
};

describe("renderInviteEmail", () => {
  it("escapes names and the link in the HTML, and leaves the plain text as written", () => {
    const { html, text } = renderInviteEmail(mail);

    expect(html).toContain("Acme &lt;script&gt;");
    expect(html).toContain("Ada &quot;the admin&quot; &amp; co");
    expect(html).toContain('href="https://eliselab.com/invite/abc_123?x=1&amp;y=2"');
    expect(html).not.toContain("<script>");
    expect(text).toContain("Ada \"the admin\" & co invited you to join Acme <script>");
    expect(text).toContain(mail.link);
  });

  it("names the inviter and account in the subject and gives the expiry in UTC", () => {
    const { subject, text } = renderInviteEmail(mail);

    expect(subject).toBe('Ada "the admin" & co invited you to Acme <script> on Elise');
    expect(text).toContain("expires on November 15, 2026 (UTC)");
  });
});
