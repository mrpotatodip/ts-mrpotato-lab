import { useChatBotMessageLive } from "../hooks/use-chat-bot-contexts";
import { ChatBotSmoothTextAnimation } from "./animations/chat-bot-smooth-text-animation";

type ChatBotAnswerProps = {
  answer: string | null;
  status?: "streaming" | "complete" | "error";
};

// -----
// The model's answer only; cards render apart.
// Keyed on live, so typing restarts if it flips.
// -----
export function ChatBotAnswer({ answer, status }: ChatBotAnswerProps) {
  const { live, onRevealed } = useChatBotMessageLive();
  if (!answer) return null;

  return (
    <div className="flex flex-col gap-3 p-2">
      <p>
        <ChatBotSmoothTextAnimation
          key={live ? "live" : "saved"}
          text={answer}
          streaming={status === "streaming"}
          animate={live}
          onRevealed={onRevealed}
        />
      </p>
    </div>
  );
}
