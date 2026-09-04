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

function makeKv(pages: Page[]) {
  let i = 0;
  return {
    list: jest.fn(async () => pages[i++]),
    put: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
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
  });
});
