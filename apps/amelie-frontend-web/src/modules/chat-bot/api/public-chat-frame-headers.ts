import { publicChatContentSecurityPolicy } from "../utils";
import { loadPublicChatFrameOrigins } from "./fetch-public-chat-frame-policy";

export async function publicChatFrameHeaders(
  slug: string,
  loadOrigins: typeof loadPublicChatFrameOrigins = loadPublicChatFrameOrigins,
): Promise<Record<string, string>> {
  return {
    "Content-Security-Policy": await publicChatContentSecurityPolicy(slug, loadOrigins),
  };
}
