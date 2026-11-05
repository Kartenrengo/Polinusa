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
  if (barMode === 'fleet' && fleetKey !== fleetSig()) renderBuildBar();
  document.body.classList.toggle('landing', !!landing);
  if (landing){ $('isleName').textContent = landing.found ? `Landung auf ${isl('heimat').name}` : 'Auf See im Ahnenkanu'; showWind(); $('moonUse').setAttribute('href', '#' + SEASON_ICON[seasonOf().id]); $('moonTxt').textContent = `${moonOf() + 1}. Mond`; return; }
  const I = isl(active);
  $('isleName').textContent = I.name; $('isleName').setAttribute('aria-label', `${I.name}, ${I.volcano ? 'Vulkan' : I.type === 'hoch' ? 'hohe Insel' : 'Atoll'}, ${LEVEL_NAMES[I.lvl || 1]}. Tippen benennt sie um.`);
  $('manaBtn').hidden = mana <= 0 && !feastsOpen();
  $('manaNum').textContent = Math.floor(mana);
  const S = seasonOf(); $('seasonUse').setAttribute('href', '#' + SEASON_ICON[S.id]); $('seasonTxt').textContent = `${moonOf() + 1}. Mond`;
  $('moonUse').setAttribute('href', '#' + SEASON_ICON[S.id]); $('moonTxt').textContent = `${moonOf() + 1}. Mond`;
  $('seasonBtn').setAttribute('aria-label', `${S.n}, ${moonOf() + 1}. Mond. ${festivalTime() ? 'Festzeit.' : `Fest der Plejaden in etwa ${minutes(untilFestival())} Minuten.`} Tippen zeigt den Kalender.`);
  $('popNum').textContent = I.pop; $('popCap').textContent = '/' + popCap(I);
  showWind();
  const free = staffOf(I).free; $('idleNum').textContent = free; $('idleBtn').classList.toggle('zero', !free); $('idleBtn').setAttribute('aria-label', `${free} ohne Arbeit. Tippen zeigt sie nacheinander.`);
  // the dot next to the people count: green while the village grows, yellow when the houses are full, red when something is missing
  const nd = needsOf(I), st = nd.missing.length ? 'out' : nd.full ? 'full' : 'ok';
  $('popDot').className = 'dot ' + st;
  $('popBtn').setAttribute('aria-label', `${I.pop} Bewohner, Platz für ${nd.cap}. ${growText(I, nd)} Tippen zeigt den Bedarf.`);
  // the goods row shows what matters here: all food as one, wood, then whatever is stored, made or needed, at most seven
  // the goods row: food, water, wood, thatch and cord first, then what matters here; few while the village is small
  const first = ['essen', 'wasser', 'holz', 'dach', 'schnur'], more = GOODS.filter(k => !FOODS.includes(k) && !first.includes(k) && ((I.stock[k] || 0) > 0 || makeRate(I, k) > 0 || nd.list.some(n => n.k === k)));
  const shown = [...first, ...more].slice(0, I.pop < 15 ? 5 : 7);
  const ul = $('goods'); if (ul.dataset.keys !== shown.join()){ ul.dataset.keys = shown.join(); ul.innerHTML = shown.map(k => `<span class="g" data-k="${k}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span></span></span>`).join(''); }
  for (const li of ul.children){ const k = li.dataset.k, v = haveOf(I, k); li.querySelector('span').textContent = v; li.classList.toggle('zero', !v);
    if (lastStock.isl === active && v >= (lastStock[k] || 0) + 2){ li.classList.remove('up'); void li.offsetWidth; li.classList.add('up'); } }
  lastStock = {isl:active, ...I.stock, essen:haveOf(I, 'essen')};
  $('vitalBtn').innerHTML = vitalLine(I);
  // what does not fit next to the hint is left out whole, never cut in half (the store sheet shows everything)
  for (const li of ul.children) li.hidden = false;
  { const edge = ul.getBoundingClientRect().right + 1; for (const li of ul.children) if (li.getBoundingClientRect().right > edge) li.hidden = true; }
  $('storeBtn').setAttribute('aria-label', 'Lager: ' + shown.map(k => `${GN[k]} ${haveOf(I, k)}`).join(', ') + '. Tippen zeigt alles.');
  for (const btn of $('buildList').children){ const k = btn.dataset.kind; if (k) btn.classList.toggle('poor', !canPay(I, costOf(k, I))); }
}
/* Two menus: what the village needs, with paths at the end, and what only adorns it */
let buildTab = 'bau', buildOpen = false, barMode = null, sideOpen = false, fleetKey = '';
/* speed and menu fold out from the side button, the conch with the messages always stays */
function setSideOpen(on){ sideOpen = !!on; $('sidectl').classList.toggle('open', sideOpen); $('moreBtn').setAttribute('aria-expanded', sideOpen); $('speedMark').hidden = sideOpen || gameSpeed === 1; }
/* The build bar is folded away until the build button is pressed, so the map shows more; tapping empty map folds it again */
/* The fleet works the same way: its button folds out a bar with every canoe and trade chain */
function setBar(m){
  const was = barMode; barMode = m === 'build' || m === 'fleet' ? m : null; buildOpen = barMode === 'build';
  $('bottom').classList.toggle('open', !!barMode); $('bottom').classList.toggle('fleet', barMode === 'fleet');
  const b = $('buildBtn'), f = $('tradeBtn');
  b.setAttribute('aria-expanded', barMode === 'build'); b.querySelector('span').textContent = barMode === 'build' ? 'Zu' : 'Bauen';
  b.setAttribute('aria-label', barMode === 'build' ? 'Bauleiste schließen' : 'Bauen: Bauleiste öffnen');
  f.setAttribute('aria-expanded', barMode === 'fleet'); f.querySelector('span').textContent = barMode === 'fleet' ? 'Zu' : 'Flotte';
  f.setAttribute('aria-label', barMode === 'fleet' ? 'Flotte schließen' : 'Flotte: alle Kanus und Handelsketten');
  if (was !== barMode){ fleetKey = ''; renderBuildBar(); }
  measure();
}
const setBuildOpen = on => setBar(on ? 'build' : barMode === 'build' ? null : barMode);
/* the fleet bar: one button per canoe (tap steers it), one per trade chain, and the whole list */
function fleetItems(){
  const mine = own(), dot = s => s.hungry ? 'out' : s.state === 'sail' ? 'way' : s.route != null ? 'on' : 'free';
  return mine.map(s => `<button type="button" class="bbtn ship" data-ship="${s.id}" aria-label="${s.name}: ${shipStatus(s)}"><svg viewBox="${s.kind === 'oc' ? '-13 -10 26 14' : '-24 -28 46 36'}" aria-hidden="true"><use href="#${s.kind}"/></svg><span>${(s.name || SHIPS[s.kind].n).split(' ')[0].slice(0, 8)}</span><i class="sdot ${dot(s)}" aria-hidden="true"></i></button>`).join('') +
    routes.map((r, i) => `<button type="button" class="bbtn route" data-route="${i}" aria-label="Handelskette ${isl(r.a).name} – ${isl(r.b).name}, ${r.knots} Knoten"><svg viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-schnur"/></svg><span>${isl(r.b).name.slice(0, 7)}</span></button>`).join('') +
    `<button type="button" class="bbtn" data-fleet="1" aria-label="Alle Kanus und Ketten als Liste"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6H16M4 10H16M4 14H16" stroke="#2B1D14" stroke-width="1.8" stroke-linecap="round"/></svg><span>Liste</span></button>`;
}
const fleetSig = () => own().map(s => s.id + s.state + s.route + (s.hungry ? 1 : 0) + s.name).join() + '|' + routes.map(r => r.a + r.b + r.knots).join();
function renderBuildBar(){
  const I = isl(active);
  if (barMode === 'fleet'){ fleetKey = fleetSig(); $('buildList').innerHTML = fleetItems(); document.querySelector('.bottom-head').hidden = true; $('tradeBtn').hidden = false; updateHUD(); return; }
  $('buildWhere').textContent = '';   // the island's name stands at the top already
  const fleet = own().length > 0 || routes.length > 0;
  $('tradeBtn').hidden = !fleet; $('tradeBtn').previousElementSibling.toggleAttribute('hidden', !fleet);
  const can = k => KINDS[k].on.includes(I.type) && unlocked(k) && (!KINDS[k].dep || depsOf(I, KINDS[k].dep).length), deco = ORDER.filter(k => DECO.includes(k) && can(k));
  if (!deco.length) buildTab = 'bau';
  $('tabDeco').hidden = !deco.length; $('tabDeco').classList.toggle('new', deco.some(k => newKinds.has(k)));
  document.querySelector('.bottom-head').hidden = !deco.length;   // the tabs only when there is a choice
  { const s = $('buildBtn').querySelector('svg'); if (!s.innerHTML) s.innerHTML = iconMarkup('haus'); }
  $('tabBau').setAttribute('aria-pressed', buildTab === 'bau'); $('tabDeco').setAttribute('aria-pressed', buildTab === 'deco');
  const list = buildTab === 'deco' ? deco : ORDER.filter(k => !DECO.includes(k) && can(k));
  $('buildList').innerHTML = list.map(k => { const K = KINDS[k];
    return `<button type="button" class="bbtn${newKinds.has(k) ? ' new' : ''}${hasLife(I, k) ? '' : ' lack'}" data-kind="${k}" aria-pressed="false" aria-label="${K.n}, ${hasLife(I, k) ? `kostet ${costText(costOf(k, I))}` : lifeMissing(I, k)}"><svg viewBox="${K.vb}" aria-hidden="true">${iconMarkup(k)}</svg><span>${K.s}</span></button>`; }).join('');
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
  C.querySelector('span b').textContent = 'Wind aus ' + W.ab; C.querySelector('span small').textContent = W.word; C.setAttribute('aria-label', `Wind aus ${W.dir}, ${W.word}`);
}
/* The idle button: one after the other, the people without work */
let idleNo = 0;
function showIdle(){
  const I = isl(active), list = walkers.filter(w => w.isl === I.id && w.role === 'idle');
  if (!list.length){ toast('Alle, die arbeiten können, haben Arbeit.', 2600, false); return; }
  const n = idleNo++ % list.length, w = list[n]; markW = w; markUntil = performance.now() + 6000; flyTo(w.x, w.y, Math.max(cam.z, 2.2));
  toast(`${whoIs(w)} hat keine Arbeit, ${n + 1} von ${list.length}. ${foragers(I) ? 'Solange sammelt sie oder er Wild. ' : ''}Ein neuer Arbeitsplatz gibt Arbeit, oder mehr Plätze in einem Gebäude.`, 3600, false);
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
  if (!placing){ requestDraw(); return; }
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
  if (!hasLife(I, kind)){ toast(lifeMissing(I, kind), 4200, false); return; }
  if (K.spring && !I.river){ toast('Auf dieser Insel fließt kein Bach. Baue einen Regenfang.', 3200, false); return; }
  const c = costOf(kind, I); if (!canPay(I, c)){ toast(`Zu wenig ${lacking(I, c)}.`, 2600, false); return; }
  closeSheet(); selectedId = null; invalidate();
  mode = 'place'; placing = {kind, island:I.id, x:I.center.x, y:I.center.y, v:variant(kind)};
  showPlaceBar();
  // close up the new building starts where you look, otherwise next to the village
  const vc = visCenter(), wc = toWorld(vc.sx, vc.sy), near = lod === 'near' && onIsland(I, wc), base = near && !K.dep && !K.near && !K.trees && !K.plants && !K.spring ? wc : startSpot(I, K);
  if (!near) flyTo(base.x, base.y, Math.max(cam.z, 1.6));
  const p = findSpot(I, kind, base) || base; placing.x = p.x; placing.y = p.y; ghostRender();
  for (const b of $('buildList').children) b.setAttribute('aria-pressed', b.dataset.kind === kind ? 'true' : 'false');
}
function startSpot(I, K){
  const vc = villageCenter(I);
  const pick = list => list.reduce((m, q) => Math.hypot(q.x - vc.x, q.y - vc.y) < Math.hypot(m.x - vc.x, m.y - vc.y) ? q : m);
  // a spring by the stream, where it comes closest to the village
  if (K.spring && I.river){ const q = pick(I.river.slice(1, -1)); for (const d of [12, 16, 20, -12, -16, -20]){ const p = {x:q.x + d, y:q.y + d * .3}; if (!check('quelle', I, p.x, p.y)) return p; } return {x:q.x + 14, y:q.y}; }
  if (K.dep && depsOf(I, K.dep).length){ const d = pick(depsOf(I, K.dep)); return {x:d.x + (vc.x - d.x) * .15, y:d.y + (vc.y - d.y) * .15 + 14}; }
  // woodcutters and planters go to the edge of the forest closest to the village
  if ((K.trees || K.plants) && I.trees.some(t => t.st !== 1)){ const t = pick(I.trees.filter(q => q.st !== 1)), d = Math.hypot(vc.x - t.x, vc.y - t.y) || 1; return {x:t.x + (vc.x - t.x) / d * 22, y:t.y + (vc.y - t.y) / d * 22}; }
  // next to the plant that has the most of its kind around it, nearest to the village if several are equal
  // on an atoll, workplaces go on the islet where people live if the plants there are enough; others need a dugout
  const home = new Set(I.buildings.filter(b => b.kind === 'haus' && !b.bt).map(b => landOf(I, b)));
  if (K.near){ const kinds = [].concat(K.near.kind); let src = I.buildings.filter(b => kinds.includes(b.kind)); const local = src.filter(b => home.has(landOf(I, b)) && nearCount(I, K.near.kind, b.x, b.y, K.near.r * .7) >= K.near.n); if (local.length) src = local; if (src.length){
    const score = q => nearCount(I, K.near.kind, q.x, q.y, K.near.r * .7) * 1000 - Math.hypot(q.x - vc.x, q.y - vc.y);
    const c = src.reduce((m, q) => score(q) > score(m) ? q : m); return {x:c.x + 12, y:c.y + 6}; } }
  return vc;
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
  if (placing && placing.founding) return;   // the meeting house must stand somewhere; there is no going back to sea
  const wasMove = mode === 'move'; mode = 'idle'; placing = null; ghostRender(); $('placeOk').disabled = false; $('placeOk').hidden = false; $('placeDone').hidden = false;
  $('place').hidden = true; $('bottom').hidden = false; measure();
  for (const b of $('buildList').children) b.setAttribute('aria-pressed', 'false');
  if (wasMove) invalidate();
}
function confirmPlace(){
  if (placing && placing.founding){ confirmFounding(); return; }
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
function openSheet(kind, data){ if (kind !== 'ship') endSteer(); sliding = false; sheetKind = kind; sheetData = data; $('sheet').hidden = false; renderSheet(); measure(); }
function closeSheet(){ endSteer(); if (!sheetKind) return; if (sheetKind === 'event') eventNow = null;   // closing an event lets it pass
  sliding = false; sheetKind = null; sheetData = null; $('sheet').hidden = true; selectedId = null; invalidate(); measure(); }
function endSteer(){ if (mode === 'steer'){ mode = 'idle'; selShip = null; requestDraw(); } }
const perMin = v => v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
function growText(I, nd){
  if (nd.roofless) return `${nd.roofless} ${nd.roofless === 1 ? 'Mensch schläft' : 'Menschen schlafen'} ohne Dach. Baut Häuser.`;
  if (nd.missing.length) return `Das Dorf wächst nicht, es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`;
  if (nd.atMax) return `Die Insel ist voll: Mehr als ${islandMax(I)} Menschen trägt sie nicht.`;
  if (nd.full) return 'Alle Häuser sind voll. Ein neues Haus zieht eine Familie an.';
  return 'Das Dorf wächst.';
}
/* The patterns an island knows: its own first, then the borrowed ones and how long they last without new pots */
function motifRows(I){
  const ks = motifsOf(I); if (!ks.length) return '';
  return `<ul class="list needs">${ks.map(k => { const own = k === motifOf(I), src = motifFrom(k), left = own ? 0 : MOTIF_YEARS * YEAR - (tick - I.mot[k]), fading = !own && left < YEAR / 2;
    return `<li>${motifIcon(k)}<span class="nm">${MOTIFS[k].n}<small>${own ? `Das eigene Muster von ${I.name}. ${MOTIFS[k].t}` : `Von ${src ? src.name : 'weit her'}. ${fading ? 'Bald vergessen, wenn keine Töpfe damit kommen.' : `Bleibt noch ${Math.ceil(left / MOON)} Monde ohne neue Töpfe.`}`}</small></span>${own ? '<span class="state ok">eigenes</span>' : fading ? '<span class="state low">verblasst</span>' : ''}</li>`; }).join('')}</ul>`;
}
const motifHelp = I => `${I.motif ? '' : I.type === 'hoch' ? 'Mit der ersten Töpferei findet das Dorf ein eigenes Muster. ' : 'Auf einem Atoll gibt es keinen Ton; Muster kommen mit Töpfen von anderswo. '}Wohin Töpfe fahren, wandern die Muster mit. Was zwei Jahre keine Töpfe wieder bringen, wird vergessen. Jedes fremde Muster schmückt das Dorf.`;
/* Needs sheet: room first, then every good the people use, with what the island makes per minute */
function needsMarkup(I){
  const nd = needsOf(I), sf = staffOf(I), chip = (cls, t) => `<span class="state ${cls}">${t}</span>`, bar = f => `<span class="mbar"><i style="width:${clamp(f, 0, 1) * 100}%"></i></span>`;
  const ic = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${k ? `<use href="#ic-${k}"/>` : ''}</svg>`, row = (k, n, small, extra, right, cls = '') => `<li class="${cls}">${ic(k)}<span class="nm">${n}<small>${small}</small>${extra || ''}</span>${right || ''}</li>`;
  let h = head(`Übersicht ${I.name}`, `${LEVEL_NAMES[I.lvl || 1]}. ${growText(I, nd)}`);
  // people and who comes next
  h += `<p class="sec">Bewohner</p><ul class="list needs">`;
  const P = I.people || [], kids = P.filter(p => stageOf(p) === 'kid').length, rest = kids + P.filter(p => stageOf(p) === 'old').length;
  h += row('pop', `${I.pop} Bewohner, ${famsOf(I).length} Familien`, `${sf.total - sf.free} arbeiten, ${sf.free} frei, ${kids} Kinder, ${rest - kids} Alte${nd.roofless ? `, ${nd.roofless} ohne Dach` : ''}. Häuser für ${nd.cap}, die Insel trägt höchstens ${islandMax(I)}.`, bar(I.pop / Math.max(1, nd.cap)), nd.roofless ? chip('out', `${nd.roofless} ohne Dach`) : nd.full ? chip('low', 'voll') : chip('ok', `${Math.max(0, nd.cap - I.pop)} frei`));
  h += `<li class="sub-row"><span class="nm">${I.lvl === 3 && I.people && I.people.find(p => p.id === I.chief) ? `Häuptling: ${I.people.find(p => p.id === I.chief).n}` : 'Die Menschen mit Namen und Alter'}${(I.ahnen || []).length ? `<small>${I.ahnen.length} Ahnen</small>` : ''}</span><button class="chip" type="button" data-act="folk">Alle Menschen</button></li>`;
  h += row('pop', 'Zuzug', arrivalText(I, nd), '', nd.growing ? chip('ok', 'wächst') : chip(nd.missing.length ? 'out' : 'low', nd.missing.length ? 'stockt' : 'voll'), nd.growing ? '' : 'need');
  h += `</ul>`;
  // the clan's navigators, wherever they live
  { const L = navLore(); if (L.lvl || I.buildings.some(b => b.kind === 'sternhaus')) h += `<p class="sec">Navigatoren</p><ul class="list needs">` + row('einbaum', L.lvl ? `Stufe ${L.lvl}: ${NAV_N[L.lvl]}` : 'Noch kein Navigator', L.best ? `${L.best.p.n} auf ${L.best.I.name}, ${Math.floor(ageOf(L.best.p))} Jahre. Stirbt ${L.best.p.n} ohne Schüler, ist das Wissen fort.` : 'Im Haus der Navigatoren lernt jemand die Zeichen von Wellen, Vögeln und Sternen.', '', L.lvl ? chip('ok', `Stufe ${L.lvl}`) : chip('low', 'keiner')) + `</ul>`; }
  // the land: how much forest still holds the soil, and how many fields are worn out
  const fields = I.buildings.filter(b => KINDS[b.kind].soil && !b.bt), tired = fields.filter(b => !b.fallow && (b.soil ?? 1) < .45).length, resting = fields.filter(b => b.fallow).length;
  {
    h += `<p class="sec">Land</p><ul class="list needs">`;
    if (I.type === 'hoch' && I.trees0 >= 25){ const f = forestShare(I), e = erosionOf(I);
      h += row('holz', `Wald ${Math.round(f * 100)} %`, e > 1 ? 'Starke Erosion: Felder laugen sehr schnell aus, das Riff verschlammt. Pflanzt Bäume!' : e ? 'Erosion: Felder laugen schneller aus, das Riff leidet. Pflanzt Bäume.' : 'Genug Wald hält den Boden fest.', bar(f / .6), e ? chip(e > 1 ? 'out' : 'low', 'Erosion') : chip('ok', 'hält'), e ? 'need' : ''); }
    if (fields.length) h += row('soil', `${fields.length} Felder`, `${tired ? `${tired} ausgelaugt` : 'Der Boden trägt'}${resting ? `, ${resting} brach` : ''}. Ausgelaugte Felder brachliegen lassen.`, '', tired ? chip('low', 'müde') : chip('ok', 'gut'), tired ? 'need' : '');
    // the wild, and the tapu that spares it
    const W = wildOf(I), F = foragers(I), gone = goneOf(I);
    h += row('wild', `Wild: ${wildWord(W)}`, `${I.tapu ? 'Tapu: Niemand jagt oder sammelt. Es erholt sich langsam.' : F ? `${F} ohne Arbeit sammeln Eier, Krebse und Vögel, +${perMin(forageRate(I))} pro Minute.` : 'Wer keine Arbeit hat, sammelt im Wald und am Strand.'}${gone ? ` ${gone > 1 ? 'Zwei Arten sind' : 'Eine Art ist'} hier ausgestorben, für immer.` : W < .45 ? ' Wird weiter so viel gejagt, sterben Arten aus.' : ''}`, bar(W), `<button class="chip" type="button" data-act="tapu" aria-pressed="${!!I.tapu}">Tapu</button>`, W < .3 && !I.tapu ? 'need' : '');
    // what came in the canoes, and what is still missing here
    const fit = LIFE_IDS.filter(id => lifeFits(I, id) && lifeKnown(id)), have = fit.filter(id => lifeOf(I).includes(id)), miss = fit.filter(id => !have.includes(id));
    h += row('setzling', have.length ? `Mitgebracht: ${andList(have.map(id => LIFE[id].n))}` : 'Noch nichts mitgebracht', miss.length ? `Es fehlen ${andList(miss.map(id => LIFE[id].n))}. Ein Kanu bringt sie aus einem Dorf, wo sie wachsen: im Hafen „Beladen“, dann „Leben fürs neue Land“.` : 'Alles, was hier wachsen kann, ist da.', '', miss.length ? chip('low', `${miss.length} fehlen`) : chip('ok', 'alles da'), miss.length ? 'need' : '');
    h += `</ul>`;
  }
  if (motifsOf(I).length || I.buildings.some(b => b.kind === 'toepfer')) h += `<p class="sec">Muster auf den Töpfen</p>${motifRows(I)}<p class="sub">${motifHelp(I)}</p>`;
  // the families: where they live, what they lack, where they work; the work goes by itself or by hand
  h += `<p class="sec">Familien und Arbeit</p><div class="rowx"><span class="sub">${autoWork(I) ? 'Die Familien gehen von selbst dorthin, wo sie gebraucht werden: Wasser und Essen zuerst.' : 'Du verteilst die Familien: auf der Tafel eines Arbeitsplatzes mit + und −.'}</span><span class="chips" role="group" aria-label="Arbeit verteilen"><button class="chip" type="button" data-act="work" data-v="auto" aria-pressed="${autoWork(I)}">Automatisch</button><button class="chip" type="button" data-act="work" data-v="hand" aria-pressed="${!autoWork(I)}">Von Hand</button></span></div><ul class="list needs">`;
  for (const f of famsOf(I).slice().sort((a, b) => (!a.home) - (!b.home) || a.id - b.id)){
    const m = membersOf(I, f), fn = famNeeds(I, f, nd.list), lack = fn.filter(n => n.state === 'out');
    h += `<li class="${lack.length ? 'need' : ''}">${ic(f.home ? 'haus' : 'pop')}<span class="nm">${famName(f)}<small>${m.length} Menschen, ${famAdults(I, f).length} Erwachsene · ${f.home ? TIERS[famTier(I, f)].n : 'ohne Dach'} · ${famWork(I, f)}</small></span>${lack.length ? `<span class="state out">${lack.map(n => n.k === 'dach' ? 'Dach' : GN[n.k]).join(', ')}</span>` : ''}<button class="chip" type="button" data-act="fam" data-f="${f.id}">Ansehen</button></li>`;
  }
  const open = placesOf(I).filter(b => !famsOf(I).some(f => f.job === b.id));
  if (open.length) h += row('', `${open.length} ${open.length === 1 ? 'Arbeitsplatz' : 'Arbeitsplätze'} ohne Familie`, andList([...new Set(open.map(b => KINDS[b.kind].n))]), '', chip('out', 'leer'), 'need');
  h += `</ul>`;
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
  const lifeFor = {essen:'taro', schweine:'schwein', kava:'kava', tapa:'maulbeer'};
  const tips = nd.list.filter(n => n.state !== 'ok').map(n => { const id = lifeFor[n.k];
    return id && lifeFits(I, id) && !lifeOf(I).includes(id) ? (n.k === 'essen' ? `Auf ${I.name} gibt es ${LIFE.taro.no}. Bis ein Kanu Setzlinge bringt, nähren Fischgestell, Riffsammler und das Wild.` : `${GN[n.k]}: Auf ${I.name} gibt es ${LIFE[id].no}. Bring ${LIFE[id].s} im Kanu mit, oder schick ${GN[n.k]} her.`) : n.N.hint[I.type]; });
  if (nd.atMax) tips.push(`${I.name} trägt höchstens ${islandMax(I)} Menschen. Wer mehr will, schickt Siedler im Kanu los und gründet anderswo ein Dorf.`);
  else if (nd.full) tips.push('Baue Häuser, dann ziehen mehr Menschen zu.');
  if (tips.length) h += `<p class="sub">${tips.join(' ')}</p>`;
  if (nd.list.some(n => n.k === 'essen' && n.state === 'out')) h += `<p class="sub">Ohne Nahrung ziehen nach und nach Leute fort.</p>`;
  // the way to a chief's village, step by step
  h += `<p class="sec">${I.lvl === 3 ? 'Häuptlingsdorf' : 'Weg zum Häuptlingsdorf'}</p><ul class="list needs">${chiefSteps(I, nd).map(s => `<li class="${s.ok ? 'okk' : ''}"><span class="state ${s.ok ? 'ok' : 'out'}">${s.ok ? '✓' : '–'}</span><span class="nm">${s.t}<small>${s.now}</small></span></li>`).join('')}</ul>`;
  { const f = chiefFam(I); if (f){ const m = I.people.find(p => p.id === I.mat), c = I.people.find(p => p.id === I.chief); h += `<p class="sub">${famName(f)} lebt im Häuptlingshaus.${m ? ` Matriarchin ist ${m.n}.` : ''}${c && I.lvl === 3 ? ` Häuptling ist ${c.n}.` : ''} Sie braucht dazu ${andList(CHIEF_GOODS.map(k => GN[k]))}.</p>`; } }
  return h;
}
const activeCount = I => I.buildings.filter(b => b.bt && !KINDS[b.kind].plant).length;
/* When the next person moves in, and why nobody does */
function arrivalText(I, nd){
  if (nd.missing.length) return `Niemand zieht zu, es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`;
  if (nd.atMax) return `Die Insel ist voll: ${islandMax(I)} Menschen trägt sie, mehr nicht, auch mit mehr Häusern. Siedler können anderswo ein Dorf gründen.`;
  if (nd.roofless && !nd.growing) return `${nd.roofless} ohne Dach warten auf ein Haus. Erst dann ziehen neue Familien zu.`;
  if (nd.full) return 'Die Häuser sind voll. Ein leeres Haus zieht eine neue Familie an.';
  const per = GROW_EVERY * TICK / 1000 / (I.joyUntil > tick ? 2 : 1), next = (GROW_EVERY - tick % GROW_EVERY) * TICK / 1000, g = growTarget(I, nd.list), f = g && famOfHome(I, g);
  return `Alle ${String(per).replace('.', ',')} Sekunden kommt jemand dazu, der Nächste in ${next} Sekunden${f ? ` zu ${famName(f)}` : ' in ein leeres Haus'}.`;
}
/* The line under the goods: work, builders, how long the food lasts, the next arrival */
/* One hint in the head band, the one that matters most now: food running out, nobody moving in, full houses, or growth */
function vitalLine(I){
  const nd = needsOf(I), ic = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>`;
  const fn = nd.list.find(x => x.k === 'essen'), fnet = fn.make - fn.use - fn.work, left = fnet >= 0 ? Infinity : fn.stock / -fnet;
  if (left !== Infinity && left < 5) return `<span class="warn">${ic('essen')}${left < 1 ? 'Essen knapp' : `Essen ${Math.floor(left)} Min`}</span>`;
  if (nd.roofless) return `<span class="warn">${ic('haus')}${nd.roofless} ohne Dach</span>`;
  if (nd.missing.length) return `<span class="warn">${ic(nd.missing[0].k)}fehlt</span>`;
  if (nd.atMax) return `<span>${ic('insel')}Insel voll</span>`;
  if (nd.full) return `<span>${ic('pop')}Häuser voll</span>`;
  return `<span>${ic('pop')}+1 in ${(GROW_EVERY - tick % GROW_EVERY) * TICK / 1000} s</span>`;
}
/* Storage sheet: every good on the island with what comes in and goes out per minute */
function storeMarkup(I){
  const nd = needsOf(I), rows = ['essen', ...GOODS].map(k => {
    const make = ofNeed(k, q => makeRate(I, q)), need = nd.list.find(n => n.k === k), use = (need ? need.use : 0) + ofNeed(k, q => workUse(I, q)), have = haveOf(I, k);
    return {k, make, use:FOODS.includes(k) ? workUse(I, k) : use, have, sub:FOODS.includes(k)};
  }).filter(g => g.k === 'essen' || g.have || g.make || g.use);
  let h = head(`Lager auf ${I.name}`, `Platz für ${storeCap(I)} von jeder Ware. Mehr Platz gibt jeder Speicher.${I._back && tick - I._back.at < 150 ? ' Links steht, was vor deiner Rückkehr da war.' : ''}`);
  h += `<ul class="list needs">${rows.map(g => `<li class="${g.sub ? 'sub-row' : ''}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${g.k}"/></svg><span class="nm">${GN[g.k]}<small>${g.make ? `+${perMin(g.make)}` : '+0'} ${g.use ? `−${perMin(g.use)}` : ''} pro Minute</small></span>${I._back && tick - I._back.at < 150 && I._back.d[g.k] ? `<small class="back">${I._back.d[g.k][0]} →</small>` : ''}<b class="qty">${g.have}</b>${g.k === 'essen' ? '' : `<button class="chip" type="button" data-act="ware" data-k="${g.k}" aria-label="Wer macht ${GN[g.k]}?">Wer?</button>`}</li>`).join('')}</ul>`;
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
  let h = head(C.name, `Auf ${T.name}, etwa ${C.pop} Menschen.${C.culture ? ' Eine andere Kultur.' : ''}`);
  if (C.culture) h += `<p>${C.text}</p><p class="sub"><b>Was sie euch geben können:</b> ${C.gift}${C.teach === 'nav' && stats.nordLehre ? ' Das haben sie schon getan.' : C.life && lifeKnown(C.life) ? ' Das haben sie schon getan.' : ''}</p>`;
  h += `<p>Sie machen ${icons(C.makes)}.<br>Sie schätzen ${icons(C.wants)}.</p>`;
  h += `<p class="sub">${C.culture ? 'Auch bei ihnen' : 'Bei diesem Clan'} gibt es keine Preise. Ihr schickt eine Gabe, und sie antworten später mit dem, was sie machen. Je mehr Knoten die Schnur hat, desto reicher fällt die Gegengabe aus. Muschelschmuck knüpft einen Knoten extra. Kommt lange nichts, löst sich ein Knoten.</p>`;
  h += C.motif ? `<p class="sub">${motifIcon(C.motif, 'inline')}Ihr Muster: ${MOTIFS[C.motif].n}. ${kin(T) ? 'Sie stempeln auch euer Muster, ihr seid verwandt: Eure Gaben zählen bei ihnen ein Fünftel mehr.' : 'Bringt ihnen Töpfe mit eurem Muster, dann werden sie euch verwandt, und eure Gaben zählen mehr.'}</p>` : `<p class="sub">Sie töpfern nicht. ${kin(T) ? 'Aber eure Töpfe mit eurem Muster schätzen sie: Eure Gaben zählen bei ihnen ein Fünftel mehr.' : 'Bringt ihnen Töpfe mit eurem Muster, dann zählen eure Gaben mehr.'}</p>`;
  // marriage: who is married to them, who went to live with them, and a wedding to arrange
  { const wed = islands.filter(I => I.settled).flatMap(I => (I.people || []).filter(p => p.w === T.id && !p.f).map(p => [p, I])), out = inlawsOf(T), c = weddingCheck(T);
    h += `<p class="sec">Heiraten</p>`;
    if (wed.length || out.length) h += `<ul class="list needs">${wed.map(([p, I]) => `<li>${icon('pop')}<span class="nm">${p.n} und ${p.sp || 'Partner'}<small>leben auf ${I.name}</small></span></li>`).join('')}${out.map(x => `<li>${icon('pop')}<span class="nm">${x.n}<small>aus ${x.from}, lebt jetzt ${clanBeim(C)}</small></span></li>`).join('')}</ul>`;
    h += `<p class="sub">${wed.length || out.length ? 'Ihr seid verwandt: Die Schnur löst sich nicht, eure Gaben zählen mehr, und sie kommen als Gäste zum Fest der Plejaden.' : 'Eine Hochzeit bindet zwei Völker: Die Schnur löst sich nicht mehr, Gaben zählen mehr, und die Verwandten kommen zum Fest.'}</p>`;
    h += `<div class="rowx"><span class="sub">${c.ok ? `${c.p.n} aus ${c.I.name}, ${Math.floor(ageOf(c.p))} Jahre, könnte heiraten. Brautgaben: ${costText(BRIDE_GIFTS)}. Der neue Partner zieht zu euch.` : c.why}</span><button class="btn primary" type="button" data-act="wed" ${c.ok ? '' : 'disabled'}>Hochzeit</button></div>`; }
  if (r) h += `<p>${r.knots} Knoten Vertrauen. ${T.debt >= 1 ? 'Eine Gegengabe ist unterwegs oder kommt bald.' : 'Gerade schulden sie euch nichts.'}</p>`;
  h += r ? `<div class="rowx"><span class="sub">Fahr mit einem beladenen Kanu hin oder setze eines in die Schnur.</span><button class="btn primary" type="button" data-act="gift">Schnur ansehen</button></div>` : `<p class="sub">Fahr mit einem Kanu hin, dann entsteht eine Schnur.</p>`;
  return h;
}
/* The arrival: the start islands side by side, what each offers, and where the canoe lands */
const polyArea = P => Math.abs(P.reduce((t, p, i) => { const q = P[(i + 1) % P.length]; return t + p.x * q.y - q.x * p.y; }, 0)) / 2;
function landFacts(I){
  const M = isl('tochter'), all = landingChoices(), area = J => polyArea(J.lands[0].poly), trees = J => (J.trees || []).length, dist = J => Math.hypot(M.center.x - J.center.x, M.center.y - J.center.y);
  const most = f => all.every(J => J === I || f(I) > f(J)), least = f => all.every(J => J === I || f(I) < f(J));
  return [most(area) ? 'Die größere Insel' : 'Die kleinere Insel', `${trees(I)} Bäume${most(trees) ? ', mehr Wald' : ''}`, I.river ? 'ein Bach' : '', depsOf(I, 'ton').length ? 'Ton für Töpfe' : 'kein Ton', depsOf(I, 'basalt').length ? 'Basalt für Beile' : 'kein Basalt',
    least(dist) ? `${M.name} mit Pandanus und Kokos liegt nah` : `${M.name} liegt weiter weg`].filter(Boolean).join(', ') + '.';
}
function landingMarkup(){
  const pick = sheetData && sheetData.id ? isl(sheetData.id) : null, list = landingChoices(), M = isl('tochter'), to = landing && landing.target ? isl(landing.target) : null;
  let h = head('Die Ankunft', 'Vor dreitausend Jahren, östlich des alten Landes.');
  if (to) return h + `<p>Das Ahnenkanu ist unterwegs nach ${to.name}. Sobald es anlegt, entsteht dort euer Dorf.</p>`;
  if (pick && pick.type === 'atoll') h += `<p><b>${pick.name}</b> ist ein Atoll: kein Ton, kein Stein, kaum Holz. Wählt eine hohe Insel.</p>`;
  else h += `<p>Fünf Familien im Ahnenkanu, mit Setzlingen und zwei Schweinen. Vor euch: zwei hohe Inseln und das Atoll ${M.name}. Wo landet ihr?</p>`;
  h += `<ul class="list needs">${list.map(I => `<li class="${pick === I ? 'pick' : ''}">${icon('insel')}<span class="nm">${I.name}<small>${landFacts(I)}</small></span><span class="chips"><button class="chip" type="button" data-act="lookat" data-i="${I.id}">Ansehen</button><button class="btn primary small" type="button" data-act="found" data-i="${I.id}">Hier landen</button></span></li>`).join('')}</ul>`;
  h += `<div class="rowx"><span class="sub">Aufgaben führen Schritt für Schritt ins Spiel.</span><span class="chips" role="group" aria-label="Einführung"><button class="chip" type="button" data-act="intro" data-v="on" aria-pressed="${!landing.skip}">Mit Einführung</button><button class="chip" type="button" data-act="intro" data-v="off" aria-pressed="${!!landing.skip}">Ohne</button></span></div>`;
  return h;
}
/* The end of the tasks: what the clan has built, and the sea stays open */
function finaleMarkup(){
  const mine = islands.filter(I => I.settled), people = mine.reduce((t, I) => t + I.pop, 0), friends = routes.filter(r => isl(r.a).clan || isl(r.b).clan);
  const row = (k, label, v) => `<li><svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${k ? `<use href="#ic-${k}"/>` : ''}</svg><span class="nm">${label}</span><b class="qty">${v}</b></li>`;
  let h = head('Die große Fahrt ist vollbracht', `Nach ${yearOf() + 1} ${yearOf() ? 'Jahren' : 'Jahr'} auf See und an Land.`);
  h += `<p>Vom ersten Versammlungshaus auf ${isl('heimat').name} aus ist ein Netz aus Dörfern und Freundschaften entstanden, bis über die Weite See zu den Fernen Inseln, wie es die Lapita-Leute vor über dreitausend Jahren über den Pazifik gespannt haben.</p>`;
  h += `<ul class="list needs">${row('pop', 'Eigene Dörfer', mine.length)}${row('pop', 'Menschen', people)}${row('schnur', 'Befreundete Clans', friends.length)}${row('schnur', 'Knoten auf allen Schnüren', routes.reduce((t, r) => t + r.knots, 0))}${row('einbaum', 'Kanus', own().length)}${row('mana', 'Ansehen', Math.floor(mana))}${row('', 'Entdeckte Inseln', islands.filter(I => I.discovered).length)}</ul>`;
  { const met = cultureIsles(); if (met.length) h += `<p>Am Rand der bekannten See habt ihr Menschen einer anderen Kultur getroffen: ${andList(met.map(I => I.clan.name))}.</p>`; }
  h += `<p class="sub">Das Meer bleibt offen. Es gibt noch Nebel zu lichten, Dörfer zu Häuptlingsdörfern zu machen und Feste zu feiern.</p>`;
  return h + `<div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Weiterspielen</button></div>`;
}
/* ---------- a building: who works there, one line on how it goes, the rest folded away */
const pipH = k => `<svg class="pip" viewBox="-2.7 -6.5 5.4 7" aria-hidden="true">${PIP[k]}</svg>`;
const SHORT = {storm:'Sturm', crew:'keine Leute', way:'Leute auf dem Weg', trees:'keine Bäume', full:'Lager voll', boat:'kein Einbaum', carving:'Einbaum entsteht', space:'kein Platz'};
const shortWhy = w => w.why === 'use' ? `kein ${G1[w.k]}` : w.why === 'near' ? `zu wenig ${NEAR_PL[w.kind]}` : SHORT[w.why] || 'steht still';
const secsText = s => s < 90 ? `${Math.max(1, Math.ceil(s))} s` : `${Math.round(s / 60)} min`;
function crewMarkup(I, b){
  const sl = slotsOf(I, b, staffOf(I), presentAt(I)); if (!sl) return '';
  const K = KINDS[b.kind], ids = (staffOf(I).crewP.get(b) || []), people = ids.map(id => I.people.find(p => p.id === id)).filter(Boolean);
  const chips = sl.map((k, i) => { const p = people[i]; return p ? `<button class="who ${k}" type="button" data-act="who" data-p="${p.id}">${pipH(k)}${p.n}</button>` : `<span class="who ${k}">${pipH(k)}${k === 'off' ? 'zu' : 'frei'}</span>`; }).join('');
  // a workplace is worked by one family; building sites and the canoe house by whoever is free
  if (b.bt || (b.kind === 'werft' && I.yard)) return `<div class="crew">${chips}</div>`;
  const f = famsOf(I).find(q => q.job === b.id);
  const ctl = `<span class="grow"></span><span class="step"><button type="button" data-act="famdel" aria-label="Familie abziehen" ${f ? '' : 'disabled'}>−</button><button type="button" data-act="famadd" aria-label="Familie schicken">+</button></span>`;
  return `<div class="crew">${f ? `<button class="chip" type="button" data-act="fam" data-f="${f.id}">${famName(f)}</button>` : '<span class="sub">keine Familie</span>'}${chips}${ctl}</div>`;
}
/* A family on its own sheet: its house and step, what it has and lacks, its people by name, where it works */
function famMarkup(I, f, withHead = true){
  const nd = needsOf(I), m = membersOf(I, f), t = famTier(I, f), fn = famNeeds(I, f, nd.list), job = f.job && findB(f.job);
  const name = k => k === 'dach' ? 'Dach' : GN[k], icn = k => k === 'dach' ? 'haus' : k;
  let h = withHead ? head(famName(f), `${f.home ? TIERS[t].n : 'Ohne Dach, unter Matten beim Versammlungshaus'} · ${I.name}`) : `<p class="sec">${famName(f)} · ${TIERS[t].n}</p>`;
  const met = fn.filter(n => n.state !== 'out').length;
  h += `<div class="stat"><b>${met} von ${fn.length} erfüllt</b><span class="mbar" style="flex:1"><i style="width:${met / fn.length * 100}%"></i></span></div><div class="chips">${fn.map(n => `<span class="need-chip ${n.state}">${icon(icn(n.k))}${name(n.k)}</span>`).join('')}</div>`;
  if (t === 1 && f.home) h += `<p class="sub">Nächste Stufe, Familie der Tufunga: dazu ${andList(TIER2_GOODS.map(k => GN[k]))} im Lager. Dann baut sie aus (${costText(TIERS[2].cost)}) und hat Platz für ${TIERS[2].cap}.</p>`;
  if (!f.home) h += `<p class="sub">Sobald ein Haus frei ist, zieht sie ein.</p>`;
  h += `<div class="folk">${m.map(p => `<button class="who chip" type="button" data-act="who" data-p="${p.id}">${p.s === 'm' ? '♂' : '♀'} ${p.n}<small>${Math.floor(ageOf(p))}${stageOf(p) === 'kid' ? ', Kind' : stageOf(p) === 'old' ? ', alt' : ''}</small></button>`).join('')}</div>`;
  h += `<div class="rowx"><span class="sub">Arbeit: ${famWork(I, f)}</span>${job ? `<button class="chip" type="button" data-act="goto" data-b="${job.id}">Zum Arbeitsplatz</button>` : ''}${f.home && !withHead ? '' : f.home ? `<button class="chip" type="button" data-act="goto" data-b="${f.home}">Zum Haus</button>` : ''}</div>`;
  return h;
}
/* A good on its own sheet: who makes it, where, and who uses it */
function wareMarkup(I, k){
  const by = I.buildings.filter(b => !b.bt && KINDS[b.kind].prod && (prodOf(b) === k || (byOf(b) || {})[k]));
  const use = I.buildings.filter(b => !b.bt && KINDS[b.kind].use && Object.keys(KINDS[b.kind].use).some(q => q === k || (GROUPS[q] || []).includes(k)));
  const need = needsOf(I).list.find(n => n.k === k), sf = staffOf(I);
  const line = b => { const ids = sf.crewP.get(b) || [], f = famsOf(I).find(q => q.job === b.id), w = b.idle || workState(I, b);
    return `<li>${icon(prodOf(b) || k)}<span class="nm">${KINDS[b.kind].n}<small>${f ? famName(f) + ': ' : ''}${ids.map(id => { const p = I.people.find(q => q.id === id); return p ? `<button class="link" type="button" data-act="who" data-p="${id}">${p.n}</button>` : ''; }).join(', ') || (KINDS[b.kind].crew ? 'niemand' : 'arbeitet von selbst')}${w ? ` · ${shortWhy(w)}` : ''}</small></span><button class="chip" type="button" data-act="goto" data-b="${b.id}">Hin</button></li>`; };
  let h = head(GN[k], `${I.name}: ${I.stock[k] || 0} im Lager, +${perMin(makeRate(I, k))} −${perMin(workUse(I, k) + (need ? need.use : 0))} pro Minute`);
  h += `<p class="sec">Wer macht es</p>` + (by.length ? `<ul class="list needs">${by.map(line).join('')}</ul>` : `<p class="sub">Niemand auf ${I.name}.</p>`);
  if (use.length) h += `<p class="sec">Wer braucht es</p><ul class="list needs">${use.map(line).join('')}</ul>`;
  if (need) h += `<p class="sub">Die Familien brauchen ${perMin(need.use)} pro Minute.</p>`;
  return h;
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
    if (!crewAt(I, b)) more.unshift(`Es wird an ${builders(I)} ${builders(I) === 1 ? 'Stelle' : 'Stellen'} zugleich gebaut, je 10 Bewohner eine mehr.`);
  } else if (b.boat > 0){
    const f = 1 - b.boat / K.canoe;
    line = `${crewAt(I, b) ? st('ok', 'Einbaum wird geschnitzt') : st('out', 'niemand schnitzt')}<span>${Math.round(f * 100)} %</span>`;
    bar = `<span class="mbar big"><i style="width:${f * 100}%"></i></span>`;
    more.unshift(b.kind === 'steg' ? 'Erst wenn der Einbaum fertig ist, fährt er zu den Pfahlhäusern.' : 'Erst wenn der Einbaum fertig ist, fahren die Fischer hinaus.');
  } else if (K.prod || K.plants){
    const w = b.idle || workState(I, b), rate = PER_MIN / K.every / pace(I, K) / (K.soil ? soilPace(b) : 1), uses = K.use ? Object.entries(K.use).map(([k, v]) => `${icon(groupNext(I, k))}${perMin(rate * v)}`).join('') + '<span class="arr">→</span>' : '';
    const by = byOf(b) ? Object.entries(byOf(b)).map(([k, v]) => `${icon(k)}${perMin(rate * v)}`).join('') : '';
    line = `${w ? st('out', shortWhy(w)) : st('ok', 'arbeitet')}${K.prod ? `<span>${uses}${icon(prodOf(b))}${perMin(rate)}${by}<small>/min</small></span>` : `<span>${icon('sapling')}alle ${K.every * TICK / 1000} s</span>`}`;
    // a climber picks ripe nuts for food, fibre and shells, or green ones for water
    if (K.green) why += `<div class="rowx"><span class="sub">${isGreen(b) ? 'Grüne Nüsse: nur Wasser.' : 'Reife Nüsse: Nahrung, Fasern, Schalen.'}</span><span class="chips"><button class="chip" type="button" data-act="green" data-v="0" aria-pressed="${!isGreen(b)}">Reif</button><button class="chip" type="button" data-act="green" data-v="1" aria-pressed="${isGreen(b)}">Grün</button></span></div>`;
    if (K.trees) line += `<span>${icon('holz')}${treesNear(I, b.x, b.y, K.trees.r).length} Bäume</span>`;
    // divers: whether the water allows diving, and how divers really worked
    if (K.dive){ const bl = diveBlock(I); line += `<span>${icon(bl ? 'sturm' : 'passat')}${bl ? 'kein Tauchwetter' : 'ruhiges, klares Wasser'}</span>`;
      more.push('Sie tauchen ohne Brille, ein Stein zieht sie hinab, der Partner im Kanu wacht. Nach einigen Gängen ruhen sie an Land, sonst droht Taravana.',
        'Bei Sturm, nachts und unter Rāhui tauchen sie nicht.',
        I.treasure && I.treasure.k === 'perlmutt' ? 'Vor Tifa liegen die Perlmuscheln tief: mehr Pause, aber Perlmutt.' : I.atoll ? 'Aus Riesenmuschelschalen schleifen sie hier Beile.' : 'Sie bringen Riesenmuscheln, Kraken und Seegurken.'); }
    // the soil of a field: how much is left, and letting it rest
    if (K.soil){ line += `<span>${icon('soil')}Boden ${Math.round((b.soil ?? 1) * 100)} %${sheltered(I, b) ? ', Bäume schützen ihn' : ''}</span>`;
      why += `<div class="rowx"><span class="sub">${b.fallow ? 'Liegt brach, bis der Boden ausgeruht ist.' : 'Jede Ernte zehrt am Boden. Brach erholt er sich in gut zwei Minuten.'}</span><button class="btn" type="button" data-act="fallow">${b.fallow ? 'Wieder bestellen' : 'Brachliegen lassen'}</button></div>`; }
    if (w && w.why !== 'way') why = `<p class="sub why">${w.text}</p>`;
  }
  if (K.boost && !b.bt) more.push(tooled(I, K) ? `Mit ${GN[K.boost.k]} aus dem Lager geht es schnell. ${K.boost.k === 'schnur' ? 'Ein Netz' : 'Ein Beil'} hält für ${K.boost.per} ${GN[K.prod]}.` : `Ohne ${GN[K.boost.k]} geht es ${K.boost.slow === 2 ? 'nur halb so schnell' : 'langsamer'}.`);
  if (K.beauty && !b.bt) line += `<span>Schönheit +${K.beauty}</span>`;
  if (b.kind === 'sternhaus') more.push('Stufe 1: Vögel zeigen, wo im Nebel Land liegt. Stufe 2: Wolken stehen über Inseln. Stufe 3: Der Proviant reicht länger, das Doppelkanu sieht weiter.',
    'Wer lernt, kommt eine Stufe weiter als sein Lehrer. Stufe 2 nach drei neuen Inseln, Stufe 3 nach sieben.');
  if (K.roof && !b.bt){ const age = roofAge(b); more.push(age < .34 ? 'Frisches Dach.' : age < .8 ? 'Das Dach wird grau.' : 'Altes Dach, bald erneuern.'); }
  return [crewMarkup(I, b) + bar + (line ? `<div class="stat">${line}</div>` : '') + why, `<details class="more"${sheetData.more ? ' open' : ''}><summary>Mehr dazu</summary>${more.map(t => `<p class="sub">${t}</p>`).join('')}</details>`];
}
function head(title, sub){ return `<div class="sheet-head"><div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div><button class="x" type="button" data-act="close" aria-label="Schließen">×</button></div>`; }
/* a sheet about an island that is gone (another game was loaded or begun) closes instead of failing */
const sheetGone = () => !!sheetData && typeof sheetData.id === 'string' && !isl(sheetData.id);
function renderSheet(){
  if (sliding) return;
  const body = $('sheetBody'); let h = '';
  if (sheetGone()){ closeSheet(); return; }
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
    if (HOME_KINDS.has(b.kind) && !b.bt){ const f = famOfHome(I, b); h += f ? famMarkup(I, f, false) : `<p class="sub">Leer. Eine neue Familie zieht ein, sobald Nahrung und Wasser reichen.</p>`; }
    if (b.kind === 'werft' && !b.bt) h += yardMarkup(I);
    if (b.kind === 'sternhaus' && !b.bt){
      const L = navLore(), S = navPupil(I, b), lv = p => Math.floor(p.nv || 0);
      h += `<div class="stat"><span>${icon('einbaum')}Wissen des Clans: ${L.lvl ? `Stufe ${L.lvl}, ${NAV_N[L.lvl]}` : 'noch keines'}</span>${L.best ? `<span>bei ${L.best.p.n} auf ${L.best.I.name}</span>` : ''}</div>`;
      if (S){ const {p, master, goal, who} = S, now = p.nv || 0;
        h += `<p class="sub">${p.n} lernt${master ? ` bei ${who.n} (Stufe ${master})` : ' allein, langsam'}: ${now >= goal ? `Stufe ${lv(p)}, mehr geht gerade nicht. ${navCap() <= lv(p) ? 'Erst neue Inseln auf See bringen neues Wissen.' : 'Erst muss ein anderer mehr wissen.'}` : `auf dem Weg zu Stufe ${lv(p) + 1}, ${NAV_N[lv(p) + 1]}.`}</p>${now < goal ? `<span class="mbar big"><i style="width:${Math.round((now - lv(p)) * 100)}%"></i></span>` : ''}`; }
      else if (!crewAt(I, b)) h += '<p class="sub">Niemand sitzt bei den Steinen. Ohne Lehrer lernt keiner.</p>';
    }
    if (b.kind === 'toepfer' && !b.bt) h += `<p class="sec">Muster</p>${motifRows(I) || '<p class="sub">Sobald die ersten Töpfe gebrannt sind, findet das Dorf sein Muster.</p>'}<p class="sub">${motifHelp(I)}</p>`;
    if (b.kind === 'ahnenhaus' && !b.bt) h += `<div class="rowx"><span class="sub">${ancCount(I)} Ahnen${I.chiefs && I.chiefs.length ? `, ${I.chiefs.length} Häuptlinge` : ''}</span><button class="chip" type="button" data-act="folk">Ahnenreihe</button></div>`;
    if (b.kind === 'halle' && !b.bt) h += `<div class="rowx"><span class="sub">${korCanThrow() ? 'Im Schatten wird mit fünf Knochen geworfen, einmal am Tag.' : 'Der Kōruru-Wurf ist für heute geworfen.'}</span><button class="btn" type="button" data-act="koruru">Kōruru-Wurf</button></div>`;
    if (b.kind === 'halle' && !b.bt){ if (feastsOpen()) h += `<p class="sub">Ansehen des Clans: ${Math.floor(mana)}.</p>` + feastMarkup(I); h += festivalMarkup(I); }
    h += more;
    if (sheetData.confirm) h += `<div class="rowx"><span>${Object.keys(costOf(b.kind, I)).length ? 'Wirklich entfernen? Die Hälfte kommt zurück.' : 'Wirklich entfernen?'}</span><span class="chips"><button class="btn" type="button" data-act="nokill">Behalten</button><button class="btn primary" type="button" data-act="kill">Entfernen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips">${FELL_WOOD[b.kind] && !b.bt ? `<button class="btn" type="button" data-act="fell">Fällen: ${FELL_WOOD[b.kind]} Holz</button>` : ''}<button class="btn" type="button" data-act="move">Versetzen</button><button class="btn" type="button" data-act="askkill">Entfernen</button></span></div>`;
  } else if (sheetKind === 'away'){
    // while you were away: one row for each thing that happened
    const {R, lines, years} = sheetData;
    h += head('Während ihr fort wart', `${awayTime(R.ms)}${years > 0 ? `, auf den Inseln ${years === 1 ? 'ein Jahr' : `${years} Jahre`}` : ''}.`);
    h += lines.length ? `<ul class="list needs">${lines.map(([k, t, r]) => `<li>${icon(k)}<span class="nm">${t}</span>${r ? `<span class="st">${r}</span>` : ''}</li>`).join('')}</ul>` : '<p class="sub">Alles ist ruhig geblieben.</p>';
    h += `<p class="sub">In der Zeit ist niemand hungrig fortgezogen, kein Sturm kam, und das Ansehen ist geblieben.</p><div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Weiter</button></div>`;
  } else if (sheetKind === 'fam'){
    const I = isl(sheetData.id), f = I && famOf(I, sheetData.f); if (!f){ closeSheet(); return; }
    h += famMarkup(I, f);
  } else if (sheetKind === 'ware'){
    h += wareMarkup(isl(sheetData.id), sheetData.k);
  } else if (sheetKind === 'folk'){
    // everyone by name: the chief and the line of chiefs, grown-ups, children, the old, and the ancestors
    const I = isl(sheetData.id), P = (I.people || []).slice().sort((a, b) => a.b - b.b), by = st => P.filter(p => stageOf(p) === st);
    const chip = p => `<span class="who${I.chief === p.id || I.mat === p.id ? ' chief' : ''}">${I.mat === p.id ? 'Matriarchin ' : ''}${p.n}<small>${Math.floor(ageOf(p))}</small></span>`, group = (t, list) => list.length ? `<p class="sec">${t} · ${list.length}</p><div class="folk">${list.map(chip).join('')}</div>` : '';
    h += head(`Die Menschen von ${I.name}`, `${P.length} leben hier${ancCount(I) ? `, ${ancCount(I)} sind bei den Ahnen` : ''}. Die Zahl ist das Alter in Jahren; ein Jahr dauert zwölf Minuten.`);
    if (I.chiefs && I.chiefs.length) h += `<p class="sub"><b>Häuptlinge:</b> ${I.chiefs.join(' · ')}</p>`;
    h += group('Erwachsene', by('adult')) + group('Kinder', by('kid')) + group('Alte', by('old'));
    { const W = P.filter(p => p.w && isl(p.w)); if (W.length) h += `<p class="sec">Verheiratet mit anderen Völkern · ${W.length}</p><p class="sub">${W.map(p => `${p.n} und ${p.sp || 'Partner'}${p.f ? ` (${p.n} kam ${clanVom(isl(p.f).clan)})` : ` (${clanVom(isl(p.w).clan)})`}`).join(' · ')}</p>`; }
    const A = (I.ahnen || []).slice().reverse();
    if (A.length) h += `<p class="sec">Ahnen · ${ancCount(I)}</p><div class="folk">${A.map(([n, b, d, c]) => `<span class="who off">${c ? 'Häuptling ' : ''}${n}<small>${Math.floor((d - b) / YEAR)}</small></span>`).join('')}</div>${ancCount(I) > A.length ? `<p class="sub">und ${ancCount(I) - A.length} Ahnen der alten Zeit. Die Namen der Häuptlinge bleiben alle.</p>` : ''}` + (I.buildings.some(b => b.kind === 'ahnenhaus' && !b.bt) ? '' : `<p class="sub">Mit einem Ahnenhaus bringt jeder, der stirbt, dem Clan Ansehen.</p>`);
  } else if (sheetKind === 'rename'){
    // an island can get the name its people give it
    const I = isl(sheetData.id);
    h += head('Insel benennen', I.custom ? `Früher ${I.name0}.` : 'So nennen die Leute sie bisher.') + `<div class="rowx"><input id="nameIn" class="name-in" type="text" maxlength="18" autocomplete="off" value="${esc(I.name)}" aria-label="Name der Insel"><button class="btn primary" type="button" data-act="rename">Benennen</button></div>`;
  } else if (sheetKind === 'koruru'){
    h += koruruMarkup();
  } else if (sheetKind === 'landing'){
    h += landingMarkup();
  } else if (sheetKind === 'intro'){
    const first = sheetData && sheetData.first;
    h += head(first ? 'Land in Sicht' : 'So geht es', first ? `Euer Ahnenkanu ist auf ${isl('heimat').name} gelandet.` : '');
    h += `<ul class="help"><li>Oben steht die nächste Aufgabe. Tippe darauf, dann zeigt das Spiel den Weg.</li><li>Tippe oben auf die Bewohnerzahl: Dort steht, was fehlt und wer wo arbeitet.</li><li>Tippe auf die Waren: Das ganze Lager, mit Zu- und Abgang pro Minute.</li><li>Bauen: Baumenü öffnen, etwas wählen, auf Land tippen, Bauen.</li><li>Alles braucht Holz und Leute. An jeder Baustelle arbeiten 2.</li><li>Alles Essen zählt als Nahrung: Feldfrüchte, Fisch, Meeresfrüchte, Kokos.</li><li>Ein Jahr dauert zwölf Minuten. Kinder arbeiten ab sechs, irgendwann gehen alle zu den Ahnen.</li><li>Kanu antippen, dann Meer oder Insel antippen. Die Schnur zwischen Inseln ist eine Handelskette.</li><li>Felder laugen aus. Lass sie brachliegen und schone den Wald.</li><li>Ziehen schiebt die Karte, zwei Finger oder Mausrad zoomen.</li><li>Die Inseln leben bis zu acht Stunden weiter, wenn das Spiel zu ist.</li></ul>`;
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
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="help">So geht es</button><button class="btn" type="button" data-act="chronik">Chronik</button><button class="btn" type="button" data-act="koruru">Kōruru-Wurf</button>${quest >= QUESTS.length ? '<button class="btn" type="button" data-act="finale">Rückblick</button>' : '<button class="btn" type="button" data-act="skipq">Ohne Einführung</button>'}</span></div>` +
      `<div class="rowx"><span class="chips"><button class="chip" type="button" data-act="sound" aria-pressed="${opts.sound}">Klang</button><button class="chip" type="button" data-act="night" aria-pressed="${opts.night}">Tag und Nacht</button></span><button class="btn" type="button" data-act="askreset">Neu anfangen</button></div>`;
  }
  body.innerHTML = h; lastSig = sheetSig(); if (sheetKind === 'koruru') koruruMount();
}
let lastSig = '';
function sheetSig(){
  if (sheetGone()) return 'gone';
  if (sheetKind === 'quest') return quest + ':' + (QUESTS[quest] ? QUESTS[quest].n() : '');
  if (sheetKind === 'needs' || sheetKind === 'store' || sheetKind === 'mana'){ const I = isl(active), nd = needsOf(I); const sf = staffOf(I); return [sheetKind, active, I.pop, I.lvl, Math.floor(mana), nd.cap, sf.free, sf.build, famsOf(I).map(f => f.job + ':' + f.home).join(), I.handWork, tick % GROW_EVERY, [...presentAt(I).values()].join(':'), sf.free, sf.short, ...GOODS.map(k => I.stock[k] || 0), ...I.buildings.map(b => b.idle ? b.idle.why : ''), wildWord(wildOf(I)), !!I.tapu, (I.life || []).join('+'), motifsOf(I).join('+')].join(); }
  if (sheetKind === 'clan'){ const T = isl(sheetData.id), r = routes.find(q => q.a === T.id || q.b === T.id); return [r && r.knots, T.debt >= 1, kin(T), bondsWith(T), !!weddingCheck(T).ok].join(); }
  if (sheetKind === 'fam'){ const I = isl(sheetData.id), f = I && famOf(I, sheetData.f); if (!f) return 'gone'; return [f.home, f.job, famTier(I, f), membersOf(I, f).map(p => p.id + stageOf(p)).join(), famNeeds(I, f, needsOf(I).list).map(n => n.state).join(), famWork(I, f)].join(); }
  if (sheetKind === 'ware'){ const I = isl(sheetData.id), sf = staffOf(I); return [I.stock[sheetData.k], ...[...sf.crewP].map(([b, ids]) => b.id + ':' + ids.join('.')), ...I.buildings.map(b => b.idle ? b.idle.why : '')].join(); }
  if (sheetKind === 'calendar') return [moonOf(), isl(active).rahui, Math.floor(untilFestival() / 30)].join();
  if (sheetKind === 'fleet') return own().map(s => [s.state, s.port, s.route, s.hungry].join(':')).join() + routes.map(r => r.knots).join();
  if (sheetKind === 'ship'){
    const s = ships.find(q => q.id === sheetData.id); if (!s) return 'gone';
    const P = s.port ? isl(s.port) : null;
    return [s.diving ? s.diving.n + ':' + Object.values(s.diving.found).join('.') : '-', (spotNear(s) || {}).id, s.state, s.port, s.route, s.hungry, s.people, cargoLoad(s), (s.life || []).join('+'), s.auto, P && P.treasure ? P.treasure.left : "", Math.floor(mana), P && P.pop, ...(P ? GOODS.map(k => Math.min(P.stock[k] || 0, 30)) : [])].join();
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
  const fam = HOME_KINDS.has(b.kind) ? (f => f ? [f.id, membersOf(I, f).length, famTier(I, f), famNeeds(I, f, needsOf(I).list).map(n => n.state).join(''), famWork(I, f)].join(':') : 'leer')(famOfHome(I, b)) : (famsOf(I).find(f => f.job === b.id) || {}).id;
  return ['a' + age, b.bt, b.boat, b.got, here, fam, (staffOf(I).crewP.get(b) || []).join('.'), Math.round((b.soil ?? 1) * 20), b.fallow, b.idle && b.idle.why, crewAt(I, b), capOf(b), KINDS[b.kind].trees ? treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).length : '', yard, staffOf(I).yard, hall].join();
}
let sliding = false;   // while a slider is dragged the sheet is not drawn anew, or the drag would break off
$('sheetBody').addEventListener('input', e => { const el = e.target; if (!el.matches('input[type=range][data-act]')) return; sliding = true; slideTo(el); updateHUD(); });
document.addEventListener('pointerup', () => { if (sliding) setTimeout(() => { if (sliding){ sliding = false; save(); renderSheet(); } }, 0); }, true);
$('sheetBody').addEventListener('change', e => { if (!e.target.matches('input[type=range][data-act]')) return; sliding = false; save(); renderSheet(); });
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
    if (act === 'green'){ const I = islOfB(b.id); b.v = {...(b.v || {}), green:btn.dataset.v === '1'}; b._by = null; b.idle = null; I.staff = null; updateHUD(); renderSheet(); save(); return; }
    if (act === 'fell'){ const I = islOfB(b.id), n = FELL_WOOD[b.kind] || 0; I.stock.holz = Math.min(storeCap(I), (I.stock.holz || 0) + n); stats.gefaellt = (stats.gefaellt || 0) + 1; I.buildings = I.buildings.filter(x => x.id !== b.id); I.staff = null; syncWalkers(); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} gefällt: ${n} Holz. Was sie trug, ist fort.`, 2800, false); return; }
    if (act === 'fallow'){ const I = islOfB(b.id); b.fallow = !b.fallow; if (b.fallow) stats.brache = (stats.brache || 0) + 1; b.idle = null; I.staff = null; syncWalkers(); invalidate(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'famadd' || act === 'famdel'){ const I = islOfB(b.id); if (act === 'famadd') famAssign(I, b); else famRelease(I, b); updateHUD(); renderSheet(); save(); return; }
    if (act === 'mc-' || act === 'mc+'){ const K = KINDS[b.kind], I = islOfB(b.id), n = clamp(capOf(b) + (act === 'mc+' ? 1 : -1), 0, K.crew); b.v = {...b.v, mc:n}; if (n === K.crew) delete b.v.mc; I.staff = null; syncWalkers(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'askkill'){ sheetData.confirm = true; renderSheet(); return; }
    if (act === 'nokill'){ sheetData.confirm = false; renderSheet(); return; }
    if (act === 'kill'){ const I = islOfB(b.id), c = costOf(b.kind, I); for (const [k, v] of Object.entries(c)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + Math.floor(v / 2)); I.buildings = I.buildings.filter(x => x.id !== b.id); I.staff = null; syncWalkers(); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} ist weg.`, 2600, false); return; }
    if (act === 'feast'){ holdFeast(islOfB(b.id), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  }
  if (sheetKind === 'quest' && act === 'showq'){ showQuest(); return; }
  if (act === 'skipq'){ closeSheet(); skipTutorial(); return; }
  if (sheetKind === 'landing' && act === 'intro' && landing){ landing.skip = btn.dataset.v === 'off'; renderSheet(); return; }
  if (sheetKind === 'landing' && act === 'lookat'){ const I = isl(btn.dataset.i); if (I){ sheetData = {id:I.id}; renderSheet(); flyTo(I.center.x, I.center.y, Math.max(cam.z, .9)); } return; }
  if (sheetKind === 'landing' && act === 'found'){ chooseHome(isl(btn.dataset.i)); return; }
  if (sheetKind === 'rename' && act === 'rename'){ renameIsland(isl(sheetData.id), $('nameIn').value); return; }
  if (act === 'tapu' && sheetKind === 'needs'){ const I = isl(active); setTapu(I, !I.tapu); renderSheet(); return; }
  if (act === 'folk'){ openSheet('folk', {id:sheetKind === 'info' ? islOfB(sheetData.id).id : active}); return; }
  if (sheetKind === 'needs' && act === 'work'){ const I = isl(active); I.handWork = btn.dataset.v === 'hand'; I.staff = null; syncWalkers(); updateHUD(); save(); renderSheet(); return; }
  if (act === 'fam'){ openSheet('fam', {id:sheetKind === 'info' ? islOfB(sheetData.id).id : sheetData && sheetData.id && isl(sheetData.id) ? sheetData.id : active, f:+btn.dataset.f}); return; }
  if (act === 'who'){ focusPerson(+btn.dataset.p); return; }
  if (act === 'koruru'){ if (!kor || kor.state === 'done' && korCanThrow()) korNew(); openSheet('koruru', {}); return; }
  if (sheetKind === 'koruru' && act === 'kthrow' && korCanThrow()){ korRoll(false); renderSheet(); return; }
  if (sheetKind === 'koruru' && act === 'kre' && kor.rolls < 2){ korRoll(true); renderSheet(); return; }
  if (sheetKind === 'koruru' && act === 'ktake' && kor.state === 'rolled'){ korTake(); renderSheet(); return; }
  if (act === 'ware'){ openSheet('ware', {id:active, k:btn.dataset.k}); return; }
  if (act === 'goto'){ const b = findB(+btn.dataset.b); if (b){ closeSheet(); select(b); flyTo(b.x, b.y, Math.max(cam.z, 2.4)); } return; }
  if (sheetKind === 'mana' && act === 'feast'){ holdFeast(isl(active), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  if (sheetKind === 'clan' && act === 'wed'){ wedClan(isl(sheetData.id)); renderSheet(); return; }
  if (sheetKind === 'clan' && act === 'gift'){ const ri = routes.findIndex(r => r.a === sheetData.id || r.b === sheetData.id); if (ri >= 0) openRoute(ri); return; }
  if (sheetKind === 'menu'){
    if (act === 'help'){ openSheet('intro'); return; }
    if (act === 'finale'){ openSheet('finale'); return; }
    if (act === 'chronik'){ openSheet('chronik'); return; }
    if (act === 'sound'){ setSound(!opts.sound); renderSheet(); return; }
    if (act === 'night'){ opts.night = !opts.night; saveOpts(); requestDraw(); renderSheet(); return; }
    if (act === 'askreset'){ sheetData = {confirm:true}; renderSheet(); return; }
    if (act === 'reset'){ try { localStorage.removeItem(SAVE_KEY); } catch (err){} newGame(); beginLanding(); toast('Neues Spiel, neue Inseln.', 2600, false); return; }
  }
});
const giftGuess = (C, worth) => { const g = returnGoods(C, worth); return g.load ? giftText(g.cargo) : 'eine kleine Gabe'; };
function select(b){ selectedId = b.id; invalidate(); setActive(islOfB(b.id).id); openSheet('info', {id:b.id}); }
