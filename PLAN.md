# Plan — World Cup 2026 Blackjack Stats

The app is built, deployed, and in use. What's left is optional setup plus a
couple of notes; nothing here blocks day-to-day use.

## Optional setup (the app works without these)

- **Bake in the Worker URL.** Set a repo *variable* `PROXY_URL` = the deployed
  Worker URL (Settings → Secrets and variables → Actions → Variables) and enable
  Pages (Settings → Pages → Source: GitHub Actions). The hosted site then
  pre-fills the Proxy URL instead of it being entered by hand each time.
- **Auto-deploy the Worker from CI.** Only if you want `worker/**` pushes to
  redeploy automatically: add repo secrets `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` (see `.github/workflows/deploy-worker.yml`). Otherwise
  redeploy manually with `npm run worker:deploy`.

## Notes

- `PROXY_URL` precedence: a value saved in the browser's localStorage overrides
  the baked-in default, so setting `PROXY_URL` later only auto-applies to fresh
  browsers.

## Backlog

- **Match count per team** — decided against; superseded by the progress badge,
  which already surfaces group games played via the count chip.
  `TeamStats.matchesPlayed` is still computed in `src/data.ts` if it's ever
  wanted.
