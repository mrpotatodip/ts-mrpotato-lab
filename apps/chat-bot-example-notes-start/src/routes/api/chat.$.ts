import { createFileRoute } from "@tanstack/react-router";
import { handleNotes } from "../../server/notes-host";

// -----
// Everything under /api/chat, including /api/chat
// itself (a splat route matches its own base):
//   POST /api/chat                send a message
//   GET  /api/chat                hydrate, or rejoin a run
//   GET  /api/chat/threads, .../threads/:id, and so on
// -----
const handle = ({ request }: { request: Request }) => handleNotes(request);

export const Route = createFileRoute("/api/chat/$")({
  server: { handlers: { GET: handle, POST: handle, PATCH: handle, DELETE: handle } },
});
