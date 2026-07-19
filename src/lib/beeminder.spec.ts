import {getGoals, getUser, updateGoal} from "./beeminder";

function mockFetch(res: Record<string, unknown>) {
  (global as unknown as { fetch: jest.Mock }).fetch = jest
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
  it("getGoals returns parsed data on success", async () => {
    mockFetch({json: async () => [{slug: "g"}]});
    await expect(getGoals("u", "t")).resolves.toEqual([{slug: "g"}]);
  });

  it("getGoals throws when body carries errors", async () => {
    mockFetch({json: async () => ({errors: {message: "bad"}})});
    await expect(getGoals("u", "t")).rejects.toThrow("bad");
  });

  // axios threw on non-2xx automatically; fetch does not, so getUser must
  // check response.ok itself. These guard that behavior.
  it("getUser throws on a non-2xx response", async () => {
    mockFetch({ok: false, status: 401, statusText: "Unauthorized"});
    await expect(getUser("u", "t")).rejects.toThrow(/401/);
  });

  it("getUser throws when a 200 body carries errors", async () => {
    mockFetch({json: async () => ({errors: {message: "nope"}})});
    await expect(getUser("u", "t")).rejects.toThrow("nope");
  });

  it("getUser resolves on success", async () => {
    mockFetch({json: async () => ({id: 1})});
    await expect(getUser("u", "t")).resolves.toEqual({id: 1});
  });

  it("updateGoal PUTs and throws on a non-2xx response", async () => {
    mockFetch({ok: false, status: 500, statusText: "Server Error"});
    await expect(
        updateGoal("u", "t", "g", {roadall: []})
    ).rejects.toThrow(/500/);

    const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
    expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/goals/g.json?access_token=t"),
        expect.objectContaining({method: "PUT"})
    );
  });
});
