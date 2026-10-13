import { fetchPublicChatFramePolicy } from "./fetch-public-chat-frame-policy";
import { publicChatContentSecurityPolicy } from "../utils/to-public-chat-frame-ancestors";

export async function publicChatFrameHeaders(slug: string): Promise<Record<string, string>> {
  return {
    "Content-Security-Policy": await publicChatContentSecurityPolicy(slug, fetchPublicChatFramePolicy),
  };
}
