const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export const redactForLog = (text: string): string => text.replace(UUID, "<id>");

export function errorChainForLog(error: Error): string {
  const lines: string[] = [];
  let current: Error | undefined = error;
  while (current && lines.length < 8) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause instanceof Error ? current.cause : undefined;
  }
  return redactForLog(lines.join("\n"));
}
