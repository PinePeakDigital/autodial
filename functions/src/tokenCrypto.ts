// Access tokens are sealed with AES-GCM under one key held as the TOKEN_KEY
// Worker secret (32 random bytes, base64). A KV dump alone yields nothing
// usable. See docs/adr/0001-encrypt-access-tokens-at-rest.md.
//
// ponytail: one key, no key ID, no rotation (per the ADR). Add a key-ID prefix
// to the sealed string if rotation is ever needed.

const toBytes = (b64: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const toB64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

// Throws on a missing or malformed key, so the Worker fails closed rather than
// falling back to storing plaintext.
export async function importTokenKey(
    b64: string | undefined,
): Promise<CryptoKey> {
  if (!b64) throw new Error("TOKEN_KEY is not set");
  const raw = toBytes(b64);
  if (raw.length !== 32) throw new Error("TOKEN_KEY must be 32 bytes");
  return crypto.subtle.importKey(
      "raw", raw, "AES-GCM", false, ["encrypt", "decrypt"],
  );
}

// Returns base64(iv || ciphertext+tag).
export async function seal(key: CryptoKey, token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt(
      {name: "AES-GCM", iv}, key, new TextEncoder().encode(token),
  ));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}

export async function unseal(key: CryptoKey, sealed: string): Promise<string> {
  const bytes = toBytes(sealed);
  const pt = await crypto.subtle.decrypt(
      {name: "AES-GCM", iv: bytes.slice(0, 12)}, key, bytes.slice(12),
  );
  return new TextDecoder().decode(pt);
}
