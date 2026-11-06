import type {Mock} from "vitest";
import {getGoal, getGoals, getMe, updateGoal} from "./beeminder";
import {BeeminderAuthError} from "./beeminderAuthError";

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
  describe("getGoals", () => {
    it("returns parsed data on success", async () => {
      mockFetch({json: async () => [{slug: "g"}]});
      await expect(getGoals("u", "t")).resolves.toEqual([{slug: "g"}]);
    });

    it("throws when the body carries errors", async () => {
      mockFetch({json: async () => ({errors: {message: "bad"}})});
      await expect(getGoals("u", "t")).rejects.toThrow("bad");
    });

    it("throws on a non-2xx response (before parsing)", async () => {
      mockFetch({ok: false, status: 500, statusText: "Server Error"});
      await expect(getGoals("u", "t")).rejects.toThrow(/500/);
    });

    it("throws a generic Error (not BeeminderAuthError) on 500", async () => {
      mockFetch({ok: false, status: 500, statusText: "Server Error"});
      await expect(getGoals("u", "t")).rejects.not.toBeInstanceOf(
          BeeminderAuthError
      );
    });

    it("throws BeeminderAuthError on 401", async () => {
      mockFetch({ok: false, status: 401, statusText: "Unauthorized"});
      const err = await getGoals("u", "t").catch((e) => e);
      expect(err).toBeInstanceOf(BeeminderAuthError);
      expect(err.status).toBe(401);
    });

    it("throws BeeminderAuthError on 404", async () => {
      mockFetch({ok: false, status: 404, statusText: "Not Found"});
      const err = await getGoals("u", "t").catch((e) => e);
      expect(err).toBeInstanceOf(BeeminderAuthError);
      expect(err.status).toBe(404);
    });
  });

  describe("getGoal", () => {
    it("throws BeeminderAuthError on 401", async () => {
      mockFetch({ok: false, status: 401, statusText: "Unauthorized"});
      const err = await getGoal("u", "t", "g", 0).catch((e) => e);
      expect(err).toBeInstanceOf(BeeminderAuthError);
      expect(err.status).toBe(401);
    });

    it("throws BeeminderAuthError on 404", async () => {
      mockFetch({ok: false, status: 404, statusText: "Not Found"});
      const err = await getGoal("u", "t", "g", 0).catch((e) => e);
      expect(err).toBeInstanceOf(BeeminderAuthError);
      expect(err.status).toBe(404);
    });

    it("throws a generic Error (not BeeminderAuthError) on 500", async () => {
      mockFetch({ok: false, status: 500, statusText: "Server Error"});
      const err = await getGoal("u", "t", "g", 0).catch((e) => e);
      expect(err).not.toBeInstanceOf(BeeminderAuthError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  // axios threw on non-2xx automatically; fetch does not, so getMe must
  // check response.ok itself. These guard that behavior.
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

    it("throws on a non-2xx response", async () => {
      mockFetch({ok: false, status: 401, statusText: "Unauthorized"});
      await expect(getMe("t")).rejects.toThrow(/401/);
    });

    it("throws when a 200 body carries errors", async () => {
      mockFetch({json: async () => ({errors: {message: "nope"}})});
      await expect(getMe("t")).rejects.toThrow("nope");
    });

    it("throws when the body has no username", async () => {
      mockFetch({json: async () => ({id: 1})});
      await expect(getMe("t")).rejects.toThrow(/no username/);
    });
  });

  describe("updateGoal", () => {
    it("PUTs and throws on a non-2xx response", async () => {
      mockFetch({ok: false, status: 500, statusText: "Server Error"});
      await expect(
          updateGoal("u", "t", "g", {roadall: []})
      ).rejects.toThrow(/500/);

      const fetchMock = (global as unknown as { fetch: Mock }).fetch;
      expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/goals/g.json?access_token=t"),
          expect.objectContaining({method: "PUT"})
      );
    });
  });
});
