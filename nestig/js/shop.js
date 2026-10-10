/* Nestig — winkelmand en bestelformulier.

   PRODUCTEN: alles wat je verkoopt. Prijs in centen.
   Een product toevoegen = hier een blok bijzetten en een pagina maken.

   Bestellen en herroepen gaan naar de server-kant in _worker.js. Is Mollie
   gekoppeld, dan stuurt de server een betaaladres terug en gaat de klant
   daarheen; na het betalen komt hij terug op bedankt.html. Zonder Mollie
   stuurt de server een bevestigingsmail en betaal je met een betaalverzoek.
   Lukt de server niet, dan valt de site terug op een bericht via WhatsApp.
   Prijzen staan ook in _worker.js: houd beide lijsten gelijk. */

const NESTIG = {
  whatsapp: "31626683986",
  email: "infobyxavio@gmail.com",
};

const PRODUCTEN = {
  kattenhangmat: {
    naam: "Kattenhangmat voor het raam",
    prijs: 2795,
    url: "kattenhangmat.html",
    kleuren: {
      beige: { naam: "Beige", foto: "img/hangmat-beige.jpg" },
      zwart: { naam: "Zwart", foto: "img/hangmat-zwart.jpg" },
      blauw: { naam: "Lichtblauw", foto: "img/hangmat-blauw.jpg" },
      roze: { naam: "Roze", foto: "img/hangmat-roze.jpg" },
      lila: { naam: "Lila", foto: "img/hangmat-lila.jpg" },
    },
  },
};

const MAX_PER_REGEL = 10;
const GELADEN = Date.now();

/* Stuurt een formulier naar de server-kant (_worker.js). Geeft { status, data } terug, of null als het niet lukte. */
async function stuurNaarServer(pad, gegevens) {
  try {
    const r = await fetch(pad, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...gegevens, t: Date.now() - GELADEN }),
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  } catch (e) {
    return null;
  }
}

/* ---------- winkelmand (in de browser van de klant) ---------- */

let geheugen = [];
function leesMand() {
  try {
    const ruw = JSON.parse(localStorage.getItem("nestig-mand") || "[]");
    if (Array.isArray(ruw)) geheugen = ruw;
  } catch (e) { /* privévenster of opslag geblokkeerd: mand leeft dan alleen op deze pagina */ }
  geheugen = geheugen.filter((r) => PRODUCTEN[r.id] && PRODUCTEN[r.id].kleuren[r.kleur] && r.aantal > 0);
  return geheugen;
}
function bewaarMand(mand) {
  geheugen = mand;
  try { localStorage.setItem("nestig-mand", JSON.stringify(mand)); } catch (e) { /* zie boven */ }
  toonAantal();
}
function voegToe(id, kleur, aantal) {
  const mand = leesMand();
  const regel = mand.find((r) => r.id === id && r.kleur === kleur);
  if (regel) regel.aantal = Math.min(MAX_PER_REGEL, regel.aantal + aantal);
  else mand.push({ id, kleur, aantal: Math.min(MAX_PER_REGEL, aantal) });
  bewaarMand(mand);
}
function euro(centen) {
  return "€ " + (centen / 100).toFixed(2).replace(".", ",");
}
function totaal(mand) {
  return mand.reduce((som, r) => som + PRODUCTEN[r.id].prijs * r.aantal, 0);
}
function toonAantal() {
  const n = leesMand().reduce((som, r) => som + r.aantal, 0);
  document.querySelectorAll("[data-mand-aantal]").forEach((el) => { el.textContent = n; });
  document.querySelectorAll("[data-mand-link]").forEach((el) => {
    el.setAttribute("aria-label", n === 1 ? "Winkelmand, 1 product" : "Winkelmand, " + n + " producten");
  });
}

/* ---------- onthouden tussen bestellen en betalen ---------- */

/* Wat de klant invulde blijft in dit tabblad bewaard, zodat hij na een mislukte betaling niet opnieuw hoeft te typen. */
const FORMVELDEN = ["naam", "straat", "postcode", "plaats", "email", "telefoon", "opmerking"];
function bewaarFormulier(form) {
  try {
    const wat = {};
    FORMVELDEN.forEach((n) => { wat[n] = form.elements[n].value; });
    sessionStorage.setItem("nestig-form", JSON.stringify(wat));
  } catch (e) { /* opslag geblokkeerd: dan typt de klant het opnieuw */ }
}
function herstelFormulier(form) {
  try {
    const wat = JSON.parse(sessionStorage.getItem("nestig-form") || "{}");
    FORMVELDEN.forEach((n) => { if (typeof wat[n] === "string" && !form.elements[n].value) form.elements[n].value = wat[n]; });
  } catch (e) { /* zie boven */ }
}
function wisFormulier() {
  try { sessionStorage.removeItem("nestig-form"); } catch (e) { /* zie boven */ }
}

/* De lopende betaling: het id van Mollie, voor als de bank de klant zonder id terugstuurt. */
const BETAAL_ID = /^tr_[A-Za-z0-9]{6,40}$/;
function bewaarBetaling(id) {
  try { localStorage.setItem("nestig-betaling", JSON.stringify({ id, op: Date.now() })); } catch (e) { /* zie boven */ }
}
function leesBetaling() {
  try {
    const b = JSON.parse(localStorage.getItem("nestig-betaling") || "null");
    if (b && BETAAL_ID.test(b.id) && Date.now() - b.op < 24 * 60 * 60 * 1000) return b.id;
  } catch (e) { /* zie boven */ }
  return null;
}
function wisBetaling() {
  try { localStorage.removeItem("nestig-betaling"); } catch (e) { /* zie boven */ }
}

/* ---------- tellers (− 1 +) ---------- */

function koppelTeller(wortel, bijWijziging) {
  const veld = wortel.querySelector("input");
  const zet = (waarde) => {
    const n = Math.max(1, Math.min(MAX_PER_REGEL, parseInt(waarde, 10) || 1));
    veld.value = n;
    if (bijWijziging) bijWijziging(n);
  };
  wortel.querySelector("[data-min]").addEventListener("click", () => zet(+veld.value - 1));
  wortel.querySelector("[data-plus]").addEventListener("click", () => zet(+veld.value + 1));
  veld.addEventListener("change", () => zet(veld.value));
}

/* ---------- productpagina ---------- */

function startProduct() {
  const form = document.querySelector("[data-product]");
  if (!form) return;
  const id = form.dataset.product;
  const product = PRODUCTEN[id];
  const hoofdfoto = document.querySelector("[data-hoofdfoto]");
  const duimen = Array.from(document.querySelectorAll("[data-duim]"));
  const gekozen = document.querySelector("[data-gekozen-kleur]");
  const klaar = document.querySelector("[data-toegevoegd]");

  const kleurNu = () => form.querySelector("input[name=kleur]:checked").value;
  const toonFoto = (knop) => {
    duimen.forEach((d) => d.setAttribute("aria-pressed", d === knop ? "true" : "false"));
    if (knop.dataset.duim === "kleur") {
      const k = product.kleuren[kleurNu()];
      hoofdfoto.src = k.foto;
      hoofdfoto.alt = "Witte kat op de kattenhangmat aan het raam, kleur " + k.naam.toLowerCase();
    } else {
      hoofdfoto.src = knop.dataset.src;
      hoofdfoto.alt = knop.dataset.alt;
    }
  };
  duimen.forEach((d) => d.addEventListener("click", () => toonFoto(d)));
  const toonKleur = () => {
    const k = product.kleuren[kleurNu()];
    if (gekozen) gekozen.textContent = k.naam;
    const duimfoto = document.querySelector("[data-duimfoto]");
    if (duimfoto) duimfoto.src = k.foto;
    if (duimen.length) toonFoto(duimen[0]);
  };
  form.querySelectorAll("input[name=kleur]").forEach((el) => el.addEventListener("change", toonKleur));
  toonKleur();

  koppelTeller(form.querySelector(".teller"));

  const balk = document.querySelector("[data-koopbalk]");
  const inMand = () => {
    const aantal = parseInt(form.querySelector(".teller input").value, 10) || 1;
    voegToe(id, kleurNu(), aantal);
    const tekst = aantal + "× " + product.kleuren[kleurNu()].naam.toLowerCase() + " ligt in je winkelmand.";
    klaar.hidden = false;
    klaar.querySelector("[data-toegevoegd-tekst]").textContent = tekst;
    if (balk) {
      balk.querySelector("[data-koopbalk-tekst]").textContent = "Toegevoegd";
      balk.querySelector("[data-koopbalk-knop]").hidden = true;
      balk.querySelector("[data-koopbalk-verder]").hidden = false;
    }
    return tekst;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    inMand();
    klaar.querySelector("a").focus();
  });

  /* Koopbalk onderaan (telefoon): verschijnt zodra de gewone knop uit beeld is. */
  if (balk && "IntersectionObserver" in window) {
    const knop = form.querySelector("button[type=submit]");
    new IntersectionObserver(([e]) => {
      const voorbij = !e.isIntersecting && e.boundingClientRect.top < 0;
      balk.hidden = !voorbij;
      document.body.classList.toggle("met-balk", voorbij);
    }).observe(knop);
    balk.querySelector("[data-koopbalk-knop]").addEventListener("click", inMand);
  }
}

/* ---------- aankoop ongedaan maken ---------- */

function startHerroepen() {
  const form = document.querySelector("[data-herroepform]");
  if (!form) return;
  const melding = form.querySelector("[data-melding]");
  const klaar = document.querySelector("[data-herroepen-klaar]");
  const knop = form.querySelector("button[type=submit]");
  const v = (naam) => (form.elements[naam].value || "").trim();

  function verklaring() {
    const regels = [
      "Ik deel u hierbij mee dat ik onze overeenkomst over de verkoop van het volgende product herroep:",
      "",
      "Product: " + v("wat"),
    ];
    if (v("datum")) regels.push("Besteld of ontvangen: " + v("datum"));
    regels.push("Naam: " + v("naam"), "E-mail: " + v("email"), "Datum van dit bericht: " + new Date().toLocaleDateString("nl-NL"));
    return regels.join("\n");
  }
  function meld(tekst, fout) {
    melding.hidden = false;
    melding.classList.toggle("fout", !!fout);
    melding.querySelector("[data-melding-tekst]").textContent = tekst;
  }
  /* Terugval: de herroeping als bericht klaarzetten in WhatsApp of het mailprogramma. */
  function alsBericht(via) {
    if (!form.reportValidity()) return;
    const tekst = verklaring();
    meld("Je herroeping staat klaar. Druk op verzenden. Je krijgt van ons een bevestiging per e-mail.");
    if (via === "whatsapp") window.open("https://wa.me/" + NESTIG.whatsapp + "?text=" + encodeURIComponent(tekst), "_blank", "noopener");
    else window.location.href = "mailto:" + NESTIG.email + "?subject=" + encodeURIComponent("Herroeping Nestig") + "&body=" + encodeURIComponent(tekst);
  }

  async function herroep() {
    if (!form.reportValidity()) return;
    const tekst = knop.textContent;
    knop.disabled = true;
    knop.textContent = "Bezig met versturen…";
    const uit = await stuurNaarServer("/api/herroeping", {
      naam: v("naam"), email: v("email"), wat: v("wat"), datum: v("datum"), website: v("website"),
    });
    knop.disabled = false;
    knop.textContent = tekst;

    if (uit && uit.status === 200 && uit.data.ok) {
      form.hidden = true;
      klaar.hidden = false;
      klaar.querySelector("[data-herroepen-tekst]").textContent =
        "We hebben je herroeping ontvangen op " + uit.data.ontvangen + ". Je kenmerk is " + uit.data.nummer + ". " +
        (uit.data.bevestigd ? "De bevestiging met het retouradres staat in je mail." : "De bevestiging per e-mail volgt zo snel mogelijk.");
      klaar.focus();
      return;
    }
    if (uit && uit.status === 400 && uit.data.fout) {
      meld(uit.data.fout, true);
      const veld = uit.data.veld && form.elements[uit.data.veld];
      if (veld && veld.focus) veld.focus();
      return;
    }
    alsBericht("mail");
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); herroep(); });
  form.querySelector("[data-via-wa]").addEventListener("click", () => alsBericht("whatsapp"));
}

/* ---------- bestelpagina ---------- */

function startBestellen() {
  const lijst = document.querySelector("[data-regels]");
  if (!lijst) return;
  const vol = document.querySelector("[data-mand-vol]");
  const leeg = document.querySelector("[data-mand-leeg]");
  const form = document.querySelector("[data-bestelform]");
  const melding = document.querySelector("[data-melding]");

  function teken() {
    const mand = leesMand();
    vol.hidden = mand.length === 0;
    leeg.hidden = mand.length !== 0;
    lijst.textContent = "";
    mand.forEach((r, i) => {
      const p = PRODUCTEN[r.id];
      const li = document.createElement("li");
      li.className = "regel";
      li.innerHTML =
        '<img class="mini" alt="" width="64" height="48">' +
        '<div><div class="naam"></div><div class="zacht klein"></div></div>' +
        '<div class="prijsregel"></div>' +
        '<div class="onder"><div class="teller">' +
        '<button type="button" data-min aria-label="Eén minder">−</button>' +
        '<input type="number" inputmode="numeric" min="1" max="' + MAX_PER_REGEL + '" aria-label="Aantal">' +
        '<button type="button" data-plus aria-label="Eén meer">+</button></div>' +
        '<button type="button" class="weg">Verwijderen</button></div>';
      li.querySelector(".mini").src = p.kleuren[r.kleur].foto;
      li.querySelector(".naam").textContent = p.naam;
      li.querySelector(".zacht").textContent = "Kleur: " + p.kleuren[r.kleur].naam;
      li.querySelector(".prijsregel").textContent = euro(p.prijs * r.aantal);
      li.querySelector("input").value = r.aantal;
      koppelTeller(li.querySelector(".teller"), (n) => {
        const m = leesMand(); m[i].aantal = n; bewaarMand(m); teken();
      });
      li.querySelector(".weg").addEventListener("click", () => {
        const m = leesMand(); m.splice(i, 1); bewaarMand(m); teken();
      });
      lijst.appendChild(li);
    });
    document.querySelectorAll("[data-totaal]").forEach((el) => { el.textContent = euro(totaal(mand)); });
  }
  teken();
  herstelFormulier(form);

  function bericht() {
    const mand = leesMand();
    const v = (naam) => (form.elements[naam].value || "").trim();
    const regels = mand.map((r) => {
      const p = PRODUCTEN[r.id];
      return "- " + r.aantal + "x " + p.naam + " (" + p.kleuren[r.kleur].naam + ") " + euro(p.prijs * r.aantal);
    });
    const tekst = [
      "Hoi Nestig, ik wil graag bestellen:",
      ...regels,
      "Totaal: " + euro(totaal(mand)) + " (gratis verzending)",
      "",
      "Naam: " + v("naam"),
      "Adres: " + v("straat") + ", " + v("postcode").toUpperCase() + " " + v("plaats"),
      "E-mail: " + v("email"),
    ];
    if (v("telefoon")) tekst.push("Telefoon: " + v("telefoon"));
    if (v("opmerking")) tekst.push("Opmerking: " + v("opmerking"));
    return tekst.join("\n");
  }

  const bedankt = document.querySelector("[data-bedankt]");
  const knop = form.querySelector("button[type=submit]");
  const v = (naam) => (form.elements[naam].value || "").trim();

  function meld(tekst, fout) {
    melding.hidden = false;
    melding.classList.toggle("fout", !!fout);
    melding.querySelector("[data-melding-tekst]").textContent = tekst;
    melding.scrollIntoView({ block: "nearest" });
  }

  /* Terugval: de bestelling als bericht in WhatsApp klaarzetten. */
  function viaWhatsApp(zelfdeTab) {
    if (leesMand().length === 0) { teken(); return; }
    if (!form.reportValidity()) return;
    const adres = "https://wa.me/" + NESTIG.whatsapp + "?text=" + encodeURIComponent(bericht());
    meld("Je bestelling staat klaar in WhatsApp. Druk daar op verzenden. Daarna krijg je een bevestiging en een betaalverzoek.");
    if (zelfdeTab) window.location.href = adres;
    else window.open(adres, "_blank", "noopener");
  }

  async function bestel() {
    if (leesMand().length === 0) { teken(); return; }
    if (!form.reportValidity()) return;
    const tekst = knop.textContent;
    knop.disabled = true;
    knop.textContent = "Bezig met bestellen…";
    const uit = await stuurNaarServer("/api/bestelling", {
      regels: leesMand(),
      naam: v("naam"), straat: v("straat"), postcode: v("postcode"), plaats: v("plaats"),
      email: v("email"), telefoon: v("telefoon"), opmerking: v("opmerking"),
      akkoord: form.elements.akkoord.checked, website: v("website"),
    });
    /* Met Mollie: door naar de betaalpagina. De winkelmand blijft staan tot er betaald is. */
    if (uit && uit.status === 200 && uit.data.ok && /^https:\/\//.test(uit.data.betaalUrl || "")) {
      bewaarFormulier(form);
      if (BETAAL_ID.test(uit.data.betaling || "")) bewaarBetaling(uit.data.betaling);
      knop.textContent = "Je gaat naar de betaalpagina…";
      window.location.href = uit.data.betaalUrl;
      return;
    }
    knop.disabled = false;
    knop.textContent = tekst;

    if (uit && uit.status === 200 && uit.data.ok) {
      const mail = v("email");
      wisFormulier();
      bewaarMand([]);
      vol.hidden = true;
      leeg.hidden = true;
      bedankt.hidden = false;
      bedankt.querySelector("[data-bedankt-nummer]").textContent = uit.data.nummer;
      bedankt.querySelector("[data-bedankt-mail]").textContent = uit.data.bevestigd
        ? "We hebben een bevestiging gestuurd naar " + mail + "."
        : "De bevestiging per e-mail volgt zo snel mogelijk.";
      window.scrollTo({ top: 0, behavior: "instant" });
      bedankt.focus({ preventScroll: true });
      return;
    }
    if (uit && uit.status === 400 && uit.data.fout) {
      meld(uit.data.fout, true);
      const veld = uit.data.veld && form.elements[uit.data.veld];
      if (veld && veld.focus) veld.focus();
      return;
    }
    /* Server niet bereikbaar of nog niet ingesteld: bestellen blijft mogelijk via WhatsApp. */
    viaWhatsApp(true);
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); bestel(); });
  form.querySelector("[data-via-wa]").addEventListener("click", () => viaWhatsApp(false));
}

/* ---------- terug van de betaalpagina ---------- */

function startBedankt() {
  const wortel = document.querySelector("[data-betaalstatus]");
  if (!wortel) return;
  const uitAdres = new URLSearchParams(window.location.search).get("id") || "";
  const id = BETAAL_ID.test(uitAdres) ? uitAdres : leesBetaling();
  const kop = document.querySelector("h1");
  let nu = null;

  function toon(naam, gegevens) {
    wortel.querySelectorAll("[data-stand]").forEach((el) => { el.hidden = el.dataset.stand !== naam; });
    const paneel = wortel.querySelector('[data-stand="' + naam + '"]');
    const d = gegevens || {};
    paneel.querySelectorAll("[data-nummer]").forEach((el) => { el.textContent = d.nummer || ""; });
    paneel.querySelectorAll("[data-met-nummer]").forEach((el) => { el.hidden = !d.nummer; });
    paneel.querySelectorAll("[data-test]").forEach((el) => { el.hidden = !d.test; });
    paneel.querySelectorAll("[data-verder]").forEach((el) => { el.hidden = !d.verder; if (d.verder) el.href = d.verder; });
    if (kop && paneel.dataset.kop) kop.textContent = paneel.dataset.kop;
    if (naam !== nu && naam !== "laden") paneel.focus({ preventScroll: true });
    nu = naam;
  }

  if (!id) { toon("onbekend"); return; }

  const KLAAR = { paid: "betaald", canceled: "mislukt", failed: "mislukt", expired: "mislukt" };
  let pogingen = 0;
  async function kijk() {
    pogingen++;
    let d = null, status = 0;
    try {
      const r = await fetch("/api/betaling?id=" + encodeURIComponent(id), { cache: "no-store" });
      status = r.status;
      d = await r.json();
    } catch (e) { /* geen verbinding: we proberen het zo opnieuw */ }

    if (status === 404) { toon("onbekend"); return; }
    const stand = d && KLAAR[d.status];
    if (stand === "betaald") {
      bewaarMand([]);
      wisFormulier();
      wisBetaling();
      toon("betaald", d);
      return;
    }
    if (stand === "mislukt") { wisBetaling(); toon("mislukt", d); return; }
    /* Nog open of in behandeling: even blijven kijken, eerst vaak en daarna rustiger. */
    if (d) toon("wacht", d);
    if (pogingen < 40) setTimeout(kijk, pogingen < 10 ? 2000 : 6000);
    else if (!d) toon("onbekend");
  }
  kijk();
}

/* ---------- alleen voor Nestig zelf: verzendmail sturen ---------- */

function startVerzonden() {
  const wortel = document.querySelector("[data-verzonden]");
  if (!wortel) return;
  const q = new URLSearchParams(window.location.search);
  const id = q.get("id") || "", h = q.get("h") || "";
  const form = wortel.querySelector("form");
  const melding = wortel.querySelector("[data-melding]");
  const knop = form.querySelector("button[type=submit]");
  const toon = (naam) => wortel.querySelectorAll("[data-stand]").forEach((el) => { el.hidden = el.dataset.stand !== naam; });
  const fout = (tekst) => { toon("fout"); wortel.querySelector("[data-fout-tekst]").textContent = tekst; };
  let opnieuw = false;

  function meld(tekst, isFout) {
    melding.hidden = false;
    melding.classList.toggle("fout", !!isFout);
    melding.querySelector("[data-melding-tekst]").textContent = tekst;
  }
  function alVerstuurd(code) {
    opnieuw = true;
    knop.textContent = "Opnieuw versturen";
    meld("Voor deze bestelling is al een verzendmail verstuurd, met code " + code + ". Klik op Opnieuw versturen als je de klant een nieuwe mail wilt sturen.");
  }

  (async () => {
    let r = null, d = {};
    try {
      r = await fetch("/api/verzonden?id=" + encodeURIComponent(id) + "&h=" + encodeURIComponent(h), { cache: "no-store" });
      d = await r.json();
    } catch (e) { /* geen verbinding */ }
    if (!r || r.status !== 200) { fout(d.fout || "Het lukt nu niet om de bestelling op te halen. Probeer het zo opnieuw."); return; }
    wortel.querySelector("[data-v-nummer]").textContent = d.nummer;
    wortel.querySelector("[data-v-klant]").textContent = d.naam + ", " + d.adres;
    wortel.querySelector("[data-v-email]").textContent = d.email;
    const lijst = wortel.querySelector("[data-v-regels]");
    d.regels.forEach((t) => { const li = document.createElement("li"); li.textContent = t.replace(/^- /, ""); lijst.appendChild(li); });
    wortel.querySelector("[data-v-test]").hidden = !d.test;
    toon("formulier");
    if (d.al) { form.elements.code.value = d.al; alVerstuurd(d.al); }
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const tekst = knop.textContent;
    knop.disabled = true;
    knop.textContent = "Bezig met versturen…";
    let r = null, d = {};
    try {
      r = await fetch("/api/verzonden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, h, code: form.elements.code.value.trim(), link: form.elements.link.value.trim(), opnieuw }),
      });
      d = await r.json();
    } catch (err) { /* geen verbinding */ }
    knop.disabled = false;
    knop.textContent = tekst;
    if (r && r.status === 200 && d.ok) {
      toon("klaar");
      wortel.querySelector("[data-klaar-tekst]").textContent = "De klant van bestelling " + d.nummer + " heeft de track-en-tracecode gekregen op " + d.email + ".";
      return;
    }
    if (r && r.status === 409 && d.al) { alVerstuurd(d.al); return; }
    meld((d && d.fout) || "Het versturen lukte niet. Probeer het zo opnieuw.", true);
    const veld = d && d.veld && form.elements[d.veld];
    if (veld && veld.focus) veld.focus();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  toonAantal();
  startProduct();
  startBestellen();
  startHerroepen();
  startBedankt();
  startVerzonden();
});
