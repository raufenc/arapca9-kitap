/* Arapça 9 · 1. Ünite ders seti — motor
   Görünümler: ana ekran, ders oynatıcı, oyunlar, sesli sözlük, sınıf araçları, sınav hazırla. */
(() => {
'use strict';

/* ——— küçük yardımcılar ——— */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('a9d.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('a9d.' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ic = (id, cls = 'i') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const seeded = seed => { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const AR_RX = /[؀-ۿﹰ-﻿]/;
const HARAKAT = /[ً-ْٰـ]/g;
const bare = s => String(s).replace(HARAKAT, '').replace(/[.،؟!?,:]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
const trLow = s => String(s).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');
/* Arapça metni kelime kelime sar (boyama için) */
const AW = t => esc(t).split(/(\s+)/).map(p => /\s+/.test(p) || !p ? p : `<span class="w">${p}</span>`).join('');
const A = (t, cls = '') => `<span class="ar ${cls}" lang="ar">${AW(t)}</span>`;
/* Türkçe metin içindeki Arapça parçaları ayır */
const mix = t => esc(t).replace(/([؀-ۿ][؀-ۿً-ْٰ\s،؟.…]*[؀-ۿً-ْٰ؟.])|([؀-ۿ])/g, m => `<span class="ar" lang="ar">${m}</span>`);
const clusters = w => String(w).match(/[^ً-ْٰ][ً-ْٰ]*/g) || [];
const LESSON_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
const TEAM_DEFAULT = ['Yıldızlar', 'Hilaller'];

/* ——— ses ——— */
const AU = new Audio();
AU.preload = 'auto';
let rate = store.get('rate', 1), auEl = null, auRaf = 0, auDone = null;
function stopAudio() {
  AU.pause(); cancelAnimationFrame(auRaf);
  if (auEl) { auEl.classList.remove('is-playing'); $$('.w.lit', auEl).forEach(w => w.classList.remove('lit')); }
  auEl = null;
  if (auDone) { const d = auDone; auDone = null; d(); }
}
function play(id, el) {
  stopAudio();
  if (id == null) return Promise.resolve();
  AU.src = 'ses/' + id + '.mp3';
  AU.playbackRate = rate;
  auEl = el || null;
  if (auEl) auEl.classList.add('is-playing');
  const p = new Promise(res => { auDone = res; });
  AU.onended = () => stopAudio();
  AU.onerror = () => stopAudio();
  AU.play().catch(() => stopAudio());
  if (auEl) karaoke(auEl);
  return p;
}
function karaoke(el) {
  const ws = $$('.w', el).filter(w => w.offsetParent !== null);
  if (!ws.length) return;
  const wt = ws.map(w => Math.max(1, bare(w.textContent).length + 1));
  const tot = wt.reduce((a, b) => a + b, 0);
  const tick = () => {
    if (AU.paused || !AU.duration) { auRaf = requestAnimationFrame(tick); return; }
    const a = AU.duration * 0.06, b = AU.duration * 0.92;
    const f = Math.max(0, Math.min(1, (AU.currentTime - a) / (b - a)));
    let acc = 0, idx = ws.length - 1;
    for (let i = 0; i < ws.length; i++) { acc += wt[i] / tot; if (f <= acc) { idx = i; break; } }
    ws.forEach((w, i) => w.classList.toggle('lit', i === idx));
    auRaf = requestAnimationFrame(tick);
  };
  auRaf = requestAnimationFrame(tick);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* tatlı kısa sesler (doğru/yanlış) */
let actx = null;
function tone(ok) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime, notes = ok ? [660, 880] : [300, 220];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.11); g.gain.exponentialRampToValueAtTime(0.16, t + i * 0.11 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.11 + 0.22);
      o.connect(g).connect(actx.destination); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.25);
    });
  } catch (e) {}
}
function confetti(root) {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#e3b86c', '#c2483b', '#2f8a5f', '#2f7fbf', '#7a55c4'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length];
    c.style.animationDelay = Math.random() * 0.4 + 's'; c.style.animationDuration = 1.2 + Math.random() * 0.9 + 's';
    box.appendChild(c);
  }
  root.appendChild(box); setTimeout(() => box.remove(), 2600);
}

/* ——— sözlük verisi: bütün sesli maddeler ——— */
const DICT = [];
(function buildDict() {
  const add = (ar, tr, au, lesson, page, kind) => DICT.push({ ar, tr, au, lesson, page, kind });
  GREETINGS.forEach(g => { add(g[0], g[3], g[5], 'selam', 12, 'ifade'); add(g[1], g[4], g[6], 'selam', 12, 'ifade'); });
  COMMANDS1.forEach(c => { add(c[0], c[2] + ' (erkeğe)', c[3], 'isaret', 42, 'ifade'); add(c[1], c[2] + ' (kıza)', c[4], 'isaret', 42, 'ifade'); });
  TANWIN.forEach((w, i) => add(w[0], TANWIN_TR[i], 54 + i * 3, 'isaret', 38, 'kelime'));
  LONG.forEach((l, i) => l[3].forEach((w, j) => add(w, LONG_TR[i][j], l[4][j], 'isaret', 40, 'kelime')));
  DIALOGUE.forEach((d, i) => add(d[1], d[2], 105 + i, 'tanis', 48, 'ifade'));
  DEMO.forEach(d => { add(d[0], d[2] + ' (erkek)', null, 'tanis', 55, 'kelime'); add(d[1], d[2] + ' (kadın)', null, 'tanis', 55, 'kelime');
    add('هٰذَا ' + d[0] + '.', 'Bu bir ' + d[2] + ' (erkek).', d[3], 'tanis', 55, 'ifade'); add('هٰذِهِ ' + d[1] + '.', 'Bu bir ' + d[2] + ' (kadın).', d[4], 'tanis', 55, 'ifade'); });
  PRONOUNS.forEach(p => add(p[0] + ' ' + p[1] + '.', p[2], p[3], 'tanis', 59, 'ifade'));
  WHO.forEach(w => add(w[0] + ' ' + w[1], w[2], w[3], 'tanis', 52, 'ifade'));
  NAMEFORMS.forEach(n => add(n[4] + ' ' + n[5], n[3], n[6], 'tanis', 60, 'ifade'));
  COUNTRY.forEach(c => add('مِنْ أَيْنَ ' + c[0] + '؟ ' + c[1] + ' مِنْ ' + c[2] + '.', 'Nereli? · ' + c[4], c[5], 'tanis', 54, 'ifade'));
  COMMANDS2.forEach(c => { add(c[0], c[2] + ' (erkeğe)', c[3], 'kalip', 57, 'ifade'); add(c[1], c[2] + ' (kıza)', c[4], 'kalip', 57, 'ifade'); });
  SOLARWORDS.forEach((w, i) => add(w, SOLAR_TR[i], 164 + i, 'kalip', 61, 'kelime'));
  /* kitabın kelime listesi: sesi varsa eşle */
  const byBare = new Map(DICT.filter(d => d.au).map(d => [bare(d.ar), d.au]));
  (window.CONTENT?.vocabulary || []).forEach(([ar, tr]) => {
    if (DICT.some(d => bare(d.ar) === bare(ar))) return;
    add(ar, tr, byBare.get(bare(ar)) ?? null, 'tanis', 48, ar.includes(' ') ? 'ifade' : 'kelime');
  });
})();

/* ——— durum ——— */
const S = {
  view: 'home', li: 0, si: 0,
  seen: store.get('seen', {}),
  tr: store.get('tr', true),
  rail: store.get('rail', true),
  teams: store.get('teams', TEAM_DEFAULT.slice()),
  klass: store.get('klass', ''),
  checks: store.get('checks', {})
};
const view = $('#view');
const allScreens = LESSONS.flatMap((l, li) => l.screens.map((s, si) => ({ ...s, li, si })));

/* ——— yönlendirme ——— */
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function route() {
  stopAudio(); closeTools(); timers.forEach(f => f()); timers = [];
  const h = location.hash.replace(/^#/, '');
  const sp = /^s=(\d+)/.exec(h);
  if (sp) { const pg = +sp[1], n = allScreens.find(x => x.p === pg) || allScreens.find(x => x.p === pg + 1) || screenForPage(pg); /* çift sayfada sağdaki de görünür */ if (n) { history.replaceState(null, '', `#ders/${n.li + 1}/${n.si + 1}`); renderPlayer(n.li, n.si); return; } }
  const m = /^ders\/(\d+)(?:\/(\d+))?/.exec(h);
  $$('.tab').forEach(t => t.removeAttribute('aria-selected'));
  if (m) { const li = Math.min(+m[1] - 1, LESSONS.length - 1), si = Math.min(+(m[2] || 1) - 1, LESSONS[li].screens.length - 1); renderPlayer(li, si); return; }
  const map = { oyunlar: 'games', sozluk: 'dict', araclar: 'tools', sinav: 'exam' };
  const v = map[h] || 'home';
  const tab = $(`.tab[data-go="${v}"]`); if (tab) tab.setAttribute('aria-selected', 'true');
  S.view = v; view.className = 'view';
  ({ home: renderHome, games: renderGames, dict: renderDict, tools: renderTools, exam: renderExam })[v]();
  view.scrollTop = 0;
}
const HASH = { home: '#ana', games: '#oyunlar', dict: '#sozluk', tools: '#araclar', exam: '#sinav' };

/* ——— ana ekran ——— */
function lessonProgress(li) { const n = LESSONS[li].screens.length; let k = 0; for (let i = 0; i < n; i++) if (S.seen[li + '.' + i]) k++; return [k, n]; }
function renderHome() {
  const last = store.get('last', null);
  const nScreens = allScreens.length;
  const nAudio = new Set(DICT.filter(d => d.au).map(d => d.au)).size;
  const nQ = buildPool().length;
  view.innerHTML = `<div class="home">
   <section class="hero">
    <div class="hero-img"><img src="${UNIT.cover}" alt="Okul bahçesinde dört öğrenci tanışıyor"><span class="badge">KİTAP S. ${UNIT.first}–${UNIT.last}</span></div>
    <div class="hero-txt">
     <span class="eyebrow">1. ünite · Anadolu İmam Hatip Lisesi Arapça 9</span>
     <h1 class="hero-ar ar" lang="ar">${UNIT.ar}</h1>
     <p class="hero-tr">${UNIT.tr}</p>
     <ul class="can">${UNIT.can.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
     <div class="cta-row">
      <button class="btn primary" data-start>${ic('play')} ${last ? 'Kaldığın yerden devam' : 'Derse başla'}${last ? ` <small>${LESSONS[last[0]].no}. ders · ${last[1] + 1}. ekran</small>` : ''}</button>
      ${last ? `<button class="btn ghost" data-go-l="0">Baştan başla</button>` : ''}
      <a class="btn ghost" href="../index.html#p=${UNIT.first}">${ic('book')} Kitabı aç</a>
     </div>
    </div>
   </section>
   <div class="stats">
    <div class="stat"><b>${LESSONS.length}</b><span>ders</span></div>
    <div class="stat"><b>${nScreens}</b><span>tahta ekranı</span></div>
    <div class="stat"><b>${nAudio}</b><span>özgün ses kaydı</span></div>
    <div class="stat"><b>${GAMES.length}</b><span>sınıf oyunu</span></div>
    <div class="stat"><b>${DICT.length}</b><span>sözlük maddesi</span></div>
    <div class="stat"><b>${nQ}</b><span>sınav sorusu</span></div>
   </div>
   <div class="sec-h"><h2>Dersler</h2><p>Her ders kitabın sayfa sırasını izler. Ekrandaki “Kitap s.” etiketi o sayfayı açar.</p></div>
   <div class="lessons">${LESSONS.map((l, i) => { const [k, n] = lessonProgress(i); return `
    <button class="lesson" data-go-l="${i}">
     <div class="ph"><img src="${l.img}" alt="" loading="lazy"><span class="no" style="background:${LESSON_COLORS[i]}">${l.no}</span></div>
     <div class="body"><span class="ar">${esc(l.ar)}</span><h3>${esc(l.tr)}</h3>
      <div class="meta"><span>Kitap s. ${l.pages[0]}–${l.pages[1]}</span><span>${n} ekran</span><span>${k ? `${k}/${n} görüldü` : ''}</span></div>
      <div class="bar"><i style="width:${k / n * 100}%"></i></div></div>
    </button>`; }).join('')}</div>
  </div>`;
  $('[data-start]', view).onclick = () => { const l = store.get('last', [0, 0]); go(`#ders/${l[0] + 1}/${l[1] + 1}`); };
  $$('[data-go-l]', view).forEach(b => b.onclick = () => go(`#ders/${+b.dataset.goL + 1}/1`));
}

/* ——— ders oynatıcı ——— */
let PW = null; /* oynatıcı iskeleti */
function renderPlayer(li, si) {
  S.view = 'player'; S.li = li; S.si = si;
  view.className = 'view player';
  if (!PW || !view.contains(PW)) {
    view.innerHTML = `<div class="player-wrap">
     <aside class="rail${S.rail && innerWidth > 820 ? '' : ' closed'}" id="rail"></aside>
     <div class="stage-area" id="stageArea"><div class="stage-box" id="stageBox"><div class="stage" id="stage"></div></div></div>
     <div class="dock">
      <div class="grp">
       <button class="dk" data-d="home" title="Ünite ana ekranı">${ic('home')}<span>Ana ekran</span></button>
       <button class="dk" data-d="rail" title="Ekran listesi">${ic('rail')}<span>Liste</span></button>
      </div>
      <div class="nav">
       <button class="btn ghost" data-d="prev" title="Önceki ekran (←)">${ic('left')}<span>Önceki</span></button>
       <div class="prog"><b id="progTxt"></b><div class="bar"><i id="progBar"></i></div></div>
       <button class="btn primary" data-d="next" title="Sonraki ekran (→)"><span>Sonraki</span>${ic('right')}</button>
      </div>
      <div class="grp">
       <button class="dk" data-d="tr" title="Türkçe çevirileri aç/kapat (T)" aria-pressed="${S.tr}">${ic('tr')}<span>Türkçe</span></button>
       <button class="dk" data-d="speed" title="Ses hızı" aria-pressed="${rate !== 1}">${ic('speed')}<span id="spd">${rate === 1 ? '1×' : '0,8×'}</span></button>
       <button class="dk" data-d="pen" title="Kalem (K)" aria-pressed="false">${ic('pen')}<span>Kalem</span></button>
       <button class="dk" data-d="shade" title="Perde (P)" aria-pressed="false">${ic('shade')}<span>Perde</span></button>
       <button class="dk" data-d="spot" title="Odak (O)" aria-pressed="false">${ic('spot')}<span>Odak</span></button>
       <button class="dk" data-d="timer" title="Süre">${ic('timer')}<span>Süre</span></button>
       <button class="dk" data-d="pick" title="Öğrenci seç">${ic('dice')}<span>Seç</span></button>
      </div>
     </div>
    </div>`;
    PW = $('.player-wrap', view);
    $$('.dock [data-d]', PW).forEach(b => b.onclick = () => dockAct(b.dataset.d, b));
    fitStage();
  }
  renderRail();
  showScreen(0);
}
function renderRail() {
  const L = LESSONS[S.li], rail = $('#rail');
  rail.innerHTML = `<div class="rail-head"><span class="eyebrow">${L.no}. ders · kitap s. ${L.pages[0]}–${L.pages[1]}</span><h3>${esc(L.tr)}</h3></div>
   <div class="rail-list">${L.screens.map((s, i) => `<button class="rail-item${S.seen[S.li + '.' + i] ? ' seen' : ''}" data-i="${i}"${i === S.si ? ' aria-current="true"' : ''}><span class="n">${i + 1}</span><span>${esc(s.tr || (s.t === 'cover' ? 'Ünite kapağı' : ''))}</span><span class="pg">s.${s.p}</span></button>`).join('')}</div>
   <div class="rail-lessons">${LESSONS.map((l, i) => `<button style="background:${LESSON_COLORS[i]}" data-l="${i}" title="${l.no}. ders · ${esc(l.tr)}"${i === S.li ? ' aria-current="true"' : ''}>${l.no}</button>`).join('')}</div>`;
  $$('.rail-item', rail).forEach(b => b.onclick = () => go(`#ders/${S.li + 1}/${+b.dataset.i + 1}`));
  $$('[data-l]', rail).forEach(b => b.onclick = () => go(`#ders/${+b.dataset.l + 1}/1`));
}
function fitStage() {
  const area = $('#stageArea'), box = $('#stageBox'), st = $('#stage');
  if (!area) return;
  const w = area.clientWidth - 36, h = area.clientHeight - 36;
  const s = Math.max(0.2, Math.min(w / 1600, h / 900));
  box.style.width = 1600 * s + 'px'; box.style.height = 900 * s + 'px';
  st.style.transform = `scale(${s})`; st.style.setProperty('--s', s);
  S.scale = s;
}
addEventListener('resize', () => { if (S.view === 'player') fitStage(); });
function showScreen(dir) {
  stopAudio(); closeTools();
  const L = LESSONS[S.li], s = L.screens[S.si], st = $('#stage');
  S.seen[S.li + '.' + S.si] = 1; store.set('seen', S.seen); store.set('last', [S.li, S.si]);
  st.className = 'stage' + (S.tr ? '' : ' no-tr');
  st.innerHTML = '';
  const sc = document.createElement('div'); sc.className = 'sc'; st.appendChild(sc);
  (SCREENS[s.t] || SCREENS.missing)(s, sc);
  $$('.chip.pgc', sc).forEach(c => c.onclick = () => openPage(+c.dataset.page));
  if (dir) { st.style.setProperty('--dx', (dir > 0 ? 30 : -30) + 'px'); st.classList.remove('anim'); void st.offsetWidth; st.classList.add('anim'); }
  /* ilerleme */
  const idx = allScreens.findIndex(x => x.li === S.li && x.si === S.si);
  $('#progTxt').textContent = `${L.no}. ders · ${S.si + 1} / ${L.screens.length}`;
  $('#progBar').style.width = ((idx + 1) / allScreens.length * 100) + '%';
  $$('.rail-item').forEach((b, i) => { b.toggleAttribute('aria-current', i === S.si); if (i === S.si) { b.setAttribute('aria-current', 'true'); b.classList.add('seen'); b.scrollIntoView({ block: 'nearest' }); } });
  const atEnd = idx === allScreens.length - 1;
  $('[data-d="next"]').innerHTML = atEnd ? `<span>Oyunlara geç</span>${ic('game')}` : `<span>Sonraki</span>${ic('right')}`;
  $('[data-d="prev"]').disabled = idx === 0;
}
function step(d) {
  const idx = allScreens.findIndex(x => x.li === S.li && x.si === S.si) + d;
  if (idx >= allScreens.length) { go('#oyunlar'); return; }
  if (idx < 0) return;
  const n = allScreens[idx];
  history.replaceState(null, '', `#ders/${n.li + 1}/${n.si + 1}`);
  if (n.li !== S.li) { S.li = n.li; S.si = n.si; renderRail(); } else S.si = n.si;
  showScreen(d);
}
function dockAct(d, b) {
  if (d === 'home') go('#ana');
  else if (d === 'rail') { const open = $('#rail').classList.contains('closed'); if (innerWidth > 820) { S.rail = open; store.set('rail', S.rail); } $('#rail').classList.toggle('closed', !open); setTimeout(fitStage, 320); }
  else if (d === 'prev') step(-1);
  else if (d === 'next') step(1);
  else if (d === 'tr') { S.tr = !S.tr; store.set('tr', S.tr); b.setAttribute('aria-pressed', S.tr); $('#stage').classList.toggle('no-tr', !S.tr); }
  else if (d === 'speed') { rate = rate === 1 ? 0.8 : 1; store.set('rate', rate); AU.playbackRate = rate; b.setAttribute('aria-pressed', rate !== 1); $('#spd').textContent = rate === 1 ? '1×' : '0,8×'; }
  else if (d === 'pen') toggleTool('pen', b);
  else if (d === 'shade') toggleTool('shade', b);
  else if (d === 'spot') toggleTool('spot', b);
  else if (d === 'timer') miniTool('timer');
  else if (d === 'pick') miniTool('pick');
}

/* ——— sahne üstü araçlar: kalem, perde, odak ——— */
let tool = null;
function closeTools() { if (tool) { tool.el.remove(); tool.bar && tool.bar.remove(); tool.btn && tool.btn.setAttribute('aria-pressed', 'false'); tool = null; } }
function toggleTool(kind, btn) {
  const was = tool && tool.kind; closeTools(); if (was === kind) return;
  const st = $('#stage'); btn.setAttribute('aria-pressed', 'true');
  const pt = e => { const r = st.getBoundingClientRect(); return [(e.clientX - r.left) / S.scale, (e.clientY - r.top) / S.scale]; };
  if (kind === 'pen') {
    const cv = document.createElement('canvas'); cv.className = 'ink'; cv.width = 1600; cv.height = 900; st.appendChild(cv);
    const g = cv.getContext('2d'); g.lineCap = g.lineJoin = 'round';
    let col = '#c2483b', wid = 6, down = false, last = null;
    const bar = document.createElement('div'); bar.className = 'ink-bar';
    bar.innerHTML = ['#c2483b', '#2f7fbf', '#2f8a5f', '#1d2b26'].map((c, i) => `<button class="sw${i ? '' : ' sel'}" data-c="${c}" style="background:${c}" aria-label="Renk"></button>`).join('') +
      `<button data-e title="Silgi">${ic('undo')}</button><button data-clr title="Hepsini sil">${ic('trash')}</button><button data-x title="Kalemi kapat">${ic('x')}</button>`;
    st.appendChild(bar);
    bar.onclick = e => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.c) { col = b.dataset.c; wid = 6; g.globalCompositeOperation = 'source-over'; $$('.sw', bar).forEach(x => x.classList.toggle('sel', x === b)); }
      else if ('e' in b.dataset) { g.globalCompositeOperation = 'destination-out'; wid = 40; $$('.sw', bar).forEach(x => x.classList.remove('sel')); }
      else if ('clr' in b.dataset) g.clearRect(0, 0, 1600, 900);
      else if ('x' in b.dataset) closeTools(); };
    cv.onpointerdown = e => { down = true; last = pt(e); cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!down) return; const p = pt(e); g.strokeStyle = col; g.lineWidth = wid; g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p; };
    cv.onpointerup = cv.onpointercancel = () => { down = false; };
    tool = { kind, el: cv, bar, btn };
  } else if (kind === 'shade') {
    const sh = document.createElement('div'); sh.className = 'shade'; sh.style.top = '420px';
    sh.innerHTML = `<div class="grip">⇕ Perdeyi kaydır</div>`; st.appendChild(sh);
    let drag = false;
    sh.onpointerdown = e => { drag = true; sh.setPointerCapture(e.pointerId); };
    sh.onpointermove = e => { if (!drag) return; const y = Math.max(40, Math.min(880, pt(e)[1])); sh.style.top = y + 'px'; };
    sh.onpointerup = () => { drag = false; };
    tool = { kind, el: sh, btn };
  } else if (kind === 'spot') {
    const cv = document.createElement('canvas'); cv.className = 'spot'; cv.width = 1600; cv.height = 900; st.appendChild(cv);
    const g = cv.getContext('2d'); let x = 800, y = 450, r = 200;
    const draw = () => { g.clearRect(0, 0, 1600, 900); g.fillStyle = 'rgba(8,14,12,.82)'; g.fillRect(0, 0, 1600, 900); g.globalCompositeOperation = 'destination-out'; const gr = g.createRadialGradient(x, y, r * .82, x, y, r); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; };
    draw();
    cv.onpointermove = e => { if (e.pointerType === 'mouse' || e.buttons) { [x, y] = pt(e); draw(); } };
    cv.onpointerdown = e => { [x, y] = pt(e); draw(); };
    cv.onwheel = e => { e.preventDefault(); r = Math.max(90, Math.min(480, r - e.deltaY * .4)); draw(); };
    cv.ondblclick = () => { r = r > 260 ? 160 : 340; draw(); };
    tool = { kind, el: cv, btn };
  }
}

/* ——— ekran türleri ——— */
function head(s, extra = '', right = null) {
  const col = LESSON_COLORS[S.li];
  return `<div class="sc-head"><div class="left"><span class="chip pgc" data-page="${s.p}" title="Kitabın bu sayfasını aç"><span class="dot" style="background:${col}"></span>Kitap s. ${s.p}</span><h2 class="sc-title-tr">${esc(s.tr)}</h2>${extra}</div>${right ?? A(s.ar, 'sc-title-ar')}</div>`;
}
const playBtn = (sm = '') => `<span class="play ${sm}" aria-hidden="true">${ic('play')}</span>`;
const lineH = (ar, tr, au, cls = '') => `<div class="line ${cls}" data-au="${au ?? ''}" role="button" tabindex="0">${au != null ? playBtn('sm') : ''}<span class="txt">${A(ar)}${tr ? `<span class="tr">${esc(tr)}</span>` : ''}</span></div>`;
function bindAudio(root) {
  if (root._ab) return; root._ab = 1;
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-au]'); if (!t || t.dataset.au === '') return;
    if (t === auEl) { stopAudio(); return; }
    play(+t.dataset.au, t);
  });
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-au]')) { e.preventDefault(); e.target.click(); } });
}
async function playSeq(items, root, wait = 350) {
  const token = (playSeq.t = (playSeq.t || 0) + 1);
  for (const [au, el] of items) { if (playSeq.t !== token || !root.isConnected) return; await play(au, el); await sleep(wait); }
}

const SCREENS = {
  missing(s, sc) { sc.innerHTML = head(s) + `<p class="hint">Bu ekran hazırlanıyor.</p>`; },

  cover(s, sc) {
    sc.style.padding = '0';
    sc.innerHTML = `<div class="cover"><img src="${UNIT.cover}" alt=""><div class="cover-txt">
      <span class="eyebrow">1. ünite · kitap s. ${UNIT.first}–${UNIT.last}</span>
      <span class="ar" lang="ar">${UNIT.ar}</span><h1>${UNIT.tr}</h1>
      <ul class="can">${UNIT.can.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="cta-row"><button class="btn primary" data-n>${ic('play')} Başlayalım</button><span class="chip pgc" data-page="10" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.25)">Kitap s. 10</span></div>
     </div></div>`;
    $('[data-n]', sc).onclick = () => step(1);
  },

  greet(s, sc) {
    sc.innerHTML = head(s, `<div class="seg"><button data-all>${ic('play')} Hepsini sırayla dinle</button></div>`) +
      `<div class="sc-body"><div class="greet-grid">${GREETINGS.map((g, i) => `
       <div class="card greet"><img src="${GREET_IMG[i]}" alt=""><div class="when">${esc(g[2])}</div>
        <div class="pair">${lineH(g[0], g[3], g[5])}${lineH(g[1], g[4], g[6], 'b')}</div></div>`).join('')}</div></div>`;
    bindAudio(sc);
    $('[data-all]', sc).onclick = () => playSeq($$('.line', sc).map(l => [+l.dataset.au, l]), sc);
  },

  situation(s, sc) {
    let i = 0, ok = 0;
    const draw = () => {
      const g = GREETINGS[i];
      const others = shuffle(GREETINGS.filter((_, j) => j !== i)).slice(0, 2).map(x => x[1]);
      const opts = shuffle([g[1], ...others]);
      sc.innerHTML = head(s, `<div class="qnum">${GREETINGS.map((_, j) => `<span class="${j === i ? 'cur' : j < i ? 'ok' : ''}">${j + 1}</span>`).join('')}</div>`) +
       `<div class="sc-body"><div class="sit">
         <div class="pic"><img src="${GREET_IMG[i]}" alt=""><div class="bubble" data-au="${g[5]}" role="button">${playBtn()}${A(g[0])}</div></div>
         <div class="opts"><p class="hint">${esc(g[2])}… Arkadaşın böyle dedi. Sen ne dersin?</p>
          ${opts.map((o, k) => `<button class="card tap opt" data-o="${esc(o)}"><span class="k">${'ABC'[k]}</span>${A(o)}</button>`).join('')}
          <div data-why></div></div></div></div>`;
      bindAudio(sc);
      setTimeout(() => { const b = $('.bubble', sc); if (b && sc.isConnected) play(g[5], b); }, 350);
      $$('.opt', sc).forEach(b => b.onclick = async () => {
        if (sc.dataset.lock) return;
        if (b.dataset.o === g[1]) {
          sc.dataset.lock = 1; b.classList.add('ok'); tone(true); ok++;
          $('[data-why]', sc).innerHTML = `<div class="why ok">Doğru! ${esc(g[4])}</div>`;
          await play(g[6], b);
          if (i < GREETINGS.length - 1) { $('[data-why]', sc).insertAdjacentHTML('beforeend', `<button class="btn dark" data-next style="margin-top:12px">Sonraki durum ${ic('right')}</button>`); $('[data-next]', sc).onclick = () => { i++; delete sc.dataset.lock; draw(); }; }
          else { confetti($('#stage')); $('[data-why]', sc).insertAdjacentHTML('beforeend', `<div class="why ok" style="margin-top:10px">Beş durumun hepsini tamamladınız.</div>`); }
        } else { b.classList.add('bad'); tone(false); }
      });
    };
    draw();
  },

  quiz(s, sc) { quizEngine(s, sc, window[s.q] || QUIZ_SETS[s.q]); },

  letters(s, sc) {
    let cur = 1;
    const draw = () => {
      const f = FORMS[cur];
      sc.innerHTML = head(s, `<div class="seg"><button data-au="17">${ic('play')} 28 harfi dinle</button></div>`) +
       `<div class="sc-body"><div class="letters">${LETTERS.map((l, i) => `<button class="card lt${i === cur ? ' sel' : ''}" data-i="${i}"><span class="ar">${l}</span><small>${NAMES[i]}</small></button>`).join('')}</div>
        <div class="big-letter"><div><p class="hint" style="margin:0 0 6px">Seçili harf: <b style="color:var(--pink)">${NAMES[cur]}</b>${NONJOIN.includes(LETTERS[cur]) ? ' · kendisinden sonraki harfe bağlanmaz' : ''}</p>
         <p class="hint" style="margin:0">Harf, kelimenin başında, ortasında ve sonunda biçim değiştirir. Bir harfe dokunun.</p></div>
         <div class="forms4">${['Tek başına', 'Başta', 'Ortada', 'Sonda'].map((t, k) => `<div class="card"><span class="ar">${f[k]}</span><small>${t}</small></div>`).join('')}</div></div></div>`;
      $$('.lt', sc).forEach(b => b.onclick = () => { cur = +b.dataset.i; draw(); });
    };
    bindAudio(sc); draw();
  },

  families(s, sc) {
    const FAM = [['ب', 'ت', 'ث'], ['ج', 'ح', 'خ'], ['د', 'ذ'], ['ر', 'ز'], ['س', 'ش'], ['ص', 'ض'], ['ط', 'ظ'], ['ع', 'غ']];
    const nm = l => NAMES[LETTERS.indexOf(l)];
    const dots = { 'ب': 'altta bir nokta', 'ت': 'üstte iki nokta', 'ث': 'üstte üç nokta', 'ج': 'içte bir nokta', 'ح': 'noktasız', 'خ': 'üstte bir nokta', 'د': 'noktasız', 'ذ': 'üstte bir nokta', 'ر': 'noktasız', 'ز': 'üstte bir nokta', 'س': 'noktasız', 'ش': 'üstte üç nokta', 'ص': 'noktasız', 'ض': 'üstte bir nokta', 'ط': 'noktasız', 'ظ': 'üstte bir nokta', 'ع': 'noktasız', 'غ': 'üstte bir nokta' };
    sc.innerHTML = head(s) + `<div class="sc-body"><p class="hint" style="margin:-8px 0 16px">Aynı gövde, farklı nokta: harfe dokunun, adını ve noktasını görün.</p>
     <div class="fam">${FAM.map(f => `<div class="card"><div class="row">${f.map((l, i) => `<button class="${i ? '' : 'sel'}" data-l="${l}">${l}</button>`).join('')}</div><div class="name" data-n>${nm(f[0])} · ${dots[f[0]]}</div></div>`).join('')}</div></div>`;
    $$('.fam .card', sc).forEach(c => $$('button', c).forEach(b => b.onclick = () => { $$('button', c).forEach(x => x.classList.toggle('sel', x === b)); $('[data-n]', c).textContent = `${nm(b.dataset.l)} · ${dots[b.dataset.l]}`; }));
  },

  vowels(s, sc) {
    let cur = 1;
    const draw = () => {
      const l = LETTERS[cur] === 'ا' ? 'أ' : LETTERS[cur];
      sc.innerHTML = head(s, `<div class="seg"><button data-au="25">${ic('play')} Örnek okuyuşu dinle</button></div>`) +
       `<div class="sc-body"><div class="vow"><div class="vow-pick">${LETTERS.map((x, i) => `<button class="${i === cur ? 'sel' : ''}" data-i="${i}">${x}</button>`).join('')}</div>
        <div class="vow-show">${[['َ', 'Üstün', 'a / e sesi'], ['ِ', 'Esre', 'i sesi'], ['ُ', 'Ötre', 'u / ü sesi']].map(([h, n, t]) => `<div class="card"><span class="ar">${l}${h}</span><b>${n}</b><span>${t}</span></div>`).join('')}
         <p class="hint" style="grid-column:1/-1;text-align:center;margin:8px 0 0">Harekeler harfin sesini belirler. Soldan bir harf seçin; ${NAMES[cur]} harfini üç harekeyle okuyun.</p></div></div></div>`;
      $$('.vow-pick button', sc).forEach(b => b.onclick = () => { cur = +b.dataset.i; draw(); });
    };
    bindAudio(sc); draw();
  },

  forms(s, sc) {
    const G = [[22, ['ا', 'ب', 'ت', 'ث']], [23, ['ج', 'ح', 'خ']], [24, ['د', 'ذ', 'ر', 'ز']], [25, ['س', 'ش', 'ص', 'ض']], [26, ['ط', 'ظ', 'ع', 'غ']], [27, ['ف', 'ق', 'ك']], [28, ['ل', 'م', 'ن']], [29, ['ه', 'و', 'ي']]];
    let g = 0;
    const draw = () => {
      sc.innerHTML = head({ ...s, p: G[g][0] }, `<div class="seg">${G.map((x, i) => `<button class="${i === g ? 'sel' : ''}" data-g="${i}"><span class="ar" style="font-size:22px">${x[1].join(' ')}</span></button>`).join('')}</div>`) +
       `<div class="sc-body" style="display:grid;gap:12px;align-content:start">${G[g][1].map(l => { const f = FORMS[LETTERS.indexOf(l)]; return `
        <div class="card" style="display:grid;grid-template-columns:150px repeat(4,1fr);align-items:center;padding:6px 18px;direction:rtl">
         <b style="direction:ltr;text-align:left;font-size:20px">${NAMES[LETTERS.indexOf(l)]}</b>
         ${['Tek başına', 'Başta', 'Ortada', 'Sonda'].map((t, k) => `<div style="text-align:center"><span class="ar" style="font-size:${G[g][1].length > 3 ? 58 : 70}px;line-height:1.3">${f[k]}</span><div class="hint" style="font-size:13px">${t}</div></div>`).join('')}
        </div>`; }).join('')}</div>`;
      $$('[data-g]', sc).forEach(b => b.onclick = () => { g = +b.dataset.g; draw(); $$('.chip.pgc', sc).forEach(c => c.onclick = () => openPage(+c.dataset.page)); });
    };
    draw();
  },

  nonjoin(s, sc) {
    const EX = [['د', 'ا', 'ر'], ['و', 'ر', 'د'], ['ب', 'ا', 'ب']];
    const EXW = [['دَارٌ', 'ev'], ['وَرْدٌ', 'gül'], ['بَابٌ', 'kapı']];
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="explain">
      <div class="card rule-card"><span class="ar huge" style="font-size:76px;letter-spacing:.06em">${NONJOIN.join(' ')}</span>
       <p>Bu altı harf <b>kendisinden sonraki</b> harfe bağlanmaz. Kendisinden önceki harfe ise bağlanabilir.</p>
       <p>Kelimenin ortasında görünen boşluk bu yüzden oluşur.</p></div>
      <div style="display:grid;gap:16px;align-content:center">${EX.map((e, i) => `<div class="card" style="padding:16px 24px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px">
        <div class="split">${e.map(x => `<span>${x}</span>`).join('<span class="plus">+</span>')}</div><span style="font-size:34px;color:var(--pink-3)">→</span>
        <div style="text-align:right">${A(EXW[i][0], '')}<div class="tr">${EXW[i][1]}</div></div></div>`).join('')}</div>
     </div></div>`;
    $$('.split', sc).forEach(x => x.style.fontSize = '60px');
    $$('.card .ar:not(.huge)', sc).forEach(x => x.style.fontSize = '72px');
  },

  join(s, sc) {
    const W = [['كَتَبَ', 'yazdı'], ['أَكَلَ', 'yedi'], ['خَرَجَ', 'çıktı'], ['نَجَحَ', 'başardı'], ['ذَهَبَ', 'gitti'], ['رَجَعَ', 'döndü'], ['شَرِبَ', 'içti'], ['لَبِسَ', 'giydi'], ['طَلَبَ', 'istedi'], ['فَتَحَ', 'açtı'], ['نَزَلَ', 'indi'], ['وَصَلَ', 'ulaştı']];
    let i = 0;
    const draw = () => {
      const [w, tr] = W[i], parts = clusters(w);
      let got = [];
      const order = shuffle(parts.map((p, k) => k));
      sc.innerHTML = head(s, `<div class="qnum">${W.map((_, k) => `<span class="${k === i ? 'cur' : k < i ? 'ok' : ''}">${k + 1}</span>`).join('')}</div>`) +
       `<div class="sc-body"><div class="join">
         <div class="join-word"><p class="hint" style="margin:0">Harfleri sağdan sola doğru sırayla seç: kelime kendiliğinden birleşir.</p>
          <div class="card result" data-res></div><div class="tr" style="text-align:center;font-size:24px" data-tr></div></div>
         <div class="join-pick">${order.map(k => `<button class="card tap wchip" data-k="${k}" style="font-size:80px;text-align:center">${parts[k]}</button>`).join('')}</div>
        </div></div>`;
      const res = $('[data-res]', sc);
      $$('[data-k]', sc).forEach(b => b.onclick = () => {
        const k = +b.dataset.k;
        if (k !== got.length) { b.classList.add('bad'); tone(false); setTimeout(() => b.classList.remove('bad'), 450); return; }
        got.push(k); b.classList.add('used'); res.innerHTML = `<span class="ar" lang="ar">${parts.slice(0, got.length).join('')}</span>`;
        if (got.length === parts.length) {
          tone(true); $('[data-tr]', sc).textContent = '“' + tr + '”';
          res.insertAdjacentHTML('beforeend', `<div style="font:800 16px var(--ui);color:var(--ok)">${parts.join(' + ')}</div>`);
          if (i < W.length - 1) setTimeout(() => { if (sc.isConnected) { i++; draw(); } }, 1600); else confetti($('#stage'));
        }
      });
    };
    draw();
  },

  sukun(s, sc) {
    const syl = w => { const out = []; clusters(w).forEach(c => { if (c.includes('ْ') && out.length) out[out.length - 1] += c; else out.push(c); }); return out; };
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="explain">
      <div class="card rule-card"><span class="ar huge">مَنْ</span><div class="split" style="font-size:48px"><span>مَ</span><span class="plus">+</span><span>نْ</span></div>
       <p><b>Sükûn</b> (ـْ) harfin harekesiz olduğunu gösterir. Sükûnlu harf, önceki harfle birlikte tek hecede okunur: <span class="ar">مَنْ</span> “men”.</p>
       <p>Kelimeye dokunun: heceleri görün.</p></div>
      <div class="bank" style="--cols:4;align-content:center">${SUKUN.map(w => `<button class="card tap wcard" data-w="${esc(w)}"><span class="ar">${w}</span><span class="meta"><small data-syl></small></span></button>`).join('')}</div>
     </div></div>`;
    $$('[data-w]', sc).forEach(b => b.onclick = () => { $('[data-syl]', b).innerHTML = `<span class="ar" lang="ar" style="font-size:24px">${syl(b.dataset.w).join(' · ')}</span>`; });
  },

  shadda(s, sc) {
    const open = w => clusters(w).map(c => c.includes('ّ') ? c[0] + 'ْ + ' + c[0] + c.slice(1).replace('ّ', '') : c).join('');
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="explain">
      <div class="card rule-card"><span class="ar huge">كُلُّ</span><div class="split" style="font-size:46px"><span>كُلْ</span><span class="plus">+</span><span>لُ</span></div>
       <p><b>Şedde</b> (ـّ) aynı harfin iki kez okunduğunu gösterir: ilki sükûnlu, ikincisi harekeli.</p>
       <p>Kelimeye dokunun: dinleyin ve açılımını görün.</p></div>
      <div class="bank" style="--cols:3;align-content:center">${SHADDA.map((w, i) => `<button class="card tap wcard" data-au="${35 + i}" data-w="${esc(w)}"><span class="ar">${AW(w)}</span><span class="meta">${playBtn('sm')}<small data-op></small></span></button>`).join('')}</div>
     </div></div>`;
    $$('.wcard', sc).forEach(w => w.style.minHeight = '74px');
    $$('.wcard .ar', sc).forEach(w => w.style.fontSize = '38px');
    bindAudio(sc);
    $$('[data-w]', sc).forEach(b => b.addEventListener('click', () => { $('[data-op]', b).innerHTML = `<span class="ar" lang="ar" style="font-size:20px">${esc(open(b.dataset.w))}</span>`; }));
  },

  tanwin(s, sc) {
    let w = 0;
    const draw = () => {
      sc.innerHTML = head(s, `<div class="tw-pick">${TANWIN.map((t, i) => `<button class="${i === w ? 'sel' : ''}" data-w="${i}">${t[0]} <small style="font:700 15px var(--ui)">${TANWIN_TR[i]}</small></button>`).join('')}</div>`) +
       `<div class="sc-body"><p class="hint" style="margin:0">Tenvin, kelimenin sonundaki çift harekedir; okurken sona bir “n” sesi eklenir.</p>
        <div class="tw-show">${[['ٌ', 'Ötre tenvini', '“-un” sesi'], ['ً', 'Üstün tenvini', '“-en / -an” sesi'], ['ٍ', 'Esre tenvini', '“-in” sesi']].map(([h, n, t], m) => `
         <div class="card tap" data-au="${53 + w * 3 + [1, 0, 2][m]}" role="button"><span class="ar">${AW(TANWIN[w][[0, 1, 2][m]])}</span><b>${n}</b><span class="hint">${t}</span>${playBtn()}</div>`).join('')}</div></div>`;
      $$('[data-w]', sc).forEach(b => b.onclick = () => { w = +b.dataset.w; draw(); });
    };
    bindAudio(sc); draw();
  },

  long(s, sc) {
    let g = 0;
    const draw = () => {
      const L = LONG[g];
      sc.innerHTML = head(s, `<div class="long-tabs">${LONG.map((x, i) => `<button class="${i === g ? 'sel' : ''}" data-g="${i}"><span class="ar">${x[1]}</span>${esc(x[2])}</button>`).join('')}</div>`) +
       `<div class="sc-body"><div class="explain" style="grid-template-columns:360px 1fr">
         <div class="card rule-card"><span class="ar huge">${L[1]}</span><p>${esc(L[2])}: kısa ses <b>iki hareke</b> boyu uzatılır.</p><p>Örnek: <span class="ar" style="font-size:30px">${L[3][1]}</span></p></div>
         <div class="bank" style="--cols:2;align-content:center">${L[3].map((w, j) => `<button class="card tap wcard" data-au="${L[4][j]}"><span class="ar">${AW(w)}</span><span class="meta">${playBtn('sm')}<small class="tr">${esc(LONG_TR[g][j])}</small></span></button>`).join('')}</div>
        </div></div>`;
      $$('[data-g]', sc).forEach(b => b.onclick = () => { g = +b.dataset.g; draw(); });
    };
    bindAudio(sc); draw();
  },

  commands(s, sc) {
    const D = window[s.d] || (s.d === 'COMMANDS1' ? COMMANDS1 : COMMANDS2);
    const imgs = s.img || null;
    sc.innerHTML = head(s, `<div class="seg"><button data-game>${ic('dice')} Yönerge oyunu</button><button data-all>${ic('play')} Hepsini dinle</button></div>`) +
     `<div class="sc-body"><div class="cmds">${D.map((c, i) => `<div class="card cmd${imgs ? '' : ' noimg'}">
       ${imgs ? `<div class="pic"><img src="${imgs[i]}" alt=""></div>` : ''}
       <div class="verb">${esc(c[2])}</div>
       <div class="forms">${lineH(c[0], 'erkek öğrenciye', c[3])}${lineH(c[1], 'kız öğrenciye', c[4], 'b')}</div></div>`).join('')}</div>
      <div data-why style="position:absolute;left:0;right:0;bottom:-6px"></div></div>`;
    if (!imgs) $$('.cmd .line .ar', sc).forEach(x => x.style.fontSize = '38px');
    bindAudio(sc);
    $('[data-all]', sc).onclick = () => playSeq($$('.line', sc).map(l => [+l.dataset.au, l]), sc);
    $('[data-game]', sc).onclick = async () => {
      const lines = $$('.line', sc), l = lines[Math.random() * lines.length | 0];
      $$('.line', sc).forEach(x => x.style.visibility = 'hidden');
      $('[data-why]', sc).innerHTML = `<div class="why" style="text-align:center;font-size:22px">Dinleyin ve yönergeyi uygulayın. Kime söylendi: erkek öğrenciye mi, kız öğrenciye mi?</div>`;
      await play(+l.dataset.au, null); await sleep(2600);
      $$('.line', sc).forEach(x => x.style.visibility = ''); l.classList.add('is-playing');
      $('[data-why]', sc).innerHTML = '';
      setTimeout(() => l.classList.remove('is-playing'), 2200);
    };
  },

  dialogue(s, sc) {
    let role = null; /* sınıfın okuyacağı rol */
    const who = [...new Set(DIALOGUE.map(d => d[0]))];
    sc.innerHTML = head(s, `<div class="seg"><button data-pl>${ic('play')} Konuşmayı oynat</button>${who.map(w => `<button data-role="${esc(w)}" aria-pressed="false">Sınıf: ${w === 'عَلِيّ' ? 'Ali' : 'Ahmet'}</button>`).join('')}</div>`) +
     `<div class="sc-body"><div class="dlg">
       <div class="pic"><img src="${s.img}" alt="İki öğrenci koridorda tanışıyor"><div data-bal></div></div>
       <div class="script"><div class="script-list">${DIALOGUE.map((d, i) => `<div class="sline" data-au="${105 + i}" data-i="${i}"><span class="who">${d[0] === 'عَلِيّ' ? 'Ali' : 'Ahmet'}</span><span>${A(d[1])}<span class="tr" style="display:block">${esc(d[2])}</span></span>${playBtn('sm')}</div>`).join('')}</div></div>
      </div></div>`;
    const bal = $('[data-bal]', sc);
    const showBal = (i, cls = '') => {
      const d = DIALOGUE[i], left = d[0] === 'عَلِيّ';
      bal.innerHTML = `<div class="balloon ${cls}" style="top:5%;${left ? 'left:4%;--tail:22%' : 'right:4%;--tail:70%'}"><div class="who">${left ? 'ALİ' : 'AHMET'}</div>${role === d[0] ? `<div class="ar" lang="ar" style="font-size:34px">…</div><div class="tr" style="opacity:1;filter:none;color:var(--brand);font-weight:800">Sıra sınıfta: bu repliği siz söyleyin!</div>` : `${A(d[1])}<div class="tr">${esc(d[2])}</div>`}</div>`;
      $$('.sline', sc).forEach((x, k) => x.classList.toggle('cur', k === i));
    };
    $$('.sline', sc).forEach(l => l.addEventListener('click', () => showBal(+l.dataset.i)));
    bindAudio(sc);
    $$('[data-role]', sc).forEach(b => b.onclick = () => {
      role = role === b.dataset.role ? null : b.dataset.role;
      $$('[data-role]', sc).forEach(x => x.setAttribute('aria-pressed', x.dataset.role === role));
      $$('.sline', sc).forEach((x, k) => x.classList.toggle('hide', DIALOGUE[k][0] === role));
    });
    $('[data-pl]', sc).onclick = async () => {
      const token = (playSeq.t = (playSeq.t || 0) + 1);
      for (let i = 0; i < DIALOGUE.length; i++) {
        if (playSeq.t !== token || !sc.isConnected) return;
        showBal(i);
        if (DIALOGUE[i][0] === role) { await sleep(4200); continue; }
        await play(105 + i, $('.balloon', sc)); await sleep(400);
      }
    };
    showBal(0);
  },

  demo(s, sc) {
    const DIMG = [[PEOPLE.ali, PEOPLE.fatma], [PEOPLE.hoca, PEOPLE.hocaK], ['img/s05_veda.jpg', 'img/s03_aksam.jpg']];
    sc.innerHTML = head(s, `<p class="hint" style="margin:0"><span class="ar" style="font-size:28px">هٰذَا</span> erkeği, <span class="ar" style="font-size:28px">هٰذِهِ</span> kadını gösterir. Dişil isimler çoğunlukla <span class="ar" style="font-size:28px">ـَةٌ</span> ile biter.</p>`) + `<div class="sc-body"><div class="demo">${DEMO.map((d, i) => `<div class="card">
      <div class="twin"><img src="${DIMG[i][0]}" alt="" style="object-position:${i === 2 ? '50% 30%' : 'top'}"><img src="${DIMG[i][1]}" alt="" style="object-position:${i === 2 ? '60% 30%' : 'top'}"></div>
      <div class="lines">${lineH('هٰذَا ' + d[0] + '.', 'Bu bir ' + d[2] + ' (erkek).', d[3])}${lineH('هٰذِهِ ' + d[1] + '.', 'Bu bir ' + d[2] + ' (kadın).', d[4], 'b')}</div></div>`).join('')}</div>
</div>`;
    bindAudio(sc);
  },

  pronouns(s, sc) {
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="pron">${PRONOUNS.map((p, i) => `<div class="card tap" data-au="${p[3]}" role="button"><img src="${PRONOUN_IMG[i]}" alt="">
      <div class="b"><span class="ar big">${p[0]}</span><span class="ar sm">${AW(p[0] + ' ' + p[1] + '.')}</span><span class="lbl">${esc(p[2])}</span></div></div>`).join('')}</div>
      <div class="pron-legend"><span><b class="ar">أَنَا</b> konuşan kişi</span><span><b class="ar">أَنْتَ / أَنْتِ</b> dinleyen kişi</span><span><b class="ar">هُوَ / هِيَ</b> sözü edilen kişi</span></div></div>`;
    $$('.pron .ar.sm', sc).forEach(x => x.setAttribute('lang', 'ar'));
    bindAudio(sc);
  },

  who(s, sc) {
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="qa">${WHO.map(w => `<div class="card tap" data-au="${w[3]}" role="button" style="display:grid;gap:10px">
      <div class="line" style="pointer-events:none">${playBtn('sm')}<span class="txt">${A(w[0])}</span></div>
      <div class="line b" style="pointer-events:none"><span class="txt">${A(w[1])}</span></div>
      <span class="tr" style="text-align:right">${esc(w[2])}</span></div>`).join('')}</div>
      <p class="hint" style="text-align:center;margin-top:18px">Kart dokunulunca soru ve cevap birlikte okunur. Önce sınıf cevabı tahmin etsin, sonra dinleyin.</p></div>`;
    bindAudio(sc);
  },

  names(s, sc) {
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="names">${NAMEFORMS.map(n => `<div class="card tap" data-au="${n[6]}" role="button">
      <div class="suffix" lang="ar">ـ${n[0]}</div><div class="lbl">${esc(n[3])}</div>
      <div class="line" style="pointer-events:none">${playBtn('sm')}<span class="txt">${A(n[4])}</span></div>
      <div class="line b" style="pointer-events:none"><span class="txt">${A(n[5])}</span></div></div>`).join('')}</div>
      <p class="hint" style="text-align:center;margin-top:18px"><span class="ar" style="font-size:30px">اِسْمٌ</span> “isim” kelimesine eklenen ek, kime sorduğumuzu gösterir.</p></div>`;
    bindAudio(sc);
  },

  countries(s, sc) {
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="cty"><div class="pic"><img src="${s.img}" alt=""></div>
      <div class="cty-list">${COUNTRY.map(c => `<div class="card tap" data-au="${c[5]}" role="button" style="padding:12px 16px;display:grid;gap:8px">
       <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px;color:var(--pink-3)">${esc(c[3])} · ${esc(c[4])}</b>${playBtn('sm')}</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;direction:rtl">
        <div class="line" style="pointer-events:none"><span class="txt">${A('مِنْ أَيْنَ ' + c[0] + '؟')}</span></div>
        <div class="line b" style="pointer-events:none"><span class="txt">${A(c[1] + ' مِنْ ' + c[2] + '.')}</span></div></div></div>`).join('')}</div></div></div>`;
    bindAudio(sc);
  },

  sunmoon(s, sc) {
    const SUN = SOLARLETTERS, MOON = LETTERS.filter(l => !SUN.includes(l));
    const wordFor = l => LETTERS.indexOf(l);
    sc.innerHTML = head(s, `<div class="seg"><button data-au="176">${ic('play')} اَلشَّمْسُ</button><button data-au="184">${ic('play')} اَلْقَمَرُ</button></div>`) +
     `<div class="sc-body"><div class="sm-grid">${[['sun', 'Şemsî harfler', 'الْحُرُوفُ الشَّمْسِيَّةُ', SUN, 'Lâm okunmaz, sonraki harf şeddeli okunur.'], ['moon', 'Kamerî harfler', 'الْحُرُوفُ الْقَمَرِيَّةُ', MOON, 'Lâm sükûnlu okunur: “el-”.']].map(([k, t, ar, list, rule]) => `
      <div class="sm-col ${k}"><h3>${t}<span class="ar">${ar}</span></h3><p class="hint" style="margin:0;color:var(--pink-2)">${rule}</p>
       <div class="sm-letters">${list.map(l => `<button data-l="${l}">${l}</button>`).join('')}</div>
       <div class="sm-word" data-au="" data-box role="button">${playBtn()}<span class="ar" data-w>…</span><span class="tr" data-t>Bir harf seçin</span></div></div>`).join('')}</div></div>`;
    bindAudio(sc);
    $$('[data-l]', sc).forEach(b => b.onclick = () => {
      const col = b.closest('.sm-col'), i = wordFor(b.dataset.l), box = $('[data-box]', col);
      $$('[data-l]', col).forEach(x => x.classList.toggle('sel', x === b));
      box.dataset.au = 164 + i; $('[data-w]', col).innerHTML = AW(SOLARWORDS[i]); $('[data-t]', col).textContent = SOLAR_TR[i];
      play(164 + i, box);
    });
  },

  classify(s, sc) {
    const order = shuffle(SOLARWORDS.map((w, i) => i)).slice(0, 14);
    let k = 0, right = 0;
    const isSun = i => SOLARLETTERS.includes(LETTERS[i]);
    sc.innerHTML = head(s, `<div class="qnum" data-n></div>`) + `<div class="sc-body"><div class="sort">
      <div class="bin sun" data-b="sun"><h3>Şemsî <span class="ar">☀ الشَّمْسِيَّةُ</span></h3><div class="got"></div></div>
      <div class="sort-mid"><div class="card" style="padding:18px 30px;display:flex;gap:16px;align-items:center" data-au="" data-cur role="button">${playBtn()}<span class="sort-word ar" lang="ar" data-w></span></div>
       <span class="tr" data-t style="font-size:22px"></span>
       <div class="sort-btns"><button class="btn sun" data-a="sun">☀ Şemsî</button><button class="btn moon" data-a="moon">☾ Kamerî</button></div>
       <div data-why style="min-height:60px"></div></div>
      <div class="bin moon" data-b="moon"><h3>Kamerî <span class="ar">☾ الْقَمَرِيَّةُ</span></h3><div class="got"></div></div></div></div>`;
    bindAudio(sc);
    const draw = () => {
      $('[data-n]', sc).innerHTML = `<span class="cur" style="width:auto;padding:0 14px">${k + 1} / ${order.length}</span><span class="ok" style="width:auto;padding:0 14px">${right} doğru</span>`;
      if (k >= order.length) { $('.sort-mid', sc).innerHTML = `<div class="result"><h2>${right} / ${order.length}</h2><p class="hint">Bütün kelimeler yerleşti.</p><button class="btn dark" data-again>${ic('redo')} Yeniden</button></div>`; $('[data-again]', sc).onclick = () => SCREENS.classify(s, sc); if (right >= order.length - 2) confetti($('#stage')); return; }
      const i = order[k], cur = $('[data-cur]', sc);
      cur.dataset.au = 164 + i; $('[data-w]', sc).innerHTML = AW(SOLARWORDS[i]); $('[data-t]', sc).textContent = SOLAR_TR[i];
      play(164 + i, cur);
    };
    $$('[data-a]', sc).forEach(b => b.onclick = () => {
      if (k >= order.length) return;
      const i = order[k], ans = isSun(i) ? 'sun' : 'moon', okk = b.dataset.a === ans;
      tone(okk); if (okk) right++;
      const bin = $(`[data-b="${ans}"]`, sc); bin.classList.add('hot'); setTimeout(() => bin.classList.remove('hot'), 400);
      $('.got', bin).insertAdjacentHTML('beforeend', `<span style="${okk ? '' : 'outline:3px solid var(--bad)'}">${SOLARWORDS[i]}</span>`);
      $('[data-why]', sc).innerHTML = `<div class="why ${okk ? 'ok' : ''}">${okk ? 'Doğru' : 'Bu kelime ' + (ans === 'sun' ? 'şemsî' : 'kamerî')}: <span class="ar" lang="ar" style="font-size:26px">${LETTERS[i]}</span> ${ans === 'sun' ? 'şemsî harftir, lâm okunmaz.' : 'kamerî harftir, lâm okunur.'}</div>`;
      k++; setTimeout(() => { if (sc.isConnected) draw(); }, okk ? 700 : 1500);
    });
    draw();
  },

  build(s, sc) {
    let i = 0;
    const draw = () => {
      const [words, tr, au] = SENTENCES[i];
      const order = shuffle(words.map((w, k) => k));
      let got = [];
      sc.innerHTML = head(s, `<div class="qnum">${SENTENCES.map((_, k) => `<span class="${k === i ? 'cur' : k < i ? 'ok' : ''}">${k + 1}</span>`).join('')}</div>`) +
       `<div class="sc-body"><div class="build"><p class="qtext" style="margin:0">“${esc(tr)}” cümlesini kur.</p>
        <div class="slots" data-slots></div><div class="chips">${order.map(k => `<button class="wchip" data-k="${k}">${words[k]}</button>`).join('')}</div>
        <div style="display:flex;gap:12px;justify-content:center"><button class="btn light" data-clr>${ic('undo')} Temizle</button><button class="btn dark" data-chk>${ic('check')} Kontrol et</button></div><div data-why></div></div></div>`;
      const slots = $('[data-slots]', sc);
      const paint = () => { slots.innerHTML = got.map((k, j) => `<button class="wchip" data-j="${j}">${words[k]}</button>`).join(''); slots.className = 'slots'; $$('[data-k]', sc).forEach(b => b.classList.toggle('used', got.includes(+b.dataset.k)));
        $$('[data-j]', slots).forEach(b => b.onclick = () => { got.splice(+b.dataset.j, 1); paint(); }); };
      $$('[data-k]', sc).forEach(b => b.onclick = () => { got.push(+b.dataset.k); paint(); });
      $('[data-clr]', sc).onclick = () => { got = []; paint(); };
      $('[data-chk]', sc).onclick = async () => {
        const okk = got.length === words.length && got.every((k, j) => words[k] === words[j]);
        slots.className = 'slots ' + (okk ? 'ok' : 'bad'); tone(okk);
        if (!okk) { $('[data-why]', sc).innerHTML = `<div class="why">Sıraya bir daha bakın. Arapça cümle sağdan sola okunur.</div>`; return; }
        $('[data-why]', sc).innerHTML = `<div class="why ok">Doğru! ${i < SENTENCES.length - 1 ? `<button class="btn dark" data-nx style="margin-left:12px;height:44px">Sonraki ${ic('right')}</button>` : 'Hepsini kurdunuz.'}</div>`;
        const nx = $('[data-nx]', sc); if (nx) nx.onclick = () => { i++; draw(); }; else confetti($('#stage'));
        if (au) play(au, slots);
      };
    };
    draw();
  },

  roleplay(s, sc) {
    const STEPS = [['السَّلَامُ عَلَيْكُمْ.', 'Selam ver.'], ['وَعَلَيْكُمُ السَّلَامُ.', 'Selamı al.'], ['مَا اسْمُكَ؟ / مَا اسْمُكِ؟', 'Adını sor.'], ['اِسْمِي …', 'Adını söyle.'], ['مِنْ أَيْنَ أَنْتَ؟ / أَنْتِ؟', 'Nereli olduğunu sor.'], ['أَنَا مِنْ …', 'Cevap ver.'], ['تَشَرَّفْتُ. / فُرْصَةٌ سَعِيدَةٌ.', 'Tanıştığına memnun olduğunu söyle.']];
    sc.innerHTML = head(s, `<div class="seg"><button data-pair>${ic('users')} İki öğrenci seç</button><button data-time>${ic('timer')} 2 dakika</button></div>`) +
     `<div class="sc-body"><div class="role"><div class="pic"><img src="${s.img}" alt=""></div>
      <div class="steps"><div data-who class="why" style="margin:0 0 4px;font-size:22px;text-align:center">Bir öğrenci A, diğeri B olsun. Kalıpları kullanarak tanışın.</div>
      ${STEPS.map((st, i) => `<div class="card step"><span class="n" style="background:${i % 2 ? 'var(--c2)' : 'var(--pink)'}">${i % 2 ? 'B' : 'A'}</span><div>${A(st[0])}<div class="tr">${esc(st[1])}</div></div></div>`).join('')}</div></div></div>`;
    $$('.step', sc).forEach(x => x.style.padding = '8px 16px');
    $$('.step .ar', sc).forEach(x => x.style.fontSize = '28px');
    $('[data-pair]', sc).onclick = () => {
      const names = classList();
      if (names.length < 2) { $('[data-who]', sc).innerHTML = `Sınıf listesi boş. <a href="#araclar" style="color:var(--brand)">Sınıf araçları</a> sayfasından öğrenci adlarını ekleyin.`; return; }
      const [a, b] = shuffle(names);
      $('[data-who]', sc).innerHTML = `<b>A:</b> ${esc(a)} &nbsp; · &nbsp; <b>B:</b> ${esc(b)}`; tone(true);
    };
    $('[data-time]', sc).onclick = () => miniTool('timer', 120);
  },

  finish(s, sc) {
    sc.innerHTML = head(s) + `<div class="sc-body"><div class="finish"><div class="pic"><img src="img/s08_tanistirma.jpg" alt=""></div>
     <div class="checks"><p class="qtext" style="margin:0 0 4px">Bu ünitenin sonunda…</p>${UNIT.can.map((c, i) => `<div class="card check${S.checks[i] ? ' on' : ''}" data-c="${i}" role="checkbox" aria-checked="${!!S.checks[i]}" tabindex="0"><span class="box"></span>${esc(c)}</div>`).join('')}
      <div class="cta-row"><button class="btn dark" data-g>${ic('game')} Oyunlara geç</button><button class="btn light" data-e>${ic('exam')} Sınav hazırla</button></div></div></div></div>`;
    $$('[data-c]', sc).forEach(c => c.onclick = () => { const i = +c.dataset.c; S.checks[i] = !S.checks[i]; store.set('checks', S.checks); c.classList.toggle('on', S.checks[i]); c.setAttribute('aria-checked', S.checks[i]); if (Object.values(S.checks).filter(Boolean).length === UNIT.can.length) confetti($('#stage')); });
    $('[data-g]', sc).onclick = () => go('#oyunlar'); $('[data-e]', sc).onclick = () => go('#sinav');
  }
};
const QUIZ_SETS = { GREETQUIZ, READQUIZ, DEMOQUIZ, FINALQUIZ };

/* ——— soru motoru (ders içi; tek sınıf veya iki takım) ——— */
function quizEngine(s, sc, Qs) {
  let i = 0, res = [], teams = false, turn = 0, score = [0, 0];
  const draw = () => {
    if (i >= Qs.length) {
      const ok = res.filter(Boolean).length;
      sc.innerHTML = head(s) + `<div class="sc-body"><div class="result"><h2>${teams ? (score[0] === score[1] ? 'Berabere!' : `${esc(S.teams[score[0] > score[1] ? 0 : 1])} kazandı`) : `${ok} / ${Qs.length} doğru`}</h2>
       ${teams ? `<p class="hint">${esc(S.teams[0])}: ${score[0]} · ${esc(S.teams[1])}: ${score[1]}</p>` : ''}<button class="btn dark" data-again>${ic('redo')} Yeniden</button></div></div>`;
      $('[data-again]', sc).onclick = () => quizEngine(s, sc, Qs);
      if (ok >= Qs.length - 1) confetti($('#stage'));
      return;
    }
    const q = Qs[i];
    sc.innerHTML = head(s, `<div class="seg"><button data-tm aria-pressed="${teams}">${ic('users')} İki takım</button></div>`) +
     `<div class="sc-body"><div class="quiz"><div class="qside">
       <div class="qnum">${Qs.map((_, k) => `<span class="${k === i ? 'cur' : res[k] === true ? 'ok' : res[k] === false ? 'bad' : ''}">${k + 1}</span>`).join('')}</div>
       <div class="qtext">${mix(q.q)}</div>
       ${q.audio != null ? `<button class="card tap" data-au="${q.audio}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;align-self:flex-start">${playBtn()}<b>Dinle</b></button>` : ''}
       ${teams ? `<div class="teams">${S.teams.map((t, k) => `<div class="team${k === turn ? ' on' : ''}">${esc(t)}<b>${score[k]}</b></div>`).join('')}</div>` : ''}
      </div>
      <div class="opts">${q.options.map((o, k) => `<button class="card tap opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span>${AR_RX.test(o) ? A(o) : `<span style="flex:1;text-align:left">${esc(o)}</span>`}</button>`).join('')}<div data-why></div></div></div></div>`;
    bindAudio(sc);
    $('[data-tm]', sc).onclick = () => { teams = !teams; draw(); };
    let tried = false;
    $$('.opt', sc).forEach(b => b.onclick = () => {
      if (sc.dataset.lock) return;
      const k = +b.dataset.k;
      if (k === q.answer) {
        sc.dataset.lock = 1; b.classList.add('ok'); tone(true);
        if (res[i] === undefined) res[i] = !tried;
        if (teams && !tried) score[turn]++;
        $('[data-why]', sc).innerHTML = `<div class="why ok">${mix(q.why)}</div><button class="btn dark" data-nx style="margin-top:12px">${i < Qs.length - 1 ? 'Sonraki soru' : 'Sonucu gör'} ${ic('right')}</button>`;
        $('[data-nx]', sc).onclick = () => { i++; delete sc.dataset.lock; if (teams) turn = 1 - turn; draw(); };
      } else {
        b.classList.add('bad'); tone(false); tried = true; if (res[i] === undefined) res[i] = false;
        $('[data-why]', sc).innerHTML = `<div class="why">${teams ? `Hak diğer takıma geçti: ${esc(S.teams[1 - turn])}` : 'Bir daha deneyin.'}</div>`;
        if (teams) { turn = 1 - turn; $$('.team', sc).forEach((t, x) => t.classList.toggle('on', x === turn)); }
      }
    });
  };
  draw();
}

/* ——— pencereler ——— */
function modal(title, body, opts = {}) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="sheet" style="${opts.w ? 'width:' + opts.w : ''}"><div class="sheet-head"><h3>${title}</h3><button class="x" aria-label="Kapat">${ic('x')}</button></div><div class="sheet-body"></div></div>`;
  const b = $('.sheet-body', m); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
  const close = () => { m.remove(); opts.onClose && opts.onClose(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  $('.x', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
  document.addEventListener('keydown', esc_);
  document.body.appendChild(m);
  return { el: m, body: b, close };
}
function openPage(p) {
  const fmt = n => String(n).padStart(3, '0');
  const body = document.createElement('div');
  const draw = () => {
    body.innerHTML = `<div class="pageview"><button class="x" data-pv="1" title="Sonraki sayfa">${ic('left')}</button><img src="../assets/pages/${fmt(p)}.webp" alt="Kitap sayfa ${p}"><button class="x" data-pv="-1" title="Önceki sayfa">${ic('right')}</button></div>
     <div style="display:flex;gap:10px;justify-content:center;margin-top:14px"><a class="btn dark" href="../index.html#p=${p}">${ic('book')} Etkileşimli kitapta aç (s. ${p})</a>${screenForPage(p) ? `<button class="btn light" data-ts>Bu sayfanın tahta ekranı</button>` : ''}</div>`;
    $$('[data-pv]', body).forEach(b => b.onclick = () => { p = Math.max(1, Math.min(217, p + +b.dataset.pv)); M.el.querySelector('h3').textContent = `Kitap · sayfa ${p}`; draw(); });
    const ts = $('[data-ts]', body); if (ts) ts.onclick = () => { const n = screenForPage(p); M.close(); go(`#ders/${n.li + 1}/${n.si + 1}`); };
  };
  const M = modal(`Kitap · sayfa ${p}`, body, { w: 'min(1000px,94vw)' });
  draw();
}
function screenForPage(p) {
  if (p < UNIT.first || p > UNIT.last) return null;
  const exact = allScreens.find(x => x.p === p); if (exact) return exact;
  let best = null; for (const x of allScreens) if (x.p <= p && (!best || x.p > best.p)) best = x;
  return best;
}
function gotoPad() {
  let v = '';
  const body = document.createElement('div');
  body.innerHTML = `<div class="pad-show" data-v>—</div><p class="hint" style="text-align:center;margin:0 0 12px;color:var(--pink-3)">Kitabın sayfa numarasını yazın (1. ünite: ${UNIT.first}–${UNIT.last})</p>
   <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-del>⌫</button><button data-n="0">0</button><button class="go" data-go>Git</button></div>
   <div data-msg class="hint" style="text-align:center;margin-top:12px;color:var(--pink-3);min-height:24px"></div>`;
  const M = modal('Sayfaya git', body, { w: '360px' });
  const show = () => { $('[data-v]', body).textContent = v || '—'; };
  const goNow = () => {
    const p = +v; if (!p) return;
    const n = screenForPage(p);
    if (n) { M.close(); go(`#ders/${n.li + 1}/${n.si + 1}`); }
    else if (p >= 1 && p <= 218) { location.href = `../index.html#p=${p}`; }
    else $('[data-msg]', body).textContent = 'Bu numarada sayfa yok.';
  };
  body.onclick = e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.n) { if (v.length < 3) v += b.dataset.n; } else if ('del' in b.dataset) v = v.slice(0, -1); else if ('go' in b.dataset) return goNow(); show(); };
  const kd = e => { if (/^\d$/.test(e.key) && v.length < 3) { v += e.key; show(); } else if (e.key === 'Backspace') { v = v.slice(0, -1); show(); } else if (e.key === 'Enter') goNow(); };
  document.addEventListener('keydown', kd); const old = M.close; M.close = () => { document.removeEventListener('keydown', kd); old(); };
  $('.x', M.el).onclick = M.close;
}
function helpBox() {
  modal('Kullanım', `<div class="help-grid">
    <div><kbd>→</kbd><kbd>←</kbd> Sonraki / önceki ekran</div><div><kbd>T</kbd> Türkçe çevirileri aç/kapat</div>
    <div><kbd>K</kbd> Kalem: ekrana yaz, çiz</div><div><kbd>P</kbd> Perde: ekranın altını kapat, yavaş yavaş aç</div>
    <div><kbd>O</kbd> Odak: yalnız bir bölgeyi aydınlat (fare tekerleği büyütür)</div><div><kbd>F</kbd> Tam ekran</div>
    <div><kbd>G</kbd> Sayfaya git: kitabın sayfa numarasıyla ekrana geç</div><div><kbd>Esc</kbd> Pencereyi / aracı kapat</div>
   </div>
   <p style="margin:18px 0 0;color:var(--pink-2)">Her ekrandaki <b>Kitap s.</b> etiketi, öğrencinin elindeki kitabın aynı sayfasını açar. Arapça satırlara dokununca özgün kayıt çalar ve okunan kelime boyanır. Ses hızı alttaki düğmeyle 0,8× yapılabilir.</p>
   <p style="margin:10px 0 0;color:var(--pink-2)">Sesler, 1. ünitenin resmî ünite sunusundaki özgün kayıtlardır. Sınıf listesi ve ilerleme yalnız bu cihazda saklanır.</p>`, { w: 'min(820px,94vw)' });
}

/* ——— sınıf araçları (bileşenler) ——— */
function classList() { return S.klass.split(/\n|,/).map(x => x.trim()).filter(Boolean); }
function mountPicker(el) {
  let pool = null, removeOn = store.get('pickRemove', true);
  el.innerHTML = `<div class="pick-show" data-show>?</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn dark" data-p>${ic('dice')} Öğrenci seç</button>
   <label style="display:flex;align-items:center;gap:8px;font-weight:700;color:var(--pink-2)"><input type="checkbox" data-r ${removeOn ? 'checked' : ''}> Seçilen bir daha gelmesin</label></div>
   <div class="hint" data-left style="text-align:center;font-size:14px"></div>`;
  const show = $('[data-show]', el), left = $('[data-left]', el);
  const refresh = () => { const n = classList().length; left.textContent = n ? (pool && removeOn ? `Seçilmeyen: ${pool.length} / ${n}` : `Listede ${n} öğrenci`) : 'Liste boş: Sınıf araçlarından öğrenci adlarını ekleyin.'; };
  $('[data-r]', el).onchange = e => { removeOn = e.target.checked; store.set('pickRemove', removeOn); pool = null; refresh(); };
  $('[data-p]', el).onclick = () => {
    const names = classList(); if (!names.length) { refresh(); return; }
    if (!pool || !pool.length || !removeOn) pool = names.slice();
    const pick = pool[Math.random() * pool.length | 0];
    let n = 0; const t = setInterval(() => { show.textContent = names[Math.random() * names.length | 0]; show.classList.remove('flash'); void show.offsetWidth; show.classList.add('flash');
      if (++n > 14) { clearInterval(t); show.textContent = pick; tone(true); if (removeOn) pool.splice(pool.indexOf(pick), 1); refresh(); } }, 70);
  };
  refresh();
}
let timers = [];
function mountTimer(el, preset) {
  let total = preset || store.get('timerSec', 60), left = total, run = null;
  el.innerHTML = `<div class="clock" data-c></div><div class="hourglass"><i data-h></i></div>
   <div class="presets">${[30, 60, 120, 180, 300, 600].map(s => `<button data-s="${s}" class="${s === total ? 'sel' : ''}">${s < 60 ? s + ' sn' : s / 60 + ' dk'}</button>`).join('')}</div>
   <div style="display:flex;gap:8px;justify-content:center"><button class="btn dark" data-go>${ic('play')} Başlat</button><button class="btn light" data-rs>${ic('redo')} Sıfırla</button></div>`;
  const c = $('[data-c]', el), h = $('[data-h]', el), gob = $('[data-go]', el);
  const paint = () => { c.textContent = `${String(left / 60 | 0).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; h.style.width = (left / total * 100) + '%'; c.classList.toggle('end', left === 0); };
  const stop = () => { clearInterval(run); run = null; gob.innerHTML = `${ic('play')} Başlat`; };
  const start = () => { if (left === 0) left = total; run = setInterval(() => { left--; paint(); if (left <= 0) { stop(); tone(true); setTimeout(() => tone(true), 300); } }, 1000); gob.innerHTML = `${ic('pause')} Durdur`; };
  gob.onclick = () => run ? stop() : start();
  $('[data-rs]', el).onclick = () => { stop(); left = total; paint(); };
  $$('[data-s]', el).forEach(b => b.onclick = () => { stop(); total = left = +b.dataset.s; store.set('timerSec', total); $$('[data-s]', el).forEach(x => x.classList.toggle('sel', x === b)); paint(); });
  paint(); timers.push(stop);
  if (preset) start();
}
function mountQuiet(el) {
  let th = store.get('quietTh', 45), stream = null, raf = 0;
  el.innerHTML = `<div class="quiet-face" data-f>Mikrofonu açınca sınıfın ses düzeyi burada görünür.</div>
   <div class="meter"><i data-m style="width:0"></i><span class="th" data-t></span></div>
   <label style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;font-weight:700;color:var(--pink-2)">Eşik <input type="range" min="10" max="90" value="${th}" data-r></label>
   <div style="display:flex;justify-content:center"><button class="btn dark" data-on>${ic('mic')} Mikrofonu aç</button></div>`;
  const f = $('[data-f]', el), m = $('[data-m]', el), t = $('[data-t]', el);
  t.style.left = th + '%';
  $('[data-r]', el).oninput = e => { th = +e.target.value; t.style.left = th + '%'; store.set('quietTh', th); };
  $('[data-on]', el).onclick = async e => {
    if (stream) { stream.getTracks().forEach(x => x.stop()); stream = null; cancelAnimationFrame(raf); e.currentTarget.innerHTML = `${ic('mic')} Mikrofonu aç`; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const an = actx.createAnalyser(); an.fftSize = 512; actx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize); let lvl = 0;
      const loop = () => { an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; const rms = Math.sqrt(s / buf.length); lvl = lvl * .85 + Math.min(100, rms * 3.2) * .15;
        m.style.width = lvl + '%'; const loud = lvl > th; m.style.background = loud ? 'var(--bad)' : 'var(--ok)'; f.classList.toggle('loud', loud); f.textContent = loud ? 'Biraz sessiz olalım…' : 'Harika, sınıf sakin.'; if (el.isConnected) raf = requestAnimationFrame(loop); else stream && stream.getTracks().forEach(x => x.stop()); };
      loop(); $('[data-on]', el).innerHTML = `${ic('x')} Mikrofonu kapat`;
    } catch (err) { f.textContent = 'Mikrofon açılamadı. Tarayıcı izin vermedi ya da cihazda mikrofon yok.'; }
  };
}
function mountBoard(el) {
  let teams = store.get('board', [{ n: S.teams[0], s: 0 }, { n: S.teams[1], s: 0 }]);
  const save = () => store.set('board', teams);
  const draw = () => {
    el.innerHTML = `<div class="board" style="--n:${teams.length}">${teams.map((t, i) => `<div class="t"><input value="${esc(t.n)}" data-n="${i}" aria-label="Takım adı"><b>${t.s}</b><div class="pm"><button data-m="${i}">−</button><button data-p="${i}">+</button></div></div>`).join('')}</div>
     <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${[2, 3, 4].map(n => `<button class="btn light" data-k="${n}" style="height:42px">${n} takım</button>`).join('')}<button class="btn light" data-z style="height:42px">${ic('redo')} Sıfırla</button></div>`;
    $$('[data-p]', el).forEach(b => b.onclick = () => { teams[+b.dataset.p].s++; save(); draw(); tone(true); });
    $$('[data-m]', el).forEach(b => b.onclick = () => { teams[+b.dataset.m].s = Math.max(0, teams[+b.dataset.m].s - 1); save(); draw(); });
    $$('[data-n]', el).forEach(b => b.onchange = () => { teams[+b.dataset.n].n = b.value; save(); });
    $$('[data-k]', el).forEach(b => b.onclick = () => { const n = +b.dataset.k; const names = ['Yıldızlar', 'Hilaller', 'Kalemler', 'Kitaplar']; teams = Array.from({ length: n }, (_, i) => teams[i] || { n: names[i], s: 0 }); save(); draw(); });
    $('[data-z]', el).onclick = () => { teams.forEach(t => t.s = 0); save(); draw(); };
  };
  draw();
}
function mountGroups(el) {
  el.innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="color:var(--pink-2)">Grup sayısı</b>${[2, 3, 4, 5, 6].map(n => `<button class="btn light" data-g="${n}" style="height:42px;padding:0 16px">${n}</button>`).join('')}</div><div class="groups" data-out></div>`;
  $$('[data-g]', el).forEach(b => b.onclick = () => {
    const names = shuffle(classList()), n = +b.dataset.g, out = $('[data-out]', el);
    if (!names.length) { out.innerHTML = `<div>Önce sınıf listesini yazın.</div>`; return; }
    const g = Array.from({ length: n }, () => []); names.forEach((x, i) => g[i % n].push(x));
    out.innerHTML = g.map((x, i) => `<div><b>${i + 1}. grup</b>${x.map(esc).join('<br>')}</div>`).join('');
  });
}
function miniTool(kind, preset) {
  const box = document.createElement('div'); box.style.cssText = 'display:grid;gap:14px;min-width:min(520px,86vw)';
  const M = modal(kind === 'timer' ? 'Süre' : 'Öğrenci seç', box, { onClose: () => { timers.forEach(f => f()); timers = []; } });
  if (kind === 'timer') mountTimer(box, preset); else mountPicker(box);
  return M;
}

/* ——— oyunlar ——— */
const AUDIO_ITEMS = () => DICT.filter(d => d.au != null);
const GAMES = [
  { id: 'dinle', t: 'Dinle ve bul', d: 'Kayıt çalar; duyduğunuz kelimeyi ya da ifadeyi bulun.', ic: 'play', col: 'var(--c1)', tags: ['Dinleme', 'Okuma'] },
  { id: 'ip', t: 'İp çekme', d: 'İki takım aynı soruyu kendi tarafında cevaplar; ilk doğru cevap ipi çeker.', ic: 'users', col: 'var(--c2)', tags: ['İki takım', 'Hız'], teamsOnly: true },
  { id: 'karsilik', t: 'Karşılık ver', d: 'Selama, soruya ya da tanışma cümlesine uygun cevabı seçin.', ic: 'dict', col: 'var(--c4)', tags: ['Konuşma', 'Dinleme'] },
  { id: 'hafiza', t: 'Eşini bul', d: 'Arapça kartı Türkçe karşılığıyla eşleştirin. Takımlar sırayla oynar.', ic: 'grid', col: 'var(--c3)', tags: ['Kelime', 'Hafıza'] },
  { id: 'gunes', t: 'Şemsî mi, kamerî mi?', d: 'Kelimeyi dinleyin, lâmın okunup okunmadığına karar verin.', ic: 'star', col: 'var(--c5)', tags: ['Okuma kuralı', 'Dinleme'] },
  { id: 'cumle', t: 'Cümle kur', d: 'Karışık kelimeleri doğru sıraya dizerek tanışma cümleleri kurun.', ic: 'list', col: 'var(--c6)', tags: ['Yazma', 'Dizim'] }
];
function renderGames() {
  view.innerHTML = `<div class="page"><div class="page-head"><div><h1>Sınıf oyunları</h1><p>Hepsi bu ünitenin kelimeleri ve özgün ses kayıtlarıyla. Tek sınıf ya da takım hâlinde oynanır.</p></div></div>
   <div class="tiles">${GAMES.map(g => `<button class="tile" data-g="${g.id}"><span class="ic" style="background:${g.col}">${ic(g.ic)}</span><h3>${g.t}</h3><p>${g.d}</p><div class="tags">${g.tags.map(t => `<span>${t}</span>`).join('')}</div></button>`).join('')}</div></div>`;
  $$('[data-g]', view).forEach(b => b.onclick = () => gameSetup(GAMES.find(g => g.id === b.dataset.g)));
}
function gameSetup(g) {
  const cfg = store.get('game.' + g.id, { mode: g.teamsOnly ? 2 : 1, rounds: 10, time: 0, lessons: ['selam', 'isaret', 'tanis', 'kalip'] });
  if (g.teamsOnly) cfg.mode = 2;
  const box = document.createElement('div');
  const lessonsUsed = g.id === 'gunes' || g.id === 'cumle' || g.id === 'karsilik' ? null : LESSONS.filter(l => DICT.some(d => d.lesson === l.id));
  box.innerHTML = `<div class="setup"><div class="face" style="background:linear-gradient(160deg,${g.col},#1d2b26)"><span class="ic" style="width:58px;height:58px;border-radius:17px;display:grid;place-items:center;background:rgba(255,255,255,.18)">${ic(g.ic)}</span><h2>${g.t}</h2><p>${g.d}</p></div>
   <div>
    ${g.teamsOnly ? '' : `<div class="opt-row"><label>Oyuncular</label><div class="seg"><button data-mode="1" class="${cfg.mode === 1 ? 'sel' : ''}">Bütün sınıf</button><button data-mode="2" class="${cfg.mode === 2 ? 'sel' : ''}">İki takım</button></div></div>`}
    <div class="opt-row" data-tn ${cfg.mode === 2 ? '' : 'hidden'}><label>Takımlar</label><div class="team-names"><input value="${esc(S.teams[0])}" data-t="0"><input value="${esc(S.teams[1])}" data-t="1"></div></div>
    ${g.id === 'hafiza' ? '' : `<div class="opt-row"><label>Tur</label><div class="seg">${[5, 10, 15].map(n => `<button data-r="${n}" class="${cfg.rounds === n ? 'sel' : ''}">${n}</button>`).join('')}</div></div>`}
    ${['dinle', 'karsilik', 'gunes'].includes(g.id) ? `<div class="opt-row"><label>Süre</label><div class="seg">${[[0, 'Süresiz'], [20, '20 sn'], [10, '10 sn']].map(([n, t]) => `<button data-s="${n}" class="${cfg.time === n ? 'sel' : ''}">${t}</button>`).join('')}</div></div>` : ''}
    ${lessonsUsed ? `<div class="opt-row"><label>Dersler</label><div class="seg">${lessonsUsed.map(l => `<button data-l="${l.id}" aria-pressed="${cfg.lessons.includes(l.id)}">${l.no}. ${esc(l.tr)}</button>`).join('')}</div></div>` : ''}
    <div style="display:flex;justify-content:flex-end;margin-top:18px"><button class="btn primary" data-start>${ic('play')} Başla</button></div>
   </div></div>`;
  const M = modal('Oyun ayarları', box, { w: 'auto' });
  const seg = (attr, key, num = true) => $$(`[data-${attr}]`, box).forEach(b => b.onclick = () => { cfg[key] = num ? +b.dataset[attr] : b.dataset[attr]; $$(`[data-${attr}]`, box).forEach(x => x.classList.toggle('sel', x === b)); if (key === 'mode') $('[data-tn]', box).hidden = cfg.mode !== 2; });
  seg('mode', 'mode'); seg('r', 'rounds'); seg('s', 'time');
  $$('[data-l]', box).forEach(b => b.onclick = () => { const id = b.dataset.l, on = cfg.lessons.includes(id); if (on && cfg.lessons.length === 1) return; cfg.lessons = on ? cfg.lessons.filter(x => x !== id) : [...cfg.lessons, id]; b.setAttribute('aria-pressed', !on); });
  $$('[data-t]', box).forEach(i => i.onchange = () => { S.teams[+i.dataset.t] = i.value.trim() || TEAM_DEFAULT[+i.dataset.t]; store.set('teams', S.teams); });
  $('[data-start]', box).onclick = () => { $$('[data-t]', box).forEach(i => { S.teams[+i.dataset.t] = i.value.trim() || TEAM_DEFAULT[+i.dataset.t]; }); store.set('teams', S.teams); store.set('game.' + g.id, cfg); M.close(); runGame(g, cfg); };
}
function runGame(g, cfg) {
  const el = document.createElement('div'); el.className = 'game';
  el.innerHTML = `<div class="game-top"><h2>${g.t}</h2><span class="round" data-rd></span><div class="score" data-sc></div><button class="tb icon" data-x aria-label="Oyunu kapat" style="color:#fff">${ic('x')}</button></div><div class="game-stage"><div class="gcard" data-c></div></div>`;
  document.body.appendChild(el);
  const G = { el, card: $('[data-c]', el), cfg, score: [0, 0], turn: 0, round: 0, timer: null };
  const kd = e => { if (e.key === 'Escape') end(); };
  const end = () => { clearInterval(G.timer); stopAudio(); el.remove(); document.removeEventListener('keydown', kd); };
  $('[data-x]', el).onclick = end; document.addEventListener('keydown', kd);
  G.paintScore = () => {
    $('[data-sc]', el).innerHTML = cfg.mode === 2 ? S.teams.map((t, i) => `<div class="${i === G.turn && g.id !== 'ip' ? 'on' : ''}">${esc(t)}<b>${G.score[i]}</b></div>`).join('') : `<div>Doğru<b>${G.score[0]}</b></div>`;
    $('[data-rd]', el).textContent = G.total ? `Tur ${Math.min(G.round + 1, G.total)} / ${G.total}` : '';
  };
  G.finish = () => {
    clearInterval(G.timer); stopAudio();
    const two = cfg.mode === 2, w = G.score[0] === G.score[1] ? -1 : G.score[0] > G.score[1] ? 0 : 1;
    G.card.innerHTML = `<div class="result"><span class="ar" lang="ar">أَحْسَنْتُمْ!</span><h2>${two ? (w < 0 ? 'Berabere!' : esc(S.teams[w]) + ' kazandı') : `${G.score[0]} / ${G.total} doğru`}</h2>
     ${two ? `<p class="hint">${esc(S.teams[0])}: ${G.score[0]} · ${esc(S.teams[1])}: ${G.score[1]}</p>` : ''}
     <div style="display:flex;gap:10px"><button class="btn dark" data-again>${ic('redo')} Yeniden oyna</button><button class="btn light" data-out>Oyunlara dön</button></div></div>`;
    confetti(G.card); tone(true);
    $('[data-again]', G.card).onclick = () => { end(); runGame(g, cfg); }; $('[data-out]', G.card).onclick = end;
  };
  G.timeBar = (sec, onEnd) => {
    clearInterval(G.timer); if (!sec) return '';
    let t = sec * 10; setTimeout(() => { const bar = $('[data-tb]', G.card); G.timer = setInterval(() => { t--; if (bar) bar.style.width = (t / (sec * 10) * 100) + '%'; if (t <= 0) { clearInterval(G.timer); onEnd(); } }, 100); }, 0);
    return `<div class="timer-bar"><i data-tb></i></div>`;
  };
  G.next = () => { G.round++; if (cfg.mode === 2) G.turn = 1 - G.turn; G.paintScore(); if (G.round >= G.total) G.finish(); else G.draw(); };
  GAME_IMPL[g.id](G);
  G.paintScore();
}
const optBtns = (opts, cls = '') => opts.map((o, k) => `<button class="card tap opt ${cls}" data-k="${k}"><span class="k">${'ABCD'[k]}</span>${AR_RX.test(o) ? A(o) : `<span style="flex:1">${esc(o)}</span>`}</button>`).join('');
function pickDistract(pool, item, n, key = 'ar') {
  const same = shuffle(pool.filter(x => x !== item && x.kind === item.kind && bare(x[key]) !== bare(item[key])));
  const out = []; for (const x of same) { if (out.length >= n) break; if (!out.some(o => bare(o[key]) === bare(x[key]))) out.push(x); }
  return out;
}
const GAME_IMPL = {
  dinle(G) {
    const pool = shuffle(AUDIO_ITEMS().filter(d => G.cfg.lessons.includes(d.lesson)));
    G.total = Math.min(G.cfg.rounds, pool.length);
    G.draw = () => {
      const it = pool[G.round], opts = shuffle([it, ...pickDistract(AUDIO_ITEMS(), it, 3)]);
      G.card.innerHTML = `${G.timeBar(G.cfg.time, () => answer(-1))}<div class="prompt"><button class="play big-play" data-pl>${ic('play')}</button><div style="text-align:left"><b style="font-size:26px">Dinleyin ve bulun</b><div class="hint">${G.cfg.mode === 2 ? 'Sıra: ' + esc(S.teams[G.turn]) : 'Kayıt tekrar dinlenebilir.'}</div></div></div>
       <div class="gopts">${optBtns(opts.map(o => o.ar))}</div><div data-why></div>`;
      const pl = $('[data-pl]', G.card); pl.onclick = () => play(it.au, pl); setTimeout(() => play(it.au, pl), 300);
      let done = false;
      const answer = k => { if (done) return; done = true; clearInterval(G.timer); const okk = k >= 0 && opts[k] === it;
        $$('.opt', G.card).forEach((b, i) => { if (opts[i] === it) b.classList.add('ok'); else if (i === k) b.classList.add('bad'); });
        tone(okk); if (okk) G.score[G.cfg.mode === 2 ? G.turn : 0]++; G.paintScore();
        $('[data-why]', G.card).innerHTML = `<div class="why ${okk ? 'ok' : ''}" style="text-align:center">${esc(it.tr)}</div>`;
        setTimeout(() => G.el.isConnected && G.next(), 1700); };
      $$('.opt', G.card).forEach(b => b.onclick = () => answer(+b.dataset.k));
    };
    G.draw();
  },
  karsilik(G) {
    const PAIRS = [
      ...GREETINGS.map(g => ({ q: g[0], qa: g[5], a: g[1], aa: g[6], tr: g[4] })),
      ...WHO.map(w => ({ q: w[0], qa: null, a: w[1], aa: w[3], tr: w[2] })),
      ...NAMEFORMS.map(n => ({ q: n[4], qa: null, a: n[5], aa: n[6], tr: n[3] })),
      ...COUNTRY.map(c => ({ q: 'مِنْ أَيْنَ ' + c[0] + '؟', qa: null, a: c[1] + ' مِنْ ' + c[2] + '.', aa: c[5], tr: c[4] })),
      { q: DIALOGUE[0][1], qa: 105, a: DIALOGUE[1][1], aa: 106, tr: DIALOGUE[1][2] },
      { q: DIALOGUE[6][1], qa: 111, a: DIALOGUE[7][1], aa: 112, tr: DIALOGUE[7][2] }
    ];
    const pool = shuffle(PAIRS); G.total = Math.min(G.cfg.rounds, pool.length);
    G.draw = () => {
      const it = pool[G.round];
      const wrong = shuffle(PAIRS.filter(p => p !== it && bare(p.a) !== bare(it.a))).slice(0, 2).map(p => p.a);
      const opts = shuffle([it.a, ...wrong]);
      G.card.innerHTML = `${G.timeBar(G.cfg.time, () => answer(-1))}<div class="prompt">${it.qa ? `<button class="play big-play" data-pl>${ic('play')}</button>` : ''}${A(it.q)}</div>
       <p class="hint" style="text-align:center;margin:0">${G.cfg.mode === 2 ? 'Sıra: <b>' + esc(S.teams[G.turn]) + '</b> · ' : ''}Uygun karşılığı seçin.</p>
       <div class="gopts" style="grid-template-columns:1fr">${optBtns(opts)}</div><div data-why></div>`;
      const pl = $('[data-pl]', G.card); if (pl) { pl.onclick = () => play(it.qa, pl); setTimeout(() => play(it.qa, pl), 300); }
      let done = false;
      const answer = k => { if (done) return; done = true; clearInterval(G.timer); const okk = k >= 0 && opts[k] === it.a;
        $$('.opt', G.card).forEach((b, i) => { if (opts[i] === it.a) b.classList.add('ok'); else if (i === k) b.classList.add('bad'); });
        tone(okk); if (okk) G.score[G.cfg.mode === 2 ? G.turn : 0]++; G.paintScore();
        const okBtn = $$('.opt', G.card).find((b, i) => opts[i] === it.a);
        $('[data-why]', G.card).innerHTML = `<div class="why ${okk ? 'ok' : ''}" style="text-align:center">${esc(it.tr)}</div>`;
        play(it.aa, okBtn).then(() => setTimeout(() => G.el.isConnected && G.next(), 700)); };
      $$('.opt', G.card).forEach(b => b.onclick = () => answer(+b.dataset.k));
    };
    G.draw();
  },
  ip(G) {
    const pool = shuffle(DICT.filter(d => G.cfg.lessons.includes(d.lesson) && d.tr && d.kind === 'kelime').concat(DICT.filter(d => G.cfg.lessons.includes(d.lesson) && d.tr && d.kind === 'ifade' && d.ar.length < 26)));
    G.total = Math.min(G.cfg.rounds, pool.length); let pos = 0; const WIN = 4;
    G.draw = () => {
      const it = pool[G.round], others = pickDistract(DICT, it, 2), base = [it, ...others];
      const oa = shuffle(base), ob = shuffle(base);
      G.card.innerHTML = `<div class="rope-wrap"><span class="goal" style="left:${50 - WIN * 9}%"></span><span class="goal" style="left:${50 + WIN * 9}%"></span><div class="mid"></div>
        <div class="rope" style="transform:translateX(${-pos * 9}%)"><span class="flag"></span></div><span class="side" style="left:18px;color:var(--c1)">◀ ${esc(S.teams[0])}</span><span class="side" style="right:18px;color:var(--c2)">${esc(S.teams[1])} ▶</span></div>
       <div class="prompt" style="min-height:70px">${it.au != null ? `<button class="play" data-pl>${ic('play')}</button>` : ''}<b style="font-size:34px">“${esc(it.tr)}”</b></div>
       <div class="duel">${[oa, ob].map((o, side) => `<div class="side-box ${side ? 'b' : 'a'}" data-side="${side}"><h3>${esc(S.teams[side])}</h3><div class="gopts">${o.map((x, k) => `<button class="card tap opt" data-k="${k}">${A(x.ar)}</button>`).join('')}</div></div>`).join('')}</div>`;
      const pl = $('[data-pl]', G.card); if (pl) pl.onclick = () => play(it.au, pl);
      let done = false;
      $$('.side-box', G.card).forEach(box => {
        const side = +box.dataset.side, opts = side ? ob : oa;
        $$('.opt', box).forEach(b => b.onclick = () => {
          if (done) return; const okk = opts[+b.dataset.k] === it;
          if (!okk) { b.classList.add('bad'); tone(false); box.classList.add('lock'); if ($$('.side-box.lock', G.card).length === 2) { done = true; setTimeout(() => G.el.isConnected && G.next(), 1200); } return; }
          done = true; b.classList.add('ok'); tone(true); G.score[side]++; pos += side ? -1 : 1;
          $('.rope', G.card).style.transform = `translateX(${-pos * 9}%)`; G.paintScore();
          if (it.au != null) play(it.au, b);
          if (Math.abs(pos) >= WIN) { setTimeout(() => { if (G.el.isConnected) { G.finish(); $('h2', G.card).textContent = S.teams[pos > 0 ? 0 : 1] + ' ipi çekti!'; } }, 1300); return; }
          setTimeout(() => G.el.isConnected && G.next(), 1500);
        });
      });
    };
    G.draw();
  },
  hafiza(G) {
    const pool = shuffle(DICT.filter(d => d.kind === 'kelime' && d.tr && !d.tr.includes('(isim)') && G.cfg.lessons.includes(d.lesson)));
    const uniq = []; for (const d of pool) { if (uniq.length >= 6) break; if (!uniq.some(u => bare(u.ar) === bare(d.ar) || u.tr === d.tr)) uniq.push(d); }
    G.total = 0; let open = [], found = 0;
    const cards = shuffle(uniq.flatMap((d, i) => [{ i, ar: true, d }, { i, ar: false, d }]));
    G.draw = () => {
      G.card.innerHTML = `<p class="hint" style="text-align:center;margin:0">${G.cfg.mode === 2 ? 'Sıra: <b data-turn>' + esc(S.teams[G.turn]) + '</b> · Eşleşme bulan takım bir daha oynar.' : 'İki kart açın: Arapça kelime ve Türkçe karşılığı.'}</p>
       <div class="memo">${cards.map((c, k) => `<div class="mc" data-k="${k}"><div class="f">ع</div><div class="b">${c.ar ? A(c.d.ar) : esc(c.d.tr)}</div></div>`).join('')}</div>`;
      $$('.mc', G.card).forEach(m => m.onclick = () => {
        if (m.classList.contains('open') || m.classList.contains('done') || open.length >= 2) return;
        const c = cards[+m.dataset.k]; m.classList.add('open'); open.push(m);
        if (c.ar && c.d.au != null) play(c.d.au, null);
        if (open.length === 2) {
          const [a, b] = open.map(x => cards[+x.dataset.k]);
          if (a.i === b.i && a.ar !== b.ar) { setTimeout(() => { open.forEach(x => x.classList.add('done')); open = []; found++; tone(true); G.score[G.cfg.mode === 2 ? G.turn : 0]++; G.paintScore(); if (found === uniq.length) { G.total = found; setTimeout(G.finish, 700); } }, 500); }
          else setTimeout(() => { open.forEach(x => x.classList.remove('open')); open = []; tone(false); if (G.cfg.mode === 2) { G.turn = 1 - G.turn; G.paintScore(); const t = $('[data-turn]', G.card); if (t) t.textContent = S.teams[G.turn]; } }, 1100);
        }
      });
    };
    G.draw();
  },
  gunes(G) {
    const order = shuffle(SOLARWORDS.map((_, i) => i)); G.total = Math.min(G.cfg.rounds, 28);
    G.draw = () => {
      const i = order[G.round], sun = SOLARLETTERS.includes(LETTERS[i]);
      G.card.innerHTML = `${G.timeBar(G.cfg.time, () => answer(null))}<div class="prompt"><button class="play big-play" data-pl>${ic('play')}</button>${A(SOLARWORDS[i])}</div>
       <p class="hint" style="text-align:center;margin:0">${G.cfg.mode === 2 ? 'Sıra: <b>' + esc(S.teams[G.turn]) + '</b> · ' : ''}${esc(SOLAR_TR[i])}</p>
       <div class="sort-btns" style="max-width:820px;margin:auto"><button class="btn sun" data-a="1" style="height:120px;font-size:30px">☀ Şemsî</button><button class="btn moon" data-a="0" style="height:120px;font-size:30px">☾ Kamerî</button></div><div data-why></div>`;
      const pl = $('[data-pl]', G.card); pl.onclick = () => play(164 + i, pl); setTimeout(() => play(164 + i, pl), 300);
      let done = false;
      const answer = a => { if (done) return; done = true; clearInterval(G.timer); const okk = a === sun; tone(okk); if (okk) G.score[G.cfg.mode === 2 ? G.turn : 0]++; G.paintScore();
        $('[data-why]', G.card).innerHTML = `<div class="why ${okk ? 'ok' : ''}" style="text-align:center"><span class="ar" lang="ar" style="font-size:28px">${LETTERS[i]}</span> ${sun ? 'şemsî harftir: lâm okunmaz.' : 'kamerî harftir: lâm okunur.'}</div>`;
        setTimeout(() => G.el.isConnected && G.next(), 1500); };
      $$('[data-a]', G.card).forEach(b => b.onclick = () => answer(b.dataset.a === '1'));
    };
    G.draw();
  },
  cumle(G) {
    const pool = shuffle(SENTENCES); G.total = Math.min(G.cfg.rounds, pool.length);
    G.draw = () => {
      const [words, tr, au] = pool[G.round]; let got = []; const order = shuffle(words.map((_, k) => k));
      if (order.every((k, j) => k === j) && order.length > 1) order.reverse();
      G.card.innerHTML = `<p class="qtext" style="text-align:center;margin:0">“${esc(tr)}”</p><p class="hint" style="text-align:center;margin:0">${G.cfg.mode === 2 ? 'Sıra: <b>' + esc(S.teams[G.turn]) + '</b>' : 'Kelimeleri sırayla seçin.'}</p>
       <div class="slots" data-slots></div><div class="chips">${order.map(k => `<button class="wchip" data-k="${k}">${words[k]}</button>`).join('')}</div>
       <div style="display:flex;gap:12px;justify-content:center"><button class="btn light" data-clr>${ic('undo')} Temizle</button><button class="btn dark" data-chk>${ic('check')} Kontrol et</button></div><div data-why></div>`;
      const slots = $('[data-slots]', G.card);
      const paint = () => { slots.innerHTML = got.map((k, j) => `<button class="wchip" data-j="${j}">${words[k]}</button>`).join(''); $$('[data-k]', G.card).forEach(b => b.classList.toggle('used', got.includes(+b.dataset.k))); $$('[data-j]', slots).forEach(b => b.onclick = () => { got.splice(+b.dataset.j, 1); paint(); }); };
      $$('[data-k]', G.card).forEach(b => b.onclick = () => { got.push(+b.dataset.k); paint(); });
      $('[data-clr]', G.card).onclick = () => { got = []; paint(); };
      let done = false;
      $('[data-chk]', G.card).onclick = () => { if (done) return; done = true;
        const okk = got.length === words.length && got.every((k, j) => words[k] === words[j]);
        slots.className = 'slots ' + (okk ? 'ok' : 'bad'); tone(okk); if (okk) G.score[G.cfg.mode === 2 ? G.turn : 0]++; G.paintScore();
        $('[data-why]', G.card).innerHTML = `<div class="why ${okk ? 'ok' : ''}" style="text-align:center">${okk ? 'Doğru!' : 'Doğrusu:'} ${A(words.join(' '))}</div>`;
        $$('.why .ar', G.card).forEach(x => x.style.fontSize = '34px');
        (au ? play(au, slots) : sleep(600)).then(() => setTimeout(() => G.el.isConnected && G.next(), 900)); };
    };
    G.draw();
  }
};

/* ——— sesli sözlük ——— */
function renderDict() {
  const st = { q: '', f: 'all', l: null };
  const first = d => bare(d.ar).replace(/^ال/, '').replace(/^[^ء-ي]+/, '')[0] || '';
  const letterSet = new Set(DICT.map(first));
  view.innerHTML = `<div class="page"><div class="page-head"><div><h1>Sesli sözlük</h1><p>${DICT.length} madde · ${DICT.filter(d => d.au != null).length} tanesi özgün kayıtla. Arapça (harekesiz de olur) ya da Türkçe arayın.</p></div></div>
   <div class="dict-tools"><input class="field" type="search" placeholder="Ara: مدرسة, okul, selam…" data-q aria-label="Sözlükte ara">
    <div class="filter">${[['all', 'Hepsi'], ['kelime', 'Kelimeler'], ['ifade', 'İfadeler'], ...LESSONS.filter(l => DICT.some(d => d.lesson === l.id)).map(l => [l.id, l.no + '. ' + l.tr])].map(([k, t]) => `<button data-f="${k}" class="${k === 'all' ? 'sel' : ''}">${t}</button>`).join('')}</div>
    <button class="btn ghost" data-seq style="height:40px;font-size:14px">${ic('play')} Görünenleri sırayla dinle</button></div>
   <div class="alpha">${LETTERS.map(l => `<button data-a="${l}" ${letterSet.has(l) ? '' : 'disabled'}>${l}</button>`).join('')}</div>
   <div class="dict" data-list></div></div>`;
  const list = $('[data-list]', view);
  const draw = () => {
    const q = st.q.trim(), qa = bare(q), qt = trLow(q);
    const items = DICT.filter(d => (st.f === 'all' || d.kind === st.f || d.lesson === st.f) && (!st.l || first(d) === st.l) &&
      (!q || (AR_RX.test(q) ? bare(d.ar).includes(qa) : trLow(d.tr).includes(qt))));
    list.innerHTML = items.length ? items.map(d => `<div class="dcard"${d.au != null ? ` data-au="${d.au}" role="button" tabindex="0"` : ''}><span class="play sm ${d.au != null ? '' : 'off'}" title="${d.au != null ? 'Dinle' : 'Kaydı yok'}">${ic('play')}</span>
      <div>${A(d.ar)}<div class="tr">${esc(d.tr)}</div><div class="tag">${LESSONS.find(l => l.id === d.lesson).no}. ders · kitap s. ${d.page}</div></div></div>`).join('') : `<div class="empty">Sonuç yok.</div>`;
  };
  bindAudio(list);
  $('[data-q]', view).oninput = e => { st.q = e.target.value; draw(); };
  $$('[data-f]', view).forEach(b => b.onclick = () => { st.f = b.dataset.f; $$('[data-f]', view).forEach(x => x.classList.toggle('sel', x === b)); draw(); });
  $$('[data-a]', view).forEach(b => b.onclick = () => { st.l = st.l === b.dataset.a ? null : b.dataset.a; $$('[data-a]', view).forEach(x => x.classList.toggle('sel', x.dataset.a === st.l)); draw(); });
  $('[data-seq]', view).onclick = () => playSeq($$('[data-au]', list).slice(0, 40).map(x => [+x.dataset.au, x]), list, 500);
  draw();
}

/* ——— sınıf araçları sayfası ——— */
function renderTools() {
  view.innerHTML = `<div class="page"><div class="page-head"><div><h1>Sınıf araçları</h1><p>Akıllı tahtada ders boyunca açık kalabilir. Liste ve puanlar yalnız bu cihazda saklanır.</p></div></div>
   <div class="tool-grid">
    <div class="panel"><h3>${ic('users')} Sınıf listesi</h3><textarea data-k placeholder="Her satıra bir öğrenci adı yazın">${esc(S.klass)}</textarea><div class="hint" data-kn style="font-size:14px"></div></div>
    <div class="panel"><h3>${ic('dice')} Öğrenci seç</h3><div data-pick style="display:grid;gap:14px;flex:1"></div></div>
    <div class="panel"><h3>${ic('timer')} Süre</h3><div data-timer style="display:grid;gap:14px"></div></div>
    <div class="panel"><h3>${ic('mic')} Sessiz sınıf</h3><div data-quiet style="display:grid;gap:14px"></div></div>
    <div class="panel"><h3>${ic('star')} Puan tablosu</h3><div data-board style="display:grid;gap:14px"></div></div>
    <div class="panel"><h3>${ic('grid')} Gruplara ayır</h3><div data-groups style="display:grid;gap:14px"></div></div>
   </div></div>`;
  const ta = $('[data-k]', view), kn = $('[data-kn]', view);
  const cnt = () => { kn.textContent = classList().length ? `${classList().length} öğrenci` : 'Liste boş.'; };
  ta.oninput = () => { S.klass = ta.value; store.set('klass', S.klass); cnt(); }; cnt();
  mountPicker($('[data-pick]', view)); timers.forEach(f => f()); timers = []; mountTimer($('[data-timer]', view)); mountQuiet($('[data-quiet]', view)); mountBoard($('[data-board]', view)); mountGroups($('[data-groups]', view));
}

/* ——— sınav hazırlama ——— */
const lessonOfPage = p => (LESSONS.find(l => p >= l.pages[0] && p <= l.pages[1]) || LESSONS[LESSONS.length - 1]).id;
let POOL = null;
function buildPool() {
  if (POOL) return POOL;
  const out = [];
  const C = window.CONTENT || { practice: {}, quiz: [] };
  Object.values(C.practice).forEach(pg => pg.questions.forEach(q => {
    if (q.type === 'choice' && !(q.answer >= 0 && q.answer < q.options.length)) return;
    out.push({ ...q, page: pg.page, lesson: lessonOfPage(pg.page), src: 'Kitap alıştırması' });
  }));
  (C.quiz || []).forEach(q => { if (q.type !== 'choice' || (q.answer >= 0 && q.answer < q.options.length)) out.push({ ...q, lesson: lessonOfPage(q.page || 70), src: 'Ünite testi' }); });
  [['GREETQUIZ', 18], ['READQUIZ', 46], ['DEMOQUIZ', 63], ['FINALQUIZ', 70]].forEach(([k, p]) => QUIZ_SETS[k].forEach((q, i) => out.push({
    id: k + '-' + i, type: q.audio != null ? 'listen' : 'choice', prompt: q.q, stem: '', options: q.options, answer: q.answer, explanation: q.why, audio: q.audio, page: p, lesson: lessonOfPage(p), src: 'Ders seti'
  })));
  /* dinleme: kaydı dinle, duyduğunu işaretle */
  const rnd = seeded('dinleme-9-1');
  shuffle(AUDIO_ITEMS().filter(d => d.kind === 'ifade' || d.ar.length > 4), rnd).slice(0, 36).forEach((d, i) => {
    const dis = shuffle(AUDIO_ITEMS().filter(x => x !== d && x.kind === d.kind && bare(x.ar) !== bare(d.ar)), rnd).slice(0, 3);
    const opts = shuffle([d, ...dis], rnd);
    out.push({ id: 'dn-' + i, type: 'listen', prompt: 'Dinlediğin ifadeyi işaretle.', stem: '', options: opts.map(o => o.ar), answer: opts.indexOf(d), explanation: d.tr, audio: d.au, page: d.page, lesson: d.lesson, src: 'Dinleme' });
  });
  out.forEach((q, i) => { q.uid = q.id || 'q' + i; });
  POOL = out; return out;
}
const TYPE_TR = { choice: 'Çoktan seçmeli', fill: 'Boşluk / kısa cevap', match: 'Eşleştirme', order: 'Sıralama', write: 'Yazma', listen: 'Dinleme' };
function renderExam() {
  const pool = buildPool();
  const E = store.get('exam', { sel: [], title: '1. Ünite Değerlendirme', school: '………………… Anadolu İmam Hatip Lisesi', kind: 'sinav', group: 'A', key: false, tf: 'all', lf: 'all' });
  const save = () => store.set('exam', E);
  view.innerHTML = `<div class="page"><div class="page-head"><div><h1>Sınav ve çalışma kâğıdı</h1><p>${pool.length} soruluk havuz: kitap alıştırmaları, ünite testi, ders seti soruları ve dinleme soruları. Seçin, A/B grubu alın, yazdırın.</p></div></div>
   <div class="exam">
    <aside class="exam-side">
     <h3>Hazır şablonlar</h3>
     <div class="small-row seg"><button data-tpl="yazili">1. yazılı · 12 soru</button><button data-tpl="kisa">Kısa sınav · 6</button><button data-tpl="dinleme">Dinleme · 10</button><button data-tpl="calisma">Çalışma kâğıdı</button></div>
     <h3>Soru havuzu <span class="hint" style="font-size:13px" data-cnt></span></h3>
     <div class="small-row seg">${[['all', 'Hepsi'], ...Object.entries(TYPE_TR)].map(([k, t]) => `<button data-tf="${k}" class="${E.tf === k ? 'sel' : ''}">${t}</button>`).join('')}</div>
     <div class="small-row seg">${[['all', 'Bütün dersler'], ...LESSONS.map(l => [l.id, l.no + '. ders'])].map(([k, t]) => `<button data-lf="${k}" class="${E.lf === k ? 'sel' : ''}">${t}</button>`).join('')}</div>
     <div class="pool" data-pool></div>
     <div class="small-row"><button class="btn light" data-clear style="height:40px;font-size:14px">${ic('trash')} Seçimi temizle</button></div>
    </aside>
    <div class="exam-main">
     <div class="exam-actions no-print">
      <div class="seg"><button data-k="sinav" class="${E.kind === 'sinav' ? 'sel' : ''}">Sınav</button><button data-k="calisma" class="${E.kind === 'calisma' ? 'sel' : ''}">Çalışma kâğıdı</button></div>
      <div class="seg"><button data-g="A" class="${E.group === 'A' ? 'sel' : ''}">A grubu</button><button data-g="B" class="${E.group === 'B' ? 'sel' : ''}">B grubu</button></div>
      <div class="seg"><button data-key aria-pressed="${E.key}">${ic('check')} Cevap anahtarı</button></div>
      <button class="btn primary" data-print>${ic('print')} Yazdır / PDF</button>
      <button class="btn ghost" data-listen>${ic('play')} Dinleme kayıtları</button>
     </div>
     <div class="exam-actions no-print"><input class="field" data-school value="${esc(E.school)}" style="max-width:420px;background:var(--paper)" aria-label="Okul adı"><input class="field" data-title value="${esc(E.title)}" style="max-width:340px;background:var(--paper)" aria-label="Sınav adı"></div>
     <div data-paper></div>
    </div>
   </div></div>`;
  const poolEl = $('[data-pool]', view), paperEl = $('[data-paper]', view);
  const drawPool = () => {
    const items = pool.filter(q => (E.tf === 'all' || q.type === E.tf) && (E.lf === 'all' || q.lesson === E.lf));
    $('[data-cnt]', view).textContent = `· ${E.sel.length} seçili`;
    poolEl.innerHTML = items.map(q => `<label class="pq${E.sel.includes(q.uid) ? ' on' : ''}"><input type="checkbox" data-u="${q.uid}" ${E.sel.includes(q.uid) ? 'checked' : ''}>
      <div><div>${mix(q.prompt || '')}${q.stem ? ` <span class="ar" lang="ar">${esc(q.stem)}</span>` : ''}</div>
      <div class="m"><span class="${q.type === 'listen' ? 'au' : ''}">${TYPE_TR[q.type]}</span><span>${LESSONS.find(l => l.id === q.lesson).no}. ders</span><span>s. ${q.page}</span><span>${q.src}</span></div></div></label>`).join('') || `<div class="hint">Bu süzgeçte soru yok.</div>`;
    $$('[data-u]', poolEl).forEach(c => c.onchange = () => { const u = c.dataset.u; E.sel = c.checked ? [...E.sel, u] : E.sel.filter(x => x !== u); c.closest('.pq').classList.toggle('on', c.checked); save(); $('[data-cnt]', view).textContent = `· ${E.sel.length} seçili`; drawPaper(); });
  };
  const drawPaper = () => {
    const qs = E.sel.map(u => pool.find(q => q.uid === u)).filter(Boolean);
    paperEl.innerHTML = qs.length ? renderPaper(qs, E) : `<div class="panel" style="min-height:200px;display:grid;place-items:center;text-align:center"><div><h3 style="justify-content:center">Henüz soru seçilmedi</h3><p class="hint">Soldaki havuzdan soru seçin ya da hazır bir şablona dokunun.</p></div></div>`;
  };
  $$('[data-tf]', view).forEach(b => b.onclick = () => { E.tf = b.dataset.tf; $$('[data-tf]', view).forEach(x => x.classList.toggle('sel', x === b)); save(); drawPool(); });
  $$('[data-lf]', view).forEach(b => b.onclick = () => { E.lf = b.dataset.lf; $$('[data-lf]', view).forEach(x => x.classList.toggle('sel', x === b)); save(); drawPool(); });
  $$('[data-k]', view).forEach(b => b.onclick = () => { E.kind = b.dataset.k; $$('[data-k]', view).forEach(x => x.classList.toggle('sel', x === b)); save(); drawPaper(); });
  $$('[data-g]', view).forEach(b => b.onclick = () => { E.group = b.dataset.g; $$('[data-g]', view).forEach(x => x.classList.toggle('sel', x === b)); save(); drawPaper(); });
  $('[data-key]', view).onclick = e => { E.key = !E.key; e.currentTarget.setAttribute('aria-pressed', E.key); save(); drawPaper(); };
  $('[data-school]', view).oninput = e => { E.school = e.target.value; save(); drawPaper(); };
  $('[data-title]', view).oninput = e => { E.title = e.target.value; save(); drawPaper(); };
  $('[data-clear]', view).onclick = () => { E.sel = []; save(); drawPool(); drawPaper(); };
  $('[data-print]', view).onclick = () => { if (!E.sel.length) return; window.print(); };
  $('[data-listen]', view).onclick = () => {
    const qs = examOrder(E.sel.map(u => pool.find(q => q.uid === u)).filter(Boolean), E).filter(x => x.q.type === 'listen');
    const body = document.createElement('div');
    body.innerHTML = qs.length ? `<p class="hint" style="margin:0 0 12px;color:var(--pink-3)">Sınav sırasında tahtadan çalın (${E.group} grubu sırası).</p><div class="lsn-list">${qs.map(x => `<button data-au="${x.q.audio}">${playBtn('sm')} ${x.n}. soru · Dinleme</button>`).join('')}</div>` : `<p>Seçili sınavda dinleme sorusu yok.</p>`;
    bindAudio(body); modal('Dinleme kayıtları', body, { w: 'min(520px,92vw)', onClose: stopAudio });
  };
  $$('[data-tpl]', view).forEach(b => b.onclick = () => {
    const rnd = seeded(b.dataset.tpl + Date.now());
    const by = (type, n, lessons) => shuffle(pool.filter(q => q.type === type && (!lessons || lessons.includes(q.lesson))), rnd).slice(0, n);
    let sel = [];
    if (b.dataset.tpl === 'yazili') { sel = [...by('choice', 5), ...by('listen', 2), ...by('match', 2), ...by('fill', 2), ...by('order', 1)]; E.kind = 'sinav'; E.title = '1. Ünite · 1. Yazılı'; }
    if (b.dataset.tpl === 'kisa') { sel = [...by('choice', 4), ...by('listen', 1), ...by('match', 1)]; E.kind = 'sinav'; E.title = '1. Ünite · Kısa Sınav'; }
    if (b.dataset.tpl === 'dinleme') { sel = by('listen', 10); E.kind = 'sinav'; E.title = '1. Ünite · Dinleme Sınavı'; }
    if (b.dataset.tpl === 'calisma') { const L = E.lf === 'all' ? null : [E.lf]; sel = [...by('fill', 3, L), ...by('match', 2, L), ...by('order', 2, L), ...by('choice', 3, L), ...by('write', 1, L)]; E.kind = 'calisma'; E.title = 'Çalışma Kâğıdı' + (L ? ' · ' + LESSONS.find(l => l.id === L[0]).tr : ''); }
    E.sel = sel.map(q => q.uid); save(); renderExam();
  });
  drawPool(); drawPaper();
}
function examOrder(qs, E) {
  const list = E.group === 'B' ? shuffle(qs, seeded('B' + qs.map(q => q.uid).join())) : qs.slice();
  return list.map((q, i) => {
    let opts = q.options ? q.options.map((o, k) => ({ o, k })) : null;
    if (opts && E.group === 'B') opts = shuffle(opts, seeded('Bo' + q.uid));
    return { q, n: i + 1, opts, ans: opts ? opts.findIndex(x => x.k === q.answer) : -1 };
  });
}
function renderPaper(qs, E) {
  const items = examOrder(qs, E), exam = E.kind === 'sinav';
  const pts = items.map((_, i) => Math.floor(100 / items.length) + (i < 100 % items.length ? 1 : 0));
  const L = 'ABCDEFGH';
  const qHtml = (x, i) => {
    const q = x.q, p = exam ? `<span class="pt">${pts[i]} puan</span>` : '';
    const prompt = `${q.type === 'listen' ? `<span class="listen">♪ Dinleme</span>` : ''}${mix(q.prompt || TYPE_TR[q.type])}`;
    let body = '';
    if (q.type === 'choice' || q.type === 'listen') body = `${q.stem ? `<div class="ar" style="text-align:right">${esc(q.stem)}</div>` : ''}<div class="ch" style="direction:${x.opts.some(o => AR_RX.test(o.o)) ? 'rtl' : 'ltr'}">${x.opts.map((o, k) => `<div><b>${L[k]})</b> ${AR_RX.test(o.o) ? `<span class="ar">${esc(o.o)}</span>` : esc(o.o)}</div>`).join('')}</div>`;
    else if (q.type === 'fill') body = `<div class="ar" style="text-align:right">${esc(q.stem)}</div><div class="wl"></div>`;
    else if (q.type === 'order') { const sh = shuffle(q.words, seeded('o' + q.uid + E.group)); body = `<div class="chips-p">${sh.map(w => `<span class="ar">${esc(w)}</span>`).join('')}</div><div class="wl"></div>`; }
    else if (q.type === 'match') { const right = shuffle(q.pairs.map((p, k) => ({ t: p[1], k })), seeded('m' + q.uid + E.group)); body = `<div class="mt">${q.pairs.map((p, k) => `<div><span>${k + 1}. ( &nbsp; )</span><span class="ar">${esc(p[0])}</span></div><div><span>${L[k] || k + 1})</span><span class="${AR_RX.test(right[k].t) ? 'ar' : ''}">${esc(right[k].t)}</span></div>`).join('')}</div>`; }
    else if (q.type === 'write') body = `<div class="wl"></div><div class="wl"></div>`;
    return `<li><div class="qh"><span>${prompt}</span>${p}</div>${body}</li>`;
  };
  const keyOf = x => {
    const q = x.q;
    if (q.type === 'choice' || q.type === 'listen') return `${L[x.ans]}) <span class="ar" style="font-size:13pt">${esc(x.opts[x.ans].o)}</span>`;
    if (q.type === 'fill') return `<span class="ar" style="font-size:13pt">${esc(q.answer)}</span>`;
    if (q.type === 'order') return `<span class="ar" style="font-size:13pt">${esc(q.words.join(' '))}</span>`;
    if (q.type === 'match') { const right = shuffle(q.pairs.map((p, k) => ({ t: p[1], k })), seeded('m' + q.uid + E.group)); return q.pairs.map((p, k) => `${k + 1}-${L[right.findIndex(r => r.k === k)]}`).join(', '); }
    if (q.type === 'write') return 'Örnek: ' + esc(q.example || '');
    return '';
  };
  const header = `<div class="ph"><div class="t1">2026–2027 Eğitim-Öğretim Yılı · ${esc(E.school)}<small>9. Sınıf Arapça · ${esc(E.title)}${exam ? ` · <b>${E.group} grubu</b>` : ''}</small></div>
    <div class="flds"><div>Adı Soyadı:</div><div>Sınıfı:</div><div>Numarası:</div><div>${exam ? 'Puan:' : 'Tarih:'}</div></div></div>`;
  const note = exam ? `<p class="note">Süre 40 dakikadır. Her sorunun puanı yanında yazılıdır. “Dinleme” sorularında kayıt öğretmen tarafından iki kez dinletilir.</p>` : `<p class="note">Soruları kitabındaki ilgili sayfalara bakarak çözebilirsin.</p>`;
  const paper = `<div class="paper">${header}${note}<ol>${items.map(qHtml).join('')}</ol><div class="foot"><span>Arapça 9 · 1. Ünite: Haydi Tanışalım</span><span>Başarılar dileriz.</span></div></div>`;
  const keyP = E.key ? `<div class="paper key-page"><div class="ph"><div class="t1">Cevap Anahtarı · ${esc(E.title)}${exam ? ` · ${E.group} grubu` : ''}</div></div><ol>${items.map(x => `<li><div class="qh"><span class="key">${keyOf(x)}</span><span class="pt">${TYPE_TR[x.q.type]} · kitap s. ${x.q.page}</span></div>${x.q.explanation ? `<div style="font-size:9.5pt;color:#555">${mix(x.q.explanation)}</div>` : ''}</li>`).join('')}</ol></div>` : '';
  return paper + keyP;
}

/* ——— genel olaylar ——— */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]'); if (t) { e.preventDefault(); go(HASH[t.dataset.go]); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'goto') gotoPad();
  else if (a.dataset.act === 'full') toggleFull();
  else if (a.dataset.act === 'help') helpBox();
});
function toggleFull() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); }
document.addEventListener('fullscreenchange', () => setTimeout(() => S.view === 'player' && fitStage(), 120));
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select') || $('.modal') || $('.game')) return;
  const k = e.key.toLowerCase();
  if (k === 'f') toggleFull();
  else if (k === 'g') gotoPad();
  else if (k === '?') helpBox();
  else if (S.view === 'player') {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (k === 't') $('[data-d="tr"]').click();
    else if (k === 'k') $('[data-d="pen"]').click();
    else if (k === 'p') $('[data-d="shade"]').click();
    else if (k === 'o') $('[data-d="spot"]').click();
    else if (e.key === 'Escape') closeTools();
  }
});
addEventListener('hashchange', () => { if (!/^#ders\//.test(location.hash) || S.view !== 'player') { PW = null; } route(); });
route();
})();
