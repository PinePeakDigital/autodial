import * as Sentry from "@sentry/cloudflare";
import {User} from "../../src/lib";
import {seal, unseal} from "./tokenCrypto";

// User tokens live in KV: key = beeminder user, sealed token in metadata so a
// single list() returns every user + token (no N+1) — see getUsers. Tokens are
// encrypted (`enc`); a bare `token` is a record from before encryption, which
// the cron re-stores sealed via encryptPlaintext.
//
// disabledAt/disabledReason mark a user whose credential is permanently dead
// (401/404 from Beeminder). updateUser replaces this metadata wholesale, so
// re-authorizing (submitting a new token) clears the marker automatically.
type TokenMeta = {
  enc?: string;
  token?: string;
  disabledAt?: number;
  disabledReason?: string;
};

const readToken = async (key: CryptoKey, meta: TokenMeta): Promise<string> =>
  meta.enc ? unseal(key, meta.enc) : meta.token ?? "";

export async function getUsers(
    kv: KVNamespace,
    key: CryptoKey,
): Promise<User[]> {
  const users: User[] = [];
  let cursor: string | undefined;

  do {
    const res = await kv.list<TokenMeta>({cursor});
    for (const {name, metadata} of res.keys) {
      let token = "";
      let unreadable = false;
      try {
        token = metadata ? await readToken(key, metadata) : "";
      } catch (e) {
        // One unreadable record must not stop the run for everyone else; the
        // cron skips it as missing auth. Every record failing means TOKEN_KEY
        // is wrong.
        Sentry.captureException(e, {extra: {beeminder_user: name}});
        unreadable = true;
      }
      users.push({
        beeminder_user: name,
        beeminder_token: token,
        disabledAt: metadata?.disabledAt,
        ...(metadata?.token !== undefined && !metadata.enc &&
          {plaintext: true}),
        ...(unreadable && {unreadable: true}),
      });
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);

  return users;
}

export async function updateUser(
    kv: KVNamespace,
    key: CryptoKey,
    user: string,
    token: string,
): Promise<void> {
  await kv.put(user, "", {metadata: {enc: await seal(key, token)}});
}

export async function removeUser(
    kv: KVNamespace,
    user: string,
): Promise<void> {
  await kv.delete(user);
}

// Re-stores a pre-encryption record sealed, keeping any disabled marker.
// Returns false when the record moved on since the cron read it (re-authorized,
// removed, or already sealed), for the same reasons disableUser re-reads.
export async function encryptPlaintext(
    kv: KVNamespace,
    key: CryptoKey,
    user: string,
    token: string,
): Promise<boolean> {
  // Seal first so the re-read below sits right next to the write.
  const enc = await seal(key, token);
  const {metadata} = await kv.getWithMetadata<TokenMeta>(user);
  if (!metadata || metadata.enc || metadata.token !== token) return false;

  const {disabledAt, disabledReason} = metadata;
  await kv.put(user, "", {metadata: {enc, disabledAt, disabledReason}});
  return true;
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
    key: CryptoKey,
    user: string,
    token: string,
    reason: string,
): Promise<boolean> {
  const current = await kv.getWithMetadata<TokenMeta>(user);

  if (current.value === null && current.metadata === null) return false;
  if (current.metadata && await readToken(key, current.metadata) !== token) {
    return false;
  }

  await kv.put(user, "", {
    metadata: {
      enc: await seal(key, token),
      disabledAt: Date.now(),
      disabledReason: reason,
    },
  });
  return true;
}
