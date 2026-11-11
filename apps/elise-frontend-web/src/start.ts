import { createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";

// -----
// Headers for every response the dashboard sends.
// frame-ancestors stops other sites from framing a
// page (clickjacking). There is no full CSP yet: the
// app's own inline scripts need a nonce first.
// -----
const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "content-security-policy": "frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

const securityHeaders = createMiddleware().server(({ next }) => {
  setResponseHeaders(new Headers(SECURITY_HEADERS));
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}));
