export const scanPrefix = (accountId: string): string => `accounts/${accountId}/scans/`;

export const scanKey = (accountId: string, scanId: string, name: string): string =>
  `${scanPrefix(accountId)}${scanId}/${name}`;

export const scanFileContentType = (name: string): string => (name.endsWith(".json") ? "application/json" : "text/markdown; charset=utf-8");
