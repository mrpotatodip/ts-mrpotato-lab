import type { AnthropicKeyChangedEmail, BudgetChangedEmail, PasswordResetDoneEmail, PasswordResetEmail, TeamInviteEmail } from "#/modules/email/types";
import { renderEmailLayout } from "./layout";

export const renderTeamInvite = (mail: TeamInviteEmail) => {
  const expires = new Date(mail.expiresAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
  return renderEmailLayout({
    subject: `${mail.inviterName} invited you to ${mail.accountName} on EliseLAB`,
    preheader: `${mail.inviterName} invited you to join ${mail.accountName} on EliseLAB.`,
    heading: `Join ${mail.accountName} on EliseLAB`,
    intro: [
      { text: mail.inviterName, strong: true },
      { text: ` invited you to join ${mail.accountName}. Accept the invite to see its repositories and audit results.` },
    ],
    facts: [
      { label: "Account", value: mail.accountName },
      { label: "Your role", value: mail.roleLabel },
      { label: "Link expires", value: `${expires} (UTC)` },
    ],
    button: { label: "Accept invite", url: mail.link },
    footer: `The link works once and expires on ${expires} (UTC). If you were not expecting this invite, ignore this email: nothing happens until someone accepts.`,
  });
};

export const renderPasswordResetDone = (mail: PasswordResetDoneEmail) => {
  const when = new Date(mail.changedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });
  return renderEmailLayout({
    subject: "Your EliseLAB password was changed",
    preheader: "The password for your EliseLAB account was just changed.",
    heading: "Your password was changed",
    intro: [{ text: "The password for your EliseLAB account was changed with a password reset, and you were signed out everywhere." }],
    facts: [{ label: "Changed", value: `${when} (UTC)` }],
    button: { label: "Reset your password again", url: mail.link },
    footer: "If this was not you, reset your password again now with the button above, then check your Account's Runners and Anthropic key.",
  });
};

export const renderPasswordReset = (mail: PasswordResetEmail) => {
  const expires = new Date(mail.expiresAt).toLocaleTimeString("en-US", { timeStyle: "short", timeZone: "UTC" });
  return renderEmailLayout({
    subject: "Reset your EliseLAB password",
    preheader: "Choose a new password for your EliseLAB account.",
    heading: "Reset your password",
    intro: [{ text: "Someone asked to reset the password for your EliseLAB account. Choose a new one to get back in." }],
    facts: [],
    button: { label: "Choose a new password", url: mail.link },
    footer: `The link works once and expires at ${expires} UTC. If you did not ask for this, ignore this email: your password stays the same.`,
  });
};

const noticeTime = (iso: string) => `${new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} (UTC)`;

const usd = (value: number) => `$${value.toFixed(2)}`;

export const renderAnthropicKeyChanged = (mail: AnthropicKeyChangedEmail) => {
  const verb = mail.change === "set" ? "set" : "removed";
  return renderEmailLayout({
    subject: `The Anthropic key for ${mail.accountName} was ${verb}`,
    preheader: `${mail.actorName} ${verb === "set" ? "set" : "removed"} the Anthropic key for ${mail.accountName}.`,
    heading: `Anthropic key ${verb}`,
    intro: [
      { text: mail.actorName, strong: true },
      {
        text:
          mail.change === "set"
            ? ` set an Anthropic key for ${mail.accountName}. Scans now use that key.`
            : ` removed the Anthropic key for ${mail.accountName}. Scans now use the platform key.`,
      },
    ],
    facts: [
      { label: "Account", value: mail.accountName },
      { label: "Changed by", value: mail.actorName },
      { label: "When", value: noticeTime(mail.changedAt) },
    ],
    button: { label: "Open usage settings", url: mail.link },
    footer: "If this was not you, open usage settings and replace the key, then change your password.",
  });
};

export const renderBudgetChanged = (mail: BudgetChangedEmail) =>
  renderEmailLayout({
    subject: `The Monthly budget for ${mail.accountName} changed`,
    preheader: `${mail.actorName} changed the Monthly budget from ${usd(mail.previousBudgetUsd)} to ${usd(mail.budgetUsd)}.`,
    heading: "Monthly budget changed",
    intro: [
      { text: mail.actorName, strong: true },
      { text: ` changed the Monthly budget for ${mail.accountName} from ${usd(mail.previousBudgetUsd)} to ${usd(mail.budgetUsd)}.` },
    ],
    facts: [
      { label: "Account", value: mail.accountName },
      { label: "Changed by", value: mail.actorName },
      { label: "Old budget", value: usd(mail.previousBudgetUsd) },
      { label: "New budget", value: usd(mail.budgetUsd) },
      { label: "When", value: noticeTime(mail.changedAt) },
    ],
    button: { label: "Open usage settings", url: mail.link },
    footer: "If this was not you, open usage settings and set the budget back, then change your password.",
  });
