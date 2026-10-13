const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// -----
// Query errors echo their SQL params, which can
// hold an anonymous id; ids never reach a log.
// -----
export const redactForLog = (text: string): string =>
  text.replace(/\nparams: .*/g, "\nparams: <redacted>").replace(UUID, "<id>");

// -----
// An error and every cause under it as one
// redacted string, safe to hand to console.
// -----
export function errorChainForLog(error: Error): string {
  const lines: string[] = [];
  let current: Error | undefined = error;
  while (current && lines.length < 8) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause instanceof Error ? current.cause : undefined;
  }
  return redactForLog(lines.join("\n"));
}
