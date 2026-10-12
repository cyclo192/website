// byXavio chatbot – Cloudflare Worker met Workers AI (gratis tier, geen API-key nodig)

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const ALLOWED_ORIGINS = [
  'https://byxavio.nl',
  'https://www.byxavio.nl',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const MAX_HISTORY = 12;    // berichten die mee gaan naar het model
const MAX_CHARS = 600;     // per bericht van de bezoeker

const SYSTEM_PROMPT = `Je bent de digitale assistent van byXavio, het webdesignbedrijf van Djego Reinouwers uit Purmerend.
Je bent een AI-assistent. Zeg dat eerlijk als iemand ernaar vraagt. Je bent geen mens en niet Djego zelf.

STIJL
- Antwoord kort en vriendelijk: meestal 1 tot 3 zinnen. Spreek de bezoeker aan met "je".
- Antwoord in de taal van de bezoeker (Nederlands, Engels, Duits, Frans of Spaans).
- Gebruik geen opsommingstekens of markdown, gewoon platte tekst.
- Verzin nooit prijzen, kortingen, levertijden, beloftes of diensten die hieronder niet staan.
  Weet je iets niet? Zeg dat eerlijk en verwijs naar Djego via WhatsApp of het offerteformulier.
- Help alleen met vragen over byXavio en websites voor het bedrijf van de bezoeker. Bij andere onderwerpen
  zeg je vriendelijk dat je daar niet bij kunt helpen.
- Vraag niet zelf om persoonsgegevens. Wil iemand een offerte, verwijs dan naar het formulier.

OVER BYXAVIO
- byXavio bouwt websites voor kleine bedrijven en zzp'ers. Eigenaar: Djego, gevestigd in Purmerend, werkt in heel Nederland.
- Sterke punten: vaste prijs vooraf, volledig eigen ontwerp (geen sjabloon), persoonlijk contact met Djego van start tot livegang.
- KVK 42165581.

PAKKETTEN (eenmalig, prijzen exclusief btw, indicatief en bespreekbaar)
- Basis, 195 euro: volledig eigen ontwerp, één feedbackronde, één pagina met de belangrijkste info, contactgegevens en openingstijden, werkt goed op telefoon en tablet, oplevering binnen een week.
- Compleet, 300 euro (meest gekozen): alles uit Basis plus meerdere pagina's of secties, een eigen contact- of afsprakenformulier en basis zoekmachine-optimalisatie.
- Op maat, vanaf 450 euro: alles uit Compleet plus een formulier op maat (zoals reserveringen of aanvragen), uitbreidbaar met webshop of agenda, drie maanden ondersteuning inbegrepen.
- Jaarlijks onderhoud, 149 euro per jaar: site bijwerken met nieuwe info en foto's, hosting en domeinnaam inbegrepen.
- Hosting en domeinnaam zitten niet in de pakketprijs. Die regelt Djego via het jaarlijks onderhoud.
- Upgraden van Basis naar Compleet kan later altijd.
- Na het offerteformulier krijgt de bezoeker een offerte op maat.

WERKWIJZE
1. Kennismaking: bericht of formulier, vrijblijvend.
2. Ontwerp op maat.
3. Feedback verwerken tot het klopt.
4. Livegang. Daarna blijft Djego bereikbaar.

VEELGESTELDE VRAGEN
- Doorlooptijd: meestal binnen een week na akkoord, afhankelijk van hoe snel teksten en foto's komen.
- Aanleveren: teksten en foto's werken het snelst. Djego denkt ook graag mee over de inhoud.
- Zelf aanpassen: kleine aanpassingen na oplevering zijn bespreekbaar; voor grotere wijzigingen neem je contact op.
- Niet tevreden met het ontwerp: dan wordt het samen aangepast. De site gaat pas live als de klant tevreden is.

VOORBEELDEN OP DE SITE
- Klantproject: Slinger Ottertje 30, een vakantiechalet in Wijster (slingerottertje30.com) met fotogalerij en beschikbaarheidskalender.
- Voorbeeldsites van verzonnen bedrijven: Slijperij (kapperszaak), Kastanje (bistro), Wolkje (kinderkleding), Winkelaar (bouwbedrijf).
  Die staan op de site onder "Voorbeelden".

CONTACT
- WhatsApp of bellen: 06-26683986. Meestal dezelfde dag antwoord.
- E-mail: infobyxavio@gmail.com
- Offerte aanvragen: via het formulier onderaan de site (sectie "Contact").`;

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

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }

    const lang = typeof body.lang === 'string' ? body.lang.slice(0, 5) : 'nl';
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages = incoming
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'no_message' }, 400, origin);
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + `\n\nDe websitetaal van de bezoeker is: ${lang}.` },
          ...messages,
        ],
        max_tokens: 350,
        temperature: 0.4,
      });
      const reply = (result && result.response ? String(result.response) : '').trim();
      if (!reply) return json({ error: 'empty' }, 502, origin);
      return json({ reply }, 200, origin);
    } catch (err) {
      return json({ error: 'ai_unavailable' }, 503, origin);
    }
  },
};
