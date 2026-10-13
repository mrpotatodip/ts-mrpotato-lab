import type { ZodTypeAny, z } from "zod";
import { getAuthCookie } from "#/lib/auth-cookie";
import { API_BASE_URL as BASE_URL } from "#/lib/api-base-url";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
    message?: string,
  ) {
    super(message ?? `API error ${status}`);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  headers?: HeadersInit;
  signal?: AbortSignal;
  baseUrl?: string;
};

type Parsed<TSchema> = TSchema extends ZodTypeAny ? z.infer<TSchema> : unknown;

async function request<TSchema extends ZodTypeAny | undefined>(
  method: string,
  path: string,
  schema?: TSchema,
  body?: unknown,
  options: RequestOptions = {},
): Promise<Parsed<TSchema>> {
  const origin = options.baseUrl ?? BASE_URL;
  const url = `${origin}${path}`;
  const token = getAuthCookie();
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: {
      // A multipart body sets its own Content-Type, with the boundary.
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      // -----
      // Node's fetch sends Sec-Fetch-Mode on every request, which trips
      // better-auth's browser-request heuristic and then demands a
      // trusted Origin. Matching the target's own origin is always
      // implicitly trusted (see elise-frontend-api's auth.http). The
      // Origin header itself must be scheme+host+port only, no path —
      // `origin` may carry a path prefix (elise's /api-frontend for
      // sign-up), so it can't be used as-is.
      // -----
      Origin: new URL(origin).origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    signal: options.signal,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json &&
      typeof json === "object" &&
      "error" in json &&
      json.error &&
      typeof json.error === "object" &&
      "message" in json.error
        ? String((json.error as { message: unknown }).message)
        : undefined;
    throw new ApiError(res.status, json, message);
  }

  // -----
  // SAFETY: each branch produces the arm of Parsed<TSchema> its own
  // condition selects, which TS cannot narrow through a generic.
  // -----
  return (schema ? schema.parse(json) : json) as Parsed<TSchema>;
}

export const apiClient = {
  get: <S extends ZodTypeAny | undefined>(
    path: string,
    schema?: S,
    opts?: RequestOptions,
  ) => request("GET", path, schema, undefined, opts),

  post: <S extends ZodTypeAny | undefined>(
    path: string,
    schema?: S,
    body?: unknown,
    opts?: RequestOptions,
  ) => request("POST", path, schema, body, opts),

  put: <S extends ZodTypeAny | undefined>(
    path: string,
    schema?: S,
    body?: unknown,
    opts?: RequestOptions,
  ) => request("PUT", path, schema, body, opts),

  patch: <S extends ZodTypeAny | undefined>(
    path: string,
    schema?: S,
    body?: unknown,
    opts?: RequestOptions,
  ) => request("PATCH", path, schema, body, opts),

  delete: <S extends ZodTypeAny | undefined>(
    path: string,
    schema?: S,
    opts?: RequestOptions,
  ) => request("DELETE", path, schema, undefined, opts),
};
