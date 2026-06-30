/* ============================================================
   Ask RIENVOR — floating launcher + popup panel (site-wide).
   Injects the launcher (replacing the old WhatsApp bubble) and a
   panel containing the assistant's DOM hooks (#chat, #chips,
   #chips-label, #q, #send). The shared assistant logic in ask.js
   (loaded AFTER this file) binds to those hooks. Theme-aware via
   the site's CSS tokens. No knowledge base lives here.
   ============================================================ */
(function () {
  if (document.getElementById('rv-ask-launcher')) return; // guard against double-inject

  /* ---- styles (scoped, theme-aware via site tokens) ---- */
  var css = ''
    + '.rv-ask-launcher{position:fixed;right:24px;bottom:24px;z-index:1000;display:inline-flex;'
    + 'align-items:center;gap:.5rem;cursor:pointer;letter-spacing:.02em;padding:13px 18px;'
    + 'border-radius:var(--radius-pill,999px);box-shadow:var(--shadow-md,0 8px 32px rgba(0,0,0,.4));'
    + 'transition:transform .2s ease;}'
    + '.rv-ask-launcher:hover{transform:translateY(-1px);}'
    + '.rv-ask-launcher svg{width:16px;height:16px;}'
    + '.rv-ask-panel{position:fixed;right:24px;bottom:88px;z-index:1001;width:390px;max-width:calc(100vw - 32px);'
    + 'height:min(580px,78vh);display:flex;flex-direction:column;background:var(--bg);color:var(--text);'
    + 'border:1px solid var(--border-subtle);border-radius:var(--radius-lg,20px);overflow:hidden;'
    + 'box-shadow:var(--shadow-lg,0 20px 64px rgba(0,0,0,.5));}'
    + '.rv-ask-panel[hidden]{display:none;}'
    + '.rv-ask-top{height:3px;background:var(--accent);opacity:.55;flex-shrink:0;}'
    + '.rv-ask-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;'
    + 'border-bottom:1px solid var(--border-subtle);flex-shrink:0;}'
    + '.rv-ask-title{font:600 var(--text-sm,0.85rem)/1 "Inter",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--text);}'
    + '.rv-ask-title b{color:var(--accent);}'
    + '.rv-ask-close{background:none;border:none;color:var(--text-soft);font-size:22px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px;}'
    + '.rv-ask-close:hover{color:var(--text);}'
    + '.rv-ask-panel .ask-chat{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px;padding:14px 14px 6px;}'
    + '.rv-ask-panel .msg{max-width:92%;line-height:1.5;font-size:var(--text-sm,0.9rem);}'
    + '.rv-ask-panel .msg.bot{align-self:flex-start;}'
    + '.rv-ask-panel .msg.user{align-self:flex-end;background:var(--surface-raised);border:1px solid var(--border-subtle);'
    + 'padding:9px 12px;border-radius:12px 12px 4px 12px;color:var(--text);}'
    + '.rv-ask-panel .who{font-size:10px;letter-spacing:.16em;color:var(--text-soft);margin:0 0 5px;text-transform:uppercase;}'
    + '.rv-ask-panel .bubble{background:var(--surface);border:1px solid var(--border-subtle);border-left:2px solid var(--accent);'
    + 'padding:12px 14px;border-radius:4px 12px 12px 12px;}'
    + '.rv-ask-panel .bubble p{margin:0 0 9px;} .rv-ask-panel .bubble p:last-child{margin:0;}'
    + '.rv-ask-panel .bubble b{color:var(--text);}'
    + '.rv-ask-panel .bot a{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--border);}'
    + '.rv-ask-panel .bot a:hover{color:var(--accent-hover);}'
    + '.rv-ask-panel .typing{color:var(--text-soft);font-style:italic;font-size:var(--text-sm,0.85rem);}'
    + '.rv-ask-panel .rv-soft{margin-top:9px;font-size:var(--text-sm,0.85rem);color:var(--text-muted);}'
    + '.rv-ask-panel .cta{display:inline-block;margin-top:6px;background:transparent;border:1px solid var(--accent);'
    + 'color:var(--accent);font-size:var(--text-sm,0.85rem);padding:6px 12px;border-radius:var(--radius-pill,999px);text-decoration:none;}'
    + '.rv-ask-panel .cta:hover{background:var(--accent-dim);}'
    + '.rv-ask-panel .ask-chips-wrap{padding:8px 14px 0;flex-shrink:0;}'
    + '.rv-ask-panel .chips-label{font-size:10px;letter-spacing:.16em;color:var(--text-soft);text-transform:uppercase;margin:0 2px 7px;display:none;}'
    + '.rv-ask-panel .chips{display:flex;flex-wrap:wrap;gap:7px;}'
    + '.rv-ask-panel .chip{background:var(--surface);border:1px solid var(--border);color:var(--text-muted);'
    + 'font-size:12px;padding:7px 11px;border-radius:var(--radius-pill,999px);cursor:pointer;transition:border-color .2s,color .2s;}'
    + '.rv-ask-panel .chip:hover{border-color:var(--accent);color:var(--text);}'
    + '.rv-ask-panel .ask-inputbar{display:flex;gap:8px;padding:12px 14px 14px;flex-shrink:0;}'
    + '.rv-ask-panel .ask-inputbar input{flex:1;min-width:0;background:var(--surface);border:1px solid var(--border-subtle);'
    + 'color:var(--text);font:400 var(--text-sm,0.9rem)/1.4 "Inter",sans-serif;padding:11px 13px;border-radius:var(--radius-md,14px);outline:none;}'
    + '.rv-ask-panel .ask-inputbar input:focus{border-color:var(--accent);}'
    + '.rv-ask-panel .ask-inputbar .btn{white-space:nowrap;padding:0 16px;}'
    + '@media (max-width:480px){.rv-ask-panel{right:16px;left:16px;width:auto;bottom:84px;height:72vh;}}';

  var st = document.createElement('style');
  st.id = 'rv-ask-style';
  st.textContent = css;
  document.head.appendChild(st);

  /* ---- launcher ---- */
  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1-4.1a8.4 8.4 0 0 1-1-4A8.38 8.38 0 0 1 11.5 3 8.38 8.38 0 0 1 21 11.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var launcher = document.createElement('button');
  launcher.id = 'rv-ask-launcher';
  launcher.className = 'btn btn-primary rv-ask-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Ask RIENVOR about your rating');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('data-track', 'ask-bubble-open');
  launcher.innerHTML = chatIcon + '<span>Ask RIENVOR</span>';

  /* ---- panel (contains the assistant DOM hooks ask.js binds to) ---- */
  var panel = document.createElement('section');
  panel.id = 'rv-ask-panel';
  panel.className = 'rv-ask-panel';
  panel.setAttribute('aria-label', 'Ask RIENVOR assistant');
  panel.hidden = true;
  panel.innerHTML =
      '<div class="rv-ask-top"></div>'
    + '<div class="rv-ask-head"><span class="rv-ask-title">RIENVOR<b> · Ask</b></span>'
    + '<button class="rv-ask-close" type="button" aria-label="Close assistant">&times;</button></div>'
    + '<div class="ask-chat" id="chat" aria-live="polite"></div>'
    + '<div class="ask-chips-wrap"><div class="chips-label" id="chips-label">Related</div><div class="chips" id="chips"></div></div>'
    + '<div class="ask-inputbar"><input id="q" type="text" autocomplete="off" placeholder="Ask about your rating…" aria-label="Ask about your rating" />'
    + '<button id="send" class="btn btn-primary" type="button" data-track="ask-send">Ask</button></div>';

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  /* ---- open / close ---- */
  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var i = panel.querySelector('#q'); if (i) setTimeout(function(){ i.focus(); }, 50); }
  }
  launcher.addEventListener('click', function () { setOpen(panel.hidden); });
  panel.querySelector('.rv-ask-close').addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
})();
