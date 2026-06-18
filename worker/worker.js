/**
 * CORS proxy for football-data.org.
 *
 * The football-data.org API only allows browser requests from an origin of
 * exactly `http://localhost`, so a site hosted on GitHub Pages cannot call it
 * directly. This Worker sits in between: the SPA calls the Worker, the Worker
 * forwards the request (including the secret X-Auth-Token header) to
 * football-data.org, and adds permissive CORS headers to the response.
 *
 * Deploy with `wrangler deploy` (see ../README.md).
 */

const UPSTREAM = "https://api.football-data.org";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "X-Auth-Token, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    // Answer CORS preflight requests directly.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== "GET") {
      return new Response("Only GET is supported", { status: 405, headers: CORS });
    }

    const url = new URL(request.url);
    const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
      headers: {
        "X-Auth-Token": request.headers.get("X-Auth-Token") || "",
        Accept: "application/json",
      },
    });

    // Copy the upstream response and overlay our CORS headers.
    const headers = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
