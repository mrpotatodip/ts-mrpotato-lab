import type { ChatBotThreadDetail, ChatBotThreadListItem } from "@repo/contracts/chat-bots";

export const withThreadRenamedInList = (threads: ChatBotThreadListItem[], id: string, title: string): ChatBotThreadListItem[] =>
  threads.map((thread) => (thread.id === id ? { ...thread, title } : thread));

export const withThreadRenamed = (detail: ChatBotThreadDetail, title: string): ChatBotThreadDetail => ({ ...detail, title });
