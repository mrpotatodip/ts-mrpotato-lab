export const scanFileHeaders = (file: string, contentType: string): Headers =>
  new Headers({
    "content-type": contentType,
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox",
    "content-disposition": `attachment; filename="${file}"`,
    "cache-control": "private, no-store",
  });
