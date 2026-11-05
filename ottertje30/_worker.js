/* Slinger Ottertje 30: agenda zelf beheren.

   Nodig in Cloudflare (Pages-project van deze site → Instellingen):
   - KV-binding  AGENDA            → een KV-namespace, bijvoorbeeld "ottertje30-agenda"
   - Geheim      BEHEER_WACHTWOORD → het wachtwoord voor /beheer

   Routes (via _routes.json komen alleen /api/* hier binnen):
   GET  /api/agenda.js    → "window.BEZET=[...]" voor de agenda op de site
   GET  /api/agenda.json  → { bezet, bijgewerkt } voor de beheerpagina
   POST /api/login        → controleert het wachtwoord
   PUT  /api/agenda       → slaat de bezette periodes op (met wachtwoord)

   Staat er nog niets in KV, dan gelden de periodes uit beschikbaarheid.js. */

const SLEUTEL = "bezet";
const MAX_FOUT = 8;          // foute wachtwoorden per IP ...
const FOUT_VENSTER = 900;    // ... binnen 15 minuten

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/* Haalt de periodes uit beschikbaarheid.js, voor zolang er nog niets in KV staat. */
async function uitBestand(env, request) {
  try {
    const r = await env.ASSETS.fetch(new URL("/beschikbaarheid.js", request.url));
    const t = await r.text();
    const lijst = t.match(/window\.BEZET\s*=\s*(\[[\s\S]*?\]);/);
    const datum = t.match(/window\.BEZET_BIJGEWERKT\s*=\s*"([\d-]+)"/);
    const bezet = lijst ? JSON.parse(lijst[1].replace(/\/\/[^\n]*/g, "").replace(/,\s*\]$/, "]")) : [];
    return { bezet, bijgewerkt: datum ? datum[1] : null };
  } catch (e) {
    return { bezet: [], bijgewerkt: null };
  }
}

async function lees(env, request) {
  if (env.AGENDA) {
    const v = await env.AGENDA.get(SLEUTEL, "json");
    if (v && Array.isArray(v.bezet)) return v;
  }
  return uitBestand(env, request);
}

function geldig(bezet) {
  if (!Array.isArray(bezet) || bezet.length > 500) return false;
  return bezet.every((p) => Array.isArray(p) && p.length === 2 && DATUM.test(p[0]) && DATUM.test(p[1]) && p[0] < p[1]);
}

/* Vergelijkt twee teksten zonder dat de duur iets verraadt. */
async function gelijk(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

async function magInloggen(env, ip) {
  if (!env.AGENDA) return true;
  const n = parseInt((await env.AGENDA.get("fout:" + ip)) || "0", 10);
  return n < MAX_FOUT;
}
async function telFout(env, ip) {
  if (!env.AGENDA) return;
  const n = parseInt((await env.AGENDA.get("fout:" + ip)) || "0", 10);
  await env.AGENDA.put("fout:" + ip, String(n + 1), { expirationTtl: FOUT_VENSTER });
}

async function controleer(request, env, wachtwoord) {
  const ip = request.headers.get("CF-Connecting-IP") || "x";
  if (!env.BEHEER_WACHTWOORD) return { ok: false, status: 503, fout: "niet_ingesteld" };
  if (!(await magInloggen(env, ip))) return { ok: false, status: 429, fout: "te_vaak" };
  if (typeof wachtwoord !== "string" || !wachtwoord || !(await gelijk(wachtwoord, env.BEHEER_WACHTWOORD))) {
    await telFout(env, ip);
    await new Promise((r) => setTimeout(r, 800));
    return { ok: false, status: 401, fout: "fout_wachtwoord" };
  }
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pad = url.pathname;

    if (pad === "/api/agenda.js" && request.method === "GET") {
      const { bezet, bijgewerkt } = await lees(env, request);
      const js = "window.BEZET=" + JSON.stringify(bezet) + ";" + (bijgewerkt ? "window.BEZET_BIJGEWERKT=" + JSON.stringify(bijgewerkt) + ";" : "");
      return new Response(js, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" } });
    }

    if (pad === "/api/agenda.json" && request.method === "GET") {
      const d = await lees(env, request);
      return json({ ...d, opslagKlaar: !!env.AGENDA, wachtwoordKlaar: !!env.BEHEER_WACHTWOORD });
    }

    if (pad === "/api/login" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const c = await controleer(request, env, body.wachtwoord);
      return c.ok ? json({ ok: true }) : json({ ok: false, fout: c.fout }, c.status);
    }

    if (pad === "/api/agenda" && request.method === "PUT") {
      const auth = request.headers.get("Authorization") || "";
      const wachtwoord = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const c = await controleer(request, env, wachtwoord);
      if (!c.ok) return json({ ok: false, fout: c.fout }, c.status);
      if (!env.AGENDA) return json({ ok: false, fout: "geen_opslag" }, 503);
      let body;
      try { body = await request.json(); } catch (e) { return json({ ok: false, fout: "ongeldig" }, 400); }
      if (!geldig(body.bezet)) return json({ ok: false, fout: "ongeldig" }, 400);
      const bezet = body.bezet.slice().sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const nu = new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
      await env.AGENDA.put(SLEUTEL, JSON.stringify({ bezet, bijgewerkt: nu }));
      return json({ ok: true, bijgewerkt: nu });
    }

    if (pad.startsWith("/api/")) return json({ fout: "niet_gevonden" }, 404);
    return env.ASSETS.fetch(request);
  },
};
