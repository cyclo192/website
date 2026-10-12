/* byXavio chatbot widget – praat met de Cloudflare Worker op chat.byxavio.nl */
(function () {
  var ENDPOINT = 'https://byxavio-chat.goeijdjego.workers.dev';
  var WA = 'https://wa.me/31626683986?text=' + encodeURIComponent('Hoi Djego, ik heb een vraag over een website');
  var STORE = 'byxavio_chat';

  var T = {
    nl: {
      title: 'byXavio assistent', sub: 'AI-assistent · antwoordt direct',
      hello: 'Hoi! Ik ben de AI-assistent van byXavio. Vraag me gerust iets over websites, prijzen of hoe het werkt.',
      ph: 'Typ je vraag…', send: 'Verstuur', open: 'Open de chat', close: 'Sluit de chat',
      chips: ['Wat kost een website?', 'Hoe snel staat mijn site live?', 'Wat moet ik aanleveren?'],
      cta: 'Offerte aanvragen', wa: 'Liever Djego zelf? WhatsApp', error: 'Ik kan nu even niet antwoorden. Stuur Djego een WhatsApp, dan krijg je meestal dezelfde dag antwoord.',
      note: 'Antwoorden zijn door AI gemaakt en kunnen fouten bevatten.'
    },
    en: {
      title: 'byXavio assistant', sub: 'AI assistant · replies instantly',
      hello: 'Hi! I\'m the byXavio AI assistant. Ask me anything about websites, prices or how it works.',
      ph: 'Type your question…', send: 'Send', open: 'Open chat', close: 'Close chat',
      chips: ['How much is a website?', 'How fast is my site live?', 'What do I need to provide?'],
      cta: 'Request a quote', wa: 'Rather talk to Djego? WhatsApp', error: 'I can\'t reply right now. Send Djego a WhatsApp and you\'ll usually hear back the same day.',
      note: 'Replies are AI-generated and may contain mistakes.'
    },
    de: {
      title: 'byXavio Assistent', sub: 'KI-Assistent · antwortet sofort',
      hello: 'Hallo! Ich bin der KI-Assistent von byXavio. Frag mich gern zu Websites, Preisen oder dem Ablauf.',
      ph: 'Deine Frage…', send: 'Senden', open: 'Chat öffnen', close: 'Chat schließen',
      chips: ['Was kostet eine Website?', 'Wie schnell ist meine Seite online?', 'Was muss ich liefern?'],
      cta: 'Angebot anfragen', wa: 'Lieber Djego direkt? WhatsApp', error: 'Ich kann gerade nicht antworten. Schreib Djego per WhatsApp, meist antwortet er noch am selben Tag.',
      note: 'Antworten sind KI-generiert und können Fehler enthalten.'
    },
    fr: {
      title: 'Assistant byXavio', sub: 'Assistant IA · répond tout de suite',
      hello: 'Bonjour ! Je suis l\'assistant IA de byXavio. Posez-moi vos questions sur les sites, les prix ou le déroulement.',
      ph: 'Votre question…', send: 'Envoyer', open: 'Ouvrir le chat', close: 'Fermer le chat',
      chips: ['Combien coûte un site ?', 'En combien de temps est-il en ligne ?', 'Que dois-je fournir ?'],
      cta: 'Demander un devis', wa: 'Plutôt Djego en personne ? WhatsApp', error: 'Je ne peux pas répondre pour le moment. Envoyez un WhatsApp à Djego, il répond souvent le jour même.',
      note: 'Les réponses sont générées par IA et peuvent contenir des erreurs.'
    },
    es: {
      title: 'Asistente byXavio', sub: 'Asistente IA · responde al instante',
      hello: '¡Hola! Soy el asistente IA de byXavio. Pregúntame lo que quieras sobre webs, precios o cómo funciona.',
      ph: 'Escribe tu pregunta…', send: 'Enviar', open: 'Abrir chat', close: 'Cerrar chat',
      chips: ['¿Cuánto cuesta una web?', '¿Cuándo estará online?', '¿Qué tengo que aportar?'],
      cta: 'Pedir presupuesto', wa: '¿Prefieres hablar con Djego? WhatsApp', error: 'Ahora mismo no puedo responder. Escribe a Djego por WhatsApp, suele contestar el mismo día.',
      note: 'Las respuestas las genera una IA y pueden contener errores.'
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
  '.xc-panel{position:fixed;right:18px;bottom:86px;z-index:62;width:370px;max-width:calc(100vw - 36px);height:min(560px,calc(100vh - 120px));' +
    'background:#fff;border-radius:22px;box-shadow:0 30px 60px -20px rgba(16,17,40,.55);display:none;flex-direction:column;overflow:hidden;' +
    'font-family:var(--body,system-ui,sans-serif);color:var(--navy,#1a1b3a)}' +
  '.xc-panel.open{display:flex;animation:xcIn .22s ease}' +
  '@keyframes xcIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
  '.xc-head{background:var(--night,#101128);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}' +
  '.xc-av{width:38px;height:38px;border-radius:50%;background:var(--cyan,#00d2df);color:var(--night,#101128);display:grid;place-items:center;' +
    'font-family:var(--display,system-ui);font-weight:800;font-size:1rem;flex:none}' +
  '.xc-head b{display:block;font-family:var(--display,system-ui);font-size:1rem;font-weight:600}' +
  '.xc-head small{color:var(--dim,#b9bcdd);font-size:.8rem}' +
  '.xc-x{margin-left:auto;background:none;border:0;color:#fff;font-size:1.6rem;line-height:1;cursor:pointer;padding:4px 6px;border-radius:8px}' +
  '.xc-log{flex:1;overflow-y:auto;padding:18px 16px 8px;background:var(--mist,#f3f5fb);display:flex;flex-direction:column;gap:10px}' +
  '.xc-m{max-width:85%;padding:10px 14px;border-radius:16px;font-size:.93rem;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}' +
  '.xc-m.bot{background:#fff;border:1px solid var(--line,#e1e4ef);border-bottom-left-radius:5px;align-self:flex-start}' +
  '.xc-m.me{background:var(--navy,#1a1b3a);color:#fff;border-bottom-right-radius:5px;align-self:flex-end}' +
  '.xc-m a{color:var(--cyan-ink,#006b75);font-weight:600}.xc-m.me a{color:#fff}' +
  '.xc-typing{display:inline-flex;gap:4px}.xc-typing i{width:7px;height:7px;border-radius:50%;background:var(--dim,#b9bcdd);animation:xcB 1s infinite}' +
  '.xc-typing i:nth-child(2){animation-delay:.15s}.xc-typing i:nth-child(3){animation-delay:.3s}' +
  '@keyframes xcB{0%,80%,100%{opacity:.35;transform:none}40%{opacity:1;transform:translateY(-3px)}}' +
  '.xc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 2px}' +
  '.xc-chip{border:1px solid var(--cyan-ink,#006b75);color:var(--cyan-ink,#006b75);background:#fff;border-radius:999px;padding:6px 12px;' +
    'font:600 .82rem var(--body,system-ui);cursor:pointer}.xc-chip:hover{background:var(--cyan,#00d2df);color:var(--night,#101128);border-color:var(--cyan,#00d2df)}' +
  '.xc-acts{display:flex;gap:8px;padding:8px 16px 0;background:#fff;flex-wrap:wrap}' +
  '.xc-act{font:600 .8rem var(--body,system-ui);text-decoration:none;color:var(--navy,#1a1b3a);background:var(--mist,#f3f5fb);' +
    'border-radius:999px;padding:6px 12px}.xc-act.xc-wa{background:#e8faf0;color:#0f7a3d}' +
  '.xc-form{display:flex;gap:8px;padding:10px 12px 6px;background:#fff}' +
  '.xc-in{flex:1;border:1px solid var(--line,#e1e4ef);border-radius:14px;padding:11px 14px;font:inherit;font-size:16px;color:inherit;outline:none;min-width:0}' +
  '.xc-in:focus{border-color:var(--cyan,#00d2df)}' +
  '.xc-send{border:0;border-radius:14px;background:var(--cyan,#00d2df);color:var(--night,#101128);width:46px;cursor:pointer;display:grid;place-items:center;flex:none}' +
  '.xc-send:disabled{opacity:.5;cursor:default}.xc-send svg{width:20px;height:20px}' +
  '.xc-note{margin:0;padding:0 16px 10px;background:#fff;font-size:.72rem;color:var(--muted,#585b7c)}' +
  '@media (max-width:680px){.xc-panel{right:0;left:0;bottom:0;width:100%;max-width:none;height:min(88vh,640px);border-radius:22px 22px 0 0}' +
    '.xc-panel.open~.xc-btn,.xc-open .wa,.xc-open .wa-bubble{display:none!important}}' +
  '@media (prefers-reduced-motion:reduce){.xc-panel.open{animation:none}.xc-typing i{animation:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z" fill="#00d2df"/><circle cx="9" cy="9.5" r="1.2" fill="#101128"/><circle cx="12" cy="9.5" r="1.2" fill="#101128"/><circle cx="15" cy="9.5" r="1.2" fill="#101128"/></svg>';
  var sendIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h13M11 4.5 16.5 10 11 15.5"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'xc-panel';
  panel.setAttribute('role', 'dialog');
  panel.innerHTML =
    '<div class="xc-head"><div class="xc-av">X</div><div><b class="xc-title"></b><small class="xc-sub"></small></div>' +
    '<button class="xc-x" type="button">&times;</button></div>' +
    '<div class="xc-log" aria-live="polite"></div>' +
    '<div class="xc-acts"><a class="xc-act xc-cta" href="#contact"></a><a class="xc-act xc-wa" target="_blank" rel="noopener"></a></div>' +
    '<form class="xc-form"><input class="xc-in" maxlength="500" autocomplete="off"><button class="xc-send" type="submit">' + sendIcon + '</button></form>' +
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

  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE) || '[]') || []; } catch (e) { history = []; }
  var busy = false;

  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-20))); } catch (e) {} }

  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function linkify(s) {
    s = esc(s);
    s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi, '<a href="mailto:$1">$1</a>');
    s = s.replace(/\b06[- ]?26683986\b/g, '<a href="' + WA + '" target="_blank" rel="noopener">$&</a>');
    s = s.replace(/\b(slingerottertje30\.com|byxavio\.nl)\b(?![^<]*<\/a>)/g, '<a href="https://$1" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  function bubble(role, text) {
    var d = document.createElement('div');
    d.className = 'xc-m ' + (role === 'user' ? 'me' : 'bot');
    d.innerHTML = role === 'user' ? esc(text) : linkify(text);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function chips() {
    var wrap = document.createElement('div');
    wrap.className = 'xc-chips';
    t('chips').forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'xc-chip'; b.textContent = c;
      b.addEventListener('click', function () { wrap.remove(); ask(c); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
  }

  function render() {
    panel.setAttribute('aria-label', t('title'));
    panel.querySelector('.xc-title').textContent = t('title');
    panel.querySelector('.xc-sub').textContent = t('sub');
    panel.querySelector('.xc-x').setAttribute('aria-label', t('close'));
    panel.querySelector('.xc-cta').textContent = t('cta');
    panel.querySelector('.xc-wa').textContent = t('wa');
    panel.querySelector('.xc-note').textContent = t('note');
    input.placeholder = t('ph');
    input.setAttribute('aria-label', t('ph'));
    sendBtn.setAttribute('aria-label', t('send'));
    btn.setAttribute('aria-label', t('open'));
    log.innerHTML = '';
    bubble('assistant', t('hello'));
    history.forEach(function (m) { bubble(m.role, m.content); });
    if (!history.length) chips();
  }

  function ask(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true;
    var oldChips = log.querySelector('.xc-chips'); if (oldChips) oldChips.remove();
    history.push({ role: 'user', content: text.slice(0, 500) });
    save();
    bubble('user', text);
    var typing = bubble('assistant', '');
    typing.innerHTML = '<span class="xc-typing"><i></i><i></i><i></i></span>';

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: lang(), messages: history.slice(-12) }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (!d || !d.reply) throw new Error('empty');
        typing.innerHTML = linkify(d.reply);
        history.push({ role: 'assistant', content: d.reply });
        save();
      })
      .catch(function () {
        typing.innerHTML = linkify(t('error')) + ' <a href="' + WA + '" target="_blank" rel="noopener">WhatsApp</a>';
        history.pop(); save();
      })
      .then(function () {
        clearTimeout(timer);
        busy = false; sendBtn.disabled = false;
        log.scrollTop = log.scrollHeight;
        input.focus();
      });
  }

  function open() {
    panel.classList.add('open');
    document.body.classList.add('xc-open');
    btn.style.display = 'none';
    var dot = btn.querySelector('.xc-dot'); if (dot) dot.remove();
    var wb = document.getElementById('waBubble'); if (wb) wb.style.display = 'none';
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() {
    panel.classList.remove('open');
    document.body.classList.remove('xc-open');
    btn.style.display = '';
    btn.focus();
  }

  btn.addEventListener('click', open);
  panel.querySelector('.xc-x').addEventListener('click', close);
  panel.querySelector('.xc-cta').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; ask(v); });

  var sel = document.getElementById('langSelect');
  if (sel) sel.addEventListener('change', function () { setTimeout(render, 0); });

  render();
})();
