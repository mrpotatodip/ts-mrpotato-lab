import type { AccessPower } from "@repo/contracts/amelie";
import type { ChatBotJson, ChatBotToolDisplay, FaqResult, FindMenuItemsResult } from "@repo/contracts/chat-bots";

export type ChatBotCard = {
  key: string;
  tool: string;
  display: ChatBotToolDisplay | null;
  displayOptions: ChatBotJson | null;
  result: ChatBotJson;
};

export type ChatBotCardLayoutProps = {
  title: string;
  result: ChatBotJson;
  displayOptions: ChatBotJson | null;
};

export type ChatBotBubbleRole = "user" | "assistant";

export type ChatBotMessageLive = {
  live: boolean;
  onRevealed?: () => void;
};

export type ChatBotLatestTurn = {
  lastUserId: string | undefined;
  replyIds: ReadonlySet<string>;
};

export type ChatBotSurface = {
  placeholder: string;
  emptyPrompt: string;
  maxMessageLength: number | undefined;
  cardTools: ReadonlySet<string> | null;
  showFailedCards: boolean;
  sendPower: AccessPower | null;
};

export type PublicChatSession = {
  slug: string;
  anonymousId: string;
  location?: string;
  country?: string;
};

export type StaffChatPlace = {
  location?: string;
  country?: string;
};

export type ChatBotStepLabel = {
  busy: string;
  done: string;
};

export type ChatBotMenuGroup = {
  category: string;
  note: string | null;
  items: FindMenuItemsResult["items"];
};

export type ChatBotFaqGroup = {
  category: string;
  faqs: FaqResult[];
};

export type ChatBotProfileRow = {
  label: string;
  value: string;
};
