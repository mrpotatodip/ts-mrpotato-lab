import type { Runner } from "../schemas";

const WHEN = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

export const runnerWhen = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : `${WHEN.format(date)} UTC`;
};

// -----
// The muted line under a Runner's name: what to do next, or
// when it was last seen. Only facts the engine sent.
// -----
export const runnerDetail = (runner: Runner): string => {
  if (runner.state === "waiting" && runner.expiresAt !== null) return `Enter the code in the Runner app before ${runnerWhen(runner.expiresAt)}.`;
  if (runner.state === "expired") return "The code ran out before the app used it. Remove this and add the computer again.";
  return runner.lastSeenAt === null ? "Not seen yet." : `Last seen ${runnerWhen(runner.lastSeenAt)}.`;
};
