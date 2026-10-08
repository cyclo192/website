#!/usr/bin/env python3
"""Bouwt de statische pagina's van nestig.nl.

Gebruik vanuit de map van de repo:  python3 _bouw/nestig.py nestig
Pas teksten, prijs en gegevens hier aan en draai het script opnieuw.
CSS staat in nestig/css/style.css, de winkelmand in nestig/js/shop.js."""
import sys, json, pathlib

OUT = pathlib.Path(sys.argv[1])
SITE = "https://nestig.nl/"
TEL_TOON = "06 26 68 39 86"
TEL = "+31626683986"
WA = "31626683986"
MAIL = "infobyxavio@gmail.com"
KVK = "42165581"
BTW = "NL005549301B15"
STRAAT = "Speltstraat 16"
POSTCODE = "1446 DA"
PLAATS = "Purmerend"
PRIJS = "27,95"
LEVERTIJD = "2 tot 3 weken"

WA_VRAAG = f"https://wa.me/{WA}?text=Hoi%20Nestig%2C%20ik%20heb%20een%20vraag."
WA_ICON = '<svg aria-hidden="true" viewBox="0 0 32 32"><path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.3.6 4.54 1.74 6.52L3 29l6.64-1.74A13 13 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.8c-2.02 0-4-.54-5.72-1.57l-.41-.24-3.94 1.03 1.05-3.84-.27-.4A10.78 10.78 0 0 1 5.2 16c0-5.97 4.86-10.83 10.84-10.83 5.97 0 10.82 4.86 10.82 10.83 0 5.98-4.85 10.8-10.82 10.8Zm5.94-8.1c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.17-.22.32-.84 1.05-1.03 1.27-.19.22-.38.24-.7.08-.33-.16-1.38-.51-2.62-1.62-.97-.86-1.62-1.93-1.81-2.25-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.32-1.14 1.11-1.14 2.72 0 1.6 1.17 3.15 1.33 3.37.16.22 2.3 3.5 5.56 4.91.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.41.19-1.55-.08-.13-.3-.21-.62-.38Z"/></svg>'
MAND_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 9h18l-1.6 10.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z"/><path d="M8 9l3-6M16 9l-3-6"/></svg>'

INK = "#12302b"
KAT = "#e58a3c"
STREEP = "#c2671f"


def raam(uid, label=True):
    """De tekening: een kat in de hangmat voor het raam. --hm bepaalt de kleur van de mat."""
    a11y = ('role="img" aria-label="Tekening van een rode kat die slaapt in een hangmat. '
            'De hangmat hangt met zuignappen aan het raam, de zon schijnt naar binnen."') if label else 'aria-hidden="true"'
    return f'''<svg class="raam" viewBox="0 0 480 500" {a11y}>
<defs>
<linearGradient id="lucht-{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8d5ea"/><stop offset="1" stop-color="#eaf6ee"/></linearGradient>
<clipPath id="glas-{uid}"><rect x="28" y="28" width="424" height="432" rx="8"/></clipPath>
</defs>
<rect x="8" y="8" width="464" height="472" rx="22" fill="#fff" stroke="{INK}" stroke-width="4"/>
<g clip-path="url(#glas-{uid})">
<rect x="28" y="28" width="424" height="432" fill="url(#lucht-{uid})"/>
<circle cx="366" cy="112" r="74" fill="#ffc83d" opacity=".28"/>
<circle cx="366" cy="112" r="46" fill="#ffc83d"/>
<g fill="#fff" opacity=".92"><ellipse cx="112" cy="104" rx="46" ry="15"/><ellipse cx="144" cy="92" rx="30" ry="16"/><ellipse cx="236" cy="176" rx="34" ry="10"/></g>
<path d="M28 460V396h32v-16h12v-14h22v14h12v16h30v-26l27-30 27 30v26h26v-24h12v-13h30v13h12v24h32v-36l25-22 25 22v36h38v64Z" fill="#9cc3bd"/>
<polygon class="straal" points="300,28 452,28 452,160 190,460 70,460" fill="#ffe28f" opacity=".3"/>
</g>
<rect x="28" y="28" width="424" height="432" rx="8" fill="none" stroke="{INK}" stroke-width="3"/>
<g stroke="{INK}" stroke-width="3" stroke-linecap="round"><path d="M128 232 104 352M352 232l24 120"/></g>
<g fill="#fff" stroke="{INK}" stroke-width="3"><circle cx="128" cy="232" r="14"/><circle cx="352" cy="232" r="14"/></g>
<g fill="{INK}" opacity=".3"><circle cx="128" cy="232" r="5"/><circle cx="352" cy="232" r="5"/></g>
<g class="staart" fill="none" stroke-linecap="round"><path d="M344 334c46-4 60 22 54 58-3 18-18 24-26 12" stroke="{INK}" stroke-width="23"/><path d="M344 334c46-4 60 22 54 58-3 18-18 24-26 12" stroke="{KAT}" stroke-width="16"/></g>
<path d="M168 350c-8-54 46-68 94-68 56 0 94 22 90 68Z" fill="{KAT}" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>
<g fill="none" stroke="{STREEP}" stroke-width="5" stroke-linecap="round"><path d="M252 285q-4 14 2 26M280 286q-4 14 2 26M308 292q-4 12 2 22"/></g>
<g fill="{KAT}" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"><path d="M158 292l2-40 27 21ZM195 273l27-21 2 40Z"/></g>
<g fill="#f4b6a6"><path d="M165 281l1-18 12 10ZM205 273l12-10 1 18Z"/></g>
<circle cx="190" cy="306" r="38" fill="{KAT}" stroke="{INK}" stroke-width="3.5"/>
<g fill="none" stroke="{STREEP}" stroke-width="4" stroke-linecap="round"><path d="M183 274v9M191 272v11M199 274v9"/></g>
<ellipse cx="190" cy="323" rx="17" ry="11" fill="#fff"/>
<path d="M186 315h8l-4 5Z" fill="#e0707f"/>
<g fill="none" stroke="{INK}" stroke-linecap="round"><path d="M190 320q-5 7-10 3M190 320q5 7 10 3" stroke-width="2"/><path d="M167 304q8 7 16 0M197 304q8 7 16 0" stroke-width="3"/><path d="M170 322l-22-4M170 327l-22 4M210 322l22-4M210 327l22 4" stroke-width="1.5" opacity=".55"/></g>
<rect class="mat" x="92" y="346" width="296" height="28" rx="14" stroke="{INK}" stroke-width="3.5"/>
<g fill="#fff" stroke="{INK}" stroke-width="3"><ellipse cx="172" cy="350" rx="13" ry="9"/><ellipse cx="206" cy="350" rx="13" ry="9"/></g>
<g stroke="{INK}" stroke-width="3" stroke-linejoin="round"><path d="M66 442c-27-20-27-48-14-61 12 18 16 40 14 61Z" fill="#2f7d5b"/><path d="M66 442c26-16 32-42 22-57-14 14-22 36-22 57Z" fill="#2f7d5b"/><path d="M66 442c-6-30-2-56 4-73 10 18 6 46-4 73Z" fill="#3c9a70"/><path d="M43 440h46l-6 40H49Z" fill="#b3294e"/></g>
<rect x="2" y="478" width="476" height="16" rx="8" fill="#fff" stroke="{INK}" stroke-width="4"/>
</svg>'''


KAMER_SVG = f'''<svg class="teken" viewBox="0 0 200 190" aria-hidden="true">
<g stroke="{INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<path d="M150 0v52" fill="none"/>
<path d="M116 96c0-24 15-44 34-44s34 20 34 44Z" fill="#ffc83d"/>
<path d="M142 96a8 8 0 0 0 16 0" fill="#fff"/>
<rect x="14" y="56" width="78" height="96" rx="6" fill="#fff"/>
<path d="M22 134c12-22 24-22 34-8 8-12 18-12 28 8v10H22Z" fill="#9cc3bd"/>
<circle cx="66" cy="84" r="10" fill="#ffc83d"/>
</g></svg>'''


def kop(current):
    def link(href, tekst, key):
        cur = ' aria-current="page"' if current == key else ''
        return f'<a href="{href}"{cur}>{tekst}</a>'
    return f'''<a class="skip" href="#inhoud">Naar de inhoud</a>
<header class="top"><div class="wrap">
<a class="logo" href="./" aria-label="Nestig, naar de homepage">nestig<span class="zon" aria-hidden="true"></span></a>
<nav class="nav" aria-label="Hoofdmenu">
{link("dieren.html", "Dieren", "dieren")}
{link("kamer.html", "Kamer", "kamer")}
<a class="mand" href="bestellen.html" data-mand-link aria-label="Winkelmand">{MAND_ICON}<span>Winkelmand</span><b data-mand-aantal>0</b></a>
</nav></div></header>'''


VOET = f'''<footer class="voet"><div class="wrap">
<div class="kolommen">
<div><a class="logo" href="./" aria-label="Nestig, naar de homepage">nestig<span class="zon" aria-hidden="true"></span></a>
<p class="zacht" style="margin-top:10px;max-width:30ch">Fijne spullen voor je dier en voor je kamer.</p></div>
<div><h2>Winkel</h2><ul>
<li><a href="dieren.html">Dieren</a></li>
<li><a href="kamer.html">Kamer</a></li>
<li><a href="bestellen.html">Winkelmand</a></li></ul></div>
<div><h2>Klantenservice</h2><ul>
<li><a href="./#vragen">Verzending en levertijd</a></li>
<li><a href="retourneren.html">Retourneren</a></li>
<li><a href="algemene-voorwaarden.html">Algemene voorwaarden</a></li>
<li><a href="privacy.html">Privacy</a></li></ul></div>
<div><h2>Contact</h2><ul>
<li><a href="{WA_VRAAG}" target="_blank" rel="noopener">WhatsApp: {TEL_TOON}</a></li>
<li><a href="tel:{TEL}">Bellen: {TEL_TOON}</a></li>
<li><a href="mailto:{MAIL}">{MAIL}</a></li>
<li>{STRAAT}<br>{POSTCODE} {PLAATS}</li></ul></div>
</div>
<div class="onder"><span>© 2026 Nestig, onderdeel van byXavio</span><span>KVK {KVK}</span><span>Btw-id {BTW}</span><span>Website door <a href="https://byxavio.nl" style="text-decoration:underline">byXavio</a></span></div>
</div></footer>
<a class="wa-zweef" href="{WA_VRAAG}" target="_blank" rel="noopener" aria-label="Stel je vraag via WhatsApp">{WA_ICON}</a>'''


def page(slug, title, desc, body, current=None, noindex=False, ld=None):
    url = SITE + ("" if slug == "index.html" else slug.removesuffix(".html"))
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    ldtag = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n' if ld else ''
    html = f'''<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="Nestig">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}img/og.jpg">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#dcecf1">
<link rel="icon" href="favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="fonts/lora.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="fonts/inter-400.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="css/style.css">
{ldtag}</head>
<body>
{kop(current)}
<main id="inhoud">
{body}
</main>
{VOET}
<script src="js/shop.js" defer></script>
</body>
</html>
'''
    (OUT / slug).write_text(html, encoding="utf-8")


def vragen():
    items = [
        ("Hoe lang duurt de levering?",
         f"Reken op {LEVERTIJD}. Je bestelling komt rechtstreeks van onze leverancier buiten Europa. Zodra je pakket onderweg is, krijg je van ons een track-en-tracecode."),
        ("Wat kost verzending?",
         "Niets. Verzending is gratis. We bezorgen op dit moment alleen in Nederland."),
        ("Hoe betaal ik?",
         "Na je bestelling sturen we je een betaalverzoek. Je betaalt met iDEAL via je eigen bank. Zodra je betaling binnen is, gaat je bestelling de deur uit."),
        ("Kan ik terugsturen?",
         'Ja. Je hebt 14 dagen bedenktijd vanaf de dag dat je je pakket ontvangt. De kosten voor het terugsturen betaal je zelf. Hoe het werkt, lees je bij <a class="link" href="retourneren.html">retourneren</a>.'),
        ("Blijft de hangmat goed hangen?",
         "Zuignappen houden het best op glad, schoon en droog glas. Maak het raam eerst schoon, druk de zuignappen stevig aan en trek er even aan met je hand voordat je kat erop gaat. Controleer de zuignappen daarna af en toe."),
        ("Ik heb een andere vraag",
         f'Stuur een appje naar <a class="link" href="{WA_VRAAG}" target="_blank" rel="noopener">{TEL_TOON}</a>. Je krijgt meestal dezelfde dag antwoord.'),
    ]
    out = ['<div class="vragen">']
    for q, a in items:
        out.append(f'<details><summary>{q}</summary><p>{a}</p></details>')
    out.append('</div>')
    return "\n".join(out)


STAPPEN = '''<ol class="stappen">
<li><h3>Maak het raam schoon</h3><p>Glad, schoon en droog glas houdt de zuignappen het best vast.</p></li>
<li><h3>Druk de zuignappen aan</h3><p>Stevig tegen het glas, tot er geen lucht meer achter zit.</p></li>
<li><h3>Test met je hand</h3><p>Trek er even aan. Zit hij vast? Dan mag je kat erop.</p></li>
</ol>'''


def kaart_hangmat(uid):
    return f'''<a class="kaart" href="kattenhangmat.html">
<div class="beeld">{raam(uid, label=False)}</div>
<div class="tekst"><h3>Kattenhangmat voor het raam</h3>
<p class="zacht klein">Met zuignappen. In drie kleuren.</p>
<p class="prijs">€ {PRIJS}</p></div></a>'''


# ---------------------------------------------------------------- home
home = f'''<section class="hero"><div class="wrap">
<div>
<h1>Het beste plekje in huis hangt aan het raam.</h1>
<p class="sub">Een hangmat met zuignappen, voor katten die graag in de zon liggen en de straat in de gaten houden.</p>
<div class="hero-koop">
<a class="btn btn-zon" href="kattenhangmat.html">Bekijk de kattenhangmat</a>
<p class="prijs">€ {PRIJS}<small>Gratis verzending</small></p>
</div>
</div>
{raam("hero")}
</div></section>

<section class="feiten" aria-label="Goed om te weten"><div class="wrap"><ul>
<li><strong>Gratis verzending</strong><span>In heel Nederland</span></li>
<li><strong>Levertijd {LEVERTIJD}</strong><span>Rechtstreeks van de leverancier</span></li>
<li><strong>14 dagen bedenktijd</strong><span>Terugsturen mag altijd</span></li>
<li><strong>Vragen? App ons</strong><span>{TEL_TOON}</span></li>
</ul></div></section>

<section class="sec"><div class="wrap">
<h2>Voor je dier en voor je kamer</h2>
<p class="sub">Nestig begint klein. Eerst één ding dat goed is, daarna meer.</p>
<div class="cats">
<a class="cat cat-dier" href="dieren.html">
<div class="teken">{raam("cat", label=False)}</div>
<h3>Dieren</h3><p>Spullen waar je kat of hond blij van wordt.</p><span class="ga">Bekijk dieren</span></a>
<a class="cat cat-kamer" href="kamer.html">
{KAMER_SVG}
<span class="label">Binnenkort</span>
<h3>Kamer</h3><p>Decoratie die je kamer gezelliger maakt.</p><span class="ga">Kijk wat eraan komt</span></a>
</div>
</div></section>

<section class="sec band"><div class="wrap">
<h2>Zo hangt hij in een paar minuten</h2>
<p class="sub">Geen boor en geen schroeven. De hangmat blijft met zuignappen aan het glas zitten.</p>
{STAPPEN}
</div></section>

<section class="sec eerlijk"><div class="wrap">
<h2>Eerlijk over de levertijd</h2>
<div>
<p>Je bestelling komt rechtstreeks van onze leverancier buiten Europa. Daardoor is je pakket {LEVERTIJD} onderweg. Dat is langer dan je misschien gewend bent, en dat zeggen we liever vooraf.</p>
<p>De prijs die je ziet is de prijs die je betaalt, inclusief btw en verzending. Zodra je pakket onderweg is, krijg je een track-en-tracecode.</p>
<p>Past het toch niet? Dan heb je 14 dagen bedenktijd. <a class="link" href="retourneren.html">Lees hoe retourneren werkt</a>.</p>
</div>
</div></section>

<section class="sec" id="vragen"><div class="wrap">
<h2>Veelgestelde vragen</h2>
{vragen()}
</div></section>

<section class="sec contact"><div class="wrap">
<div><h2>Liever even overleggen?</h2><p class="sub" style="color:var(--ink)">Stuur een appje of bel. Je krijgt meestal dezelfde dag antwoord.</p></div>
<div class="knoppen">
<a class="btn btn-wa" href="{WA_VRAAG}" target="_blank" rel="noopener">{WA_ICON}Stuur een WhatsApp</a>
<a class="btn btn-lijn" href="tel:{TEL}">Bel {TEL_TOON}</a>
</div>
</div></section>'''

page("index.html",
     "Nestig – kattenhangmat voor het raam en fijne spullen voor thuis",
     f"Nestig verkoopt fijne spullen voor je dier en je kamer. Nu: de kattenhangmat voor het raam voor € {PRIJS}, met gratis verzending en 14 dagen bedenktijd.",
     home, ld={
         "@context": "https://schema.org", "@type": "OnlineStore", "name": "Nestig", "url": SITE,
         "logo": SITE + "apple-touch-icon.png", "telephone": TEL, "email": MAIL,
         "address": {"@type": "PostalAddress", "streetAddress": STRAAT, "postalCode": POSTCODE, "addressLocality": PLAATS, "addressCountry": "NL"},
         "vatID": BTW, "parentOrganization": {"@type": "Organization", "name": "byXavio", "url": "https://byxavio.nl/"},
     })

# ---------------------------------------------------------------- dieren
dieren = f'''<div class="wrap">
<p class="kruimel"><a href="./">Home</a> / Dieren</p>
<div class="paginakop"><h1>Voor je dier</h1><p class="sub">Spullen waar je kat of hond blij van wordt.</p></div>
<div class="kaarten" style="margin-bottom:clamp(56px,8vw,96px)">
{kaart_hangmat("k1")}
<div class="kaart kaart-leeg"><span class="label">Binnenkort</span><h3>Meer voor kat en hond</h3>
<p class="zacht">We zoeken het volgende product uit. Tip voor ons? <a class="link" href="{WA_VRAAG}" target="_blank" rel="noopener">App ons</a>.</p></div>
</div>
</div>'''
page("dieren.html", "Dieren – spullen voor kat en hond | Nestig",
     "Spullen waar je kat of hond blij van wordt. Nu bij Nestig: de kattenhangmat voor het raam, met gratis verzending.",
     dieren, current="dieren")

# ---------------------------------------------------------------- kamer
kamer = f'''<div class="wrap">
<p class="kruimel"><a href="./">Home</a> / Kamer</p>
<div class="paginakop"><span class="label">Binnenkort</span><h1>Voor je kamer</h1>
<p class="sub">Decoratie die je kamer gezelliger maakt. We zoeken op dit moment de eerste spullen uit.</p></div>
<div class="leeg">
<p>Wil je weten wanneer ze er zijn? Stuur een appje, dan laten we het je weten.</p>
<p><a class="btn btn-wa" href="https://wa.me/{WA}?text=Hoi%20Nestig%2C%20laat%20me%20weten%20wanneer%20de%20kamerspullen%20er%20zijn." target="_blank" rel="noopener">{WA_ICON}Hou me op de hoogte</a>
<a class="btn btn-lijn" href="dieren.html" style="margin-left:8px">Bekijk dieren</a></p>
</div>
</div>'''
page("kamer.html", "Kamer – decoratie voor je kamer | Nestig",
     "Decoratie die je kamer gezelliger maakt. Binnenkort bij Nestig.", kamer, current="kamer", noindex=True)

# ---------------------------------------------------------------- product
product = f'''<div class="wrap">
<p class="kruimel"><a href="./">Home</a> / <a href="dieren.html">Dieren</a> / Kattenhangmat</p>
<div class="product">
<div class="galerij">{raam("p")}</div>
<div class="koop">
<h1>Kattenhangmat voor het raam</h1>
<p class="sub">Een eigen plek in de zon, hoog en droog aan het raam. Je kat ligt zacht en houdt alles in de gaten.</p>
<p class="prijs">€ {PRIJS}<small>Inclusief btw en gratis verzending</small></p>
<form data-product="kattenhangmat">
<fieldset class="veld"><legend>Kleur: <span data-gekozen-kleur>Zwart</span></legend>
<div class="kleuren">
<label style="--k:#2b2f33"><input type="radio" name="kleur" value="zwart" checked><i></i>Zwart</label>
<label style="--k:#9aa6a8"><input type="radio" name="kleur" value="grijs"><i></i>Grijs</label>
<label style="--k:#d8c19b"><input type="radio" name="kleur" value="beige"><i></i>Beige</label>
</div></fieldset>
<div class="veld"><span class="veldkop" id="aantal-kop">Aantal</span>
<div class="teller" role="group" aria-labelledby="aantal-kop">
<button type="button" data-min aria-label="Eén minder">−</button>
<input type="number" inputmode="numeric" min="1" max="10" value="1" aria-label="Aantal">
<button type="button" data-plus aria-label="Eén meer">+</button>
</div></div>
<button class="btn btn-zon btn-breed" type="submit">In winkelmand</button>
</form>
<div class="toegevoegd" data-toegevoegd hidden role="status"><span data-toegevoegd-tekst></span><a class="link" href="bestellen.html">Verder naar bestellen</a></div>
<ul class="zeker">
<li>Levertijd {LEVERTIJD}, met track-en-trace</li>
<li>Gratis verzending in Nederland</li>
<li>14 dagen bedenktijd</li>
<li>Vragen? <a class="link" href="{WA_VRAAG}" target="_blank" rel="noopener">App {TEL_TOON}</a></li>
</ul>
</div>
</div>
</div>

<section class="sec band"><div class="wrap uitleg">
<div>
<h2>Waarom katten dit fijn vinden</h2>
<p>Katten zoeken warmte en overzicht. Een plek tegen het raam geeft allebei: de zon op de vacht en zicht op alles wat buiten beweegt.</p>
<p>De hangmat hangt aan het glas en neemt geen plek in op de vensterbank of de vloer. Handig als je vensterbank smal is of vol planten staat.</p>
</div>
<div>
<h2>Wat je krijgt</h2>
<table class="specs">
<tr><th scope="row">In de doos</th><td>Kattenhangmat met zuignappen</td></tr>
<tr><th scope="row">Bevestiging</th><td>Zuignappen op het raam, zonder boren</td></tr>
<tr><th scope="row">Kleuren</th><td>Zwart, grijs en beige</td></tr>
<tr><th scope="row">Levertijd</th><td>{LEVERTIJD}</td></tr>
<tr><th scope="row">Verzending</th><td>Gratis in Nederland</td></tr>
</table>
</div>
</div></section>

<section class="sec"><div class="wrap">
<h2>Zo hangt hij in een paar minuten</h2>
{STAPPEN}
</div></section>

<section class="sec band" id="vragen"><div class="wrap">
<h2>Veelgestelde vragen</h2>
{vragen()}
</div></section>'''
page("kattenhangmat.html", f"Kattenhangmat voor het raam – € {PRIJS}, gratis verzending | Nestig",
     f"Kattenhangmat met zuignappen voor het raam. Zonder boren op te hangen, in drie kleuren. € {PRIJS} met gratis verzending en 14 dagen bedenktijd.",
     product, current="dieren", ld={
         "@context": "https://schema.org", "@type": "Product", "name": "Kattenhangmat voor het raam",
         "description": "Kattenhangmat met zuignappen voor het raam. Zonder boren op te hangen.",
         "image": SITE + "img/og.jpg", "brand": {"@type": "Brand", "name": "Nestig"},
         "offers": {"@type": "Offer", "url": SITE + "kattenhangmat", "priceCurrency": "EUR", "price": "27.95",
                    "availability": "https://schema.org/InStock",
                    "shippingDetails": {"@type": "OfferShippingDetails",
                                        "shippingRate": {"@type": "MonetaryAmount", "value": "0", "currency": "EUR"},
                                        "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "NL"},
                                        "deliveryTime": {"@type": "ShippingDeliveryTime",
                                                         "handlingTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY"},
                                                         "transitTime": {"@type": "QuantitativeValue", "minValue": 8, "maxValue": 18, "unitCode": "DAY"}}},
                    "hasMerchantReturnPolicy": {"@type": "MerchantReturnPolicy", "applicableCountry": "NL",
                                                "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                                                "merchantReturnDays": 14, "returnMethod": "https://schema.org/ReturnByMail",
                                                "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility"}},
     })

# ---------------------------------------------------------------- bestellen
bestellen = f'''<div class="wrap">
<p class="kruimel"><a href="./">Home</a> / Bestellen</p>
<div class="paginakop"><h1>Bestellen</h1></div>

<div class="leeg" data-mand-leeg hidden>
<p class="sub">Je winkelmand is leeg.</p>
<a class="btn btn-zon" href="kattenhangmat.html">Bekijk de kattenhangmat</a>
</div>

<div class="bestel" data-mand-vol>
<form class="form" data-bestelform novalidate-off>
<h2>Waar mag het heen?</h2>
<div class="velden">
<div class="heel"><label for="naam">Voor- en achternaam</label><input type="text" id="naam" name="naam" autocomplete="name" required></div>
<div class="heel"><label for="straat">Straat en huisnummer</label><input type="text" id="straat" name="straat" autocomplete="street-address" required></div>
<div><label for="postcode">Postcode</label><input type="text" id="postcode" name="postcode" autocomplete="postal-code" required pattern="[1-9][0-9]{{3}} ?[A-Za-z]{{2}}" title="Vul een postcode in zoals 1441 AB" placeholder="1441 AB"></div>
<div><label for="plaats">Plaats</label><input type="text" id="plaats" name="plaats" autocomplete="address-level2" required></div>
<div><label for="email">E-mailadres</label><input type="email" id="email" name="email" autocomplete="email" required></div>
<div><label for="telefoon">Telefoon <span>(mag leeg blijven)</span></label><input type="tel" id="telefoon" name="telefoon" autocomplete="tel"></div>
<div class="heel"><label for="opmerking">Opmerking <span>(mag leeg blijven)</span></label><textarea id="opmerking" name="opmerking"></textarea></div>
</div>
<div class="akkoord"><input type="checkbox" id="akkoord" name="akkoord" required>
<label for="akkoord">Ik ga akkoord met de <a class="link" href="algemene-voorwaarden.html" target="_blank">algemene voorwaarden</a> en heb gelezen hoe <a class="link" href="retourneren.html" target="_blank">retourneren</a> werkt.</label></div>

<h2>Bestelling plaatsen</h2>
<p class="zacht">Je bestelling opent als bericht in WhatsApp of in je mailprogramma. Daar druk je zelf op verzenden. Daarna sturen we je een betaalverzoek voor iDEAL. Met het versturen plaats je een bestelling met betaalverplichting.</p>
<div class="verstuur">
<button class="btn btn-wa" type="submit">{WA_ICON}Bestel via WhatsApp</button>
<button class="btn btn-lijn" type="button" data-via-mail>Bestel via e-mail</button>
</div>
<div class="melding" data-melding hidden role="status"><span data-melding-tekst></span></div>
</form>

<aside class="overzicht" aria-label="Je bestelling">
<h2>Je bestelling</h2>
<ul data-regels style="list-style:none"></ul>
<div class="rij"><span>Verzending</span><span>Gratis</span></div>
<div class="totaal"><span>Totaal, inclusief btw</span><b data-totaal>€ 0,00</b></div>
<p class="zacht klein" style="margin-top:14px">Levertijd {LEVERTIJD}. Je krijgt een track-en-tracecode zodra je pakket onderweg is.</p>
</aside>
</div>
</div>'''.replace(" novalidate-off", "")
page("bestellen.html", "Bestellen | Nestig", "Rond je bestelling bij Nestig af.", bestellen, noindex=True)

# ---------------------------------------------------------------- retourneren
WIE = f'''<address>Nestig, onderdeel van byXavio<br>{STRAAT}<br>{POSTCODE} {PLAATS}<br>
WhatsApp en telefoon: <a class="link" href="tel:{TEL}">{TEL_TOON}</a><br>
E-mail: <a class="link" href="mailto:{MAIL}">{MAIL}</a><br>
KVK {KVK}, btw-id {BTW}</address>'''

retour = f'''<div class="wrap tekst">
<p class="kruimel"><a href="./">Home</a> / Retourneren</p>
<div class="paginakop"><h1>Retourneren</h1></div>
<p class="sub">Je hebt 14 dagen bedenktijd. Je hoeft niet uit te leggen waarom je iets terugstuurt.</p>

<h2>Zo werkt het</h2>
<ol>
<li>Meld je retour binnen 14 dagen nadat je je pakket hebt ontvangen. Dat kan via <a class="link" href="{WA_VRAAG}" target="_blank" rel="noopener">WhatsApp</a>, per <a class="link" href="mailto:{MAIL}?subject=Retour%20Nestig">e-mail</a> of met het formulier onderaan deze pagina.</li>
<li>Je krijgt van ons het retouradres.</li>
<li>Stuur het product binnen 14 dagen na je melding terug. Bewaar je verzendbewijs.</li>
<li>Wij betalen het aankoopbedrag terug binnen 14 dagen na je melding, op dezelfde manier als waarop je betaald hebt. We mogen daarmee wachten tot het product binnen is of tot je ons het verzendbewijs stuurt.</li>
</ol>

<h2>Wat kost het?</h2>
<p>De kosten voor het terugsturen betaal je zelf. Het aankoopbedrag krijg je volledig terug.</p>

<h2>In welke staat moet het product zijn?</h2>
<p>Je mag het product uitpakken en bekijken zoals je dat in een winkel zou doen. Is het verder gebruikt of beschadigd, dan mogen we de waardevermindering van het terug te betalen bedrag afhalen. Stuur het zo compleet mogelijk terug, het liefst in de originele verpakking.</p>

<h2>Kapot of iets anders dan je bestelde?</h2>
<p>Stuur een foto via WhatsApp of e-mail. We lossen het op met een nieuw product of je geld terug. Dat kost jou niets.</p>

<h2>Formulier voor herroeping</h2>
<div class="kader">
<p>Je hoeft dit formulier alleen in te vullen en op te sturen als je de bestelling wilt herroepen. Kopieer de tekst en mail hem naar <a class="link" href="mailto:{MAIL}?subject=Herroeping%20Nestig">{MAIL}</a>.</p>
<p>Aan: Nestig, onderdeel van byXavio, {STRAAT}, {POSTCODE} {PLAATS}, {MAIL}</p>
<p>Ik deel u hierbij mee dat ik onze overeenkomst over de verkoop van het volgende product herroep:</p>
<p>Product:<br>Besteld op / ontvangen op:<br>Naam:<br>Adres:<br>Datum:</p>
</div>

<h2>Contact</h2>
{WIE}
</div>'''
page("retourneren.html", "Retourneren – 14 dagen bedenktijd | Nestig",
     "Bij Nestig heb je 14 dagen bedenktijd. Lees hoe je een product terugstuurt en wanneer je je geld terugkrijgt.", retour)

# ---------------------------------------------------------------- voorwaarden
av = f'''<div class="wrap tekst">
<p class="kruimel"><a href="./">Home</a> / Algemene voorwaarden</p>
<div class="paginakop"><h1>Algemene voorwaarden</h1></div>
<p class="sub">Versie van 8 oktober 2026.</p>

<h2>1. Wie we zijn</h2>
{WIE}

<h2>2. Wanneer deze voorwaarden gelden</h2>
<p>Deze voorwaarden gelden voor elke bestelling die je als consument bij Nestig plaatst. Door te bestellen ga je ermee akkoord.</p>

<h2>3. Aanbod en prijzen</h2>
<p>Alle prijzen op de site zijn in euro en inclusief btw en verzendkosten. Een duidelijke vergissing in een prijs of beschrijving bindt ons niet. Afbeeldingen geven een zo goed mogelijk beeld van het product. Kleuren kunnen op je scherm iets afwijken.</p>

<h2>4. Bestellen en betalen</h2>
<p>Je plaatst een bestelling door ons je bestelling te sturen via het bestelformulier. Daarna ontvang je van ons een betaalverzoek. De overeenkomst komt tot stand zodra wij je bestelling hebben bevestigd. We versturen je bestelling nadat je betaling binnen is.</p>

<h2>5. Levering</h2>
<p>We bezorgen in Nederland. De verwachte levertijd is {LEVERTIJD} na ontvangst van je betaling. Je bestelling wordt rechtstreeks door onze leverancier verstuurd. Je krijgt een track-en-tracecode zodra het pakket onderweg is.</p>
<p>Is je bestelling 30 dagen na je betaling nog niet geleverd, dan mag je de bestelling kosteloos annuleren en betalen wij het bedrag binnen 14 dagen terug. Het risico van beschadiging of verlies ligt bij ons tot je het pakket hebt ontvangen.</p>

<h2>6. Bedenktijd en retourneren</h2>
<p>Je hebt 14 dagen bedenktijd vanaf de dag dat je het product ontvangt. In die tijd mag je de koop zonder opgaaf van reden ongedaan maken. Hoe dat werkt en wat het kost, lees je op de pagina <a class="link" href="retourneren.html">retourneren</a>. Die pagina hoort bij deze voorwaarden.</p>

<h2>7. Garantie</h2>
<p>Je hebt recht op een goed product. Voldoet het niet aan wat je ervan mag verwachten, dan zorgen wij kosteloos voor herstel of vervanging. Lukt dat niet, dan krijg je je geld terug. Dit is de wettelijke garantie. Die blijft altijd gelden.</p>

<h2>8. Veilig gebruik</h2>
<p>Volg de aanwijzingen bij het product. Hang de kattenhangmat op glad, schoon en droog glas, test hem met je hand voordat je kat erop gaat en controleer de zuignappen regelmatig.</p>

<h2>9. Klachten</h2>
<p>Niet tevreden? Laat het ons zo snel mogelijk weten via WhatsApp, telefoon of e-mail. Je krijgt binnen 14 dagen een inhoudelijk antwoord.</p>

<h2>10. Toepasselijk recht</h2>
<p>Op elke bestelling is Nederlands recht van toepassing.</p>
</div>'''
page("algemene-voorwaarden.html", "Algemene voorwaarden | Nestig",
     "De algemene voorwaarden van Nestig: bestellen, betalen, levering, bedenktijd en garantie.", av)

# ---------------------------------------------------------------- privacy
privacy = f'''<div class="wrap tekst">
<p class="kruimel"><a href="./">Home</a> / Privacy</p>
<div class="paginakop"><h1>Privacyverklaring</h1></div>
<p class="sub">Versie van 8 oktober 2026. Hier lees je welke gegevens Nestig gebruikt en waarom.</p>

<h2>Wie is verantwoordelijk?</h2>
{WIE}

<h2>Welke gegevens we gebruiken</h2>
<ul>
<li><strong>Bij een bestelling:</strong> je naam, adres, e-mailadres, wat je bestelt en, als je het invult, je telefoonnummer en je opmerking.</li>
<li><strong>Bij een vraag:</strong> wat je ons via WhatsApp, e-mail of telefoon stuurt of vertelt.</li>
<li><strong>Bij een betaling:</strong> dat je betaald hebt en het bedrag. Je bankgegevens zien wij alleen voor zover ze op het bankafschrift staan.</li>
</ul>

<h2>Waarvoor en op welke grond</h2>
<ul>
<li>Om je bestelling te leveren en je daarover te berichten. Dat is nodig om de koopovereenkomst uit te voeren.</li>
<li>Om je vragen te beantwoorden en retouren af te handelen. Ook dat hoort bij de overeenkomst.</li>
<li>Om onze administratie bij te houden. Dat is een wettelijke plicht.</li>
</ul>
<p>We sturen je geen reclame en verkopen je gegevens niet.</p>

<h2>Met wie we gegevens delen</h2>
<ul>
<li><strong>Onze leverancier en de bezorgdienst.</strong> Zij krijgen je naam en adres om het pakket te bezorgen. Onze leverancier is gevestigd buiten de Europese Unie, in China. We geven alleen door wat voor de bezorging nodig is.</li>
<li><strong>WhatsApp.</strong> Bestel je of stel je een vraag via WhatsApp, dan loopt je bericht via WhatsApp, een dienst van Meta. Bestel je liever zonder WhatsApp, kies dan voor e-mail.</li>
<li><strong>De hostingpartij van deze website.</strong> Die verwerkt technische gegevens zoals je IP-adres om de site te tonen en te beveiligen.</li>
</ul>

<h2>Hoe lang we gegevens bewaren</h2>
<p>Gegevens van een bestelling bewaren we 7 jaar, omdat de Belastingdienst dat van ons vraagt. Berichten zonder bestelling verwijderen we binnen een jaar.</p>

<h2>Cookies</h2>
<p>Deze site plaatst geen volgcookies en gebruikt geen advertentie- of statistiekdiensten. Je winkelmand wordt in je eigen browser bewaard, zodat hij blijft staan als je verder kijkt. Die informatie wordt niet naar ons gestuurd totdat je zelf je bestelling verstuurt. De lettertypen staan op onze eigen server.</p>

<h2>Jouw rechten</h2>
<p>Je mag ons vragen welke gegevens we van je hebben, en vragen om ze te verbeteren of te verwijderen. Je mag ook bezwaar maken tegen het gebruik. Stuur daarvoor een bericht naar <a class="link" href="mailto:{MAIL}">{MAIL}</a>. Je krijgt binnen een maand antwoord. Ben je het niet met ons eens, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.</p>
</div>'''
page("privacy.html", "Privacyverklaring | Nestig",
     "Welke gegevens Nestig gebruikt, waarvoor, met wie ze gedeeld worden en hoe lang ze bewaard blijven.", privacy)

# ---------------------------------------------------------------- 404
nf = f'''<div class="wrap leeg" style="padding-top:60px">
<h1>Deze pagina bestaat niet</h1>
<p class="sub">Misschien is de link verouderd of zit er een typfout in het adres.</p>
<a class="btn btn-zon" href="./">Naar de homepage</a>
</div>'''
page("404.html", "Pagina niet gevonden | Nestig", "Deze pagina bestaat niet.", nf, noindex=True)

# ---------------------------------------------------------------- overig
(OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /bestellen\nSitemap: {SITE}sitemap.xml\n")
urls = ["", "kattenhangmat", "dieren", "retourneren", "algemene-voorwaarden", "privacy"]
(OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                 + "".join(f"  <url><loc>{SITE}{u}</loc></url>\n" for u in urls) + "</urlset>\n")
(OUT / "favicon.svg").write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="14" fill="#fff" stroke="{INK}" stroke-width="5"/><rect x="12" y="12" width="40" height="40" rx="6" fill="#dcecf1"/><circle cx="38" cy="27" r="10" fill="#ffc83d" stroke="{INK}" stroke-width="3.5"/><rect x="12" y="41" width="40" height="7" rx="3.5" fill="{INK}"/></svg>''')
if "--og" in sys.argv:
  (OUT / "_og.html").write_text(f'''<!doctype html><html lang="nl"><head><meta charset="utf-8"><link rel="stylesheet" href="css/style.css"><style>
body{{width:1200px;height:630px;background:var(--glas);display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:40px;padding:0 70px;overflow:hidden}}
.l{{font:italic 600 64px/1 var(--display);display:flex;align-items:baseline}}.l i{{width:22px;height:22px;border-radius:50%;background:var(--zon);border:3px solid var(--ink);margin-left:8px}}
h1{{font-size:68px;margin-top:34px}}p{{font-size:30px;margin-top:26px}}.raam{{max-width:400px}}</style></head><body>
<div><div class="l">nestig<i></i></div><h1>Het beste plekje in huis hangt aan het raam.</h1><p>Kattenhangmat voor het raam, € {PRIJS}</p></div>{raam("og", label=False)}</body></html>''')
print("klaar:", sorted(p.name for p in OUT.iterdir()))
