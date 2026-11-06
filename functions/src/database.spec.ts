import * as Sentry from "@sentry/cloudflare";
import {
  getUsers, updateUser, removeUser, disableUser, encryptPlaintext,
} from "./database";
import {importTokenKey, seal, unseal} from "./tokenCrypto";

jest.mock("@sentry/cloudflare");

type Meta = {
  enc?: string;
  token?: string;
  disabledAt?: number;
  disabledReason?: string;
};

type Page = {
  keys: {name: string; metadata?: Meta}[];
  list_complete: boolean;
  cursor?: string;
};

let key: CryptoKey;
beforeAll(async () => {
  key = await importTokenKey("A".repeat(43) + "=");
});

const sealed = async (token: string, extra: Meta = {}): Promise<Meta> =>
  ({enc: await seal(key, token), ...extra});

// `stored` is what getWithMetadata sees; disableUser and encryptPlaintext
// re-read before writing so the races they guard against can be expressed as
// "KV already moved on".
function makeKv(pages: Page[], stored: Meta | null = null) {
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

const written = (kv: KVNamespace): Meta =>
  (kv.put as jest.Mock).mock.calls[0][2].metadata;

describe("database (KV)", () => {
  describe("getUsers", () => {
    it("reads a single page, unsealing the token", async () => {
      const kv = makeKv([
        {
          keys: [{name: "alice", metadata: await sealed("a")}],
          list_complete: true,
        },
      ]);

      await expect(getUsers(kv, key)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: "a"},
      ]);
    });

    it("follows the cursor across pages", async () => {
      const kv = makeKv([
        {
          keys: [{name: "alice", metadata: await sealed("a")}],
          list_complete: false,
          cursor: "c1",
        },
        {
          keys: [{name: "bob", metadata: await sealed("b")}],
          list_complete: true,
        },
      ]);

      const users = await getUsers(kv, key);

      expect(users).toEqual([
        {beeminder_user: "alice", beeminder_token: "a"},
        {beeminder_user: "bob", beeminder_token: "b"},
      ]);
      expect((kv.list as jest.Mock)).toHaveBeenCalledTimes(2);
    });

    it("defaults a missing token to empty string", async () => {
      const kv = makeKv([{keys: [{name: "alice"}], list_complete: true}]);

      await expect(getUsers(kv, key)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: ""},
      ]);
    });

    it("surfaces disabledAt from metadata", async () => {
      const kv = makeKv([
        {
          keys: [
            {name: "alice", metadata: await sealed("a", {disabledAt: 123})},
          ],
          list_complete: true,
        },
      ]);

      await expect(getUsers(kv, key)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: "a", disabledAt: 123},
      ]);
    });

    it("flags a pre-encryption plaintext record", async () => {
      const kv = makeKv([
        {keys: [{name: "alice", metadata: {token: "a"}}], list_complete: true},
      ]);

      await expect(getUsers(kv, key)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: "a", plaintext: true},
      ]);
    });

    it("skips an unreadable record without failing the rest", async () => {
      const kv = makeKv([
        {
          keys: [
            {name: "alice", metadata: {enc: btoa("garbage-garbage-garbage")}},
            {name: "bob", metadata: await sealed("b")},
          ],
          list_complete: true,
        },
      ]);

      await expect(getUsers(kv, key)).resolves.toEqual([
        {beeminder_user: "alice", beeminder_token: "", unreadable: true},
        {beeminder_user: "bob", beeminder_token: "b"},
      ]);
      expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.anything(), {extra: {beeminder_user: "alice"}},
      );
    });
  });

  describe("updateUser", () => {
    it("stores the token sealed, never in plaintext", async () => {
      const kv = makeKv([]);
      await updateUser(kv, key, "alice", "tok");

      const meta = written(kv);
      expect(meta).not.toHaveProperty("token");
      expect(JSON.stringify(meta)).not.toContain("tok\"");
      await expect(unseal(key, meta.enc as string)).resolves.toBe("tok");
    });

    it("clears a disabledAt marker (metadata replaced wholesale)", async () => {
      const kv = makeKv([]);
      await updateUser(kv, key, "alice", "new_tok");
      expect(Object.keys(written(kv))).toEqual(["enc"]);
    });
  });

  describe("removeUser", () => {
    it("deletes the key", async () => {
      const kv = makeKv([]);
      await removeUser(kv, "alice");
      expect(kv.delete).toHaveBeenCalledWith("alice");
    });
  });

  describe("encryptPlaintext", () => {
    it("re-stores the token sealed, keeping the disabled marker", async () => {
      const kv = makeKv(
          [], {token: "tok", disabledAt: 5, disabledReason: "401"},
      );

      await expect(
          encryptPlaintext(kv, key, "alice", "tok"),
      ).resolves.toBe(true);

      const meta = written(kv);
      expect(meta).not.toHaveProperty("token");
      expect(meta).toMatchObject({disabledAt: 5, disabledReason: "401"});
      await expect(unseal(key, meta.enc as string)).resolves.toBe("tok");
    });

    it("skips a record already sealed by a re-authorization", async () => {
      const kv = makeKv([], await sealed("fresh"));
      await expect(encryptPlaintext(kv, key, "alice", "tok")).resolves.toBe(
          false,
      );
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("skips a record whose plaintext token changed", async () => {
      const kv = makeKv([], {token: "other"});
      await expect(encryptPlaintext(kv, key, "alice", "tok")).resolves.toBe(
          false,
      );
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("skips a removed record", async () => {
      const kv = makeKv([], null);
      await expect(encryptPlaintext(kv, key, "alice", "tok")).resolves.toBe(
          false,
      );
      expect(kv.put).not.toHaveBeenCalled();
    });
  });

  describe("disableUser", () => {
    it("writes the disabled marker beside the sealed token", async () => {
      const kv = makeKv([], await sealed("tok"));
      const before = Date.now();
      await disableUser(kv, key, "alice", "tok", "401 unauthorized");
      const [k, value] = (kv.put as jest.Mock).mock.calls[0];
      const meta = written(kv);

      expect(k).toBe("alice");
      expect(value).toBe("");
      expect(meta).not.toHaveProperty("token");
      await expect(unseal(key, meta.enc as string)).resolves.toBe("tok");
      expect(meta.disabledReason).toBe("401 unauthorized");
      expect(meta.disabledAt).toBeGreaterThanOrEqual(before);
    });

    it("skips the write when the token changed under it", async () => {
      const kv = makeKv([], await sealed("fresh-tok"));

      await expect(
          disableUser(kv, key, "alice", "dead-tok", "401"),
      ).resolves.toBe(false);
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("skips the write when the record is gone", async () => {
      const kv = makeKv([], null);

      await expect(
          disableUser(kv, key, "alice", "dead-tok", "401"),
      ).resolves.toBe(false);
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("writes when a plaintext record still holds the token", async () => {
      const kv = makeKv([], {token: "dead-tok"});

      await expect(
          disableUser(kv, key, "alice", "dead-tok", "401"),
      ).resolves.toBe(true);
      expect(written(kv)).not.toHaveProperty("token");
    });
  });
});
