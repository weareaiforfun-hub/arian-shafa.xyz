/* What's new, for every *.arian-shafa.xyz site. Served from arian-shafa.xyz/whatsnew.js; reads arian-shafa.xyz/releases.json.
   - A sparkle button with an unread count opens this site's releases.
   - Returning visitors get a one-time card for new launches, with "Show me".
   - Arriving from the shipping log (?wn=<id>) scrolls to the change and outlines it.
   Add to a site:  <script src="https://arian-shafa.xyz/whatsnew.js" data-site="hope" defer></script>
   Options: data-slot="<CSS selector>" puts the button in the site's header instead of the bottom-right corner;
            data-accent="#hex" sets the highlight colour;
            data-bottom="72" lifts the card and corner button by that many px on phones (for a bottom tab bar);
            data-button="none" for sites with their own What's new: no button or card, only the ?wn= spotlight.
   The site's CSP needs https://arian-shafa.xyz in script-src and connect-src.
   A release points at its element through `spot` (e.g. [data-wn="day-clock"]); see RELEASE_NOTES.md. */
(() => {
  const me = document.currentScript;
  if (!me || !me.dataset.site || window.__whatsNew) return;
  window.__whatsNew = true;
  const NOBTN = me.dataset.button === 'none', LIFT = parseInt(me.dataset.bottom, 10) || 0;
  const SITE = me.dataset.site, KEY = 'whatsnew:' + SITE, NUDGE = ['launch', 'new'], MAX = 12;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const KIND = { launch: 'Launch', new: 'New', update: 'Update', fix: 'Fix' };
  const track = (action, id) => { try { window.umami && umami.track('whats-new', { action, id: id || '' }); } catch (e) {} };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  // Sites are single-page apps: their header may render after this script runs, so wait a little for the slot.
  const waitSlot = () => new Promise(res => {
    const sel = !NOBTN && me.dataset.slot, t0 = Date.now();
    if (!sel) return res(null);
    (function look() { const el = document.querySelector(sel); if (el || Date.now() - t0 > 6000) return res(el); setTimeout(look, 200); })();
  });
  fetch(new URL('releases.json', me.src), { cache: 'no-cache' }).then(r => r.json())
    .then(data => waitSlot().then(slot => start(data, slot))).catch(() => {});

  function start(data, slot) {
    const all = data.releases.filter(r => r.site === SITE).slice(0, MAX);
    if (!all.length) return;
    // The site's base on whatever host serves it now (production, a preview build or localhost).
    const home = location.origin + new URL(data.sites[SITE].url).pathname.replace(/\/$/, '');
    const prev = load();
    const state = prev || { read: all.map(r => r.id) };  // first visit: nothing counts as new
    const unread = () => all.filter(r => !state.read.includes(r.id));
    const markRead = rs => { rs.forEach(r => state.read.includes(r.id) || state.read.push(r.id)); save(state); paintBadge(); };
    save(state);

    // ---- UI lives in shadow roots, so site CSS and ours never mix. The button may sit in the site's header
    // (data-slot); everything that floats lives on <body>, so a header with a transform or blur cannot trap it. ----
    const hosts = [], mount = parent => { const h = document.createElement('whats-new'); parent.appendChild(h); hosts.push(h); return h.attachShadow({ mode: 'open' }); };
    // Text on the accent colour: dark on a light accent, white on a dark one.
    const hex = (me.dataset.accent || '').match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    const on = hex ? (0.299 * parseInt(hex[1], 16) + 0.587 * parseInt(hex[2], 16) + 0.114 * parseInt(hex[3], 16) > 150 ? '#0c1016' : '#fff') : '';
    const css = `<style>
      :host { font: inherit; }
      * { box-sizing: border-box; }
      .t { --bg: #121823; --bg2: #18202d; --fg: #e7ecf3; --fg2: #9aa6b8; --line: #2a3445; --acc: ${me.dataset.accent || '#8fb8de'}; --on: ${on || '#0c1016'}; --scrim: rgb(5 8 12 / .6); }
      .t.light { --bg: #fff; --bg2: #f1f3f7; --fg: #121823; --fg2: #586477; --line: #dde2ea; --acc: ${me.dataset.accent || '#2f6596'}; --on: ${on || '#fff'}; --scrim: rgb(18 24 35 / .35); }
      button { font: inherit; color: inherit; cursor: pointer; }
      .btn { position: relative; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--bg); color: var(--fg); display: grid; place-items: center; padding: 0; }
      .btn:hover, .btn:focus-visible { border-color: var(--acc); outline: none; }
      .btn svg { width: 18px; height: 18px; }
      .float { position: fixed; z-index: 2147483000; right: max(16px, env(safe-area-inset-right, 0px)); bottom: max(16px, env(safe-area-inset-bottom, 0px)); box-shadow: 0 8px 24px rgb(0 0 0 / .25); width: 42px; height: 42px; }
      .badge { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--acc); color: var(--on); font-size: 11px; font-weight: 600; display: grid; place-items: center; }
      .badge[hidden], .btn.none { display: none; }
      @media (max-width: 767px) { .float, .nudge { bottom: calc(max(16px, env(safe-area-inset-bottom, 0px)) + ${LIFT}px) !important; } }
      .pop, .nudge, .tip { position: fixed; z-index: 2147483001; background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 18px 50px rgb(0 0 0 / .35); font-size: 14px; line-height: 1.5; }
      .pop { width: min(360px, calc(100vw - 24px)); max-height: min(520px, calc(100vh - 90px)); display: grid; grid-template-rows: auto 1fr auto; transform-origin: var(--ox, 100%) var(--oy, 0); transition: opacity .16s, transform .2s cubic-bezier(.2, .7, .1, 1); }
      .pop:not(.on) { opacity: 0; transform: scale(.94); pointer-events: none; visibility: hidden; }
      .hd, .ft { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; }
      .hd { border-bottom: 1px solid var(--line); } .hd b { font-size: 16px; font-weight: 600; }
      .ft { border-top: 1px solid var(--line); font-size: 13px; color: var(--fg2); }
      a { color: var(--acc); }
      .items { overflow-y: auto; }
      .it { padding: 12px 14px; border-bottom: 1px solid var(--line); display: grid; gap: 4px; position: relative; }
      .it:last-child { border-bottom: 0; }
      .it.unread::before { content: ''; position: absolute; left: 5px; top: 19px; width: 5px; height: 5px; border-radius: 50%; background: var(--acc); }
      .it.flash { background: var(--bg2); }
      .meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--fg2); }
      .pill { font-size: 11px; padding: 0 7px; border-radius: 99px; border: 1px solid var(--line); }
      .pill.k-new, .pill.k-launch { background: var(--acc); border-color: var(--acc); color: var(--on); }
      .it h3 { margin: 0; font-size: 14.5px; font-weight: 600; line-height: 1.35; }
      .it p { margin: 0; color: var(--fg2); }
      .it:not(.open) p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .it ol { margin: 4px 0 0; padding-left: 18px; color: var(--fg); }
      .it:not(.open) ol { display: none; }
      .acts { display: flex; gap: 12px; margin-top: 2px; }
      .link { background: none; border: 0; padding: 0; color: var(--acc); font-size: 13px; }
      .primary { background: var(--acc); color: var(--on); border: 0; border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; }
      .ghost { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-size: 13px; }
      .nudge { left: max(16px, env(safe-area-inset-left, 0px)); bottom: max(16px, env(safe-area-inset-bottom, 0px)); width: min(340px, calc(100vw - 32px)); padding: 14px 16px; display: grid; gap: 8px; transition: opacity .2s, transform .3s cubic-bezier(.2, .7, .1, 1); }
      .nudge:not(.on) { opacity: 0; transform: translateY(24px); pointer-events: none; visibility: hidden; }
      .nudge .k { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--fg2); }
      .nudge b { font-size: 16px; }
      .nudge ul { margin: 0; padding-left: 18px; color: var(--fg2); }
      .row { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
      .ring { position: fixed; z-index: 2147483000; border-radius: 10px; box-shadow: 0 0 0 3px var(--acc), 0 0 0 100vmax var(--scrim); pointer-events: none; transition: opacity .2s; }
      .ring:not(.on) { opacity: 0; }
      .tip { width: min(320px, calc(100vw - 24px)); padding: 12px 14px; display: grid; gap: 6px; transition: opacity .2s; }
      .tip:not(.on) { opacity: 0; pointer-events: none; visibility: hidden; }
      .tip p { margin: 0; color: var(--fg2); }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    </style>`;
    const button = `<button class="btn${slot ? '' : ' float'}${NOBTN ? ' none' : ''}" aria-label="What’s new" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg><span class="badge" hidden></span></button>`;
    const root = mount(document.body);
    root.innerHTML = css + `<div class="t">${slot ? '' : button}
      <div class="pop" role="dialog" aria-label="What’s new"><div class="hd"><b>What’s new</b><button class="link mark">Mark all read</button></div><div class="items"></div>
        <div class="ft"><span>${all.length} update${all.length > 1 ? 's' : ''}</span><a href="https://arian-shafa.xyz/#releases" target="_blank" rel="noopener">Every site’s updates ↗</a></div></div>
      <div class="nudge" role="status"></div><div class="ring"></div><div class="tip" role="dialog" aria-label="What changed"></div>
    </div>`;
    const broot = slot ? mount(slot) : root;
    if (slot) {
      broot.innerHTML = css + `<div class="t">${button}</div>`;
      // If the app re-renders its header, put the button back in the new one.
      setInterval(() => { const h = broot.host; if (!h.isConnected) { const s = document.querySelector(me.dataset.slot); s && s.appendChild(h); } }, 1000);
    }
    const $ = s => root.querySelector(s);
    const themes = [$('.t'), broot.querySelector('.t')], btn = broot.querySelector('.btn'), badge = btn.querySelector('.badge'), pop = $('.pop'), items = $('.items'), nudge = $('.nudge'), ring = $('.ring'), tip = $('.tip');

    // Match the page: light panel on a light page, dark on a dark one.
    function paintTheme() {
      let c = getComputedStyle(document.body).backgroundColor;
      if (/rgba\(.*,\s*0\)|transparent/.test(c)) c = getComputedStyle(document.documentElement).backgroundColor;
      const m = c.match(/\d+(\.\d+)?/g);
      const light = m && !/rgba\(.*,\s*0\)|transparent/.test(c) ? (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 150 : !matchMedia('(prefers-color-scheme: dark)').matches;
      themes.forEach(t => t.classList.toggle('light', light));
    }
    paintTheme();
    new MutationObserver(paintTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    function paintBadge() { const n = unread().length; badge.hidden = !n; badge.textContent = n > 9 ? '9+' : n; }

    items.innerHTML = all.map(r => `<article class="it${state.read.includes(r.id) ? '' : ' unread'}" data-id="${esc(r.id)}">
      <div class="meta">${day(r.date)} <span class="pill k-${esc(r.kind)}">${KIND[r.kind] || ''}</span></div>
      <h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p>${r.how.length ? `<ol>${r.how.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      <div class="acts">${r.how.length ? '<button class="link more">How to use it</button>' : ''}${r.spot || r.link ? '<button class="link show">Show me</button>' : ''}</div></article>`).join('');

    function place() {
      const b = btn.getBoundingClientRect(), up = b.top > innerHeight / 2;
      pop.style.top = up ? '' : Math.max(12, b.bottom + 8) + 'px';
      pop.style.bottom = up ? innerHeight - b.top + 8 + 'px' : '';
      pop.style.right = Math.max(12, Math.min(innerWidth - b.right, innerWidth - 12 - pop.offsetWidth)) + 'px';
      pop.style.setProperty('--oy', up ? '100%' : '0');
    }
    function openPop(id) {
      paintTheme(); place(); pop.classList.add('on'); btn.setAttribute('aria-expanded', 'true'); track('open', id);
      const it = id && items.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (it) { it.classList.add('open', 'flash'); it.scrollIntoView({ block: 'nearest' }); }
      setTimeout(() => markRead(all), 1500);
    }
    function closePop() { pop.classList.remove('on'); btn.setAttribute('aria-expanded', 'false'); root.querySelectorAll('.it.unread').forEach(x => x.classList.remove('unread')); }

    // ---- spotlight: wait for the element (pages render late), scroll to it, outline it ----
    function find(sel, ms) {
      return new Promise(res => {
        const t0 = Date.now();
        (function look() {
          let el = null; try { el = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); } catch (e) { return res(null); }
          if (el) return res(el);
          if (Date.now() - t0 > ms) return res(null);
          setTimeout(look, 250);
        })();
      });
    }
    // A full-screen layer of the site itself (a first-visit intro, a dialog) is open at the centre of the screen.
    function overlayOpen() {
      for (let n = document.elementFromPoint(innerWidth / 2, innerHeight / 2); n && n !== document.body; n = n.parentElement) {
        if (hosts.includes(n)) return false;
        const b = n.getBoundingClientRect();
        if (getComputedStyle(n).position === 'fixed' && b.width >= innerWidth * 0.8 && b.height >= innerHeight * 0.8) return true;
      }
      return false;
    }
    const until = (ok, ms) => new Promise(res => { const t0 = Date.now(); (function look() { ok() || Date.now() - t0 > ms ? res() : setTimeout(look, 300); })(); });
    let follow = 0;
    function endSpot() { cancelAnimationFrame(follow); ring.classList.remove('on'); tip.classList.remove('on'); }
    function samePage(r) {
      if (!r.link) return true;
      const u = new URL(home + r.link), here = new URLSearchParams(location.search);
      return u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && [...u.searchParams].every(([k, v]) => here.get(k) === v);
    }
    async function show(r, next) {
      closePop(); endSpot(); track('show', r.id);
      if (!samePage(r)) { location.href = home + r.link + (r.link.includes('?') ? '&' : '?') + 'wn=' + encodeURIComponent(r.id); return; }
      if (document.readyState !== 'complete') await new Promise(res => addEventListener('load', res, { once: true }));
      const el = r.spot && await find(r.spot, 10000);
      if (!el) return NOBTN || openPop(r.id);
      await until(() => !overlayOpen(), 120000);  // let the visitor finish the site's own intro first
      paintTheme();
      // The page may still restore its own scroll position after load; if that undoes ours, scroll again.
      // Centre it; an element taller than most of the screen is shown from its top, below a sticky header.
      const tall = () => el.getBoundingClientRect().height > innerHeight * 0.6;
      const into = behavior => tall()
        ? scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior })
        : el.scrollIntoView({ block: 'center', behavior });
      into(RM ? 'auto' : 'smooth');
      setTimeout(() => { const b = el.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) into('auto'); }, 900);
      tip.innerHTML = `<b>${esc(r.title)}</b><p>${esc(r.how.find(s => !/^open\b/i.test(s)) || r.summary)}</p><div class="row"><span></span><button class="primary done">${next ? 'Next' : 'Got it'}</button></div>`;
      tip.querySelector('.done').onclick = () => { endSpot(); next && next(); };
      let hidden = false;
      const pos = () => {
        // A site layer that opens later (an intro shown after load) hides the outline until it closes.
        if (overlayOpen()) { hidden = true; ring.classList.remove('on'); tip.classList.remove('on'); follow = requestAnimationFrame(pos); return; }
        if (hidden) { hidden = false; into('auto'); ring.classList.add('on'); tip.classList.add('on'); }
        const b = el.getBoundingClientRect();
        Object.assign(ring.style, { top: b.top - 6 + 'px', left: b.left - 6 + 'px', width: b.width + 12 + 'px', height: b.height + 12 + 'px' });
        const below = b.bottom + 14 + tip.offsetHeight < innerHeight;
        const above = b.top - 14 - tip.offsetHeight;
        tip.style.top = (below ? b.bottom + 14 : above >= 70 ? above : innerHeight - tip.offsetHeight - 16) + 'px';
        tip.style.left = Math.min(Math.max(12, b.left), innerWidth - tip.offsetWidth - 12) + 'px';
        follow = requestAnimationFrame(pos);
      };
      pos(); ring.classList.add('on'); tip.classList.add('on'); tip.querySelector('.done').focus({ preventScroll: true });
    }

    // ---- events ----
    btn.addEventListener('click', e => { e.stopPropagation(); pop.classList.contains('on') ? closePop() : openPop(); });
    root.addEventListener('click', e => {
      const it = e.target.closest('.it'), r = it && all.find(x => x.id === it.dataset.id);
      if (e.target.closest('.mark')) { markRead(all); closePop(); }
      else if (e.target.closest('.more')) { it.classList.toggle('open'); e.target.textContent = it.classList.contains('open') ? 'Hide steps' : 'How to use it'; }
      else if (e.target.closest('.show')) show(r);
    });
    document.addEventListener('click', e => { if (!hosts.some(h => e.composedPath().includes(h))) { closePop(); if (ring.classList.contains('on')) endSpot(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (pop.classList.contains('on')) { closePop(); btn.focus(); } endSpot(); nudge.classList.remove('on'); } });
    addEventListener('resize', () => pop.classList.contains('on') && place());
    paintBadge();

    // ---- arrival from the shipping log: ?wn=<id> ----
    const q = new URLSearchParams(location.search), wn = q.get('wn');
    if (wn) {
      q.delete('wn');
      history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      const r = all.find(x => x.id === wn);
      if (r) { markRead([r]); track('arrive', r.id); show(r); }
      return;
    }

    // ---- returning visitor: one card for launches they have not seen ----
    const fresh = prev && !NOBTN ? unread().filter(r => NUDGE.includes(r.kind)).slice(0, 3) : [];
    if (!fresh.length) return;
    setTimeout(() => {
      paintTheme();
      nudge.innerHTML = `<span class="k">New since your last visit</span><b>${fresh.length > 1 ? fresh.length + ' new things' : esc(fresh[0].title)}</b>
        ${fresh.length > 1 ? `<ul>${fresh.map(r => `<li>${esc(r.title)}</li>`).join('')}</ul>` : `<p style="margin:0;color:var(--fg2)">${esc(fresh[0].summary)}</p>`}
        <div class="row"><button class="primary go">Show me</button><button class="ghost later">Later</button></div>`;
      nudge.classList.add('on'); markRead(fresh); track('nudge', fresh[0].id);
      nudge.querySelector('.later').onclick = () => nudge.classList.remove('on');
      nudge.querySelector('.go').onclick = () => {
        nudge.classList.remove('on');
        fresh.sort((a, b) => samePage(b) - samePage(a));  // what is on this page first, then go elsewhere
        const step = i => show(fresh[i], i + 1 < fresh.length ? () => step(i + 1) : null);
        step(0);
      };
    }, 1200);
  }
})();
