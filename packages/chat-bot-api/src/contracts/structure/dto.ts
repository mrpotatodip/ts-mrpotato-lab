import { z } from "zod";
import { CHAT_BOT_TOOL_DISPLAY_VALUES } from "../enums";

export const ChatBotJsonSchema = z.json();

export const ChatBotToolDisplaySchema = z.enum(CHAT_BOT_TOOL_DISPLAY_VALUES);

export const ChatBotToolDisplayConfigSchema = z.object({
  display: ChatBotToolDisplaySchema.nullable(),
  displayOptions: ChatBotJsonSchema.nullable(),
});

export const ChatBotNumberDisplayOptionsSchema = z.object({
  value: z.string().min(1),
  unit: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});

export const ChatBotKeyValueDisplayOptionsSchema = z.object({
  fields: z.array(z.string().min(1)).min(1).optional(),
});

export const ChatBotTableDisplayOptionsSchema = z.object({
  rows: z.string().min(1).optional(),
  columns: z.array(z.string().min(1)).min(1).optional(),
});

export const ChatBotListDisplayOptionsSchema = z.object({
  items: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});

export const ChatBotToolErrorSchema = z.object({
  error: z.string(),
});

export const ChatBotToolEntrySchema =ChatBotToolDisplayConfigSchema.extend({
  results: z.array(ChatBotJsonSchema),
});

export const ChatBotStructureSchema = z.record(z.string(), ChatBotToolEntrySchema);

export const ChatBotToolDisplayEventValueSchema = ChatBotToolDisplayConfigSchema.extend({
  toolCallId: z.string(),
  tool: z.string(),
  result: ChatBotJsonSchema,
});

export type ChatBotJson = z.infer<typeof ChatBotJsonSchema>;
export type ChatBotToolDisplay = z.infer<typeof ChatBotToolDisplaySchema>;
export type ChatBotToolDisplayConfig = z.infer<typeof ChatBotToolDisplayConfigSchema>;
export type ChatBotNumberDisplayOptions = z.infer<typeof ChatBotNumberDisplayOptionsSchema>;
export type ChatBotKeyValueDisplayOptions = z.infer<typeof ChatBotKeyValueDisplayOptionsSchema>;
export type ChatBotTableDisplayOptions = z.infer<typeof ChatBotTableDisplayOptionsSchema>;
export type ChatBotListDisplayOptions = z.infer<typeof ChatBotListDisplayOptionsSchema>;
export type ChatBotToolError = z.infer<typeof ChatBotToolErrorSchema>;
export type ChatBotToolEntry = z.infer<typeof ChatBotToolEntrySchema>;
export type ChatBotStructure = z.infer<typeof ChatBotStructureSchema>;
export type ChatBotToolDisplayEventValue = z.infer<typeof ChatBotToolDisplayEventValueSchema>;
