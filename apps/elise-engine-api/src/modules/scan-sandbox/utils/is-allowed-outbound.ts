import {
  SCAN_SANDBOX_ANTHROPIC_HOST,
  SCAN_SANDBOX_ANTHROPIC_ROUTES,
  SCAN_SANDBOX_GIT_READ_PATH,
  SCAN_SANDBOX_GITHUB_HOST,
} from "#/modules/scan-sandbox/constants";
import type { OutboundTarget } from "#/modules/scan-sandbox/types";

export function allowedOutboundTarget(url: URL, method: string): OutboundTarget {
  if (url.protocol !== "https:") return null;
  if (url.hostname === SCAN_SANDBOX_ANTHROPIC_HOST) {
    return SCAN_SANDBOX_ANTHROPIC_ROUTES.includes(`${method} ${url.pathname}`) ? "anthropic" : null;
  }
  if (url.hostname === SCAN_SANDBOX_GITHUB_HOST && SCAN_SANDBOX_GIT_READ_PATH.test(url.pathname)) {
    const isRefs = method === "GET" && url.pathname.endsWith("/info/refs") && url.searchParams.get("service") === "git-upload-pack";
    const isPack = method === "POST" && url.pathname.endsWith("/git-upload-pack");
    return isRefs || isPack ? "github" : null;
  }
  return null;
}
