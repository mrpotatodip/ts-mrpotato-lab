import type { InviteEmail } from "#/modules/team/types";

// -----
// The dashboard's Default theme as hex, because mail
// clients do not read oklch(): page, card, header
// strip, border, text, muted text, and the primary
// button with the text on it.
// -----
const COLOR = {
  page: "#eff1f4",
  card: "#fbfcfd",
  strip: "#f3f4f6",
  inset: "#f5f6f8",
  border: "#e4e5e6",
  text: "#171b20",
  muted: "#393d44",
  primary: "#23272c",
  onPrimary: "#fbfcfd",
};

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

// -----
// The password reset email wears the same card.
// -----
export { COLOR as EMAIL_COLOR, SANS as EMAIL_SANS, MONO as EMAIL_MONO, escapeHtml as escapeEmailHtml };

const detailRow = (label: string, value: string) =>
  `<tr><td style="padding:10px 16px;font-size:13px;color:${COLOR.muted};width:110px;">${label}</td><td style="padding:10px 16px;font-size:15px;font-weight:600;color:${COLOR.text};">${value}</td></tr>`;

// -----
// The subject, HTML and plain text of an invite.
// Names come from people, so the HTML escapes them.
// The HTML follows the dashboard card: a header strip
// with the brand, an inset panel of facts, and one
// dark button.
// -----
export const renderInviteEmail = (mail: InviteEmail) => {
  const expires = new Date(mail.expiresAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
  const subject = `${mail.inviterName} invited you to ${mail.accountName} on EliseLAB`;
  const inviter = escapeHtml(mail.inviterName);
  const account = escapeHtml(mail.accountName);
  const link = escapeHtml(mail.link);

  const text = [
    `${mail.inviterName} invited you to join ${mail.accountName} on EliseLAB as ${mail.roleLabel}.`,
    "",
    `Accept the invite: ${mail.link}`,
    "",
    `The link works once and expires on ${expires} (UTC). If you were not expecting this, ignore this email: nothing happens until someone accepts.`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${inviter} invited you to join ${account} on EliseLAB.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:12px;font-family:${SANS};color:${COLOR.text};">
<tr><td style="padding:16px 24px;background:${COLOR.strip};border-bottom:1px solid ${COLOR.border};border-radius:12px 12px 0 0;">
<span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:${COLOR.text};">EliseLAB</span>
<span style="font-size:12px;color:${COLOR.muted};">&nbsp;&nbsp;Security audits</span>
</td></tr>
<tr><td style="padding:28px 24px 8px 24px;">
<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:${COLOR.text};">Join ${account} on EliseLAB</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.muted};"><strong style="color:${COLOR.text};">${inviter}</strong> invited you to join ${account}. Accept the invite to see its repositories and audit results.</p>
</td></tr>
<tr><td style="padding:20px 24px 4px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.inset};border:1px solid ${COLOR.border};border-radius:12px;">
${detailRow("Account", account)}
<tr><td colspan="2" style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;">&nbsp;</td></tr>
${detailRow("Your role", escapeHtml(mail.roleLabel))}
<tr><td colspan="2" style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;">&nbsp;</td></tr>
${detailRow("Link expires", `${expires} (UTC)`)}
</table>
</td></tr>
<tr><td style="padding:24px 24px 8px 24px;">
<a href="${link}" style="display:inline-block;background:${COLOR.primary};color:${COLOR.onPrimary};font-size:15px;font-weight:600;text-decoration:none;line-height:20px;padding:10px 20px;border-radius:8px;">Accept invite</a>
</td></tr>
<tr><td style="padding:16px 24px 28px 24px;">
<p style="margin:0 0 6px 0;font-size:13px;line-height:1.5;color:${COLOR.muted};">Or paste this link into your browser:</p>
<p style="margin:0;font-family:${MONO};font-size:12px;line-height:1.5;color:${COLOR.text};word-break:break-all;">${link}</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${COLOR.border};">
<p style="margin:0;font-size:13px;line-height:1.5;color:${COLOR.muted};">The link works once. If you were not expecting this invite, ignore this email: nothing happens until someone accepts.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
};
