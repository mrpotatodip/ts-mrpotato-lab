import type { RunnerNames, RunnerNoticeEmail } from "#/modules/email/types";
import { renderEmailLayout } from "./layout";

const utcOf = (at: string) => `${new Date(at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC`;

const runnerNotice = (mail: RunnerNoticeEmail, names: RunnerNames, wording: { verb: string; heading: string; consequence: string; actorLabel: string }) =>
  renderEmailLayout({
    subject: `${wording.heading}: ${names.runnerName}`,
    preheader: `${names.actorName} ${wording.verb} the Runner ${names.runnerName} in ${names.accountName}.`,
    heading: wording.heading,
    intro: [
      { text: names.actorName, strong: true },
      { text: ` ${wording.verb} the Runner ` },
      { text: names.runnerName, strong: true },
      { text: ` in ${names.accountName}. ${wording.consequence}` },
    ],
    facts: [
      { label: "Account", value: names.accountName },
      { label: "Runner", value: names.runnerName },
      { label: wording.actorLabel, value: names.actorName },
      { label: "When", value: utcOf(mail.at) },
    ],
    button: { label: "Open Runners", url: mail.link },
    footer: "If this was not you or someone you expect, open Runners and check the list, then change your password. This is a security notice: you get it whatever your email settings.",
  });

export const renderRunnerAdded = (mail: RunnerNoticeEmail, names: RunnerNames) =>
  runnerNotice(mail, names, {
    verb: "added",
    heading: "A Runner was added",
    consequence: "That computer can now run Scans on your code.",
    actorLabel: "Added by",
  });

export const renderRunnerRemoved = (mail: RunnerNoticeEmail, names: RunnerNames) =>
  runnerNotice(mail, names, {
    verb: "removed",
    heading: "A Runner was removed",
    consequence: "That computer can no longer run Scans for the Account.",
    actorLabel: "Removed by",
  });
