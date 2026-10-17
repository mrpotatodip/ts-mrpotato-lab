import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";

const AUTH_COOKIE_NAME = "elise_auth_token";
// -----
// Matches better-auth's session expiry.
// -----
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function getAuthCookie(): string | undefined {
  return getCookie(AUTH_COOKIE_NAME);
}

export function setAuthCookie(token: string): void {
  setCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(): void {
  deleteCookie(AUTH_COOKIE_NAME);
}
