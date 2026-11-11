import type { GithubRepo } from "#/modules/github";
import { CreateScanInputSchema } from "../schemas";
import type { KnownRepo } from "./scan-known-repos";

// -----
// What the new-scan search lists: every repository the account can scan, with
// where its branches come from. A repository the account scanned before reads
// its branches from the engine; one a GitHub connection can read reads them
// from GitHub; a pasted link has no list, so the branch is typed.
// -----
export type ScanRepoPick = {
  url: string;
  label: string;
  note: string;
  isPrivate: boolean;
  running: boolean;
  repoId: string | null;
  connection: GithubRepo | null;
  fromLink: boolean;
};

const LAST_SCAN_NOTE = {
  none: "Not scanned yet",
  queued: "A scan is waiting to start",
  running: "A scan is running now",
  succeeded: "Last scan succeeded",
  failed: "Last scan failed",
} as const;

const LINK = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;

const bare = (url: string) => url.toLowerCase().replace(/(\.git)?\/?$/, "");

export const scanRepoPickSame = (a: string, b: string) => bare(a) === bare(b);
const sameRepo = scanRepoPickSame;

const RepoLinkSchema = CreateScanInputSchema.pick({ repo: true });

export function scanRepoLinkPick(text: string): ScanRepoPick | null {
  const match = LINK.exec(text.trim());
  if (!match) return null;
  const url = `https://github.com/${match[1]}/${match[2]}`;
  if (!RepoLinkSchema.safeParse({ repo: url }).success) return null;
  return { url, label: `${match[1]}/${match[2]}`, note: "Public repository, from the link", isPrivate: false, running: false, repoId: null, connection: null, fromLink: true };
}

export function scanRepoPicks(known: readonly KnownRepo[], connected: readonly GithubRepo[]): ScanRepoPick[] {
  const connectionOf = (url: string) => connected.find((item) => sameRepo(item.url, url)) ?? null;
  const scanned = known.flatMap((item): ScanRepoPick[] => {
    const connection = connectionOf(item.url);
    if (item.isPrivate && connection === null) return [];
    const note = LAST_SCAN_NOTE[item.running ? "running" : (item.last ?? "none")];
    return [{ url: item.url, label: item.label, note, isPrivate: item.isPrivate || connection?.private === true, running: item.running, repoId: item.repoId, connection, fromLink: false }];
  });
  const connectedOnly = connected
    .filter((item) => !known.some((seen) => sameRepo(seen.url, item.url)))
    .map((item): ScanRepoPick => ({ url: item.url, label: item.fullName, note: item.private ? "Private, connected on GitHub" : "Connected on GitHub", isPrivate: item.private, running: false, repoId: null, connection: item, fromLink: false }));
  return [...scanned, ...connectedOnly];
}

export function scanRepoPickMatches(picks: readonly ScanRepoPick[], query: string): ScanRepoPick[] {
  const needle = query.trim().toLowerCase();
  const found = needle === "" ? [...picks] : picks.filter((item) => item.label.toLowerCase().includes(needle));
  const link = scanRepoLinkPick(query);
  if (link === null) return found;
  const same = picks.find((item) => sameRepo(item.url, link.url));
  return same === undefined ? [link, ...found] : [same, ...found.filter((item) => item !== same)];
}
