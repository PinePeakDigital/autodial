import type {Mock} from "vitest";
import {getGoal, getGoals, getMe, updateGoal} from "./beeminder";
import {BeeminderError} from "./beeminderError";

function mockFetch(res: Record<string, unknown>) {
  (global as unknown as { fetch: Mock }).fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({}),
        ...res,
      });
}

describe("beeminder client", () => {
  it("addresses goal calls to `me`, never a username", async () => {
    mockFetch({json: async () => []});
    await getGoals("t");
    await getGoal("t", "g", 0);
    await updateGoal("t", "g", {roadall: []});
    const urls = ((global as unknown as { fetch: Mock }).fetch)
        .mock.calls.map((c) => c[0] as string);
    expect(urls.map((u) => new URL(u).pathname)).toEqual([
      "/api/v1/users/me/goals.json",
      "/api/v1/users/me/goals/g.json",
      "/api/v1/users/me/goals/g.json",
    ]);
  });

  // Every call shares one request path, so one table covers all four.
  const calls = {
    getMe: {scope: "account", run: () => getMe("t")},
    getGoals: {scope: "account", run: () => getGoals("t")},
    getGoal: {scope: "goal", run: () => getGoal("t", "g", 0)},
    updateGoal: {scope: "goal", run: () => updateGoal("t", "g", {roadall: []})},
  };

  describe.each(Object.entries(calls))("%s", (_name, {scope, run}) => {
    it.each([
      [401, "credential-rejected"],
      [404, scope === "account" ? "credential-rejected" : "not-found"],
      [403, "other"],
      [500, "other"],
    ])("classifies a %i as %s", async (status, kind) => {
      mockFetch({ok: false, status, statusText: "x"});
      const err = await run().catch((e) => e);
      expect(err).toBeInstanceOf(BeeminderError);
      expect(err).toMatchObject({kind, status});
      expect(err.message).toMatch(String(status));
    });

    it("classifies a 200 whose body carries errors as other", async () => {
      mockFetch({json: async () => ({errors: {message: "bad"}})});
      const err = await run().catch((e) => e);
      expect(err).toMatchObject({kind: "other", message: "bad"});
    });

    it("encodes the token and keeps it out of the error", async () => {
      mockFetch({ok: false, status: 500, statusText: "x"});
      const err = await run().catch((e) => e);
      const url = ((global as unknown as { fetch: Mock }).fetch)
          .mock.calls[0][0] as string;
      expect(url).toMatch(/[?&]access_token=t$/);
      expect(err.message).not.toMatch("access_token");
    });
  });

  it("encodes a token with URL metacharacters", async () => {
    mockFetch({json: async () => []});
    await getGoals("t&x=1");
    const url = ((global as unknown as { fetch: Mock }).fetch)
        .mock.calls[0][0] as string;
    expect(new URL(url).searchParams.get("access_token")).toBe("t&x=1");
    expect(new URL(url).searchParams.get("filter")).toBe("frontburner");
  });

  it("returns parsed data on success", async () => {
    mockFetch({json: async () => [{slug: "g"}]});
    await expect(getGoals("t")).resolves.toEqual([{slug: "g"}]);
  });

  describe("getMe", () => {
    it("asks Beeminder whose token it is, not about a given user", async () => {
      mockFetch({json: async () => ({username: "alice"})});
      await getMe("t&x=1");
      const url = ((global as unknown as { fetch: Mock }).fetch)
          .mock.calls[0][0] as string;
      expect(url).toBe(
          "https://www.beeminder.com/api/v1/users/me.json?access_token=t%26x%3D1",
      );
    });

    it("returns the username Beeminder reports", async () => {
      mockFetch({json: async () => ({username: "alice"})});
      await expect(getMe("t")).resolves.toBe("alice");
    });

    it.each([[{id: 1}], [{username: ""}], [{username: 42}], [null]])(
        "throws when the body has no usable username: %j",
        async (body) => {
          mockFetch({json: async () => body});
          await expect(getMe("t")).rejects.toMatchObject({
            kind: "other", message: expect.stringMatching(/no username/),
          });
        });
  });

  describe("updateGoal", () => {
    it("PUTs the goal", async () => {
      mockFetch({json: async () => ({})});
      await updateGoal("t", "g", {roadall: []});

      const fetchMock = (global as unknown as { fetch: Mock }).fetch;
      expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/goals/g.json?access_token=t"),
          expect.objectContaining({
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({roadall: JSON.stringify([])}),
          })
      );
    });
  });
});
