// RIENVOR Rating Health Check — public API, as a Cloudflare Pages Function.
//
// Routes /api/check (GET ?link=&country= or POST {link,country}). Replaces the Fly.io
// service: same response contract, but runs on the same Cloudflare site the static pages
// deploy to — no separate host, no card. The one thing the static site can't do (the live
// store scrape) happens here.
//
// - Same-origin in production (rienvor.com -> rienvor.com/api/check); CORS headers are
//   permissive because this is a public read-only tool with no secrets.
// - 6h edge cache (Cache API) keyed by canonical store:id:country — repeat checks of a
//   popular app are instant and don't re-scrape, which smooths Play rate-limits.
// - Graceful failure: a store fetch that fails (most often Play rate-limiting from a shared
//   IP) returns a friendly JSON error, never a stack trace. The App Store path is solid
//   everywhere; Play is best-effort by design.

import { healthCheck, publicPayload, parseInput, InputError } from "./_engine.js";

const CACHE_TTL = 6 * 3600;     // seconds

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(code, obj, extra) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(), ...(extra || {}) },
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function onRequestGet({ request }) {
  const u = new URL(request.url);
  return handle(u.searchParams.get("link") || "", u.searchParams.get("country") || "", u.searchParams.get("debug"));
}

export async function onRequestPost({ request }) {
  const u = new URL(request.url);
  let body = {};
  try { body = await request.json(); } catch (e) { /* empty/invalid -> handled below */ }
  return handle((body && body.link) || "", (body && body.country) || "", u.searchParams.get("debug"));
}

async function handle(link, country, debug) {
  link = (link || "").trim();
  country = (country || "").trim();
  if (!link) return json(400, { ok: false, error: "Paste a Play Store or App Store link." });

  // EVERYTHING after this point is inside one try/catch — including the cache lookup — so no
  // exception can escape to a bare Cloudflare 502; a friendly JSON error always comes back.
  let key = "";
  try {
    const p = parseInput(link, country || undefined);   // throws InputError on bad input
    key = `${p.storeKey}:${p.appId}:${p.cc}`;

    const cache = caches.default;
    const cacheReq = new Request(`https://hc.rienvor.com/cache/${encodeURIComponent(key)}`);
    const hit = await cache.match(cacheReq);
    if (hit) {
      const data = await hit.json();
      data.cached = true;
      return json(200, data);
    }

    const { result } = await healthCheck(link, country || undefined, { withCategory: true });
    const payload = publicPayload(result);

    // Usage dataset — one line per fresh check, visible in the Pages Functions logs. No PII.
    const cat = payload.category || {};
    console.log(`[check] ${key} rating=${payload.rating} band=${payload.band} ` +
      `peers=${cat.n_above ?? ""}/${cat.n_considered ?? ""} reviews=${(payload.reviews || []).length}`);

    await cache.put(cacheReq, new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${CACHE_TTL}` },
    }));
    return json(200, payload);
  } catch (e) {
    if (e instanceof InputError) return json(400, { ok: false, error: e.message });
    // Apple 403s iTunes lookups from datacenter/shared IPs (incl. Cloudflare), so App Store checks
    // fail server-side while Google Play works. Give an honest, store-aware message pointing to Play.
    const isAppStore = key.startsWith("appstore:");
    const out = {
      ok: false,
      error: isAppStore
        ? "App Store checks aren't available from our server right now — Apple limits lookups from shared hosts. Google Play links work fully; try one of those."
        : "Couldn't reach Google Play just now — please try again in a moment.",
      detail: e && e.name,
    };
    if (debug) out.debug = String((e && (e.stack || e.message)) || e);   // ?debug=1 surfaces the real error
    // Return 200, NOT a 5xx: Cloudflare swaps a Function's 5xx for its own bare error page, which
    // breaks the JSON contract. The front-end branches on the `ok` field, not the HTTP status.
    return json(200, out);
  }
}
