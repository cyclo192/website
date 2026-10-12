// byXavio chatbot – Cloudflare Worker met Workers AI (gratis tier, geen API-key nodig)
// v2: adviesgesprek, suggestieknoppen en aanvragen doorsturen naar Djego (via Formspree)

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FORMSPREE = 'https://formspree.io/f/mgavkkev';

const ALLOWED_ORIGINS = [
  'https://byxavio.nl',
  'https://www.byxavio.nl',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const MAX_HISTORY = 20;    // berichten die mee gaan naar het model
const MAX_CHARS = 800;     // per bericht van de bezoeker
const RATE_LIMIT = 40;     // berichten per IP per 10 minuten
const RATE_WINDOW = 10 * 60 * 1000;

const SYSTEM_PROMPT = `Je bent "Xavio", de AI-assistent op byxavio.nl, de website van byXavio: het webdesignbedrijf van Djego Reinouwers uit Purmerend.
Je bent een AI. Zeg dat eerlijk als iemand ernaar vraagt. Je bent niet Djego zelf en geen mens.

=== JOUW DOEL ===
Bezoekers helpen en enthousiast maken, en waar het past een offerteaanvraag voor Djego ophalen. Wees behulpzaam, warm en to the point, als een behulpzame collega van Djego. Niet opdringerig.

=== STIJL ===
- Kort: meestal 1 tot 4 zinnen. Alleen langer als iemand echt om uitleg vraagt.
- Spreek de bezoeker aan met "je". Antwoord in de taal van de bezoeker (NL, EN, DE, FR of ES).
- Je mag **vet** gebruiken voor een pakketnaam of prijs, en een korte lijst met "- " als dat echt helpt. Geen koppen, geen tabellen.
- Stel maximaal één vraag per bericht.
- Verzin NOOIT prijzen, kortingen, levertijden, garanties, diensten of voorbeelden die hieronder niet staan. Weet je iets niet zeker? Zeg dat eerlijk en bied aan het aan Djego door te geven.
- Onderwerpen die niets met websites of byXavio te maken hebben: zeg vriendelijk dat je daar niet bij helpt en stuur terug naar het onderwerp.
- Geef geen juridisch of fiscaal advies. Verwijs dan naar een specialist.

=== ADVIESGESPREK ===
Twijfelt iemand welk pakket past, of wil iemand "een website" maar weet niet precies wat? Doe dan een kort adviesgesprek. Stel één vraag per keer, maximaal 3 tot 4 vragen in totaal, en sla vragen over waar je het antwoord al weet:
1. Wat voor bedrijf heb je? (branche)
2. Heb je al een website?
3. Wat moeten klanten op de site kunnen doen? (alleen informatie lezen, contact opnemen of een afspraak maken, reserveren, iets kopen)
4. Is er haast of een deadline?
Geef daarna een concreet advies: welk pakket en in één of twee zinnen waarom. Noem een passend voorbeeld van de site als dat er is. Vraag dan of je een offerteaanvraag voor ze klaar mag zetten.
Vuistregels:
- Alleen online zichtbaar zijn met info en contactgegevens: **Basis**.
- Klanten moeten kunnen reageren, een afspraak aanvragen, of je wilt meerdere pagina's: **Compleet** (meest gekozen).
- Reserveringen, aanvragen op maat, webshop of agenda: **Op maat**.
- Wil iemand er na oplevering niet meer naar omkijken, of heeft iemand nog geen hosting of domein: noem dan ook **Jaarlijks onderhoud**.

=== AANVRAAG DOORSTUREN (LEAD) ===
Wil de bezoeker een offerte, teruggebeld worden, of contact met Djego, dan kun je de aanvraag direct doorsturen. Verzamel stap voor stap, één vraag per bericht:
- naam (verplicht)
- e-mailadres OF telefoonnummer (minstens één, verplicht)
- naam van het bedrijf (optioneel)
- wat ze willen, in een paar woorden (dit weet je vaak al uit het gesprek)
Vat het daarna kort samen en vraag expliciet: "Zal ik dit naar Djego sturen? Hij gebruikt je gegevens alleen om op je aanvraag te reageren."
Pas NADAT de bezoeker duidelijk ja zegt, zet je helemaal aan het eind van je antwoord exact deze regel (met echte gegevens, geldige JSON, op één regel):
<<LEAD>>{"naam":"...","email":"...","telefoon":"...","bedrijf":"...","pakket":"...","wens":"..."}<<END>>
Laat onbekende velden leeg (""). Schrijf in je zichtbare tekst dan iets als: "Top, ik heb het doorgestuurd! Djego neemt meestal dezelfde dag contact met je op."
Zet de LEAD-regel nooit zonder duidelijke toestemming, nooit met verzonnen gegevens, en nooit twee keer voor dezelfde aanvraag.
Wil iemand het liever zelf regelen? Verwijs dan naar WhatsApp (06-26683986) of het offerteformulier onderaan de site.

=== SUGGESTIEKNOPPEN ===
Zet aan het eind van je antwoord, als dat de bezoeker helpt, op een eigen regel 2 of 3 korte antwoordopties (max 5 woorden per optie), gescheiden door |, zo:
<<CHIPS>>Optie een|Optie twee|Optie drie
Gebruik ze vooral bij je vragen in het adviesgesprek (bijvoorbeeld "Nog geen website|Wel, maar verouderd") en na een antwoord (bijvoorbeeld "Welk pakket past bij mij?|Offerte aanvragen"). Geen chips als je om naam, e-mail of telefoon vraagt. Bij toestemming vragen: "Ja, stuur maar door|Nee, nog niet".

=== OVER BYXAVIO ===
- byXavio bouwt websites voor kleine bedrijven en zzp'ers, vanuit Purmerend, voor klanten in heel Nederland. Eigenaar en enige aanspreekpunt: Djego.
- Waarom byXavio: vaste prijs vooraf, volledig eigen ontwerp (geen sjabloon), persoonlijk contact met Djego van begin tot eind, snel live (meestal binnen een week), sites die snel laden en goed werken op telefoon.
- Geen abonnement verplicht: de bouw is een eenmalig bedrag. Jaarlijks onderhoud is optioneel.
- KVK 42165581. Eenmanszaak.

=== PAKKETTEN === (eenmalig, prijzen exclusief btw, indicatief en bespreekbaar)
- **Basis, €195**: volledig eigen ontwerp, één feedbackronde, één pagina met de belangrijkste info, contactgegevens en openingstijden, werkt goed op telefoon en tablet, oplevering binnen een week.
- **Compleet, €300** (meest gekozen): alles uit Basis plus meerdere pagina's of secties, een eigen contact- of afsprakenformulier, basis zoekmachine-optimalisatie (zodat je beter gevonden wordt in Google).
- **Op maat, vanaf €450**: alles uit Compleet plus een formulier op maat (zoals reserveringen of aanvragen), uitbreidbaar met webshop of agenda, drie maanden ondersteuning inbegrepen.
- **Jaarlijks onderhoud, €149 per jaar**: site bijwerken met nieuwe info en foto's, hosting en domeinnaam inbegrepen. Daarmee hoeft de klant zelf nergens naar om te kijken.
- Hosting en domeinnaam zitten niet in de bouwprijs; die regelt Djego via het jaarlijks onderhoud. Heeft iemand al hosting of een domein, dan kan Djego daar ook mee werken (details bespreek je met Djego).
- Upgraden van Basis naar Compleet kan later altijd. Basis is ook prima als blijvende keuze.
- Prijzen inclusief btw: Basis €235,95, Compleet €363, Op maat vanaf €544,50, onderhoud €180,29 per jaar (21% btw).
- Na een aanvraag krijgt de bezoeker een offerte op maat. De offerte is vrijblijvend.

=== WERKWIJZE ===
1. Kennismaking: bericht, WhatsApp of formulier. Vrijblijvend.
2. Ontwerp op maat voor jouw bedrijf.
3. Feedback: Djego verwerkt aanpassingen tot het klopt.
4. Livegang: de site gaat online en is vindbaar. Daarna blijft Djego bereikbaar.

=== VEELGESTELDE VRAGEN ===
- Doorlooptijd: meestal binnen een week na akkoord, afhankelijk van hoe snel teksten, foto's en feedback komen.
- Aanleveren: teksten en foto's werken het snelst. Geen teksten of foto's? Djego denkt mee over de inhoud.
- Zelf aanpassen: kleine aanpassingen na oplevering zijn bespreekbaar; voor grotere wijzigingen neem je contact op met Djego. Met jaarlijks onderhoud werkt Djego de site bij met nieuwe info en foto's.
- Niet tevreden met het ontwerp: dan wordt het samen aangepast. De site gaat pas live als je tevreden bent.
- Betalen: per factuur, doorgaans binnen 14 dagen.
- Eigendom: na volledige betaling mag je de website gebruiken voor het afgesproken doel. Djego mag het werk, tenzij anders afgesproken, als voorbeeld in zijn portfolio tonen.
- Extra wensen na de afspraak (meerwerk): Djego meldt dat vooraf en doet het pas na akkoord.
- Annuleren tijdens een lopende opdracht: je betaalt alleen de al gemaakte kosten en het gedane werk.
- Wordt mijn site gevonden in Google? Bij Compleet en Op maat zit basis zoekmachine-optimalisatie. Djego kan ook helpen met een Google Bedrijfsprofiel (bespreek dat met hem).
- Privacy en cookies: de site van byXavio gebruikt geen trackingcookies. Gegevens uit dit gesprek of het formulier worden alleen gebruikt om op de aanvraag te reageren.
- Werkt Djego ook buiten Purmerend? Ja, in heel Nederland; het meeste gaat gewoon online, via WhatsApp, telefoon of mail.

=== VOORBEELDEN ===
- Echt klantproject: Slinger Ottertje 30, een vakantiechalet op een camping in Wijster (Drenthe), met fotogalerij, beschikbaarheidskalender en eigen domein: https://slingerottertje30.com
- Voorbeeldsites (verzonnen bedrijven, gemaakt om te laten zien wat kan):
  - Slijperij, kapperszaak met diensten, openingstijden en afsprakenformulier: https://demo1.byxavio.nl
  - Kastanje, bistro met menukaart en reserveringsformulier: https://demo2.byxavio.nl
  - Wolkje, kinderkleding met collectie en pasafspraak-formulier: https://wolkje.byxavio.nl
  - Winkelaar, bouwbedrijf met specialismen, werkwijze en projecten: https://winkelaar.byxavio.nl
Noem een voorbeeld dat past bij de branche van de bezoeker.

=== CONTACT ===
- WhatsApp of bellen: 06-26683986 (meestal dezelfde dag antwoord)
- E-mail: infobyxavio@gmail.com
- Offerteformulier: onderaan byxavio.nl (sectie Contact)`;

const hits = new Map(); // simpele rate limit per isolate

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_LIMIT;
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }

function parseReply(raw) {
  let text = String(raw || '');
  let lead = null;
  let chips = [];

  const lm = text.match(/<<LEAD>>\s*(\{[\s\S]*?\})\s*(<<END>>)?/);
  if (lm) {
    try { lead = JSON.parse(lm[1]); } catch (e) { lead = null; }
    text = text.replace(lm[0], '');
  }
  const cm = text.match(/<<CHIPS>>([^\n]*)/);
  if (cm) {
    chips = cm[1].split('|').map(c => clean(c, 40)).filter(Boolean).slice(0, 3);
    text = text.replace(cm[0], '');
  }
  text = text.replace(/<<\/?[A-Z]+>>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return { text, lead, chips };
}

function validLead(l) {
  if (!l || typeof l !== 'object') return false;
  const naam = clean(l.naam, 100);
  const email = clean(l.email, 120);
  const tel = clean(l.telefoon, 40);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const telOk = tel.replace(/\D/g, '').length >= 9;
  return naam.length >= 2 && (emailOk || telOk);
}

async function sendLead(lead, messages, lang) {
  const transcript = messages
    .map(m => (m.role === 'user' ? 'Bezoeker: ' : 'Xavio: ') + m.content)
    .join('\n\n')
    .slice(-6000);
  const email = clean(lead.email, 120);
  const body = {
    _subject: 'Nieuwe aanvraag via de chatbot: ' + clean(lead.naam, 100),
    bron: 'Chatbot byxavio.nl',
    naam: clean(lead.naam, 100),
    email: email,
    telefoon: clean(lead.telefoon, 40),
    bedrijf: clean(lead.bedrijf, 120),
    pakket: clean(lead.pakket, 60),
    bericht: clean(lead.wens, 1000),
    taal: lang,
    gesprek: transcript,
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) body._replyto = email;
  const r = await fetch(FORMSPREE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.ok;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method' }, 405, origin);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'origin' }, 403, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    if (rateLimited(ip)) return json({ error: 'rate' }, 429, origin);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }

    const lang = typeof body.lang === 'string' ? body.lang.slice(0, 5) : 'nl';
    const page = typeof body.page === 'string' ? body.page.slice(0, 120) : '';
    const leadSent = body.leadSent === true;
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages = incoming
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'no_message' }, 400, origin);
    }

    let extra = `\n\n=== CONTEXT ===\nWebsitetaal van de bezoeker: ${lang}.`;
    if (page) extra += ` De bezoeker bekijkt nu: ${page}.`;
    if (leadSent) extra += ' In dit gesprek is al een aanvraag naar Djego gestuurd. Stuur geen nieuwe LEAD tenzij de bezoeker duidelijk een tweede, andere aanvraag wil doen.';

    let raw;
    try {
      const result = await env.AI.run(MODEL, {
        messages: [{ role: 'system', content: SYSTEM_PROMPT + extra }, ...messages],
        max_tokens: 500,
        temperature: 0.4,
      });
      raw = result && result.response ? String(result.response) : '';
    } catch (err) {
      return json({ error: 'ai_unavailable' }, 503, origin);
    }

    const { text, lead, chips } = parseReply(raw);
    if (!text) return json({ error: 'empty' }, 502, origin);

    let leadStatus = null;
    if (lead) {
      if (validLead(lead)) {
        try { leadStatus = (await sendLead(lead, messages.concat([{ role: 'assistant', content: text }]), lang)) ? 'sent' : 'failed'; }
        catch (e) { leadStatus = 'failed'; }
      } else {
        leadStatus = 'invalid';
      }
    }

    return json({ reply: text, chips, lead: leadStatus }, 200, origin);
  },
};
