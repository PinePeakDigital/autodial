# autodial

Beeminder autodialer. React frontend (Cloudflare Pages) + a Cloudflare Worker
(cron + user API) backed by Workers KV.

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

The Worker exposes `POST /update` and `POST /remove` (called by the frontend)
and a `scheduled()` cron handler that dials every stored user's goals.

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
cd functions/
npx wrangler kv namespace create USERS   # paste the id into wrangler.toml
npx wrangler deploy                       # deploy the Worker
```

## Deployment

Pushes to `master` deploy via GitHub Actions (`.github/workflows/deploy.yaml`):
the Worker via `wrangler deploy` and the frontend to Cloudflare Pages. Requires
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets, plus the
`REACT_APP_*` build secrets. The cron cadence is set in `functions/wrangler.toml`.
