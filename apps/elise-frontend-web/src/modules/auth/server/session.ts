import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { MeSchema } from "@repo/contracts/elise";
import { EngineError, engineJson, type EngineAuth } from "#/lib/engine-client";
import type { SessionUser } from "../types";

const SESSION_COOKIE = "elise_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function saveSessionToken(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionToken() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export type ServerSession = { token: string; accountId: string; user: SessionUser };

// -----
// Asks the engine who the cookie's token belongs to. A rejected token
// clears the cookie. The first account is the one scans run under.
// -----
export async function findSession(): Promise<ServerSession | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  try {
    const me = await engineJson(MeSchema, "/me", {}, { token });
    const account = me.accounts[0];
    if (!account) return null;
    return {
      token,
      accountId: account.id,
      user: { id: me.user.id, email: me.user.email, name: me.user.name, accountName: account.name, role: account.role },
    };
  } catch (error) {
    if (error instanceof EngineError && error.status === 401) clearSessionToken();
    else throw error;
    return null;
  }
}

export async function requireSession() {
  const session = await findSession();
  if (!session) throw new Error("Not signed in");
  return session;
}

// -----
// The token and account every engine call sends. Take the account from
// the session, never from input.
// -----
export async function engineAuth(): Promise<EngineAuth> {
  const { token, accountId } = await requireSession();
  return { token, accountId };
}
