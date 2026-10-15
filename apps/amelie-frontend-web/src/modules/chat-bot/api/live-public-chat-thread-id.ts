import { readPublicChatThreadId, writePublicChatThreadId } from "../utils";
import { checkPublicChatThread } from "./check-public-chat-thread";

type PublicChatThreadCheck = (input: {
  data: { slug: string; threadId: string; anonymousId: string };
}) => Promise<{ live: boolean }>;

export async function livePublicChatThreadId(
  slug: string,
  anonymousId: string,
  check: PublicChatThreadCheck = checkPublicChatThread,
): Promise<string | null> {
  const stored = readPublicChatThreadId(slug);
  if (!stored) return null;
  const { live } = await check({ data: { slug, threadId: stored, anonymousId } }).catch(() => ({
    live: false,
  }));
  if (live) return stored;
  writePublicChatThreadId(slug, null);
  return null;
}
