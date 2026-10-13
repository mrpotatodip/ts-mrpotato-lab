import { PUBLIC_CHAT_ANONYMOUS_ID_KEY, PUBLIC_CHAT_THREAD_KEY_PREFIX } from "../constants";

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // -----
    // Storage blocked: the chat still works,
    // it just won't survive a reload.
    // -----
  }
};

// -----
// One random id per browser; it is the
// Customer's only key to their threads.
// -----
export function publicChatAnonymousId(): string {
  const stored = read(PUBLIC_CHAT_ANONYMOUS_ID_KEY);
  if (stored) return stored;
  const created = crypto.randomUUID();
  write(PUBLIC_CHAT_ANONYMOUS_ID_KEY, created);
  return created;
}

export function readPublicChatThreadId(slug: string): string | null {
  return read(`${PUBLIC_CHAT_THREAD_KEY_PREFIX}${slug}`);
}

export function writePublicChatThreadId(slug: string, threadId: string | null): void {
  write(`${PUBLIC_CHAT_THREAD_KEY_PREFIX}${slug}`, threadId);
}
