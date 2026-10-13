// -----
// Customer chat check (throwaway): asks the
// running engine Sorella questions, grades them.
// Run: pnpm --filter amelie-engine-api exec tsx .scratch/customer-assistant/eval/run.ts [label] [repeats]
// -----

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = "http://localhost:8788/public/chat-bot";
const ORIGIN = "http://localhost:3000";
const SLUG = "sorella";
const NEW_THREAD_GAP_MS = 6500;

type Case = {
  name: string;
  q: string;
  followUp?: string;
  tools: string[];
  missing: boolean;
  answer: RegExp;
};

const todayClose = (): RegExp => {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(new Date());
  if (weekday === "Sun") return /2(:00)?\s?(p\.?m\.?|PM)|14:00/;
  if (weekday === "Mon") return /closed/i;
  return /4(:00)?\s?(p\.?m\.?|PM)|16:00/;
};

const CASES: Case[] = [
  { name: "open now", q: "Are you open right now?", tools: ["getOpeningSchedule"], missing: false, answer: /open|closed/i },
  {
    name: "latte follow-up",
    q: "Are you open on Saturday?",
    followUp: "How much is a large latte?",
    tools: ["findMenuItems", "listMenu"],
    missing: false,
    answer: /6\.25/,
  },
  { name: "gluten-free", q: "Do you have gluten-free options?", tools: ["findMenuItems", "listMenu"], missing: false, answer: /muffin[\s\S]*bread|bread[\s\S]*muffin/i },
  { name: "gift cards", q: "Do you sell gift cards?", tools: ["listFaqs"], missing: false, answer: /gift card/i },
  { name: "phone", q: "What is your phone number?", tools: ["getBusinessProfile"], missing: false, answer: /845-871-2010/ },
  { name: "christmas", q: "Are you open on Christmas Day?", tools: ["getOpeningSchedule"], missing: false, answer: /closed/i },
  { name: "parking", q: "Is there parking nearby?", tools: [], missing: true, answer: /.+/ },
  { name: "close today", q: "What time do you close today?", tools: ["getOpeningSchedule"], missing: false, answer: todayClose() },
];

// -----
// The cafe speaks as "we"; it is never
// "Amelie" and never "you close".
// -----
const WRONG_VOICE = /\bAmelie\b|\byou(?:'re| are)? (?:close|open|closed)\b/i;

type Turn = { threadId: string | null; tools: string[]; answer: string; status: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// -----
// One message; the answer is the last text
// message the stream carried (the customer's).
// -----
async function ask(anonymousId: string, content: string, threadId: string | null): Promise<Turn> {
  const res = await fetch(ENGINE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-Anonymous-Id": anonymousId },
    body: JSON.stringify({ slug: SLUG, content, ...(threadId ? { threadId } : {}) }),
  });
  const text = await res.text();
  const tools: string[] = [];
  const messages = new Map<string, string>();
  let last = "";
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === "TOOL_CALL_START") tools.push(event.toolName ?? event.toolCallName);
    if (event.type === "TEXT_MESSAGE_CONTENT") {
      messages.set(event.messageId, (messages.get(event.messageId) ?? "") + event.delta);
      last = event.messageId;
    }
  }
  return { threadId: res.headers.get("X-Thread-Id"), tools, answer: messages.get(last) ?? text.slice(0, 200), status: res.status };
}

const label = process.argv[2] ?? "run";
const repeats = Number(process.argv[3] ?? 3);
const results: Array<Record<string, unknown>> = [];

for (let round = 1; round <= repeats; round++) {
  for (const c of CASES) {
    const anonymousId = crypto.randomUUID();
    let turn = await ask(anonymousId, c.q, null);
    if (c.followUp) {
      await sleep(1000);
      turn = await ask(anonymousId, c.followUp, turn.threadId);
    }
    const lookedUp = c.tools.length === 0 || c.tools.some((tool) => turn.tools.includes(tool));
    const reported = turn.tools.includes("reportMissingInformation");
    const wrongVoice = WRONG_VOICE.test(turn.answer);
    const pass =
      turn.status === 200 && lookedUp && reported === c.missing && c.answer.test(turn.answer) && !wrongVoice;
    results.push({ round, case: c.name, pass, lookedUp, reported, wrongVoice, tools: turn.tools, answer: turn.answer });
    console.log(`${pass ? "PASS" : "FAIL"}  r${round}  ${c.name.padEnd(16)} tools=[${turn.tools.join(",")}]  ${turn.answer.replace(/\s+/g, " ").slice(0, 110)}`);
    await sleep(NEW_THREAD_GAP_MS);
  }
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${label}: ${passed}/${results.length} passed`);
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, `results-${label}.json`), JSON.stringify(results, null, 2));
