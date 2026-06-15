// RIENVOR Rating Health Check — engine, ported from report_system/health_check.py.
//
// Pure ES module: uses only globals available on BOTH the Cloudflare Workers runtime
// (fetch, URL, Date, Math, JSON, regex) and Node 18+, so it can be unit-tested locally
// with `node` and shipped unchanged inside the Pages Function.
//
// What it does, given a Play/App Store link: pull LIVE numbers (rating, ratings count,
// installs), attach the deterministic 4.0-line framing, surface the app's real recent
// 1-star reviews verbatim, and — for Play — where it sits among comparable-scale peers.
// No API keys, no tokens. Mirrors the Python field-for-field; see that file for the "why".
//
// The Play scrape replicates google_play_scraper's protocol exactly (the same library the
// Python engine uses): details via the AF_initDataCallback ds:5 blob, reviews via the
// batchexecute `oCPfdb` RPC, search via ds:4. App Store via the public iTunes lookup + RSS.

const MARKET_LABELS = { in: "India", us: "United States", gb: "United Kingdom",
  ae: "UAE", sg: "Singapore", au: "Australia", ca: "Canada" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const N_REVIEWS = 4;            // how many real reviews to surface
const REVIEW_MAXLEN = 280;
const CATEGORY_N = 5;          // named peers to surface
const CATEGORY_HITS = 30;       // search depth
const MIN_CATEGORY_INSTALLS = 50000;   // floor: a real competitor, not a fringe listing
const PEER_BAND_FACTORS = [10, 31, 100];   // install proximity bands (±1, ~1.5, ±2 OOM)
const PEER_BAND_MIN = 6;        // widen the band until it holds this many comparable apps

export class InputError extends Error {}

// ----------------------------------------------------------------- input parsing
export function parseInput(raw, country) {
  const s = (raw || "").trim();
  if (!s) throw new InputError("Paste a Play Store or App Store link (or an app id).");

  // App Store — link or bare numeric id
  if (s.includes("apple.com")) {
    let cc = null;
    const mcc = s.match(/apple\.com\/([a-z]{2})\//);
    if (mcc) cc = mcc[1];
    const mid = s.match(/\/id(\d+)/) || s.match(/\bid(\d+)\b/) || s.match(/(\d{5,})/);
    if (!mid) throw new InputError("Couldn't find the App Store id (…/idNNNNNNNNN) in that link.");
    return { storeKey: "appstore", appId: mid[1], cc: (country || cc || "in") };
  }
  if (/^\d{5,}$/.test(s)) return { storeKey: "appstore", appId: s, cc: (country || "in") };

  // Play — link or bare package id
  const mpkg = s.match(/[?&]id=([A-Za-z0-9_.]+)/);
  const appId = mpkg ? mpkg[1] : s;
  if (appId.includes(".") && /^[A-Za-z0-9_.]+$/.test(appId)) {
    return { storeKey: "play", appId, cc: (country || "in") };
  }
  throw new InputError("Unrecognised — paste a Play Store link / package id (com.example.app) " +
    "or an App Store link / numeric id.");
}

// ----------------------------------------------------------------- text helpers
const clean = (t) => String(t == null ? "" : t).replace(/\s+/g, " ").trim();
function truncate(t, n = REVIEW_MAXLEN) {
  t = clean(t);
  return t.length > n ? t.slice(0, n).replace(/\s+$/, "") + "…" : t;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d) {
  let dt = null;
  if (typeof d === "number") dt = new Date(d * 1000);          // Play `at` = epoch seconds
  else {
    const s = String(d || "").trim();
    if (s) { const t = Date.parse(s); if (!isNaN(t)) dt = new Date(t); }
  }
  if (!dt || isNaN(dt.getTime())) return "";
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

// ----------------------------------------------------------------- http
// Header policy matters from a shared/datacenter IP:
//  - Google Play serves fine with a browser User-Agent (and returns a fuller result set).
//  - Apple's iTunes endpoints 403 a *browser-spoofing* User-Agent from datacenter ranges
//    (anti-scraping) but allow the default UA — so iTunes calls send NO browser UA.
const PLAY_HEADERS = { "User-Agent": UA, "Accept-Language": "en" };
const ITUNES_HEADERS = {};

async function httpFetch(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally { clearTimeout(timer); }
}
async function fetchJson(url, headers) {
  const r = await httpFetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function fetchText(url, headers) {
  const r = await httpFetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// ----------------------------------------------------------------- Play: parse
// Replicates google_play_scraper's dom parse: pull every AF_initDataCallback block into a
// { "ds:N": data } map, then read fields by the library's fixed index paths.
function look(src, path) {
  let cur = src;
  for (const i of path) {
    if (cur == null) return null;
    cur = cur[i];
    if (cur === undefined) return null;
  }
  return cur === undefined ? null : cur;
}
function parsePlayDataset(htmlText) {
  const dataset = {};
  const scriptRe = /AF_initDataCallback[\s\S]*?<\/script/g;
  const keyRe = /(ds:.*?)'/;
  const valueRe = /data:([\s\S]*?), sideChannel: \{\}\}\);<\//;
  let m;
  while ((m = scriptRe.exec(htmlText)) !== null) {
    const block = m[0];
    const k = block.match(keyRe);
    const v = block.match(valueRe);
    if (k && v) {
      try { dataset[k[1]] = JSON.parse(v[1]); } catch (e) { /* skip */ }
    }
  }
  return dataset;
}

// ----------------------------------------------------------------- Play: fetch
async function fetchPlay(appId, country) {
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=en&gl=${country}`;
  const [htmlText, reviews] = await Promise.all([
    fetchText(url, PLAY_HEADERS),
    playLowReviews(appId, country),
  ]);
  const ds = parsePlayDataset(htmlText);
  const d = ds["ds:5"];
  if (!d) throw new Error("Play: could not parse app data");
  const score = look(d, [1, 2, 51, 0, 1]);
  return {
    store_key: "play",
    store: "Google Play",
    app_name: look(d, [1, 2, 0, 0]) || appId,
    developer: look(d, [1, 2, 68, 0]) || "",
    rating: score != null ? Number(score) : null,
    review_count: look(d, [1, 2, 51, 2, 1]),
    installs: look(d, [1, 2, 13, 0]),
    genre: look(d, [1, 2, 79, 0, 0, 0]),
    store_url: url,
    reviews,
  };
}

async function playReviewsPage(appId, country, score, count) {
  // batchexecute `oCPfdb`, first page, NEWEST (sort=2). Inner request mirrors the library's
  // template: [null,[2,sort,[count],null,[null,score,null×7]],[appId,7]].
  const url = `https://play.google.com/_/PlayStoreUi/data/batchexecute?hl=en&gl=${country}`;
  const inner = JSON.stringify(
    [null, [2, 2, [count], null, [null, score, null, null, null, null, null, null, null]], [appId, 7]]);
  const body = "f.req=" + encodeURIComponent(JSON.stringify([[["oCPfdb", inner, null, "generic"]]])) + "\n";
  const r = await httpFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", ...PLAY_HEADERS },
    body,
  });
  const txt = await r.text();
  const m = txt.match(/\)\]\}'\n\n([\s\S]+)/);
  if (!m) return [];
  let outer;
  try { outer = JSON.parse(m[1]); } catch (e) { return []; }
  let dataStr = null;
  for (const env of outer) {
    if (Array.isArray(env) && env[1] === "oCPfdb" && env[2]) { dataStr = env[2]; break; }
  }
  if (dataStr == null && outer[0] && outer[0][2]) dataStr = outer[0][2];
  if (!dataStr) return [];
  let results;
  try { results = JSON.parse(dataStr); } catch (e) { return []; }
  if (!results.length || !results[0] || !results[0].length) return [];
  return results[0];
}

async function playLowReviews(appId, country) {
  // Newest 1-star reviews; widen to 2-star only if 1-stars don't fill the card.
  const out = [];
  for (const star of [1, 2]) {
    let items = [];
    try { items = await playReviewsPage(appId, country, star, 12); } catch (e) { items = []; }
    for (const rv of items) {
      const c = clean(rv[4]);
      if (c) out.push({ rating: rv[2] || star, date: fmtDate(rv[5] && rv[5][0]), text: truncate(c), thumbs: rv[6] || 0 });
    }
    if (out.length >= N_REVIEWS) break;
  }
  return out.slice(0, N_REVIEWS);
}

// ----------------------------------------------------------------- App Store: fetch
async function fetchAppstore(trackId, country) {
  const look = await fetchJson(`https://itunes.apple.com/lookup?id=${trackId}&country=${country}`, ITUNES_HEADERS);
  const results = look.results || [];
  if (!results.length) throw new InputError(`App id ${trackId} not found on the ${country.toUpperCase()} App Store.`);
  const a = results[0];
  return {
    store_key: "appstore",
    store: "App Store",
    app_name: a.trackName || `id${trackId}`,
    developer: a.artistName || "",
    rating: a.averageUserRating != null ? Number(a.averageUserRating) : null,
    review_count: a.userRatingCount,
    installs: null,                  // the App Store doesn't publish install counts
    store_url: a.trackViewUrl || `https://apps.apple.com/${country}/app/id${trackId}`,
    reviews: await appstoreLowReviews(trackId, country),
  };
}

async function appstoreLowReviews(trackId, country) {
  // NOTE: Apple's customer-reviews RSS is 403-blocked from datacenter/shared IPs (incl. Cloudflare)
  // regardless of headers — unlike the lookup endpoint, which works. So from the Worker this
  // returns [] and the App Store card shows the rating diagnosis without review quotes. Run from a
  // residential IP (the Python engine) it returns the real reviews. Best-effort: never fails the check.
  let feed;
  try {
    feed = await fetchJson(`https://itunes.apple.com/${country}/rss/customerreviews/page=1/id=${trackId}/sortby=mostrecent/json`, ITUNES_HEADERS);
  } catch (e) { return []; }
  let entries = (feed.feed && feed.feed.entry) || [];
  if (!Array.isArray(entries)) entries = entries ? [entries] : [];
  const isObj = (x) => x !== null && typeof x === "object";
  if (entries.length && isObj(entries[0]) && !("im:rating" in entries[0])) entries = entries.slice(1);  // drop app node
  entries = entries.filter(isObj);
  const parsed = [];
  for (const e of entries) {
    let star = 0;
    const lbl = e["im:rating"] && e["im:rating"].label;
    const n = parseInt(lbl, 10);
    if (!isNaN(n)) star = n;
    const body = clean(e.content && e.content.label);
    const title = clean(e.title && e.title.label);
    const text = body || title;
    if (!text) continue;
    parsed.push({ rating: star, date: fmtDate(e.updated && e.updated.label), text: truncate(text), thumbs: 0 });
  }
  for (const cutoff of [1, 2]) {
    const picked = parsed.filter((r) => r.rating <= cutoff);
    if (picked.length >= N_REVIEWS || cutoff === 2) return picked.slice(0, N_REVIEWS);
  }
  return parsed.slice(0, N_REVIEWS);
}

// ----------------------------------------------------------------- framing (deterministic)
function stripZeros(s) { return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s; }
function num1(x) { return stripZeros(x.toFixed(1)); }
function rat(x) { return stripZeros(Number(x).toFixed(2)); }
function shortInstalls(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return raw;
  const n = parseInt(digits, 10);
  if (n >= 1000000) return `${Math.floor(n / 1000000)}M+`;
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  return String(n);
}

function addFraming(r) {
  const rating = r.rating || 0.0;
  const gap = Math.round((4.0 - rating) * 1000) / 1000;
  const gapDisp = Math.round((4.0 - rating) * 10) / 10;
  r.gap = gap;
  r.marker_pct = rating ? Math.round(Math.max(0, Math.min(100, (rating - 3.5) / 0.8 * 100)) * 10) / 10 : 0.0;
  r.rating_str = rating ? rat(rating) : "—";
  r.review_count_str = r.review_count ? Number(r.review_count).toLocaleString("en-US") : "—";
  r.installs_short = shortInstalls(r.installs);

  if (gapDisp > 0) {
    r.band = "below";
    r.headline = `${num1(gapDisp)}★ below the 4.0 install-conversion line`;
    r.headline_sub = "Below 4.0, install conversion stays suppressed and effective " +
      "acquisition cost stays elevated — a direct, recoverable lever.";
  } else if (gapDisp === 0) {
    r.band = "at";
    r.headline = "Right at the 4.0 line";
    r.headline_sub = "This is the most exposed place to sit: a thin negative flow can " +
      "tip it below 4.0, where install conversion measurably drops.";
  } else if (rating < 4.3) {
    r.band = "in_band";
    r.headline = `${num1(Math.abs(gapDisp))}★ above the 4.0 line — inside the target band`;
    r.headline_sub = "Above the conversion line and inside the healthy band. The question " +
      "here is holding it against the incoming negative flow.";
  } else {
    r.band = "healthy";
    r.headline = `Healthy — ${num1(Math.abs(gapDisp))}★ above the 4.0 line`;
    r.headline_sub = "Comfortably above the conversion line. Even so, the recent 1-stars " +
      "below are the live downward pressure on that average.";
  }
  return r;
}

// ----------------------------------------------------------------- category positioning
function normDev(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function sameDeveloper(a, b) {
  const na = normDev(a), nb = normDev(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return short.length >= 5 && long.includes(short);
}
function deriveQuery(appName, genre) {
  let t = clean(appName);
  for (const sep of [" - ", " – ", " — ", ": ", " | ", " · "]) {
    const i = t.indexOf(sep);
    if (i >= 0) { t = t.slice(i + sep.length); break; }
  }
  t = t.replace(/[^A-Za-z& ]/g, " ");
  const words = t.split(/\s+/).filter((w) => w.length > 2);
  return (words.slice(0, 3).join(" ").trim().toLowerCase()) || (genre || "").trim().toLowerCase();
}
function labelFromQuery(q) { return q ? (q.slice(0, 1).toUpperCase() + q.slice(1)) + " apps" : "Category apps"; }
function installsNum(raw) {
  if (typeof raw === "number") return Math.floor(raw);
  const d = String(raw || "").replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : 0;
}
function median(arr) {
  const s = [...arr].sort((x, y) => x - y);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
function peerBand(field, subjN) {
  if (!subjN) return field;
  for (const f of PEER_BAND_FACTORS) {
    const band = field.filter((a) => a.installs_n && (subjN / f) <= a.installs_n && a.installs_n <= (subjN * f));
    if (band.length >= PEER_BAND_MIN) return band;
  }
  return field;
}

async function playSearch(query, country, nHits) {
  const url = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=en&gl=${country}`;
  const htmlText = await fetchText(url, PLAY_HEADERS);
  const ds = parsePlayDataset(htmlText);
  const root = ds["ds:4"];
  if (!root) return [];
  let topResult = null;
  try { topResult = root[0][1][0][23][16]; } catch (e) { /* none */ }
  let apps = null;
  let branch = null;
  try { branch = root[0][1]; } catch (e) { return []; }
  if (!Array.isArray(branch)) return [];
  for (let idx = 0; idx < branch.length; idx++) {
    const cand = look(branch[idx], [22, 0]);     // first successful cluster wins (as the library does)
    if (cand) { apps = cand; break; }
  }
  if (!apps) return [];
  const out = [];
  if (topResult) {
    out.push({
      appId: look(topResult, [11, 0, 0]),
      title: look(topResult, [2, 0, 0]),
      score: look(topResult, [2, 51, 0, 1]),
      genre: look(topResult, [2, 79, 0, 0, 0]),
      developer: look(topResult, [2, 68, 0]),
      installs: look(topResult, [2, 13, 0]),
    });
  }
  // Fixed bound (as Python's range(n_apps - len(top))): don't recompute against the growing list.
  const limit = Math.min(apps.length, nHits) - out.length;
  for (let i = 0; i < limit; i++) {
    const app = apps[i];
    out.push({
      appId: look(app, [0, 0, 0]),
      title: look(app, [0, 3]),
      score: look(app, [0, 4, 1]),
      genre: look(app, [0, 5]),
      developer: look(app, [0, 14]),
      installs: look(app, [0, 15]),
    });
  }
  return out;
}

async function categorySet(appId, subjectRating, developer, market, subjectInstalls, appName, genre) {
  const q = deriveQuery(appName, genre);
  if (!q) return null;
  let res;
  try { res = await playSearch(q, market || "in", CATEGORY_HITS); } catch (e) { return null; }

  const subjGenre = (genre || "").trim().toLowerCase();
  const field = [];
  for (const x of res || []) {
    const aid = x.appId, sc = x.score;
    if (!aid || aid === appId || sc == null) continue;
    if (sameDeveloper(developer, x.developer)) continue;        // exclude the developer's own apps
    if (subjGenre && String(x.genre || "").trim().toLowerCase() !== subjGenre) continue;   // relevance gate
    const nInst = installsNum(x.installs);
    if (nInst < MIN_CATEGORY_INSTALLS) continue;                // drop fringe/junk listings
    field.push({ name: clean(x.title), app_id: aid, rating: Math.round(Number(sc) * 100) / 100,
      installs_short: shortInstalls(x.installs), installs_n: nInst });
  }
  if (!field.length) return null;

  const subjN = installsNum(subjectInstalls);
  const comparable = peerBand(field, subjN);
  const above = comparable.filter((a) => a.rating > subjectRating);
  if (above.length * 2 <= comparable.length) return null;       // only pitch when the MAJORITY are above

  if (subjN) {
    const ref = Math.log10(Math.max(subjN, 1));
    above.sort((a, b) =>
      Math.abs(Math.log10(Math.max(a.installs_n, 1)) - ref) - Math.abs(Math.log10(Math.max(b.installs_n, 1)) - ref));
  }
  const named = above.slice(0, CATEGORY_N).sort((a, b) => b.rating - a.rating);
  const ratings = comparable.map((a) => a.rating);
  return {
    category_query: q,
    category_label: labelFromQuery(q),
    primary_market: market || "in",
    source_date: today(),
    subject_rating: Math.round(Number(subjectRating) * 100) / 100,
    n_considered: comparable.length,
    n_above: above.length,
    category_leader_rating: Math.round(Math.max(...ratings) * 100) / 100,
    category_median: Math.round(median(ratings) * 100) / 100,
    competitors: named.map((a) => ({ name: a.name, app_id: a.app_id, rating: a.rating,
      installs_short: a.installs_short, review_base: null })),   // public path: no per-peer count fetch
  };
}

function today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ----------------------------------------------------------------- orchestration
export async function healthCheck(raw, country, { withCategory = true } = {}) {
  const { storeKey, appId, cc } = parseInput(raw, country);
  const r = storeKey === "play" ? await fetchPlay(appId, cc) : await fetchAppstore(appId, cc);
  r.market = cc;
  r.market_label = MARKET_LABELS[cc] || cc.toUpperCase();
  r.pulled = today();
  addFraming(r);
  // Category positioning is Play-only and best-effort — never fails the check.
  if (withCategory && storeKey === "play" && r.rating) {
    try {
      const cat = await categorySet(appId, r.rating, r.developer, cc, r.installs, r.app_name, r.genre);
      if (cat && cat.competitors && cat.competitors.length) r.category = cat;
    } catch (e) { /* best-effort */ }
  }
  return { result: r, storeKey, appId, cc };
}

// Whitelist the engine result for the public response — no internal/developer-only fields.
export function publicPayload(r) {
  return {
    ok: true,
    app_name: r.app_name,
    store: r.store,
    store_key: r.store_key,
    market_label: r.market_label,
    developer: r.developer,
    rating: r.rating,
    rating_str: r.rating_str,
    review_count_str: r.review_count_str,
    installs_short: r.installs_short,
    marker_pct: r.marker_pct,
    gap: r.gap,
    band: r.band,
    headline: r.headline,
    headline_sub: r.headline_sub,
    reviews: r.reviews || [],
    category: r.category || null,
    pulled: r.pulled,
  };
}
