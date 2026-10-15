import { createFileRoute } from "@tanstack/react-router";
import { ChatBotWithProgress } from "@repo/chat-bot-react-loader";
import "@repo/chat-bot-react/chat-bot.css";
import "@repo/chat-bot-react-loader/loader.css";

export const Route = createFileRoute("/")({ component: NotesChat });

// -----
// Defined outside the component so it keeps one identity.
// -----
const LABELS = {
  tools: {
    addNote: { busy: "Saving your note", done: "Saved your note" },
    listNotes: { busy: "Reading your notes", done: "Read your notes" },
  },
};

function NotesChat() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Notes assistant</h1>
      <p style={{ color: "#666" }}>Try: “remember to buy milk”, then “what are my notes?”</p>
      <div style={{ height: 560 }}>
        <ChatBotWithProgress endpoint="/api/chat" labels={LABELS} />
      </div>
    </main>
  );
}
