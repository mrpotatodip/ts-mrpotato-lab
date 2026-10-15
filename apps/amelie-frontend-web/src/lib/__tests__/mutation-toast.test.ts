import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMutationToastCache, toastMutationError, toastMutationSuccess, type ActionToaster } from "../mutation-toast";

function toaster(): ActionToaster {
  return {
    success: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("toastMutationSuccess", () => {
  it("toasts Saved when no message is set", () => {
    const notify = toaster();
    toastMutationSuccess(undefined, notify);
    expect(notify.success).toHaveBeenCalledWith("Saved");
  });

  it("toasts the given success copy", () => {
    const notify = toaster();
    toastMutationSuccess({ successMessage: "Hours saved" }, notify);
    expect(notify.success).toHaveBeenCalledWith("Hours saved");
  });

  it("skips the success toast when asked", () => {
    const notify = toaster();
    toastMutationSuccess({ successMessage: false }, notify);
    expect(notify.success).not.toHaveBeenCalled();
  });
});

describe("toastMutationError", () => {
  it("toasts the Error message", () => {
    const notify = toaster();
    toastMutationError(new Error("Failed to save the item"), undefined, notify);
    expect(notify.error).toHaveBeenCalledWith("Failed to save the item");
  });

  it("skips the error toast when asked", () => {
    const notify = toaster();
    toastMutationError(new Error("hidden"), { errorMessage: false }, notify);
    expect(notify.error).not.toHaveBeenCalled();
  });
});

describe("createMutationToastCache", () => {
  it("toasts from mutation meta after a successful mutate", async () => {
    const notify = toaster();
    const queryClient = new QueryClient({
      mutationCache: createMutationToastCache(notify),
      defaultOptions: { mutations: { retry: false } },
    });
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => "ok",
      meta: { successMessage: "FAQ added" },
    });

    await mutation.execute();

    expect(notify.success).toHaveBeenCalledWith("FAQ added");
  });

  it("toasts the thrown message after a failed mutate", async () => {
    const notify = toaster();
    const queryClient = new QueryClient({
      mutationCache: createMutationToastCache(notify),
      defaultOptions: { mutations: { retry: false } },
    });
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        throw new Error("Failed to delete the FAQ");
      },
    });

    await expect(mutation.execute()).rejects.toThrow("Failed to delete the FAQ");
    expect(notify.error).toHaveBeenCalledWith("Failed to delete the FAQ");
  });
});
