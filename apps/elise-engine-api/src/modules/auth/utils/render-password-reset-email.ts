import { EMAIL_COLOR as COLOR, EMAIL_MONO as MONO, EMAIL_SANS as SANS, escapeEmailHtml as escapeHtml } from "#/modules/team/utils";
import type { PasswordResetEmail } from "#/modules/auth/types";

// -----
// The subject, HTML and plain text of a reset email,
// in the same card as an invite. The email carries
// no name: it is sent to an address someone typed,
// so it says nothing about who owns it.
// -----
export const renderPasswordResetEmail = (mail: PasswordResetEmail) => {
  const expires = new Date(mail.expiresAt).toLocaleTimeString("en-US", { timeStyle: "short", timeZone: "UTC" });
  const subject = "Reset your EliseLAB password";
  const link = escapeHtml(mail.link);

  const text = [
    "Someone asked to reset the password for your EliseLAB account.",
    "",
    `Choose a new password: ${mail.link}`,
    "",
    `The link works once and expires at ${expires} UTC. If you did not ask for this, ignore this email: your password stays the same.`,
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Choose a new password for your EliseLAB account.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:12px;font-family:${SANS};color:${COLOR.text};">
<tr><td style="padding:16px 24px;background:${COLOR.strip};border-bottom:1px solid ${COLOR.border};border-radius:12px 12px 0 0;">
<span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:${COLOR.text};">EliseLAB</span>
<span style="font-size:12px;color:${COLOR.muted};">&nbsp;&nbsp;Security audits</span>
</td></tr>
<tr><td style="padding:28px 24px 8px 24px;">
<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:${COLOR.text};">Reset your password</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.muted};">Someone asked to reset the password for your EliseLAB account. Choose a new one to get back in.</p>
</td></tr>
<tr><td style="padding:24px 24px 8px 24px;">
<a href="${link}" style="display:inline-block;background:${COLOR.primary};color:${COLOR.onPrimary};font-size:15px;font-weight:600;text-decoration:none;line-height:20px;padding:10px 20px;border-radius:8px;">Choose a new password</a>
</td></tr>
<tr><td style="padding:16px 24px 28px 24px;">
<p style="margin:0 0 6px 0;font-size:13px;line-height:1.5;color:${COLOR.muted};">Or paste this link into your browser:</p>
<p style="margin:0;font-family:${MONO};font-size:12px;line-height:1.5;color:${COLOR.text};word-break:break-all;">${link}</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${COLOR.border};">
<p style="margin:0;font-size:13px;line-height:1.5;color:${COLOR.muted};">The link works once and expires at ${expires} UTC. If you did not ask for this, ignore this email: your password stays the same.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
};
