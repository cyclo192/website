/* byXavio chatbot widget v2 – praat met de Cloudflare Worker "byxavio-chat" */
(function () {
  var ENDPOINT = 'https://byxavio-chat.goeijdjego.workers.dev';
  var WA = 'https://wa.me/31626683986?text=' + encodeURIComponent('Hoi Djego, ik heb een vraag over een website');
  var STORE = 'byxavio_chat_v2';
  var NUDGE = 'byxavio_chat_nudged';

  var T = {
    nl: {
      title: 'Xavio', sub: 'AI-assistent van byXavio · antwoordt direct',
      hello: 'Hoi! Ik ben Xavio, de AI-assistent van byXavio. Ik beantwoord je vragen, help je het juiste pakket kiezen en kan je aanvraag direct naar Djego sturen.',
      ph: 'Typ je vraag…', send: 'Verstuur', open: 'Open de chat', close: 'Sluit de chat', reset: 'Nieuw gesprek',
      chips: ['Help me een pakket kiezen', 'Wat kost een chatbot?', 'Offerte aanvragen'],
      cta: 'Offerteformulier', wa: 'WhatsApp Djego',
      error: 'Ik kan nu even niet antwoorden. Stuur Djego een WhatsApp, dan krijg je meestal dezelfde dag antwoord.',
      rate: 'Je stuurt wel heel veel berichten achter elkaar. Probeer het over een paar minuten opnieuw, of stuur Djego een WhatsApp.',
      sent: 'Aanvraag verstuurd naar Djego',
      failed: 'Doorsturen lukte niet. Stuur je aanvraag even via WhatsApp of het offerteformulier.',
      nudge: 'Vraag het Xavio! Ik help je in 1 minuut het juiste pakket kiezen.',
      note: 'Xavio is een AI en kan fouten maken. Gegevens die je deelt worden alleen gebruikt om je aanvraag te beantwoorden.'
    },
    en: {
      title: 'Xavio', sub: 'byXavio AI assistant · replies instantly',
      hello: 'Hi! I\'m Xavio, the byXavio AI assistant. I can answer your questions, help you pick the right package and send your request straight to Djego.',
      ph: 'Type your question…', send: 'Send', open: 'Open chat', close: 'Close chat', reset: 'New chat',
      chips: ['Help me choose a package', 'How much is a website?', 'Request a quote'],
      cta: 'Quote form', wa: 'WhatsApp Djego',
      error: 'I can\'t reply right now. Send Djego a WhatsApp and you\'ll usually hear back the same day.',
      rate: 'That\'s a lot of messages in a row. Please try again in a few minutes, or WhatsApp Djego.',
      sent: 'Request sent to Djego',
      failed: 'Sending didn\'t work. Please use WhatsApp or the quote form.',
      nudge: 'Ask Xavio! I\'ll help you pick the right package in a minute.',
      note: 'Xavio is an AI and can make mistakes. Details you share are only used to reply to your request.'
    },
    de: {
      title: 'Xavio', sub: 'KI-Assistent von byXavio · antwortet sofort',
      hello: 'Hallo! Ich bin Xavio, der KI-Assistent von byXavio. Ich beantworte deine Fragen, helfe dir beim passenden Paket und schicke deine Anfrage direkt an Djego.',
      ph: 'Deine Frage…', send: 'Senden', open: 'Chat öffnen', close: 'Chat schließen', reset: 'Neuer Chat',
      chips: ['Hilf mir beim Paket', 'Was kostet eine Website?', 'Angebot anfragen'],
      cta: 'Angebotsformular', wa: 'WhatsApp an Djego',
      error: 'Ich kann gerade nicht antworten. Schreib Djego per WhatsApp, meist antwortet er noch am selben Tag.',
      rate: 'Das sind viele Nachrichten hintereinander. Versuch es in ein paar Minuten erneut oder schreib Djego per WhatsApp.',
      sent: 'Anfrage an Djego gesendet',
      failed: 'Senden hat nicht geklappt. Bitte nutze WhatsApp oder das Angebotsformular.',
      nudge: 'Frag Xavio! Ich helfe dir in einer Minute beim passenden Paket.',
      note: 'Xavio ist eine KI und kann Fehler machen. Deine Angaben werden nur für deine Anfrage verwendet.'
    },
    fr: {
      title: 'Xavio', sub: 'Assistant IA de byXavio · répond tout de suite',
      hello: 'Bonjour ! Je suis Xavio, l\'assistant IA de byXavio. Je réponds à vos questions, vous aide à choisir la bonne formule et peux transmettre votre demande directement à Djego.',
      ph: 'Votre question…', send: 'Envoyer', open: 'Ouvrir le chat', close: 'Fermer le chat', reset: 'Nouvelle discussion',
      chips: ['Aidez-moi à choisir', 'Combien coûte un site ?', 'Demander un devis'],
      cta: 'Formulaire de devis', wa: 'WhatsApp Djego',
      error: 'Je ne peux pas répondre pour le moment. Envoyez un WhatsApp à Djego, il répond souvent le jour même.',
      rate: 'Beaucoup de messages d\'affilée. Réessayez dans quelques minutes, ou écrivez à Djego sur WhatsApp.',
      sent: 'Demande envoyée à Djego',
      failed: 'L\'envoi a échoué. Utilisez WhatsApp ou le formulaire de devis.',
      nudge: 'Demandez à Xavio ! Je vous aide à choisir la bonne formule en une minute.',
      note: 'Xavio est une IA et peut se tromper. Vos données servent uniquement à répondre à votre demande.'
    },
    es: {
      title: 'Xavio', sub: 'Asistente IA de byXavio · responde al instante',
      hello: '¡Hola! Soy Xavio, el asistente IA de byXavio. Respondo tus preguntas, te ayudo a elegir el paquete adecuado y puedo enviar tu solicitud directamente a Djego.',
      ph: 'Escribe tu pregunta…', send: 'Enviar', open: 'Abrir chat', close: 'Cerrar chat', reset: 'Nueva conversación',
      chips: ['Ayúdame a elegir', '¿Cuánto cuesta una web?', 'Pedir presupuesto'],
      cta: 'Formulario de presupuesto', wa: 'WhatsApp a Djego',
      error: 'Ahora mismo no puedo responder. Escribe a Djego por WhatsApp, suele contestar el mismo día.',
      rate: 'Son muchos mensajes seguidos. Inténtalo de nuevo en unos minutos o escribe a Djego por WhatsApp.',
      sent: 'Solicitud enviada a Djego',
      failed: 'No se pudo enviar. Usa WhatsApp o el formulario de presupuesto.',
      nudge: '¡Pregúntale a Xavio! Te ayudo a elegir el paquete adecuado en un minuto.',
      note: 'Xavio es una IA y puede equivocarse. Tus datos solo se usan para responder a tu solicitud.'
    }
  };

  function lang() {
    var l = '';
    try { l = localStorage.getItem('byxavio_lang') || ''; } catch (e) {}
    l = (l || document.documentElement.lang || 'nl').slice(0, 2).toLowerCase();
    return T[l] ? l : 'nl';
  }
  function t(k) { return T[lang()][k]; }

  var css = '' +
  '.xc-btn{position:fixed;right:18px;bottom:86px;z-index:61;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;' +
    'background:var(--navy,#1a1b3a);display:grid;place-items:center;box-shadow:0 14px 28px -12px rgba(0,0,0,.55);transition:transform .2s ease}' +
  '.xc-btn:hover{transform:scale(1.06)}.xc-btn svg{width:28px;height:28px}' +
  '.xc-btn .xc-dot{position:absolute;top:3px;right:3px;width:12px;height:12px;border-radius:50%;background:var(--cyan,#00d2df);border:2px solid var(--navy,#1a1b3a)}' +
  '.xc-nudge{position:fixed;right:86px;bottom:92px;z-index:61;max-width:230px;background:#fff;color:var(--navy,#1a1b3a);border:1px solid var(--line,#e1e4ef);' +
    'border-radius:14px 14px 4px 14px;padding:11px 32px 11px 14px;font:600 .86rem/1.4 var(--body,system-ui,sans-serif);box-shadow:0 16px 32px -16px rgba(16,17,40,.45);cursor:pointer;animation:xcIn .3s ease}' +
  '.xc-nudge button{position:absolute;top:4px;right:6px;border:0;background:none;color:var(--muted,#585b7c);font-size:1.1rem;cursor:pointer;padding:2px 4px}' +
  '.xc-panel{position:fixed;right:18px;bottom:86px;z-index:62;width:390px;max-width:calc(100vw - 36px);height:min(600px,calc(100vh - 120px));' +
    'background:#fff;border-radius:22px;box-shadow:0 30px 60px -20px rgba(16,17,40,.55);display:none;flex-direction:column;overflow:hidden;' +
    'font-family:var(--body,system-ui,sans-serif);color:var(--navy,#1a1b3a)}' +
  '.xc-panel.open{display:flex;animation:xcIn .22s ease}' +
  '@keyframes xcIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
  '.xc-head{background:var(--night,#101128);color:#fff;padding:14px 12px 14px 18px;display:flex;align-items:center;gap:12px}' +
  '.xc-av{position:relative;width:40px;height:40px;border-radius:50%;background:var(--cyan,#00d2df);color:var(--night,#101128);display:grid;place-items:center;' +
    'font-family:var(--display,system-ui);font-weight:800;font-size:1.05rem;flex:none}' +
  '.xc-av:after{content:"";position:absolute;right:0;bottom:1px;width:10px;height:10px;border-radius:50%;background:#2ee08a;border:2px solid var(--night,#101128)}' +
  '.xc-head b{display:block;font-family:var(--display,system-ui);font-size:1.02rem;font-weight:600}' +
  '.xc-head small{color:var(--dim,#b9bcdd);font-size:.78rem}' +
  '.xc-tools{margin-left:auto;display:flex;gap:2px}' +
  '.xc-ic{background:none;border:0;color:#fff;cursor:pointer;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;opacity:.85}' +
  '.xc-ic:hover{background:rgba(255,255,255,.1);opacity:1}.xc-ic svg{width:18px;height:18px}' +
  '.xc-log{flex:1;overflow-y:auto;padding:18px 16px 8px;background:var(--mist,#f3f5fb);display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
  '.xc-m{max-width:86%;padding:10px 14px;border-radius:16px;font-size:.93rem;line-height:1.5;word-wrap:break-word}' +
  '.xc-m p{margin:0}.xc-m p+p,.xc-m p+ul,.xc-m ul+p{margin-top:8px}.xc-m ul{margin:6px 0 0;padding-left:18px}.xc-m li{margin:2px 0}' +
  '.xc-m.bot{background:#fff;border:1px solid var(--line,#e1e4ef);border-bottom-left-radius:5px;align-self:flex-start}' +
  '.xc-m.me{background:var(--navy,#1a1b3a);color:#fff;border-bottom-right-radius:5px;align-self:flex-end;white-space:pre-wrap}' +
  '.xc-m a{color:var(--cyan-ink,#006b75);font-weight:600}.xc-m.me a{color:#fff}' +
  '.xc-m strong{font-weight:700}' +
  '.xc-ok{align-self:center;display:flex;align-items:center;gap:8px;background:#e8faf0;color:#0f7a3d;font:700 .82rem var(--body,system-ui);padding:7px 14px;border-radius:999px}' +
  '.xc-ok.bad{background:#fdecea;color:#b3261e}' +
  '.xc-typing{display:inline-flex;gap:4px;padding:3px 0}.xc-typing i{width:7px;height:7px;border-radius:50%;background:var(--dim,#b9bcdd);animation:xcB 1s infinite}' +
  '.xc-typing i:nth-child(2){animation-delay:.15s}.xc-typing i:nth-child(3){animation-delay:.3s}' +
  '@keyframes xcB{0%,80%,100%{opacity:.35;transform:none}40%{opacity:1;transform:translateY(-3px)}}' +
  '.xc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0 2px;align-self:flex-start;max-width:100%}' +
  '.xc-chip{border:1px solid var(--cyan-ink,#006b75);color:var(--cyan-ink,#006b75);background:#fff;border-radius:999px;padding:7px 13px;' +
    'font:600 .82rem var(--body,system-ui);cursor:pointer;text-align:left}.xc-chip:hover{background:var(--cyan,#00d2df);color:var(--night,#101128);border-color:var(--cyan,#00d2df)}' +
  '.xc-acts{display:flex;gap:8px;padding:8px 14px 0;background:#fff;flex-wrap:wrap}' +
  '.xc-act{font:600 .78rem var(--body,system-ui);text-decoration:none;color:var(--navy,#1a1b3a);background:var(--mist,#f3f5fb);' +
    'border-radius:999px;padding:6px 12px}.xc-act.xc-wa{background:#e8faf0;color:#0f7a3d}' +
  '.xc-form{display:flex;gap:8px;padding:10px 12px 6px;background:#fff;align-items:flex-end}' +
  '.xc-in{flex:1;border:1px solid var(--line,#e1e4ef);border-radius:14px;padding:11px 14px;font:inherit;font-size:16px;line-height:1.35;color:inherit;outline:none;min-width:0;' +
    'resize:none;max-height:120px;min-height:46px;overflow-y:auto;box-sizing:border-box}' +
  '.xc-in:focus{border-color:var(--cyan,#00d2df)}' +
  '.xc-send{border:0;border-radius:14px;background:var(--cyan,#00d2df);color:var(--night,#101128);width:46px;height:46px;cursor:pointer;display:grid;place-items:center;flex:none}' +
  '.xc-send:disabled{opacity:.5;cursor:default}.xc-send svg{width:20px;height:20px}' +
  '.xc-note{margin:0;padding:0 16px 10px;background:#fff;font-size:.7rem;line-height:1.35;color:var(--muted,#585b7c)}' +
  '@media (max-width:680px){.xc-panel{right:0;left:0;bottom:0;width:100%;max-width:none;height:min(90vh,680px);border-radius:22px 22px 0 0}' +
    '.xc-open .wa,.xc-open .wa-bubble{display:none!important}.xc-nudge{right:18px;bottom:150px}}' +
  '@media (prefers-reduced-motion:reduce){.xc-panel.open,.xc-nudge{animation:none}.xc-typing i{animation:none}.xc-log{scroll-behavior:auto}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z" fill="#00d2df"/><circle cx="9" cy="9.5" r="1.2" fill="#101128"/><circle cx="12" cy="9.5" r="1.2" fill="#101128"/><circle cx="15" cy="9.5" r="1.2" fill="#101128"/></svg>';
  var sendIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h13M11 4.5 16.5 10 11 15.5"/></svg>';
  var resetIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10a6.5 6.5 0 1 0 2-4.7"/><path d="M3.5 3.5v3.8h3.8"/></svg>';
  var closeIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>';
  var checkIcon = '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'xc-panel';
  panel.setAttribute('role', 'dialog');
  panel.innerHTML =
    '<div class="xc-head"><div class="xc-av">X</div><div><b class="xc-title"></b><small class="xc-sub"></small></div>' +
    '<div class="xc-tools"><button class="xc-ic xc-reset" type="button">' + resetIcon + '</button>' +
    '<button class="xc-ic xc-x" type="button">' + closeIcon + '</button></div></div>' +
    '<div class="xc-log" aria-live="polite"></div>' +
    '<div class="xc-acts"><a class="xc-act xc-cta" href="#contact"></a><a class="xc-act xc-wa" target="_blank" rel="noopener"></a></div>' +
    '<form class="xc-form"><textarea class="xc-in" rows="1" maxlength="700"></textarea><button class="xc-send" type="submit">' + sendIcon + '</button></form>' +
    '<p class="xc-note"></p>';

  var btn = document.createElement('button');
  btn.className = 'xc-btn';
  btn.type = 'button';
  btn.innerHTML = chatIcon + '<span class="xc-dot"></span>';

  document.body.appendChild(panel);
  document.body.appendChild(btn);

  var log = panel.querySelector('.xc-log');
  var form = panel.querySelector('.xc-form');
  var input = panel.querySelector('.xc-in');
  var sendBtn = panel.querySelector('.xc-send');
  panel.querySelector('.xc-wa').href = WA;

  // state: { msgs: [{role, content, chips?, lead?}], leadSent: bool }
  var state = { msgs: [], leadSent: false };
  try { var s = JSON.parse(sessionStorage.getItem(STORE) || 'null'); if (s && Array.isArray(s.msgs)) state = s; } catch (e) {}
  var busy = false;

  function save() { try { sessionStorage.setItem(STORE, JSON.stringify({ msgs: state.msgs.slice(-40), leadSent: state.leadSent })); } catch (e) {} }

  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,!?)])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/(^|[\s(])((?:demo1|demo2|wolkje|winkelaar)\.byxavio\.nl|slingerottertje30\.com)(?![^<]*<\/a>)/g, '$1<a href="https://$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b(?![^<]*<\/a>)/gi, '<a href="mailto:$1">$1</a>');
    s = s.replace(/\b06[- ]?26683986\b/g, '<a href="' + WA + '" target="_blank" rel="noopener">$&</a>');
    return s;
  }

  function md(text) {
    var lines = text.split('\n'), out = '', list = false, para = [];
    function flush() { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } }
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { flush(); if (!list) { out += '<ul>'; list = true; } out += '<li>' + inline(m[1]) + '</li>'; return; }
      if (list) { out += '</ul>'; list = false; }
      if (!ln.trim()) { flush(); return; }
      para.push(ln.trim());
    });
    flush(); if (list) out += '</ul>';
    return out;
  }

  function scroll() { log.scrollTop = log.scrollHeight; }

  function bubble(role, text) {
    var d = document.createElement('div');
    d.className = 'xc-m ' + (role === 'user' ? 'me' : 'bot');
    if (role === 'user') d.textContent = text; else d.innerHTML = md(text);
    log.appendChild(d);
    scroll();
    return d;
  }

  function badge(ok, text) {
    var d = document.createElement('div');
    d.className = 'xc-ok' + (ok ? '' : ' bad');
    d.innerHTML = (ok ? checkIcon : '') + '<span></span>';
    d.querySelector('span').textContent = text;
    log.appendChild(d);
    scroll();
  }

  function clearChips() { var c = log.querySelectorAll('.xc-chips'); for (var i = 0; i < c.length; i++) c[i].remove(); }

  function chips(list) {
    clearChips();
    if (!list || !list.length) return;
    var wrap = document.createElement('div');
    wrap.className = 'xc-chips';
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'xc-chip'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    scroll();
  }

  function render() {
    panel.setAttribute('aria-label', t('title'));
    panel.querySelector('.xc-title').textContent = t('title');
    panel.querySelector('.xc-sub').textContent = t('sub');
    panel.querySelector('.xc-x').setAttribute('aria-label', t('close'));
    panel.querySelector('.xc-reset').setAttribute('aria-label', t('reset'));
    panel.querySelector('.xc-reset').title = t('reset');
    panel.querySelector('.xc-cta').textContent = t('cta');
    panel.querySelector('.xc-wa').textContent = t('wa');
    panel.querySelector('.xc-note').textContent = t('note');
    input.placeholder = t('ph');
    input.setAttribute('aria-label', t('ph'));
    sendBtn.setAttribute('aria-label', t('send'));
    btn.setAttribute('aria-label', t('open'));
    log.innerHTML = '';
    bubble('assistant', t('hello'));
    state.msgs.forEach(function (m) {
      bubble(m.role, m.content);
      if (m.lead === 'sent') badge(true, t('sent'));
      if (m.lead === 'failed' || m.lead === 'invalid') badge(false, t('failed'));
    });
    var last = state.msgs[state.msgs.length - 1];
    if (!state.msgs.length) chips(t('chips'));
    else if (last && last.role === 'assistant' && last.chips) chips(last.chips);
  }

  function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }

  function ask(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true;
    clearChips();
    state.msgs.push({ role: 'user', content: text.slice(0, 700) });
    save();
    bubble('user', text);
    var typing = bubble('assistant', '');
    typing.innerHTML = '<span class="xc-typing"><i></i><i></i><i></i></span>';

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lang: lang(),
        page: (location.pathname + location.hash).slice(0, 100),
        leadSent: state.leadSent,
        messages: state.msgs.slice(-20).map(function (m) { return { role: m.role, content: m.content }; })
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (r.status === 429) throw new Error('rate');
      return r.ok ? r.json() : Promise.reject(r.status);
    }).then(function (d) {
      if (!d || !d.reply) throw new Error('empty');
      typing.innerHTML = md(d.reply);
      var m = { role: 'assistant', content: d.reply };
      if (d.chips && d.chips.length) m.chips = d.chips;
      if (d.lead) m.lead = d.lead;
      state.msgs.push(m);
      if (d.lead === 'sent') { state.leadSent = true; badge(true, t('sent')); }
      else if (d.lead === 'failed' || d.lead === 'invalid') badge(false, t('failed'));
      save();
      chips(m.chips);
    }).catch(function (e) {
      typing.innerHTML = md(e && e.message === 'rate' ? t('rate') : t('error'));
      state.msgs.pop(); save();
    }).then(function () {
      clearTimeout(timer);
      busy = false; sendBtn.disabled = false;
      scroll();
      if (window.matchMedia && !window.matchMedia('(max-width:680px)').matches) input.focus();
    });
  }

  var nudgeEl = null;
  function hideNudge() { if (nudgeEl) { nudgeEl.remove(); nudgeEl = null; } }

  function open() {
    hideNudge();
    try { sessionStorage.setItem(NUDGE, '1'); } catch (e) {}
    panel.classList.add('open');
    document.body.classList.add('xc-open');
    btn.style.display = 'none';
    var dot = btn.querySelector('.xc-dot'); if (dot) dot.remove();
    var wb = document.getElementById('waBubble'); if (wb) wb.style.display = 'none';
    scroll();
    setTimeout(function () { input.focus(); }, 60);
  }
  function close() {
    panel.classList.remove('open');
    document.body.classList.remove('xc-open');
    btn.style.display = '';
    btn.focus();
  }
  function reset() {
    if (busy) return;
    state = { msgs: [], leadSent: false };
    save();
    render();
    input.focus();
  }

  btn.addEventListener('click', open);
  panel.querySelector('.xc-x').addEventListener('click', close);
  panel.querySelector('.xc-reset').addEventListener('click', reset);
  panel.querySelector('.xc-cta').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; grow(); ask(v); });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  });

  var sel = document.getElementById('langSelect');
  if (sel) sel.addEventListener('change', function () { setTimeout(render, 0); });

  // vriendelijk seintje na 20 seconden, één keer per bezoek
  var nudged = false;
  try { nudged = sessionStorage.getItem(NUDGE) === '1'; } catch (e) {}
  if (!nudged && !state.msgs.length) {
    setTimeout(function () {
      if (panel.classList.contains('open')) return;
      try { sessionStorage.setItem(NUDGE, '1'); } catch (e) {}
      nudgeEl = document.createElement('div');
      nudgeEl.className = 'xc-nudge';
      nudgeEl.innerHTML = '<span></span><button type="button" aria-label="' + esc(t('close')) + '">&times;</button>';
      nudgeEl.querySelector('span').textContent = t('nudge');
      nudgeEl.addEventListener('click', function (e) { if (e.target.tagName === 'BUTTON') { hideNudge(); return; } open(); });
      document.body.appendChild(nudgeEl);
      var wb = document.getElementById('waBubble'); if (wb) wb.style.display = 'none';
    }, 20000);
  }

  render();
})();
