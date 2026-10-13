import type { FaqResult } from "@repo/contracts/chat-bots";

type ChatBotFaqItemProps = {
  faq: FaqResult;
};

export function ChatBotFaqItem({ faq }: ChatBotFaqItemProps) {
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-accent px-4 py-3">
      <p className="font-medium">{faq.question}</p>
      <p className="text-xs text-muted-foreground">{faq.answer}</p>
    </li>
  );
}
