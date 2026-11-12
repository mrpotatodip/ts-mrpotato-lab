import { z } from "zod";
import { SCAN_SANDBOX_CLIENT_TOOL_TYPE, SCAN_SANDBOX_RISKY_BETA } from "#/modules/scan-sandbox/constants";

export const MessagesBodySchema = z.looseObject({
  model: z.string(),
  max_tokens: z.number().optional(),
  mcp_servers: z.unknown().optional(),
  tools: z.array(z.looseObject({ type: z.string().optional() })).optional(),
});

export type MessagesBody = z.infer<typeof MessagesBodySchema>;

// -----
// Why a model call is refused, or null when it may go on. A remote
// MCP server or a tool that Anthropic runs for the caller (web
// fetch, web search, code execution) reaches the network from
// Anthropic's side, past the allowlist.
// -----
export const messagesBlockedReason = (body: MessagesBody): string | null => {
  if (body.mcp_servers !== undefined) return "mcp_servers is not allowed";
  const tool = body.tools?.find((candidate) => candidate.type !== undefined && !SCAN_SANDBOX_CLIENT_TOOL_TYPE.test(candidate.type));
  return tool === undefined ? null : `the ${tool.type} tool is not allowed`;
};

// -----
// The anthropic-beta header without the betas that switch on a
// feature the call may not use. Null when none is left.
// -----
export const safeBetaHeader = (value: string | null): string | null => {
  if (value === null) return null;
  const kept = value
    .split(",")
    .map((beta) => beta.trim())
    .filter((beta) => beta !== "" && !SCAN_SANDBOX_RISKY_BETA.test(beta));
  return kept.length === 0 ? null : kept.join(",");
};
