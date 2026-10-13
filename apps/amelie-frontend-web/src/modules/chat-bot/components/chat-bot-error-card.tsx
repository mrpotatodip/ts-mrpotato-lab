import { ChatBotCardFrame } from "./chat-bot-card-frame";

type ChatBotErrorCardProps = {
  title: string;
  message: string;
};

export function ChatBotErrorCard({ title, message }: ChatBotErrorCardProps) {
  return (
    <ChatBotCardFrame title={title}>
      <p className="text-sm text-muted-foreground">Couldn't load: {message}</p>
    </ChatBotCardFrame>
  );
}
