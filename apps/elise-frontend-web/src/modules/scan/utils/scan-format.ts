const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function scanBytes(bytes: number) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}

export function scanDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export const scanCost = (usd: number) => (usd > 0 && usd < 0.01 ? "< $0.01" : `$${usd.toFixed(2)}`);

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const scanTokens = (count: number) => COMPACT.format(count);

export const scanPlural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const FAILURE_CAUSES = [
  { test: /out of memory/i, title: "The agent ran out of memory while it read the repository.", advice: "Start a new scan with Claude Haiku 5.5 and low effort, or scan a smaller repository." },
  { test: /clone|repository not found|could not read from remote/i, title: "The repository could not be cloned.", advice: "Check that the repository is public and the link is correct." },
  { test: /budget|spend limit/i, title: "The scan reached its spend limit before it finished.", advice: "Start a new scan with a lower effort, or check the monthly budget on the Overview page." },
  { test: /timed out|timeout/i, title: "The scan took too long and was stopped.", advice: "Start a new scan. If it keeps timing out, try a smaller repository." },
];

const DETAIL_LIMIT = 800;

// -----
// A failed scan keeps the agent's raw error, which can be a wall of minified
// code. The reviewer gets a short cause and what to do; the raw text stays
// behind a toggle, cut to a length a person can scroll.
// -----
export function scanFailure(error: string | null | undefined) {
  const raw = (error ?? "").trim();
  const cause = FAILURE_CAUSES.find((item) => item.test.test(raw));
  const firstLine = raw.split("\n")[0]?.slice(0, 160) ?? "";
  return {
    title: cause?.title ?? (firstLine === "" ? "The scan failed." : firstLine),
    advice: cause?.advice ?? "Start a new scan of this repository to try again. If it fails the same way, check that the repository is public and the link is correct.",
    detail: raw === "" ? null : raw.length > DETAIL_LIMIT ? `${raw.slice(0, DETAIL_LIMIT)}\n... (${raw.length - DETAIL_LIMIT} more characters)` : raw,
  };
}
