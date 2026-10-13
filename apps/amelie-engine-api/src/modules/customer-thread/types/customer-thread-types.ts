export type CustomerThreadSummaryRow = {
  id: string;
  title: string | null;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  unansweredCount: number;
};

export type CustomerThreadMessageRow = {
  id: string;
  role: string;
  content: string;
  structure: unknown;
  dismissedAt: Date | null;
  createdAt: Date;
};

export type CustomerThreadRow = {
  id: string;
  title: string | null;
  startedAt: Date;
  messages: CustomerThreadMessageRow[];
};
