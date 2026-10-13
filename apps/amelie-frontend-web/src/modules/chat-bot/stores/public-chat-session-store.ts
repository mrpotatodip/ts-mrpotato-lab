import type { PublicChatSession } from "../types";

let session: PublicChatSession | undefined;

export function getPublicChatSession(): PublicChatSession | undefined {
  return session;
}

export function setPublicChatSession(next: PublicChatSession | undefined): void {
  session = next;
}
