# autodial

Beeminder autodialer. A single Cloudflare Worker serves the React SPA (as
static assets), the user API, and the dialing cron, backed by Workers KV.

## Local Development

- Copy `.env.example` to `.env` and set variables
- `npm start` — runs the frontend at <http://localhost:3000/>
- `cd functions && npm run dev` — runs the Worker at <http://localhost:8787/>

### Creating your Beeminder test client

- Go to your [account settings](https://www.beeminder.com/settings/account)
- At the bottom of the page, click "Register a new app"
- Name it something like `bm_autodial_dev`
- Use `http://localhost:3000` as the redirect and post-deauthorize callback urls
- Copy the client ID into your `.env` file

## Worker (functions/)

The Worker serves the built SPA from `../build` as static assets, exposes
`POST /update` and `POST /remove` (called by the frontend), and runs a
`scheduled()` cron handler that dials every stored user's goals. In production
the SPA and API share an origin, so the frontend calls `/update` relatively
(no CORS); local dev is cross-origin (`:3000` → `:8787`), which the Worker's
CORS headers cover.

Run tests:

```bash
cd functions/
npm run test
```

Run locally (set `DRY_RUN=true` in `.dev.vars` to avoid writing to Beeminder):

```bash
npm run dev
```

### First-time Cloudflare setup

```bash
npm run build                            # build the SPA into ./build first
cd functions/
npx wrangler kv namespace create USERS   # paste the id into wrangler.toml
npx wrangler deploy                       # deploys the Worker + SPA assets + cron
```

### Migrating existing users (Firestore → KV)

The cron only dials users present in KV, so before cutover copy the existing
Firestore `users` collection across. Export each `{beeminder_user,
beeminder_token}` doc, then bulk-load them with the token in KV metadata (the
shape `getUsers` reads):

```bash
# users.json: [{ "key": "<beeminder_user>", "value": "",
#               "metadata": { "token": "<beeminder_token>" } }, ...]
npx wrangler kv bulk put --binding USERS users.json
```

Run this before decommissioning the old Firebase cron, or existing users stop
being dialed until they re-authorize.

## Deployment

Pushes to `master` deploy via GitHub Actions (`.github/workflows/deploy.yaml`):
one job builds the SPA and runs `wrangler deploy`, which uploads the Worker,
the static assets, and the cron trigger together. Requires `CLOUDFLARE_API_TOKEN`
and `CLOUDFLARE_ACCOUNT_ID` repo secrets, plus the `REACT_APP_APP_URL` and
`REACT_APP_BM_CLIENT_ID` build secrets (`REACT_APP_API_URL` is left empty in
prod — same origin). The cron cadence is set in `functions/wrangler.toml`.
