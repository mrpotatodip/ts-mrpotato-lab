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
    message: z.string().meta({ example: "Chat thread not found" }),
  }),
});

export const envelope = <T extends z.ZodType>(data: T) => z.object({ data, error: z.null() });

export const jsonResponse = (description: string, schema: z.ZodType) => ({
  description,
  content: { "application/json": { schema: resolver(schema) } },
});

// -----
// One plain sentence per status, so a
// beginner learns what each code means.
// -----
const ERROR_DESCRIPTIONS = {
  400: "The request is not valid. The message names the field that is wrong.",
  401: "The caller is not signed in. Sign in, then send the request again.",
  403: "The caller is not allowed to do this.",
  404: "The thing does not exist, or it belongs to someone else.",
  409: "The thing already exists. Use a new id.",
  413: "The request body is too large.",
  429: "The caller sent too many requests. Wait, then try again.",
};

export type ErrorStatus = keyof typeof ERROR_DESCRIPTIONS;

export function errorResponses(...statuses: ErrorStatus[]) {
  return Object.fromEntries(
    statuses.map((status) => [status, jsonResponse(ERROR_DESCRIPTIONS[status], ErrorEnvelopeSchema)]),
  );
}

// -----
// A signed-in route needs the session token.
// A staff chat route also needs ?tenantId=.
// -----
export const STAFF_SECURITY = [{ bearerAuth: [] }];

export const TENANT_ID_QUERY_PARAMETER = {
  in: "query",
  name: "tenantId",
  required: true,
  description: "The Tenant the signed-in team member is working in. Get it from GET /tenants.",
  schema: { type: "string", format: "uuid" },
} as const;

export const SSE_RESPONSE_HEADERS = {
  "X-Thread-Id": {
    description: "The id of the Thread this answer belongs to. A new Thread gets its id here.",
    schema: { type: "string", format: "uuid" },
  },
} as const;

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
export const EXAMPLE_BASE_URL = "http://localhost:8788";
export const EXAMPLE_TENANT_ID = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
export const EXAMPLE_THREAD_ID = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
export const EXAMPLE_ANONYMOUS_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
