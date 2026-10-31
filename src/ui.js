'use strict';
/* Interface: top bar, build bar, placing, sheets and messages. Plain HTML over the map. */

/* ---------- hand-cut edges for the interface: bark cloth and mats are never quite straight, and no button is a perfect circle */
function edgeURL(seed, fill, stroke = '#3E2416', sw = 1.6, round = false){
  const r = rng(seed), P = [];
  if (round) P.push(...ring(50, 50, 45, 45, 11, seed, .14));
  else {
    for (let i = 0; i <= 8; i++) P.push({x:4 + i * 24, y:4 + (r() - .5) * 5});
    for (let i = 1; i <= 3; i++) P.push({x:196 + (r() - .5) * 2.4, y:4 + i * 23});
    for (let i = 8; i >= 0; i--) P.push({x:4 + i * 24, y:96 + (r() - .5) * 5});
    for (let i = 3; i >= 1; i--) P.push({x:4 + (r() - .5) * 2.4, y:4 + i * 23});
  }
  const d = smooth(P).d, svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round ? '100 100' : '200 100'}" preserveAspectRatio="none"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
(function paintEdges(){
  const set = (k, v) => document.documentElement.style.setProperty(k, v);
  [11, 23, 37].forEach((sd, i) => set('--e' + (i + 1), edgeURL(sd, '#F6EDD8')));
  set('--eok', edgeURL(41, '#F1EFD8', '#3E7A3A', 2)); set('--eneed', edgeURL(53, '#F6E3C4', '#A84A2C', 2));
  set('--edark', edgeURL(61, '#2B1D14', '#1A110B')); set('--eochre', edgeURL(67, '#A84A2C', '#2B1D14', 1.8)); set('--eturm', edgeURL(71, '#F3D9A0', '#A84A2C', 2));
  set('--ecream', edgeURL(79, '#F4ECD8', '#3E2416', 1.3)); set('--efree', edgeURL(109, 'rgba(246,237,216,.45)', 'rgba(62,36,22,.45)', 1.2));
  set('--sok', edgeURL(83, '#3E7A3A', '#2B4A26', 1)); set('--slow', edgeURL(89, '#F3D9A0', '#8A6440', 1)); set('--sout', edgeURL(97, '#A84A2C', '#6B2A18', 1));
  for (let i = 0; i < 4; i++) set('--tag' + i, edgeURL(101 + i * 13, '#F6EDD8', '#3E2416', 2, true));
  const cs = document.querySelector('#compass svg'); if (cs){ cs.setAttribute('viewBox', '0 0 56 56'); cs.innerHTML = compassArt(); }
})();

/* ---------- top bar */
let lastStock = {};
function updateHUD(){
  const I = isl(active);
  $('isleName').textContent = I.name; $('isleType').textContent = (I.volcano ? 'Vulkan' : I.type === 'hoch' ? 'Hohe Insel' : 'Atoll') + ' · ' + LEVEL_NAMES[I.lvl || 1];
  $('manaBtn').hidden = mana <= 0 && !feastsOpen();
  $('manaNum').textContent = Math.floor(mana);
  const S = seasonOf(); $('seasonUse').setAttribute('href', '#' + SEASON_ICON[S.id]); $('seasonTxt').textContent = `${moonOf() + 1}. Mond`;
  $('seasonBtn').setAttribute('aria-label', `${S.n}, ${moonOf() + 1}. Mond. ${festivalTime() ? 'Festzeit.' : `Fest der Plejaden in etwa ${minutes(untilFestival())} Minuten.`} Tippen zeigt den Kalender.`);
  $('popNum').textContent = I.pop; $('popCap').textContent = '/' + houseCap(I);
  showWind();
  const free = staffOf(I).free; $('idleNum').textContent = free; $('idleBtn').classList.toggle('zero', !free); $('idleBtn').setAttribute('aria-label', `${free} ohne Arbeit. Tippen zeigt sie nacheinander.`);
  // the dot next to the people count: green while the village grows, yellow when the houses are full, red when something is missing
  const nd = needsOf(I), st = nd.missing.length ? 'out' : nd.full ? 'full' : 'ok';
  $('popDot').className = 'dot ' + st;
  $('popBtn').setAttribute('aria-label', `${I.pop} Bewohner, Platz für ${nd.cap}. ${growText(I, nd)} Tippen zeigt den Bedarf.`);
  // the goods row shows what matters here: all food as one, wood, then whatever is stored, made or needed, at most seven
  const shown = ['essen', 'holz', ...GOODS.filter(k => !FOODS.includes(k) && k !== 'holz' && ((I.stock[k] || 0) > 0 || makeRate(I, k) > 0 || nd.list.some(n => n.k === k)))].slice(0, 7);
  const ul = $('goods'); if (ul.dataset.keys !== shown.join()){ ul.dataset.keys = shown.join(); ul.innerHTML = shown.map(k => `<span class="g" data-k="${k}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span></span></span>`).join(''); }
  for (const li of ul.children){ const k = li.dataset.k, v = haveOf(I, k); li.querySelector('span').textContent = v; li.classList.toggle('zero', !v);
    if (lastStock.isl === active && v >= (lastStock[k] || 0) + 2){ li.classList.remove('up'); void li.offsetWidth; li.classList.add('up'); } }
  lastStock = {isl:active, ...I.stock, essen:haveOf(I, 'essen')};
  $('vitalBtn').innerHTML = vitalLine(I);
  $('storeBtn').setAttribute('aria-label', 'Lager: ' + shown.map(k => `${GN[k]} ${haveOf(I, k)}`).join(', ') + '. Tippen zeigt alles.');
  for (const btn of $('buildList').children){ const k = btn.dataset.kind; if (k) btn.classList.toggle('poor', !canPay(I, costOf(k, I))); }
}
/* Two menus: what the village needs, with paths at the end, and what only adorns it */
let buildTab = 'bau';
function renderBuildBar(){
  const I = isl(active);
  $('buildWhere').textContent = 'auf ' + I.name;
  const fleet = own().length > 0 || routes.length > 0;
  $('tradeBtn').hidden = !fleet; $('tradeBtn').previousElementSibling.toggleAttribute('hidden', !fleet);
  const can = k => KINDS[k].on.includes(I.type) && unlocked(k) && (!KINDS[k].dep || depsOf(I, KINDS[k].dep).length), deco = ORDER.filter(k => DECO.includes(k) && can(k));
  if (!deco.length) buildTab = 'bau';
  $('tabDeco').hidden = !deco.length; $('tabDeco').classList.toggle('new', deco.some(k => newKinds.has(k)));
  $('tabBau').setAttribute('aria-pressed', buildTab === 'bau'); $('tabDeco').setAttribute('aria-pressed', buildTab === 'deco');
  const list = buildTab === 'deco' ? deco : ORDER.filter(k => !DECO.includes(k) && can(k));
  $('buildList').innerHTML = list.map(k => { const K = KINDS[k];
    return `<button type="button" class="bbtn${newKinds.has(k) ? ' new' : ''}" data-kind="${k}" aria-pressed="false" aria-label="${K.n}, kostet ${costText(costOf(k, I))}"><svg viewBox="${K.vb}" aria-hidden="true">${iconMarkup(k)}</svg><span>${K.s}</span></button>`; }).join('') +
    (buildTab === 'bau' ? `<button type="button" class="bbtn" data-road="1" aria-pressed="false" aria-label="Weg anlegen, kostet nichts"><svg viewBox="${KINDS.weg.vb}" aria-hidden="true">${iconMarkup('weg')}</svg><span>Weg</span></button>` +
      (I.roads && I.roads.length ? `<button type="button" class="bbtn" data-road="cut" aria-pressed="false" aria-label="Wege entfernen"><svg viewBox="${KINDS.weg.vb}" aria-hidden="true">${iconMarkup('weg')}<path d="M-6-4.5L6 4.5M6-4.5L-6 4.5" stroke="#A84A2C" stroke-width="2.2" stroke-linecap="round"/></svg><span>Weg weg</span></button>` : '') : '');
  updateHUD();
}
function renameIsland(I, v){
  v = v.replace(/\s+/g, ' ').trim().slice(0, 18); if (!v){ toast('Ohne Namen geht es nicht.', 2000, false); return; }
  if (!I.name0) I.name0 = I.name; I.name = v; I.custom = v !== I.name0;
  closeSheet(); invalidate(true); updateHUD(); renderBuildBar(); save(); toast(`Die Insel heißt jetzt ${v}.`, 2400);
}
/* The compass: the streamer points where the wind blows, turns slowly the short way round, and flutters as hard as it blows */
let vaneAt = null;
function showWind(){
  const W = wind(), v = document.querySelector('#compass .vane'), C = $('compass'); if (!v) return;
  vaneAt = vaneAt == null ? W.from : vaneAt + ((W.from - vaneAt + 540) % 360 - 180);
  v.style.transform = `rotate(${vaneAt.toFixed(1)}deg)`;
  C.style.setProperty('--amp', (3 + W.str * 11).toFixed(1) + 'deg'); C.style.setProperty('--gust', (1.7 - W.str * 1.3).toFixed(2) + 's');
  C.querySelector('span').textContent = 'aus ' + W.ab; C.setAttribute('aria-label', `Wind aus ${W.dir}, ${W.word}`);
}
/* The idle button: one after the other, the people without work */
let idleNo = 0;
function showIdle(){
  const I = isl(active), list = walkers.filter(w => w.isl === I.id && w.role === 'idle');
  if (!list.length){ toast('Alle, die arbeiten können, haben Arbeit.', 2600, false); return; }
  const n = idleNo++ % list.length, w = list[n]; markW = w; markUntil = performance.now() + 6000; flyTo(w.x, w.y, Math.max(cam.z, 2.2));
  toast(`${w.name} hat keine Arbeit, ${n + 1} von ${list.length}. Ein neuer Arbeitsplatz gibt Arbeit, oder mehr Plätze in einem Gebäude.`, 3600, false);
}
function villageCenter(I){
  const hs = I.buildings.filter(b => KINDS[b.kind].roof); if (!hs.length) return I.anchor || I.center;
  return {x:hs.reduce((t, b) => t + b.x, 0) / hs.length, y:hs.reduce((t, b) => t + b.y, 0) / hs.length};
}
function setActive(id){ if (active === id || !isl(id).settled) return; active = id; renderBuildBar(); }
/* ---------- messages: they unroll from the conch shell on the right like a strip of bark cloth and roll up again.
   What happens in the world is kept, and the shell unfolds the last ones. Quick answers to a tap are not kept. */
let toastT = 0, news = [], unread = 0;
function toast(msg, ms = 2600, keep = true){
  if (awayQuiet) return;
  if (keep){ news.unshift({msg, at:Date.now()}); if (news.length > 40) news.length = 40; }
  if (newsOpen()){ if (keep){ renderNews(); return; } }
  else if (keep){ unread++; newsBadge(); }
  const t = $('toast'); t.textContent = msg; t.hidden = false; t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
  clearTimeout(toastT); toastT = setTimeout(foldToast, ms + 600);
}
function foldToast(){ const t = $('toast'); t.classList.remove('open'); clearTimeout(toastT); toastT = setTimeout(() => { if (!t.classList.contains('open')) t.hidden = true; }, 420); }
const newsOpen = () => !$('newsList').hidden;
function newsBadge(){ const n = $('newsNum'); n.hidden = !unread; n.textContent = unread > 9 ? '9+' : unread; $('newsBtn').setAttribute('aria-label', unread ? `Nachrichten, ${unread} neu` : 'Nachrichten'); }
const ago = at => { const s = (Date.now() - at) / 1000; return s < 60 ? 'eben' : s < 3600 ? `vor ${Math.floor(s / 60)} Min` : `vor ${Math.floor(s / 3600)} Std`; };
const esc = t => t.replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
function renderNews(){ $('newsList').innerHTML = `<p class="cap">Nachrichten</p>` + (news.length ? `<ul>${news.map(n => `<li><small>${ago(n.at)}</small>${esc(n.msg)}</li>`).join('')}</ul>` : '<p class="empty">Noch ist nichts geschehen.</p>'); }
function openNews(){
  const L = $('newsList'); unread = 0; newsBadge(); foldToast(); renderNews(); L.scrollTop = 0;
  L.hidden = false; void L.offsetWidth; L.classList.add('open'); $('newsBtn').setAttribute('aria-expanded', 'true');
}
function closeNews(){
  const L = $('newsList'); if (L.hidden) return; L.classList.remove('open'); $('newsBtn').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!L.classList.contains('open')) L.hidden = true; }, 340);
}
$('newsBtn').addEventListener('click', () => { if (newsOpen() && $('newsList').classList.contains('open')) closeNews(); else openNews(); });
$('toast').addEventListener('click', () => { if (news.length && news[0].msg === $('toast').textContent) openNews(); else foldToast(); });

/* ---------- placing and moving */
function ghostRender(){
  if (!placing || placing.road || placing.unroad){ requestDraw(); return; }
  const I = isl(placing.island), msg = check(placing.kind, I, placing.x, placing.y, placing.moveId), ok = !msg;
  if (placing.kind === 'steg' && ok) placing.v = {...placing.v, rot:seaward(I, placing)};   // the jetty points to the water
  placing.ok = ok; placing.msg = msg;
  // workshops that need plants close by can stand anywhere, but the bar says whether they will run
  const K = KINDS[placing.kind], n = K.near ? nearCount(I, K.near.kind, placing.x, placing.y, K.near.r) : 0, few = K.near && n < K.near.n;
  const tn = K.trees ? treesNear(I, placing.x, placing.y, K.trees.r).length : 0, bare = K.trees && tn < 3;
  const m = $('placeMsg'); m.textContent = !ok ? msg : few ? `Nur ${n} von ${K.near.n} ${NEAR_PL[K.near.kind]} in der Nähe, so steht sie still.` : K.near ? `Passt, ${n} ${NEAR_PL[K.near.kind]} in der Nähe.` :
    bare ? (tn ? `Nur ${tn} Bäume in Reichweite.` : 'Hier stehen keine Bäume in Reichweite.') : K.trees ? `Passt, ${tn} Bäume in Reichweite.` : mode === 'move' ? 'Passt.' : 'Passt. Tippe auf Bauen.';
  if (ok && bare) placing.msg = m.textContent;
  // a workplace on an islet where nobody lives needs a dugout from a jetty
  const homes = new Set(I.buildings.filter(b => b.kind === 'haus' && !b.bt).map(b => landOf(I, b))), L = landOf(I, placing);
  const away = ok && I.atoll && K.crew && homes.size && L >= 0 && !homes.has(L), lg = lagoonOf(I), spare = lg.jetties.length * KINDS.steg.serves - lg.need.length;
  if (away && spare <= 0) m.textContent = 'Auf diesem Motu wohnt niemand. Ohne Kanusteg kommt keiner zur Arbeit.';
  m.classList.toggle('bad', !ok || few || bare || (away && spare <= 0));
  $('placeOk').disabled = !ok || (mode === 'place' && !canPay(I, costOf(placing.kind, I)));
  requestDraw();
}
function startPlace(kind){
  const I = isl(active), K = KINDS[kind];
  if (K.max && I.buildings.filter(b => b.kind === kind).length >= K.max){ toast(`Nur ein ${K.n} pro Insel.`, 2600, false); return; }
  const c = costOf(kind, I); if (!canPay(I, c)){ toast(`Zu wenig ${lacking(I, c)}.`, 2600, false); return; }
  closeSheet(); selectedId = null; invalidate();
  mode = 'place'; placing = {kind, island:I.id, x:I.center.x, y:I.center.y, v:variant(kind)};
  showPlaceBar();
  // close up the new building starts where you look, otherwise next to the village
  const vc = visCenter(), wc = toWorld(vc.sx, vc.sy), near = lod === 'near' && onIsland(I, wc), base = near && !K.dep && !K.near && !K.trees && !K.plants ? wc : startSpot(I, K);
  if (!near) flyTo(base.x, base.y, Math.max(cam.z, 1.6));
  const p = findSpot(I, kind, base) || base; placing.x = p.x; placing.y = p.y; ghostRender();
  for (const b of $('buildList').children) b.setAttribute('aria-pressed', b.dataset.kind === kind ? 'true' : 'false');
}
function startSpot(I, K){
  const vc = villageCenter(I);
  const pick = list => list.reduce((m, q) => Math.hypot(q.x - vc.x, q.y - vc.y) < Math.hypot(m.x - vc.x, m.y - vc.y) ? q : m);
  if (K.dep){ const d = pick(depsOf(I, K.dep)); return {x:d.x + (vc.x - d.x) * .15, y:d.y + (vc.y - d.y) * .15 + 14}; }
  // woodcutters and planters go to the edge of the forest closest to the village
  if ((K.trees || K.plants) && I.trees.some(t => t.st !== 1)){ const t = pick(I.trees.filter(q => q.st !== 1)), d = Math.hypot(vc.x - t.x, vc.y - t.y) || 1; return {x:t.x + (vc.x - t.x) / d * 22, y:t.y + (vc.y - t.y) / d * 22}; }
  // next to the plant that has the most of its kind around it, nearest to the village if several are equal
  // on an atoll, workplaces go on the islet where people live if the plants there are enough; others need a dugout
  const home = new Set(I.buildings.filter(b => b.kind === 'haus' && !b.bt).map(b => landOf(I, b)));
  if (K.near){ let src = I.buildings.filter(b => b.kind === K.near.kind); const local = src.filter(b => home.has(landOf(I, b)) && nearCount(I, K.near.kind, b.x, b.y, K.near.r * .7) >= K.near.n); if (local.length) src = local; if (src.length){
    const score = q => nearCount(I, K.near.kind, q.x, q.y, K.near.r * .7) * 1000 - Math.hypot(q.x - vc.x, q.y - vc.y);
    const c = src.reduce((m, q) => score(q) > score(m) ? q : m); return {x:c.x + 12, y:c.y + 6}; } }
  return vc;
}
/* ---------- laying a path: tap points on the island one after another, tap the last one again to take it back */
function startRoad(){
  const I = isl(active); closeSheet(); selectedId = null; invalidate();
  mode = 'road'; placing = {kind:'weg', road:true, island:I.id, pts:[]};
  $('placeName').textContent = 'Weg'; $('placeIc').setAttribute('viewBox', KINDS.weg.vb); $('placeIc').innerHTML = iconMarkup('weg');
  $('placeOk').textContent = 'Anlegen'; $('placeInfo').textContent = 'Kostet nichts. Auf Wegen gehen die Leute schneller, und sie schmücken das Dorf.';
  $('bottom').hidden = true; $('place').hidden = false; roadMsg(); measure();
  if (lod !== 'near'){ const c = villageCenter(I); flyTo(c.x, c.y, 1.8); }
}
/* Taking paths away: each tap removes the piece of path between two of its points */
function startUnroad(){
  const I = isl(active); closeSheet(); selectedId = null;
  mode = 'unroad'; placing = {kind:'weg', unroad:true, island:I.id};
  $('placeName').textContent = 'Wege entfernen'; $('placeIc').setAttribute('viewBox', KINDS.weg.vb); $('placeIc').innerHTML = iconMarkup('weg');
  $('placeInfo').textContent = 'Tippe auf ein Stück Weg, dann ist es weg. Das Gras wächst wieder darüber.';
  $('placeMsg').textContent = ''; $('placeMsg').classList.remove('bad'); $('placeOk').hidden = true;
  $('bottom').hidden = true; $('place').hidden = false; measure(); requestDraw();
  if (lod !== 'near'){ const c = villageCenter(I); flyTo(c.x, c.y, 1.8); }
}
function roadCut(p){
  const hit = hitRoad(p), el = $('placeMsg');
  if (!hit || hit.id !== placing.island){ el.textContent = 'Hier liegt kein Weg.'; el.classList.add('bad'); return; }
  const I = isl(hit.id), r = I.roads[hit.r], a = r.slice(0, hit.k), b = r.slice(hit.k);
  I.roads.splice(hit.r, 1, ...[a, b].filter(q => q.length > 1)); roadsChanged(I);
  el.textContent = 'Ein Stück Weg ist weg.'; el.classList.remove('bad');
  if (!I.roads.length) endPlace();
}
function roadMsg(bad){
  const pts = placing.pts, n = pts.length, len = pts.reduce((s, p, k) => k ? s + Math.hypot(p.x - pts[k - 1].x, p.y - pts[k - 1].y) : 0, 0), el = $('placeMsg');
  el.textContent = bad || (n ? `${n} ${n === 1 ? 'Punkt' : 'Punkte'}, ${Math.round(len)} Schritte. Den letzten Punkt antippen nimmt ihn zurück.` : 'Tippe auf der Insel, wo der Weg beginnt, dann Punkt für Punkt weiter.');
  el.classList.toggle('bad', !!bad); $('placeOk').disabled = n < 2; requestDraw();
}
function roadTap(p){
  const I = isl(placing.island), pts = placing.pts, last = pts[pts.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < Math.max(6, 16 / cam.z)){ pts.pop(); roadMsg(); return; }
  if (!landAt(I, p)){ roadMsg('Wege gehen nur über Land.'); return; }
  if (last){
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    if (d > 240){ roadMsg('So weit auf einmal geht es nicht. Setze einen Punkt dazwischen.'); return; }
    for (let s = 3; s < d; s += 3) if (!landAt(I, {x:last.x + (p.x - last.x) * s / d, y:last.y + (p.y - last.y) * s / d})){ roadMsg('Dazwischen liegt Wasser.'); return; }
  }
  pts.push({x:fx(p.x), y:fx(p.y)}); roadMsg();
}
function layRoad(){
  if (!placing || !placing.road || placing.pts.length < 2) return false;
  const I = isl(placing.island); (I.roads = I.roads || []).push(placing.pts); placing.pts = []; roadsChanged(I); updateHUD(); renderBuildBar(); return true;
}
function startMove(b){
  const I = islOfB(b.id); closeSheet(); mode = 'move'; placing = {kind:b.kind, island:I.id, x:b.x, y:b.y, v:b.v, moveId:b.id};
  showPlaceBar(); invalidate(); ghostRender(); if (lod === 'far') flyTo(b.x, b.y, 1.6);
}
function showPlaceBar(){
  const K = KINDS[placing.kind], I = isl(placing.island);
  $('placeName').textContent = (mode === 'move' ? 'Versetzen: ' : '') + K.n;
  const secs = Math.round(K.bt * TICK / 1000), c = costOf(placing.kind, I);
  const facts = [Object.keys(c).length ? `Kostet ${costText(c)}` : '', K.plant ? `wächst ${secs} s` : `${secs} s Bauzeit`, K.crew ? `${K.crew} Arbeiter` : ''].filter(Boolean).join(', ');
  $('placeInfo').textContent = mode === 'move' ? 'Ziehen oder woanders hintippen.' : `${facts[0].toUpperCase() + facts.slice(1)}. ${K.info}`;
  $('placeIc').setAttribute('viewBox', K.vb); $('placeIc').innerHTML = iconMarkup(placing.kind);
  $('placeOk').textContent = mode === 'move' ? 'Hier hin' : 'Bauen'; $('placeOk').disabled = false;
  $('bottom').hidden = true; $('place').hidden = false; measure();
}
function endPlace(){
  if (placing && placing.road) layRoad();
  const wasMove = mode === 'move', cut = mode === 'unroad'; mode = 'idle'; placing = null; ghostRender(); $('placeOk').disabled = false; $('placeOk').hidden = false;
  if (cut) renderBuildBar();
  $('place').hidden = true; $('bottom').hidden = false; measure();
  for (const b of $('buildList').children) b.setAttribute('aria-pressed', 'false');
  if (wasMove) invalidate();
}
function confirmPlace(){
  if (placing && placing.road){ if (layRoad()){ toast('Der Weg ist angelegt.', 2000, false); roadMsg(); } return; }
  if (!placing || !placing.ok) return;
  const I = isl(placing.island), K = KINDS[placing.kind];
  if (mode === 'move'){ const b = findB(placing.moveId); if (b){ b.x = fx(placing.x); b.y = fx(placing.y); b.v = placing.v; clearStumps(I, b); } endPlace(); invalidate(); save(); toast(`${K.n} versetzt.`, 2600, false); return; }
  const c = costOf(placing.kind, I); if (!canPay(I, c)){ toast(`Zu wenig ${lacking(I, c)}.`, 2600, false); return; }
  // nothing stands at once: a building site waits for builders, a young plant grows
  pay(I, c); const b = addB(I, placing.kind, placing, placing.v, tick); if (K.bt) b.bt = K.bt; clearStumps(I, b);
  invalidate(); updateHUD(); syncWalkers(); save(); checkQuest();
  const busy = !K.plant && !activeSites(I).includes(b);
  toast(K.plant ? `${K.n} gepflanzt. Sie wächst jetzt.` : busy ? `Baustelle ${K.n}. Sie wartet auf Bauleute.` : `Baustelle ${K.n}. ${SITE_CREW} Bauleute holen Holz und bauen.`, 2600, false);
  if (K.max || !canPay(I, c)){ endPlace(); return; }
  placing.v = variant(placing.kind); const p = findSpot(I, placing.kind, {x:placing.x + K.r * 2.2, y:placing.y}); if (p){ placing.x = p.x; placing.y = p.y; } ghostRender();
}

/* ---------- sheets */
function openSheet(kind, data){ if (kind !== 'ship') endSteer(); sheetKind = kind; sheetData = data; $('sheet').hidden = false; renderSheet(); measure(); }
function closeSheet(){ endSteer(); if (!sheetKind) return; if (sheetKind === 'event') eventNow = null;   // closing an event lets it pass
  sheetKind = null; sheetData = null; $('sheet').hidden = true; selectedId = null; invalidate(); measure(); }
function endSteer(){ if (mode === 'steer'){ mode = 'idle'; selShip = null; requestDraw(); } }
const perMin = v => v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
function growText(I, nd){
  if (nd.missing.length) return `Das Dorf wächst nicht, es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`;
  if (nd.full) return 'Alle Häuser sind voll.';
  return 'Das Dorf wächst.';
}
/* Needs sheet: room first, then every good the people use, with what the island makes per minute */
function needsMarkup(I){
  const nd = needsOf(I), sf = staffOf(I), chip = (cls, t) => `<span class="state ${cls}">${t}</span>`, bar = f => `<span class="mbar"><i style="width:${clamp(f, 0, 1) * 100}%"></i></span>`;
  const ic = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${k ? `<use href="#ic-${k}"/>` : ''}</svg>`, row = (k, n, small, extra, right, cls = '') => `<li class="${cls}">${ic(k)}<span class="nm">${n}<small>${small}</small>${extra || ''}</span>${right || ''}</li>`;
  let h = head(`Übersicht ${I.name}`, `${LEVEL_NAMES[I.lvl || 1]}. ${growText(I, nd)}`);
  // people and who comes next
  h += `<p class="sec">Bewohner</p><ul class="list needs">`;
  const rest = Math.max(0, I.pop - sf.total), kids = Math.round(rest * .6);
  h += row('pop', `${I.pop} Bewohner`, `${sf.total - sf.free} arbeiten, ${sf.free} ohne Arbeit, ${kids} Kinder, ${rest - kids} Alte${I.inside ? `, ${I.inside} davon zu Hause` : ''}. Platz für ${nd.cap}.`, bar(I.pop / Math.max(1, nd.cap)), nd.full ? chip('low', 'voll') : chip('ok', `${nd.cap - I.pop} frei`));
  h += row('pop', 'Zuzug', arrivalText(I, nd), '', nd.growing ? chip('ok', 'wächst') : chip(nd.missing.length ? 'out' : 'low', nd.missing.length ? 'stockt' : 'voll'), nd.growing ? '' : 'need');
  h += `</ul>`;
  // the land: how much forest still holds the soil, and how many fields are worn out
  const fields = I.buildings.filter(b => KINDS[b.kind].soil && !b.bt), tired = fields.filter(b => !b.fallow && (b.soil ?? 1) < .45).length, resting = fields.filter(b => b.fallow).length;
  if (I.type === 'hoch' || fields.length){
    h += `<p class="sec">Land</p><ul class="list needs">`;
    if (I.type === 'hoch' && I.trees0 >= 25){ const f = forestShare(I), e = erosionOf(I);
      h += row('holz', `Wald ${Math.round(f * 100)} %`, e > 1 ? 'Starke Erosion: Felder laugen sehr schnell aus, das Riff verschlammt. Pflanzt Bäume!' : e ? 'Erosion: Felder laugen schneller aus, das Riff leidet. Pflanzt Bäume.' : 'Genug Wald hält den Boden fest.', bar(f / .6), e ? chip(e > 1 ? 'out' : 'low', 'Erosion') : chip('ok', 'hält'), e ? 'need' : ''); }
    if (fields.length) h += row('soil', `${fields.length} Felder`, `${tired ? `${tired} ausgelaugt` : 'Der Boden trägt'}${resting ? `, ${resting} brach` : ''}. Ausgelaugte Felder brachliegen lassen.`, '', tired ? chip('low', 'müde') : chip('ok', 'gut'), tired ? 'need' : '');
    h += `</ul>`;
  }
  // work in the order of the priorities, which can be changed
  h += `<p class="sec">Arbeit nach Reihenfolge</p><ul class="list needs">`;
  // every workplace with its marks, the same as over the buildings, grouped by kind
  const on = presentAt(I), places = {};
  for (const b of I.buildings){
    const sl = slotsOf(I, b, sf, on); if (!sl) continue;
    const cat = b.bt ? 'bau' : b.kind === 'werft' ? 'boot' : catOf(b), g = (places[cat] = places[cat] || {});
    const name = b.bt ? KINDS[b.kind].n : b.kind === 'werft' ? 'Kanu' : b.boat > 0 ? 'Einbaum' : KINDS[b.kind].s;
    (g[name] = g[name] || []).push(...sl);
  }
  const marks = cat => Object.entries(places[cat] || {}).map(([n, sl]) => `<span class="wp">${n} ${sl.sort((a, b) => 'on way free off'.indexOf(a) - 'on way free off'.indexOf(b)).map(pipH).join('')}</span>`).join('');
  prioOf(I).forEach((id, i, pr) => {
    const P = PRIO.find(q => q.id === id), c = sf.cats[id] || {used:0, want:0}, short = c.used < c.want;
    const what = c.want ? `${c.used} von ${c.want}` : id === 'bau' ? 'nichts im Bau' : 'nichts zu tun';
    h += `<li class="${short ? 'need' : ''}"><b class="qty">${i + 1}.</b><span class="nm">${P.n}<small>${what}</small>${places[id] ? `<span class="wps">${marks(id)}</span>` : ''}</span><span class="chips"><button class="chip" type="button" data-act="pup" data-c="${id}" aria-label="${P.n} vor" ${i ? '' : 'disabled'}>▲</button><button class="chip" type="button" data-act="pdown" data-c="${id}" aria-label="${P.n} zurück" ${i < pr.length - 1 ? '' : 'disabled'}>▼</button></span></li>`;
  });
  h += row('', `${sf.free} ohne Arbeit`, sf.free ? 'Sie helfen, sobald es etwas zu tun gibt.' : 'Alle haben zu tun.', '', sf.short ? chip('out', `${sf.short} leer`) : chip('ok', 'reicht'));
  h += `</ul><p class="sub">${pipH('on')} bei der Arbeit ${pipH('way')} auf dem Weg ${pipH('free')} frei ${pipH('off')} zu. Oben bekommt zuerst Leute. Wer baut, fehlt weiter unten.</p>`;
  // food: all of it together, what comes in and goes out and how long it lasts, then each kind of food
  const fn = nd.list.find(x => x.k === 'essen'), net = fn.make - fn.use - fn.work, left = net < 0 ? fn.stock / -net : Infinity;
  h += `<p class="sec">Nahrung</p><ul class="list needs">`;
  h += row('essen', `Nahrung ${fn.stock}`, `Pro Minute +${perMin(fn.make)} und −${perMin(fn.use + fn.work)}. ${net >= 0 ? 'Es wird mehr.' : fn.stock ? `Reicht noch ${left < 1 ? 'weniger als eine Minute' : Math.floor(left) + ' Minuten'}.` : 'Es ist nichts mehr da.'}`, bar(fn.use + fn.work ? fn.make / (fn.use + fn.work) : 1), net >= 0 ? chip('ok', 'reicht') : fn.stock > 0 ? chip('low', left < 1 ? 'knapp' : `${Math.floor(left)} Min`) : chip('out', 'fehlt'), fn.state !== 'ok' ? 'need' : '');
  for (const k of FOODS) h += row(k, GN[k], `+${perMin(makeRate(I, k))} pro Minute${workUse(I, k) ? `, −${perMin(workUse(I, k))} für Werkstätten` : ''}`, '', `<b class="qty">${I.stock[k] || 0}</b>`, 'sub-row');
  h += `</ul>`;
  // the other needs
  const other = nd.list.filter(n => n.k !== 'essen');
  if (other.length){
    h += `<p class="sec">Weiterer Bedarf</p><ul class="list needs">`;
    for (const n of other){
      const st = n.state === 'ok' ? chip('ok', 'reicht') : n.state === 'low' ? chip('low', n.mins < 1 ? 'knapp' : `noch ${Math.floor(n.mins)} Min`) : chip('out', 'fehlt');
      h += row(n.k, GN[n.k], `Bedarf ${perMin(n.use)}${n.work ? ` und ${perMin(n.work)} für Werkstätten` : ''}, Ernte ${perMin(n.make)} pro Minute, im Lager ${n.stock}`, bar(n.use + n.work ? n.make / (n.use + n.work) : 1), st, n.state === 'ok' ? '' : 'need');
    }
    h += `</ul>`;
  }
  const tips = nd.list.filter(n => n.state !== 'ok').map(n => n.N.hint[I.type]);
  if (nd.full) tips.push('Baue Häuser, dann ziehen mehr Menschen zu.');
  if (tips.length) h += `<p class="sub">${tips.join(' ')}</p>`;
  if (nd.list.some(n => n.k === 'essen' && n.state === 'out')) h += `<p class="sub">Ohne Nahrung ziehen nach und nach Leute fort.</p>`;
  if (nd.next && nd.next.lvl < 3) h += `<p class="sub">Ab ${nd.next.from} Bewohnern brauchen die Familien auch ${GN[nd.next.k]}.</p>`;
  if (I.lvl < 3) h += `<p class="sub"><b>Häuptlingsdorf:</b> ab ${CHIEF.pop} Bewohnern, Ansehen ${CHIEF.mana} (jetzt ${Math.floor(mana)}) und Schönheit ${CHIEF.beauty} (jetzt ${beautyOf(I)}), wenn Nahrung, Töpfe und Matten reichen und Tapa, Schweine, Kava und Muschelschmuck im Lager sind. Dann wohnen ${CHIEF.cap} Menschen in jedem Haus, und sie brauchen diese Waren laufend.</p>`;
  return h;
}
const activeCount = I => I.buildings.filter(b => b.bt && !KINDS[b.kind].plant).length;
/* When the next person moves in, and why nobody does */
function arrivalText(I, nd){
  if (nd.missing.length) return `Niemand zieht zu, es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`;
  if (nd.full) return 'Die Häuser sind voll. Jedes neue Haus bringt 4 Menschen.';
  const per = GROW_EVERY * TICK / 1000 / (I.joyUntil > tick ? 2 : 1), next = (GROW_EVERY - tick % GROW_EVERY) * TICK / 1000, room = nd.cap - I.pop;
  return `Alle ${String(per).replace('.', ',')} Sekunden kommt jemand dazu, der Nächste in ${next} Sekunden. Noch ${room} ${room === 1 ? 'Platz' : 'Plätze'} frei, voll in etwa ${Math.ceil(room * per)} Sekunden.`;
}
/* The line under the goods: work, builders, how long the food lasts, the next arrival */
function vitalLine(I){
  const nd = needsOf(I), sf = staffOf(I), ic = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>`, busy = sf.total - sf.free;
  const fn = nd.list.find(x => x.k === 'essen'), fnet = fn.make - fn.use - fn.work, food = {k:'essen', left:fnet >= 0 ? Infinity : fn.stock / -fnet};
  const parts = [`<span>${ic('beile')}${busy}/${sf.total}${sf.build ? ` · Bau ${sf.build}` : ''}</span>`];
  parts.push(food.left === Infinity ? `<span>${ic('essen')}reicht</span>` : `<span class="warn">${ic(food.k)}${food.left < 1 ? 'knapp' : `${Math.floor(food.left)} Min`}</span>`);
  parts.push(nd.missing.length ? `<span class="warn">${ic('pop')}kein Zuzug</span>` : nd.full ? `<span>${ic('pop')}Häuser voll</span>` : `<span>${ic('pop')}+1 in ${(GROW_EVERY - tick % GROW_EVERY) * TICK / 1000} s</span>`);
  return parts.join('');
}
/* Storage sheet: every good on the island with what comes in and goes out per minute */
function storeMarkup(I){
  const nd = needsOf(I), rows = ['essen', ...GOODS].map(k => {
    const make = ofNeed(k, q => makeRate(I, q)), need = nd.list.find(n => n.k === k), use = (need ? need.use : 0) + ofNeed(k, q => workUse(I, q)), have = haveOf(I, k);
    return {k, make, use:FOODS.includes(k) ? workUse(I, k) : use, have, sub:FOODS.includes(k)};
  }).filter(g => g.k === 'essen' || g.have || g.make || g.use);
  let h = head(`Lager auf ${I.name}`, `Platz für ${storeCap(I)} von jeder Ware. Mehr Platz gibt jeder Speicher.`);
  h += `<ul class="list needs">${rows.map(g => `<li class="${g.sub ? 'sub-row' : ''}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${g.k}"/></svg><span class="nm">${GN[g.k]}<small>${g.make ? `+${perMin(g.make)}` : '+0'} ${g.use ? `−${perMin(g.use)}` : ''} pro Minute</small></span><b class="qty">${g.have}</b></li>`).join('')}</ul>`;
  const idle = I.buildings.filter(b => b.idle && b.idle.why !== 'full');
  if (idle.length) h += `<p class="sub">Es stehen still: ${idle.map(b => `${KINDS[b.kind].n} (${b.idle.text.replace(/\.$/, '')})`).join(', ')}.</p>`;
  return h;
}
/* Standing sheet: what mana is for, and the feasts this island can hold */
function feastMarkup(I){
  // the feast of treasures only once a treasure has been seen
  const known = islands.some(J => J.treasure && J.discovered) || islands.some(J => J.settled && TREASURE_GOODS.some(k => (J.stock[k] || 0) > 0));
  return FEASTS.filter(F => F.id !== 'schatz' || known).map(F => { const no = feastState(I, F); return `<div class="rowx"><span><b>${F.n}</b> <span class="sub">${costText(F.cost)}, Ansehen +${F.mana}</span>${no ? `<br><span class="sub">${no}</span>` : ''}</span><button class="btn${no ? '' : ' primary'}" type="button" data-act="feast" data-f="${F.id}" ${no ? 'disabled' : ''}>Feiern</button></div>`; }).join('');
}
function manaMarkup(I){
  let h = head(`Ansehen ${Math.floor(mana)}`, 'Das Ansehen des Clans. Es wächst mit Festen und Gaben und sinkt langsam, etwa 1 pro Minute.');
  h += `<ul class="help"><li>Für jede weitere Siedlung mit dem Doppelkanu: Ansehen ${MANA_PER_COLONY} mehr. Jetzt nötig: ${manaNeeded()}.</li><li>Für ein Häuptlingsdorf: Ansehen ${CHIEF.mana}.</li><li>Ein schönes Dorf bringt alle halbe Minute etwas Ansehen. Schönheit auf ${I.name}: ${beautyOf(I)}. Blumen, Wege, Fackeln und Ahnenpfosten machen es schöner.</li><li>Das Fest der Plejaden zu Beginn des Jahres bringt am meisten.</li></ul>`;
  h += I.buildings.some(b => b.kind === 'halle') ? `<p class="sub">Feste auf ${I.name}:</p>` + feastMarkup(I) : `<p class="sub">Auf ${I.name} steht kein Versammlungshaus. Feste feiert man dort.</p>`;
  return h;
}
/* A clan: what they make and value, the trust on the cord and what they still owe */
function clanMarkup(T){
  const C = T.clan, ri = routes.findIndex(r => r.a === T.id || r.b === T.id), r = routes[ri], icons = ks => ks.map(k => `<svg class="ic inline" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>${GN[k]}`).join(', ');
  let h = head(C.name, `Auf ${T.name}, etwa ${C.pop} Menschen.`);
  h += `<p>Sie machen ${icons(C.makes)}.<br>Sie schätzen ${icons(C.wants)}.</p>`;
  h += `<p class="sub">Bei diesem Clan gibt es keine Preise. Ihr schickt eine Gabe, und sie antworten später mit dem, was sie machen. Je mehr Knoten die Schnur hat, desto reicher fällt die Gegengabe aus. Muschelschmuck knüpft einen Knoten extra. Kommt lange nichts, löst sich ein Knoten.</p>`;
  if (r) h += `<p>${r.knots} Knoten Vertrauen. ${T.debt >= 1 ? 'Eine Gegengabe ist unterwegs oder kommt bald.' : 'Gerade schulden sie euch nichts.'}</p>`;
  h += r ? `<div class="rowx"><span class="sub">Fahr mit einem beladenen Kanu hin oder setze eines in die Schnur.</span><button class="btn primary" type="button" data-act="gift">Schnur ansehen</button></div>` : `<p class="sub">Fahr mit einem Kanu hin, dann entsteht eine Schnur.</p>`;
  return h;
}
/* The end of the tasks: what the clan has built, and the sea stays open */
function finaleMarkup(){
  const mine = islands.filter(I => I.settled), people = mine.reduce((t, I) => t + I.pop, 0), friends = routes.filter(r => isl(r.a).clan || isl(r.b).clan);
  const row = (k, label, v) => `<li><svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${k ? `<use href="#ic-${k}"/>` : ''}</svg><span class="nm">${label}</span><b class="qty">${v}</b></li>`;
  let h = head('Die große Fahrt ist vollbracht', `Nach ${yearOf() + 1} ${yearOf() ? 'Jahren' : 'Jahr'} auf See und an Land.`);
  h += `<p>Vom ersten Versammlungshaus auf ${isl('heimat').name} aus ist ein Netz aus Dörfern und Freundschaften entstanden, bis über die Weite See zu den Fernen Inseln, wie es die Lapita-Leute vor über dreitausend Jahren über den Pazifik gespannt haben.</p>`;
  h += `<ul class="list needs">${row('pop', 'Eigene Dörfer', mine.length)}${row('pop', 'Menschen', people)}${row('schnur', 'Befreundete Clans', friends.length)}${row('schnur', 'Knoten auf allen Schnüren', routes.reduce((t, r) => t + r.knots, 0))}${row('einbaum', 'Kanus', own().length)}${row('mana', 'Ansehen', Math.floor(mana))}${row('', 'Entdeckte Inseln', islands.filter(I => I.discovered).length)}</ul>`;
  h += `<p class="sub">Das Meer bleibt offen. Es gibt noch Nebel zu lichten, Dörfer zu Häuptlingsdörfern zu machen und Feste zu feiern.</p>`;
  return h + `<div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Weiterspielen</button></div>`;
}
/* ---------- a building: who works there, one line on how it goes, the rest folded away */
const pipH = k => `<svg class="pip" viewBox="-2.7 -6.5 5.4 7" aria-hidden="true">${PIP[k]}</svg>`;
const SHORT = {crew:'keine Leute', way:'Leute auf dem Weg', trees:'keine Bäume', full:'Lager voll', boat:'kein Einbaum', carving:'Einbaum entsteht', space:'kein Platz'};
const shortWhy = w => w.why === 'use' ? `kein ${G1[w.k]}` : w.why === 'near' ? `zu wenig ${NEAR_PL[w.kind]}` : SHORT[w.why] || 'steht still';
const secsText = s => s < 90 ? `${Math.max(1, Math.ceil(s))} s` : `${Math.round(s / 60)} min`;
function crewMarkup(I, b){
  const sl = slotsOf(I, b, staffOf(I), presentAt(I)); if (!sl) return '';
  const K = KINDS[b.kind], who = walkers.filter(w => w.isl === I.id && w.job && w.job.b === b).sort((p, q) => q.on - p.on);
  const chips = sl.map((k, i) => `<span class="who ${k}">${pipH(k)}${k === 'on' || k === 'way' ? (who[i] ? who[i].name : '') : k === 'free' ? 'frei' : 'zu'}</span>`).join('');
  const step = K.crew && !b.bt && !(b.boat > 0) ? stepper('mc', 'mc', capOf(b), capOf(b) > 0, capOf(b) < K.crew, 'Arbeiter') : '';
  return `<div class="crew">${chips}${step ? `<span class="grow"></span>${step}` : ''}</div>`;
}
function infoMarkup(I, b){
  const K = KINDS[b.kind], st = (cls, t) => `<span class="state ${cls}">${t}</span>`, more = [K.info];
  let line = '', bar = '', why = '';
  if (b.bt && K.plant) line = `${st('low', 'wächst')} <span>noch ${secsText(b.bt * TICK / 1000)}</span>`;
  else if (b.bt){
    // a building site: how far, how much of the wood is there, and what the builders are doing
    const W = workOf(I, {type:'site', b}), f = 1 - b.bt / K.bt, here = walkers.filter(w => w.isl === I.id && w.job && w.job.b === b && w.on);
    const doing = !crewAt(I, b) ? st('out', 'wartet auf Bauleute') : !here.length ? st('low', 'Bauleute kommen') : here.some(w => w.leg === 'work') && b.bt > woodFloor(W) + .01 ? st('ok', 'wird gebaut') : st('low', 'Holz wird geholt');
    line = `${doing}<span>${icon('holz')}${W.o.got}/${W.need}</span><span>${Math.round(f * 100)} %</span>`;
    bar = `<span class="mbar big"><i style="width:${f * 100}%"></i></span>`;
    if (!crewAt(I, b)) more.unshift(`Gleichzeitig wird an ${builders(I)} ${builders(I) === 1 ? 'Stelle' : 'Stellen'} gebaut, je 10 Bewohner an einer mehr. Steht Bauen in der Übersicht weiter vorn, kommen eher Leute.`);
  } else if (b.boat > 0){
    const f = 1 - b.boat / K.canoe;
    line = `${crewAt(I, b) ? st('ok', 'Einbaum wird geschnitzt') : st('out', 'niemand schnitzt')}<span>${Math.round(f * 100)} %</span>`;
    bar = `<span class="mbar big"><i style="width:${f * 100}%"></i></span>`;
    more.unshift(b.kind === 'steg' ? 'Erst wenn der Einbaum fertig ist, fährt er zu den Pfahlhäusern.' : 'Erst wenn der Einbaum fertig ist, fahren die Fischer hinaus.');
  } else if (K.prod || K.plants){
    const w = b.idle || workState(I, b), rate = PER_MIN / K.every / pace(I, K) / (K.soil ? soilPace(b) : 1), uses = K.use ? Object.entries(K.use).map(([k, v]) => `${icon(k)}${perMin(rate * v)}`).join('') + '<span class="arr">→</span>' : '';
    line = `${w ? st('out', shortWhy(w)) : st('ok', 'arbeitet')}${K.prod ? `<span>${uses}${icon(K.prod)}${perMin(rate)} pro Minute</span>` : `<span>${icon('sapling')}alle ${K.every * TICK / 1000} s</span>`}`;
    if (K.trees) line += `<span>${icon('holz')}${treesNear(I, b.x, b.y, K.trees.r).length} Bäume</span>`;
    // divers: whether the water allows diving, and how divers really worked
    if (K.dive){ const bl = diveBlock(I); line += `<span>${icon(bl ? 'sturm' : 'passat')}${bl ? 'kein Tauchwetter' : 'ruhiges, klares Wasser'}</span>`;
      more.push('So tauchen die Leute im Pazifik seit Jahrtausenden: ohne Brille, mit offenen Augen im Salzwasser. Ein Stein an einer Schnur zieht schnell hinab, der Partner im Kanu hält die Schnur und wacht. Ein Tauchgang dauert ein bis zwei Minuten, dann wird an der Oberfläche Atem geholt. Allein ruht man länger.',
        'Zerkaute Kokosnuss, aufs Wasser gespuckt, glättet die Oberfläche, dann sieht man den Grund.',
        'Nach einigen Tauchgängen ruhen sie an Land. Wer zu oft zu tief taucht, bekommt Taravana, die Taucherkrankheit der Perltaucher der Tuamotu: Schwindel bis zur Lähmung.',
        'Bei starkem Wind ist das Wasser trüb, nachts dunkel, unter Rāhui ruht das Riff: Dann tauchen sie nicht.',
        I.treasure && I.treasure.k === 'perlmutt' ? 'Vor Tifa liegen die Perlmuscheln tief. Hier bleiben sie länger unten und brauchen mehr Pause, bringen aber Perlmutt.' : I.atoll ? 'Wo es keinen Stein gibt, schleifen sie aus der dicken Schale der Riesenmuschel Beile.' : 'Sie bringen Riesenmuscheln, Kraken und Seegurken.'); }
    // the soil of a field: how much is left, and letting it rest
    if (K.soil){ line += `<span>${icon('soil')}Boden ${Math.round((b.soil ?? 1) * 100)} %${sheltered(I, b) ? ', Bäume schützen ihn' : ''}</span>`;
      why += `<div class="rowx"><span class="sub">${b.fallow ? 'Liegt brach und wird von selbst wieder bestellt, sobald der Boden ausgeruht ist.' : 'Jede Ernte zehrt am Boden, dann geht die Arbeit langsamer. Brach erholt er sich in gut zwei Minuten; Bäume daneben schonen ihn.'}</span><button class="btn" type="button" data-act="fallow">${b.fallow ? 'Wieder bestellen' : 'Brachliegen lassen'}</button></div>`; }
    if (w && w.why !== 'way') why = `<p class="sub why">${w.text}</p>`;
  }
  if (K.boost && !b.bt) more.push(tooled(I, K) ? `Mit ${GN[K.boost.k]} aus dem Lager geht es schnell. ${K.boost.k === 'schnur' ? 'Ein Netz' : 'Ein Beil'} hält für ${K.boost.per} ${GN[K.prod]}.` : `Ohne ${GN[K.boost.k]} geht es ${K.boost.slow === 2 ? 'nur halb so schnell' : 'langsamer'}.`);
  if (K.beauty && !b.bt) line += `<span>Schönheit +${K.beauty}</span>`;
  if (K.roof && !b.bt){ const age = roofAge(b); more.push(age < .34 ? 'Frisches Dach.' : age < .8 ? 'Das Dach wird grau.' : 'Altes Dach, bald erneuern.'); }
  return [crewMarkup(I, b) + bar + (line ? `<div class="stat">${line}</div>` : '') + why, `<details class="more"${sheetData.more ? ' open' : ''}><summary>Mehr dazu</summary>${more.map(t => `<p class="sub">${t}</p>`).join('')}</details>`];
}
function head(title, sub){ return `<div class="sheet-head"><div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div><button class="x" type="button" data-act="close" aria-label="Schließen">×</button></div>`; }
function renderSheet(){
  const body = $('sheetBody'); let h = '';
  if (sheetKind === 'ship'){
    const sh = ships.find(q => q.id === sheetData.id); if (!sh){ closeSheet(); return; }
    h += shipMarkup(sh);
  } else if (sheetKind === 'route'){
    if (!routes[sheetData.r]){ closeSheet(); return; }
    h += routeMarkup(sheetData.r);
  } else if (sheetKind === 'fleet'){
    h += fleetMarkup();
  } else if (sheetKind === 'calendar'){
    h += calendarMarkup();
  } else if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b){ closeSheet(); return; }
    const K = KINDS[b.kind], I = islOfB(b.id);
    const [main, more] = infoMarkup(I, b);
    h += head(K.n, I.name) + main;
    if (b.kind === 'werft' && !b.bt) h += yardMarkup(I);
    if (b.kind === 'halle' && !b.bt){ if (feastsOpen()) h += `<p class="sub">Ansehen des Clans: ${Math.floor(mana)}.</p>` + feastMarkup(I); h += festivalMarkup(I); }
    h += more;
    if (sheetData.confirm) h += `<div class="rowx"><span>${Object.keys(costOf(b.kind, I)).length ? 'Wirklich entfernen? Die Hälfte kommt zurück.' : 'Wirklich entfernen?'}</span><span class="chips"><button class="btn" type="button" data-act="nokill">Behalten</button><button class="btn primary" type="button" data-act="kill">Entfernen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="move">Versetzen</button><button class="btn" type="button" data-act="askkill">Entfernen</button></span></div>`;
  } else if (sheetKind === 'away'){
    // while you were away: one row for each thing that happened
    const {R, lines, years} = sheetData;
    h += head('Während ihr fort wart', `${awayTime(R.ms)}${years > 0 ? `, auf den Inseln ${years === 1 ? 'ein Jahr' : `${years} Jahre`}` : ''}.`);
    h += lines.length ? `<ul class="list needs">${lines.map(([k, t, r]) => `<li>${icon(k)}<span class="nm">${t}</span>${r ? `<span class="st">${r}</span>` : ''}</li>`).join('')}</ul>` : '<p class="sub">Alles ist ruhig geblieben.</p>';
    h += `<p class="sub">In der Zeit ist niemand hungrig fortgezogen, kein Sturm kam, und das Ansehen ist geblieben.</p><div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Weiter</button></div>`;
  } else if (sheetKind === 'rename'){
    // an island can get the name its people give it
    const I = isl(sheetData.id);
    h += head('Insel benennen', I.custom ? `Früher ${I.name0}.` : 'So nennen die Leute sie bisher.') + `<div class="rowx"><input id="nameIn" class="name-in" type="text" maxlength="18" autocomplete="off" value="${esc(I.name)}" aria-label="Name der Insel"><button class="btn primary" type="button" data-act="rename">Benennen</button></div>`;
  } else if (sheetKind === 'road'){
    const I = isl(sheetData.id), r = I && I.roads && I.roads[sheetData.r]; if (!r){ closeSheet(); return; }
    h += head('Weg', I.name) + `<p class="sub">Zerstoßene Muscheln und Korallensand. Darauf gehen die Leute schneller, und der Weg schmückt das Dorf.</p><div class="rowx"><span class="chips"><button class="btn" type="button" data-act="delroad">Entfernen</button></span></div>`;
  } else if (sheetKind === 'intro'){
    const first = sheetData && sheetData.first;
    h += head(first ? 'Land in Sicht' : 'So geht es', first ? 'Euer Doppelkanu ist auf Panua gelandet. Noch steht nur das Versammlungshaus.' : '');
    h += `<ul class="help"><li>Über der Bauleiste steht immer die nächste Aufgabe. Tippe darauf, dann zeigt dir das Spiel, wo es weitergeht.</li><li>Tippe oben auf die Bewohnerzahl oder die Zeile darunter. Die Übersicht zeigt Bewohner, Zuzug, Arbeit, Essen und was fehlt. Dort legst du fest, welche Arbeit zuerst Leute bekommt.</li><li>Tippe auf die Warenleiste, dann siehst du das ganze Lager mit allem, was pro Minute dazukommt und weggeht.</li><li>Ziehen schiebt die Karte. Zwei Finger oder das Mausrad zoomen.</li><li>Die Inseln leben weiter, wenn das Spiel zu ist, bis zu acht Stunden. Wenn du wiederkommst, steht da, was geschehen ist. In der Zeit geht nichts verloren.</li><li>Nachrichten rollen rechts oben aus der Muschel aus und wieder ein. Tippe die Muschel an, dann siehst du die letzten.</li><li>Zum Bauen unten etwas wählen, auf Land tippen, dann Bauen.</li><li>Alles braucht Holz und Zeit. Holz kommt vom Holzfäller, der die Bäume in seiner Nähe fällt. Gefällte Bäume wachsen nur langsam nach, ein Baumpflanzer hilft.</li><li>Jeder Bewohner ist eine Figur. Tippe jemanden an, dann siehst du den Namen und was die Person tut.</li><li>Über jedem Arbeitsplatz zeigen kleine Figuren, wer dort arbeitet: dunkel bei der Arbeit, gelb auf dem Weg, leer ist ein freier Platz.</li><li>An jeder Baustelle arbeiten 2 Leute. Sie holen erst das Holz aus dem Lager, dann bauen sie. Ohne sie steht die Baustelle still.</li><li>Alles Essen zählt als Nahrung: Taro, Brotfrucht und Pulaka von den Feldern, Fisch und Meeresfrüchte vom Riff. Die Leute essen, wovon am meisten da ist.</li><li>Pfahlhäuser in der Lagune erreicht man nur mit dem Einbaum vom Kanusteg.</li><li>Ab und zu geschieht etwas. Dann ertönt ein Muschelhorn, und du entscheidest. Im Menü stehen die Chronik und die Schalter für Klang und für Tag und Nacht.</li><li>Tippe ein Kanu an, dann tippe auf das Meer oder eine Insel, und es fährt dorthin. Was im Nebel liegt, weiß niemand.</li><li>Tippe auf die Schnur zwischen zwei Inseln, dann kannst du Kanus in diese Handelskette setzen.</li><li>Das Doppelkanu kann von selbst erkunden: antippen, dann „Erkunden lassen“. Es kehrt rechtzeitig um und holt Proviant.</li><li>Im Osten liegt die Weite See, dahinter die Fernen Inseln. Dort und auf Tifa liegen Schätze, die es sonst nirgends gibt.</li><li>Felder laugen aus. Lass sie brachliegen, Bäume daneben schonen den Boden. Fällt zu viel Wald, spült der Regen die Erde fort.</li><li>Oben rechts steht der Mond. Im ersten Mond, wenn die Plejaden aufgehen, wird das Fest der ersten Früchte gefeiert.</li></ul>`;
    h += `<div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Los</button></div>`;
  } else if (sheetKind === 'quest'){
    h += questSheet();
  } else if (sheetKind === 'needs'){
    h += needsMarkup(isl(active));
  } else if (sheetKind === 'store'){
    h += storeMarkup(isl(active));
  } else if (sheetKind === 'mana'){
    h += manaMarkup(isl(active));
  } else if (sheetKind === 'clan'){
    h += clanMarkup(isl(sheetData.id));
  } else if (sheetKind === 'event'){
    if (!eventNow){ closeSheet(); return; }
    h += eventMarkup();
  } else if (sheetKind === 'chronik'){
    h += chronikMarkup();
  } else if (sheetKind === 'finale'){
    h += finaleMarkup();
  } else if (sheetKind === 'menu'){
    h += head('Menü', `Dein Spiel bleibt in diesem Browser gespeichert. Welt Nr. ${seed}`);
    if (sheetData && sheetData.confirm) h += `<div class="rowx"><span>Alles von vorn, mit neuen Inseln?</span><span class="chips"><button class="btn" type="button" data-act="close">Nein</button><button class="btn primary" type="button" data-act="reset">Neu anfangen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="help">So geht es</button><button class="btn" type="button" data-act="chronik">Chronik</button>${quest >= QUESTS.length ? '<button class="btn" type="button" data-act="finale">Rückblick</button>' : ''}</span></div>` +
      `<div class="rowx"><span class="chips"><button class="chip" type="button" data-act="sound" aria-pressed="${opts.sound}">Klang</button><button class="chip" type="button" data-act="night" aria-pressed="${opts.night}">Tag und Nacht</button></span><button class="btn" type="button" data-act="askreset">Neu anfangen</button></div>`;
  }
  body.innerHTML = h; lastSig = sheetSig();
}
let lastSig = '';
function sheetSig(){
  if (sheetKind === 'quest') return quest + ':' + (QUESTS[quest] ? QUESTS[quest].n() : '');
  if (sheetKind === 'needs' || sheetKind === 'store' || sheetKind === 'mana'){ const I = isl(active), nd = needsOf(I); const sf = staffOf(I); return [sheetKind, active, I.pop, I.lvl, Math.floor(mana), nd.cap, sf.free, sf.build, prioOf(I).join(), tick % GROW_EVERY, [...presentAt(I).values()].join(':'), ...Object.values(sf.cats).map(c => c.used), ...GOODS.map(k => I.stock[k] || 0), ...I.buildings.map(b => b.idle ? b.idle.why : '')].join(); }
  if (sheetKind === 'clan'){ const T = isl(sheetData.id), r = routes.find(q => q.a === T.id || q.b === T.id); return [r && r.knots, T.debt >= 1].join(); }
  if (sheetKind === 'calendar') return [moonOf(), isl(active).rahui, Math.floor(untilFestival() / 30)].join();
  if (sheetKind === 'fleet') return own().map(s => [s.state, s.port, s.route, s.hungry].join(':')).join() + routes.map(r => r.knots).join();
  if (sheetKind === 'ship'){
    const s = ships.find(q => q.id === sheetData.id); if (!s) return 'gone';
    const P = s.port ? isl(s.port) : null;
    return [s.state, s.port, s.route, s.hungry, s.people, cargoLoad(s), s.auto, P && P.treasure ? P.treasure.left : "", Math.floor(mana), P && P.pop, ...(P ? GOODS.map(k => Math.min(P.stock[k] || 0, 30)) : [])].join();
  }
  if (sheetKind === 'route'){
    const r = routes[sheetData.r]; if (!r) return 'gone';
    return [r.knots, ...ships.filter(s => s.own && (s.route === sheetData.r || s.port === r.a || s.port === r.b)).map(s => s.id + s.state + s.route), ...[isl(r.a), isl(r.b)].flatMap(I => GOODS.map(k => (I.stock[k] || 0) > 0))].join();
  }
  if (sheetKind !== 'info' || !sheetData) return '';
  const b = findB(sheetData.id); if (!b) return 'gone';
  const I = islOfB(b.id), age = Math.floor(roofAge(b) * 3);
  const yard = b.kind === 'werft' ? [I.yard && I.yard.left, shipAt(I.id).length, ...Object.values(SHIPS).map(S => canPay(I, S.cost))].join() : '';
  const hall = b.kind === 'halle' ? [Math.floor(mana), tick - (I.feastAt || 0) < FEAST_PAUSE, ...FEASTS.map(F => canPay(I, F.cost)), festivalState(I), festivalParts(I).map(p => p.ok).join(), guestsFor().length].join() : '';
  const here = walkers.filter(w => w.isl === I.id && w.job && w.job.b === b).map(w => w.name + w.on + w.leg).join('');
  return ['a' + age, b.bt, b.boat, b.got, here, Math.round((b.soil ?? 1) * 20), b.fallow, b.idle && b.idle.why, crewAt(I, b), capOf(b), KINDS[b.kind].trees ? treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).length : '', yard, staffOf(I).yard, hall].join();
}
$('sheetBody').addEventListener('toggle', e => { if (e.target.matches('details.more') && sheetData) sheetData.more = e.target.open; }, true);
$('sheetBody').addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'close'){ closeSheet(); return; }
  if (eventAct(act, btn)) return;
  if (fleetAct(act, btn)) return;
  if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b) return;
    if (act === 'move'){ startMove(b); return; }
    if (act === 'fallow'){ const I = islOfB(b.id); b.fallow = !b.fallow; if (b.fallow) stats.brache = (stats.brache || 0) + 1; b.idle = null; I.staff = null; syncWalkers(); invalidate(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'mc-' || act === 'mc+'){ const K = KINDS[b.kind], I = islOfB(b.id), n = clamp(capOf(b) + (act === 'mc+' ? 1 : -1), 0, K.crew); b.v = {...b.v, mc:n}; if (n === K.crew) delete b.v.mc; I.staff = null; syncWalkers(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'askkill'){ sheetData.confirm = true; renderSheet(); return; }
    if (act === 'nokill'){ sheetData.confirm = false; renderSheet(); return; }
    if (act === 'kill'){ const I = islOfB(b.id), c = costOf(b.kind, I); for (const [k, v] of Object.entries(c)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + Math.floor(v / 2)); I.buildings = I.buildings.filter(x => x.id !== b.id); I.staff = null; syncWalkers(); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} ist weg.`, 2600, false); return; }
    if (act === 'feast'){ holdFeast(islOfB(b.id), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  }
  if (sheetKind === 'quest' && act === 'showq'){ showQuest(); return; }
  if (sheetKind === 'rename' && act === 'rename'){ renameIsland(isl(sheetData.id), $('nameIn').value); return; }
  if (sheetKind === 'road' && act === 'delroad'){ const I = isl(sheetData.id); I.roads.splice(sheetData.r, 1); roadsChanged(I); closeSheet(); renderBuildBar(); toast('Der Weg ist weg.', 2000, false); return; }
  if (sheetKind === 'needs' && (act === 'pup' || act === 'pdown')){
    const I = isl(active), pr = prioOf(I), i = pr.indexOf(btn.dataset.c), j = i + (act === 'pup' ? -1 : 1);
    if (j >= 0 && j < pr.length){ [pr[i], pr[j]] = [pr[j], pr[i]]; I.staff = null; syncWalkers(); updateHUD(); save(); }
    renderSheet(); return;
  }
  if (sheetKind === 'mana' && act === 'feast'){ holdFeast(isl(active), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  if (sheetKind === 'clan' && act === 'gift'){ const ri = routes.findIndex(r => r.a === sheetData.id || r.b === sheetData.id); if (ri >= 0) openRoute(ri); return; }
  if (sheetKind === 'menu'){
    if (act === 'help'){ openSheet('intro'); return; }
    if (act === 'finale'){ openSheet('finale'); return; }
    if (act === 'chronik'){ openSheet('chronik'); return; }
    if (act === 'sound'){ setSound(!opts.sound); renderSheet(); return; }
    if (act === 'night'){ opts.night = !opts.night; saveOpts(); requestDraw(); renderSheet(); return; }
    if (act === 'askreset'){ sheetData = {confirm:true}; renderSheet(); return; }
    if (act === 'reset'){ try { localStorage.removeItem(SAVE_KEY); } catch (err){} newGame(); closeSheet(); renderAll(); fitBox(isl('heimat').box, 1.4); save(); toast('Neues Spiel, neue Inseln.', 2600, false); return; }
  }
});
const giftGuess = (C, worth) => { const g = returnGoods(C, worth); return g.load ? giftText(g.cargo) : 'eine kleine Gabe'; };
function select(b){ selectedId = b.id; invalidate(); setActive(islOfB(b.id).id); openSheet('info', {id:b.id}); }
