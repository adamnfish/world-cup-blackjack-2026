# Deployment plan — World Cup 2026 Blackjack Stats

A resumable checklist for getting this app live. The code is complete and
verified; what remains is the Cloudflare + GitHub setup. Pick this up when you
have time for the Cloudflare steps.

## Where things stand

**Done and pushed to `main`** (`git@github.com:adamnfish/world-cup-blackjack-2026.git`):

- **App**: built and working. Vite + React + TS SPA. `npm run build` /
  `npm run lint` pass; the data aggregation was verified against the live
  football-data.org feed (all 48 teams matched, correct GF/GA/GD row).
- **Design**: redesigned around the FIFA 2026 palette — unified colour system,
  light lavender output card, flag emoji + muted index in the team cells,
  full-width brand strip.
- **Worker**: `worker/worker.js` is a ~30-line Cloudflare Worker CORS proxy.
  Verified end-to-end locally (forwards `X-Auth-Token`, adds CORS, returns 104
  matches). **Not yet deployed to Cloudflare** — this is the main remaining work.
- **CI**: two workflows exist —
  - `.github/workflows/deploy.yml` — builds the SPA and deploys to GitHub Pages
    on push to `main`. Bakes in `VITE_PROXY_URL` from the `PROXY_URL` repo
    variable.
  - `.github/workflows/deploy-worker.yml` — deploys the Worker to Cloudflare
    when `worker/**` changes (needs Cloudflare secrets).
- **Dependencies / tooling**: all current — wrangler 4, vite 8, TypeScript 6,
  @vitejs/plugin-react 6, CI on Node 22; GitHub Actions on latest majors
  (checkout v7, setup-node v6, configure-pages v6, upload-pages-artifact v5,
  deploy-pages v5, wrangler-action v4). `npm audit` is clean (0 vulnerabilities).
- **Repo hygiene**: the `old/` prototype is gitignored and stays local-only.

**Not done yet** (resume here — see "Remaining steps" below): deploy the Worker
to Cloudflare, then enable GitHub Pages and set the `PROXY_URL` variable so the
hosted site can reach the API.

## How the pieces connect

```
Browser (GitHub Pages SPA)
  │  fetch <PROXY_URL>/v4/competitions/WC/matches  + header X-Auth-Token
  ▼
Cloudflare Worker (CORS proxy)
  │  forwards to football-data.org, adds Access-Control-Allow-Origin: *
  ▼
football-data.org API
```

- The **API token** is pasted by the user in the browser and forwarded
  per-request. It is never stored in the repo, the Worker, or CI.
- The **Worker URL** is baked into the build via the `PROXY_URL` repo variable,
  so the hosted site needs no manual configuration.

---

## Remaining steps

> **Start here.** The code, design, and tooling are all done and
> pushed. What's left is purely the Cloudflare + GitHub account setup below,
> in order: A → C → D (B is optional). You'll need a Cloudflare account and
> your football-data.org API token to hand.

### A. Cloudflare — deploy the Worker (you, when you have time)

> Requires a free Cloudflare account: https://dash.cloudflare.com/sign-up

1. Authorise the wrangler CLI (interactive, opens a browser):
   ```
   npm run worker:login
   ```
2. Deploy the Worker:
   ```
   npm run worker:deploy
   ```
   - _Claude can run this step for you once you've completed `worker:login`._
3. Copy the Worker URL it prints, e.g.
   `https://wc-blackjack-proxy.<your-subdomain>.workers.dev`.
4. (Optional sanity check)
   ```
   curl -s "https://wc-blackjack-proxy.<your-subdomain>.workers.dev/v4/competitions/WC/matches" \
     -H "X-Auth-Token: YOUR_TOKEN" | head -c 200
   ```

### B. Cloudflare credentials for Worker CI (you — optional)

Only needed if you want the Worker to auto-redeploy from CI. Skip if you're
happy deploying it manually with `npm run worker:deploy`.

- `CLOUDFLARE_API_TOKEN` — create at
  https://dash.cloudflare.com/profile/api-tokens using the **Edit Cloudflare
  Workers** template.
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard (Workers & Pages
  overview) or `npx wrangler whoami`.

### C. GitHub repo settings (you)

Do these together once you have the Worker URL from step A:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** — add variable
   `PROXY_URL` = the Worker URL from step A.3. (A *variable*, not a secret — the
   URL is public.)
3. (Optional, for step B) **Settings → Secrets and variables → Actions →
   Secrets** — add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Re-run the **Deploy to GitHub Pages** workflow (or push any commit) so the
   build picks up the new `PROXY_URL` variable.

### D. Verify (you / Claude)

- Visit `https://adamnfish.github.io/world-cup-blackjack-2026/`.
- The **Proxy URL** box should be pre-filled with the Worker URL.
- Paste your football-data.org **API token**, click **Load stats**.
- Confirm the 48-team grid populates and the TSV row copies correctly.
- No team should be flagged red (red = a name the API uses didn't match our
  list; see `src/data.ts`).

---

## What Claude can do on resume

- Run `npm run worker:deploy` after you've done `worker:login` (step A).
- After you set `PROXY_URL` / enable Pages, trigger and watch the Pages
  workflow, then help verify the live site (step D).
- Help debug any workflow run, CORS error, or unmatched-team issue.
- Tweak the UI/layout.

## Open questions / notes

- `PROXY_URL` precedence: a value saved in the browser's localStorage overrides
  the baked-in default, so changing `PROXY_URL` later only auto-applies to fresh
  browsers.
