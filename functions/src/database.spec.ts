import {getUsers, updateUser, removeUser, disableUser} from "./database";

/* eslint-disable camelcase */

type Page = {
  keys: {
    name: string;
    metadata?: { token: string; disabledAt?: number };
  }[];
  list_complete: boolean;
  cursor?: string;
};

type StoredMeta = {
  token: string;
  disabledAt?: number;
  disabledReason?: string;
};

// `stored` is what getWithMetadata sees; disableUser re-reads before writing so
// the races it guards against can be expressed as "KV already moved on".
function makeKv(pages: Page[], stored: StoredMeta | null = {token: "tok"}) {
  let i = 0;
  return {
    list: jest.fn(async () => pages[i++]),
    put: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    getWithMetadata: jest.fn(async () => ({
      value: stored === null ? null : "",
      metadata: stored,
    })),
  } as unknown as KVNamespace;
}

describe("database (KV)", () => {
  describe("getUsers", () => {
    it("reads a single page, token from metadata", async () => {
      const kv = makeKv([
        {keys: [{name: "alice", metadata: {token: "a"}}], list_complete: true},
      ]);

      await expect(getUsers(kv)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: "a"},
      ]);
    });

    it("follows the cursor across pages", async () => {
      const kv = makeKv([
        {
          keys: [{name: "alice", metadata: {token: "a"}}],
          list_complete: false,
          cursor: "c1",
        },
        {keys: [{name: "bob", metadata: {token: "b"}}], list_complete: true},
      ]);

      const users = await getUsers(kv);

      expect(users).toEqual([
        {beeminder_user: "alice", beeminder_token: "a"},
        {beeminder_user: "bob", beeminder_token: "b"},
      ]);
      expect((kv.list as jest.Mock)).toHaveBeenCalledTimes(2);
    });

    it("defaults a missing token to empty string", async () => {
      const kv = makeKv([{keys: [{name: "alice"}], list_complete: true}]);

      await expect(getUsers(kv)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: ""},
      ]);
    });

    it("surfaces disabledAt from metadata", async () => {
      const kv = makeKv([
        {
          keys: [{name: "alice", metadata: {token: "a", disabledAt: 123}}],
          list_complete: true,
        },
      ]);

      await expect(getUsers(kv)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: "a", disabledAt: 123},
      ]);
    });
  });

  describe("updateUser", () => {
    it("stores the token in metadata", async () => {
      const kv = makeKv([]);
      await updateUser(kv, "alice", "tok");
      expect(kv.put).toHaveBeenCalledWith(
          "alice",
          "",
          {metadata: {token: "tok"}}
      );
    });

    it("clears a disabledAt marker (metadata replaced wholesale)", async () => {
      const kv = makeKv([]);
      await updateUser(kv, "alice", "new_tok");
      expect(kv.put).toHaveBeenCalledWith(
          "alice",
          "",
          {metadata: {token: "new_tok"}}
      );
      // No disabledAt/disabledReason in the written metadata: a prior
      // disableUser() call is fully overwritten, not merged.
      const [, , opts] = (kv.put as jest.Mock).mock.calls[0];
      expect(opts.metadata).not.toHaveProperty("disabledAt");
      expect(opts.metadata).not.toHaveProperty("disabledReason");
    });
  });

  describe("removeUser", () => {
    it("deletes the key", async () => {
      const kv = makeKv([]);
      await removeUser(kv, "alice");
      expect(kv.delete).toHaveBeenCalledWith("alice");
    });
  });

  describe("disableUser", () => {
    it("writes disabledAt and disabledReason alongside the token", async () => {
      const kv = makeKv([]);
      const before = Date.now();
      await disableUser(kv, "alice", "tok", "401 unauthorized");
      const [key, value, opts] = (kv.put as jest.Mock).mock.calls[0];

      expect(key).toBe("alice");
      expect(value).toBe("");
      expect(opts.metadata.token).toBe("tok");
      expect(opts.metadata.disabledReason).toBe("401 unauthorized");
      expect(opts.metadata.disabledAt).toBeGreaterThanOrEqual(before);
    });

    it("skips the write when the token changed under it", async () => {
      const kv = makeKv([], {token: "fresh-tok"});

      await expect(disableUser(kv, "alice", "dead-tok", "401")).resolves.toBe(
          false
      );
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("skips the write when the record is gone", async () => {
      const kv = makeKv([], null);

      await expect(disableUser(kv, "alice", "dead-tok", "401")).resolves.toBe(
          false
      );
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("writes when the stored token still matches", async () => {
      const kv = makeKv([], {token: "dead-tok"});

      await expect(disableUser(kv, "alice", "dead-tok", "401")).resolves.toBe(
          true
      );
      expect(kv.put).toHaveBeenCalled();
    });
  });
});
