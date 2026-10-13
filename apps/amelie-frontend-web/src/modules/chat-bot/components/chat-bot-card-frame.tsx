import type { ReactNode } from "react";

type ChatBotCardFrameProps = {
  title: string;
  children: ReactNode;
};

export function ChatBotCardFrame({ title, children }: ChatBotCardFrameProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
