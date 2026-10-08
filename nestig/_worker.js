/* Nestig — server-kant van de shop (Cloudflare Pages, advanced mode).

   Draait alleen voor /api/* (zie _routes.json). Alle andere pagina's worden
   rechtstreeks als bestand geserveerd.

   /api/bestelling   bestelling aannemen, mail naar de klant en naar Nestig
   /api/herroeping   herroeping aannemen, ontvangstbevestiging naar de klant

   Instellingen (Cloudflare > Pages > nestig > Settings > Variables and secrets):
     RESEND_API_KEY   geheim, sleutel van resend.com. Zonder sleutel geeft de API
                      503 terug en valt de site terug op bestellen via WhatsApp.
     MAIL_VAN         optioneel, standaard "Nestig <bestelling@nestig.nl>"
     MAIL_NAAR        optioneel, waar bestellingen binnenkomen

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
        if (request.method !== "POST") return json({ fout: "Alleen POST" }, 405);
        if (url.pathname === "/api/bestelling") return await bestelling(request, env);
        if (url.pathname === "/api/herroeping") return await herroeping(request, env);
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

function nu() {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "long", timeStyle: "short" }).format(new Date());
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

async function stuurMail(env, { aan, onderwerp, tekst, antwoordNaar }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_VAN || "Nestig <bestelling@nestig.nl>",
      to: [aan],
      reply_to: antwoordNaar,
      subject: onderwerp,
      text: tekst,
      html: alsHtml(tekst),
    }),
  });
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

async function bestelling(request, env) {
  const d = await leesInvoer(request);
  if (!env.RESEND_API_KEY) return json({ fout: "niet-ingesteld" }, 503);

  if (!Array.isArray(d.regels) || d.regels.length < 1 || d.regels.length > MAX_REGELS) throw new Ongeldig("Je winkelmand is leeg.", "regels");
  let totaal = 0;
  const regels = d.regels.map((r) => {
    const p = r && Object.prototype.hasOwnProperty.call(PRODUCTEN, r.id) ? PRODUCTEN[r.id] : null;
    if (!p || !Object.prototype.hasOwnProperty.call(p.kleuren, r.kleur)) throw new Ongeldig("Een product in je winkelmand bestaat niet meer.", "regels");
    const aantal = Number(r.aantal);
    if (!Number.isInteger(aantal) || aantal < 1 || aantal > MAX_PER_REGEL) throw new Ongeldig("Het aantal klopt niet.", "regels");
    totaal += p.prijs * aantal;
    return "- " + aantal + "× " + p.naam + " (" + p.kleuren[r.kleur] + ") " + euro(p.prijs * aantal);
  });

  const naam = regel(d.naam, "naam", { min: 2, max: 80 });
  const straat = regel(d.straat, "straat", { min: 3, max: 100 });
  const postcode = regel(d.postcode, "postcode", { min: 6, max: 7 }).toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2");
  if (!/^[1-9]\d{3} [A-Z]{2}$/.test(postcode)) throw new Ongeldig("Vul een postcode in zoals 1441 AB.", "postcode");
  const plaats = regel(d.plaats, "plaats", { min: 2, max: 60 });
  const mail = email(d.email, "email");
  const telefoon = regel(d.telefoon, "telefoon", { max: 20, verplicht: false });
  const opmerking = regel(d.opmerking, "opmerking", { max: 500, verplicht: false });
  if (d.akkoord !== true) throw new Ongeldig("Ga akkoord met de voorwaarden om te bestellen.", "akkoord");

  const nr = nummer("N");
  const wanneer = nu();
  const overzicht = [
    "Bestelnummer: " + nr,
    "Besteld op: " + wanneer,
    "",
    "Je bestelling",
    ...regels,
    "Verzending: gratis",
    "Totaal, inclusief btw: " + euro(totaal),
    "",
    "Bezorgadres",
    naam,
    straat,
    postcode + " " + plaats,
  ];

  /* Eerst naar Nestig: lukt dat niet, dan is de bestelling niet aangekomen en zeggen we dat eerlijk. */
  await stuurMail(env, {
    aan: env.MAIL_NAAR || ZAAK.email,
    antwoordNaar: mail,
    onderwerp: "Nieuwe bestelling " + nr + " (" + euro(totaal) + ")",
    tekst: [
      "Nieuwe bestelling via nestig.nl.",
      "",
      ...overzicht,
      "",
      "E-mail: " + mail,
      telefoon ? "Telefoon: " + telefoon : null,
      opmerking ? "Opmerking: " + opmerking : null,
      "",
      "Te doen: stuur een betaalverzoek van " + euro(totaal) + " naar " + mail + " en bestel daarna bij de leverancier.",
    ].filter((x) => x !== null).join("\n"),
  });

  let bevestigd = true;
  try {
    await stuurMail(env, {
      aan: mail,
      antwoordNaar: ZAAK.email,
      onderwerp: "Je bestelling bij Nestig (" + nr + ")",
      tekst: [
        "Hoi " + naam.split(" ")[0] + ",",
        "",
        "Bedankt voor je bestelling bij Nestig. Hieronder staat alles op een rij. Bewaar deze mail.",
        "",
        ...overzicht,
        "",
        "Betalen",
        "Je krijgt van ons een betaalverzoek voor iDEAL op dit e-mailadres, meestal dezelfde dag. Zodra je betaling binnen is, gaat je bestelling de deur uit.",
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
      ].join("\n"),
    });
  } catch (e) {
    bevestigd = false;
    console.error("bevestiging niet verstuurd", nr, e && e.message);
  }

  return json({ ok: true, nummer: nr, totaal: euro(totaal), bevestigd });
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
