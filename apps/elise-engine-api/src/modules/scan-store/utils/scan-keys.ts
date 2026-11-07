export const scanPrefix = (accountId: string): string => `accounts/${accountId}/scans/`;

export const scanKey = (accountId: string, scanId: string, name: string): string =>
  `${scanPrefix(accountId)}${scanId}/${name}`;
