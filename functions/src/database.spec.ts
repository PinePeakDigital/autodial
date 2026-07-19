import {getUsers, updateUser, removeUser} from "./database";

/* eslint-disable camelcase */

type Page = {
  keys: { name: string; metadata?: { token: string } }[];
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
  it("getUsers reads a single page, token from metadata", async () => {
    const kv = makeKv([
      {keys: [{name: "alice", metadata: {token: "a"}}], list_complete: true},
    ]);

    await expect(getUsers(kv)).resolves.toEqual([
      {beeminder_user: "alice", beeminder_token: "a"},
    ]);
  });

  it("getUsers follows the cursor across pages", async () => {
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

  it("getUsers defaults a missing token to empty string", async () => {
    const kv = makeKv([{keys: [{name: "alice"}], list_complete: true}]);

    await expect(getUsers(kv)).resolves.toEqual([
      {beeminder_user: "alice", beeminder_token: ""},
    ]);
  });

  it("updateUser stores the token in metadata", async () => {
    const kv = makeKv([]);
    await updateUser(kv, "alice", "tok");
    expect(kv.put).toHaveBeenCalledWith(
        "alice",
        "",
        {metadata: {token: "tok"}}
    );
  });

  it("removeUser deletes the key", async () => {
    const kv = makeKv([]);
    await removeUser(kv, "alice");
    expect(kv.delete).toHaveBeenCalledWith("alice");
  });
});
