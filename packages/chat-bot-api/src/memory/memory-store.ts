import { Effect } from "effect";
import {
  ChatBotThreadDeletedSchema,
  ChatBotThreadDetailSchema,
  ChatBotThreadListItemSchema,
  type ChatBotStructure,
  type ChatBotTurn,
} from "../contracts";
import {
  CHAT_BOT_RUN_EXISTS,
  CHAT_BOT_THREAD_NOT_FOUND,
} from "../constants";
import { ChatBotConflict, ChatBotInvalid, ChatBotNotFound } from "../errors";
import type { ChatBotRunCloseStatus } from "../schemas";
import type {
  ChatBotNewThread,
  ChatBotOwner,
  ChatBotStore,
  ChatBotThreadAttrs,
  ChatBotTurnUsage,
} from "../types";

type MemoryThread = {
  id: string;
  title: string | null;
  trigger: string;
  module: string;
  createdAt: Date;
  updatedAt: Date;
};

type MemorySession = {
  threadId: string;
  owner: ChatBotOwner;
  attrs: ChatBotThreadAttrs;
  createdAt: Date;
  expiresAt: Date | null;
};

type MemoryMessage = {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed: string[];
  structure: ChatBotStructure | null;
  createdAt: Date;
};

type MemoryRun = {
  id: string;
  threadId: string;
  status: "running" | ChatBotRunCloseStatus;
  usage: ChatBotTurnUsage | null;
  startedAt: Date;
};

export type MemoryChatBotState = {
  threads: Map<string, MemoryThread>;
  sessions: Map<string, MemorySession>;
  messages: MemoryMessage[];
  runs: Map<string, MemoryRun>;
};

// -----
// triggers and modules: what a thread may start
// with (omit to allow any). anonymousIdleMs and
// anonymousHardCapMs: an anonymous thread's idle
// expiry, and the cap it never slides past.
// -----
export type MemoryChatBotStoreOptions = {
  triggers?: ReadonlyArray<string>;
  modules?: ReadonlyArray<string>;
  anonymousIdleMs?: number;
  anonymousHardCapMs?: number;
  now?: () => Date;
};

const DEFAULT_ANONYMOUS_IDLE_MS = 30 * 60 * 1000;
const DEFAULT_ANONYMOUS_HARD_CAP_MS = 24 * 60 * 60 * 1000;

const listItem = (thread: MemoryThread) =>
  ChatBotThreadListItemSchema.parse({
    id: thread.id,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    title: thread.title,
    trigger: thread.trigger,
    module: thread.module,
  });

// -----
// The whole port over plain Maps: for tests,
// prototypes, and a host that has no database
// yet. It keeps the contract a real store must:
// a thread is visible only to its owner.
// -----
export function createMemoryChatBotStore(
  options: MemoryChatBotStoreOptions = {},
): ChatBotStore & { state: MemoryChatBotState } {
  const now = options.now ?? (() => new Date());
  const idleMs = options.anonymousIdleMs ?? DEFAULT_ANONYMOUS_IDLE_MS;
  const hardCapMs = options.anonymousHardCapMs ?? DEFAULT_ANONYMOUS_HARD_CAP_MS;
  const state: MemoryChatBotState = {
    threads: new Map(),
    sessions: new Map(),
    messages: [],
    runs: new Map(),
  };

  const holds = (session: MemorySession, owner: ChatBotOwner): boolean => {
    if (session.owner.scopeId !== owner.scopeId) return false;
    if (owner.kind === "user") {
      return session.owner.kind === "user" && session.owner.userId === owner.userId;
    }
    return (
      session.owner.kind === "anonymous" &&
      session.owner.anonymousId === owner.anonymousId &&
      (session.expiresAt?.getTime() ?? 0) > now().getTime()
    );
  };

  const ownedThread = (owner: ChatBotOwner, threadId: string): MemoryThread | null => {
    const session = state.sessions.get(threadId);
    const thread = state.threads.get(threadId);
    return session && thread && holds(session, owner) ? thread : null;
  };

  const addMessage = (
    message: Omit<MemoryMessage, "id" | "createdAt"> & { createdAt?: Date },
  ): void => {
    state.messages.push({
      ...message,
      id: crypto.randomUUID(),
      createdAt: message.createdAt ?? now(),
    });
  };

  const addThread = (params: ChatBotNewThread): MemoryThread => {
    const at = now();
    const thread: MemoryThread = {
      id: crypto.randomUUID(),
      title: params.title,
      trigger: params.trigger,
      module: params.module,
      createdAt: at,
      updatedAt: at,
    };
    state.threads.set(thread.id, thread);
    state.sessions.set(thread.id, {
      threadId: thread.id,
      owner: params.owner,
      attrs: params.attrs ?? {},
      createdAt: at,
      expiresAt: params.owner.kind === "anonymous" ? new Date(at.getTime() + idleMs) : null,
    });
    return thread;
  };

  const store: ChatBotStore = {
    assertThreadStart: ({ trigger, module }) =>
      Effect.gen(function* () {
        if (options.triggers && !options.triggers.includes(trigger)) {
          return yield* new ChatBotInvalid({ message: `Unknown chat trigger: ${trigger}` });
        }
        if (options.modules && !options.modules.includes(module)) {
          return yield* new ChatBotInvalid({ message: `Unknown chat module: ${module}` });
        }
      }),

    lookupRun: (owner, runId) =>
      Effect.sync(() => {
        const run = state.runs.get(runId);
        return run && ownedThread(owner, run.threadId) ? { id: run.id, threadId: run.threadId } : null;
      }),

    findThread: (owner, threadId) =>
      Effect.gen(function* () {
        const thread = ownedThread(owner, threadId);
        if (!thread) return yield* new ChatBotNotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
        return {
          id: thread.id,
          title: thread.title,
          trigger: thread.trigger,
          module: thread.module,
        };
      }),

    insertRun: ({ runId, threadId }) =>
      Effect.gen(function* () {
        if (state.runs.has(runId)) return yield* new ChatBotConflict({ message: CHAT_BOT_RUN_EXISTS });
        if (!state.threads.has(threadId)) {
          return yield* new ChatBotNotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
        }
        state.runs.set(runId, { id: runId, threadId, status: "running", usage: null, startedAt: now() });
      }),

    insertThreadWithRun: (params) =>
      Effect.gen(function* () {
        if (state.runs.has(params.runId)) {
          return yield* new ChatBotConflict({ message: CHAT_BOT_RUN_EXISTS });
        }
        const thread = addThread(params);
        state.runs.set(params.runId, {
          id: params.runId,
          threadId: thread.id,
          status: "running",
          usage: null,
          startedAt: now(),
        });
        return { id: thread.id };
      }),

    insertUserMessage: ({ threadId, content }) =>
      Effect.sync(() =>
        addMessage({ threadId, role: "user", content, toolsUsed: [], structure: null }),
      ),

    insertAssistantMessage: ({ threadId, content, toolsUsed, structure }) =>
      Effect.sync(() => {
        addMessage({ threadId, role: "assistant", content, toolsUsed, structure });
        const thread = state.threads.get(threadId);
        if (thread) thread.updatedAt = now();
      }),

    listMessagesForModel: (threadId, limit) =>
      Effect.sync(() =>
        state.messages
          .filter((message) => message.threadId === threadId)
          .slice(-limit)
          .map((message): ChatBotTurn => ({ role: message.role, content: message.content })),
      ),

    closeRun: (runId, status) =>
      Effect.sync(() => {
        const run = state.runs.get(runId);
        if (run) run.status = status;
      }),

    extendAnonymousThread: (threadId) =>
      Effect.sync(() => {
        const session = state.sessions.get(threadId);
        if (!session || session.owner.kind !== "anonymous") return;
        const slid = now().getTime() + idleMs;
        const cap = session.createdAt.getTime() + hardCapMs;
        session.expiresAt = new Date(Math.min(slid, cap));
      }),

    recordRunUsage: (runId, usage) =>
      Effect.sync(() => {
        const run = state.runs.get(runId);
        if (run) run.usage = usage;
      }),

    findActiveRun: (threadId) =>
      Effect.sync(() => {
        const active = [...state.runs.values()]
          .filter((run) => run.threadId === threadId && run.status === "running")
          .toSorted((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        return active[0] ? { id: active[0].id } : null;
      }),

    listThreads: (owner, query) =>
      Effect.sync(() =>
        [...state.threads.values()]
          .filter((thread) => ownedThread(owner, thread.id))
          .filter((thread) => !query.trigger || thread.trigger === query.trigger)
          .filter((thread) => !query.module || thread.module === query.module)
          .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .map(listItem),
      ),

    getThread: (owner, threadId) =>
      Effect.gen(function* () {
        const thread = ownedThread(owner, threadId);
        if (!thread) return yield* new ChatBotNotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
        return ChatBotThreadDetailSchema.parse({
          id: thread.id,
          title: thread.title,
          trigger: thread.trigger,
          module: thread.module,
          messages: state.messages.filter((message) => message.threadId === threadId),
        });
      }),

    renameThread: (owner, threadId, title) =>
      Effect.gen(function* () {
        const thread = ownedThread(owner, threadId);
        if (!thread) return yield* new ChatBotNotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
        thread.title = title;
        thread.updatedAt = now();
        return listItem(thread);
      }),

    deleteThread: (owner, threadId) =>
      Effect.gen(function* () {
        if (!ownedThread(owner, threadId)) {
          return yield* new ChatBotNotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
        }
        state.threads.delete(threadId);
        state.sessions.delete(threadId);
        state.messages = state.messages.filter((message) => message.threadId !== threadId);
        for (const run of state.runs.values()) {
          if (run.threadId === threadId) state.runs.delete(run.id);
        }
        return ChatBotThreadDeletedSchema.parse({ id: threadId });
      }),
  };

  return { ...store, state };
}
