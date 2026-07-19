import {User} from "../../src/lib";

// User tokens live in KV: key = beeminder user, token in metadata so a single
// list() returns every user + token (no N+1) — see getUsers.
type TokenMeta = { token: string };

export async function getUsers(kv: KVNamespace): Promise<User[]> {
  const users: User[] = [];
  let cursor: string | undefined;

  do {
    const res = await kv.list<TokenMeta>({cursor});
    for (const key of res.keys) {
      users.push({
        beeminder_user: key.name,
        beeminder_token: key.metadata?.token ?? "",
      });
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);

  return users;
}

export async function updateUser(
    kv: KVNamespace,
    user: string,
    token: string
): Promise<void> {
  await kv.put(user, "", {metadata: {token}});
}

export async function removeUser(
    kv: KVNamespace,
    user: string,
): Promise<void> {
  await kv.delete(user);
}
