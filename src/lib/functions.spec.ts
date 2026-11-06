import {afterEach, describe, expect, it, vi} from "vitest";
import {update} from "./functions";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function timeOutAfter(fetch: (init: RequestInit) => Promise<unknown>) {
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) => fetch(init));
  return {
    timeout,
    fire: () => controller.abort(new DOMException("x", "TimeoutError")),
  };
}

function rejectOnAbort(init: RequestInit): Promise<never> {
  return new Promise((_, reject) => {
    if (init.signal?.aborted) reject(init.signal.reason);
    init.signal?.addEventListener("abort", () => {
      reject(init.signal?.reason);
    });
  });
}

describe("update", () => {
  it("gives up after 30s with a readable error", async () => {
    const {timeout, fire} = timeOutAfter(rejectOnAbort);

    const result = update("alice", "abc");
    fire();

    await expect(result).rejects.toThrow("didn't respond");
    expect(timeout).toHaveBeenCalledWith(30_000);
  });

  it("gives a readable error when an error body stalls", async () => {
    const {fire} = timeOutAfter(async (init) => ({
      ok: false,
      text: () => rejectOnAbort(init),
    }));

    const result = update("alice", "abc");
    await new Promise((r) => setTimeout(r)); // let text() start reading
    fire();

    await expect(result).rejects.toThrow("didn't respond");
  });

  it("passes other network errors through", async () => {
    const error = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", () => Promise.reject(error));

    await expect(update("alice", "abc")).rejects.toBe(error);
  });

  it("throws the server's error text", async () => {
    vi.stubGlobal("fetch", async () =>
      new Response("bad token", {status: 401}));

    await expect(update("alice", "abc")).rejects.toThrow("bad token");
  });
});
