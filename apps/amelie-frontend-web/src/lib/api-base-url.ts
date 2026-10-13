// amelie-engine-api (Hono on Cloudflare Workers) — modules mount flat
// at the root (/auth, /chat-bot), so there's no path prefix. Matches
// AUTH_BASE_URL in apps/amelie-engine-api's .dev.vars (local).
// Kept in its own file (no server-only imports) so client components can
// import it without pulling in api-client.ts's server-only cookie access.
// TODO: production is still elise's domain until amelie has its own.

export const API_BASE_URL = import.meta.env.PROD
  ? "https://api.helloelise.app"
  : "http://localhost:8788";
