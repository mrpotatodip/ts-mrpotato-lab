let streamThreadId: string | undefined;
let createdThreadId: string | undefined;
let onThreadCreated: ((id: string) => void) | undefined;

export function getChatBotStreamThreadId(): string | undefined {
  return streamThreadId;
}

export function peekCreatedThreadId(): string | undefined {
  return createdThreadId;
}

export function clearCreatedThreadId(): void {
  createdThreadId = undefined;
}

export function setChatBotStreamThreadId(id: string | undefined): void {
  streamThreadId = id;
}

export function setOnChatBotThreadCreated(
  handler: ((id: string) => void) | undefined,
): void {
  onThreadCreated = handler;
}

export function notifyChatBotThreadCreated(id: string): void {
  streamThreadId = id;
  createdThreadId = id;
  onThreadCreated?.(id);
}
