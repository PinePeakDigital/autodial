#!/usr/bin/env bash
#
# One-time migration: Firestore `users` collection -> Cloudflare KV (USERS).
#
# Each user becomes: key = beeminder_user, value = "" (ignored),
# metadata = { token: beeminder_token } — the shape getUsers() reads, since
# KV list() returns metadata but not values.
#
# Prereqs:
#   - gcloud authed with read access to the autodial-dfeb8 Firestore
#   - wrangler authed (CLOUDFLARE_API_TOKEN or `wrangler login`) with the
#     USERS namespace id set in wrangler.toml
#
# Run at cutover: this is a point-in-time snapshot. Any user who authorizes on
# the old system after this runs but before you flip is missed.
#
set -euo pipefail

PROJECT="${FIRESTORE_PROJECT:-autodial-dfeb8}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/users-kv.json"

# The export file holds live tokens — always remove it, even on failure.
trap 'rm -f "$OUT"' EXIT

echo "Exporting Firestore users from $PROJECT ..."
python3 - "$PROJECT" "$OUT" <<'PY'
import json, sys, subprocess, urllib.request, urllib.parse

project, out = sys.argv[1], sys.argv[2]
token = subprocess.check_output(
    ["gcloud", "auth", "print-access-token"], text=True).strip()

base = (f"https://firestore.googleapis.com/v1/projects/{project}"
        "/databases/(default)/documents/users")
users, page = [], None
while True:
    query = {"pageSize": "300"}
    if page:
        query["pageToken"] = page
    req = urllib.request.Request(
        base + "?" + urllib.parse.urlencode(query),
        headers={"Authorization": f"Bearer {token}"},
    )
    data = json.load(urllib.request.urlopen(req))
    for doc in data.get("documents", []):
        fields = doc.get("fields", {})
        user = fields.get("beeminder_user", {}).get("stringValue")
        tok = fields.get("beeminder_token", {}).get("stringValue")
        if user and tok:
            users.append({"key": user, "value": "", "metadata": {"token": tok}})
    page = data.get("nextPageToken")
    if not page:
        break

json.dump(users, open(out, "w"))
print(f"  wrote {len(users)} users to {out}")
PY

echo "Loading into KV (binding USERS) ..."
(cd "$HERE/.." && npx wrangler kv bulk put "$OUT" --binding USERS)

echo "Done. Verify with:"
echo "  (cd functions && npx wrangler kv key list --binding USERS \\"
echo "     | python3 -c 'import json,sys;print(len(json.load(sys.stdin)),\"keys\")')"
