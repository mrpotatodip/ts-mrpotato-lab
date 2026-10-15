import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "../../api";
import type { SessionUser } from "../../schemas/session-schemas";
import { loadSession } from "../use-session";

const user: SessionUser = {
  id: "u1",
  email: "ada@example.com",
  name: "Ada",
  emailVerified: true,
};

function client() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSession", () => {
  it("calls getSession on a cold cache", async () => {
    const spy = vi.spyOn(api, "getSession").mockResolvedValue(user);

    await expect(loadSession(client())).resolves.toEqual(user);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("reuses a fresh cached user on the next navigation", async () => {
    const queryClient = client();
    const spy = vi.spyOn(api, "getSession").mockResolvedValue(user);

    await expect(loadSession(queryClient)).resolves.toEqual(user);
    await expect(loadSession(queryClient)).resolves.toEqual(user);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
