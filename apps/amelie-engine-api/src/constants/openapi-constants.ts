export const OPENAPI_DESCRIPTION = `\
Amelie is an AI customer assistant. It answers a Customer's questions for one Tenant, \
from that Tenant's own information.

**How to read these docs.** Each route has a short context, the steps it follows, and \
one simple example you can copy.

**Two kinds of caller.**
- A *team member* signs in on the dashboard. The routes under \`/tenants\`, \`/chat-bot\` and \`/unanswered-questions\` are theirs. \
They need the session token and (for chat and Unanswered questions) a \`tenantId\`.
- A *Customer* is anonymous. The routes under \`/public/chat-bot\` are the Customer's. \
They need an \`x-anonymous-id\` header and a Tenant slug.

**Every answer is an envelope.** A success looks like \`{ "data": ..., "error": null }\`. \
A failure looks like \`{ "data": null, "error": { "code": "...", "message": "..." } }\`. \
The two chat routes that stream are the exception: they send server-sent events.

**Sign-in routes.** Sign-in and sign-out live under \`/auth/*\`. better-auth owns them, \
so they are not listed here.
`;
