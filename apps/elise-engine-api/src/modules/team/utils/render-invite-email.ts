import type { InviteEmail } from "#/modules/team/types";

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

// -----
// The subject, HTML and plain text of an invite.
// Names come from people, so the HTML escapes them.
// -----
export const renderInviteEmail = (mail: InviteEmail) => {
  const expires = new Date(mail.expiresAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
  const subject = `${mail.inviterName} invited you to ${mail.accountName} on Elise`;
  const text = [
    `${mail.inviterName} invited you to join ${mail.accountName} on Elise as ${mail.roleLabel}.`,
    "",
    `Accept the invite: ${mail.link}`,
    "",
    `The link works once and expires on ${expires} (UTC). If you were not expecting this, ignore this email.`,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(mail.inviterName)} invited you to join <strong>${escapeHtml(mail.accountName)}</strong> on Elise as ${escapeHtml(mail.roleLabel)}.</p>`,
    `<p><a href="${escapeHtml(mail.link)}">Accept the invite</a></p>`,
    `<p>The link works once and expires on ${expires} (UTC). If you were not expecting this, ignore this email.</p>`,
  ].join("\n");
  return { subject, html, text };
};
