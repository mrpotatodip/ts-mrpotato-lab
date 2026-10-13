import { ChatBotTableDisplayOptionsSchema } from "@repo/contracts/chat-bots";

import type { ChatBotCardLayoutProps } from "../types";
import {
  formatChatBotValue,
  toChatBotLabel,
  toChatBotRow,
  toChatBotRows,
} from "../utils";
import { ChatBotCardFrame } from "./chat-bot-card-frame";
import { ChatBotKeyValueCard } from "./chat-bot-key-value-card";

// -----
// display = table: rows from result[rows]
// (or the result itself when it is a list).
// -----
export function ChatBotTableCard({
  title,
  result,
  displayOptions,
}: ChatBotCardLayoutProps) {
  const options = ChatBotTableDisplayOptionsSchema.safeParse(
    displayOptions ?? {},
  );
  const rowsKey = options.success ? options.data.rows : undefined;
  const rows = toChatBotRows(rowsKey ? toChatBotRow(result)?.[rowsKey] : result);
  if (rows.length === 0) {
    return (
      <ChatBotKeyValueCard title={title} result={result} displayOptions={{}} />
    );
  }
  const columns =
    (options.success ? options.data.columns : undefined) ??
    Object.keys(rows[0] ?? {});
  return (
    <ChatBotCardFrame title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="pr-3 font-medium text-muted-foreground"
                >
                  {toChatBotLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column} className="pr-3">
                    {formatChatBotValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChatBotCardFrame>
  );
}
