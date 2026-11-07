export const OPENAPI_DESCRIPTION = [
  "Elise Engine API runs a security scan of a public GitHub repo in a sandbox and keeps the report.",
  "",
  "Every `/scans` route needs `Authorization: Bearer <SCAN_API_TOKEN>` and an `x-account-id` header (the tenant ID).",
  "The dashboard server sends both. A browser must never hold the token.",
].join("\n");
