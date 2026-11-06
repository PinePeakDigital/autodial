# Encrypt access tokens at rest under a single Worker-secret key

Autodialer must store every user's Beeminder access token so the daily cron can dial their goals, and until 2026-11 they sat in plaintext KV metadata, where one `kv.list()` (or any Cloudflare credential with KV access on the account) returns all of them. After a token incident, access tokens are encrypted with AES-GCM under one key held as a Worker secret, which the Cloudflare API cannot read back, so a KV dump alone is useless.

## Considered Options

- **Narrower Cloudflare API tokens only.** Rejected as the main fix: KV permissions are account-wide, not per namespace, so scoping cannot exclude a credential that legitimately touches KV. The deploy token is narrowed anyway, to limit what an autodialer leak reaches elsewhere on the shared account.
- **Separate Cloudflare account.** Rejected for now: real isolation from TaskRatchet, but a migration, and the suspected path in the incident was a credential leak, not a hostile deploy.

## Consequences

- Encryption does not protect against a deploy. Anything that can deploy the Worker can ship code that decrypts and exfiltrates every access token, so deploy access is the real trust boundary. That is why the Worker's runtime dependencies are kept to a minimum.
- One key, no key ID, no rotation support. If the key leaks, the response is to revoke the access tokens, so rotation would add little. Add it when there is a reason to rotate.
- Losing the Worker secret means every user must re-authorize.
- Plaintext entries from before the change are encrypted on the fly by the cron, and a one-off check confirms none remain.
