export const scanFileHeaders = (file: string): Headers =>
  new Headers({
    "content-type": file.endsWith(".json") ? "application/json" : "text/markdown; charset=utf-8",
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox",
    "content-disposition": `attachment; filename="${file}"`,
    "cache-control": "private, no-store",
  });
