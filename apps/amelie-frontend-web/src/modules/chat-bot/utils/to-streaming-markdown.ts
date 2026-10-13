// -----
// Close a half-typed "**" so bold shows while
// it types, e.g. "is **3" → "is **3**".
// -----
export function toStreamingMarkdown(text: string): string {
  const trimmed = text.endsWith("*") && !text.endsWith("**") ? text.slice(0, -1) : text;
  const markers = trimmed.split("**").length - 1;
  if (markers % 2 === 0) return trimmed;
  if (trimmed.endsWith("**")) return trimmed.slice(0, -2);
  return `${trimmed}**`;
}
