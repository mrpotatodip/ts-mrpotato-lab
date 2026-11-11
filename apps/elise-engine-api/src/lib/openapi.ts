import { resolver } from "hono-openapi";
import { z } from "zod";

// -----
// Shared pieces of every route's OpenAPI docs.
// Every body is the { data, error } envelope.
// -----
export const ErrorEnvelopeSchema = z.object({
  data: z.null(),
  error: z.object({
    code: z.string().meta({ example: "NOT_FOUND" }),
    message: z.string().meta({ example: "Scan not found" }),
  }),
});

export const envelope = <T extends z.ZodType>(data: T) => z.object({ data, error: z.null() });

export const jsonResponse = (description: string, schema: z.ZodType) => ({
  description,
  content: { "application/json": { schema: resolver(schema) } },
});

const ERROR_DESCRIPTIONS = {
  400: "The request is not valid. The message names the field that is wrong.",
  401: "The bearer token is missing or wrong, or there is no signed-in session.",
  403: "The request is refused: not allowed for this login, or an invite code or link that is not valid.",
  404: "The resource does not exist, or it belongs to another account.",
  409: "The resource already exists, for example an email that has a login.",
  429: "The account has too many active scans. Wait for one to end, then try again.",
};

export type ErrorStatus = keyof typeof ERROR_DESCRIPTIONS;

export function errorResponses(...statuses: ErrorStatus[]) {
  return Object.fromEntries(statuses.map((status) => [status, jsonResponse(ERROR_DESCRIPTIONS[status], ErrorEnvelopeSchema)]));
}

export const SERVICE_SECURITY = [{ bearerAuth: [] }];

// -----
// Every route's description has one shape:
// context, the steps, then one simple example.
// -----
export type RouteText = {
  context: string;
  steps: ReadonlyArray<string>;
  example: ReadonlyArray<string>;
};

export const routeText = ({ context, steps, example }: RouteText): string =>
  [
    `**Context.** ${context}`,
    "**What happens.**",
    steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    "**Example.**",
    ...example,
  ].join("\n\n");

export const bash = (...lines: string[]): string => `\`\`\`bash\n${lines.join("\n")}\n\`\`\``;
export const json = (text: string): string => `\`\`\`json\n${text}\n\`\`\``;

// -----
// Made-up ids and one base URL, the same in
// every example, so the examples read as one story.
// -----
export const EXAMPLE_BASE_URL = "http://localhost:8787";
export const EXAMPLE_ACCOUNT_ID = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
export const EXAMPLE_SCAN_ID = "zd3u73nfd-06ac9c07-b80c-45da-8fc5-ece4768b5b22";
