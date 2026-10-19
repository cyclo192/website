/* Nestig — server-kant van de shop (Cloudflare Pages, advanced mode).

   Draait alleen voor /api/* (zie _routes.json). Alle andere pagina's worden
   rechtstreeks als bestand geserveerd.

   /api/bestelling   bestelling aannemen. Met Stripe: betaalpagina (Stripe Checkout) aanmaken
                     en de klant daarheen sturen. Zonder Stripe: mail naar de klant
                     en naar Nestig, betalen gaat dan met een betaalverzoek.
   /api/stripe       webhook: hier meldt Stripe dat er betaald is.
                     Is er betaald, dan gaan de bevestigingsmails de deur uit.
   /api/stand        hoe er nu betaald wordt: "live", "test" of "verzoek". De bestelpagina
                     toont een melding zolang Stripe in testmodus staat.
   /api/betaling     status van een betaling, voor de bedankpagina
   /api/verzonden    alleen voor Nestig zelf: track-en-tracecode naar de klant mailen.
                     De link ernaartoe staat in de mail "Betaalde bestelling" en is
                     ondertekend, dus alleen wie die mail heeft kan dit gebruiken.
   /api/herroeping   herroeping aannemen, ontvangstbevestiging naar de klant

   Instellingen (Cloudflare > Pages > nestig > Settings > Variables and secrets):
     RESEND_API_KEY   geheim, sleutel van resend.com. Zonder sleutel geeft de API
                      503 terug en valt de site terug op bestellen via WhatsApp.
     STRIPE_SECRET_KEY      geheim, "Secret key" van stripe.com (sk_test_... of sk_live_...).
                            Zonder sleutel blijft betalen met een betaalverzoek werken.
     STRIPE_WEBHOOK_SECRET  geheim, "Signing secret" (whsec_...) van de webhook naar
                            https://nestig.nl/api/stripe met de events
                            checkout.session.completed en checkout.session.async_payment_succeeded.
     MAIL_VAN         optioneel, standaard "Nestig <bestelling@nestig.nl>"
     MAIL_NAAR        optioneel, waar bestellingen binnenkomen

   Er is geen database. Tussen bestellen en betalen bewaart Stripe de bestelling
   als "metadata" bij de betaling (max. 500 tekens per veld).

   De prijzen hieronder zijn leidend. Wat de browser meestuurt aan prijzen
   wordt genegeerd. Houd deze lijst gelijk aan js/shop.js. */

const PRODUCTEN = {
  boeket: {
    naam: "Gehaakt boeket",
    prijs: 2795,
    kleuren: { rood: "Bordeauxrood" },
  },
  kostuum: {
    naam: "Kerstboom-kostuum voor kat en hond",
    prijs: 1995,
    kleuren: { een: "Eén maat" },
  },
};

const ZAAK = {
  naam: "Nestig",
  onderdeelVan: "byXavio",
  straat: "Speltstraat 16",
  postcodePlaats: "1446 DA Purmerend",
  telefoon: "06 26 68 39 86",
  email: "infobyxavio@gmail.com",
  kvk: "42165581",
  btw: "NL005549301B15",
  site: "https://nestig.nl",
  levertijd: "2 tot 3 weken",
};

const TOEGESTANE_HERKOMST = /^https:\/\/((www\.)?nestig\.nl|([a-z0-9-]+\.)?nestig\.pages\.dev)$/;
const MAX_REGELS = 5;
const MAX_PER_REGEL = 10;
const MAX_BODY = 8000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/stand" && request.method === "GET") return stand(env);
        if (url.pathname === "/api/betaling" && request.method === "GET") return await betaling(url, env);
        if (url.pathname === "/api/verzonden" && request.method === "GET") return await verzondenInfo(url, env);
        if (url.pathname === "/api/verzonden" && request.method === "POST") return await verzonden(request, env);
        if (request.method !== "POST") return json({ fout: "Alleen POST" }, 405);
        if (url.pathname === "/api/bestelling") return await bestelling(request, env);
        if (url.pathname === "/api/herroeping") return await herroeping(request, env);
        if (url.pathname === "/api/stripe") return await stripeMelding(request, env);
        return json({ fout: "Niet gevonden" }, 404);
      } catch (e) {
        if (e instanceof Ongeldig) return json({ fout: e.message, veld: e.veld }, 400);
        console.error("api-fout", e && e.message);
        return json({ fout: "Er ging iets mis. Probeer het opnieuw." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

/* ---------- hulpjes ---------- */

class Ongeldig extends Error {
  constructor(bericht, veld) { super(bericht); this.veld = veld; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function leesInvoer(request) {
  const herkomst = request.headers.get("Origin") || "";
  if (!TOEGESTANE_HERKOMST.test(herkomst)) throw new Ongeldig("Deze aanvraag komt niet van nestig.nl.");
  const ruw = await request.text();
  if (ruw.length > MAX_BODY) throw new Ongeldig("De aanvraag is te groot.");
  let data;
  try { data = JSON.parse(ruw); } catch (e) { throw new Ongeldig("De aanvraag is niet leesbaar."); }
  if (!data || typeof data !== "object") throw new Ongeldig("De aanvraag is niet leesbaar.");
  /* Onzichtbaar veld dat mensen leeg laten en robots invullen, plus een minimale invultijd. */
  if (data.website) throw new Ongeldig("De aanvraag is geweigerd.");
  if (typeof data.t !== "number" || data.t < 2500) throw new Ongeldig("Dat ging wel erg snel. Probeer het over een paar tellen opnieuw.");
  return data;
}

/* Eén regel tekst: geen regeleinden of stuurtekens, dubbele spaties weg. */
function regel(waarde, veld, { min = 0, max = 100, verplicht = true } = {}) {
  const s = String(waarde == null ? "" : waarde).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s && !verplicht) return "";
  if (s.length < min) throw new Ongeldig("Vul dit veld in.", veld);
  if (s.length > max) throw new Ongeldig("Dit veld is te lang.", veld);
  return s;
}

function email(waarde, veld) {
  const s = regel(waarde, veld, { min: 5, max: 120 });
  if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(s)) throw new Ongeldig("Vul een geldig e-mailadres in.", veld);
  return s;
}

function euro(centen) {
  return "€ " + (centen / 100).toFixed(2).replace(".", ",");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function nu(moment) {
  const d = moment ? new Date(moment) : new Date();
  return new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "long", timeStyle: "short" }).format(isNaN(d) ? new Date() : d);
}

function nummer(voorvoegsel) {
  const d = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(new Date()).replace(/-/g, "");
  const tekens = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return voorvoegsel + "-" + d + "-" + Array.from(bytes, (b) => tekens[b % tekens.length]).join("");
}

/* Platte tekst is de bron; de html-versie is dezelfde tekst met klikbare links. */
function alsHtml(tekst) {
  const body = esc(tekst)
    .replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:#12302b">$1</a>')
    .replace(/\n/g, "<br>\n");
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#12302b;max-width:560px">' + body + "</div>";
}

/* "eenmalig" is een sleutel waarmee Resend dezelfde mail binnen 24 uur maar één keer verstuurt. */
async function stuurMail(env, { aan, onderwerp, tekst, antwoordNaar, eenmalig }) {
  const headers = { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" };
  if (eenmalig) headers["Idempotency-Key"] = eenmalig;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: env.MAIL_VAN || "Nestig <bestelling@nestig.nl>",
      to: [aan],
      reply_to: antwoordNaar,
      subject: onderwerp,
      text: tekst,
      html: alsHtml(tekst),
    }),
  });
  if (r.status === 409 && eenmalig) return; /* deze mail is al verstuurd of onderweg */
  if (!r.ok) throw new Error("mail " + r.status);
}

const VOET = [
  "",
  "Vragen of een klacht? App of bel " + ZAAK.telefoon + " of mail naar " + ZAAK.email + ". Je krijgt binnen 14 dagen een inhoudelijk antwoord, meestal dezelfde dag.",
  "",
  ZAAK.naam + ", onderdeel van " + ZAAK.onderdeelVan,
  ZAAK.straat + ", " + ZAAK.postcodePlaats,
  "KVK " + ZAAK.kvk + ", btw-id " + ZAAK.btw,
  ZAAK.site,
].join("\n");

/* ---------- bestelling ---------- */

/* Controleert wat de browser stuurt en maakt er een nette bestelling van. Prijzen komen uit PRODUCTEN. */
function leesBestelling(d) {
  if (!Array.isArray(d.regels) || d.regels.length < 1 || d.regels.length > MAX_REGELS) throw new Ongeldig("Je winkelmand is leeg.", "regels");
  const regels = d.regels.map((r) => {
    const p = r && Object.prototype.hasOwnProperty.call(PRODUCTEN, r.id) ? PRODUCTEN[r.id] : null;
    if (!p || !Object.prototype.hasOwnProperty.call(p.kleuren, r.kleur)) throw new Ongeldig("Een product in je winkelmand bestaat niet meer.", "regels");
    const aantal = Number(r.aantal);
    if (!Number.isInteger(aantal) || aantal < 1 || aantal > MAX_PER_REGEL) throw new Ongeldig("Het aantal klopt niet.", "regels");
    return { id: r.id, kleur: r.kleur, aantal, prijs: p.prijs };
  });

  const naam = regel(d.naam, "naam", { min: 2, max: 80 });
  const straat = regel(d.straat, "straat", { min: 3, max: 100 });
  const land = d.land === "BE" ? "BE" : "NL";
  let postcode;
  if (land === "BE") {
    postcode = regel(d.postcode, "postcode", { min: 4, max: 4 });
    if (!/^[1-9]\d{3}$/.test(postcode)) throw new Ongeldig("Vul een Belgische postcode in zoals 2000.", "postcode");
  } else {
    postcode = regel(d.postcode, "postcode", { min: 6, max: 7 }).toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2");
    if (!/^[1-9]\d{3} [A-Z]{2}$/.test(postcode)) throw new Ongeldig("Vul een postcode in zoals 1441 AB.", "postcode");
  }
  const plaats = regel(d.plaats, "plaats", { min: 2, max: 60 });
  const mail = email(d.email, "email");
  const telefoon = regel(d.telefoon, "telefoon", { max: 20, verplicht: false });
  const opmerking = regel(d.opmerking, "opmerking", { max: 300, verplicht: false });
  if (d.akkoord !== true) throw new Ongeldig("Ga akkoord met de voorwaarden om te bestellen.", "akkoord");
  return { regels, naam, straat, postcode, plaats, land, mail, telefoon, opmerking };
}

const LANDEN = { NL: "Nederland", BE: "België" };

function totaalVan(o) {
  return o.regels.reduce((som, r) => som + r.prijs * r.aantal, 0);
}

function overzichtVan(o, nr, besteldOp) {
  return [
    "Bestelnummer: " + nr,
    "Besteld op: " + besteldOp,
    "",
    "Je bestelling",
    ...o.regels.map((r) => {
      const p = Object.prototype.hasOwnProperty.call(PRODUCTEN, r.id) ? PRODUCTEN[r.id] : null;
      const naam = p ? p.naam : r.id;
      const kleur = p && Object.prototype.hasOwnProperty.call(p.kleuren, r.kleur) ? p.kleuren[r.kleur] : r.kleur;
      return "- " + r.aantal + "× " + naam + " (" + kleur + ") " + euro(r.prijs * r.aantal);
    }),
    "Verzending: gratis",
    "Totaal, inclusief btw: " + euro(totaalVan(o)),
    "",
    "Bezorgadres",
    o.naam,
    o.straat,
    o.postcode + " " + o.plaats,
    LANDEN[o.land] || LANDEN.NL,
  ];
}

/* De vaste, wettelijk verplichte informatie in de bevestiging aan de klant. */
function klantMail(o, overzicht, betalen, test) {
  return [
    "Hoi " + o.naam.split(" ")[0] + ",",
    "",
    "Bedankt voor je bestelling bij Nestig. Hieronder staat alles op een rij. Bewaar deze mail.",
    test ? "\nLet op: dit was een testbetaling. Er is niets afgeschreven en er wordt niets geleverd." : null,
    "",
    ...overzicht,
    "",
    "Betalen",
    betalen,
    "",
    "Levering",
    "De levertijd is " + ZAAK.levertijd + " na je betaling. Je krijgt een track-en-tracecode zodra je pakket onderweg is. We bezorgen in Nederland en België.",
    "",
    "Bedenktijd en retourneren",
    "Je hebt 14 dagen bedenktijd vanaf de dag dat je je pakket ontvangt. Je aankoop ongedaan maken doe je hier: " + ZAAK.site + "/herroepen",
    "De kosten voor het terugsturen betaal je zelf. Het aankoopbedrag krijg je binnen 14 dagen na je herroeping terug. Alle regels en het formulier voor herroeping staan op " + ZAAK.site + "/retourneren",
    "",
    "Garantie",
    "Je hebt wettelijke garantie. Is het product niet goed, dan zorgen wij kosteloos voor herstel, een nieuw product of je geld terug.",
    "",
    "Op je bestelling zijn onze algemene voorwaarden van toepassing: " + ZAAK.site + "/algemene-voorwaarden",
    VOET,
  ].filter((x) => x !== null).join("\n");
}

async function bestelling(request, env) {
  const d = await leesInvoer(request);
  if (!env.RESEND_API_KEY) return json({ fout: "niet-ingesteld" }, 503);

  const o = leesBestelling(d);
  const totaal = totaalVan(o);
  const nr = nummer("N");

  /* Met Stripe: eerst betalen. De mails gaan pas weg als Stripe meldt dat er betaald is. */
  if (sleutelVan(env)) {
    const b = await maakBetaling(env, new URL(request.url).origin, nr, o);
    if (b) return json({ ok: true, nummer: nr, totaal: euro(totaal), betaalUrl: b.url, betaling: b.id });
    /* Stripe is niet bereikbaar of weigert: de bestelling gaat niet verloren, betalen gaat dan met een betaalverzoek. */
  }

  const overzicht = overzichtVan(o, nr, nu());

  /* Eerst naar Nestig: lukt dat niet, dan is de bestelling niet aangekomen en zeggen we dat eerlijk. */
  await stuurMail(env, {
    aan: env.MAIL_NAAR || ZAAK.email,
    antwoordNaar: o.mail,
    onderwerp: "Nieuwe bestelling " + nr + " (" + euro(totaal) + ")",
    tekst: [
      "Nieuwe bestelling via nestig.nl.",
      "",
      ...overzicht,
      "",
      "E-mail: " + o.mail,
      o.telefoon ? "Telefoon: " + o.telefoon : null,
      o.opmerking ? "Opmerking: " + o.opmerking : null,
      "",
      "Te doen: stuur een betaalverzoek van " + euro(totaal) + " naar " + o.mail + " en bestel daarna bij de leverancier.",
      sleutelVan(env) ? "Let op: betalen via Stripe lukte niet bij deze bestelling. Kijk in je Stripe-dashboard of er een storing is." : null,
    ].filter((x) => x !== null).join("\n"),
  });

  let bevestigd = true;
  try {
    await stuurMail(env, {
      aan: o.mail,
      antwoordNaar: ZAAK.email,
      onderwerp: "Je bestelling bij Nestig (" + nr + ")",
      tekst: klantMail(o, overzicht, "Je krijgt van ons een betaalverzoek voor iDEAL op dit e-mailadres, meestal dezelfde dag. Zodra je betaling binnen is, gaat je bestelling de deur uit."),
    });
  } catch (e) {
    bevestigd = false;
    console.error("bevestiging niet verstuurd", nr, e && e.message);
  }

  return json({ ok: true, nummer: nr, totaal: euro(totaal), bevestigd });
}

/* ---------- betalen via Stripe ---------- */

const BETAAL_ID = /^cs_(test|live)_[A-Za-z0-9]{10,120}$/;
const METHODEN = { ideal: "iDEAL", card: "een betaalkaart", bancontact: "Bancontact", paypal: "PayPal", klarna: "Klarna", link: "Link", sepa_debit: "SEPA-incasso", eps: "EPS", giropay: "giropay", sofort: "Sofort", amazon_pay: "Amazon Pay", revolut_pay: "Revolut Pay" };
const MAX_WAARDE = 480; /* Stripe bewaart per metadata-veld maximaal 500 tekens */
const DAG = 24 * 60 * 60 * 1000;

function sleutelVan(env) { return String(env.STRIPE_SECRET_KEY || ""); }

/* Stripe wil formuliervelden, geneste velden als a[b][0][c]. */
function formulier(obj, voor, uit) {
  uit = uit || new URLSearchParams();
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const naam = voor ? voor + "[" + k + "]" : k;
    if (Array.isArray(v)) v.forEach((x, i) => (x !== null && typeof x === "object") ? formulier(x, naam + "[" + i + "]", uit) : uit.append(naam + "[" + i + "]", String(x)));
    else if (typeof v === "object") formulier(v, naam, uit);
    else uit.append(naam, String(v));
  }
  return uit;
}

async function stripe(env, methode, pad, velden) {
  const r = await fetch("https://api.stripe.com/v1/" + pad, {
    method: methode,
    headers: { Authorization: "Bearer " + sleutelVan(env), "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: velden ? formulier(velden).toString() : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* geen json: data blijft leeg */ }
  return { ok: r.ok, status: r.status, data };
}

/* De bestelling klein opgeschreven, zodat hij als metadata bij de betaling past. */
function inpakken(nr, o) {
  const m = {
    nr,
    r: o.regels.map((r) => [r.id, r.kleur, r.aantal, r.prijs].join(":")).join(","),
    n: o.naam, s: o.straat, pc: o.postcode, pl: o.plaats, e: o.mail,
  };
  if (o.land === "BE") m.l = "BE";
  if (o.telefoon) m.t = o.telefoon;
  if (o.opmerking) m.o = o.opmerking.length > MAX_WAARDE ? o.opmerking.slice(0, MAX_WAARDE - 12).trimEnd() + " [ingekort]" : o.opmerking;
  for (const k of Object.keys(m)) m[k] = String(m[k]).slice(0, MAX_WAARDE);
  return m;
}

function uitpakken(m) {
  const tekst = (x) => String(x == null ? "" : x);
  const regels = tekst(m.r).split(",").map((x) => {
    const [id, kleur, aantal, prijs] = x.split(":");
    return { id, kleur, aantal: Number(aantal) || 0, prijs: Number(prijs) || 0 };
  }).filter((r) => r.id && r.aantal > 0);
  return {
    regels, naam: tekst(m.n), straat: tekst(m.s), postcode: tekst(m.pc), plaats: tekst(m.pl), land: m.l === "BE" ? "BE" : "NL",
    mail: tekst(m.e), telefoon: tekst(m.t), opmerking: tekst(m.o),
  };
}

/* Haalt een betaling op bij Stripe en zet hem om naar één vaste vorm:
   { id, status: "paid" | "open" | "pending" | "expired", test, bedrag, terug, aangemaakt, betaaldOp,
     methode, metadata, verder, pi } — of null als hij niet bestaat. */
async function haalBetaling(env, id) {
  const r = await stripe(env, "GET", "checkout/sessions/" + encodeURIComponent(id) + "?expand[]=payment_intent.latest_charge");
  if (r.status === 404) return null;
  if (!r.ok || !r.data) throw new Error("stripe " + r.status);
  const s = r.data;
  const pi = s.payment_intent && typeof s.payment_intent === "object" ? s.payment_intent : null;
  const ch = pi && pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  let status = "open";
  if (s.status === "complete") status = s.payment_status === "paid" ? "paid" : "pending";
  else if (s.status === "expired") status = "expired";
  return {
    id: s.id,
    status,
    test: s.livemode === false,
    bedrag: Number(s.amount_total) || 0,
    terug: ch ? (Number(ch.amount_refunded) || 0) + (ch.disputed ? 1 : 0) : 0,
    aangemaakt: s.created ? new Date(s.created * 1000).toISOString() : undefined,
    betaaldOp: ch && ch.created ? new Date(ch.created * 1000).toISOString() : undefined,
    methode: ch && ch.payment_method_details ? ch.payment_method_details.type : null,
    metadata: { ...(s.metadata || {}), ...((pi && pi.metadata) || {}) },
    verder: s.status === "open" && /^https:\/\//.test(s.url || "") ? s.url : null,
    pi: pi ? pi.id : null,
  };
}

/* Onthoudt iets bij de betaling (m = mails verstuurd, v = track-en-trace). */
async function noteer(env, p, velden) {
  if (!p.pi) return false;
  const r = await stripe(env, "POST", "payment_intents/" + encodeURIComponent(p.pi), { metadata: velden });
  return r.ok;
}

/* Maakt de betaalpagina aan. Geeft { id, url } terug, of null als het niet lukte. */
async function maakBetaling(env, herkomst, nr, o) {
  const basis = TOEGESTANE_HERKOMST.test(herkomst) ? herkomst : ZAAK.site;
  const meta = inpakken(nr, o);
  try {
    const r = await stripe(env, "POST", "checkout/sessions", {
      mode: "payment",
      locale: "nl",
      customer_email: o.mail,
      client_reference_id: nr,
      success_url: basis + "/bedankt?id={CHECKOUT_SESSION_ID}",
      cancel_url: basis + "/bestellen",
      line_items: o.regels.map((r) => ({
        quantity: r.aantal,
        price_data: {
          currency: "eur",
          unit_amount: r.prijs,
          product_data: { name: (PRODUCTEN[r.id] ? PRODUCTEN[r.id].naam : r.id) + (PRODUCTEN[r.id] && PRODUCTEN[r.id].kleuren[r.kleur] ? " (" + PRODUCTEN[r.id].kleuren[r.kleur] + ")" : "") },
        },
      })),
      metadata: { nr },
      payment_intent_data: { description: "Nestig bestelling " + nr, metadata: meta },
    });
    const s = r.data;
    if (!r.ok || !s || !BETAAL_ID.test(s.id || "") || !/^https:\/\//.test(s.url || "")) {
      console.error("stripe: betaling aanmaken mislukt", nr, r.status, s && s.error && s.error.message);
      return null;
    }
    if (s.amount_total !== totaalVan(o)) console.error("stripe: bedrag wijkt af", nr, s.amount_total, totaalVan(o));
    return { id: s.id, url: s.url };
  } catch (e) {
    console.error("stripe: niet bereikbaar", nr, e && e.message);
    return null;
  }
}

/* Is er betaald, dan gaan hier de mails weg: één keer per betaling.
   Drie dingen zorgen dat het bij één keer blijft: een vlag in de metadata van de betaling,
   een sleutel bij Resend, en we doen niets meer bij een oude of terugbetaalde betaling. */
async function verwerkBetaling(env, p) {
  const m = p && p.metadata;
  if (!p || p.status !== "paid" || !m || !m.nr) return "niets";
  if (m.m) return "al-gedaan";
  if (p.terug > 0) return "niets";
  if (p.betaaldOp && Date.now() - Date.parse(p.betaaldOp) > 3 * DAG) return "niets";

  const o = uitpakken(m);
  const nr = String(m.nr);
  const test = p.test;
  const betaald = p.bedrag;
  const overzicht = overzichtVan(o, nr, nu(p.aangemaakt));
  const hoe = METHODEN[p.methode] || "een online betaling";
  const merk = test ? "[TEST] " : "";

  let bevestigd = true;
  try {
    email(o.mail, "email");
    await stuurMail(env, {
      aan: o.mail,
      antwoordNaar: ZAAK.email,
      eenmalig: "klant-" + p.id,
      onderwerp: merk + "Je bestelling bij Nestig (" + nr + ")",
      tekst: klantMail(o, overzicht, "Je hebt " + euro(betaald) + " betaald met " + hoe + " op " + nu(p.betaaldOp) + ". Je betaling is binnen, dus je bestelling gaat de deur uit.", test),
    });
  } catch (e) {
    bevestigd = false;
    console.error("bevestiging niet verstuurd", nr, e && e.message);
  }

  /* Lukt de mail naar Nestig niet, dan geven we een fout terug en probeert Stripe het later opnieuw. */
  await stuurMail(env, {
    aan: env.MAIL_NAAR || ZAAK.email,
    antwoordNaar: o.mail,
    eenmalig: "zaak-" + p.id,
    onderwerp: merk + "Betaalde bestelling " + nr + " (" + euro(betaald) + ")",
    tekst: [
      test ? "TESTBETALING. Er is geen echt geld betaald. Bestel niets bij de leverancier.\n" : null,
      "Nieuwe bestelling via nestig.nl. De klant heeft betaald.",
      "",
      ...overzicht,
      "",
      "Betaald: " + euro(betaald) + " met " + hoe + " op " + nu(p.betaaldOp),
      "Betaling bij Stripe: " + (p.pi || p.id),
      betaald !== totaalVan(o) ? "LET OP: het betaalde bedrag is anders dan het totaal van de bestelling (" + euro(totaalVan(o)) + "). Kijk dit na voordat je bestelt." : null,
      "",
      "E-mail: " + o.mail,
      o.telefoon ? "Telefoon: " + o.telefoon : null,
      o.opmerking ? "Opmerking: " + o.opmerking : null,
      "",
      bevestigd ? "De klant heeft een bevestiging per e-mail gekregen." : "LET OP: de bevestiging naar de klant is niet aangekomen. Stuur de klant zelf een bevestiging.",
      test ? null : "Te doen: bestel bij de leverancier.",
      "",
      "Is het pakket verzonden? Mail de klant de track-en-tracecode via deze link:",
      ZAAK.site + "/verzonden?id=" + p.id + "&h=" + await handtekening(env, p.id),
      "Stuur deze link niet door: wie hem heeft, kan de verzendmail versturen.",
    ].filter((x) => x !== null).join("\n"),
  });

  try {
    if (!(await noteer(env, p, { m: "1" }))) console.error("stripe: vlag niet gezet", nr);
  } catch (e) {
    console.error("stripe: vlag niet gezet", nr, e && e.message);
  }
  return "verstuurd";
}

/* Controleert de handtekening die Stripe meestuurt (alleen als STRIPE_WEBHOOK_SECRET is ingesteld). */
async function echtVanStripe(env, ruw, kop) {
  const geheim = String(env.STRIPE_WEBHOOK_SECRET || "");
  if (!geheim) return true; /* zonder geheim: we vertrouwen alleen het id en halen de rest zelf op */
  const delen = Object.fromEntries(String(kop || "").split(",").map((x) => x.split("=")).filter((x) => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const t = Number(delen.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const handtekeningen = String(kop || "").split(",").filter((x) => x.trim().startsWith("v1=")).map((x) => x.trim().slice(3));
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(geheim), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const uit = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(t + "." + ruw))), (b) => b.toString(16).padStart(2, "0")).join("");
  return handtekeningen.some((h) => gelijk(h, uit));
}

function gelijk(a, b) {
  a = String(a); b = String(b);
  let verschil = a.length === b.length && a ? 0 : 1;
  for (let i = 0; i < a.length && i < b.length; i++) verschil |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return !verschil;
}

/* Stripe roept dit adres aan als er iets met een betaling gebeurt. We gebruiken alleen het id
   uit de melding: de echte status halen we zelf bij Stripe op, dus een nagemaakte melding kan niets in gang zetten. */
async function stripeMelding(request, env) {
  if (!sleutelVan(env) || !env.RESEND_API_KEY) return new Response("niet ingesteld", { status: 503 });
  const ruw = await request.text();
  if (ruw.length > 200000) return new Response("te groot", { status: 400 });
  if (!(await echtVanStripe(env, ruw, request.headers.get("Stripe-Signature")))) return new Response("handtekening klopt niet", { status: 400 });
  let ev;
  try { ev = JSON.parse(ruw); } catch (e) { return new Response("ok"); }
  const soort = ev && ev.type;
  if (soort !== "checkout.session.completed" && soort !== "checkout.session.async_payment_succeeded") return new Response("ok");
  const id = ev.data && ev.data.object && ev.data.object.id;
  if (!BETAAL_ID.test(id || "")) return new Response("ok");
  const p = await haalBetaling(env, id);
  if (!p) return new Response("ok");
  await verwerkBetaling(env, p);
  return new Response("ok");
}

/* Hoe wordt er nu betaald? Verklapt niets over de sleutel zelf, alleen de soort. */
function stand(env) {
  const sleutel = sleutelVan(env);
  return json({ betalen: !sleutel || !env.RESEND_API_KEY ? "verzoek" : sleutel.includes("_live_") ? "live" : "test" });
}

/* Voor de bedankpagina: hoe staat het met deze betaling? Geeft geen gegevens van de klant terug. */
async function betaling(url, env) {
  const id = url.searchParams.get("id") || "";
  if (!BETAAL_ID.test(id) || !sleutelVan(env)) return json({ status: "onbekend" }, 404);
  const p = await haalBetaling(env, id);
  if (!p) return json({ status: "onbekend" }, 404);
  const m = p.metadata || {};

  /* Vangnet: is er betaald en is de melding van Stripe (nog) niet verwerkt, dan doen we het hier. */
  if (p.status === "paid" && !m.m && env.RESEND_API_KEY) {
    try { await verwerkBetaling(env, p); } catch (e) { console.error("vangnet mislukt", id, e && e.message); }
  }

  return json({
    status: p.status,
    nummer: m.nr ? String(m.nr) : null,
    test: p.test,
    verder: p.verder,
  });
}

/* ---------- verzonden: track-en-trace naar de klant ---------- */

/* Ondertekent het id van een betaling met de Stripe-sleutel. Alleen de server kan dit maken en nakijken. */
async function handtekening(env, id) {
  const enc = new TextEncoder();
  const sleutel = await crypto.subtle.importKey("raw", enc.encode(sleutelVan(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const uit = new Uint8Array(await crypto.subtle.sign("HMAC", sleutel, enc.encode("verzonden:" + id)));
  return Array.from(uit.slice(0, 20), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* Haalt de betaalde bestelling op als id en handtekening kloppen. Anders een fout zonder uitleg. */
async function bestellingBijLink(env, id, h) {
  if (!sleutelVan(env) || !env.RESEND_API_KEY) throw new Ongeldig("Dit is nog niet ingesteld.");
  const goed = BETAAL_ID.test(id || "") ? await handtekening(env, id) : "";
  if (!goed || !gelijk(goed, h || "")) throw new Ongeldig("Deze link klopt niet. Gebruik de link uit de mail \"Betaalde bestelling\".");
  const p = await haalBetaling(env, id);
  if (!p) throw new Ongeldig("Deze bestelling bestaat niet meer.");
  const m = p.metadata;
  if (p.status !== "paid" || !m || !m.nr) throw new Ongeldig("Deze bestelling is niet betaald.");
  return { p, m, o: uitpakken(m) };
}

async function verzondenInfo(url, env) {
  const { p, m, o } = await bestellingBijLink(env, url.searchParams.get("id"), url.searchParams.get("h"));
  return json({
    nummer: String(m.nr),
    naam: o.naam,
    adres: o.straat + ", " + o.postcode + " " + o.plaats + ", " + (LANDEN[o.land] || LANDEN.NL),
    email: o.mail,
    regels: overzichtVan(o, String(m.nr), "").filter((x) => x.startsWith("- ")),
    al: m.v ? String(m.v) : null,
    test: p.test,
  });
}

async function verzonden(request, env) {
  if (!TOEGESTANE_HERKOMST.test(request.headers.get("Origin") || "")) throw new Ongeldig("Deze aanvraag komt niet van nestig.nl.");
  const ruw = await request.text();
  if (ruw.length > 2000) throw new Ongeldig("De aanvraag is te groot.");
  let d;
  try { d = JSON.parse(ruw); } catch (e) { throw new Ongeldig("De aanvraag is niet leesbaar."); }
  if (!d || typeof d !== "object") throw new Ongeldig("De aanvraag is niet leesbaar.");

  const { p, m, o } = await bestellingBijLink(env, d.id, d.h);
  const code = regel(d.code, "code", { min: 6, max: 40 }).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9-]{6,40}$/.test(code)) throw new Ongeldig("Vul de track-en-tracecode in, alleen letters en cijfers.", "code");
  let link = regel(d.link, "link", { max: 300, verplicht: false });
  if (link && !/^https:\/\/[^\s<>"']{4,}$/.test(link)) throw new Ongeldig("De volglink moet met https:// beginnen.", "link");
  if (!link) link = "https://t.17track.net/nl#nums=" + encodeURIComponent(code);
  if (m.v && d.opnieuw !== true) return json({ fout: "al-verstuurd", al: String(m.v) }, 409);

  const nr = String(m.nr);
  const test = p.test;
  email(o.mail, "email");
  await stuurMail(env, {
    aan: o.mail,
    antwoordNaar: ZAAK.email,
    eenmalig: d.opnieuw === true ? undefined : "verzonden-" + p.id + "-" + code,
    onderwerp: (test ? "[TEST] " : "") + "Je bestelling is onderweg (" + nr + ")",
    tekst: [
      "Hoi " + o.naam.split(" ")[0] + ",",
      "",
      "Goed nieuws: je bestelling " + nr + " is verzonden.",
      test ? "\nLet op: dit is een test. Er is niets verzonden." : null,
      "",
      "Track-en-tracecode: " + code,
      "Volg je pakket: " + link,
      "",
      "Je pakket komt van onze leverancier buiten Europa. Het kan een paar dagen duren voordat de code beweging laat zien. De verwachte levertijd is " + ZAAK.levertijd + " na je betaling.",
      "",
      ...overzichtVan(o, nr, nu(p.aangemaakt)).slice(3),
      "",
      "Je hebt 14 dagen bedenktijd vanaf de dag dat je je pakket ontvangt. Je aankoop ongedaan maken doe je hier: " + ZAAK.site + "/herroepen",
      VOET,
    ].filter((x) => x !== null).join("\n"),
  });

  try {
    if (!(await noteer(env, p, { v: code }))) console.error("stripe: verzonden niet genoteerd", nr);
  } catch (e) {
    console.error("stripe: verzonden niet genoteerd", nr, e && e.message);
  }
  return json({ ok: true, nummer: nr, email: o.mail });
}

/* ---------- herroeping ---------- */

async function herroeping(request, env) {
  const d = await leesInvoer(request);
  if (!env.RESEND_API_KEY) return json({ fout: "niet-ingesteld" }, 503);

  const naam = regel(d.naam, "naam", { min: 2, max: 80 });
  const mail = email(d.email, "email");
  const wat = regel(d.wat, "wat", { min: 2, max: 200 });
  const datum = regel(d.datum, "datum", { max: 80, verplicht: false });

  const nr = nummer("H");
  const wanneer = nu();
  const inhoud = [
    "Kenmerk: " + nr,
    "Ontvangen op: " + wanneer,
    "Naam: " + naam,
    "Product: " + wat,
    datum ? "Besteld of ontvangen: " + datum : null,
  ].filter((x) => x !== null);

  await stuurMail(env, {
    aan: env.MAIL_NAAR || ZAAK.email,
    antwoordNaar: mail,
    onderwerp: "Herroeping " + nr,
    tekst: ["Herroeping via nestig.nl.", "", ...inhoud, "E-mail: " + mail, "", "Te doen: betaal het aankoopbedrag terug binnen 14 dagen na vandaag. Je mag wachten tot het product binnen is of tot je een verzendbewijs hebt."].join("\n"),
  });

  let bevestigd = true;
  try {
    await stuurMail(env, {
      aan: mail,
      antwoordNaar: ZAAK.email,
      onderwerp: "We hebben je herroeping ontvangen (" + nr + ")",
      tekst: [
        "Hoi " + naam.split(" ")[0] + ",",
        "",
        "We hebben je herroeping ontvangen. Dit is je bevestiging. Bewaar deze mail.",
        "",
        ...inhoud,
        "",
        "Zo gaat het verder",
        "1. Stuur het product binnen 14 dagen terug naar:",
        "   " + ZAAK.naam + ", " + ZAAK.straat + ", " + ZAAK.postcodePlaats,
        "2. Bewaar je verzendbewijs. De kosten voor het terugsturen betaal je zelf.",
        "3. Wij betalen het aankoopbedrag terug binnen 14 dagen na vandaag, op dezelfde manier als waarop je betaald hebt. We mogen daarmee wachten tot het product binnen is of tot je ons het verzendbewijs stuurt.",
        "",
        "Alle regels staan op " + ZAAK.site + "/retourneren",
        VOET,
      ].join("\n"),
    });
  } catch (e) {
    bevestigd = false;
    console.error("ontvangstbevestiging niet verstuurd", nr, e && e.message);
  }

  return json({ ok: true, nummer: nr, ontvangen: wanneer, bevestigd });
}
