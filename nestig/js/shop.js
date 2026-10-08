/* Nestig — winkelmand en bestelformulier.

   PRODUCTEN: alles wat je verkoopt. Prijs in centen.
   Een product toevoegen = hier een blok bijzetten en een pagina maken.

   Betalen: zolang Mollie nog niet gekoppeld is, gaat een bestelling als
   bericht naar WhatsApp of e-mail en stuur je zelf een betaalverzoek. */

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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const aantal = parseInt(form.querySelector(".teller input").value, 10) || 1;
    voegToe(id, kleurNu(), aantal);
    klaar.hidden = false;
    klaar.querySelector("[data-toegevoegd-tekst]").textContent =
      aantal + "× " + product.kleuren[kleurNu()].naam.toLowerCase() + " ligt in je winkelmand.";
    klaar.querySelector("a").focus();
  });
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

  function verstuur(via) {
    if (leesMand().length === 0) { teken(); return; }
    if (!form.reportValidity()) return;
    const tekst = bericht();
    const adres = via === "whatsapp"
      ? "https://wa.me/" + NESTIG.whatsapp + "?text=" + encodeURIComponent(tekst)
      : "mailto:" + NESTIG.email + "?subject=" + encodeURIComponent("Bestelling Nestig") + "&body=" + encodeURIComponent(tekst);
    melding.hidden = false;
    melding.querySelector("[data-melding-tekst]").textContent = via === "whatsapp"
      ? "Je bestelling staat klaar in WhatsApp. Druk daar op verzenden. Daarna sturen we je een betaalverzoek."
      : "Je bestelling staat klaar in je mailprogramma. Druk daar op verzenden. Daarna sturen we je een betaalverzoek.";
    if (via === "whatsapp") window.open(adres, "_blank", "noopener");
    else window.location.href = adres;
    melding.scrollIntoView({ block: "nearest" });
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); verstuur("whatsapp"); });
  form.querySelector("[data-via-mail]").addEventListener("click", () => verstuur("mail"));
}

document.addEventListener("DOMContentLoaded", () => {
  toonAantal();
  startProduct();
  startBestellen();
});
