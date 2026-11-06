import {afterEach, describe, expect, it, vi} from "vitest";
import {update} from "./functions";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("update", () => {
  it("gives up after 30s with a readable error", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout")
        .mockReturnValue(controller.signal);
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) =>
      new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason);
        });
      }));

    const result = update("alice", "abc");
    controller.abort(new DOMException("timed out", "TimeoutError"));

    await expect(result).rejects.toThrow("didn't respond");
    expect(timeout).toHaveBeenCalledWith(30_000);
  });
});
