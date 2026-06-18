World Cup 2026 Blackjack Stats
==============================

A tiny single-page app that pulls live World Cup match data from
[football-data.org](https://www.football-data.org/), aggregates **goals for**,
**goals against** and **goal difference** for all 48 teams, and gives you a
tab-separated row to paste straight into a spreadsheet.

- Paste your football-data.org API token (kept in your browser's local storage).
- Click **Load stats** to pull and aggregate the tournament so far.
- Toggle **Goals For / Goal Difference** and copy the row.
- The 48 teams are always shown and exported in a fixed order so the row lines
  up column-for-column with the spreadsheet.

The team grid is laid out tightly so you can glance across all 48 teams and
sanity-check the numbers at once. Any team whose name couldn't be matched
against the API is highlighted in red.

---

## Why a proxy is needed

football-data.org's API does **not** send browser-friendly CORS headers — it
only allows requests from an origin of exactly `http://localhost`. That means a
site hosted on GitHub Pages (`https://you.github.io/...`) **cannot call it
directly**; the browser blocks the response.

To work around this the app sends its requests to a tiny **Cloudflare Worker**
that you deploy. The Worker forwards the request (including your API token) to
football-data.org and adds the CORS headers the browser needs. The Worker code
is in [`worker/worker.js`](worker/worker.js) — about 30 lines.

Your token only ever travels from your browser to your own Worker to
football-data.org. It is never committed to this repo.

---

## One-time setup

### 1. Get a football-data.org API token

1. Register for a free account at <https://www.football-data.org/client/register>.
2. Copy your API token (also called the **X-Auth-Token**) from your account page.

### 2. Deploy the Cloudflare Worker proxy

You'll need a free [Cloudflare account](https://dash.cloudflare.com/sign-up).
Everything below uses `wrangler`, Cloudflare's CLI, run via `npx` (no global
install needed).

```bash
npm install             # installs wrangler (a dev dependency)
npm run worker:login    # opens a browser to authorise the CLI (one time)
npm run worker:deploy   # deploys worker/worker.js
```

After deploying, wrangler prints the Worker's URL, e.g.

```
https://wc-blackjack-proxy.YOUR-SUBDOMAIN.workers.dev
```

Copy that URL — you'll paste it into the app's **Proxy URL** box. (To rename the
Worker, edit `name` in [`worker/wrangler.toml`](worker/wrangler.toml) before
deploying.)

You can sanity-check the Worker from the command line:

```bash
curl -s "https://wc-blackjack-proxy.YOUR-SUBDOMAIN.workers.dev/v4/competitions/WC/matches" \
  -H "X-Auth-Token: YOUR_TOKEN" | head -c 200
```

#### Optional: auto-deploy the Worker from CI

The Worker is tiny and rarely changes, so the first deploy above is usually
enough. If you'd rather have it redeploy automatically, the workflow in
[`.github/workflows/deploy-worker.yml`](.github/workflows/deploy-worker.yml)
deploys it whenever anything under `worker/` changes on `main`.

It needs two repository secrets (**Settings → Secrets and variables → Actions**):

- `CLOUDFLARE_API_TOKEN` — create one at
  <https://dash.cloudflare.com/profile/api-tokens> using the **Edit Cloudflare
  Workers** template.
- `CLOUDFLARE_ACCOUNT_ID` — shown on your Cloudflare dashboard (Workers & Pages
  overview), or run `npx wrangler whoami`.

The Worker does **not** need your football-data.org token as a secret — that's
supplied by the browser at request time, never stored in the Worker or in CI.

### 3. Publish the SPA to GitHub Pages

1. Push this repo to GitHub with `main` as the default branch.
2. In the repo settings, go to **Settings → Pages** and set
   **Source** to **GitHub Actions**.
3. Add a repository **variable** so the site knows your Worker URL: under
   **Settings → Secrets and variables → Actions → Variables**, add
   `PROXY_URL` set to your Worker URL (e.g.
   `https://wc-blackjack-proxy.YOUR-SUBDOMAIN.workers.dev`). This is baked into
   the build so the hosted site works without anyone pasting it. It's a
   *variable*, not a secret — the Worker URL is public anyway. (Skip this and
   users just paste the URL into the app instead.)
4. The workflow in
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
   deploys the site every time `main` is updated. Your site appears at
   `https://YOUR-USERNAME.github.io/world-cup-blackjack/`.

### 4. Use it

Open the site and click **Load stats** after entering your **API token**. If you
set the `PROXY_URL` variable above, the **Proxy URL** is already filled in;
otherwise paste your Worker URL into that box. Both values are remembered in your
browser, and the box always lets you override the baked-in default (handy for
pointing at a local Worker during development).

---

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
```

For the **Load stats** button to work locally you still need the proxy URL
(your deployed Worker URL works fine), or you can run the Worker locally:

```bash
npm run worker:dev    # serves the proxy on http://localhost:8787
                      # then use http://localhost:8787 as the Proxy URL
```

Other scripts:

```bash
npm run build          # type-check + production build into dist/
npm run preview        # serve the production build locally
npm run lint           # type-check only
npm run worker:login   # authorise wrangler with Cloudflare (one time)
npm run worker:deploy  # deploy the Worker to Cloudflare
```

`scripts/check.mjs` is an optional dev utility: save a raw API response to a
file and run `node --experimental-strip-types scripts/check.mjs path/to.json`
to print the aggregated table and the generated rows.

---

## How it works

- `src/data.ts` — the canonical 48-team order, name-matching (handles variants
  like `Bosnia-Herzegovina`, `Cape Verde Islands`, `Congo DR`, `Ivory Coast`),
  and the goal aggregation. Goals include extra time but exclude penalty
  shootouts.
- `src/App.tsx` — the UI: token/proxy inputs, the prominent TSV row with the
  GF/GD toggle and copy button, and the team grid.
- `worker/` — the Cloudflare Worker CORS proxy.
- `.github/workflows/deploy.yml` — builds and deploys the SPA to GitHub Pages on
  push to `main`.
- `.github/workflows/deploy-worker.yml` — optionally deploys the Worker to
  Cloudflare when `worker/**` changes (needs the secrets above).
