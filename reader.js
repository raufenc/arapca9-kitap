/* Arapça 9 · Etkileşimli kitap okuyucu
   Sayfa çevirme: StPageFlip (MIT). Kitap sağdan sola okunur; kütüphaneye sayfalar ters sırada verilir. */
(() => {
'use strict';

const B = window.BOOK, C = window.CONTENT || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const icon = (id, cls = '') => `<svg class="${cls}"><use href="#${id}"/></svg>`;
const hasAr = s => /[؀-ۿ]/.test(s);

const FIRST = B.firstPage, LAST = B.lastPage, N = B.pages.length;
const CHAPTERS = B.chapters || C.chapters || [{page: FIRST, title: B.unitTitle, group: 'KİTAP'}];
const pl = n => n === 0 ? 'Kapak' : String(n); // sayfa adı
const RATIO = 1600 / 2257, INK_H = Math.round(1000 / RATIO);
const idxOf = num => LAST - num, numOf = idx => LAST - idx;
const pageByNum = new Map(B.pages.map(p => [p.number, p]));
const mediaById = new Map(B.media.map(m => [m.id, m]));
const actById = new Map(B.activities.map(a => [a.id, a]));
const actByRes = new Map(B.activities.filter(a => a.resourceId).map(a => [a.resourceId, a]));
const resById = new Map(B.resources.map(r => [r.id, r]));
const resByPage = new Map();
B.resources.forEach(r => { if (!resByPage.has(r.page)) resByPage.set(r.page, []); resByPage.get(r.page).push(r); });

const KIND = {
 audio: {name: 'Dinleme', icon: 'i-audio'}, video: {name: 'Video', icon: 'i-video'},
 practice: {name: 'Etkinlik', icon: 'i-practice'}, game: {name: 'Oyun', icon: 'i-game'},
 assessment: {name: 'Değerlendirme', icon: 'i-assessment'}, external: {name: 'Bağlantı', icon: 'i-external'},
 document: {name: 'Belge', icon: 'i-doc'}, quiz: {name: 'Alıştırma', icon: 'i-spark'}, song: {name: 'Şarkı', icon: 'i-music'}
};
const kindOf = r => KIND[r.kind] ? r.kind : 'external';
const activityOf = r => actByRes.get(r.id) || (r.activity && actById.get(r.activity)) || null;
const cleanLabel = s => String(s || '').replace(/\s*\n\s*/g, ' ').trim();

/* ——— kalıcı kayıt ——— */
const store = {
 get(k, d) { try { const v = localStorage.getItem('a9r.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
 set(k, v) { try { localStorage.setItem('a9r.' + k, JSON.stringify(v)); } catch {} }
};

const S = {
 pf: null, single: false, view: store.get('view', 'auto'), size: null,
 hot: store.get('hot', true), sound: store.get('sound', true), theme: store.get('theme', 'gece'),
 marks: new Set(store.get('marks', [])), notes: store.get('notes', []), seen: new Set(store.get('seen', [])),
 ink: store.get('ink', {}), acts: store.get('acts', {}), practice: store.get('practice', {}),
 visible: [FIRST], auto: null, tab: 'toc', mediaFilter: 'all'
};
const app = $('#app'), stage = $('#stage'), host = $('#bookHost'), wrap = $('#bookWrap');

/* ——— sayfa öğeleri ——— */
function hotspotHTML(num) {
 return (resByPage.get(num) || []).map(r => {
  const k = kindOf(r), [x, y, w, h] = r.rect, act = activityOf(r);
  const done = act && S.acts[act.id]?.complete;
  return `<button class="hs k-${k}" data-res="${r.id}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${esc(r.title)}">${icon(KIND[k].icon)}${k === 'audio' ? '<span class="hs-eq"><b></b><b></b><b></b></span>' : ''}${done ? `<span class="hs-done">${icon('i-check')}</span>` : ''}</button>`;
 }).join('');
}
// numaralı etkinliklerin sınırları: dokununca etkinlik ekranı kaplar
const regionHTML = p => (p.regions || []).map((r, i) => {
 const [x, y, w, h] = r.rect;
 return `<div class="ex" data-ex="${i}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"><span class="ex-tag">${icon('i-focus')}${r.n ? `<b>${r.n}</b>` : ''}</span></div>`;
}).join('');
function pageEl(p, i, full) {
 const el = document.createElement('div');
 el.className = 'pg ' + (i % 2 ? 'is-right' : 'is-left') + (S.marks.has(p.number) ? ' marked' : '');
 el.dataset.num = p.number; el.dataset.density = 'soft';
 el.innerHTML = `<div class="pg-ph" style="background-image:url('${p.thumb}')"></div><img class="pg-img${full ? ' on' : ''}" alt="Sayfa ${p.number}" draggable="false"${full ? ` src="${p.image}"` : ''}><svg class="pg-ink" viewBox="0 0 1000 ${INK_H}" preserveAspectRatio="none">${inkSVG(p.number)}</svg><div class="pg-ex">${regionHTML(p)}</div><div class="pg-hot">${hotspotHTML(p.number)}</div><div class="pg-gutter"></div><span class="pg-ribbon"></span>`;
 return el;
}
const loaded = new Set();
function hydrate(centerIdx) {
 for (let d = -4; d <= 5; d++) {
  const idx = centerIdx + d; if (idx < 0 || idx >= N) continue;
  const num = numOf(idx); if (loaded.has(num)) continue; loaded.add(num);
  const p = pageByNum.get(num), im = new Image();
  im.decoding = 'async'; im.src = p.image;
  im.onload = () => $$(`.pg[data-num="${num}"] .pg-img`).forEach(img => { img.src = p.image; img.classList.add('on'); });
 }
}
function refreshPageImages() { // kütüphane yeniden kurulunca yüklü görselleri hemen göster
 loaded.forEach(num => $$(`.pg[data-num="${num}"] .pg-img:not(.on)`).forEach(img => { img.src = pageByNum.get(num).image; img.onload = () => img.classList.add('on'); }));
}

/* ——— yerleşim ve kitap ——— */
function measure() {
 const r = stage.getBoundingClientRect(), small = innerWidth < 760, fs = app.classList.contains('fs');
 // tam ekranda çubuklar kitabın üstünde yüzer: kitap bütün ekranı kullanır
 const padX = fs ? 6 : small ? 10 : 100, padTop = fs ? 6 : small ? 46 : 54, padBot = fs ? 6 : small ? 10 : 22;
 const aw = r.width - padX * 2, ah = r.height - padTop - padBot;
 const single = S.view === 'single' || (S.view === 'auto' && aw / ah < RATIO * 1.32);
 let ph = ah, pw = ph * RATIO; const cols = single ? 1 : 2;
 if (pw * cols > aw) { pw = aw / cols; ph = pw / RATIO; }
 return {pw: Math.floor(pw), ph: Math.floor(ph), single, top: (padTop - padBot) / 2};
}
function build(startIdx) {
 const m = measure();
 if (!(m.pw > 60 && m.ph > 80)) { setTimeout(() => build(startIdx), 250); return; } // sekme henüz görünmüyor
 if (S.pf && S.size && S.size.pw === m.pw && S.size.ph === m.ph && S.size.single === m.single) return;
 if (startIdx == null) startIdx = S.pf ? S.pf.getCurrentPageIndex() : idxOf(FIRST);
 if (S.pf) { try { S.pf.destroy(); } catch {} S.pf = null; }
 S.size = m; S.single = m.single;
 app.classList.toggle('single', m.single);
 host.innerHTML = '';
 // kütüphane bloğa width:100% verir; tek/çift kararını kabın genişliği belirler
 host.style.width = (m.single ? m.pw : m.pw * 2) + 'px'; host.style.height = m.ph + 'px';
 const block = document.createElement('div');
 host.appendChild(block);
 wrap.style.marginTop = m.top + 'px';
 const pages = B.pages.slice().reverse().map((p, i) => pageEl(p, i));
 const pf = new St.PageFlip(block, {
  width: m.pw, height: m.ph, size: 'fixed', autoSize: true, usePortrait: true, showCover: false,
  startPage: startIdx, flippingTime: 780, maxShadowOpacity: .55, drawShadow: true,
  mobileScrollSupport: false, swipeDistance: 24, disableFlipByClick: true, showPageCorners: true, clickEventForward: true
 });
 pf.on('init', () => { refreshPageImages(); afterTurn(); });
 pf.on('flip', () => afterTurn());
 pf.on('changeState', e => {
  const busy = e.data === 'flipping' || e.data === 'user_fold';
  stage.classList.toggle('flipping', busy);
  if (e.data === 'flipping') flipSound();
 });
 S.pf = pf;
 pf.loadFromHTML(pages);
 hydrate(startIdx);
 updateEdges();
}
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => build(), 160); });
const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)');
function applyFs() {
 const fs = !!document.fullscreenElement || standalone.matches;
 app.classList.toggle('fs', fs);
 $('#fsBtn use').setAttribute('href', document.fullscreenElement ? '#i-shrink' : '#i-expand');
}
document.addEventListener('fullscreenchange', () => { applyFs(); setTimeout(() => build(), 120); });
standalone.addEventListener?.('change', () => { applyFs(); build(); });
applyFs();

function visibleIdx() {
 const i = S.pf.getCurrentPageIndex();
 if (S.single) return [i];
 const s = i - (i % 2); return [s, s + 1].filter(x => x < N);
}
function afterTurn() {
 if (!S.pf) return;
 const idx = visibleIdx();
 S.visible = idx.map(numOf).sort((a, b) => a - b);
 hydrate(idx[0]);
 const lo = S.visible[0], hi = S.visible[S.visible.length - 1];
 const label = lo === hi ? pl(lo) : `${pl(lo)}–${hi}`;
 if (document.activeElement !== $('#pageInput')) $('#pageInput').value = label;
 const range = $('#scrubRange'); range.value = lo; paintRange(range);
 $$('[data-act="forward"]').forEach(b => b.disabled = hi >= LAST);
 $$('[data-act="back"]').forEach(b => b.disabled = lo <= FIRST);
 S.visible.forEach(n => S.seen.add(n)); store.set('seen', [...S.seen]);
 store.set('last', lo);
 history.replaceState(null, '', '#p=' + lo);
 const ch = chapterAt(lo);
 $('#chapGroup').textContent = ch.groupLabel; $('#chapTitle').textContent = ch.title;
 document.title = `${ch.title} · Sayfa ${label} · Arapça 9`;
 $('#bookmarkBtn').setAttribute('aria-pressed', S.marks.has(lo));
 renderPageActions(); updateEdges(); warmVisible();
 if (S.tab && $('#panel').classList.contains('open') && (S.tab === 'toc' || S.tab === 'pages' || S.tab === 'notes')) renderPanel();
 if (S.auto && hi >= LAST) toggleAuto(false);
}
function updateEdges() {
 if (!S.size) return;
 const f = (S.visible[0] - FIRST) / (N - 2), max = Math.max(4, S.size.pw * .018);
 $('#edgeRight').style.width = Math.round(f * max) + 'px';
 $('#edgeLeft').style.width = Math.round((1 - f) * max) + 'px';
}
function chapterAt(num) {
 const list = CHAPTERS;
 let cur = list[0], group = list[0].group || '';
 for (const c of list) { if (c.page > num) break; cur = c; if (c.group) group = c.group; }
 return {...cur, groupLabel: group.split(' · ')[0]};
}

/* ——— gezinme ——— */
const go = {
 forward() { if (S.pf && S.visible.at(-1) < LAST) S.pf.flipPrev('bottom'); },
 back() { if (S.pf && S.visible[0] > FIRST) S.pf.flipNext('bottom'); },
 to(num) {
  num = clamp(num | 0, FIRST, LAST); if (!S.pf) return;
  if (S.visible.includes(num)) return;
  const far = Math.abs(num - S.visible[0]) > 12;
  far ? (S.pf.turnToPage(idxOf(num)), afterTurn(), flipSound()) : S.pf.flip(idxOf(num), 'bottom');
 }
};
function toggleAuto(on = !S.auto) {
 clearInterval(S.auto); S.auto = null;
 if (on) { S.auto = setInterval(() => go.forward(), 5200); go.forward(); toast('Otomatik çevirme açık. Durdurmak için düğmeye yeniden bas.'); }
 $('#autoBtn').setAttribute('aria-pressed', !!on);
 $('#autoBtn use').setAttribute('href', on ? '#i-auto-stop' : '#i-auto');
}

/* ——— sayfa sesi (sentez) ——— */
let ac;
function flipSound() {
 if (!S.sound) return;
 try {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  const d = .5, sr = ac.sampleRate, buf = ac.createBuffer(1, sr * d, sr), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
   const t = i / ch.length, env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 2.2) * (1 - t * .5);
   const crackle = Math.random() < .004 ? (Math.random() * 2 - 1) * 2.5 : 0;
   ch[i] = ((Math.random() * 2 - 1) * (.55 + .45 * Math.sin(t * 31)) + crackle) * env;
  }
  const src = ac.createBufferSource(); src.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .6;
  bp.frequency.setValueAtTime(1400, ac.currentTime); bp.frequency.exponentialRampToValueAtTime(4200, ac.currentTime + d);
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
  const g = ac.createGain(); g.gain.value = .16;
  src.connect(bp).connect(hp).connect(g).connect(ac.destination); src.start();
 } catch {}
}

/* ——— sayfa altı kısa yollar ——— */
function renderPageActions() {
 const pa = $('#pageActions');
 pa.innerHTML = S.visible.map(n => {
  const pr = C.practice?.[n]; if (!pr) return '';
  const done = S.practice[n];
  return `<button class="pa${done ? ' done' : ''}" data-act="practice" data-page="${n}" title="Sayfa ${n} için alıştırma">${icon(done ? 'i-check' : 'i-spark')}<span>${n} · ${esc(pr.title.length > 30 ? pr.title.slice(0, 28) + '…' : pr.title)}</span></button>`;
 }).join('');
}

/* ——— kaynak açma ——— */
function openResource(id) {
 const r = resById.get(id); if (!r) return;
 const act = activityOf(r);
 if (act) return openActivity(act, r);
 if (r.media) {
  const m = mediaById.get(r.media);
  if (m?.kind === 'audio') return playAudio(r, m);
  if (m?.kind === 'video') return openVideo(r, m);
 }
 if (r.document) return openDocument(r);
 if (r.url) window.open(r.url, '_blank', 'noopener');
}

/* ses çalar */
const audio = new Audio(); audio.preload = 'auto';
let audioRes = null;
const rates = [1, .75, .5, 1.25];
function fmt(t) { t = Math.max(0, t | 0); return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`; }
function playAudio(r, m) {
 const pl = $('#player');
 if (audioRes === r.id && !audio.ended) { audio.paused ? audio.play() : audio.pause(); return; }
 audioRes = r.id; audio.src = m.src; audio.playbackRate = rates[S.rateIdx || 0];
 audio.play().catch(() => {});
 $('#plTitle').textContent = r.title;
 $('#plSub').textContent = `Sayfa ${r.page}${cleanLabel(r.label) ? ' · ' : ''}`;
 if (cleanLabel(r.label)) $('#plSub').insertAdjacentHTML('beforeend', `<bdi lang="ar">${esc(cleanLabel(r.label))}</bdi>`);
 pl.hidden = false;
 syncAudioUI();
}
function syncAudioUI() {
 const on = !audio.paused && !audio.ended;
 $('#player').classList.toggle('on', on);
 $('#plToggle use').setAttribute('href', on ? '#i-pause' : '#i-play');
 $('#plToggle').setAttribute('aria-label', on ? 'Duraklat' : 'Oynat');
 $$('.hs.playing').forEach(b => b.classList.remove('playing'));
 if (on && audioRes) $$(`.hs[data-res="${audioRes}"]`).forEach(b => b.classList.add('playing'));
}
['play', 'pause', 'ended'].forEach(e => audio.addEventListener(e, syncAudioUI));
audio.addEventListener('loadedmetadata', () => $('#plDur').textContent = fmt(audio.duration));
audio.addEventListener('timeupdate', () => {
 const s = $('#plSeek'); if (s.matches(':active')) return;
 const p = audio.duration ? audio.currentTime / audio.duration * 1000 : 0;
 s.value = p; s.style.setProperty('--p', p / 10 + '%'); $('#plTime').textContent = fmt(audio.currentTime);
});
$('#plSeek').addEventListener('input', e => {
 const v = +e.target.value; e.target.style.setProperty('--p', v / 10 + '%');
 if (audio.duration) { audio.currentTime = v / 1000 * audio.duration; $('#plTime').textContent = fmt(audio.currentTime); }
});
function closePlayer() { audio.pause(); audioRes = null; $('#player').hidden = true; syncAudioUI(); }

/* pencere */
let modalCleanup = null;
function openModal({kind, kicker, title, body, width, narrow, tools = ''}) {
 closeModal(true);
 audio.pause();
 const m = $('#modal'), card = $('#modalCard');
 card.className = 'modal-card' + (narrow ? ' narrow' : '');
 card.style.width = width ? width + 'px' : '';
 $('#modalIcon').className = 'modal-icon k-' + kind; $('#modalIcon').innerHTML = icon(KIND[kind]?.icon || 'i-spark');
 $('#modalKicker').textContent = kicker || ''; $('#modalTitle').textContent = title || '';
 $('#modalTools').innerHTML = tools;
 const b = $('#modalBody'); b.innerHTML = ''; typeof body === 'string' ? b.innerHTML = body : b.append(body);
 m.hidden = false;
 setTimeout(() => $('#modalCard .modal-head [data-act="modal-close"]').focus({preventScroll: true}), 50);
 return b;
}
function closeModal(silent) {
 if (modalCleanup) { try { modalCleanup(); } catch {} modalCleanup = null; }
 $('#modal').hidden = true; $('#modalBody').innerHTML = '';
 if (!silent) renderPageActions();
}
function frameWidth(ratio, extra = 70) { return Math.round(Math.min(1180, innerWidth - 40, (innerHeight - extra - 40) * ratio)); }

function openVideo(r, m) {
 const v = document.createElement('video');
 v.src = m.src; v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
 openModal({kind: 'video', kicker: `Sayfa ${r.page} · Video`, title: r.title, body: v, width: frameWidth(16 / 9)});
 modalCleanup = () => { v.pause(); v.removeAttribute('src'); v.load(); };
}
function openDocument(r) {
 const d = r.document, wrapEl = document.createElement('div'); wrapEl.className = 'docs';
 wrapEl.innerHTML = d.pages.map((src, i) => `<img src="${src}" alt="${esc(r.title)} · ${i + 1}" loading="lazy">`).join('');
 openModal({kind: kindOf(r), kicker: `Sayfa ${r.page} · ${KIND[kindOf(r)].name}`, title: r.title, body: wrapEl, width: Math.min(960, innerWidth - 40),
  tools: `<a class="btn ghost" href="${d.src}" download target="_blank" rel="noopener">${icon('i-download')}<span>PDF indir</span></a>`});
}

/* etkinlikler: Codex'in etkinlik kabuğu (activity-host.html) aynen kullanılır */
function openActivity(act, r) {
 const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
 const box = document.createElement('div'); box.className = 'frame-wrap';
 box.innerHTML = `<div class="loading"><div><div class="spin"></div>Etkinlik açılıyor…</div></div>`;
 const f = document.createElement('iframe');
 f.title = act.title; f.allow = 'autoplay; fullscreen'; f.src = `activity-host.html?id=${encodeURIComponent(act.id)}`;
 box.append(f);
 const page = r?.page || act.page, k = r ? kindOf(r) : 'practice';
 const prev = S.acts[act.id];
 openModal({kind: k, kicker: `Sayfa ${page} · ${KIND[k].name}`, title: r?.title || act.title, body: box, width: frameWidth(960 / 580),
  tools: prev?.score != null ? `<span class="chip" aria-pressed="true">Son puan: %${prev.score}</span>` : ''});
 f.addEventListener('load', () => {
  f.contentWindow.postMessage({channel: 'arabic9.activity.init', id: act.id, nonce, values: S.acts[act.id]?.values || {}, learnerId: 'ogrenci', review: false}, location.origin);
  setTimeout(() => box.querySelector('.loading')?.remove(), 700);
 }, {once: true});
 const onMsg = e => {
  if (e.source !== f.contentWindow || e.data?.channel !== 'arabic9.activity.v1' || e.data.nonce !== nonce) return;
  saveActivity(act.id, e.data.snapshot);
 };
 addEventListener('message', onMsg);
 modalCleanup = () => {
  try { const snap = f.contentWindow.ActivityHost?.snapshot(); if (snap) saveActivity(act.id, snap); } catch {}
  removeEventListener('message', onMsg);
 };
}
function saveActivity(id, snap) {
 if (!snap?.values) return;
 const was = S.acts[id]?.complete;
 S.acts[id] = {values: snap.values, score: snap.score, complete: snap.complete, status: snap.status, t: Date.now()};
 store.set('acts', S.acts);
 if (snap.complete && !was) {
  toast(snap.score != null ? `Etkinlik tamamlandı · Puan %${snap.score}` : 'Etkinlik tamamlandı');
  B.resources.filter(r => activityOf(r)?.id === id).forEach(r => $$(`.hs[data-res="${r.id}"]`).forEach(b => {
   if (!b.querySelector('.hs-done')) b.insertAdjacentHTML('beforeend', `<span class="hs-done">${icon('i-check')}</span>`);
  }));
 }
}

/* ——— alıştırmalar (CONTENT.practice / CONTENT.quiz) ——— */
const normAr = s => String(s).replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const normTr = s => String(s).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

function openQuiz(set, {title, kicker, onDone}) {
 const root = document.createElement('div'); root.className = 'quiz';
 const result = new Map(); // id → true/false (ilk deneme)
 const gradable = set.filter(q => q.type !== 'write').length;
 set.forEach((q, i) => root.append(renderQ(q, i, ok => { if (!result.has(q.id)) result.set(q.id, ok); foot(); })));
 const footEl = document.createElement('div'); footEl.className = 'q-foot';
 root.append(footEl);
 function foot() {
  const right = [...result.values()].filter(Boolean).length, answered = result.size;
  footEl.innerHTML = `<span class="score-big">${gradable ? `<b>${right}</b> / ${gradable} doğru` : 'Cevabını yaz, örnekle karşılaştır.'}</span><button class="btn" data-act="quiz-finish">${icon('i-check')}<span>${answered >= set.length ? 'Bitir' : 'Kaydet ve kapat'}</span></button>`;
  footEl.querySelector('button').onclick = () => { onDone?.({right, total: gradable, answered}); closeModal(); };
 }
 foot();
 openModal({kind: 'quiz', kicker, title, body: root, width: Math.min(760, innerWidth - 40)});
}
function renderQ(q, i, report) {
 const el = document.createElement('div'); el.className = 'q';
 const head = `<div class="q-p"><em>${i + 1}</em><span>${esc(q.prompt)}</span></div>${q.stem ? `<div class="q-stem">${esc(q.stem)}</div>` : ''}`;
 const explain = (ok) => {
  el.querySelector('.q-ex')?.remove();
  if (q.explanation) el.insertAdjacentHTML('beforeend', `<div class="q-ex${ok ? '' : ' bad'}">${ok ? '✓ ' : ''}${esc(q.explanation)}</div>`);
 };
 if (q.type === 'choice') {
  el.innerHTML = head + `<div class="opts">${q.options.map((o, k) => `<button class="opt${hasAr(o) ? ' ar' : ''}" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
  el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
   if (el.dataset.done) return;
   const ok = +b.dataset.k === q.answer;
   b.classList.add(ok ? 'ok' : 'no');
   report(ok);
   if (ok) { el.dataset.done = 1; el.querySelectorAll('.opt').forEach(x => x.disabled = x !== b); }
   explain(ok);
  });
 } else if (q.type === 'fill') {
  el.innerHTML = head + `<div class="q-in"><input lang="ar" dir="rtl" aria-label="Cevap" autocomplete="off"><button class="btn">Kontrol et</button></div>`;
  const inp = el.querySelector('input');
  const check = () => {
   const a = q.strict ? inp.value.trim() : normAr(inp.value).replace(/ /g, ''), b = q.strict ? q.answer.trim() : normAr(q.answer).replace(/ /g, '');
   if (!inp.value.trim()) return;
   const ok = a === b; inp.className = ok ? 'ok' : 'no'; report(ok); explain(ok);
   if (!ok) el.querySelector('.q-ex')?.insertAdjacentHTML('afterbegin', `Doğru cevap: <span class="ar">${esc(q.answer)}</span> · `);
  };
  el.querySelector('.btn').onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
 } else if (q.type === 'order') {
  el.innerHTML = head + `<div class="built" aria-label="Cümlen"></div><div class="bank"></div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn ghost" data-r>Sıfırla</button></div>`;
  const bank = el.querySelector('.bank'), built = el.querySelector('.built');
  const reset = () => { built.innerHTML = ''; built.className = 'built'; bank.innerHTML = shuffle(q.words.map((w, k) => [w, k])).map(([w, k]) => `<button class="tok" data-k="${k}">${esc(w)}</button>`).join(''); el.querySelector('.q-ex')?.remove(); };
  el.addEventListener('click', e => {
   const t = e.target.closest('.tok'); if (!t || el.dataset.done) return;
   (t.parentElement === bank ? built : bank).append(t);
   if (!bank.children.length) {
    const ok = [...built.children].map(x => q.words[x.dataset.k]).join(' ') === q.words.join(' ');
    built.classList.add(ok ? 'ok' : 'no'); report(ok); explain(ok); if (ok) el.dataset.done = 1;
   }
  });
  el.querySelector('[data-r]').onclick = reset; reset();
 } else if (q.type === 'match') {
  const right = shuffle(q.pairs.map((p, k) => [p[1], k]));
  el.innerHTML = head + `<div class="match"><div class="col">${q.pairs.map((p, k) => `<button class="opt${hasAr(p[0]) ? ' ar' : ''}" data-l="${k}">${esc(p[0])}</button>`).join('')}</div><div class="col">${right.map(([t, k]) => `<button class="opt${hasAr(t) ? ' ar' : ''}" data-r="${k}">${esc(t)}</button>`).join('')}</div></div>`;
  let sel = null, miss = false, got = 0;
  el.addEventListener('click', e => {
   const b = e.target.closest('.opt'); if (!b || b.disabled) return;
   if (b.dataset.l != null) { el.querySelectorAll('[data-l]').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; return; }
   if (!sel) { b.animate([{transform: 'translateX(-3px)'}, {transform: 'translateX(3px)'}, {transform: 'none'}], 200); return; }
   if (sel.dataset.l === b.dataset.r) {
    [sel, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; }); sel = null;
    if (++got === q.pairs.length) { report(!miss); explain(true); }
   } else { miss = true; b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 450); }
  });
 } else {
  el.innerHTML = head + `<textarea placeholder="Cevabını buraya yaz…" aria-label="Cevabın"></textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost" data-ex>Örnek cevabı göster</button></div>`;
  el.querySelector('[data-ex]').onclick = () => {
   el.querySelector('.q-ex')?.remove();
   el.insertAdjacentHTML('beforeend', `<div class="q-ex">Örnek: ${esc(q.example || '')}</div>`); report(true);
  };
 }
 return el;
}
function openPractice(num) {
 const pr = C.practice?.[num]; if (!pr) return;
 openQuiz(pr.questions, {title: pr.title, kicker: `Sayfa ${num} · Alıştırma`, onDone: ({right, total, answered}) => {
  if (!answered) return;
  S.practice[num] = {right, total, t: Date.now()}; store.set('practice', S.practice);
  toast(total ? `Sayfa ${num} alıştırması: ${right}/${total} doğru` : `Sayfa ${num} alıştırması kaydedildi`);
 }});
}
function openUnitQuiz() {
 const qs = (C.quiz || []).map((q, i) => ({...q, id: q.id || 'u' + i}));
 openQuiz(qs, {title: '1. ünite değerlendirmesi', kicker: `${qs.length} soru · Haydi tanışalım`, onDone: ({right, total}) => {
  store.set('unitQuiz', {right, total, t: Date.now()}); toast(`1. ünite değerlendirmesi: ${right}/${total} doğru`);
 }});
}

/* ——— panel ——— */
function openPanel(tab) {
 S.tab = tab || S.tab || 'toc';
 $('#panel').classList.add('open'); $('#panel').setAttribute('aria-hidden', 'false');
 renderPanel();
 if (S.tab === 'search') setTimeout(() => $('#q')?.focus(), 80);
}
function closePanel() { $('#panel').classList.remove('open'); $('#panel').setAttribute('aria-hidden', 'true'); }
function renderPanel() {
 $$('.panel-tabs [role="tab"]').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === S.tab));
 const body = $('#panelBody'), keepScroll = body.dataset.tab === S.tab ? body.scrollTop : 0;
 body.dataset.tab = S.tab;
 body.innerHTML = ({toc: panelToc, pages: panelPages, media: panelMedia, words: panelWords, notes: panelNotes, search: panelSearch})[S.tab]();
 body.scrollTop = keepScroll;
 if (S.tab === 'pages' && !keepScroll) $('.th.on', body)?.scrollIntoView({block: 'center'});
 if (S.tab === 'search') bindSearch();
}
function panelToc() {
 const pct = Math.round(S.seen.size / N * 100), uq = store.get('unitQuiz', null);
 const doneActs = Object.values(S.acts).filter(a => a.complete).length;
 let h = `<div class="p-hero"><small>AİHL · 9. SINIF</small><span class="ar">${esc(B.unitArabic)}</span><b>${esc(B.title)}</b>
  <div class="meta">${(B.units || []).length || 1} ünite · ${N} sayfa · ${B.stats.audio} ses · ${B.stats.video} video · ${B.activities.length} etkinlik</div>
  <div class="prog"><i style="width:${pct}%"></i></div><div class="meta">Gezilen sayfalar %${pct} · Tamamlanan etkinlik ${doneActs}/${B.activities.length}</div></div>
  <button class="row k-quiz" data-act="unit-quiz"><span class="ic">${icon('i-spark')}</span><span class="tx"><b>1. ünite değerlendirmesi</b><small>${(C.quiz || []).length} soruluk kısa test${uq ? ` · son: ${uq.right}/${uq.total}` : ''}</small></span></button>`;
 const cur = chapterAt(S.visible[0]).page;
 CHAPTERS.forEach(c => {
  if (c.group) h += `<div class="grp">${esc(c.group)}</div>`;
  h += `<button class="ch${c.page === cur ? ' on' : ''}" data-act="goto" data-page="${c.page}"><img src="${pageByNum.get(c.page).thumb}" alt="" loading="lazy"><span>${esc(c.title)}${c.arabic ? ` <bdi lang="ar" class="ch-ar">${esc(c.arabic)}</bdi>` : ''}</span><small>${pl(c.page)}</small></button>`;
 });
 return h;
}
function panelPages() {
 let h = '<div class="thumbs">';
 for (let n = FIRST; n <= LAST; n += 2) {
  const pair = [n, n + 1].filter(x => x <= LAST), on = pair.some(x => S.visible.includes(x));
  h += `<button class="th${on ? ' on' : ''}" data-act="goto" data-page="${n}"><span class="pair">${pair.map(x => `<span class="vis${S.seen.has(x) ? ' seen' : ''}"><img src="${pageByNum.get(x).thumb}" alt="Sayfa ${x}" loading="lazy"></span>`).join('')}</span><small>${pair.map(pl).join('–')}</small></button>`;
 }
 return h + '</div>';
}
function mediaItems() {
 return B.resources.filter(r => r.kind !== 'external').map(r => {
  const act = activityOf(r), k = kindOf(r);
  const group = k === 'audio' ? 'audio' : k === 'video' && !act ? 'video' : r.document && !act ? 'document' : 'activity';
  return {r, k, act, group};
 });
}
function panelMedia() {
 const items = mediaItems(), count = g => items.filter(i => g === 'all' || i.group === g).length;
 const f = S.mediaFilter;
 const chips = [['all', 'Tümü', 'var(--gold)'], ['audio', 'Sesler', 'var(--k-audio)'], ['video', 'Videolar', 'var(--k-video)'], ['activity', 'Etkinlikler', 'var(--k-practice)'], ['document', 'Belgeler', 'var(--k-document)']]
  .filter(([g]) => count(g)).map(([g, t, c]) => `<button class="chip" style="--k:${c}" data-act="mfilter" data-f="${g}" aria-pressed="${f === g}"><i></i>${t} <small>${count(g)}</small></button>`).join('');
 const rows = items.filter(i => f === 'all' || i.group === f).map(({r, k, act}) => {
  const st = act && S.acts[act.id];
  return `<button class="row k-${k}" data-act="media-open" data-res="${r.id}"><span class="ic">${icon(KIND[k].icon)}</span><span class="tx"><b>${esc(r.title)}</b><small>${KIND[k].name}${cleanLabel(r.label) ? ` · <bdi lang="ar">${esc(cleanLabel(r.label))}</bdi>` : ''}${st?.complete ? ` · <span class="score">✓${st.score != null ? ' %' + st.score : ''}</span>` : ''}</small></span><span class="go">s. ${r.page}</span></button>`;
 }).join('');
 return `<div class="chips">${chips}</div>${rows}`;
}
function panelWords() {
 const v = C.vocabulary || [];
 return `<div class="hint" style="padding:0 2px 12px">Karta dokun, anlamını gör. ${v.length} kelime ve kalıp.</div><div class="cards">${v.map(([ar, tr]) => `<button class="wc" data-act="card"><span class="wc-in"><span class="wc-f">${esc(ar)}</span><span class="wc-b">${esc(tr)}</span></span></button>`).join('')}</div>
 <div style="display:flex;gap:8px;margin-top:14px"><button class="btn ghost" data-act="cards-shuffle">Karıştır</button><button class="btn ghost" data-act="cards-reset">Hepsini çevir</button></div>`;
}
function panelNotes() {
 const n = S.visible[0];
 const marks = [...S.marks].sort((a, b) => a - b).map(p => `<button class="mk" data-act="goto" data-page="${p}"><img src="${pageByNum.get(p).thumb}" alt=""><b>${p}</b></button>`).join('');
 const notes = S.notes.slice().sort((a, b) => a.page - b.page || a.t - b.t).map(x => `<div class="note"><header><span>Sayfa ${x.page} · ${new Date(x.t).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'})}</span><button data-act="goto" data-page="${x.page}">Sayfaya git</button></header><p>${esc(x.text)}</p><button class="tb del" data-act="note-del" data-id="${x.id}" aria-label="Notu sil"><svg><use href="#i-trash"/></svg></button></div>`).join('');
 return `<div class="grp" style="margin-top:0">AYRAÇLAR</div>${marks ? `<div class="marks">${marks}</div>` : `<div class="hint" style="padding-bottom:10px">Henüz ayraç yok. Üstteki ${icon('i-bookmark')} düğmesiyle sayfayı işaretle.</div>`}
 <div class="grp">SAYFA ${n} İÇİN NOT</div><textarea id="noteText" placeholder="Bu sayfayla ilgili notun…"></textarea><div style="margin:8px 0 6px"><button class="btn" data-act="note-add">${icon('i-note')}<span>Notu kaydet</span></button></div>
 <div class="grp">NOTLARIM</div>${notes || '<div class="hint">Notların burada toplanır.</div>'}`;
}

/* arama */
const skel = s => normAr(s).replace(/[اءؤئ]/g, '').replace(/\s+/g, '');
const pageIndex = B.pages.map(p => ({num: p.number, lines: p.text.split('\n').map(l => l.trim()).filter(Boolean)}));
pageIndex.forEach(p => { p.sk = p.lines.map(skel); p.all = p.sk.join(''); });
function panelSearch() {
 return `<label class="field">${icon('i-search')}<input id="q" type="search" placeholder="Arapça ya da Türkçe ara…" autocomplete="off" value="${esc(S.lastQ || '')}"></label><div id="hits">${searchHTML(S.lastQ || '')}</div>`;
}
function bindSearch() {
 const q = $('#q'); let t;
 q.oninput = () => { clearTimeout(t); t = setTimeout(() => { S.lastQ = q.value; $('#hits').innerHTML = searchHTML(q.value); }, 120); };
}
function searchHTML(q) {
 q = q.trim();
 if (!q) return `<div class="hint">Sayfa metinlerinde, içindekilerde, seslerde ve etkinliklerde arar. Harekesiz yazabilirsin: <bdi lang="ar">السلام</bdi> · <bdi lang="ar">تشرفت</bdi> · “selam” · “harf”.</div>`;
 let h = '', hits = 0;
 if (hasAr(q)) {
  const k = skel(q); if (!k) return '';
  pageIndex.forEach(p => {
   if (!p.all.includes(k)) return;
   const li = p.sk.findIndex(s => s.includes(k));
   const line = p.lines[li >= 0 ? li : 0];
   hits++; h += `<button class="hit" data-act="goto" data-page="${p.num}"><b>Sayfa ${p.num}</b><p class="ar" lang="ar">${esc(line)}</p></button>`;
  });
 }
 const t = normTr(q);
 if (t) {
  const mark = s => { const i = normTr(s).indexOf(t); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
  CHAPTERS.filter(c => normTr(c.title).includes(t) || (c.arabic && hasAr(q) && skel(c.arabic).includes(skel(q)))).forEach(c => { hits++; h += `<button class="hit" data-act="goto" data-page="${c.page}"><b>Bölüm · Sayfa ${c.page}</b><p>${mark(c.title)}</p></button>`; });
  B.resources.filter(r => normTr(r.title).includes(t) || normAr(cleanLabel(r.label)).includes(normAr(q))).forEach(r => { hits++; h += `<button class="hit" data-act="media-open" data-res="${r.id}"><b>${KIND[kindOf(r)].name} · Sayfa ${r.page}</b><p>${mark(r.title)}</p></button>`; });
  Object.values(C.practice || {}).filter(p => normTr(p.title).includes(t)).forEach(p => { hits++; h += `<button class="hit" data-act="practice" data-page="${p.page}"><b>Alıştırma · Sayfa ${p.page}</b><p>${mark(p.title)}</p></button>`; });
  (C.vocabulary || []).filter(([ar, tr]) => normTr(tr).includes(t) || (hasAr(q) && skel(ar).includes(skel(q)))).forEach(([ar, tr]) => { hits++; h += `<div class="hit"><b>Kelime</b><p><span lang="ar" style="font-size:19px">${esc(ar)}</span> · ${mark(tr)}</p></div>`; });
 }
 return hits ? `<div class="hint" style="padding:0 6px 8px">${hits} sonuç</div>` + h : `<div class="empty">${icon('i-search')}<div>“${esc(q)}” bulunamadı.</div></div>`;
}

/* ——— ayraç & not ——— */
function toggleMark() {
 const n = S.visible[0];
 S.marks.has(n) ? S.marks.delete(n) : S.marks.add(n);
 store.set('marks', [...S.marks]);
 $$(`.pg[data-num="${n}"]`).forEach(p => p.classList.toggle('marked', S.marks.has(n)));
 $('#bookmarkBtn').setAttribute('aria-pressed', S.marks.has(n));
 toast(S.marks.has(n) ? `Sayfa ${n} ayraçlandı` : 'Ayraç kaldırıldı');
 if ($('#panel').classList.contains('open') && S.tab === 'notes') renderPanel();
}

/* ——— çizimler ——— */
function pathD(pts) {
 const r = v => Math.round(v * 10) / 10;
 if (pts.length < 2) return `M${r(pts[0][0])} ${r(pts[0][1])}l.1 0`;
 let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
 for (let i = 1; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; d += `Q${r(x0)} ${r(y0)} ${r((x0 + x1) / 2)} ${r((y0 + y1) / 2)}`; }
 const l = pts.at(-1); return d + `L${r(l[0])} ${r(l[1])}`;
}
const strokeSVG = s => `<path d="${pathD(s.d)}" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"${s.t === 'marker' ? ' opacity=".38" style="mix-blend-mode:multiply"' : ''}/>`;
const inkSVG = num => (S.ink[num] || []).map(strokeSVG).join('');
function renderInk(num) { $$(`.pg[data-num="${num}"] .pg-ink`).forEach(svg => svg.innerHTML = inkSVG(num)); }

/* ——— büyüteç (yakınlaştırma + kalem) ——— */
const L = {open: false, s: 1, x: 0, y: 0, pw: 0, ph: 0, tool: 'hand', color: '#e2534a', ptr: new Map(), undo: [], space: false};
const COLORS = ['#e2534a', '#2d7fd3', '#2fa577', '#1d2b26', '#f0c419'];
$('#swatches').innerHTML = COLORS.map(c => `<button class="sw" style="--c:${c}" data-act="color" data-c="${c}" aria-label="Renk"></button>`).join('');
function lensOpen(tool = 'hand') {
 L.open = true; $('#lens').hidden = false; lensBuild(); lensTool(tool);
 if (tool === 'hand') toast('Tekerlek ya da iki parmakla yakınlaştır, sürükleyerek gez. Çift tık: yakın/uzak.');
}
function lensBuild() {
 const sheet = $('#lensSheet'); sheet.innerHTML = '';
 S.visible.forEach(n => { const el = pageEl(pageByNum.get(n), S.visible.length > 1 ? (n % 2 ? 0 : 1) : 1, true); sheet.append(el); });
 $('#lensPage').textContent = S.visible.map(pl).join('–');
 lensFit();
}
function lensFit() {
 const v = $('#lensView').getBoundingClientRect(), n = S.visible.length;
 let ph = v.height * .94, pw = ph * RATIO;
 if (pw * n > v.width * .96) { pw = v.width * .96 / n; ph = pw / RATIO; }
 L.pw = pw; L.ph = ph; L.s = 1; L.x = (v.width - pw * n) / 2; L.y = (v.height - ph) / 2; lensApply();
}
function lensApply() {
 const v = $('#lensView').getBoundingClientRect(), n = S.visible.length, w = L.pw * n * L.s, h = L.ph * L.s;
 L.x = w <= v.width ? (v.width - w) / 2 : clamp(L.x, v.width - w - 40, 40);
 L.y = h <= v.height ? (v.height - h) / 2 : clamp(L.y, v.height - h - 40, 40);
 const sh = $('#lensSheet');
 sh.style.setProperty('--pw', L.pw * L.s + 'px'); sh.style.setProperty('--ph', L.ph * L.s + 'px');
 sh.style.transform = `translate(${L.x}px,${L.y}px)`;
 $('#lensPct').textContent = Math.round(L.s * 100) + '%';
}
function lensZoom(ns, cx, cy) {
 const v = $('#lensView').getBoundingClientRect();
 ns = clamp(ns, 1, 6); if (cx == null) { cx = v.width / 2; cy = v.height / 2; }
 L.x = cx - (cx - L.x) * (ns / L.s); L.y = cy - (cy - L.y) * (ns / L.s); L.s = ns; lensApply();
}
function lensTool(t) {
 L.tool = t;
 $$('#lensTools [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
 $$('#swatches .sw').forEach(b => b.classList.toggle('on', b.dataset.c === L.color));
 $('#swatches').style.opacity = t === 'pen' || t === 'marker' ? 1 : .35;
 $('#lensView').classList.toggle('draw', t !== 'hand');
}
function lensClose() {
 L.open = false; $('#lens').hidden = true; $('#lensSheet').innerHTML = '';
 S.visible.forEach(renderInk); store.set('ink', S.ink);
}
function lensTurn(dir) {
 S.visible.forEach(renderInk);
 dir > 0 ? go.forward() : go.back();
 setTimeout(lensBuild, 60);
}
(() => {
 const view = $('#lensView');
 let pan = null, pinch = null, stroke = null;
 const capture = e => { try { view.setPointerCapture(e.pointerId); } catch {} };
 const local = (e, pg) => { const r = pg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1000, (e.clientY - r.top) / r.height * INK_H]; };
 const eraseAt = (num, p) => {
  const list = S.ink[num] || [], rad = 16;
  for (let i = list.length - 1; i >= 0; i--) if (list[i].d.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < rad + list[i].w / 2)) {
   L.undo.push({type: 'del', num, s: list[i], i}); list.splice(i, 1); $$(`#lensSheet .pg[data-num="${num}"] .pg-ink`).forEach(s => s.innerHTML = inkSVG(num));
  }
 };
 view.addEventListener('pointerdown', e => {
  const vr = view.getBoundingClientRect();
  L.ptr.set(e.pointerId, {x: e.clientX - vr.left, y: e.clientY - vr.top});
  if (L.ptr.size === 2) {
   stroke = null; pan = null;
   const [a, b] = [...L.ptr.values()];
   pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), s: L.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, x: L.x, y: L.y};
   return;
  }
  const hand = L.tool === 'hand' || L.space || e.button === 1;
  if (hand) {
   if (e.target.closest('.hs')) return; // düğmeye tıklama geçsin
   pan = {x: e.clientX, y: e.clientY, ox: L.x, oy: L.y, moved: false}; view.classList.add('grabbing'); capture(e); return;
  }
  const pg = e.target.closest('.pg'); if (!pg) return;
  capture(e);
  const num = +pg.dataset.num, p = local(e, pg);
  if (L.tool === 'eraser') { stroke = {num, pg, erase: true}; eraseAt(num, p); return; }
  const s = {t: L.tool, c: L.color, w: L.tool === 'marker' ? 22 : 3.2, d: [p]};
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  pg.querySelector('.pg-ink').append(path);
  stroke = {num, pg, s, path};
  path.innerHTML = strokeSVG(s);
 });
 view.addEventListener('pointermove', e => {
  const vr = view.getBoundingClientRect();
  if (L.ptr.has(e.pointerId)) L.ptr.set(e.pointerId, {x: e.clientX - vr.left, y: e.clientY - vr.top});
  if (pinch && L.ptr.size === 2) {
   const [a, b] = [...L.ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
   const ns = clamp(pinch.s * d / pinch.d, 1, 6), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
   L.x = cx - (pinch.cx - pinch.x) * (ns / pinch.s); L.y = cy - (pinch.cy - pinch.y) * (ns / pinch.s); L.s = ns; lensApply();
   return;
  }
  if (pan) { L.x = pan.ox + e.clientX - pan.x; L.y = pan.oy + e.clientY - pan.y; lensApply(); return; }
  if (!stroke) return;
  const p = local(e, stroke.pg);
  if (stroke.erase) return eraseAt(stroke.num, p);
  const last = stroke.s.d.at(-1);
  if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
  stroke.s.d.push(p); stroke.path.innerHTML = strokeSVG(stroke.s);
 });
 const end = e => {
  L.ptr.delete(e.pointerId);
  if (L.ptr.size < 2) pinch = null;
  if (pan) { pan = null; view.classList.remove('grabbing'); }
  if (stroke && !stroke.erase) {
   (S.ink[stroke.num] ||= []).push(stroke.s); L.undo.push({type: 'add', num: stroke.num, s: stroke.s});
   stroke.path.remove(); $$(`#lensSheet .pg[data-num="${stroke.num}"] .pg-ink`).forEach(s => s.innerHTML = inkSVG(stroke.num));
  }
  if (stroke) store.set('ink', S.ink);
  stroke = null;
 };
 view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
 view.addEventListener('wheel', e => {
  e.preventDefault();
  const vr = view.getBoundingClientRect(), mouse = e.ctrlKey || e.deltaMode === 1 || (Math.abs(e.deltaY) >= 40 && !e.deltaX);
  if (mouse) lensZoom(L.s * Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0018)), e.clientX - vr.left, e.clientY - vr.top);
  else { L.x -= e.deltaX; L.y -= e.deltaY; lensApply(); }
 }, {passive: false});
 view.addEventListener('dblclick', e => {
  if (L.tool !== 'hand' || e.target.closest('.hs')) return;
  const vr = view.getBoundingClientRect();
  lensZoom(L.s > 1.4 ? 1 : 2.6, e.clientX - vr.left, e.clientY - vr.top);
 });
 addEventListener('resize', () => { if (L.open) lensFit(); });
})();
function inkUndo() {
 const u = L.undo.pop(); if (!u) return;
 const list = S.ink[u.num] ||= [];
 if (u.type === 'add') { const i = list.indexOf(u.s); if (i >= 0) list.splice(i, 1); } else list.splice(u.i, 0, u.s);
 $$(`#lensSheet .pg[data-num="${u.num}"] .pg-ink`).forEach(s => s.innerHTML = inkSVG(u.num)); store.set('ink', S.ink);
}
function inkClear() {
 S.visible.forEach(n => { (S.ink[n] || []).forEach((s, i) => L.undo.push({type: 'del', num: n, s, i: 0})); delete S.ink[n]; });
 $$('#lensSheet .pg-ink').forEach(s => s.innerHTML = ''); store.set('ink', S.ink);
 toast('Bu sayfadaki çizimler silindi', {label: 'Geri al', fn: () => { while (L.undo.at(-1)?.type === 'del') inkUndo(); }});
}

/* ——— etkinlik odağı: bölge ekranı kaplar, kalem + lazer ——— */
const REGIONS = B.pages.flatMap(p => (p.regions || []).map((r, i) => ({num: p.number, i, r})));
const F = {open: false, num: 0, i: 0, tool: store.get('ftool', 'pen'), color: '#e2534a', undo: [], laser: [], hover: null, raf: 0};
$('#fSwatches').innerHTML = COLORS.map(c => `<button class="sw" style="--c:${c}" data-act="fcolor" data-c="${c}" aria-label="Renk"></button>`).join('');
function bookRegionRect(num, i) {
 const pg = $$(`#bookHost .pg[data-num="${num}"]`).find(el => { const r = el.getBoundingClientRect(); return r.width > 20 && getComputedStyle(el).display !== 'none'; });
 if (!pg) return null;
 const R = pg.getBoundingClientRect(), [x, y, w, h] = pageByNum.get(num).regions[i].rect;
 return {left: R.left + R.width * x / 100, top: R.top + R.height * y / 100, width: R.width * w / 100, height: R.height * h / 100};
}
// parçalı etkinlikte yönerge satırı (head) parçanın üstüne şerit olarak eklenir
const fWins = () => { const r = pageByNum.get(F.num).regions[F.i]; return r.head ? [r.head, r.rect] : [r.rect]; };
function fLayout() {
 const reg = pageByNum.get(F.num).regions[F.i], [x, , w] = reg.rect, wins = fWins();
 const st = $('#focusStage').getBoundingClientRect();
 const toplam = wins.reduce((a, r) => a + r[3], 0);
 const ar = (w * RATIO) / toplam, maxW = st.width - 24, maxH = st.height - 24;
 const fw = Math.min(maxW, maxH * ar);
 const frame = $('#focusFrame'), pw = fw / (w / 100), ph = pw / RATIO;
 frame.style.width = fw + 'px';
 [...frame.children].forEach((win, k) => {
  const r = wins[k];
  win.style.height = r[3] / 100 * ph + 'px';
  Object.assign(win.firstElementChild.style, {width: pw + 'px', height: ph + 'px', left: -x / 100 * pw + 'px', top: -r[1] / 100 * ph + 'px'});
 });
 const c = $('#laser'), dpr = devicePixelRatio || 1;
 c.width = st.width * dpr; c.height = st.height * dpr; c.style.width = st.width + 'px'; c.style.height = st.height + 'px';
}
function fLabel() {
 const r = pageByNum.get(F.num).regions[F.i], k = REGIONS.findIndex(q => q.num === F.num && q.i === F.i);
 $('#fLabel').innerHTML = `${r.n ? `Etkinlik <b>${r.n}</b>` : 'Bölüm'}${r.part ? ` <span class="fpart">${r.part.replace('/', ' / ')}</span>` : ''} <small>Sayfa ${F.num}</small>`;
 $('[data-act="f-next"]').disabled = k >= REGIONS.length - 1; $('[data-act="f-prev"]').disabled = k <= 0;
}
function fTool(t) {
 F.tool = t; store.set('ftool', t);
 $$('#focus [data-ftool]').forEach(b => b.classList.toggle('on', b.dataset.ftool === t));
 $$('#fSwatches .sw').forEach(b => b.classList.toggle('on', b.dataset.c === F.color));
 $('#fSwatches').classList.toggle('dim', t !== 'pen' && t !== 'marker');
 $('#focus').dataset.tool = t;
}
function openFocus(num, i, from) {
 const fresh = !F.open;
 F.open = true; F.num = num; F.i = i;
 const f = $('#focus'), frame = $('#focusFrame');
 f.hidden = false; f.classList.remove('closing');
 frame.innerHTML = '';
 fWins().forEach((r, k, all) => {
  const win = document.createElement('div');
  win.className = 'fwin' + (all.length > 1 && k === 0 ? ' fhead' : '');
  win.append(pageEl(pageByNum.get(num), num % 2 ? 0 : 1, true));
  frame.append(win);
 });
 fLayout(); fLabel(); fTool(F.tool); tip.hidden = true;
 const start = from || (fresh ? bookRegionRect(num, i) : null);
 if (start) { // kitaptaki yerinden büyüyerek gelsin
  const end = frame.getBoundingClientRect();
  frame.style.transition = 'none';
  frame.style.transform = `translate(${start.left - end.left}px,${start.top - end.top}px) scale(${start.width / end.width},${start.height / end.height})`;
  frame.getBoundingClientRect();
  frame.style.transition = ''; frame.style.transform = '';
 } else {
  frame.animate([{opacity: 0, transform: 'scale(.97)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'ease-out'});
 }
 f.classList.add('on');
}
function closeFocus() {
 if (!F.open) return;
 F.open = false; F.laser = []; F.hover = null;
 renderInk(F.num); store.set('ink', S.ink);
 const f = $('#focus'), frame = $('#focusFrame'), to = bookRegionRect(F.num, F.i);
 f.classList.remove('on'); f.classList.add('closing');
 if (to) { // sayfadaki yerine küçülerek dönsün
  const cur = frame.getBoundingClientRect();
  frame.style.transform = `translate(${to.left - cur.left}px,${to.top - cur.top}px) scale(${to.width / cur.width},${to.height / cur.height})`;
 }
 setTimeout(() => { f.hidden = true; f.classList.remove('closing'); frame.style.transform = ''; frame.innerHTML = ''; }, to ? 420 : 200);
}
function fStep(d) {
 const k = REGIONS.findIndex(q => q.num === F.num && q.i === F.i) + d, q = REGIONS[k];
 if (!q) return;
 renderInk(F.num); store.set('ink', S.ink);
 if (!S.visible.includes(q.num)) go.to(q.num);
 openFocus(q.num, q.i);
}
/* lazer: ardında sönen kırmızı iz */
function laserDraw() {
 const c = $('#laser'), x = c.getContext('2d'), dpr = devicePixelRatio || 1, now = performance.now();
 x.clearRect(0, 0, c.width, c.height);
 F.laser = F.laser.filter(p => now - p.t < 650);
 for (let k = 1; k < F.laser.length; k++) {
  const a = F.laser[k - 1], b = F.laser[k];
  if (b.t - a.t > 120) continue;
  const life = 1 - (now - b.t) / 650;
  x.strokeStyle = `rgba(255,40,40,${life * .85})`; x.lineWidth = (4 + 6 * life) * dpr; x.lineCap = 'round';
  x.shadowColor = 'rgba(255,0,0,.9)'; x.shadowBlur = 14 * dpr;
  x.beginPath(); x.moveTo(a.x * dpr, a.y * dpr); x.lineTo(b.x * dpr, b.y * dpr); x.stroke();
 }
 if (F.hover && F.tool === 'laser') {
  x.shadowColor = 'rgba(255,0,0,1)'; x.shadowBlur = 22 * dpr; x.fillStyle = '#ff3b30';
  x.beginPath(); x.arc(F.hover.x * dpr, F.hover.y * dpr, 7 * dpr, 0, 7); x.fill();
  x.shadowBlur = 0; x.fillStyle = '#fff'; x.beginPath(); x.arc(F.hover.x * dpr, F.hover.y * dpr, 2.5 * dpr, 0, 7); x.fill();
 }
 F.raf = F.laser.length || (F.hover && F.tool === 'laser') ? requestAnimationFrame(laserDraw) : 0;
}
(() => {
 const stageEl = $('#focusStage');
 let stroke = null;
 const at = e => { const r = stageEl.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now()}; };
 const local = (e, pg) => { const r = pg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1000, (e.clientY - r.top) / r.height * INK_H]; };
 const repaint = n => $$(`#focusFrame .pg-ink`).forEach(s => s.innerHTML = inkSVG(n));
 const erase = (n, p) => {
  const list = S.ink[n] || [];
  for (let i = list.length - 1; i >= 0; i--) if (list[i].d.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 16 + list[i].w / 2)) { F.undo.push({type: 'del', num: n, s: list[i], i}); list.splice(i, 1); repaint(n); }
 };
 stageEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.hs')) return; // sayfadaki ses/video düğmeleri çalışsın
  if (e.target === stageEl && F.tool !== 'laser') return closeFocus(); // boşluğa dokununca kapanır
  try { stageEl.setPointerCapture(e.pointerId); } catch {}
  if (F.tool === 'laser') { F.hover = at(e); F.laser.push(F.hover); if (!F.raf) laserDraw(); stroke = {laser: true}; return; }
  const pg = e.target.closest('#focusFrame .pg'); if (!pg) return;
  const p = local(e, pg);
  if (F.tool === 'eraser') { stroke = {erase: true, pg}; erase(F.num, p); return; }
  const s = {t: F.tool, c: F.color, w: F.tool === 'marker' ? 22 : 3.2, d: [p]};
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); pg.querySelector('.pg-ink').append(g); g.innerHTML = strokeSVG(s);
  stroke = {s, g, pg};
 });
 stageEl.addEventListener('pointermove', e => {
  if (F.tool === 'laser' && (e.pointerType === 'mouse' || stroke)) {
   F.hover = at(e); F.laser.push(F.hover);
   if (!F.raf) laserDraw(); return;
  }
  if (!stroke || stroke.laser) return;
  const p = local(e, stroke.pg);
  if (stroke.erase) return erase(F.num, p);
  const last = stroke.s.d.at(-1);
  if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
  stroke.s.d.push(p); stroke.g.innerHTML = strokeSVG(stroke.s);
 });
 const end = e => {
  if (stroke?.s) { (S.ink[F.num] ||= []).push(stroke.s); F.undo.push({type: 'add', num: F.num, s: stroke.s}); stroke.g.remove(); repaint(F.num); store.set('ink', S.ink); }
  if (stroke?.laser && e.pointerType !== 'mouse') F.hover = null;
  stroke = null;
 };
 stageEl.addEventListener('pointerup', end); stageEl.addEventListener('pointercancel', end);
 stageEl.addEventListener('pointerleave', () => { if (!stroke) F.hover = null; });
 addEventListener('resize', () => { if (F.open) fLayout(); });
})();
function fUndo() {
 const u = F.undo.pop(); if (!u) return;
 const list = S.ink[u.num] ||= [];
 if (u.type === 'add') { const i = list.indexOf(u.s); if (i >= 0) list.splice(i, 1); } else list.splice(u.i, 0, u.s);
 $$('#focusFrame .pg-ink').forEach(s => s.innerHTML = inkSVG(F.num)); store.set('ink', S.ink);
}
function fClear() {
 const [x, y, w, h] = pageByNum.get(F.num).regions[F.i].rect, list = S.ink[F.num] || [];
 const inside = s => s.d.some(([px, py]) => px / 10 >= x && px / 10 <= x + w && py / INK_H * 100 >= y && py / INK_H * 100 <= y + h);
 for (let i = list.length - 1; i >= 0; i--) if (inside(list[i])) { F.undo.push({type: 'del', num: F.num, s: list[i], i}); list.splice(i, 1); }
 $$('#focusFrame .pg-ink').forEach(s => s.innerHTML = inkSVG(F.num)); store.set('ink', S.ink);
}

/* ——— bildirim & ipucu ——— */
function toast(msg, action, ms = 3400) {
 const t = document.createElement('div'); t.className = 'toast';
 t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
 if (action) t.querySelector('button').onclick = () => { action.fn(); kill(); };
 $('#toasts').append(t);
 const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
 setTimeout(kill, action ? ms + 2600 : ms);
 while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
const tip = $('#tip');
document.addEventListener('pointerover', e => {
 const b = e.target.closest?.('.hs'); if (!b || e.pointerType === 'touch') return;
 const r = resById.get(b.dataset.res); if (!r) return;
 const act = activityOf(r), st = act && S.acts[act.id];
 tip.innerHTML = `${esc(r.title)}<small>${KIND[kindOf(r)].name} · Sayfa ${r.page}${st?.complete ? ' · tamamlandı' : ''}</small>${cleanLabel(r.label) ? `<span class="ar">${esc(cleanLabel(r.label))}</span>` : ''}`;
 const br = b.getBoundingClientRect();
 tip.style.left = br.left + br.width / 2 + 'px'; tip.style.top = br.top + 'px'; tip.hidden = false;
});
document.addEventListener('pointerout', e => { if (e.target.closest?.('.hs')) tip.hidden = true; });

/* ——— kaydırıcı ——— */
const range = $('#scrubRange');
range.min = FIRST; range.max = LAST;
function paintRange(r) { r.style.setProperty('--p', (r.value - FIRST) / (LAST - FIRST) * 100 + '%'); }
range.addEventListener('input', () => {
 paintRange(range);
 const pv = $('#scrubPreview'), n = +range.value, f = (n - FIRST) / (LAST - FIRST), w = range.getBoundingClientRect().width;
 pv.style.left = (w - 6 - f * (w - 12)) + 'px';
 pv.querySelector('img').src = pageByNum.get(n).thumb; pv.querySelector('span').textContent = `${n ? 'Sayfa ' + n : 'Kapak'} · ${chapterAt(n).title}`;
 pv.classList.add('on');
});
range.addEventListener('change', () => { $('#scrubPreview').classList.remove('on'); go.to(+range.value); });
range.addEventListener('pointerup', () => $('#scrubPreview').classList.remove('on'));
$('#scrubMarks').innerHTML = CHAPTERS.map(c => `<i class="${c.group ? 'cm' : ''}" style="right:${(c.page - FIRST) / (LAST - FIRST) * 100}%"></i>`).join('');

/* sayfa numarası alanı */
const pin = $('#pageInput');
pin.addEventListener('focus', () => { pin.value = ''; });
pin.addEventListener('blur', () => afterTurnLabel());
pin.addEventListener('keydown', e => {
 if (e.key === 'Enter') { const n = parseInt(pin.value, 10); if (n) go.to(n); pin.blur(); }
 if (e.key === 'Escape') pin.blur();
});
function afterTurnLabel() { const lo = S.visible[0], hi = S.visible.at(-1); pin.value = lo === hi ? pl(lo) : `${pl(lo)}–${hi}`; }

/* ——— eylemler ——— */
const THEMES = ['gece', 'gunduz', 'deniz'], THEME_NAMES = {gece: 'Gece', gunduz: 'Gündüz', deniz: 'Deniz'};
function applyTheme() {
 document.documentElement.dataset.theme = S.theme;
 $('meta[name="theme-color"]').content = {gece: '#0e1c18', gunduz: '#ece8df', deniz: '#3c7378'}[S.theme];
}
function applyHot() { app.classList.toggle('hide-hot', !S.hot); $('#hotspotBtn').setAttribute('aria-pressed', S.hot); }
function applyView() {
 const ic = S.single ? 'i-double' : 'i-single';
 $('#viewBtn use').setAttribute('href', '#' + ic);
 $('#viewBtn').setAttribute('aria-label', S.single ? 'Çift sayfa görünümü' : 'Tek sayfa görünümü');
}
const ACT = {
 forward: () => go.forward(), back: () => go.back(), start: () => go.to(FIRST), end: () => go.to(LAST),
 goto: el => { go.to(+el.dataset.page); if (innerWidth < 900) closePanel(); },
 panel: el => { const t = el.dataset.tab; ($('#panel').classList.contains('open') && S.tab === t) ? closePanel() : openPanel(t); },
 'panel-close': closePanel,
 bookmark: toggleMark,
 theme: () => { S.theme = THEMES[(THEMES.indexOf(S.theme) + 1) % THEMES.length]; store.set('theme', S.theme); applyTheme(); toast(`Arka plan: ${THEME_NAMES[S.theme]}`); },
 help: openHelp, offline: openOffline,
 zoom: () => lensOpen('hand'), draw: () => lensOpen('pen'),
 hotspots: () => { S.hot = !S.hot; store.set('hot', S.hot); applyHot(); toast(S.hot ? 'Etkileşim düğmeleri görünüyor' : 'Etkileşim düğmeleri gizlendi · sayfa yalın'); },
 auto: () => toggleAuto(),
 view: () => {
  S.view = S.single ? 'double' : 'single';
  store.set('view', S.view); build(); applyView();
  if (S.single !== (S.view === 'single')) toast('Ekran çift sayfa için dar; tek sayfa gösteriliyor.');
 },
 sound: () => { S.sound = !S.sound; store.set('sound', S.sound); $('#soundBtn').setAttribute('aria-pressed', S.sound); $('#soundBtn use').setAttribute('href', S.sound ? '#i-sound' : '#i-mute'); if (S.sound) flipSound(); },
 fullscreen: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}),
 practice: el => openPractice(+el.dataset.page),
 'unit-quiz': () => { closePanel(); openUnitQuiz(); },
 'modal-close': () => closeModal(),
 'media-open': el => {
  const r = resById.get(el.dataset.res); if (!r) return;
  if (innerWidth < 900) closePanel();
  if (!S.visible.includes(r.page)) go.to(r.page);
  setTimeout(() => openResource(r.id), S.visible.includes(r.page) ? 0 : 650);
 },
 mfilter: el => { S.mediaFilter = el.dataset.f; renderPanel(); },
 card: el => el.classList.toggle('flip'),
 'cards-shuffle': () => { const c = $('.cards'); [...c.children].sort(() => Math.random() - .5).forEach(x => c.append(x)); },
 'cards-reset': () => { const all = $$('.wc'), any = all.some(x => !x.classList.contains('flip')); all.forEach(x => x.classList.toggle('flip', any)); },
 'note-add': () => {
  const t = $('#noteText').value.trim(); if (!t) return $('#noteText').focus();
  S.notes.push({id: Date.now().toString(36), page: S.visible[0], text: t, t: Date.now()}); store.set('notes', S.notes); renderPanel(); toast('Not kaydedildi');
 },
 'note-del': el => { S.notes = S.notes.filter(n => n.id !== el.dataset.id); store.set('notes', S.notes); renderPanel(); },
 'pl-toggle': () => audio.paused ? audio.play() : audio.pause(),
 'pl-back': () => audio.currentTime = Math.max(0, audio.currentTime - 5),
 'pl-fwd': () => audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5),
 'pl-loop': () => { audio.loop = !audio.loop; $('#plLoop').setAttribute('aria-pressed', audio.loop); },
 'pl-rate': () => { S.rateIdx = ((S.rateIdx || 0) + 1) % rates.length; audio.playbackRate = rates[S.rateIdx]; $('#plRate').textContent = String(rates[S.rateIdx]).replace('.', ',') + '×'; },
 'pl-close': closePlayer,
 tool: el => lensTool(el.dataset.tool),
 color: el => { L.color = el.dataset.c; if (L.tool !== 'pen' && L.tool !== 'marker') L.tool = 'pen'; lensTool(L.tool); },
 'ink-undo': inkUndo, 'ink-clear': inkClear,
 'lens-in': () => lensZoom(L.s * 1.35), 'lens-out': () => lensZoom(L.s / 1.35), 'lens-close': lensClose,
 'lens-forward': () => lensTurn(1), 'lens-back': () => lensTurn(-1),
 'f-close': closeFocus, 'f-next': () => fStep(1), 'f-prev': () => fStep(-1), 'f-undo': fUndo, 'f-clear': fClear,
 ftool: el => fTool(el.dataset.ftool),
 fcolor: el => { F.color = el.dataset.c; if (F.tool !== 'pen' && F.tool !== 'marker') F.tool = 'pen'; fTool(F.tool); }
};
let downAt = null;
host.addEventListener('pointerdown', e => { downAt = {x: e.clientX, y: e.clientY}; }, true);
document.addEventListener('click', e => {
 const ex = e.target.closest('#bookHost .ex');
 if (ex && !e.target.closest('.hs')) {
  const moved = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8;
  if (!moved && !stage.classList.contains('flipping')) openFocus(+ex.closest('.pg').dataset.num, +ex.dataset.ex);
  return;
 }
 const hs = e.target.closest('.hs');
 if (hs) { e.preventDefault(); tip.hidden = true; return openResource(hs.dataset.res); }
 const tab = e.target.closest('.panel-tabs [role="tab"]');
 if (tab) { S.tab = tab.dataset.tab; return renderPanel(); }
 const el = e.target.closest('[data-act]');
 if (el && ACT[el.dataset.act]) { ACT[el.dataset.act](el); }
});
host.addEventListener('dblclick', e => { if (!e.target.closest('.hs')) lensOpen('hand'); });
host.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); lensOpen('hand'); } }, {passive: false});

/* klavye */
const typing0 = e => !!e.target.matches?.('input,textarea,[contenteditable]');
document.addEventListener('keydown', e => {
 const typing = !!e.target.matches?.('input,textarea,[contenteditable]');
 if (F.open && $('#modal').hidden && !typing0(e)) {
  const k = e.key.toLowerCase();
  if (e.key === 'Escape') return closeFocus();
  if (e.key === 'ArrowLeft') return fStep(1);
  if (e.key === 'ArrowRight') return fStep(-1);
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); return fUndo(); }
  const t = {p: 'pen', l: 'laser', m: 'marker', e: 'eraser'}[k];
  if (t && !e.ctrlKey && !e.metaKey) return fTool(t);
  return;
 }
 if (e.key === 'Escape') {
  if (!$('#modal').hidden) return closeModal();
  if (L.open) return lensClose();
  if ($('#panel').classList.contains('open')) return closePanel();
  return;
 }
 if (typing) return;
 if (L.open) {
  if (e.key === ' ') { L.space = true; $('#lensView').classList.remove('draw'); e.preventDefault(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); inkUndo(); }
  if (e.key === '+' || e.key === '=') lensZoom(L.s * 1.35);
  if (e.key === '-') lensZoom(L.s / 1.35);
  if (e.key === 'ArrowLeft') lensTurn(1);
  if (e.key === 'ArrowRight') lensTurn(-1);
  return;
 }
 if (e.ctrlKey || e.metaKey || e.altKey) {
  if (e.key.toLowerCase() === 'f' && $('#modal').hidden) { e.preventDefault(); openPanel('search'); }
  return;
 }
 if (!$('#modal').hidden) return;
 const k = e.key;
 const map = {
  ArrowLeft: go.forward, PageDown: go.forward, ArrowRight: go.back, PageUp: go.back,
  Home: () => go.to(FIRST), End: () => go.to(LAST),
  '/': () => openPanel('search'), g: () => ACT.panel({dataset: {tab: 'pages'}}), i: () => ACT.panel({dataset: {tab: 'toc'}}),
  m: () => ACT.panel({dataset: {tab: 'media'}}), b: toggleMark, z: () => lensOpen('hand'), p: () => lensOpen('pen'),
  h: ACT.hotspots, d: ACT.view, f: ACT.fullscreen, '?': openHelp,
  ' ': () => { if (!$('#player').hidden) ACT['pl-toggle'](); else go.forward(); }
 };
 const fn = map[k] || map[k.toLowerCase?.()];
 if (fn) { e.preventDefault(); fn(); }
});
document.addEventListener('keyup', e => { if (e.key === ' ' && L.open) { L.space = false; lensTool(L.tool); } });

/* tam ekranda boşta arayüzü gizle */
let idleT;
const wake = () => { app.classList.remove('idle'); clearTimeout(idleT); if (document.fullscreenElement) idleT = setTimeout(() => { if (!$('#panel').classList.contains('open') && $('#modal').hidden && !L.open) app.classList.add('idle'); }, 2800); };
['pointermove', 'pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, wake, {passive: true}));
document.addEventListener('fullscreenchange', wake);

/* yardım */
function openHelp() {
 const leg = ['audio', 'video', 'practice', 'game', 'assessment', 'external'].map(k => `<li><i class="k-${k}">${icon(KIND[k].icon)}</i>${KIND[k].name}</li>`).join('');
 openModal({kind: 'quiz', kicker: 'Kullanım rehberi', title: 'Kitabı nasıl kullanırım?', width: Math.min(820, innerWidth - 40), body: `<div class="help">
  <div><h3>Sayfa çevirme</h3><ul><li>Sayfa köşesini tutup sürükle</li><li>Kitap sağdan sola okunur: <kbd>←</kbd> sonraki, <kbd>→</kbd> önceki</li><li>Alttaki çubukla hızlıca kaydır</li><li>Sayfa numarasına tıkla, yaz, <kbd>Enter</kbd></li></ul></div>
  <div><h3>Sayfadaki düğmeler</h3><ul>${leg}</ul></div>
  <div><h3>Kısayollar</h3><ul><li><kbd>Z</kbd> yakınlaştır · <kbd>P</kbd> kalem</li><li><kbd>/</kbd> ara · <kbd>G</kbd> sayfalar · <kbd>I</kbd> içindekiler</li><li><kbd>M</kbd> medya · <kbd>B</kbd> ayraç · <kbd>H</kbd> düğmeleri gizle</li><li><kbd>D</kbd> tek/çift sayfa · <kbd>F</kbd> tam ekran</li><li><kbd>Boşluk</kbd> sesi duraklat</li></ul></div>
  <div><h3>Akıllı tahtada</h3><ul><li>Çift dokun: sayfayı büyüt</li><li>Kalemle sayfanın üstüne yaz; çizimler kaydedilir</li><li>Tam ekranda araçlar kendiliğinden gizlenir</li><li>Notlar, ayraçlar ve puanlar bu cihazda saklanır</li></ul></div>
 </div>`});
}

/* ——— önbellek, ön yükleme ve çevrimdışı kayıt ——— */
const CACHE = 'arapca9-kitap';
const canCache = 'caches' in window && location.protocol.startsWith('http');
if ('serviceWorker' in navigator && canCache) navigator.serviceWorker.register('sw.js').catch(() => {});
let listP = null;
const fileList = () => listP ||= fetch('offline-files.json', {cache: 'no-cache'}).then(r => r.json()).catch(() => null);
const absKey = p => new URL(p, location.href).href.split(/[?#]/)[0];
const lowData = () => navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || '');

/* açık sayfanın etkinliklerini boşta indirip ısıt: tıklanınca önbellekten açılır */
const warmed = new Set();
async function warm(paths) {
 if (lowData()) return;
 for (const p of paths) {
  if (warmed.has(p)) continue; warmed.add(p);
  await new Promise(r => (window.requestIdleCallback || setTimeout)(r, {timeout: 1500}));
  try { await (await fetch(p)).arrayBuffer(); } catch {}
 }
}
let warmT;
function warmVisible() {
 clearTimeout(warmT);
 warmT = setTimeout(async () => {
  const list = await fileList(); if (!list) return;
  const ids = S.visible.flatMap(n => (resByPage.get(n) || []).map(activityOf).filter(Boolean).map(a => a.id));
  warm([...list.shared, ...ids.flatMap(id => list.boot[id] || [])]);
 }, 1200);
}

/* çevrimdışı kayıt penceresi */
const OFF = {running: false, stop: false, prompt: null};
addEventListener('beforeinstallprompt', e => { e.preventDefault(); OFF.prompt = e; });
const mb = b => (b / 1048576).toLocaleString('tr-TR', {maximumFractionDigits: b < 10485760 ? 1 : 0}) + ' MB';
async function offlineState() {
 const list = await fileList();
 if (!list || !canCache) return {list, have: new Set()};
 const c = await caches.open(CACHE);
 return {list, have: new Set((await c.keys()).map(r => r.url))};
}
function markOffline(done) {
 $('#offlineBtn').setAttribute('aria-pressed', !!done);
 $('#offlineBtn use').setAttribute('href', done ? '#i-saved' : '#i-save');
 $('#offlineBtn').title = done ? 'Kitap bu cihazda kayıtlı · internetsiz açılır' : 'Çevrimdışı kaydet: internetsiz kullan';
}
async function openOffline() {
 const box = document.createElement('div'); box.className = 'offline';
 openModal({kind: 'document', kicker: 'Çevrimdışı kullanım', title: 'Kitabı bu cihaza kaydet', body: box, narrow: true});
 if (!canCache) { box.innerHTML = `<p class="off-lead">Bu kopya bir dosyadan açılmış. Çevrimdışı kayıt için kitabı internet adresinden aç.</p>`; return; }
 box.innerHTML = `<div class="empty"><div class="spin"></div>Hesaplanıyor…</div>`;
 const {list, have} = await offlineState();
 if (!list) { box.innerHTML = `<p class="off-lead">Dosya listesi alınamadı. İnternet bağlantısını kontrol edip yeniden dene.</p>`; return; }
 const missing = list.files.filter(([p]) => !have.has(absKey(p)));
 const haveBytes = list.total - missing.reduce((s, [, b]) => s + b, 0);
 const est = await navigator.storage?.estimate?.().catch(() => null);
 const free = est ? est.quota - est.usage : null;
 const done = !missing.length;
 box.innerHTML = `
  <p class="off-lead">${done ? 'Kitabın tamamı bu cihazda kayıtlı. İnternet olmadan da açılır; sesler, videolar ve etkinlikler dahil.' : 'Bir kez kaydet, sonra internet olmadan da aç. Akıllı tahtada, dizüstünde ya da tablette bir kerelik iş.'}</p>
  <div class="off-stats">
   <div><b>${mb(list.total)}</b><small>Kitabın tamamı</small></div>
   <div><b>${mb(haveBytes)}</b><small>Bu cihazda</small></div>
   <div><b>${list.files.length.toLocaleString('tr-TR')}</b><small>Dosya</small></div>
  </div>
  <div class="off-bar"><i style="width:${haveBytes / list.total * 100}%"></i></div>
  <div class="off-status" id="offStatus">${done ? '✓ Hazır' : `${mb(list.total - haveBytes)} indirilecek${free != null && free < list.total - haveBytes ? ' · <span class="warn">cihazda yer az görünüyor</span>' : ''}`}</div>
  <div class="off-actions">
   ${done ? `<button class="btn ghost" data-off="clear">${icon('i-trash')}<span>Kayıtlı kopyayı sil</span></button>` : `<button class="btn" data-off="start">${icon('i-save')}<span>${haveBytes ? 'Kaydetmeye devam et' : 'Kitabı kaydet'}</span></button>`}
   ${OFF.prompt ? `<button class="btn ghost" data-off="install">${icon('i-expand')}<span>Uygulama olarak ekle</span></button>` : ''}
  </div>
  <ul class="off-notes">
   <li>Kayıt sürerken kitabı kullanmaya devam edebilirsin; pencereyi kapatırsan kayıt durur, sonra kaldığı yerden sürer.</li>
   <li>Chrome ya da Edge'de adres çubuğundaki “yükle” simgesiyle kitabı masaüstüne ve tahtanın ana ekranına uygulama olarak ekleyebilirsin.</li>
   <li>Notlar, ayraçlar, çizimler ve puanlar yalnızca bu cihazda saklanır.</li>
  </ul>`;
 box.onclick = async e => {
  const b = e.target.closest('[data-off]'); if (!b) return;
  if (b.dataset.off === 'start') runOffline(list, missing, haveBytes, box);
  if (b.dataset.off === 'stop') OFF.stop = true;
  if (b.dataset.off === 'install') { OFF.prompt.prompt(); OFF.prompt = null; }
  if (b.dataset.off === 'clear') { await caches.delete(CACHE); markOffline(false); store.set('offline', null); toast('Kayıtlı kopya silindi'); openOffline(); }
 };
 if (OFF.running) box.querySelector('[data-off="start"]')?.replaceWith(Object.assign(document.createElement('span'), {className: 'off-status', textContent: 'Kayıt sürüyor…'}));
}
async function runOffline(list, missing, haveBytes, box) {
 if (OFF.running) return;
 OFF.running = true; OFF.stop = false;
 navigator.storage?.persist?.().catch(() => {});
 const c = await caches.open(CACHE);
 const actions = box.querySelector('.off-actions');
 actions.innerHTML = `<button class="btn ghost" data-off="stop">Durdur</button>`;
 let got = haveBytes, n = 0, fail = 0, i = 0;
 const paint = () => {
  if (!box.isConnected) return;
  box.querySelector('.off-bar i').style.width = got / list.total * 100 + '%';
  box.querySelector('#offStatus').textContent = `${mb(got)} / ${mb(list.total)} · ${n.toLocaleString('tr-TR')} / ${missing.length.toLocaleString('tr-TR')} dosya`;
 };
 await Promise.all(Array.from({length: 6}, async () => {
  while (i < missing.length && !OFF.stop && !$('#modal').hidden) {
   const [p, size] = missing[i++];
   try {
    const r = await fetch(p, {headers: {'x-a9-save': '1'}, cache: 'no-cache'});
    if (!r.ok) throw 0;
    await c.put(absKey(p), r);
    got += size;
   } catch { fail++; }
   n++; paint();
  }
 }));
 OFF.running = false;
 const complete = !fail && n === missing.length;
 if (complete) { store.set('offline', {version: list.version, t: Date.now()}); markOffline(true); toast('Kitap kaydedildi · artık internetsiz açılır'); }
 else if (fail) toast(`${fail} dosya indirilemedi. Yeniden deneyince kalanlar iner.`);
 if (box.isConnected) openOffline();
}
(async () => {
 const saved = store.get('offline', null); if (!saved) return;
 markOffline(true);
 const list = await fileList();
 if (list && list.version !== saved.version) {
  markOffline(false);
  toast('Kitabın yeni sürümü var', {label: 'Güncelle', fn: openOffline}, 6000);
 }
})();

/* ——— açılış ——— */
function start() {
 applyTheme(); applyHot();
 $('#soundBtn').setAttribute('aria-pressed', S.sound); $('#soundBtn use').setAttribute('href', S.sound ? '#i-sound' : '#i-mute');
 const hash = /#p=(\d+)/.exec(location.hash), last = store.get('last', FIRST);
 const startNum = clamp(hash ? +hash[1] : last, FIRST, LAST);
 // ilk açılışta açık sayfaların görsellerini bekle
 const first = [startNum, startNum % 2 ? startNum - 1 : startNum + 1].filter(n => n >= FIRST && n <= LAST);
 let done = 0; const need = first.length + 1;
 const tick = () => { done++; $('#splashFill').style.width = done / need * 100 + '%'; if (done >= need) reveal(); };
 first.forEach(n => { const im = new Image(); im.onload = im.onerror = tick; im.src = pageByNum.get(n).image; loaded.add(n); });
 (document.fonts?.ready || Promise.resolve()).then(tick);
 let shown = false;
 function reveal() {
  if (shown) return; shown = true;
  $('#splashStatus').textContent = 'Hazır';
  build(idxOf(startNum)); applyView();
  setTimeout(() => {
   app.classList.add('ready'); $('#splash').classList.add('gone');
   if (!hash && last !== FIRST && last > FIRST) toast(`Kaldığın yerden devam: Sayfa ${last}`, {label: 'Başa dön', fn: () => go.to(FIRST)});
   else if (!store.get('welcomed', false)) { toast('Sayfadaki renkli düğmeler: ses, video ve etkinlikler. Köşeden tutup sayfayı çevir.', {label: 'Rehber', fn: openHelp}, 5200); store.set('welcomed', true); }
  }, 30);
 }
 setTimeout(reveal, 7000);
}
addEventListener('hashchange', () => { const m = /#p=(\d+)/.exec(location.hash); if (m && !S.visible.includes(+m[1])) go.to(+m[1]); });
start();
})();
