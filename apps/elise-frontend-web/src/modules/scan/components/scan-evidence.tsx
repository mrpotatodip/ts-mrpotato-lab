import { highlightCode, highlightThemeCss } from "#/lib/highlight";
import { cn } from "#/lib/utils";

type Piece = { kind: "text" | "code"; value: string };

const FILE_REFERENCE = /([\w@./-]+\.(?:tsx?|jsx?|json|sql|ya?ml|toml|md|env|cjs|mjs)(?::\d+)?)/g;
const LONG_SNIPPET = 60;

const parseEvidence = (text: string): Piece[] =>
  text
    .split(/`([^`]+)`/)
    .map((value, index): Piece => ({ kind: index % 2 === 1 ? "code" : "text", value }))
    .filter((piece) => piece.value !== "");

const isBlock = (code: string) => code.length > LONG_SNIPPET || /[;{}]/.test(code);

function Code({ code }: { code: string }) {
  const block = isBlock(code);

  return (
    <code className={cn("font-mono text-[13px] leading-6", block ? "my-2 block whitespace-pre-wrap rounded-md border bg-background px-3 py-2.5 [overflow-wrap:anywhere]" : "rounded bg-background px-1 py-0.5 [overflow-wrap:anywhere]")}>
      {highlightCode(code).map((token, index) => (
        <span key={`${index}-${token.value}`} className={token.className ? `th-${token.className}` : undefined}>
          {token.value}
        </span>
      ))}
    </code>
  );
}

function Prose({ text }: { text: string }) {
  return text.split(FILE_REFERENCE).map((part, index) =>
    index % 2 === 1 ? (
      <code key={`${index}-${part}`} className="rounded bg-background px-1 py-0.5 font-mono text-[13px] font-medium [overflow-wrap:anywhere]">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

// -----
// Evidence is a sentence with code in backticks, not a code file. The prose
// stays prose, file names become small labels and each snippet is coloured as
// code, so the reader can tell what the scan said from what the code says.
// -----
export function ScanEvidence({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-muted/60 p-4 text-sm leading-7 text-foreground">
      <style href="tanstack-highlight" precedence="default">
        {highlightThemeCss}
      </style>
      {parseEvidence(text).map((piece, index) => (piece.kind === "code" ? <Code key={`${index}-${piece.value}`} code={piece.value} /> : <Prose key={`${index}-${piece.value}`} text={piece.value} />))}
    </div>
  );
}
