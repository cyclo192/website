/* Nestig — server-kant van de shop (Cloudflare Pages, advanced mode).

   Draait alleen voor /api/* (zie _routes.json). Alle andere pagina's worden
   rechtstreeks als bestand geserveerd.

   /api/bestelling   bestelling aannemen. Met Mollie: betaling aanmaken en de klant
                     naar de betaalpagina sturen. Zonder Mollie: mail naar de klant
                     en naar Nestig, betalen gaat dan met een betaalverzoek.
   /api/mollie       hier meldt Mollie dat de status van een betaling is veranderd.
                     Is er betaald, dan gaan de bevestigingsmails de deur uit.
   /api/stand        hoe er nu betaald wordt: "live", "test" of "verzoek". De bestelpagina
                     toont een melding zolang Mollie in testmodus staat.
   /api/betaling     status van een betaling, voor de bedankpagina
   /api/verzonden    alleen voor Nestig zelf: track-en-tracecode naar de klant mailen.
                     De link ernaartoe staat in de mail "Betaalde bestelling" en is
                     ondertekend, dus alleen wie die mail heeft kan dit gebruiken.
   /api/herroeping   herroeping aannemen, ontvangstbevestiging naar de klant

   Instellingen (Cloudflare > Pages > nestig > Settings > Variables and secrets):
     RESEND_API_KEY   geheim, sleutel van resend.com. Zonder sleutel geeft de API
                      503 terug en valt de site terug op bestellen via WhatsApp.
     MOLLIE_API_KEY   geheim, sleutel van mollie.com (test_... of live_...). Zonder
                      sleutel blijft betalen met een betaalverzoek werken.
     MAIL_VAN         optioneel, standaard "Nestig <bestelling@nestig.nl>"
     MAIL_NAAR        optioneel, waar bestellingen binnenkomen

   Er is geen database. Tussen bestellen en betalen bewaart Mollie de bestelling
   als "metadata" bij de betaling. Die is maximaal ongeveer 1 kB groot.

   De prijzen hieronder zijn leidend. Wat de browser meestuurt aan prijzen
   wordt genegeerd. Houd deze lijst gelijk aan js/shop.js. */

const PRODUCTEN = {
  kattenhangmat: {
    naam: "Kattenhangmat voor het raam",
    prijs: 2795,
    kleuren: { beige: "Beige", zwart: "Zwart", blauw: "Lichtblauw", roze: "Roze", lila: "Lila" },
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
        if (url.pathname === "/api/mollie") return await mollieMelding(request, env);
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
  const postcode = regel(d.postcode, "postcode", { min: 6, max: 7 }).toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2");
  if (!/^[1-9]\d{3} [A-Z]{2}$/.test(postcode)) throw new Ongeldig("Vul een postcode in zoals 1441 AB.", "postcode");
  const plaats = regel(d.plaats, "plaats", { min: 2, max: 60 });
  const mail = email(d.email, "email");
  const telefoon = regel(d.telefoon, "telefoon", { max: 20, verplicht: false });
  const opmerking = regel(d.opmerking, "opmerking", { max: 300, verplicht: false });
  if (d.akkoord !== true) throw new Ongeldig("Ga akkoord met de voorwaarden om te bestellen.", "akkoord");
  return { regels, naam, straat, postcode, plaats, mail, telefoon, opmerking };
}

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
    "De levertijd is " + ZAAK.levertijd + " na je betaling. Je krijgt een track-en-tracecode zodra je pakket onderweg is. We bezorgen in Nederland.",
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

  /* Met Mollie: eerst betalen. De mails gaan pas weg als Mollie meldt dat er betaald is. */
  if (env.MOLLIE_API_KEY) {
    const b = await maakBetaling(env, new URL(request.url).origin, nr, o);
    if (b) return json({ ok: true, nummer: nr, totaal: euro(totaal), betaalUrl: b.url, betaling: b.id });
    /* Mollie is niet bereikbaar of weigert: de bestelling gaat niet verloren, betalen gaat dan met een betaalverzoek. */
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
      env.MOLLIE_API_KEY ? "Let op: betalen via Mollie lukte niet bij deze bestelling. Kijk in je Mollie-dashboard of er een storing is." : null,
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

/* ---------- betalen via Mollie ---------- */

const MOLLIE_ID = /^tr_[A-Za-z0-9]{6,40}$/;
const METHODEN = { ideal: "iDEAL", creditcard: "creditcard", bancontact: "Bancontact", applepay: "Apple Pay", googlepay: "Google Pay", paypal: "PayPal", banktransfer: "een overboeking", klarna: "Klarna", in3: "in3", riverty: "Riverty" };
const MAX_METADATA = 900; /* bytes; Mollie bewaart ongeveer 1 kB */
const DAG = 24 * 60 * 60 * 1000;

async function mollie(env, methode, pad, body) {
  const r = await fetch("https://api.mollie.com/v2/" + pad, {
    method: methode,
    headers: { Authorization: "Bearer " + env.MOLLIE_API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* geen json: data blijft leeg */ }
  return { ok: r.ok, status: r.status, data };
}

/* De bestelling zo klein mogelijk opgeschreven, zodat hij als metadata bij de betaling past. */
function inpakken(nr, o) {
  const m = {
    nr,
    r: o.regels.map((r) => [r.id, r.kleur, r.aantal, r.prijs].join(":")),
    n: o.naam, s: o.straat, pc: o.postcode, pl: o.plaats, e: o.mail,
  };
  if (o.telefoon) m.t = o.telefoon;
  if (o.opmerking) {
    const grootte = () => new TextEncoder().encode(JSON.stringify(m)).length;
    let tekst = o.opmerking;
    m.o = tekst;
    while (tekst && grootte() > MAX_METADATA) {
      tekst = tekst.slice(0, -10);
      m.o = tekst ? tekst.trimEnd() + " [ingekort]" : undefined;
    }
    if (!m.o) delete m.o;
  }
  return m;
}

function uitpakken(m) {
  const tekst = (x) => String(x == null ? "" : x);
  const regels = (Array.isArray(m.r) ? m.r : []).map((x) => {
    const [id, kleur, aantal, prijs] = tekst(x).split(":");
    return { id, kleur, aantal: Number(aantal) || 0, prijs: Number(prijs) || 0 };
  }).filter((r) => r.id && r.aantal > 0);
  return {
    regels, naam: tekst(m.n), straat: tekst(m.s), postcode: tekst(m.pc), plaats: tekst(m.pl),
    mail: tekst(m.e), telefoon: tekst(m.t), opmerking: tekst(m.o),
  };
}

function centen(bedrag) {
  return bedrag && bedrag.value ? Math.round(parseFloat(bedrag.value) * 100) : 0;
}

/* Maakt de betaling aan. Geeft { id, url } terug, of null als het niet lukte. */
async function maakBetaling(env, herkomst, nr, o) {
  const basis = TOEGESTANE_HERKOMST.test(herkomst) ? herkomst : ZAAK.site;
  try {
    const r = await mollie(env, "POST", "payments", {
      amount: { currency: "EUR", value: (totaalVan(o) / 100).toFixed(2) },
      description: "Nestig bestelling " + nr,
      redirectUrl: basis + "/bedankt",
      webhookUrl: basis + "/api/mollie",
      locale: "nl_NL",
      metadata: inpakken(nr, o),
    });
    const p = r.data;
    const url = p && p._links && p._links.checkout && p._links.checkout.href;
    if (!r.ok || !p || !MOLLIE_ID.test(p.id || "") || !/^https:\/\//.test(url || "")) {
      console.error("mollie: betaling aanmaken mislukt", nr, r.status, p && p.detail);
      return null;
    }
    /* Na het betalen komt de klant terug op de bedankpagina. Die moet weten om welke betaling het gaat,
       ook als de bank de klant in een andere browser terugzet. Lukt dit niet, dan onthoudt de browser het. */
    try {
      const bij = await mollie(env, "PATCH", "payments/" + p.id, { redirectUrl: basis + "/bedankt?id=" + p.id });
      if (!bij.ok) console.error("mollie: terugkeeradres niet bijgewerkt", nr, bij.status);
    } catch (e) {
      console.error("mollie: terugkeeradres niet bijgewerkt", nr, e && e.message);
    }
    return { id: p.id, url };
  } catch (e) {
    console.error("mollie: niet bereikbaar", nr, e && e.message);
    return null;
  }
}

/* Is er betaald, dan gaan hier de mails weg: één keer per betaling.
   Drie dingen zorgen dat het bij één keer blijft: een vlag in de metadata van de betaling,
   een sleutel bij Resend, en we doen niets meer bij een oude of terugbetaalde betaling
   (Mollie meldt zich ook bij een terugbetaling). */
async function verwerkBetaling(env, p) {
  const m = p && p.metadata;
  if (!p || p.status !== "paid" || !m || typeof m !== "object" || !m.nr) return "niets";
  if (m.m) return "al-gedaan";
  if (centen(p.amountRefunded) > 0 || centen(p.amountChargedBack) > 0) return "niets";
  if (p.paidAt && Date.now() - Date.parse(p.paidAt) > 3 * DAG) return "niets";

  const o = uitpakken(m);
  const nr = String(m.nr);
  const test = p.mode === "test";
  const betaald = centen(p.amount);
  const overzicht = overzichtVan(o, nr, nu(p.createdAt));
  const hoe = METHODEN[p.method] || p.method || "een online betaling";
  const merk = test ? "[TEST] " : "";

  let bevestigd = true;
  try {
    email(o.mail, "email");
    await stuurMail(env, {
      aan: o.mail,
      antwoordNaar: ZAAK.email,
      eenmalig: "klant-" + p.id,
      onderwerp: merk + "Je bestelling bij Nestig (" + nr + ")",
      tekst: klantMail(o, overzicht, "Je hebt " + euro(betaald) + " betaald met " + hoe + " op " + nu(p.paidAt) + ". Je betaling is binnen, dus je bestelling gaat de deur uit.", test),
    });
  } catch (e) {
    bevestigd = false;
    console.error("bevestiging niet verstuurd", nr, e && e.message);
  }

  /* Lukt de mail naar Nestig niet, dan geven we een fout terug en probeert Mollie het later opnieuw. */
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
      "Betaald: " + euro(betaald) + " met " + hoe + " op " + nu(p.paidAt),
      "Betaling bij Mollie: " + p.id,
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
    const bij = await mollie(env, "PATCH", "payments/" + p.id, { metadata: { ...m, m: 1 } });
    if (!bij.ok) console.error("mollie: vlag niet gezet", nr, bij.status);
  } catch (e) {
    console.error("mollie: vlag niet gezet", nr, e && e.message);
  }
  return "verstuurd";
}

/* Mollie roept dit adres aan als de status van een betaling verandert. Er komt alleen een id mee:
   de echte status halen we zelf bij Mollie op, dus een nagemaakte melding kan niets in gang zetten. */
async function mollieMelding(request, env) {
  if (!env.MOLLIE_API_KEY || !env.RESEND_API_KEY) return new Response("niet ingesteld", { status: 503 });
  const ruw = await request.text();
  const id = ruw.length <= 500 ? new URLSearchParams(ruw).get("id") || "" : "";
  if (!MOLLIE_ID.test(id)) return new Response("ok");
  const r = await mollie(env, "GET", "payments/" + id);
  if (r.status === 404) return new Response("ok");
  if (!r.ok || !r.data) throw new Error("mollie " + r.status);
  await verwerkBetaling(env, r.data);
  return new Response("ok");
}

/* Hoe wordt er nu betaald? Verklapt niets over de sleutel zelf, alleen de soort. */
function stand(env) {
  const sleutel = String(env.MOLLIE_API_KEY || "");
  return json({ betalen: !sleutel || !env.RESEND_API_KEY ? "verzoek" : sleutel.startsWith("live_") ? "live" : "test" });
}

/* Voor de bedankpagina: hoe staat het met deze betaling? Geeft geen gegevens van de klant terug. */
async function betaling(url, env) {
  const id = url.searchParams.get("id") || "";
  if (!MOLLIE_ID.test(id) || !env.MOLLIE_API_KEY) return json({ status: "onbekend" }, 404);
  const r = await mollie(env, "GET", "payments/" + id);
  if (r.status === 404) return json({ status: "onbekend" }, 404);
  if (!r.ok || !r.data) throw new Error("mollie " + r.status);
  const p = r.data;
  const m = p.metadata && typeof p.metadata === "object" ? p.metadata : {};

  /* Vangnet: is er al een minuut betaald en is de melding van Mollie niet verwerkt, dan doen we het hier. */
  if (p.status === "paid" && !m.m && env.RESEND_API_KEY && p.paidAt && Date.now() - Date.parse(p.paidAt) > 60000) {
    try { await verwerkBetaling(env, p); } catch (e) { console.error("vangnet mislukt", id, e && e.message); }
  }

  const verder = p.status === "open" && p._links && p._links.checkout && p._links.checkout.href;
  return json({
    status: String(p.status || "onbekend"),
    nummer: m.nr ? String(m.nr) : null,
    test: p.mode === "test",
    verder: /^https:\/\//.test(verder || "") ? verder : null,
  });
}

/* ---------- verzonden: track-en-trace naar de klant ---------- */

/* Ondertekent het id van een betaling met de Mollie-sleutel. Alleen de server kan dit maken en nakijken. */
async function handtekening(env, id) {
  const enc = new TextEncoder();
  const sleutel = await crypto.subtle.importKey("raw", enc.encode(env.MOLLIE_API_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const uit = new Uint8Array(await crypto.subtle.sign("HMAC", sleutel, enc.encode("verzonden:" + id)));
  return Array.from(uit.slice(0, 20), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* Haalt de betaalde bestelling op als id en handtekening kloppen. Anders een fout zonder uitleg. */
async function bestellingBijLink(env, id, h) {
  if (!env.MOLLIE_API_KEY || !env.RESEND_API_KEY) throw new Ongeldig("Dit is nog niet ingesteld.");
  const goed = MOLLIE_ID.test(id || "") ? await handtekening(env, id) : "";
  const kreeg = String(h || "");
  let verschil = goed.length === kreeg.length && goed ? 0 : 1;
  for (let i = 0; i < goed.length && i < kreeg.length; i++) verschil |= goed.charCodeAt(i) ^ kreeg.charCodeAt(i);
  if (verschil) throw new Ongeldig("Deze link klopt niet. Gebruik de link uit de mail \"Betaalde bestelling\".");
  const r = await mollie(env, "GET", "payments/" + id);
  if (r.status === 404) throw new Ongeldig("Deze bestelling bestaat niet meer.");
  if (!r.ok || !r.data) throw new Error("mollie " + r.status);
  const p = r.data;
  const m = p.metadata;
  if (p.status !== "paid" || !m || typeof m !== "object" || !m.nr) throw new Ongeldig("Deze bestelling is niet betaald.");
  return { p, m, o: uitpakken(m) };
}

async function verzondenInfo(url, env) {
  const { p, m, o } = await bestellingBijLink(env, url.searchParams.get("id"), url.searchParams.get("h"));
  return json({
    nummer: String(m.nr),
    naam: o.naam,
    adres: o.straat + ", " + o.postcode + " " + o.plaats,
    email: o.mail,
    regels: overzichtVan(o, String(m.nr), "").filter((x) => x.startsWith("- ")),
    al: m.v ? String(m.v) : null,
    test: p.mode === "test",
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
  const test = p.mode === "test";
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
      ...overzichtVan(o, nr, nu(p.createdAt)).slice(3),
      "",
      "Je hebt 14 dagen bedenktijd vanaf de dag dat je je pakket ontvangt. Je aankoop ongedaan maken doe je hier: " + ZAAK.site + "/herroepen",
      VOET,
    ].filter((x) => x !== null).join("\n"),
  });

  try {
    const bij = await mollie(env, "PATCH", "payments/" + p.id, { metadata: { ...m, v: code } });
    if (!bij.ok) console.error("mollie: verzonden niet genoteerd", nr, bij.status);
  } catch (e) {
    console.error("mollie: verzonden niet genoteerd", nr, e && e.message);
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
