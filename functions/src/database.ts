import {User} from "../../src/lib";

// User tokens live in KV: key = beeminder user, token in metadata so a single
// list() returns every user + token (no N+1) — see getUsers.
//
// disabledAt/disabledReason mark a user whose credential is permanently dead
// (401/404 from Beeminder). updateUser replaces this metadata wholesale, so
// re-authorizing (submitting a new token) clears the marker automatically.
type TokenMeta = {
  token: string;
  disabledAt?: number;
  disabledReason?: string;
};

export async function getUsers(kv: KVNamespace): Promise<User[]> {
  const users: User[] = [];
  let cursor: string | undefined;

  do {
    const res = await kv.list<TokenMeta>({cursor});
    for (const key of res.keys) {
      users.push({
        beeminder_user: key.name,
        beeminder_token: key.metadata?.token ?? "",
        disabledAt: key.metadata?.disabledAt,
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

// Returns false when the write was skipped because the stored record moved on.
//
// The cron passes the token it started the run with, and kv.put replaces
// metadata wholesale. Re-reading first is what stops two races from silently
// destroying state: a user who re-authorized mid-run would otherwise have their
// fresh working token overwritten with the dead one plus a disabled marker --
// undoing the very fix they just made -- and a user removed mid-run would be
// resurrected as a disabled record. In both cases the auth failure is stale, so
// leave the record alone and let the next run judge whatever is there now.
export async function disableUser(
    kv: KVNamespace,
    user: string,
    token: string,
    reason: string,
): Promise<boolean> {
  const current = await kv.getWithMetadata<TokenMeta>(user);

  if (current.value === null && current.metadata === null) return false;
  if (current.metadata && current.metadata.token !== token) return false;

  await kv.put(user, "", {
    metadata: {token, disabledAt: Date.now(), disabledReason: reason},
  });
  return true;
}
