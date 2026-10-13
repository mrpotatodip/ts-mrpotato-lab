import type { ChatBotProfileRow } from "../../types";

type ChatBotRowsTileProps = {
  rows: ChatBotProfileRow[];
};

export function ChatBotRowsTile({ rows }: ChatBotRowsTileProps) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-accent px-4 py-3">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
