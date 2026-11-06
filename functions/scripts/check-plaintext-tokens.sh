#!/usr/bin/env bash
# Counts USERS records that still hold a plaintext access token (from before
# encryption; the cron seals them on its next run). Prints counts only: raw
# `wrangler kv key list` output carries every user's token, so it is piped
# straight into jq and never printed, and jq's own errors (which can quote the
# input) are discarded. Exit 0 = none left, 1 = some left, 2 = check failed
# (including an empty listing, which means the wrong namespace or account).
#
#   ./scripts/check-plaintext-tokens.sh
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

FILTER='"total=\(length) plaintext=\([.[] | select(.metadata.token != null)] | length)"'

if ! out=$(npx wrangler kv key list --binding USERS --remote | jq -r "$FILTER" 2>/dev/null) \
  || [[ ! $out =~ ^total=[0-9]+\ plaintext=[0-9]+$ ]] || [[ $out == total=0\ * ]]; then
  echo "check failed (KV output suppressed)" >&2
  exit 2
fi

echo "$out"
[[ $out == *" plaintext=0" ]]
