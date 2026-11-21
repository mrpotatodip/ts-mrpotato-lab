export const dashboardLinkOf = (dashboardUrl: string, path: string): string => `${dashboardUrl.replace(/\/+$/, "")}${path}`;
