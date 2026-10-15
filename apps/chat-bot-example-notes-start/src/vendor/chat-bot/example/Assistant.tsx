import { ChatBotWithProgress } from "@repo/chat-bot-react-loader";
import "@repo/chat-bot-react/chat-bot.css";
import "@repo/chat-bot-react-loader/loader.css";

// -----
// THE PAGE. Drop <Assistant /> into any route. It needs the
// server route from start-route.txt (or your own) at the
// same endpoint.
//
// Say what your tools are called in plain words: a progress
// row never shows a tool's code name. Keep this object
// outside the component so it keeps one identity.
// -----
const LABELS = {
  tools: {
    currentTime: { busy: "Checking the time", done: "Checked the time" },
  },
};

export function Assistant() {
  return (
    <div style={{ height: 560 }}>
      <ChatBotWithProgress endpoint="/api/chat" labels={LABELS} />
    </div>
  );
}
