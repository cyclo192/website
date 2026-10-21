/* Nestig chat – AI-assistent die vragen beantwoordt. Praat met de Cloudflare Worker "byxavio-chat" (modus Nestig). */
(function () {
  var ENDPOINT = 'https://byxavio-chat.goeijdjego.workers.dev';
  var WA = 'https://wa.me/31626683986?text=' + encodeURIComponent('Hoi Nestig, ik heb een vraag.');
  var STORE = 'nestig_chat_v1';
  var NUDGE = 'nestig_chat_nudged';

  var T = {
    title: 'Nestig-assistent', sub: 'AI · antwoordt direct',
    hello: 'Hoi! Ik ben de AI-assistent van Nestig. Vraag me alles over onze producten, levertijd, verzending of retourneren.',
    ph: 'Typ je vraag…', send: 'Verstuur', open: 'Stel je vraag aan de Nestig-assistent', close: 'Sluit de chat', reset: 'Nieuw gesprek',
    chips: ['Hoe lang is de levertijd?', 'Past mijn kat erin?', 'Leuk kerstcadeau?'],
    wa: 'Liever een mens? WhatsApp ons',
    error: 'Ik kan nu even niet antwoorden. Stuur ons een WhatsApp, dan krijg je meestal dezelfde dag antwoord.',
    rate: 'Je stuurt veel berichten achter elkaar. Probeer het over een paar minuten opnieuw, of stuur ons een WhatsApp.',
    nudge: 'Vraag over een product? Ik help je direct.',
    note: 'Dit is een AI en kan fouten maken. Deel geen persoonlijke gegevens. Voor je bestelling: WhatsApp ons.'
  };

  var css = '' +
  '.nc-btn{position:fixed;right:22px;bottom:92px;z-index:37;width:56px;height:56px;border-radius:50%;border:3px solid var(--ink);cursor:pointer;' +
    'background:var(--zon);display:grid;place-items:center;box-shadow:0 5px 0 var(--ink);transition:transform .15s}' +
  '.nc-btn:hover{transform:translateY(-2px)}.nc-btn svg{width:28px;height:28px}' +
  'body.met-balk .nc-btn{bottom:158px}' +
  '.nc-nudge{position:fixed;right:90px;bottom:98px;z-index:37;max-width:220px;background:var(--wit);color:var(--ink);border:2px solid var(--ink);' +
    'border-radius:14px 14px 4px 14px;padding:10px 30px 10px 14px;font:600 .86rem/1.4 var(--body);box-shadow:0 5px 0 var(--ink);cursor:pointer;animation:ncIn .3s ease}' +
  'body.met-balk .nc-nudge{bottom:164px}' +
  '.nc-nudge button{position:absolute;top:3px;right:5px;border:0;background:none;color:var(--ink-soft);font-size:1.15rem;cursor:pointer;padding:2px 5px}' +
  '.nc-panel{position:fixed;right:20px;bottom:20px;z-index:60;width:380px;max-width:calc(100vw - 40px);height:min(580px,calc(100vh - 40px));' +
    'background:var(--wit);border:3px solid var(--ink);border-radius:24px;box-shadow:0 8px 0 var(--ink);display:none;flex-direction:column;overflow:hidden;' +
    'font-family:var(--body);color:var(--ink)}' +
  '.nc-panel.open{display:flex;animation:ncIn .22s ease}' +
  '@keyframes ncIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
  '.nc-head{background:var(--ink);color:#fff;padding:12px 10px 12px 16px;display:flex;align-items:center;gap:12px}' +
  '.nc-av{width:40px;height:40px;border-radius:50%;background:var(--zon);border:2px solid #fff;display:grid;place-items:center;flex:none}' +
  '.nc-av svg{width:22px;height:22px}' +
  '.nc-head b{display:block;font:600 1.05rem/1.2 var(--display)}.nc-head small{color:#cfe0da;font-size:.78rem}' +
  '.nc-tools{margin-left:auto;display:flex;gap:2px}' +
  '.nc-ic{background:none;border:0;color:#fff;cursor:pointer;width:36px;height:36px;border-radius:10px;display:grid;place-items:center}' +
  '.nc-ic:hover{background:rgba(255,255,255,.12)}.nc-ic svg{width:18px;height:18px}' +
  '.nc-log{flex:1;overflow-y:auto;padding:16px 14px 8px;background:var(--wol);display:flex;flex-direction:column;gap:10px}' +
  '.nc-m{max-width:86%;padding:10px 14px;border-radius:16px;font-size:.94rem;line-height:1.5;word-wrap:break-word}' +
  '.nc-m p{margin:0}.nc-m p+p,.nc-m p+ul,.nc-m ul+p{margin-top:8px}.nc-m ul{margin:6px 0 0;padding-left:18px}.nc-m li{margin:2px 0}' +
  '.nc-m.bot{background:var(--wit);border:2px solid var(--lijn);border-bottom-left-radius:5px;align-self:flex-start}' +
  '.nc-m.me{background:var(--ink);color:#fff;border-bottom-right-radius:5px;align-self:flex-end;white-space:pre-wrap}' +
  '.nc-m a{color:var(--ink);font-weight:600;text-decoration:underline}.nc-m strong{font-weight:600}' +
  '.nc-typing{display:inline-flex;gap:4px;padding:3px 0}.nc-typing i{width:7px;height:7px;border-radius:50%;background:var(--ink-soft);animation:ncB 1s infinite}' +
  '.nc-typing i:nth-child(2){animation-delay:.15s}.nc-typing i:nth-child(3){animation-delay:.3s}' +
  '@keyframes ncB{0%,80%,100%{opacity:.35;transform:none}40%{opacity:1;transform:translateY(-3px)}}' +
  '.nc-chips{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:100%}' +
  '.nc-chip{border:2px solid var(--ink);color:var(--ink);background:var(--wit);border-radius:999px;padding:6px 12px;font:600 .82rem var(--body);cursor:pointer;text-align:left}' +
  '.nc-chip:hover{background:var(--zon)}' +
  '.nc-wa{display:block;margin:8px 12px 0;text-align:center;font:600 .8rem var(--body);color:var(--wa);text-decoration:none;padding:4px}' +
  '.nc-wa:hover{text-decoration:underline}' +
  '.nc-form{display:flex;gap:8px;padding:8px 12px 6px;align-items:flex-end}' +
  '.nc-in{flex:1;border:2px solid var(--lijn);border-radius:14px;padding:10px 13px;font:inherit;font-size:16px;line-height:1.35;color:inherit;outline:none;min-width:0;' +
    'resize:none;max-height:120px;min-height:46px;overflow-y:auto;background:var(--wit)}' +
  '.nc-in:focus{border-color:var(--ink)}' +
  '.nc-send{border:2px solid var(--ink);border-radius:14px;background:var(--zon);color:var(--ink);width:46px;height:46px;cursor:pointer;display:grid;place-items:center;flex:none}' +
  '.nc-send:disabled{opacity:.5;cursor:default}.nc-send svg{width:20px;height:20px}' +
  '.nc-note{padding:0 14px 10px;font-size:.7rem;line-height:1.35;color:var(--ink-soft)}' +
  '@media (max-width:680px){.nc-btn{right:16px;bottom:80px;width:54px;height:54px}body.met-balk .nc-btn{bottom:152px}' +
    '.nc-nudge{right:16px;bottom:146px}body.met-balk .nc-nudge{bottom:218px}' +
    '.nc-panel{right:0;left:0;bottom:0;width:100%;max-width:none;height:min(88vh,640px);border-radius:24px 24px 0 0;border-bottom:0;box-shadow:0 -6px 30px rgba(18,48,43,.25)}' +
    'body.nc-open .wa-zweef,body.nc-open .koopbalk{display:none!important}}' +
  '@media (prefers-reduced-motion:reduce){.nc-panel.open,.nc-nudge{animation:none}.nc-typing i{animation:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z" fill="#12302b"/><circle cx="9" cy="9.5" r="1.2" fill="#ffc83d"/><circle cx="12" cy="9.5" r="1.2" fill="#ffc83d"/><circle cx="15" cy="9.5" r="1.2" fill="#ffc83d"/></svg>';
  var starIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 16.4l-5.6 3.3 1.5-6.3L3 9.1l6.4-.6z" fill="#12302b"/></svg>';
  var sendIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h13M11 4.5 16.5 10 11 15.5"/></svg>';
  var resetIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10a6.5 6.5 0 1 0 2-4.7"/><path d="M3.5 3.5v3.8h3.8"/></svg>';
  var closeIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'nc-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', T.title);
  panel.innerHTML =
    '<div class="nc-head"><div class="nc-av">' + starIcon + '</div><div><b>' + T.title + '</b><small>' + T.sub + '</small></div>' +
    '<div class="nc-tools"><button class="nc-ic nc-reset" type="button" aria-label="' + T.reset + '" title="' + T.reset + '">' + resetIcon + '</button>' +
    '<button class="nc-ic nc-x" type="button" aria-label="' + T.close + '">' + closeIcon + '</button></div></div>' +
    '<div class="nc-log" aria-live="polite"></div>' +
    '<a class="nc-wa" target="_blank" rel="noopener"></a>' +
    '<form class="nc-form"><textarea class="nc-in" rows="1" maxlength="700"></textarea><button class="nc-send" type="submit" aria-label="' + T.send + '">' + sendIcon + '</button></form>' +
    '<p class="nc-note"></p>';

  var btn = document.createElement('button');
  btn.className = 'nc-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', T.open);
  btn.innerHTML = chatIcon;

  document.body.appendChild(panel);
  document.body.appendChild(btn);

  var log = panel.querySelector('.nc-log');
  var form = panel.querySelector('.nc-form');
  var input = panel.querySelector('.nc-in');
  var sendBtn = panel.querySelector('.nc-send');
  var waLink = panel.querySelector('.nc-wa');
  waLink.href = WA; waLink.textContent = T.wa;
  panel.querySelector('.nc-note').textContent = T.note;
  input.placeholder = T.ph; input.setAttribute('aria-label', T.ph);

  var state = { msgs: [] };
  try { var s = JSON.parse(sessionStorage.getItem(STORE) || 'null'); if (s && Array.isArray(s.msgs)) state = s; } catch (e) {}
  var busy = false;
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify({ msgs: state.msgs.slice(-40) })); } catch (e) {} }

  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(])(?:https?:\/\/)?(?:www\.)?nestig\.nl(\/[a-z0-9-]+)?(?![^<]*<\/a>)/gi, function (m, pre, path) {
      return pre + '<a href="/' + (path ? path.slice(1) : '') + '">nestig.nl' + (path || '') + '</a>';
    });
    s = s.replace(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b(?![^<]*<\/a>)/gi, '<a href="mailto:$1">$1</a>');
    s = s.replace(/\b06[- ]?26[- ]?68[- ]?39[- ]?86\b/g, '<a href="' + WA + '" target="_blank" rel="noopener">$&</a>');
    return s;
  }
  function md(text) {
    var out = '', list = false, para = [];
    function flush() { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } }
    text.split('\n').forEach(function (ln) {
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
    d.className = 'nc-m ' + (role === 'user' ? 'me' : 'bot');
    if (role === 'user') d.textContent = text; else d.innerHTML = md(text);
    log.appendChild(d); scroll(); return d;
  }
  function clearChips() { var c = log.querySelectorAll('.nc-chips'); for (var i = 0; i < c.length; i++) c[i].remove(); }
  function chips(list) {
    clearChips();
    if (!list || !list.length) return;
    var wrap = document.createElement('div'); wrap.className = 'nc-chips';
    list.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nc-chip'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); }); wrap.appendChild(b);
    });
    log.appendChild(wrap); scroll();
  }
  function render() {
    log.innerHTML = '';
    bubble('assistant', T.hello);
    state.msgs.forEach(function (m) { bubble(m.role, m.content); });
    var last = state.msgs[state.msgs.length - 1];
    if (!state.msgs.length) chips(T.chips);
    else if (last && last.role === 'assistant' && last.chips) chips(last.chips);
  }
  function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }

  function ask(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true; clearChips();
    state.msgs.push({ role: 'user', content: text.slice(0, 700) }); save();
    bubble('user', text);
    var typing = bubble('assistant', '');
    typing.innerHTML = '<span class="nc-typing"><i></i><i></i><i></i></span>';
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lang: 'nl',
        page: (document.title || location.pathname).slice(0, 100),
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
      state.msgs.push(m); save(); chips(m.chips);
    }).catch(function (e) {
      typing.innerHTML = md(e && e.message === 'rate' ? T.rate : T.error);
      state.msgs.pop(); save();
    }).then(function () {
      clearTimeout(timer); busy = false; sendBtn.disabled = false; scroll();
      if (window.matchMedia && !window.matchMedia('(max-width:680px)').matches) input.focus();
    });
  }

  var nudgeEl = null;
  function hideNudge() { if (nudgeEl) { nudgeEl.remove(); nudgeEl = null; } }
  function open() {
    hideNudge();
    try { sessionStorage.setItem(NUDGE, '1'); } catch (e) {}
    panel.classList.add('open'); document.body.classList.add('nc-open'); btn.style.display = 'none';
    scroll(); setTimeout(function () { input.focus(); }, 60);
  }
  function close() { panel.classList.remove('open'); document.body.classList.remove('nc-open'); btn.style.display = ''; btn.focus(); }
  function reset() { if (busy) return; state = { msgs: [] }; save(); render(); input.focus(); }

  btn.addEventListener('click', open);
  panel.querySelector('.nc-x').addEventListener('click', close);
  panel.querySelector('.nc-reset').addEventListener('click', reset);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; grow(); ask(v); });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  });

  // Eén vriendelijk seintje per bezoek, na 25 seconden, alleen op productpagina's.
  var nudged = false;
  try { nudged = sessionStorage.getItem(NUDGE) === '1'; } catch (e) {}
  if (!nudged && !state.msgs.length && document.querySelector('form[data-product]')) {
    setTimeout(function () {
      if (panel.classList.contains('open')) return;
      try { sessionStorage.setItem(NUDGE, '1'); } catch (e) {}
      nudgeEl = document.createElement('div');
      nudgeEl.className = 'nc-nudge';
      nudgeEl.innerHTML = '<span></span><button type="button" aria-label="' + esc(T.close) + '">&times;</button>';
      nudgeEl.querySelector('span').textContent = T.nudge;
      nudgeEl.addEventListener('click', function (e) { if (e.target.tagName === 'BUTTON') { hideNudge(); return; } open(); });
      document.body.appendChild(nudgeEl);
    }, 25000);
  }

  render();
})();
