import { toolDefinition } from "@tanstack/ai";
import { createChatBotToolFactory, type ChatBotAgent } from "@repo/chat-bot-api";
import { z } from "zod";

// -----
// This host's own domain: a notebook per
// workspace. Nothing here knows about Amelie.
// -----
export type Notebook = Map<string, string[]>;

export type Services = { notebook: Notebook };

const defineTool = createChatBotToolFactory<Services>();

const addNoteTool = defineTool({
  definition: toolDefinition({
    name: "addNote",
    description: "Save a note in the current workspace.",
    inputSchema: z.object({ text: z.string().min(1) }),
    outputSchema: z.object({ count: z.number() }),
  }),
  run: ({ text }, { notebook, owner }) => {
    const notes = notebook.get(owner.scopeId) ?? [];
    notebook.set(owner.scopeId, [...notes, text]);
    return { count: notes.length + 1 };
  },
});

const listNotesTool = defineTool({
  definition: toolDefinition({
    name: "listNotes",
    description: "List every note in the current workspace.",
    inputSchema: z.object({}),
    outputSchema: z.object({ notes: z.array(z.string()) }),
  }),
  run: (_input, { notebook, owner }) => ({ notes: notebook.get(owner.scopeId) ?? [] }),
});

// -----
// The model is the agent's own setting, so the
// host picks it when it builds the agent.
// -----
export const createNotesAgent = (model: string): ChatBotAgent<Services> => ({
  id: "notes",
  name: "notes",
  description: "Keeps a workspace's notes.",
  model,
  temperature: null,
  prompts: ["You keep notes for the user. Save what they ask; list them when asked."],
  tools: [addNoteTool, listNotesTool],
  subagents: [],
});

export const notesTools = [addNoteTool, listNotesTool];
