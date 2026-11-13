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
  // contentment instead of the jobless (everyone without a place helps anyway): a face and the village's average
  { const S = satOfIsle(I), v = S.avg, m = satBand(v), lo = S.all[0];
    $('satNum').textContent = v; $('satBtn').dataset.m = m; $('satMouth').setAttribute('d', SAT_FACE[m][0]); $('satFace').setAttribute('fill', SAT_FACE[m][1]);
    $('satBtn').setAttribute('aria-label', `Zufriedenheit ${v} von 100${lo ? `. Am wenigsten zufrieden: ${lo[0].n}, ${lo[1].v}` : ''}. Tippen zeigt warum.`); }
  // the dot next to the people count: green while the village grows, yellow when the houses are full, red when something is missing
  const nd = needsOf(I), st = nd.missing.length ? 'out' : nd.full ? 'full' : 'ok';
  $('popDot').className = 'dot ' + st;
  $('popBtn').setAttribute('aria-label', `${I.pop} Bewohner, Platz für ${nd.cap}. ${growText(I, nd)} Tippen zeigt den Bedarf.`);
  // the goods row shows what matters here: all food as one, wood, then whatever is stored, made or needed, at most seven
  // the goods row: food, water, wood, thatch and cord first, then what matters here; few while the village is small
  const first = ['essen', 'wasser', 'holz', 'dach', 'schnur'], more = GOODS.filter(k => !FOODS.includes(k) && !first.includes(k) && ((I.stock[k] || 0) > 0 || makeRate(I, k) > 0 || nd.list.some(n => n.k === k)));
  const shown = [...first, ...more].slice(0, I.pop < 15 ? 5 : 7);
  const ul = $('goods'); if (ul.dataset.keys !== shown.join()){ ul.dataset.keys = shown.join(); ul.innerHTML = shown.map(k => `<span class="g" data-k="${k}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span></span><small class="gl" aria-hidden="true">${shortGN(k)}</small></span>`).join(''); }
  // food and water turn red when the next morning meal will not reach everyone (see mealFore)
  const F = mealFore(I), cold = fireShort(I), short = k => k === 'essen' ? F.food < F.n : k === 'wasser' ? F.water < F.n : k === 'holz' ? cold : false;   // wood too, when the night fires will not all burn
  for (const li of ul.children){ const k = li.dataset.k, v = haveOf(I, k); li.querySelector('span').textContent = v; li.classList.toggle('zero', !v); li.classList.toggle('short', short(k));
    if (lastStock.isl === active && v >= (lastStock[k] || 0) + 2){ li.classList.remove('up'); void li.offsetWidth; li.classList.add('up'); } }
  lastStock = {isl:active, ...I.stock, essen:haveOf(I, 'essen')};
  $('vitalBtn').innerHTML = vitalLine(I);
  // what does not fit next to the hint is left out whole, never cut in half (the store sheet shows everything)
  for (const li of ul.children) li.hidden = false;
  { const edge = ul.getBoundingClientRect().right + 1; for (const li of ul.children) if (li.getBoundingClientRect().right > edge) li.hidden = true; }
  $('storeBtn').setAttribute('aria-label', 'Lager: ' + shown.map(k => `${GN[k]} ${haveOf(I, k)}${short(k) ? ', reicht morgen früh nicht' : ''}`).join(', ') + `. Am Morgen essen und trinken ${F.n} Menschen. Tippen zeigt alles.`);
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
  const can = k => !KINDS[k].fixed && !KINDS[k].craft && KINDS[k].on.includes(I.type) && unlocked(k) && (!KINDS[k].dep || depsOf(I, KINDS[k].dep).length) && (!SPEC_OF_KIND[k] || specOf(I) === SPEC_OF_KIND[k]), deco = ORDER.filter(k => DECO.includes(k) && can(k));
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
  dayRing();
  C.querySelector('span b').textContent = 'Wind aus ' + W.ab; C.querySelector('span small').textContent = W.word; C.setAttribute('aria-label', `Wind aus ${W.dir}, ${W.word}`);
}
/* the rim of the bar: only light (the day, the first DAY_END of the turn from the top) and dark (the night), fixed in the css.
   A sun walks the light part and turns into a moon at dusk, which walks the dark part and is the sun again at dawn. No time is shown. */
const DAY_END = .66;   // the share of a day that is light
let ringAt = 0;
const dayBlend = p => { const c = x => Math.max(0, Math.min(1, x)); return p < .5 ? c(.5 - p / .08) : Math.min(c((p - (DAY_END - .04)) / .08), c(1 - (p - .96) / .08)); };   // 0 = sun, 1 = moon
function dayRing(){
  const H = $('hudbar'); if (!H) return; H.classList.toggle('noday', !opts.night); const M = $('dayMark');
  if (!opts.night){ if (M) M.hidden = true; H.removeAttribute('data-day'); H.setAttribute('aria-label', 'Wind, Kalender, Nachrichten und Menü'); return; }
  const p = dayPhase(), night = p >= DAY_END, deg = p * 360, m = dayBlend(p);
  // the sun or the moon rides on the rim, where the ray of the gradient meets it
  if (M){ const r = H.getBoundingClientRect(), w = r.width, h = r.height, a = (deg - 90) * Math.PI / 180, cx = Math.cos(a), cy = Math.sin(a), k = Math.min(cx ? (w / 2) / Math.abs(cx) : 1e9, cy ? (h / 2) / Math.abs(cy) : 1e9);
    M.hidden = false; M.style.left = (w / 2 + cx * k).toFixed(1) + 'px'; M.style.top = (h / 2 + cy * k).toFixed(1) + 'px'; M.style.setProperty('--m', m.toFixed(2)); M.className = m < .5 ? 'sun' : 'moon'; }
  H.dataset.day = night ? 'nacht' : 'tag';
  H.setAttribute('aria-label', `${night ? 'Nacht' : 'Tag'}. Wind, Kalender, Nachrichten und Menü`);
}
/* the name under each good in the top row: short, so it fits under its icon */
const SHORT_GN = {essen:'Essen', roh:'Rohes Essen', meeres:'Meeresfr.', nahrung:'Feldfrucht', wild:'Wild', dach:'Wedel', faser:'Fasern', kokos:'Kokos', schalen:'Kokosch.', muschel:'Muschel', schweine:'Schweine', haken:'Haken', kumete:'Holzsch.', oel:'Öl', brenn:'Brenn.', perlmutt:'Perlm.', federn:'Federn', tabua:'Walzahn', kauri:'Kauri', talisman:'Talisman', reisig:'Brennholz', schmuck:'Schmuck', feinmatten:'F. Matten', bemtapa:'B. Tapa', harz:'Harz', klingen:'Klingen', proviant:'Proviant'};
const shortGN = k => SHORT_GN[k] || (GN[k] && GN[k].length <= 8 ? GN[k] : (GN[k] || k).slice(0, 7) + '.');
function villageCenter(I){
  const hs = I.buildings.filter(b => KINDS[b.kind].roof); if (!hs.length) return I.anchor || I.center;
  return {x:hs.reduce((t, b) => t + b.x, 0) / hs.length, y:hs.reduce((t, b) => t + b.y, 0) / hs.length};
}
function setActive(id){ if (active === id || !isl(id).settled) return; active = id; renderBuildBar(); }
/* ---------- messages: they unroll from the conch shell on the right like a strip of bark cloth and roll up again.
   What happens in the world is kept, and the shell unfolds the last ones. Quick answers to a tap are not kept. */
let toastT = 0, news = [], unread = 0;
/* Every message unrolls under the bar, stays a moment, and then flies into the conch, where it is kept: the conch holds
   the last 120 messages of this game, also after the game was closed (they lie beside the save, not in it). */
const NEWS_MAX = 120, newsKey = () => `polinusa-news-${curSlot}`;
function newsAdd(msg){
  if (news[0] && news[0].msg === msg){ news[0].at = Date.now(); news[0].n = (news[0].n || 1) + 1; }
  else { news.unshift({msg, at:Date.now(), y:yearOf() + 1, m:moonOf() + 1}); if (news.length > NEWS_MAX) news.length = NEWS_MAX; }
  try { localStorage.setItem(newsKey(), JSON.stringify(news)); } catch (e){}
}
function loadNews(){ try { const l = JSON.parse(localStorage.getItem(newsKey()) || '[]'); news.length = 0; if (Array.isArray(l)) news.push(...l.filter(n => n && typeof n.msg === 'string').slice(0, NEWS_MAX)); } catch (e){} }
/* the colour of a message, read from its words: a warning, good news, or plain paper */
const TOAST_BAD = /fehlt|fehlen|\bohne\b|Sturm|\bfort\b|Hunger|hungert|Durst|verloren|krank|gestorben/i, TOAST_GOOD = /Fest|Kind\b|Chronik|gegründet|geboren/;
const toastTone = m => TOAST_BAD.test(m) ? 'warn' : TOAST_GOOD.test(m) ? 'good' : '';
function toast(msg, ms = 2600, keep = true){
  if (awayQuiet) return;
  newsAdd(msg);
  if (newsOpen()){ renderNews(); if (keep) return; }
  else if (keep){ unread++; newsBadge(); }
  const t = $('toast'); t.textContent = msg; t.dataset.tone = toastTone(msg); t.hidden = false; t.classList.remove('open', 'fly'); t.style.transform = ''; void t.offsetWidth; t.classList.add('open');
  clearTimeout(toastT); toastT = setTimeout(foldToast, ms + 600);
}
function foldToast(){
  const t = $('toast'), c = $('newsBtn'); clearTimeout(toastT); if (t.hidden || !t.classList.contains('open')){ t.classList.remove('open'); t.hidden = true; return; }
  // it shrinks and flies into the conch, and the conch nods
  const a = t.getBoundingClientRect(), b = c.getBoundingClientRect();
  if (!reduced && a.width && b.width){ t.style.transform = `translate(${(b.left + b.width / 2 - a.left - a.width / 2).toFixed(1)}px, ${(b.top + b.height / 2 - a.top - a.height / 2).toFixed(1)}px) scale(.08)`; t.classList.add('fly'); c.classList.remove('nod'); void c.offsetWidth; c.classList.add('nod'); }
  t.classList.remove('open');
  toastT = setTimeout(() => { if (!t.classList.contains('open')){ t.hidden = true; t.classList.remove('fly'); t.style.transform = ''; } }, 520);
}
const newsOpen = () => !$('newsList').hidden;
function newsBadge(){ const n = $('newsNum'); n.hidden = !unread; n.textContent = unread > 9 ? '9+' : unread; $('newsBtn').setAttribute('aria-label', unread ? `Nachrichten, ${unread} neu` : 'Nachrichten'); }
const ago = at => { const s = (Date.now() - at) / 1000; return s < 60 ? 'eben' : s < 3600 ? `vor ${Math.floor(s / 60)} Min` : s < 172800 ? `vor ${Math.floor(s / 3600)} Std` : `vor ${Math.floor(s / 86400)} Tagen`; };
/* a slot in the menu: what is in it, and the buttons to play it or begin it anew */
function slotRow(n){
  const me = n === curSlot, info = me ? {at:Date.now(), sum:landing ? null : saveSum()} : slotInfo(n), s = info && info.sum;
  const what = me && landing ? 'Das Kanu sucht noch Land' : s ? `${s.n} · ${s.p} Menschen${s.d > 1 ? ` in ${s.d} Dörfern` : ''} · ${s.y}. Jahr` : info ? 'Ein Spiel' : 'Leer';
  return `<li class="${me ? 'okk' : ''}">${icon('insel')}<span class="nm">Spielstand ${n}<small>${what}${!me && info && info.at ? ` · ${ago(info.at)}` : ''}</small></span>` +
    (me ? chipS('ok', 'jetzt') : `<button class="btn small primary" type="button" data-act="slot" data-n="${n}">${info ? 'Spielen' : 'Beginnen'}</button>`) +
    (me || info ? `<button class="chip" type="button" data-act="${me ? 'askreset' : 'askslot'}" data-n="${n}">Neu</button>` : '') + '</li>';
}
const esc = t => t.replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
function renderNews(){ $('newsList').innerHTML = `<p class="cap">Nachrichten</p>` + (news.length ? `<ul>${news.map(n => `<li><small>${n.y ? `Jahr ${n.y}, ${n.m}. Mond · ` : ''}${ago(n.at)}${n.n > 1 ? ` · ${n.n}-mal` : ''}</small>${esc(n.msg)}</li>`).join('')}</ul>` : '<p class="empty">Noch ist nichts geschehen.</p>'); }
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
  if (K.spring && !I.river){ toast('Auf dieser Insel fließt kein Bach. Das Erntehaus holt grüne Nüsse zum Trinken.', 3600, false); return; }
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
/* One compact row for the place bar: what a site takes (green in store, red missing) -> what it makes, and the crew */
const miniTile = (cls, k, ic, n) => `<span class="mt ${cls}" role="img" aria-label="${GN[k]}${n ? ' ' + n : ''}">${icon(ic)}<small>${tileName(k)}</small></span>`;
function miniFlow(I, K){
  const outs = K.picks ? Object.keys(K.picks).slice(0, 3) : K.prod ? [K.prod] : [];
  if (!outs.length) return '';
  const ins = Object.entries(K.use || {}).map(([k, v]) => miniTile(groupHave(I, k) >= v ? 'ok' : 'out', k, GROUPS[k] ? groupNext(I, k) : k, v));
  if (K.boost) ins.push(miniTile((I.stock[K.boost.k] || 0) > 0 ? 'ok tool' : 'tool', K.boost.k, K.boost.k, ''));
  const crew = K.crew ? `<span class="mt crew" role="img" aria-label="${K.crew} Arbeiter">${icon('pop')}<small>${K.crew}</small></span>` : '';
  return `${ins.length ? `<span class="mlbl">Braucht</span>${ins.join('')}<span class="marr">→</span>` : ''}<span class="mlbl">Macht</span>${outs.map(k => miniTile('made', k, k, '')).join('')}${crew}`;
}
/* The overview "Werk": one row per kind of production site on the island */
function werkMarkup(I){
  const ws = I.buildings.filter(b => KINDS[b.kind].prod && !b.at && !KINDS[b.kind].fixed && !HOME_KINDS.has(b.kind));
  if (!ws.length) return `<p class="sub">Noch keine Werkstatt auf ${I.name}.</p>`;
  const groups = []; for (const b of ws){ const g = groups.find(q => q.k === b.kind); if (g) g.l.push(b); else groups.push({k:b.kind, l:[b]}); }
  groups.sort((a, c) => a.l.every(b => b.bt) - c.l.every(b => b.bt));
  return `<ul class="list werk">${groups.map(g => { const K = KINDS[g.k], done = g.l.filter(b => !b.bt), b0 = done[0] || g.l[0];
    let w = null, run = 0; for (const b of done){ const q = b.idle || workState(I, b); if (q) w = w || q; else run++; }
    const st = !done.length ? ['low', 'wird gebaut'] : w && !run ? ['out', shortWhy(w)] : w ? ['low', `${run} von ${done.length} laufen`] : ['ok', 'läuft'];
    const outs = (K.picks ? [prodOf(b0)] : [K.prod]).filter(Boolean).map(k => miniTile('made', k, k, ''));
    const ins = Object.entries(K.use || {}).map(([k, v]) => miniTile(groupHave(I, k) >= v ? 'ok' : 'out', k, GROUPS[k] ? groupNext(I, k) : k, v));
    return `<li class="wrow"><button class="wgo" type="button" data-act="goto" data-b="${b0.id}" aria-label="${K.n}: ${st[1]}. Hingehen"><span class="wnm">${bIcon(g.k)}<b>${g.l.length > 1 ? g.l.length + '× ' : ''}${K.s}</b></span><span class="wfl">${ins.join('')}<span class="mgrp">${ins.length ? '<span class="marr">→</span>' : ''}${outs.join('')}</span></span><span class="state ${st[0]}">${st[1]}</span></button></li>`; }).join('')}</ul>`;
}
function showPlaceBar(){
  const K = KINDS[placing.kind], I = isl(placing.island);
  $('placeName').textContent = (mode === 'move' ? 'Versetzen: ' : '') + K.n;
  const secs = Math.round(K.bt * TICK / 1000), c = costOf(placing.kind, I);
  const facts = [Object.keys(c).length ? `Kostet ${costText(c)}` : '', K.plant ? `wächst ${secs} s` : `${secs} s Bauzeit`, K.crew ? `${K.crew} Arbeiter` : ''].filter(Boolean).join(', ');
  const pf = mode === 'move' ? '' : miniFlow(I, K);
  $('placeFlow').innerHTML = pf; $('placeFlow').hidden = !pf;
  $('placeInfo').textContent = mode === 'move' ? 'Ziehen oder woanders hintippen.' : pf ? `${facts[0].toUpperCase() + facts.slice(1)}.` : `${facts[0].toUpperCase() + facts.slice(1)}. ${K.info}`;
  // a workplace nobody is free for stays empty: say so before it is built, not after
  if (mode !== 'move' && K.crew && !K.craft && !staffOf(I).free) $('placeInfo').textContent += ' Gerade ist niemand frei: Der Platz bleibt leer, bis eine Familie mehr da ist.';
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
  if (mode === 'move'){ const b = findB(placing.moveId); if (b){ b.x = fx(placing.x); b.y = fx(placing.y); b.v = placing.v; clearStumps(I, b); moveCraft(I, b); I.staff = null; syncWalkers(); } endPlace(); invalidate(); save(); toast(`${K.n} versetzt.`, 2600, false); return; }
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
function openSheet(kind, data){
  closeNews();   // a sheet covers the map; the news would hang over it
  if (kind !== 'ship') endSteer(); sliding = false; sheetKind = kind; sheetData = data;
  const el = $('sheet'); if (el.hidden && !reduced){ el.classList.add('opening'); clearTimeout(el._op); el._op = setTimeout(() => el.classList.remove('opening'), 700); }
  el.hidden = false; renderSheet(); measure();
}
/* the meter strip (see meterTick) */
function showMeter(){ let el = $('meter'); if (!el){ el = document.createElement('div'); el.id = 'meter'; el.setAttribute('aria-hidden', 'true'); $('app').appendChild(el); } el.hidden = !opts.meter; if (opts.meter) el.textContent = 'misst …'; }
addEventListener("load", showMeter);   // after all scripts, when the options are read
/* a tap on any button sends rings out, as a pebble dropped in the lagoon */
document.addEventListener('pointerdown', e => {
  const bt = e.target.closest && e.target.closest('button'); if (bt && !bt.disabled) sfx('tap');
  const b = !reduced && bt; if (!b || b.disabled) return;
  const app = $('app'), r = app.getBoundingClientRect();
  for (const k of ['', ' b']){ const d = document.createElement('i'); d.className = 'tapring' + k; d.style.left = (e.clientX - r.left) + 'px'; d.style.top = (e.clientY - r.top) + 'px'; app.appendChild(d); setTimeout(() => d.remove(), 900); }
}, {passive:true});
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
const motifHelp = I => `${I.motif ? '' : I.type === 'hoch' ? 'Mit den ersten Töpfen findet das Dorf ein eigenes Muster. ' : 'Auf einem Atoll gibt es keinen Ton; Muster kommen mit Töpfen von anderswo. '}Wohin Töpfe fahren, wandern die Muster mit. Was zwei Jahre keine Töpfe wieder bringen, wird vergessen. Jedes fremde Muster schmückt das Dorf.`;
/* ---------- needs, as in Anno. Where something comes from: what makes it here, what could be built here, or that it has
   to come from outside, from another island or a clan */
function makersOf(I, k){ const ks = needGoods(k); return I.buildings.filter(b => !b.bt && KINDS[b.kind].prod && (ks.includes(prodOf(b)) || ks.some(q => (KINDS[b.kind].picks || {})[q] || (byOf(b) || {})[q]))); }
function needWay(I, k){
  const names = [...new Set(makersOf(I, k).map(b => placeName(b)))];
  const makes = q => { const K = KINDS[q]; return needGoods(k).includes(K.prod) || K.prod === k || (K.by || {})[k] || Object.entries(K.picks || {}).some(([pk, P]) => pk === k || (P.by || {})[k]); };
  const kinds = k === 'essen' ? ['ernte', 'fisch', 'taro', 'pulaka', 'pansammler', 'bananen'] : ORDER.filter(q => KINDS[q] && !KINDS[q].plant && makes(q));
  const here = kinds.filter(q => !KINDS[q].fixed && KINDS[q].on.includes(I.type) && unlocked(q) && hasLife(I, q) && !(KINDS[q].spring && !I.river) && (!SPEC_OF_KIND[q] || specOf(I) === SPEC_OF_KIND[q]));
  const build = here.find(q => !I.buildings.some(b => b.kind === q)) || here[0];
  if (build && KINDS[build].craft) return {text:names.length ? `${andList(names)} im Haus. Mehr davon in einem weiteren Haus` : doIt(build), build};
  if (build) return {text:names.length ? `Von ${andList(names)}. Mehr davon: ${KINDS[build].n}` : `Baue ${KINDS[build].n}`, build};
  if (names.length) return {text:`Von ${andList(names)}`};
  const any = kinds[0], K = any && KINDS[any];
  if (!K) return {text:`${GN[k]} kommt von anderen Inseln`, fleet:true, outside:true};
  if (!K.on.includes(I.type)) return {text:`${GN[k]} gibt es nur auf ${K.on.includes('atoll') ? 'Atollen' : 'hohen Inseln'}: Besiedelt eine oder tauscht im Kanu`, fleet:true, outside:true};
  if (SPEC_OF_KIND[any] && specOf(I) !== SPEC_OF_KIND[any]){ const isles = specIslesFor(k); return {text:`${K.n} geht nur auf Inseln mit ${SPECS[SPEC_OF_KIND[any]].n}${isles.length ? `, etwa ${isles[0].name}` : ''}: Besiedelt sie oder tauscht`, fleet:true, outside:true}; }
  if (!hasLife(I, any)) return {text:lifeMissing(I, any), fleet:true, outside:true};
  if (!unlocked(any)){ const st = STAGES[stageOfKind(any)], n = K.craft || K.n; return {text:st.gate ? `${n} kommt nach der großen Fahrt, mit ${st.n}` : `${n} kommt ab ${st.pop} Menschen`}; }
  return {text:`Baue ${K.n}`, build:any};
}
/* the roof as a need: a hut for a family without one; a worn roof wants palm fronds again, a family house a piece of wood */
function roofWay(I, b){
  if (!b) return {text:'Eine Hütte für jede Familie', build:'haus'};
  if (roofState(b) === 'ok') return {text:roofText(I, b)};
  const c = roofCost(b), miss = Object.keys(c).find(q => groupHave(I, q) < c[q]);
  if (!miss) return {text:'Die Familie deckt das Dach gleich neu'};
  const w = needWay(I, miss); return {...w, text:`Zum Neudecken fehlen ${GN[miss]}. ${w.text}`};
}
const wantWay = (I, k, b) => k === 'dach' ? roofWay(I, b) : needWay(I, k);
/* how long a roof holds and what it takes to cover it anew */
function roofText(I, b){
  const c = costText(roofCost(b)), st = roofState(b), w = b.rw || 0;
  if (st === 'out') return `Das Dach ist kaputt, es regnet hinein. Neu decken: ${c}`;
  if (st === 'low') return `Das Dach ist undicht. Neu decken: ${c}`;
  if (w >= ROOF.mend) return `Das Dach ist alt. Die Familie deckt es neu, sobald ${c} im Lager sind und ein paar Palmwedel übrig bleiben`;
  return `Das Dach hält noch etwa ${Math.max(1, Math.round((ROOF.mend - w) * ROOF.life / MOON))} Monde. Dann deckt die Familie es selbst neu: ${c}`;
}
const wayBtn = w => w && w.build ? `<button class="chip" type="button" data-act="hint" data-k="${w.build}">${KINDS[w.build].craft ? 'Im Haus' : 'Bauen'}</button>` : w && w.fleet ? `<button class="chip" type="button" data-act="fleetbar">Kanus</button>` : '';
const needName = k => k === 'dach' ? 'Dach' : k === 'brenn' ? 'Herdfeuer' : k === 'toepfe' && stats.hawaiki ? 'Töpfe oder Holzschalen' : GN[k], needIcon = k => k === 'dach' ? 'haus' : k;
/* Needs as knots on a cord of sennit, after the knotted cords on which the Marquesans kept their genealogies (taʻo mata):
   a knot tied tight is a need met, a loose loop one that runs short, a frayed gap one that is missing, a faint ring one
   that comes with the next step. Each knot can be tapped: it shows where the thing comes from. */
const KNOT_ST = {ok:'erfüllt', low:'knapp', out:'fehlt', next:'nächste Stufe', none:'noch nicht'};
function cordOf(knots, count){
  let h = '<div class="cord">';
  knots.forEach((q, i) => {
    if (q.bead){ h += '<i class="bead" aria-hidden="true"></i>'; return; }
    const act = q.k === 'dach' ? 'data-act="hint" data-k="haus"' : `data-act="${q.k === 'essen' ? 'store' : 'ware'}" data-k="${q.k}"`;
    h += `<button class="knot ${q.st}" type="button" ${act} aria-label="${needName(q.k)}: ${KNOT_ST[q.st]}" style="--d:${(i * .09).toFixed(2)}s"><svg class="kg" viewBox="0 0 24 20" aria-hidden="true"><use href="#kn-${q.st === 'none' ? 'next' : q.st}"/></svg>${icon(needIcon(q.k))}</button>`;
  });
  return h + (count ? `<b class="cnt">${count}</b>` : '') + '</div>';
}
function knotCord(I, f, t, nd, ahead = true){
  const cur = famNeeds(I, f, nd.list), nxt = ahead && t < 3 ? TIERS[t + 1].needs.filter(k => !TIERS[t].needs.includes(k)) : [];
  const ok = cur.filter(n => n.state !== 'out').length;   // a loose knot still holds
  return cordOf([...cur.map(n => ({k:n.k, st:n.state})), ...(nxt.length ? [{bead:true}] : []), ...nxt.map(k => ({k, st:'next'}))], `${ok}/${cur.length}`);
}
/* The long way, as one cord: every age of the village a knot, then the great voyage, and after it Hawaiki, the later
   time. Tied knots are behind you, the loose one is next (with the number of people it takes), the faint ones lie ahead. */
const EPOCH_IC = ['einbaum', 'setzling', 'schnur', 'toepfe', 'haus', 'plejaden', 'kava', 'mana'];
function epochCord(){
  const now = stageNow(), g = STAGES.findIndex(S => S.gate), far = hawaiki();
  const steps = STAGES.map((S, i) => ({n:S.n, ic:EPOCH_IC[i], st:i <= now ? 'ok' : i === now + 1 && (!S.gate || far) ? 'low' : 'next', pop:S.gate ? 0 : S.pop}));
  steps.splice(g, 0, {n:'Die große Fahrt', ic:'insel', st:far ? 'ok' : now >= g - 1 ? 'low' : 'next'});
  steps.push({n:'Die zweite Fahrt', ic:'passat', st:morningVillage() ? 'ok' : stats.pause ? 'low' : 'next'});   // across the Leere See to the Inseln des Morgens
  return `<div class="cord epochs" role="list" aria-label="Der Weg des Dorfes">${steps.map(q => `<span class="knot ${q.st}" role="listitem" aria-label="${q.n}${q.st === 'ok' ? ': erreicht' : q.pop ? `: ab ${q.pop} Menschen` : ''}"><svg class="kg" viewBox="0 0 24 20" aria-hidden="true"><use href="#kn-${q.st}"/></svg>${icon(q.ic)}${q.st === 'low' && q.pop ? `<small>${q.pop}</small>` : ''}</span>`).join('')}</div>`;
}
/* The way to a good this island cannot make, as a chain of pictures: canoe house, canoe, an island that has it, a
   village or a trade route there, the good in store. Done links are green, the first open one is a button. */
const canMakeOn = (J, k) => ORDER.some(q => { const K = KINDS[q]; return K && !K.plant && (K.prod === k || (K.picks && K.picks[k])) && K.on.includes(J.type) && (!SPEC_OF_KIND[q] || specOf(J) === SPEC_OF_KIND[q]); });
function outsideChain(I, k){
  const own = ships.filter(s => s.own), yardB = I.buildings.find(b => b.kind === 'werft' && !b.bt), there = islands.filter(J => J !== I && J.discovered && canMakeOn(J, k));
  const linked = there.some(J => J.settled) || routes.some(r => there.some(J => (r.a === I.id && r.b === J.id) || (r.b === I.id && r.a === J.id)));
  const steps = [
    {ic:bIcon('werft'), ok:!!yardB || own.length > 0, act:'data-act="hint" data-k="werft"', n:'Kanuhaus'},
    {ic:icon('einbaum'), ok:own.length > 0, act:yardB ? `data-act="goto" data-b="${yardB.id}"` : 'data-act="fleetbar"', n:'Kanu'},
    {ic:icon('insel'), ok:there.length > 0, act:'data-act="fleetbar"', n:`Eine Insel mit ${GN[k]}`},
    {ic:icon('pop'), ok:linked, act:'data-act="fleetbar"', n:'Dorf oder Handelsweg dorthin'},
    {ic:icon(k), ok:(I.stock[k] || 0) > 0, n:`${GN[k]} im Lager`}
  ], first = steps.findIndex(q => !q.ok);
  return `<div class="chain" role="list">${steps.map((q, i) => i === first && q.act ? `<button class="step-ic next" type="button" ${q.act} aria-label="${q.n}: als Nächstes">${q.ic}</button>` : `<span class="step-ic${q.ok ? ' ok' : ''}" role="listitem" aria-label="${q.n}${q.ok ? ': erledigt' : ''}">${q.ic}</span>`).join('<i class="arr" aria-hidden="true"></i>')}</div>`;
}
/* where something comes from, as one button with the building on it: tap it and the build bar shows that building */
const bIcon = k => `<svg class="bi" viewBox="${KINDS[k].vb || '-17 -29 34 33'}" aria-hidden="true">${iconMarkup(k)}</svg>`;
const buildPic = k => KINDS[k].craft ? icon(KINDS[k].prod) : bIcon(k), buildName = k => KINDS[k].craft ? 'Hauswerk' : KINDS[k].n;
const wayChip = w => w && w.build ? `<button class="chip way" type="button" data-act="hint" data-k="${w.build}">${buildPic(w.build)}${buildName(w.build)}</button>` : w && w.fleet ? `<button class="chip way" type="button" data-act="fleetbar">${icon('einbaum')}Kanus</button>` : '';
/* a house of a step, small, for the build-out pictures */
const tierPic = t => `<svg class="tierpic" viewBox="-17 -26 34 30" aria-hidden="true">${artOf('haus', {t2:t >= 2, t3:t >= 3})}</svg>`;
const knotIc = '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-knot"/></svg>';
/* ---------- a house: who lives here, the cord of its needs, and what it takes to rise */
const seatIc = '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-pop"/></svg>';
/* what a person does, as the picture of the place: the building they work at (dashed when they build it), a child, or idle */
function workPic(I, p){
  if (!isAdult(p)) return stageOf(p) === 'kid' ? icon('kind') : '';
  const site = [...staffOf(I).crewP].find(([q, ids]) => (q.bt || (q.kind === 'werft' && I.yard)) && ids.includes(p.id));
  if (site) return `<span class="wk site">${bIcon(site[0].kind)}</span>`;
  const b = p.job && findB(p.job); return b ? (b.at ? `<span class="wk craft">${icon(KINDS[b.kind].prod)}</span>` : bIcon(b.kind)) : icon('idle');
}
/* the household craft of a house, in one line: the craft taken up by its name with its hands ("Sennit drehen 1/1"), or a
   button to choose one. Tapped, the line opens into every craft this island knows, each with the name of its good; one
   that cannot be done here is faint and says why when tapped. */
/* closed, the household craft is one tile among the people of the house: "Hauswerk" over the craft and its hands, or
   "Hauswerk wählen"; what it lacks follows it */
function craftChip(I, h){
  if (!craftsHere(I).length) return '';
  const cur = craftOf(I, h), ws = cur && cur.idle && !['way', 'grow'].includes(cur.idle.why) ? cur.idle : null;
  if (!cur) return `<button class="who chip pers hw" type="button" data-act="craftpick"><span class="nm">Hauswerk</span><span class="job">wählen</span></button>`;
  const K = KINDS[cur.kind], n = crewAt(I, cur) || 0;
  return `<button class="who chip pers hw on${ws ? ' idle' : ''}" type="button" data-act="craftpick" aria-label="Hauswerk: ${K.craft}, ${n} von ${crewOf(cur)}${ws ? `. ${ws.text}` : ''}. Tippen zum Ändern"><span class="nm">${icon(K.prod)}Hauswerk${DRY_WORK.has(cur.kind) && dryPace() > 1 ? `<span class="wet" role="img" aria-label="Regenzeit: trocknet langsam">${icon('sturm')}</span>` : ''}</span><span class="job">${K.craft} ${n}/${crewOf(cur)}</span></button>` + (ws && ws.k ? `<span class="cost out" role="img" aria-label="${ws.text}">${icon(ws.k)}</span>` : '');
}
function craftRow(I, h){
  const ks = craftsHere(I); if (!ks.length) return '';
  const cur = craftOf(I, h), ws = cur && cur.idle && !['way', 'grow'].includes(cur.idle.why) ? cur.idle : null, open = !!(sheetData && sheetData.crafts);
  const lack = ws && ws.k ? `<span class="cost out" role="img" aria-label="${ws.text}">${icon(ws.k)}</span>` : '';
  if (!open) return `<div class="crafts">${craftChip(I, h)}</div>`;
  return `<div class="crafts open" role="group" aria-label="Hauswerk wählen"><span class="lbl">Hauswerk</span>${ks.map(k => { const K = KINDS[k], on = !!cur && cur.kind === k, why = on ? '' : craftWhy(I, h, k);
    return `<button class="chip craft${why ? ' no' : ''}" type="button" data-act="craft" data-b="${h.id}" data-k="${k}" aria-pressed="${on}" aria-label="${K.craft}${why ? `: ${why}` : ''}">${icon(K.prod)}<small>${K.craft}</small></button>`; }).join('')}<button class="chip" type="button" data-act="craftpick">Fertig</button></div>`;
}
/* ---------- a house at a glance, nothing to decode: who lives here and what each one does; what the family needs, one
   tile each with its name and a plain word (da, knapp, fehlt); the one thing to do next; and what the next step of the
   house takes, each good with its name and how much of it is there. */
const NEED_WORD = {ok:'da', low:'knapp', out:'fehlt'};
// the roof in its own words: it holds, it leaks, it is broken; a family without a house has none at all
function needWord(n, b){
  if (n.k !== 'dach') return NEED_WORD[n.state];
  if (n.state === 'low') return 'undicht';
  if (n.state === 'out') return b ? 'kaputt' : 'fehlt';
  const S = b && islOfB(b.id).storm; return S && S.tied.includes(b.id) ? 'fest' : 'hält';
}
const needShort = k => k === 'dach' ? 'Dach' : k === 'essen' ? 'Essen' : k === 'brenn' ? 'Feuer' : k === 'speisen' ? 'Gekochtes' : shortGN(k);
function needTile(I, n, b){
  const w = n.state === 'ok' ? null : wantWay(I, n.k, b);
  const act = n.k === 'dach' && b && !w ? `data-act="roof" data-b="${b.id}"` : w && w.build ? `data-act="hint" data-k="${w.build}"` : w && w.fleet ? 'data-act="fleetbar"' : n.k === 'dach' ? `data-act="roof" data-b="${b ? b.id : 0}"` : `data-act="${n.k === 'essen' ? 'store' : 'ware'}" data-k="${n.k}"`;
  return `<button class="ntile ${n.state}" type="button" ${act} aria-label="${needName(n.k)}: ${needWord(n, b)}">${icon(needIcon(n.k))}<small>${needShort(n.k)}</small><b>${needWord(n, b)}</b></button>`;
}
/* a cyclone on the way: is this roof tied down, and a button to send people to the roofs */
function stormLine(I, b){
  const S = I.storm; if (!S || tick >= S.at || !b) return '';
  const tied = S.tied.includes(b.id), secs = Math.ceil((S.at - tick) * TICK / 1000), lack = !tieCost(I);
  const what = tied ? 'Das Dach ist festgebunden.' : !S.tie ? 'Das Dach ist lose.' : lack ? 'Es fehlt Schnur oder Kokosfasern zum Festbinden.' : 'Gleich bindet es jemand fest.';
  return `<div class="nextline storm ${tied ? 'ok' : 'out'}"><span class="what">${icon('sturm')}<b>Sturm in ${secs} s</b> ${what}</span>${!tied && !S.tie ? '<button class="chip way" type="button" data-act="tieall">Dächer festbinden</button>' : ''}</div>`;
}
/* the one thing to do next: what is missing first, else what runs short, and the building that helps */
function nextStep(I, n, b){
  const w = wantWay(I, n.k, b), btn = w.build ? `<button class="chip way" type="button" data-act="hint" data-k="${w.build}">${buildPic(w.build)}${buildName(w.build)}</button>` : w.fleet ? `<button class="chip way" type="button" data-act="fleetbar">${icon('einbaum')}Kanus</button>` : '';
  return `<div class="nextline ${n.state}"><span class="what"><b>${needShort(n.k)} ${needWord(n, b)}</b>${btn ? '<span class="to" aria-hidden="true">→</span>' : `: ${w.text}.`}</span>${btn}</div>`;
}
/* what the next step of the house takes: the needs met, then each good with its name and how much is there */
function riseBlock(I, b, u, t, fn){
  const add = TIERS[u.t].needs.filter(k => !TIERS[t].needs.includes(k)), need = new Map();
  for (const q of u.steps) if (q.k !== 'needs') need.set(q.k, Math.max(need.get(q.k) || 0, q.need));
  const tileR = (k, label, txt, ok, act, far) => `<${act ? 'button' : 'span'} class="rtile ${ok ? 'ok' : 'out'}${far ? ' far' : ''}" ${act ? `type="button" ${act}` : 'role="img"'} aria-label="${label}: ${txt}${far ? ', kommt per Kanu' : ''}">${icon(k)}<small>${label}</small><b>${txt}</b></${act ? 'button' : 'span'}>`;
  let tiles = tileR('pop', 'Bedarf', `${fn.filter(x => x.state !== 'out').length}/${fn.length}`, u.steps[0].ok, null);
  for (const [k, v] of need){ const have = I.stock[k] || 0, ok = have >= v, w = ok ? null : needWay(I, k);
    tiles += tileR(k, shortGN(k), `${Math.min(have, v)}/${v}`, ok, w && w.build ? `data-act="hint" data-k="${w.build}"` : w && w.fleet ? 'data-act="fleetbar"' : `data-act="ware" data-k="${k}"`, w && w.outside); }
  const go = `<button class="btn primary${u.ready ? ' tie' : ''}" type="button" data-act="upgrade" data-b="${b.id}" ${u.ready ? '' : 'disabled'}>Ausbauen</button>`;
  return `<div class="rise2"><div class="rhead"><span class="rt"><b>Ausbau: ${u.T.n}</b><span class="sub">Platz für ${u.T.cap}${u.t === 2 ? ', Kinder kommen' : ''}${add.length ? ` · will dann auch ${andList(add.map(needShort))}` : ''}</span></span>${go}</div><div class="rtiles">${tiles}</div></div>`;
}
function houseMarkup(I, b, withHead = true){
  const f = famOfHome(I, b), t = tierOf(b), T = TIERS[t], nd = needsOf(I);
  if (!f){ const imm = immigFor(I); return (withHead ? head(T.n, 'leer') : '') + `<p class="sub">${imm ? `${icon('einbaum')} Ein Kanu bringt eine Familie.` : 'Wartet auf eine Familie aus der Ferne.'}</p>` + craftRow(I, b); }   // a hut by the clay can take up its craft before anyone lives there
  const m = membersOf(I, f), cap = homeCap(I, b), max = homeCapMax(I, b);
  const sub = `${T.n} · ${m.length} von ${cap} Plätzen${cap < max ? ` (bis ${max}, wenn alles da ist)` : ''}`;
  let h = withHead ? head(famName(f), sub) : `<p class="sub">${sub}</p>`;
  // the people: name and age, under it what they do
  const picking = !!(sheetData && sheetData.crafts);
  h += `<div class="folk home">${m.map(p => `<button class="who chip pers" type="button" data-act="who" data-p="${p.id}" aria-label="${p.n}, ${Math.floor(ageOf(p))}, ${personWork(I, p)}"><span class="nm">${p.n}<small>${Math.floor(ageOf(p))}</small></span><span class="job">${jobShort(I, p)}</span></button>`).join('')}${picking ? '' : craftChip(I, b)}</div>`;
  if (picking) return h + craftRow(I, b);   // while a craft is chosen, the choice stands in the place of the rest
  // what the family needs, one tile each; then the one thing to do next
  const fn = famNeeds(I, f, nd.list), lack = fn.filter(n => n.state === 'out').concat(fn.filter(n => n.state === 'low'));
  h += `<p class="sec needsec">Was die Familie braucht</p><div class="needtiles n${fn.length}">${fn.map(n => needTile(I, n, b)).join('')}</div>`;
  const sl = stormLine(I, b); if (sl) h += sl; else if (lack.length) h += nextStep(I, lack[0], b);
  const u = upgradeSteps(I, b, nd.list); if (u) h += riseBlock(I, b, u, t, fn);
  return h;
}
/* ---------- the village centre: the house by the plaza. Three tabs: the village (feasts, the rain dance, the knucklebones),
   the store with every good by name, and the family that lives there. */
function centerMarkup(I, b){
  const f = famOfHome(I, b), tab = (sheetData && sheetData.tab) || 'dorf';
  let h = head('Dorfzentrum', `${I.name}${f ? ` · hier wohnt ${famName(f)}` : ''}`);
  h += `<div class="tabs" role="tablist">${[['dorf', 'Dorf'], ['lager', 'Lager'], ['staerke', 'Stärke'], ['werk', 'Werk'], ['haus', 'Familie']].map(([k, n]) => `<button class="tab" role="tab" type="button" data-act="ctab" data-v="${k}" aria-selected="${tab === k}">${n}</button>`).join('')}</div>`;
  if (tab === 'haus') return h + houseMarkup(I, b, false);
  if (tab === 'staerke') return h + strengthMarkup(I);
  if (tab === 'werk') return h + werkMarkup(I);
  if (tab === 'lager'){ const F = mealFore(I), mm = F.food < F.n || F.water < F.n;
    return h + `<p class="sub${mm ? ' meal-bad' : ''}">Morgenmahl: ${F.n} Menschen essen und trinken je eine Portion. Bis dahin gibt es etwa ${F.food} Essen und ${F.water} Wasser.</p>` + storeTiles(I) + `<div class="rowx"><span class="sub">Platz für ${storeCap(I)} je Ware. Antippen zeigt, woher sie kommt.</span></div>`; }
  return h + villageMarkup(I, b);
}
const KNOCHEN_IC = '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-knochen"/></svg>';
function villageMarkup(I, b){
  const row = (ic, name, sub, btn) => `<div class="hubrow"><span class="hub-ic">${ic}</span><span class="hub-t"><b>${name}</b><small>${sub}</small></span>${btn}</div>`;
  let h = `<p class="sec">Feste · Ansehen ${Math.floor(mana)}</p>`;
  if (!feastsOpen()) h += `<p class="sub">Feste kommen mit der Aufgabe „Ein Fest“.</p>`;
  else for (const F of FEASTS.filter(F => feastShown(I, F))){ const no = feastState(I, F);
    h += row(icon(F.id === 'tatau' ? 'mana' : F.id === 'gross' ? 'schweine' : F.id === 'schatz' ? 'perlmutt' : 'nahrung'), F.n, no || `${costText(F.cost)}. Ansehen +${feastMana(I, F)}`, `<button class="btn${no ? '' : ' primary'}" type="button" data-act="feast" data-f="${F.id}" ${no ? 'disabled' : ''}>Feiern</button>`); }
  h += `<p class="sec">Rund um den Platz</p>`;
  const rs = rainState(I);
  h += row(icon('sturm'), 'Regentanz', rs || `Die Tänzer essen ${RAIN.cost.roh} vom Vorrat. Dann regnet es: Wasser für alle, die Felder trinken.`, `<button class="btn${rs ? '' : ' primary'}" type="button" data-act="rain" ${rs ? 'disabled' : ''}>Tanzen</button>`);
  // once kauri resin has been found: the matriarch cuts a talisman from it
  if (stats.kauri || (I.stock.kauri || 0) > 0 || (I.stock.talisman || 0) > 0){ const ts = talismanState(I), m = matriarchOf(I), have = I.stock.talisman || 0;
    h += row(icon('talisman'), 'Talisman der Matriarchin', `${ts || `${m.n} schnitzt ihn aus ${costText(TALISMAN.cost)}. Ansehen +${TALISMAN.mana}.`} ${have ? `${have} im Lager, hält${have > 1 ? ' je' : ''} einen Sturm ab.` : 'Hält einen Sturm von den Dächern.'}`, `<button class="btn${ts ? '' : ' primary'}" type="button" data-act="talisman" ${ts ? 'disabled' : ''}>Schnitzen</button>`); }
  h += row(KNOCHEN_IC, 'Knöchelwurf', korCanThrow() ? 'Einmal am Tag. Was fällt, bringt Glück.' : 'Für heute geworfen. Morgen wieder.', `<button class="btn" type="button" data-act="koruru">Werfen</button>`);
  return h;
}
/* which feasts the village centre lists: the small one and the tatau always, the great one once there are pigs and bark
   cloth on the islands, the feast of treasures once a treasure has been seen */
function feastShown(I, F){
  if (F.id === 'gross') return unlocked('pferch') || (I.stock.schweine || 0) > 0;
  if (F.id === 'schatz') return islands.some(J => J.treasure && J.discovered) || islands.some(J => J.settled && TREASURE_GOODS.some(k => (J.stock[k] || 0) > 0));
  return true;
}
/* the line of a house, for the last row of its sheet beside Versetzen and Entfernen */
function houseLine(I, b){ const f = famOfHome(I, b), p = f && membersOf(I, f)[0]; if (!p) return ''; const ln = p.ln; return `<span class="sub line">Linie ${lineName(ln)}${lineFrom(ln) ? ` ${lineFrom(ln)}` : ''}</span>`; }
/* ---------- the overview: Bewohner as in Anno (the houses by step and their needs), Arbeit, Insel */
/* what keeps the village from going on, in one line, with the button that helps */
function villageGoal(I, nd){
  const ready = readyHomes(I, nd.list);
  if (nd.roofless) return {cls:'out', t:`${nd.roofless} ohne Dach`, d:'', btn:wayChip({build:'haus'})};
  const miss = nd.missing.find(n => n.k === 'essen' || n.k === 'wasser'); if (miss){ const w = needWay(I, miss.k); return {cls:'out', t:`${GN[miss.k]} fehlt`, d:wayChip(w) ? '' : w.text, btn:wayChip(w) || wayBtn(w)}; }
  if (ready.length && !I.autoUp) return {cls:'up', t:`${ready.length} ${ready.length === 1 ? 'Haus' : 'Häuser'} zum Ausbau bereit`, d:'', btn:`<button class="btn primary small tie" type="button" data-act="upall">${knotIc}Alle ausbauen</button>`};
  // the next step up: what the first house that cannot rise yet still lacks
  const nb = homesOf(I).filter(b => famOfHome(I, b) && tierOf(b) < 3).sort((a, b) => tierOf(a) - tierOf(b)).find(b => upgradeSteps(I, b, nd.list)), next = nb && upgradeSteps(I, nb, nd.list);
  if (next && !next.ready){ const q = next.steps.find(x => !x.ok), k = q.k === 'needs' ? q.miss[0] : q.k, w = k ? (q.k === 'needs' ? wantWay(I, k, nb) : needWay(I, k)) : null;
    return w && w.outside ? {cls:'far', t:`Für ${next.T.n}: ${GN[k]}`, d:'', chain:outsideChain(I, k)} : {cls:'low', t:`Für ${next.T.n}: ${q.k === 'needs' ? q.t : `es fehlt ${q.t}`}`, d:w && !wayChip(w) ? w.text : '', btn:wayChip(w) || wayBtn(w)}; }
  if (nd.atMax) return {cls:'far', t:'Die Insel ist voll', d:`${I.name} trägt höchstens ${islandMax(I)} Menschen. Gründet ein Dorf auf einer anderen Insel.`, btn:wayBtn({fleet:true})};
  const st = STAGES[stageNow() + 1]; if (st && !st.gate && I.pop < st.pop) return {cls:'low', t:`Ab ${st.pop} Menschen: ${st.n}`, d:'Baut Hütten, dann kommen Familien. In Familienhäusern kommen Kinder.', btn:wayBtn({build:'haus'})};
  return null;
}
function needsMarkup(I){
  const tab = (sheetData && sheetData.tab) || 'leute', nd = needsOf(I);
  let h = head(I.name, `${LEVEL_NAMES[I.lvl || 1]} · ${I.pop} Bewohner · Platz für ${nd.cap}`);
  h += epochCord();
  h += `<div class="tabs" role="tablist">${[['leute', 'Bewohner'], ['arbeit', 'Arbeit'], ['insel', 'Insel']].map(([k, n]) => `<button class="tab" role="tab" type="button" data-act="tab" data-v="${k}" aria-selected="${tab === k}">${n}</button>`).join('')}</div>`;
  return h + (tab === 'arbeit' ? workTab(I, nd) : tab === 'insel' ? isleTab(I, nd) : peopleTab(I, nd));
}
const chipS = (cls, t) => `<span class="state ${cls}">${t}</span>`, barS = f => `<span class="mbar"><i style="width:${clamp(f, 0, 1) * 100}%"></i></span>`;
const rowS = (k, n, small, extra, right, cls = '') => `<li class="${cls}">${k ? icon(k) : ''}<span class="nm">${n}<small>${small}</small>${extra || ''}</span>${right || ''}</li>`;
function peopleTab(I, nd){
  let h = '';
  const g = villageGoal(I, nd); if (g) h += `<div class="goal ${g.cls}"><span><b>${g.t}</b>${g.d ? `<small>${g.d}</small>` : ''}${g.chain || ''}</span>${g.btn || ''}</div>`;
  // the houses by step, each with the needs of its step
  const roof = nd.roofless ? 'out' : 'ok';
  for (const t of [1, 2, 3, 4]){
    const hs = homesOf(I).filter(b => tierOf(b) === t), fams = hs.map(b => famOfHome(I, b)).filter(Boolean), people = fams.reduce((n, f) => n + membersOf(I, f).length, 0);
    const shown = hs.length || (t === 2 && unlocked('schnur')) || (t === 3 && homesOf(I).some(b => tierOf(b) === 2)); if (!shown) continue;
    const ready = hs.filter(b => canUpgrade(I, b, nd.list)).length;
    h += `<div class="tier${hs.length ? '' : ' none'}"><div class="tier-head"><b>${TIERS[t].n}</b><small>${icon('haus')}${hs.length} ${seatIc}${people}</small>${ready && !I.autoUp ? `<button class="btn primary small tie" type="button" data-act="upall" data-t="${t}">${knotIc}${ready}</button>` : ''}</div>`;
    // what the families of this step need, one tile each with its name and a word, as in the house; a step not reached yet
    // shows its needs pale, with "später"
    const worst = l => l.includes('out') ? 'out' : l.includes('low') ? 'low' : 'ok';
    const tiles = TIERS[t].needs.map(k => { if (!hs.length) return {k, state:'none'};
      if (k === 'dach'){ if (t === 1 && roof === 'out') return {k, state:'out', b:null}; const st = worst(hs.map(roofState)); return {k, state:st, b:hs.find(q => roofState(q) === st) || hs[0]}; }
      return {k, state:(nd.list.find(n => n.k === k) || {state:'ok'}).state}; });
    h += `<div class="needtiles n${tiles.length}">${tiles.map(n => n.state === 'none' ? `<span class="ntile none" role="img" aria-label="${needName(n.k)}: kommt mit dieser Stufe">${icon(needIcon(n.k))}<small>${needShort(n.k)}</small><b>später</b></span>` : needTile(I, n, n.k === 'dach' ? n.b : null)).join('')}</div></div>`;
  }
  h += `<div class="rowx"><span></span><button class="chip" type="button" data-act="autoup" aria-pressed="${!!I.autoUp}">${knotIc}Von selbst ausbauen</button></div>`;
  h += `<ul class="list needs">`;
  { const imm = immigFor(I), emp = emptyHome(I), grow = imm || (emp && wantsSettlers(I)) || nd.growing;
    h += rowS('pop', 'Zuzug und Kinder', arrivalText(I, nd), '', grow ? chipS('ok', imm ? 'Kanu kommt' : 'wächst') : chipS(nd.missing.length ? 'out' : 'low', nd.missing.length ? 'stockt' : 'voll')); }
  { const K = kinText(I); h += rowS('pop', `Verwandtschaft: ${K.soft ? `${linesOf(I).length} ${linesOf(I).length === 1 ? 'Linie' : 'Linien'}` : kinWord(I)}`, `${K.line}. ${K.help}`, barS(Math.min(1, K.d / KIN_OK)), chipS(K.soft ? 'low' : K.st, K.st === 'ok' ? 'gesund' : K.soft ? 'später' : K.st === 'low' ? 'eng' : 'zu nah'), K.st === 'ok' || K.soft ? '' : 'need'); }
  h += `<li class="sub-row"><span class="nm">${I.lvl === 3 && I.people && I.people.find(p => p.id === I.chief) ? `Häuptling: ${I.people.find(p => p.id === I.chief).n}` : 'Alle mit Namen und Alter'}${(I.ahnen || []).length ? `<small>${ancCount(I)} Ahnen</small>` : ''}</span><button class="chip" type="button" data-act="folk">Alle Menschen</button></li></ul>`;
  return h;
}
/* Arbeit und Freizeit: the slider for a whole village, with what it does */
const ZEAL_TEXT = ['Alle Arbeit geht langsamer (85 %), dafür ist mehr Zeit für Familie und Spiel: Kinder kommen öfter.', 'Abends hat ein Teil frei, mittags ruhen einige.', 'Alle arbeiten schneller (125 %), niemand nimmt den Abend frei. Für Kinder bleibt keine Zeit: Sie kommen halb so oft.'];
function zealMarkup(I){
  const z = I.zeal != null ? I.zeal : 1;
  return `<div class="zeal"><input id="zealIn" data-i="${I.id}" type="range" min="0" max="2" step="1" value="${z}" aria-label="Arbeit und Freizeit auf ${I.name}: ${ZEAL[z].n}"><div class="zeal-l"><span${z === 0 ? ' class="on"' : ''}>Viel Freizeit</span><span${z === 1 ? ' class="on"' : ''}>Ausgewogen</span><span${z === 2 ? ' class="on"' : ''}>Dringend Arbeit</span></div><p class="sub">${ZEAL_TEXT[z]}</p></div>`;
}
/* Contentment (satOf): the village's average, how many are content, so-so or not, and the least content person, with
   what pulls them down and what helps: the share of work and free time for everyone, their house, food, water, fuel */
const SAT_BANDS = ['gut', 'mittel', 'schlecht'], satBand = v => v >= 70 ? 'gut' : v >= 45 ? 'mittel' : 'schlecht';
const SAT_FACE = {gut:['M6.6 11.8Q10 15 13.4 11.8', '#F3D98A'], mittel:['M6.8 12.9H13.2', '#E9DCC0'], schlecht:['M6.6 14Q10 11.2 13.4 14', '#E8A88A']};
const SAT_ICON = {essen:'essen', wasser:'wasser', feuer:'brenn', dach:'dach', enge:'haus', zeit:'idle', fest:'mana', schoen:'schoen'};
function satHelp(I, p, w){
  const f = famOf(I, p.h), h = f && f.home && findB(f.home);
  if (w.k === 'essen') return {a:'ware', k:'nahrung', t:'Mehr Essen'};
  if (w.k === 'wasser') return {a:'ware', k:'wasser', t:'Mehr Wasser'};
  if (w.k === 'feuer') return {a:'ware', k:'holz', t:'Brennholz'};
  if (w.k === 'dach') return h ? {a:'goto', b:h.id, t:'Zum Haus'} : {a:'hint', k:'haus', t:'Hütte bauen'};
  if (w.k === 'enge') return {a:'hint', k:'haus', t:'Hütte bauen'};
  if (GN[w.k]) return {a:'ware', k:w.k, t:GN[w.k]};
  return null;
}
function satMarkup(I){
  const S = satTick(I), n = S.all.length, band = [0, 0, 0], pc = x => n ? Math.round(x / n * 100) : 0;
  for (const [, t] of S.all) band[SAT_BANDS.indexOf(satBand(t.v))]++;
  let h = head('Zufriedenheit', `${I.name}: im Mittel ${S.avg} von 100 · ${n} Menschen`);
  h += `<div class="satbar" role="img" aria-label="${band[0]} zufrieden, ${band[1]} geht so, ${band[2]} unzufrieden"><i class="g" style="width:${pc(band[0])}%"></i><i class="m" style="width:${pc(band[1])}%"></i><i class="s" style="width:${pc(band[2])}%"></i></div>`;
  h += `<div class="satleg"><span class="g">${band[0]} zufrieden</span><span class="m">${band[1]} geht so</span><span class="s">${band[2]} unzufrieden</span></div>`;
  const lo = S.all[0]; if (!lo) return h;
  const [p, t] = lo, f = famOf(I, p.h), minus = t.why.filter(w => w.d < 0).sort((a, b) => a.d - b.d), plus = t.why.filter(w => w.d > 0);
  const m = satBand(t.v);
  h += `<p class="sec">Am wenigsten zufrieden</p><div class="satlow"><button class="who chip pers" type="button" data-act="who" data-p="${p.id}"><span class="nm">${p.n}<small>${Math.floor(ageOf(p))}</small></span><span class="job">${f ? famName(f) : ''}</span></button>`
    + `<span class="satv ${m}" aria-label="${t.v} von 100"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.8" fill="${SAT_FACE[m][1]}" stroke="#2B1D14" stroke-width="1.6"/><circle cx="7.3" cy="8.6" r="1.05" fill="#2B1D14"/><circle cx="12.7" cy="8.6" r="1.05" fill="#2B1D14"/><path d="${SAT_FACE[m][0]}" fill="none" stroke="#2B1D14" stroke-width="1.5" stroke-linecap="round"/></svg><b>${t.v}</b></span></div>`;
  const tile = (w, cls) => `<span class="sattile ${cls}">${icon(SAT_ICON[w.k] || w.k)}<small>${w.t}</small><b>${w.d > 0 ? '+' : ''}${w.d}</b></span>`;
  h += `<div class="sattiles">${minus.map(w => tile(w, 'out')).join('')}${plus.map(w => tile(w, 'ok')).join('')}${!minus.length ? '<span class="sub">Nichts fehlt. Mehr Freizeit, ein Fest oder ein schönes Dorf machen noch zufriedener.</span>' : ''}</div>`;
  const acts = []; for (const w of minus){ const a = satHelp(I, p, w); if (a && !acts.some(x => x.t === a.t)) acts.push(a); }
  if (acts.length) h += `<div class="chips satacts">${acts.slice(0, 3).map(a => `<button class="chip" type="button" data-act="${a.a}"${a.k ? ` data-k="${a.k}"` : ''}${a.b ? ` data-b="${a.b}"` : ''}>${a.t}</button>`).join('')}</div>`;
  h += `<p class="sec">Arbeit und Freizeit für alle</p>` + zealMarkup(I);
  const next = S.all.slice(1, 5); if (next.length) h += `<p class="sec">Danach</p><ul class="list satnext">${next.map(([q, u]) => { const w = u.why.filter(x => x.d < 0).sort((a, b) => a.d - b.d)[0];
    return `<li><button class="link" type="button" data-act="who" data-p="${q.id}">${q.n}</button><span class="sub">${w ? w.t : 'zufrieden'}</span><b class="${satBand(u.v)}">${u.v}</b></li>`; }).join('')}</ul>`;
  return h;
}
/* A person: who, what they do now, where they work, how their day is shared, and the village's slider */
/* on a person's tile in the house: the short name of the place (Fischer, not Fischerhütte), so four fit in a row */
const jobShort = (I, p) => { const b = p.job && findB(p.job); return isAdult(p) && b && !b.at && !loanWord(I, p) && !(staffOf(I).restP || []).includes(p.id) ? KINDS[b.kind].s : personWork(I, p); };
function personMarkup(){
  const I = sheetData && isl(sheetData.id), p = I && I.people && I.people.find(q => q.id === sheetData.p); if (!p) return '';
  const f = famOf(I, p.h), w = walkers.find(q => q.pid === p.id && q.isl === I.id), st = stageOf(p), job = p.job && findB(p.job), D = dayShares(I, st === 'adult' ? p : null), pc = x => Math.round(x * 100);
  let h = head(p.n, `${Math.floor(ageOf(p))} Jahre${p.tt ? ', mit Tatau' : ''}${f ? ` · ${famName(f)}` : ''}${I.chief === p.id ? ' · Häuptling' : I.mat === p.id ? ' · Matriarchin' : ''}`);
  h += `<p class="sub">Gerade: ${w ? whatDoes(w) : 'im Haus'}.${p.meal ? ` <b class="meal-bad">Heute früh ${p.meal === 3 ? 'ohne Essen und Wasser' : p.meal === 1 ? 'ohne Essen' : 'ohne Wasser'}: ${st === 'adult' ? 'arbeitet langsamer' : 'ist müde'}.</b>` : I.meal ? ' Hat heute früh gegessen und getrunken.' : ''}${p.cold ? ` <b class="meal-bad">Letzte Nacht ohne Feuer: friert.</b>` : ''}${satOfIsle(I).by.has(p.id) ? ` <button class="link" type="button" data-act="satopen">Zufriedenheit ${satOfIsle(I).by.get(p.id)}</button>` : ''}</p>`;
  h += `<ul class="list needs">${st === 'kid' ? rowS('kind', 'Kind', `Spielt und lernt. ${ageOf(p) >= GATHER.age ? 'Sammelt Brennholz, sobald es einen Herd gibt. ' : 'Ab drei sammelt es Brennholz. '}Mit sechs Jahren arbeitet es mit.`) : st === 'old' ? job ? rowS('pop', `Alt · ${placeName(job)}`, 'Sitzt beim Hauswerk vor dem Haus, halb so schnell wie die Jüngeren, und erzählt dabei von den Ahnen.', '', `<button class="chip" type="button" data-act="goto" data-b="${job.id}">Hingehen</button>`) : rowS('pop', 'Alt', 'Geht nicht mehr aufs Feld. Ein Hauswerk im Haus ihrer Familie gibt ihr noch Arbeit.') :
    rowS(job ? '' : 'idle', job ? `Stammplatz: ${placeName(job)}` : staffOf(I).rest ? 'Freizeit, ohne Stammplatz' : 'Ohne Stammplatz', job ? `${personWork(I, p).includes('·') ? `Gerade ${personWork(I, p).split(' · ')[1]}. ` : ''}${crewAt(I, job) || 0} von ${crewOf(job)} sind dort.` : staffOf(I).rest ? 'Alle Plätze sind besetzt. Viel Freizeit: ruht sich aus und sammelt nebenbei.' : 'Sammelt im Wald und am Strand. Ein Arbeitsplatz mit freiem Platz holt sie von selbst.', '',
      `<span class="chips">${job ? `<button class="chip" type="button" data-act="goto" data-b="${job.id}">Hingehen</button>` : ''}<button class="chip" type="button" data-act="jobpick" aria-expanded="${!!sheetData.pick}">${sheetData.pick ? 'Fertig' : job ? 'Ändern' : 'Wählen'}</button></span>`)}</ul>`;
  if (st === 'adult' && sheetData.pick) h += jobPicker(I, p);
  if (st === 'adult') h += `<div class="daybar" role="img" aria-label="Der Tag: Arbeit ${pc(D.work)} %, Freizeit ${pc(D.free)} %, Schlaf ${pc(D.sleep)} %"><i class="w" style="width:${pc(D.work)}%"></i><i class="f" style="width:${pc(D.free)}%"></i><i class="s" style="width:${pc(D.sleep)}%"></i></div>` +
    `<div class="daylegend"><span class="w">Arbeit ${pc(D.work)} %</span><span class="f">Freizeit ${pc(D.free)} %</span><span class="s">Schlaf ${pc(D.sleep)} %</span></div>`;
  { const st = storyOf(p); if (st.length) h += `<p class="sec">Lebensgeschichte</p><ul class="list needs story">${st.slice().reverse().map(e => `<li><span class="nm">${p.n} ${e.text}<small>Jahr ${e.year}</small></span></li>`).join('')}</ul>`; }
  h += `<p class="sec">Arbeit und Freizeit auf ${I.name}</p>` + zealMarkup(I);
  if (f && f.home) h += `<div class="rowx"><span></span><button class="chip" type="button" data-act="goto" data-b="${f.home}">Zum Haus</button></div>`;
  return h;
}
/* every place someone could have as their own: name, how many have it as theirs, the current one marked; a full place
   swaps, one that does not suit them is pale and says why */
function jobPicker(I, p){
  const ps = jobPlaces(I, p).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.born - b.born);
  if (!ps.length) return '<p class="sub">Noch keine Arbeitsplätze.</p>';
  return `<p class="sub">Neuer Stammplatz für ${p.n}. Ist er voll, tauscht der Letzte dort mit ${p.n}.</p><div class="jobpick" role="group" aria-label="Stammplatz wählen">${ps.map(b => {
    const own = (I.people || []).filter(q => q.job === b.id).length, cur = p.job === b.id, why = jobWhy(I, p, b), full = !cur && own >= crewOf(b);
    return `<button class="chip jp${cur ? ' on' : ''}${why ? ' no' : ''}" type="button" data-act="setjob" data-b="${b.id}" aria-pressed="${cur}" aria-label="${placeName(b)}, ${own} von ${crewOf(b)}${full ? ', voll: tauscht' : ''}${why ? `: ${why}` : ''}">${buildPic(b.at ? b.kind : b.kind)}<small>${placeName(b)}</small><b>${own}/${crewOf(b)}${full ? ' ⇄' : ''}</b></button>`; }).join('')}</div>`;
}
/* children, grown-ups and the old as one bar: who works now, and who will after them */
function ageMarkup(I){
  const A = ageMix(I), n = Math.max(1, A.kid + A.adult + A.old), pc = x => Math.round(x / n * 100), y = yearsNoChild(I), why = y >= 3 ? birthWhy(I) : '';
  return `<div class="agebar" role="img" aria-label="${A.kid} Kinder, ${A.adult} Erwachsene, ${A.old} Alte"><i class="k" style="width:${pc(A.kid)}%"></i><i class="a" style="width:${pc(A.adult)}%"></i><i class="o" style="width:${pc(A.old)}%"></i></div>` +
    `<div class="daylegend agelegend"><span class="k">${A.kid} Kinder</span><span class="a">${A.adult} Erwachsene</span><span class="o">${A.old} Alte${A.oldWork ? `, ${A.oldWork} im Hauswerk` : ''}</span></div>` +
    `<p class="sub">${A.soon ? `In fünf Jahren ${A.soon === 1 ? 'wird einer' : `werden ${A.soon}`} alt. ` : ''}${I.lastBirth != null ? (y < 1 ? 'Das letzte Kind kam dieses Jahr.' : `Das letzte Kind kam vor ${Math.floor(y)} ${Math.floor(y) === 1 ? 'Jahr' : 'Jahren'}.`) : ''}${why ? ` <b>${why}</b>` : ''}</p>`;
}
function workTab(I, nd){
  const sf = staffOf(I), P = I.people || [], freeP = sf.freeP.map(id => P.find(p => p.id === id)).filter(Boolean), open = placesOf(I).filter(b => (crewAt(I, b) || 0) < KINDS[b.kind].crew && !sf.pulled.has(b));
  let h = zealMarkup(I) + `<div class="rowx"><span class="sub">${autoWork(I) ? 'Die Leute gehen von selbst dorthin, wo sie gebraucht werden.' : 'Du verteilst die Leute mit + und − auf der Tafel eines Arbeitsplatzes.'}</span><span class="chips" role="group" aria-label="Arbeit verteilen"><button class="chip" type="button" data-act="work" data-v="auto" aria-pressed="${autoWork(I)}">Automatisch</button><button class="chip" type="button" data-act="work" data-v="hand" aria-pressed="${!autoWork(I)}">Von Hand</button></span></div><ul class="list needs">`;
  const nh = [...sf.help.values()].reduce((t, n) => t + n, 0);
  h += ageMarkup(I);
  { const g = gatherers(I); if (g) h += `<ul class="list needs">${rowS('reisig', `${g} ${g === 1 ? 'sammelt' : 'sammeln'} Brennholz`, `Kinder ab drei und Alte ohne Hauswerk, +${perMin(gatherRate(I))} pro Minute. Der Herd brennt erst Schalen, dann Brennholz, dann Holz.`)}</ul>`; }
  h += rowS('pop', `${sf.total - sf.free - sf.build} arbeiten · ${sf.build} bauen · ${sf.free} ${sf.rest ? 'in Freizeit' : 'frei'}`, freeP.length ? `${sf.rest ? 'Freizeit' : 'Frei'}: ${freeP.map(p => `<button class="link" type="button" data-act="who" data-p="${p.id}">${p.n}</button>`).join(', ')}. ${sf.rest ? 'Alle Plätze sind besetzt; sie ruhen und sammeln nebenbei.' : 'Wer frei ist, sammelt im Wald und am Strand.'}` : nh ? `${nh} ${nh === 1 ? 'hilft' : 'helfen'} mit, wo es knapp ist. Helfer machen einen Platz schneller.` : 'Ein neuer Arbeitsplatz braucht neue Leute: Familien kommen in leere Hütten.', '', freeP.length ? chipS('low', `${freeP.length} frei`) : chipS('ok', 'alle'));
  if (open.length) h += rowS('', `${open.length} ${open.length === 1 ? 'Platz hat' : 'Plätze haben'} Raum`, open.slice(0, 8).map(b => `<button class="link" type="button" data-act="goto" data-b="${b.id}">${placeName(b)} ${crewAt(I, b) || 0}/${KINDS[b.kind].crew}</button>`).join(', '), '', chipS(open.some(b => !crewAt(I, b)) ? 'out' : 'low', open.some(b => !crewAt(I, b)) ? 'leer' : 'halb'), open.some(b => !crewAt(I, b)) ? 'need' : '');
  { const pulled = [...sf.pulled.keys()].filter(b => !crewAt(I, b)); if (pulled.length) h += rowS('beile', `${pulled.length} ${pulled.length === 1 ? 'Platz ruht' : 'Plätze ruhen'}: die Leute bauen`, andList(pulled.map(b => placeName(b))), '', chipS('low', 'bauen')); }
  h += `</ul><details class="more famlist"${famListOpen ? ' open' : ''}><summary>${famsOf(I).length} Familien</summary><ul class="list needs">`;
  for (const f of famsOf(I).slice().sort((a, b) => (!a.home) - (!b.home) || a.id - b.id)){
    const m = membersOf(I, f), lack = famNeeds(I, f, nd.list).filter(n => n.state === 'out');
    h += `<li class="${lack.length ? 'need' : ''}">${icon(f.home ? 'haus' : 'pop')}<span class="nm">${famName(f)}<small>${m.length} · ${famLabel(I, f)} · ${famWork(I, f)}</small></span>${lack.length ? chipS('out', lack.map(n => needName(n.k)).join(', ')) : ''}<button class="chip" type="button" data-act="fam" data-f="${f.id}">Ansehen</button></li>`;
  }
  return h + `</ul></details>`;
}
function isleTab(I, nd){
  let h = `<ul class="list needs">`;
  if (I.type === 'hoch' && I.trees0 >= 25){ const f = forestShare(I), e = erosionOf(I);
    h += rowS('holz', `Wald ${Math.round(f * 100)} %`, e > 1 ? 'Starke Erosion: Felder laugen sehr schnell aus, das Riff verschlammt. Pflanzt Bäume!' : e ? 'Erosion: Felder laugen schneller aus. Pflanzt Bäume.' : 'Genug Wald hält den Boden fest.', barS(f / .6), e ? chipS(e > 1 ? 'out' : 'low', 'Erosion') : chipS('ok', 'hält'), e ? 'need' : ''); }
  { const fields = I.buildings.filter(b => KINDS[b.kind].soil && !b.bt), tired = fields.filter(b => !b.fallow && (b.soil ?? 1) < .45).length, resting = fields.filter(b => b.fallow).length;
    if (fields.length) h += rowS('soil', `${fields.length} Felder`, `${tired ? `${tired} ausgelaugt` : 'Der Boden trägt'}${resting ? `, ${resting} brach` : ''}. Ausgelaugte Felder brachliegen lassen.`, '', tired ? chipS('low', 'müde') : chipS('ok', 'gut'), tired ? 'need' : ''); }
  { const W = wildOf(I), F = foragers(I), gone = goneOf(I);
    h += rowS('wild', `Wild: ${wildWord(W)}`, `${I.tapu ? 'Tapu: Niemand jagt oder sammelt, es erholt sich.' : F ? `${F} ohne Arbeit sammeln, +${perMin(forageRate(I))} pro Minute.` : 'Wer keine Arbeit hat, sammelt im Wald und am Strand.'}${gone ? ` ${gone > 1 ? 'Zwei Arten sind' : 'Eine Art ist'} ausgestorben.` : ''}`, barS(W), `<button class="chip" type="button" data-act="tapu" aria-pressed="${!!I.tapu}">Tapu</button>`, W < .3 && !I.tapu ? 'need' : ''); }
  { const r = ratRate(I), g = ratGuard(I); h += rowS('nahrung', `Ratten: ${g === 0 ? 'fern vom Vorrat' : r >= .05 ? `fressen ${perMin(r)} pro Minute` : 'kaum Futter'}`, g === 0 ? 'Zwei Speicher auf Pfosten halten sie vom Vorrat fern. Vogeleier fressen sie trotzdem: Das Wild wächst langsam nach.' : `Sie kamen mit den Kanus. ${g === 1 ? 'Ein Speicher auf Pfosten halbiert, was sie fressen, zwei halten sie fern.' : 'Ein zweiter Speicher hält sie ganz fern.'}`, '', chipS(g === 0 ? 'ok' : r >= 1 ? 'out' : 'low', g === 0 ? 'geschützt' : g === 1 ? 'fressen' : 'halb')); }
  { const R = I.reefLife ?? 1; if (I.buildings.some(b => b.kind === 'fisch')) h += rowS('meeres', `Riff: ${R > .55 ? 'reich' : R > .3 ? 'abgesammelt' : 'leer'}`, 'Wo viel gesammelt wird, gibt das Riff weniger. Es erholt sich langsam, unter Rāhui schneller.', barS(R), chipS(R > .55 ? 'ok' : R > .3 ? 'low' : 'out', R > .55 ? 'reich' : R > .3 ? 'weniger' : 'leer'), R > .3 ? '' : 'need'); }
  { const fit = LIFE_IDS.filter(id => lifeFits(I, id) && lifeKnown(id)), have = fit.filter(id => lifeOf(I).includes(id)), miss = fit.filter(id => !have.includes(id));
    h += rowS('setzling', have.length ? `Pflanzen und Tiere: ${andList(have.map(id => LIFE[id].n))}` : 'Noch nichts mitgebracht', miss.length ? `Es fehlen ${andList(miss.map(id => LIFE[id].n))}. Ein Kanu bringt sie aus einem Dorf, wo sie wachsen.` : 'Alles, was hier wachsen kann, ist da.', '', miss.length ? chipS('low', `${miss.length} fehlen`) : chipS('ok', 'alles'), ''); }
  { const L = navLore(); if (L.lvl || I.buildings.some(b => b.kind === 'sternhaus')) h += rowS('einbaum', L.lvl ? `Navigatoren: Stufe ${L.lvl}` : 'Noch kein Navigator', L.best ? `${L.best.p.n} auf ${L.best.I.name}: ${NAV_N[L.lvl]}. Stirbt er ohne Schüler, ist das Wissen fort.` : 'Im Haus der Navigatoren lernt jemand Wellen, Vögel und Sterne.', '', L.lvl ? chipS('ok', `Stufe ${L.lvl}`) : chipS('low', 'keiner')); }
  h += `</ul>`;
  if (motifsOf(I).length || I.buildings.some(b => b.kind === 'toepfer')) h += `<p class="sec">Muster auf den Töpfen</p>${motifRows(I)}`;
  h += `<p class="sec">${I.lvl === 3 ? 'Häuptlingsdorf' : 'Weg zum Häuptlingsdorf'}</p><ul class="list needs">${chiefSteps(I, nd).map(q => `<li class="${q.ok ? 'okk' : ''}"><span class="state ${q.ok ? 'ok' : 'out'}">${q.ok ? '✓' : '–'}</span><span class="nm">${q.t}<small>${q.now}</small></span></li>`).join('')}</ul>`;
  return h;
}
const activeCount = I => I.buildings.filter(b => b.bt && !KINDS[b.kind].plant).length;
/* Who comes next: a family by canoe for an empty hut, or a child in a family house; and why nobody does */
function arrivalText(I, nd){
  const imm = immigFor(I), emp = emptyHome(I), g = growTarget(I, nd.list), f = g && famOfHome(I, g), kids = homesOf(I).some(b => tierOf(b) >= 2);
  const birth = g ? ` Kinder: das nächste bei ${famName(f)}${kinState(I) !== 'ok' ? ', aber seltener, die Familien sind eng verwandt' : ''}.` : kids ? '' : ' Kinder kommen erst in Familienhäusern, mit Sennit gebunden.';
  if (imm) return (imm.state === 'moored' ? `Ein Kanu ${imm.immig.from} liegt am Strand: Familie ${imm.immig.n} fragt, ob sie bleiben darf. Tippe es an.` : `Ein Kanu ${imm.immig.from} ist unterwegs, eine Familie sucht ein Zuhause.`) + birth;
  if (nd.missing.length) return `Niemand kommt dazu, es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`;
  if (nd.atMax) return `Die Insel ist voll: ${islandMax(I)} Menschen trägt sie, mehr nicht. Siedler können anderswo ein Dorf gründen.`;
  if (nd.roofless) return `${nd.roofless} ohne Dach warten auf eine Hütte. Erst dann kommen neue Familien.` + birth;
  if (emp) return `Eine Hütte steht leer: Bald kommt ein Kanu von weit her mit einer Familie, in etwa ${Math.max(5, Math.ceil(((I.immigAt || 0) - tick) * TICK / 1000) + 30)} Sekunden.` + birth;
  return 'Alle Hütten sind belegt. Eine neue Hütte zieht eine Familie von weit her an.' + birth;
}
/* The line under the goods: work, builders, how long the food lasts, the next arrival */
/* One hint in the head band, the one that matters most now: food running out, nobody moving in, full houses, or growth */
function vitalLine(I){
  const nd = needsOf(I), ic = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>`;
  const fn = nd.list.find(x => x.k === 'essen'), fnet = fn.make - fn.use - fn.work, left = fnet >= 0 ? Infinity : fn.stock / -fnet;
  if (left !== Infinity && left < 5) return `<span class="warn">${ic('essen')}${left < 1 ? 'Essen knapp' : `Essen ${Math.floor(left)} Min`}</span>`;
  if (nd.roofless) return `<span class="warn">${ic('haus')}${nd.roofless} ohne Dach</span>`;
  if (nd.missing.length) return `<span class="warn">${ic(nd.missing[0].k)}fehlt</span>`;
  { const r = I.autoUp ? 0 : readyHomes(I, nd.list).length; if (r) return `<span class="up">${knotIc}${r} Ausbau</span>`; }
  if (nd.atMax) return `<span>${ic('insel')}Insel voll</span>`;
  if (nd.full) return `<span>${ic('pop')}Häuser voll</span>`;
  if (immigFor(I)) return `<span>${ic('einbaum')}Kanu kommt</span>`;
  if (emptyHome(I)) return `<span>${ic('haus')}Hütte frei</span>`;
  return `<span>${ic('pop')}wächst</span>`;
}
/* Storage sheet: every good on the island with what comes in and goes out per minute */
function storeMarkup(I){
  let h = head(`Lager auf ${I.name}`, `${icon('haus')} ${storeCap(I)} je Ware`) + storeTiles(I);
  const idle = I.buildings.filter(b => b.idle && b.idle.why !== 'full' && b.idle.why !== 'grow');
  if (idle.length) h += `<div class="chips stillrow"><span class="state out">steht still</span>${idle.slice(0, 8).map(b => `<button class="chip way" type="button" data-act="goto" data-b="${b.id}" aria-label="${KINDS[b.kind].n}: ${b.idle.text}">${bIcon(b.kind)}${KINDS[b.kind].s}<small>${shortWhy(b.idle)}</small></button>`).join('')}</div>`;
  return h;
}
/* the tiles of the store, for the store sheet and the village centre: each good with its name under it; tap it to see who
   makes it; the arrow is green when more comes than goes, red when it runs down */
function storeTiles(I){
  const nd = needsOf(I), cap = storeCap(I), back = I._back && tick - I._back.at < 150 ? I._back.d : null, rows = ['essen', ...GOODS].map(k => {
    const make = ofNeed(k, q => makeRate(I, q)), need = nd.list.find(n => n.k === k), use = (need ? need.use : 0) + ofNeed(k, q => workUse(I, q)), have = haveOf(I, k);
    return {k, make, use:FOODS.includes(k) ? workUse(I, k) : use, have};
  }).filter(g => g.k === 'essen' || g.have || g.make || g.use);
  return `<div class="tiles">${rows.map(g => { const net = g.make - g.use, cls = Math.abs(net) < .05 ? '' : net > 0 ? 'up' : 'down', full = Math.min(1, g.have / (g.k === 'essen' ? cap * FOODS.length / 3 : cap));
    const tag = g.k === 'essen' ? 'span' : 'button', at = g.k === 'essen' ? 'role="img"' : `type="button" data-act="ware" data-k="${g.k}"`;
    return `<${tag} class="tile ${cls}${g.k === 'essen' ? ' sum' : ''}" ${at} aria-label="${GN[g.k]}: ${g.have}, ${net >= 0 ? 'plus' : 'minus'} ${perMin(Math.abs(net))} pro Minute">${icon(g.k)}<b>${g.have}</b><small class="nm">${g.k === 'essen' ? 'Essen, alles' : GN[g.k].length <= 12 ? GN[g.k] : shortGN(g.k)}</small>${back && back[g.k] ? `<s>${back[g.k][0]}</s>` : ''}<span class="flow">${cls ? (net > 0 ? '▲' : '▼') + perMin(Math.abs(net)) : '·'}</span><i class="fill" style="width:${Math.round(full * 100)}%"></i></${tag}>`; }).join('')}</div>`;
}
/* Standing sheet: what mana is for, and the feasts this island can hold */
function feastMarkup(I){
  // the feast of treasures only once a treasure has been seen
  const known = islands.some(J => J.treasure && J.discovered) || islands.some(J => J.settled && TREASURE_GOODS.some(k => (J.stock[k] || 0) > 0));
  return FEASTS.filter(F => F.id !== 'schatz' || known).map(F => { const no = feastState(I, F); return `<div class="rowx"><span><b>${F.n}</b> <span class="sub">${costText(F.cost)}, Ansehen +${feastMana(I, F)}${feastMana(I, F) > F.mana ? ' (nach der Yamsernte)' : ''}</span>${no ? `<br><span class="sub">${no}</span>` : ''}</span><button class="btn${no ? '' : ' primary'}" type="button" data-act="feast" data-f="${F.id}" ${no ? 'disabled' : ''}>Feiern</button></div>`; }).join('');
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
  h += `<p>Sie machen ${icons(clanMakes(C))}.<br>Sie schätzen ${icons(clanWants(C))}.</p>`;
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
  return [most(area) ? 'Die größere Insel' : 'Die kleinere Insel', `${trees(I)} Bäume${most(trees) ? ', mehr Wald' : ''}`, I.river ? 'ein Bach' : '', specOf(I) ? SPECS[specOf(I)].s : '', depsOf(I, 'ton').length ? 'Ton für Töpfe' : 'kein Ton', depsOf(I, 'basalt').length ? 'Basalt für Beile' : 'kein Basalt',
    least(dist) ? `${M.name} mit Pandanus und Kokos liegt nah` : `${M.name} liegt weiter weg`].filter(Boolean).join(', ') + '.';
}
function landingMarkup(){
  const pick = sheetData && sheetData.id ? isl(sheetData.id) : null, list = landingChoices(), M = isl('tochter'), to = landing && landing.target ? isl(landing.target) : null;
  let h = head('Die Ankunft', 'Vor dreitausend Jahren, östlich des alten Landes.');
  if (to) return h + `<p>Das Ahnenkanu ist unterwegs nach ${to.name}. Sobald es anlegt, entsteht dort euer Dorf.</p>`;
  if (pick && pick.type === 'atoll') h += `<p><b>${pick.name}</b> ist ein Atoll: kein Ton, kein Stein, kaum Holz. Wählt eine hohe Insel.</p>`;
  else h += `<p>Eine Familie im Ahnenkanu: Mutter, Vater und zwei Kinder, die schon mit anpacken, dazu Setzlinge und zwei Schweine. Vor euch: zwei hohe Inseln und das Atoll ${M.name}. Wo landet ihr?</p>`;
  h += `<ul class="list needs">${list.map(I => `<li class="${pick === I ? 'pick' : ''}">${icon('insel')}<span class="nm">${I.name}<small>${landFacts(I)}</small></span><span class="chips"><button class="chip" type="button" data-act="lookat" data-i="${I.id}">Ansehen</button><button class="btn primary small" type="button" data-act="found" data-i="${I.id}">Hier landen</button></span></li>`).join('')}</ul>`;
  h += `<div class="rowx"><span class="sub">Aufgaben führen Schritt für Schritt ins Spiel.</span><span class="chips" role="group" aria-label="Einführung"><button class="chip" type="button" data-act="intro" data-v="on" aria-pressed="${!landing.skip}">Mit Einführung</button><button class="chip" type="button" data-act="intro" data-v="off" aria-pressed="${!!landing.skip}">Ohne</button></span></div>`;
  return h;
}
/* The end of the tasks: what the clan has built, and the sea stays open */
/* the finale: a double canoe under the rising Pleiades, sailing on, the stars coming out one after the other */
const FINALE_SCENE = (() => {
  const r = rng(77), stars = Array.from({length:34}, (_, i) => `<circle cx="${(r() * 320).toFixed(1)}" cy="${(r() * 70).toFixed(1)}" r="${(.5 + r() * .9).toFixed(2)}" fill="#F4ECD8" class="tw" style="animation-delay:${(r() * 3).toFixed(2)}s"/>`).join('');
  const pleiades = [[236, 22], [242, 18], [247, 23], [240, 27], [251, 19], [245, 30], [254, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#FFF6DC"/>`).join('');
  return `<div class="finale-scene" aria-hidden="true"><svg viewBox="0 0 320 128"><rect width="320" height="128" fill="#1E3346"/>${stars}<g class="rise">${pleiades}</g>` +
    `<path d="M0 96Q40 90 80 96T160 96T240 96T320 96V128H0Z" fill="#2F5F73"/><path d="M0 104Q40 98 80 104T160 104T240 104T320 104" fill="none" stroke="#7FB5C2" stroke-width="1" stroke-dasharray="3 5" class="swell"/>` +
    `<g class="voyage"><g class="bob"><path d="M-30 0Q0 7 30 0L26 4Q0 9-26 4Z" fill="#6B4428" stroke="#1A120C" stroke-width="1"/><path d="M-30 -6Q0 1 30 -6L26 -2Q0 3-26 -2Z" fill="#7A5434" stroke="#1A120C" stroke-width="1"/><path d="M-24-6H24" stroke="#C99A62" stroke-width="2"/>` +
    `<path d="M2-6L-14-46Q-2-30 10-44Q6-24 2-6Z" fill="#E9DCC0" stroke="#1A120C" stroke-width="1"/><path d="M2-6V-40" stroke="#1A120C" stroke-width="1.2"/><circle cx="-12" cy="-9" r="2" fill="#1A120C"/><circle cx="16" cy="-9" r="2" fill="#1A120C"/></g></g></svg></div>`;
})();
function finaleMarkup(){
  const mine = islands.filter(I => I.settled), people = mine.reduce((t, I) => t + I.pop, 0), friends = routes.filter(r => isl(r.a).clan || isl(r.b).clan);
  const row = (k, label, v) => `<li><svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${k ? `<use href="#ic-${k}"/>` : ''}</svg><span class="nm">${label}</span><b class="qty">${v}</b></li>`;
  let h = head('Die große Fahrt ist vollbracht', `Nach ${yearOf() + 1} ${yearOf() ? 'Jahren' : 'Jahr'} auf See und an Land.`) + FINALE_SCENE + epochCord();
  h += `<p>Vom ersten Versammlungshaus auf ${isl('heimat').name} aus ist ein Netz aus Dörfern und Freundschaften entstanden, bis über die Weite See zu den Fernen Inseln${morningVillage() ? ' und nach der langen Pause über die Leere See zu den Inseln des Morgens' : ''}, wie es die Lapita-Leute vor über dreitausend Jahren über den Pazifik gespannt haben${morningVillage() ? ' und ihre Nachfahren, die Polynesier, bis an seine fernsten Ränder' : ''}.</p>`;
  h += `<ul class="list needs">${row('pop', 'Eigene Dörfer', mine.length)}${row('pop', 'Menschen', people)}${row('schnur', 'Befreundete Clans', friends.length)}${row('schnur', 'Knoten auf allen Schnüren', routes.reduce((t, r) => t + r.knots, 0))}${row('einbaum', 'Kanus', own().length)}${row('mana', 'Ansehen', Math.floor(mana))}${row('', 'Entdeckte Inseln', islands.filter(I => I.discovered).length)}</ul>`;
  { const met = cultureIsles(); if (met.length) h += `<p>Am Rand der bekannten See habt ihr Menschen einer anderen Kultur getroffen: ${andList(met.map(I => I.clan.name))}.</p>`; }
  h += `<p class="sub">Das Meer bleibt offen. Es gibt noch Nebel zu lichten, Dörfer zu Häuptlingsdörfern zu machen und Feste zu feiern.</p>`;
  return h + `<div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Weiterspielen</button></div>`;
}
/* ---------- a building: who works there, one line on how it goes, the rest folded away */
const pipH = k => `<svg class="pip" viewBox="-2.7 -6.5 5.4 7" aria-hidden="true">${PIP[k]}</svg>`;
const SHORT = {nuts:'Palmen abgeerntet', grow:'wächst', yam:'wartet auf die Pflanzzeit', storm:'Sturm', crew:'keine Leute', way:'Leute auf dem Weg', trees:'keine Bäume', full:'Lager voll', boat:'kein Einbaum', carving:'Kanu entsteht', space:'kein Platz', bau:'Leute bauen'};
const shortWhy = w => w.why === 'use' ? `fehlt: ${GN[w.k]}` : w.why === 'near' ? `zu wenig ${NEAR_PL[w.kind]}` : SHORT[w.why] || 'steht still';
const secsText = s => s < 90 ? `${Math.max(1, Math.ceil(s))} s` : `${Math.round(s / 60)} min`;
const keepBtn = b => `<button class="chip keep" type="button" data-act="keep" aria-pressed="${!!b.keep}" aria-label="Bleiben: von hier wird niemand ausgeliehen">Bleiben</button>`;
function crewMarkup(I, b, horn = '', bare = false){
  const sl = slotsOf(I, b, staffOf(I), presentAt(I)); if (!sl) return '';
  const K = KINDS[b.kind], sf = staffOf(I), ids = (sf.crewP.get(b) || []), byId = id => I.people.find(p => p.id === id);
  // the order of the marks: own people here, own people away, guests; the people in the same order
  const own = (sf.home && sf.home.get(b)) || [], site = b.bt || (b.kind === 'werft' && I.yard);
  const people = site ? ids.map(byId).filter(Boolean) : [...own.filter(id => ids.includes(id)), ...own.filter(id => !ids.includes(id)), ...ids.filter(id => !own.includes(id))].map(byId).filter(Boolean);
  const chips = sl.map((k, i) => { const p = people[i]; return p ? `<button class="who ${k}" type="button" data-act="who" data-p="${p.id}">${pipH(k)}${p.n}${k.startsWith('aid') ? '<small>hilft</small>' : k === 'away' ? `<small>${loanWord(I, p) || restWord(I, b)}</small>` : ''}</button>` : `<span class="who ${k}">${pipH(k)}${k === 'off' ? 'zu' : 'frei'}</span>`; }).join('');
  const nh = sl.filter(k => k.startsWith('aid')).length;
  // building sites and the canoe house are worked by whoever is free, or by those called from their work
  if (b.bt || (b.kind === 'werft' && I.yard)) return `<div class="crew">${chips}<span class="grow"></span>${horn}</div>`;
  const here = (I.people || []).filter(p => p.job === b.id).length, free = staffOf(I).free;
  if (!bare) horn += keepBtn(b);
  const ctl = `<span class="grow"></span><span class="step"><button type="button" data-act="workdel" aria-label="Eine Person abziehen" ${here ? '' : 'disabled'}>−</button><button type="button" data-act="workadd" aria-label="Eine Person schicken" ${here < crewOf(b) ? '' : 'disabled'}>+</button></span>`;
  return `<div class="crew">${chips}${ctl.replace('<span class="grow"></span>', `<span class="grow"></span>${horn}`)}</div><p class="sub crewnote">${K.crew ? `${K.crew} ${K.crew === 1 ? 'fester Platz' : 'feste Plätze'}${nh ? `, dazu ${nh} ${nh === 1 ? 'Helfer' : 'Helfer'}: Wer frei ist, hilft, wo etwas knapp ist` : ''}. ` : ''}${K.team ? TEAM[K.team].text : ''}${free ? ` ${free} frei.` : ''}</p>`;
}
/* A family on its own sheet: its house and step, what it has and lacks, its people by name, where it works */
function famMarkup(I, f, withHead = true){
  const nd = needsOf(I), m = membersOf(I, f), t = famTier(I, f), fn = famNeeds(I, f, nd.list);
  const name = k => k === 'dach' ? 'Dach' : GN[k], icn = k => k === 'dach' ? 'haus' : k;
  let h = withHead ? head(famName(f), `${f.home ? TIERS[t].n : 'Ohne Dach, unter Matten am Dorfplatz'} · ${I.name}`) : `<p class="sec">${famName(f)} · ${TIERS[t].n}${t > 1 ? `, ${TIERS[t].fam}` : ''}</p>`;
  const met = fn.filter(n => n.state !== 'out').length, home = f.home && findB(f.home);
  if (home) h += `<p class="sub">Platz für ${homeCap(I, home)} von höchstens ${homeCapMax(I, home)}: Jedes erfüllte Bedürfnis bringt Platz für einen mehr. Jetzt wohnen hier ${m.length}.</p>`;
  h += `<div class="stat"><b>${met} von ${fn.length} erfüllt</b><span class="mbar" style="flex:1"><i style="width:${met / fn.length * 100}%"></i></span></div><div class="chips">${fn.map(n => `<span class="need-chip ${n.state}">${icon(icn(n.k))}${name(n.k)}</span>`).join('')}</div>`;
  if (t === 1 && f.home) h += `<p class="sub">Nächste Stufe, Familienhaus: mit ${costText(TIERS[2].cost)} neu gebunden, Platz für ${TIERS[2].cap} und für Kinder.</p>`;
  if (t === 2 && f.home) h += `<p class="sub">Nächste Stufe, Meisterhaus: dazu ${andList(MASTER_GOODS.map(k => GN[k]))} im Lager, ausgebaut mit ${costText(TIERS[3].cost)}, Platz für ${TIERS[3].cap}.</p>`;
  if (f.home && canUpgrade(I, findB(f.home))) h += `<div class="rowx"><span class="sub">Es liegt alles bereit.</span><button class="btn primary" type="button" data-act="upgrade" data-b="${f.home}">Ausbauen</button></div>`;
  if (!f.home) h += `<p class="sub">Sobald ein Haus frei ist, zieht sie ein.</p>`;
  h += `<div class="folk">${m.map(p => `<button class="who chip" type="button" data-act="who" data-p="${p.id}">${p.s === 'm' ? '♂' : '♀'} ${p.n}<small>${Math.floor(ageOf(p))}${stageOf(p) === 'kid' ? ', Kind' : stageOf(p) === 'old' ? ', alt' : ` · ${personWork(I, p)}`}${p.wk ? ', schwach' : ''}</small></button>`).join('')}</div>`;
  { const ln = m[0] && m[0].ln; h += `<div class="rowx"><span class="sub">Linie: ${lineName(ln)}${lineFrom(ln) ? ` ${lineFrom(ln)}` : ''}</span>${f.home && !withHead ? '' : f.home ? `<button class="chip" type="button" data-act="goto" data-b="${f.home}">Zum Haus</button>` : ''}</div>`; }
  return h;
}
/* Ratios, as Anno shows them: what one place makes with its whole crew, and for how many people that is enough */
const fullRate = (I, b) => { const K = KINDS[b.kind]; return outOf(b) * PER_MIN / K.every / slowOf(b) / pace(I, K) / (K.soil ? soilPace(b) : 1) * workSpeed(I, b, K.crew || 1); };
const needOfGood = k => NEEDS.find(N => needGoods(N.k).includes(k)) || null;
const feedsText = (N, n) => `${n >= 10 ? Math.round(n) : perMin(Math.round(n * 10) / 10)} ${N.k === 'brenn' ? 'Häuser' : N.lvl === 1 ? 'Menschen' : `Bewohner im ${TIERS[N.lvl].n}`}`;
/* the chain of a good: what goes in, what it is, where it goes on */
function chainMarkup(I, k){
  const kinds = ORDER.filter(q => KINDS[q] && KINDS[q].on && KINDS[q].on.includes(I.type) && (KINDS[q].prod === k || (KINDS[q].picks && KINDS[q].picks[k])));
  const ins = [...new Set(kinds.flatMap(q => Object.keys(KINDS[q].use || {})))].map(q => `${icon(GROUPS[q] ? groupNext(I, q) : q)}${GN[q] || q}`);
  const onKinds = ORDER.filter(q => KINDS[q] && KINDS[q].use && KINDS[q].prod && Object.keys(KINDS[q].use).some(u => u === k || (GROUPS[u] || []).includes(k)));
  const outs = [...new Set(onKinds.map(q => KINDS[q].prod))].map(q => `${icon(q)}${GN[q]}`), N = needOfGood(k);
  for (const q of ORDER.filter(q => KINDS[q] && KINDS[q].boost && KINDS[q].boost.k === k && KINDS[q].prod)) outs.push(`${icon(KINDS[q].prod)}${KINDS[q].craft || KINDS[q].n} schneller`);
  for (const [t, T] of Object.entries(TIERS)) if (T.cost && T.cost[k]) outs.push(`${icon('haus')}Ausbau ${T.n}`);
  if (N) outs.push(`${icon('haus')}${N.lvl === 1 ? 'alle' : TIERS[N.lvl].n}`);
  if (!ins.length && !outs.length) return '';
  return `<p class="wchain">${ins.length ? ins.join(' + ') + '<span class="to">→</span>' : ''}<b>${icon(k)}${GN[k]}</b>${outs.length ? '<span class="to">→</span>' + outs.join(' · ') : ''}</p>`;
}
/* What a workplace takes and makes, the same at every place: each good it uses is a tile with its name, how much it takes
   a minute and what lies in store, green when there is enough for the next piece, red when it is missing (a tap leads to
   where it comes from); a tool that speeds the work beside it; an arrow; what it makes a minute, and for a good the
   families need, for how many people that is enough. */
const tileName = k => GN[k] && GN[k].length <= 11 ? GN[k] : shortGN(k);
function flowMarkup(I, b, K, rate){
  const ins = Object.entries(K.use || {}).map(([k, v]) => { const have = Math.floor(groupHave(I, k)), ok = have >= v, ic = GROUPS[k] ? groupNext(I, k) : k, w = ok ? null : needWay(I, ic);
    const act = w && w.build ? `data-act="hint" data-k="${w.build}"` : `data-act="ware" data-k="${ic}"`;
    return `<button class="ftile ${ok ? 'ok' : 'out'}" type="button" ${act} aria-label="${GN[k]}: ${perMin(rate * v)} pro Minute, ${have} im Lager${ok ? '' : ', fehlt'}">${icon(ic)}<small>${tileName(k)}</small><b>${perMin(rate * v)}/min</b><i>${ok ? `Lager ${have}` : 'fehlt'}</i></button>`; });
  const tool = K.boost ? (k => { const have = Math.floor(I.stock[k] || 0); return `<span class="ftile tool ${have > 0 ? 'ok' : 'off'}" role="img" aria-label="Schneller mit ${GN[k]}${have > 0 ? `, ${have} da` : ', keine da'}">${icon(k)}<small>${tileName(k)}</small><i>${have > 0 ? 'macht schneller' : 'wäre schneller'}</i></span>`; })(K.boost.k) : '';
  const prod = prodOf(b), N = !b.at && needOfGood(prod), fr = N ? fullRate(I, b) : 0;
  const outs = [`<button class="ftile made" type="button" data-act="ware" data-k="${prod}" aria-label="macht ${GN[prod]}: ${perMin(rate * outOf(b))} pro Minute">${icon(prod)}<small>${tileName(prod)}</small><b>${perMin(rate * outOf(b))}/min</b><i>${N && fr > 0 ? `reicht für ${Math.round(fr / N.rate)}` : `Lager ${Math.floor(I.stock[prod] || 0)}`}</i></button>`];
  for (const [k, v] of Object.entries(byOf(b) || {})) outs.push(`<span class="ftile made by" role="img" aria-label="dazu ${GN[k]}: ${perMin(rate * v)} pro Minute">${icon(k)}<small>${tileName(k)}</small><b>${perMin(rate * v)}/min</b><i>dazu</i></span>`);
  const left = ins.length || tool ? `<div class="fcol"><span class="flbl">Braucht</span><div class="frow">${ins.join('')}${tool}</div></div><span class="farr" aria-hidden="true">→</span>` : '';
  return `<div class="flow3">${left}<div class="fcol"><span class="flbl">Macht</span><div class="frow">${outs.join('')}</div></div></div>`;
}
/* what something takes, as tiles with the name of each good and how much is there, green or red; a red one leads to where
   the good comes from (canoes, feasts) */
function costTiles(I, cost){
  return `<div class="rtiles">${Object.entries(cost).map(([k, v]) => { const have = Math.floor(groupHave(I, k)), ok = have >= v, ic = GROUPS[k] ? groupNext(I, k) : k, w = ok ? null : needWay(I, ic), act = w && w.build ? `data-act="hint" data-k="${w.build}"` : w && w.fleet ? 'data-act="fleetbar"' : '';
    return `<${act ? 'button' : 'span'} class="rtile ${ok ? 'ok' : 'out'}" ${act ? `type="button" ${act}` : 'role="img"'} aria-label="${GN[k]}: ${have} von ${v}">${icon(ic)}<small>${tileName(k)}</small><b>${Math.min(have, v)}/${v}</b></${act ? 'button' : 'span'}>`; }).join('')}</div>`;
}
/* A good on its own sheet: who makes it, where, and who uses it */
function wareMarkup(I, k){
  const by = I.buildings.filter(b => !b.bt && KINDS[b.kind].prod && (prodOf(b) === k || (byOf(b) || {})[k] || (KINDS[b.kind].picks && KINDS[b.kind].picks[k])));
  const use = I.buildings.filter(b => !b.bt && KINDS[b.kind].use && Object.keys(KINDS[b.kind].use).some(q => q === k || (GROUPS[q] || []).includes(k)));
  const need = needsOf(I).list.find(n => n.k === k), sf = staffOf(I);
  const line = b => { const ids = sf.crewP.get(b) || [], w = b.idle || workState(I, b);
    return `<li>${icon(prodOf(b) || k)}<span class="nm">${KINDS[b.kind].n}<small>${ids.map(id => { const p = I.people.find(q => q.id === id); return p ? `<button class="link" type="button" data-act="who" data-p="${id}">${p.n}</button>` : ''; }).join(', ') || (KINDS[b.kind].crew ? 'niemand' : 'arbeitet von selbst')}${w ? ` · ${shortWhy(w)}` : ''}</small></span><button class="chip" type="button" data-act="goto" data-b="${b.id}">Hin</button></li>`; };
  let h = head(GN[k], `${I.name}: ${I.stock[k] || 0} im Lager, +${perMin(makeRate(I, k))} −${perMin(workUse(I, k) + (need ? need.use : 0))} pro Minute`);
  h += chainMarkup(I, k);
  { const N = needOfGood(k), b = by.find(q => prodOf(q) === k); if (N && b){ const r = fullRate(I, b); if (r > 0) h += `<p class="sub">Ein ${KINDS[b.kind].craft || KINDS[b.kind].n}, voll besetzt: ${perMin(r)} pro Minute. Das reicht für etwa ${feedsText(N, r / N.rate)}.</p>`; } }
  h += `<p class="sec">Wer macht es</p>` + (by.length ? `<ul class="list needs">${by.map(line).join('')}</ul>` : `<p class="sub">Niemand auf ${I.name}.</p>`);
  if (use.length) h += `<p class="sec">Wer braucht es</p><ul class="list needs">${use.map(line).join('')}</ul>`;
  if (need) h += `<p class="sub">Die Familien brauchen ${perMin(need.use)} pro Minute.</p>`;
  return h;
}
function infoMarkup(I, b){
  const K = KINDS[b.kind], st = (cls, t) => `<span class="state ${cls}">${t}</span>`, more = [K.info];
  let line = '', bar = '', why = '';
  if (b.bt && K.plant) line = `${st('low', 'wächst')} <span>noch ${secsText(b.bt * TICK / 1000)}</span>`;
  else if (K.yam && !b.bt){   // the yam year in pictures: plant in the rains, harvest as the lean time begins
    const Y = K.yam, m = moonOf(), until = id => { const Q = SEASONS.find(q => q.id === id); return (Q.from - m + 12) % 12 || 12; };
    line = (!b.ys ? st('low', `Pflanzzeit in ${until(Y.plant)} ${until(Y.plant) === 1 ? 'Mond' : 'Monden'}`) : b.ys === 1 ? st('ok', 'wird gepflanzt') : st('ok', `Ernte in ${until(Y.harvest)} ${until(Y.harvest) === 1 ? 'Mond' : 'Monden'}`)) +
      (b.kept > 0 ? `<span>${icon('nahrung')}${Math.round(b.kept)} am Gestell</span>` : '') + `<span class="yamyear" aria-label="Pflanzen in der ${SEASON_IN(Y.plant)}, Ernte in der ${SEASON_IN(Y.harvest)}, ${Y.out} Feldfrüchte">${icon(Y.plant)}<i class="arr2"></i>${icon(Y.harvest)}${icon('nahrung')}+${Y.out}</span>`;
    if (b.ys === 1) bar = `<span class="mbar big"><i style="width:${Math.round((b.sown || 0) * 100)}%"></i></span>`;
    more.unshift(`Gepflanzt wird in der ${SEASON_IN(Y.plant)}, dann braucht das Feld niemanden. Wenn die ${SEASON_IN(Y.harvest)} beginnt, wird alles auf einmal geerntet: ${Y.out} Feldfrüchte für die Zeit, in der die Brotfrucht nicht trägt.`);
  }
  else if (b.grow > 0 && !b.bt){   // a garden planted, not yet bearing
    line = `${st('low', 'wächst')}<span>${icon(prodOf(b) || K.prod)} ab ${secsText(b.grow * TICK / 1000)}</span>`;
    bar = `<span class="mbar big"><i style="width:${Math.round((1 - b.grow / K.grow) * 100)}%"></i></span>`;
    more.unshift('Was gepflanzt ist, trägt erst nach einer Weile. Bis dahin braucht der Garten niemanden; die Leute arbeiten woanders.');
  }
  else if (b.bt){
    // a building site: how far, how much of the wood is there, and what the builders are doing
    const W = workOf(I, {type:'site', b}), f = 1 - b.bt / K.bt, here = walkers.filter(w => w.isl === I.id && w.job && w.job.b === b && w.on);
    const qi = (staffOf(I).queue || []).indexOf(b.id), lim = builders(I) + I.buildings.filter(q => q.bt && q.prio).length, doing = !crewAt(I, b) ? st('out', qi >= lim ? `wartet · ${qi + 1 - lim}. in der Reihe` : 'keine Leute frei') : !here.length ? st('low', 'Bauleute kommen') : here.some(w => w.leg === 'work') && b.bt > woodFloor(W) + .01 ? st('ok', groundSite(b.kind) ? 'wird angelegt' : 'wird gebaut') : st('low', 'Holz wird geholt');
    line = `${doing}<span>${icon('holz')}${W.o.got}/${W.need}</span><span>${Math.round(f * 100)} %</span>`;
    bar = `<span class="mbar big"><i style="width:${f * 100}%"></i></span>`;
    // wrecked by a storm: it waits for half of its wood and fronds in the store before anyone builds
    if (b.unpaid){ line = st('out', 'wartet auf Holz und Wedel'); bar = costTiles(I, b.unpaid); more.unshift(`Der Sturm hat es zerstört. Für den Wiederaufbau braucht es ${costText(b.unpaid)} aus dem Lager. Sobald es da ist, bauen die Leute.`); }
    else if (!crewAt(I, b)) more.unshift(`Es wird an ${builders(I)} ${builders(I) === 1 ? 'Stelle' : 'Stellen'} zugleich gebaut, je 10 Bewohner eine mehr. Ist niemand frei, legen zwei ihre Arbeit dafür nieder.`);
    more.unshift('Gebaut wird zu zweit: Einer hält den Pfosten, der andere bindet. Allein dauert es dreimal so lang. Die Bauleute tragen Holz und Palmwedel aus dem Lager herbei.');
  } else if (b.boat > 0){
    const f = 1 - b.boat / K.canoe;
    line = `${crewAt(I, b) ? st('ok', 'Einbaum wird geschnitzt') : st('out', 'niemand schnitzt')}<span>${Math.round(f * 100)} %</span>`;
    bar = `<span class="mbar big"><i style="width:${f * 100}%"></i></span>`;
    more.unshift(b.kind === 'steg' ? 'Erst wenn der Einbaum fertig ist, fährt er zu den Pfahlhäusern.' : 'Erst wenn der Einbaum fertig ist, fahren die Fischer hinaus.');
  } else if (K.prod || K.plants){
    const w = b.idle || workState(I, b), rate = PER_MIN / K.every / slowOf(b) / pace(I, K) / (K.soil ? soilPace(b) : 1) * workSpeed(I, b, K.crew ? crewAt(I, b) || 0 : 1), uses = K.use ? Object.entries(K.use).map(([k, v]) => `${icon(groupNext(I, k))}${perMin(rate * v)}`).join('') + '<span class="arr">→</span>' : '';
    const by = byOf(b) ? Object.entries(byOf(b)).map(([k, v]) => `${icon(k)}${perMin(rate * v)}`).join('') : '';
    line = `${w ? st('out', shortWhy(w)) : st('ok', 'arbeitet')}${K.prod ? '' : `<span>${icon('sapling')}alle ${K.every * TICK / 1000} s</span>`}`;
    if (K.prod) bar = flowMarkup(I, b, K, rate) + bar;   // what it takes and makes, each good by name, green or red
    { const N = K.prod && !b.at && needOfGood(prodOf(b)), fr = N ? fullRate(I, b) : 0; if (N && fr > 0) more.splice(1, 0, `Voll besetzt ${perMin(fr)} ${GN[prodOf(b)]} pro Minute: genug für etwa ${feedsText(N, fr / N.rate)}. Jeder braucht ${perMin(N.rate)} pro Minute.`); }
    // the Erntehaus and the fishers get what is needed most, or what you hold them to
    if (K.picks){ const pk = b.v && K.picks[b.v.pick] ? b.v.pick : '';
      const cur = choiceOf(b);
      why += `<div class="chips picks" role="group" aria-label="Was sie holen"><button class="chip" type="button" data-act="pick" data-v="" aria-pressed="${!pk}">${icon('crew')}Von selbst</button>${Object.entries(K.picks).map(([k, P]) => `<button class="chip pickc${!pk && cur === k ? ' auto' : ''}" type="button" data-act="pick" data-v="${k}" aria-pressed="${pk === k}" aria-label="${P.n}${!pk && cur === k ? ', holen sie gerade' : ''}">${icon(k)}${P.n}</button>`).join('')}</div>`; }
    if (b.kind === 'ernte') more.push(`${palmsNear(I, b).length} Palmen in Reichweite, ${Math.floor(nutsOf(I, b))} reife Nüsse. Jede Palme trägt etwa eine Nuss pro Minute, mehr gibt das Erntehaus nicht her (jetzt bis ${perMin(nutRate(I, b))} pro Minute); teilen sich zwei Erntehäuser einen Hain, teilen sie die Nüsse. Für Holz fällen sie eine alte Palme und setzen an ihre Stelle eine keimende Nuss; dafür müssen mehr als ${K.near.n + 3} stehen.`);
    if (b.kind === 'fisch') more.push(`Das Riff: ${(I.reefLife ?? 1) > .55 ? 'reich' : (I.reefLife ?? 1) > .3 ? 'abgesammelt, es gibt weniger' : 'leer gesammelt, kaum noch etwas'}. Es erholt sich langsam, unter einem Rāhui schneller.`);
    if (K.trees) line += `<span>${icon('holz')}${treesNear(I, b.x, b.y, K.trees.r).length} Bäume</span>`;
    // divers: whether the water allows diving, and how divers really worked
    if (K.dive){ const bl = diveBlock(I); line += `<span>${icon(bl ? 'sturm' : 'passat')}${bl ? 'kein Tauchwetter' : 'ruhiges, klares Wasser'}</span>`;
      more.push('Sie tauchen ohne Brille, ein Stein zieht sie hinab, der Partner im Kanu wacht. Nach einigen Gängen ruhen sie an Land, sonst droht die Taucherkrankheit.',
        'Bei Sturm, nachts und unter Rāhui tauchen sie nicht.',
        I.treasure && I.treasure.k === 'perlmutt' ? 'Vor Tifa liegen die Perlmuscheln tief: mehr Pause, aber Perlmutt.' : I.atoll ? 'Aus Riesenmuschelschalen schleifen sie hier Beile.' : 'Sie bringen Riesenmuscheln, Kraken und Seegurken.'); }
    // the soil of a field: how much is left, and letting it rest
    if (K.soil){ line += `<span>${icon('soil')}Boden ${Math.round((b.soil ?? 1) * 100)} %${sheltered(I, b) ? ', Bäume schützen ihn' : ''}</span>`;
      more.push('Jede Ernte zehrt am Boden. Brach erholt er sich in gut zwei Minuten.');
      why += `<div class="rowx"><span class="soilbar" role="img" aria-label="Boden ${Math.round((b.soil ?? 1) * 100)} %">${icon('soil')}<span class="mbar"><i style="width:${Math.round((b.soil ?? 1) * 100)}%"></i></span></span><button class="btn" type="button" data-act="fallow">${b.fallow ? 'Wieder bestellen' : 'Brachliegen lassen'}</button></div>`; }
    if (w && w.why !== 'way') why = `<p class="sub why">${w.text}</p>`;
  }
  if (K.boost && !b.bt) more.push(tooled(I, K) ? `Mit ${GN[K.boost.k]} aus dem Lager geht es schnell. ${K.boost.k === 'schnur' ? 'Ein Netz' : 'Ein Beil'} hält für ${K.boost.per} ${GN[K.prod]}.` : `Ohne ${GN[K.boost.k]} geht es ${K.boost.slow === 2 ? 'nur halb so schnell' : 'langsamer'}.`);
  if (b.kind === 'fisch' && !b.bt && (unlocked('hakenmacher') || I.stock.haken > 0)) more.push((I.stock.haken || 0) > 0 ? `Mit Angelhaken aus Muschel fangen sie anderthalbmal so viel Fisch; ein Haken hält für etwa ${HOOK.per} Fische.` : 'Mit Angelhaken aus Muschel fingen sie mehr Fisch. Eine Familie kann sie schleifen.');
  if (K.beauty && !b.bt) line += `<span>Schönheit +${K.beauty}</span>`;
  if (b.kind === 'sternhaus') more.push('Stufe 1: Vögel zeigen, wo im Nebel Land liegt. Stufe 2: Wolken stehen über Inseln. Stufe 3: Der Proviant reicht länger, das Doppelkanu sieht weiter.',
    'Wer lernt, kommt eine Stufe weiter als sein Lehrer. Stufe 2 nach drei neuen Inseln, Stufe 3 nach sieben.');
  if (K.roof && !b.bt){ const age = roofAge(b); more.push(age < .34 ? 'Frisches Dach.' : age < .8 ? 'Das Dach wird grau.' : 'Altes Dach, bald erneuern.'); }
  // the conch, in the row of the people: blown, people come at once; it calls attention when nobody is there
  const working = (b.bt && !K.plant) || placesOf(I).includes(b);   // a growing garden or a yam field out of season needs nobody
  const lonely = working && !crewAt(I, b), horn = working ? `<button class="chip horn${lonely && !b.prio ? ' hint' : ''}" type="button" data-act="prio" aria-pressed="${!!b.prio}" aria-label="Vorrang: mit dem Muschelhorn Leute rufen, sie kommen sofort">${icon('horn')}Vorrang</button>` : '';
  { const sb = b.idle && b.idle.site && findB(b.idle.site);   // the place whose people build: a button to their site instead of a sentence
    if (why && b.idle && (b.idle.why === 'crew' || b.idle.why === 'bau')) why = sb ? `<div class="chips stillrow"><span class="sub">bauen:</span><button class="chip way" type="button" data-act="goto" data-b="${sb.id}">${bIcon(sb.kind)}${KINDS[sb.kind].n}</button></div>` : ''; }
  // one tight block: the state with the conch and "Bleiben" on its line, then what it takes and makes beside its people
  const site = b.bt || (b.kind === 'werft' && I.yard), crewed = working || b.boat > 0, tight = crewed && !site && KINDS[b.kind].crew > 0;
  return [(line || tight ? `<div class="stat">${line}${tight ? `<span class="grow"></span>${horn}${keepBtn(b)}` : ''}</div>` : '') + `<div class="workgrid">${bar}${crewed ? `<div class="crewbox">${crewMarkup(I, b, tight ? '' : horn, tight)}</div>` : ''}</div>` + why, `<details class="more"${sheetData.more ? ' open' : ''}><summary>Mehr dazu</summary>${more.map(t => `<p class="sub">${t}</p>`).join('')}</details>`];
}
function head(title, sub){ return `<div class="sheet-head"><div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div><button class="x" type="button" data-act="close" aria-label="Schließen">×</button></div>`; }
/* a sheet about an island that is gone (another game was loaded or begun) closes instead of failing */
const sheetGone = () => !!sheetData && typeof sheetData.id === 'string' && !isl(sheetData.id);
function renderSheet(){
  if (sliding) return;
  const body = $('sheetBody'); let h = '';
  if (sheetGone()){ closeSheet(); return; }
  { const b = sheetKind === 'info' && findB(sheetData.id), home = !!b && HOME_KINDS.has(b.kind) && !b.bt; $('sheet').classList.toggle('tall', home); $('sheet').classList.toggle('center', home && b === centerOf(islOfB(b.id))); }   // a house gets the room to show all of itself, the village centre a little more for its tabs
  if (sheetKind === 'ship'){
    const sh = ships.find(q => q.id === sheetData.id); if (!sh){ closeSheet(); return; }
    h += shipMarkup(sh);
  } else if (sheetKind === 'route'){
    if (!routes[sheetData.r]){ closeSheet(); return; }
    h += routeMarkup(sheetData.r);
  } else if (sheetKind === 'fleet'){
    h += fleetMarkup();
  } else if (sheetKind === 'person'){
    const m = personMarkup(); if (!m){ closeSheet(); return; } h += m;
  } else if (sheetKind === 'sat'){
    h += satMarkup(isl((sheetData && sheetData.id) || active));
  } else if (sheetKind === 'calendar'){
    h += calendarMarkup();
  } else if (sheetKind === 'info'){
    { const c = findB(sheetData.id); if (c && c.at && findB(c.at)){ sheetData.id = c.at; sheetData.tab = 'haus'; } }   // a household craft shows its house, on the family tab
    const b = findB(sheetData.id); if (!b){ closeSheet(); return; }
    const K = KINDS[b.kind], I = islOfB(b.id), home = HOME_KINDS.has(b.kind) && !b.bt;
    const [main, more] = home ? [b === centerOf(I) ? centerMarkup(I, b) : houseMarkup(I, b), ''] : infoMarkup(I, b);
    h += home ? main : head(K.n, I.name) + main;
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
    if ((b.kind === 'halle' || b.kind === 'platz') && !b.bt) h += `<div class="rowx"><span class="sub">${korCanThrow() ? 'Im Schatten wird mit fünf Knochen geworfen, einmal am Tag.' : 'Der Knöchelwurf ist für heute geworfen.'}</span><button class="btn" type="button" data-act="koruru">Knöchelwurf</button></div>`;
    if (b.kind === 'halle' && !b.bt){ if (feastsOpen()) h += `<p class="sub">Ansehen des Clans: ${Math.floor(mana)}.</p>` + feastMarkup(I); h += festivalMarkup(I); }
    h += more;
    if (sheetData.confirm) h += `<div class="rowx"><span>${Object.keys(costOf(b.kind, I)).length ? 'Wirklich entfernen? Die Hälfte kommt zurück.' : 'Wirklich entfernen?'}</span><span class="chips"><button class="btn" type="button" data-act="nokill">Behalten</button><button class="btn primary" type="button" data-act="kill">Entfernen</button></span></div>`;
    else if (!K.fixed){ const bt = home ? 'chip' : 'btn';
      h += `<div class="rowx${home ? ' foot' : ''}">${home ? houseLine(I, b) : ''}<span class="chips">${FELL_WOOD[b.kind] && !b.bt ? `<button class="btn" type="button" data-act="fell">Fällen: ${FELL_WOOD[b.kind]} Holz</button>` : ''}<button class="${bt}" type="button" data-act="move">Versetzen</button><button class="${bt}" type="button" data-act="askkill">Entfernen</button></span></div>`; }
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
  } else if (sheetKind === 'immig'){
    const sh = ships.find(q => q.id === sheetData.ship); if (!sh || !sh.immig){ closeSheet(); return; }
    h += immigMarkup(sh);
  } else if (sheetKind === 'landing'){
    h += landingMarkup();
  } else if (sheetKind === 'intro'){
    const first = sheetData && sheetData.first;
    h += head(first ? 'Land in Sicht' : 'So geht es', first ? `Euer Ahnenkanu ist auf ${isl('heimat').name} gelandet.` : '');
    if (first) h += `<ul class="help pics"><li><span class="fing">${FINGER_SVG}</span>Folge dem Finger.</li><li>${icon('haus')}Tippe ein Haus an.</li><li>${knotIc}Alle Kacheln grün: Das Haus kann ausgebaut werden.</li></ul>`;
    else h += `<ul class="help pics"><li><span class="fing">${FINGER_SVG}</span>Unten der nächste Schritt. Antippen zeigt den Weg.</li><li>${icon('haus')}Haus antippen: Familie, was sie braucht, Ausbau.</li><li>${knotIc}Alle Kacheln grün: Ausbau.</li><li>${icon('pop')}Bewohnerzahl oben: alles auf einen Blick.</li><li>${icon('idle')}Gesicht oben: wie zufrieden alle sind; antippen zeigt, wem es schlecht geht.</li><li>${bIcon('haus')}Bauen: Gebäude wählen, auf Land tippen.</li><li>${icon('horn')}Vorrang: Leute kommen sofort.</li><li>${icon('einbaum')}Leere Hütte: Eine Familie kommt im Kanu.</li><li>${icon('kind')}Kinder kommen im Familienhaus.</li></ul>`;
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
    h += head('Menü', `Spielstand ${curSlot} · Welt Nr. ${seed}`);
    if (sheetData && sheetData.confirm) h += `<div class="rowx"><span>Spielstand ${curSlot} neu beginnen, mit neuen Inseln? Die Kopien bleiben eine Weile im Menü.</span><span class="chips"><button class="btn" type="button" data-act="close">Nein</button><button class="btn primary" type="button" data-act="reset">Neu beginnen</button></span></div>`;
    else if (sheetData && sheetData.slotNew) h += `<div class="rowx"><span>Spielstand ${sheetData.slotNew} neu beginnen, mit neuen Inseln? Die Kopien bleiben eine Weile im Menü.</span><span class="chips"><button class="btn" type="button" data-act="close">Nein</button><button class="btn primary" type="button" data-act="slotnew" data-n="${sheetData.slotNew}">Neu beginnen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="help">So geht es</button><button class="btn" type="button" data-act="chronik">Chronik</button><button class="btn" type="button" data-act="koruru">Knöchelwurf</button>${quest >= QUESTS.length ? '<button class="btn" type="button" data-act="finale">Rückblick</button>' : '<button class="btn" type="button" data-act="skipq">Ohne Einführung</button>'}</span></div>` +
      `<p class="sec">Spielstände</p><ul class="list needs slots">${Array.from({length:SLOTS}, (_, i) => slotRow(i + 1)).join('')}</ul>` +
      `<p class="sec">Als Datei</p><div class="rowx"><span class="chips"><button class="btn" type="button" data-act="export">Sichern</button><button class="btn" type="button" data-act="import">Laden</button></span></div>` +
      (backups().length ? `<div class="chips copies">${backups().map(b => `<button class="chip" type="button" data-act="backup" data-i="${b.i}">Kopie ${ago(b.at)}</button>`).join('')}</div>` : '') +
      `<details class="more"><summary>Als Text</summary><textarea id="saveText" class="savetext" rows="3" spellcheck="false" aria-label="Spielstand als Text"></textarea><div class="rowx"><span class="chips"><button class="chip" type="button" data-act="showtext">Zeigen</button><button class="chip" type="button" data-act="loadtext">Aus Text laden</button></span></div></details>` +
      `<div class="rowx"><span class="chips"><button class="chip" type="button" data-act="sound" aria-pressed="${opts.sound}">Klang: ${soundWord()}</button><button class="chip" type="button" data-act="music" aria-pressed="${opts.music !== false}">Musik</button><button class="chip" type="button" data-act="mvol" aria-label="Lautstärke der Musik: ${MVOL_WORD[opts.mvol == null ? 1 : opts.mvol]}">Musik ${MVOL_WORD[opts.mvol == null ? 1 : opts.mvol]}</button><button class="chip" type="button" data-act="night" aria-pressed="${opts.night}">Tag und Nacht</button><button class="chip" type="button" data-act="meter" aria-pressed="${!!opts.meter}">Messwerte</button></span></div>` +
      (e => e ? `<details class="more"><summary>Letzter Fehler${errN ? ` (${errN})` : ''}</summary><p class="sub errtxt">${String(e).replace(/[<>&]/g, '')}</p><p class="sub">Das Spiel läuft trotzdem weiter. Schick diesen Text, dann lässt sich der Fehler finden.</p></details>` : '')(lastErr || (() => { try { return localStorage.getItem('polinusa-err'); } catch (x){ return ''; } })());
  }
  body.innerHTML = h; lastSig = sheetSig(); if (sheetKind === 'koruru') koruruMount();
}
let lastSig = '';
function sheetSig(){
  if (sheetGone()) return 'gone';
  if (sheetKind === 'quest') return quest + ':' + (QUESTS[quest] ? QUESTS[quest].n() : '');
  if (sheetKind === 'immig'){ const sh = ships.find(q => q.id === sheetData.ship); return sh && sh.immig ? Math.ceil((tick - (sh.askAt || tick)) / 5) + ':' + needsOf(isl(sh.to)).list.map(n => n.state).join('') : 'gone'; }
  if (sheetKind === 'needs' || sheetKind === 'store' || sheetKind === 'mana'){ const I = isl(active), nd = needsOf(I); const sf = staffOf(I); return [sheetKind, sheetData && sheetData.tab, readyHomes(I, nd.list).length, I.autoUp, homesOf(I).map(tierOf).join(''), active, I.pop, I.lvl, Math.floor(mana), nd.cap, sf.free, sf.build, famsOf(I).map(f => f.home).join(), (I.people || []).map(p => p.job).join('.'), I.handWork, I.noUpgrade, !!immigFor(I), kinState(I), linesOf(I).length, Math.floor(tick / 5), [...presentAt(I).values()].join(':'), sf.free, sf.short, ...GOODS.map(k => I.stock[k] || 0), ...I.buildings.map(b => b.idle ? b.idle.why : ''), wildWord(wildOf(I)), !!I.tapu, (I.life || []).join('+'), motifsOf(I).join('+')].join(); }
  if (sheetKind === 'clan'){ const T = isl(sheetData.id), r = routes.find(q => q.a === T.id || q.b === T.id); return [r && r.knots, T.debt >= 1, kin(T), bondsWith(T), !!weddingCheck(T).ok].join(); }
  if (sheetKind === 'fam'){ const I = isl(sheetData.id), f = I && famOf(I, sheetData.f); if (!f) return 'gone'; return [f.home, f.home && canUpgrade(I, findB(f.home)), famTier(I, f), membersOf(I, f).map(p => p.id + stageOf(p)).join(), famNeeds(I, f, needsOf(I).list).map(n => n.state).join(), famWork(I, f)].join(); }
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
  const fam = HOME_KINDS.has(b.kind) ? (f => f ? [f.id, membersOf(I, f).length, famTier(I, f), famNeeds(I, f, needsOf(I).list).map(n => n.state).join(''), famWork(I, f), canUpgrade(I, b)].join(':') : 'leer' + !!immigFor(I))(famOfHome(I, b)) : (I.people || []).filter(p => p.job === b.id).map(p => p.id).join('.') + ':' + staffOf(I).free + ':' + (choiceOf(b) || '') + ':' + Math.round((I.reefLife ?? 1) * 10);
  return ['a' + age, b.bt, b.boat, b.got, b.prio, Math.ceil((b.grow || 0) / 15), b.ys, Math.round(b.kept || 0), Math.round((b.sown || 0) * 10), moonOf(), (staffOf(I).queue || []).indexOf(b.id), here, fam, (staffOf(I).crewP.get(b) || []).join('.'), Math.round((b.soil ?? 1) * 20), b.fallow, b.idle && b.idle.why, crewAt(I, b), capOf(b), KINDS[b.kind].trees ? treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).length : '', yard, staffOf(I).yard, hall].join();
}
let sliding = false;   // while a slider is dragged the sheet is not drawn anew, or the drag would break off
$('sheetBody').addEventListener('input', e => { const el = e.target; if (!el.matches('input[type=range][data-act]')) return; sliding = true; slideTo(el); updateHUD(); });
document.addEventListener('pointerup', () => { if (sliding) setTimeout(() => { if (sliding){ sliding = false; save(); renderSheet(); } }, 0); }, true);
$('sheetBody').addEventListener('change', e => { if (!e.target.matches('input[type=range][data-act]')) return; sliding = false; save(); renderSheet(); });
let famListOpen = false;   // the list of all families stays open while the overview is drawn anew
$('sheetBody').addEventListener('toggle', e => { if (e.target.matches('details.famlist')) famListOpen = e.target.open; }, true);
$('sheetBody').addEventListener('toggle', e => { if (e.target.matches('details.more') && sheetData) sheetData.more = e.target.open; }, true);
/* the village's share of work and free time, as a slider */
$('sheetBody').addEventListener('change', e => {
  if (e.target.id !== 'zealIn') return;
  const I = isl(e.target.dataset.i); if (!I) return;
  I.zeal = clamp(Math.round(+e.target.value), 0, 2); I.staff = null; I._sat = null; I._mf = null; save(); renderSheet(); updateHUD(); toast(`${I.name}: ${ZEAL[I.zeal].n}.`, 2200, false);
});
$('sheetBody').addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'close'){ closeSheet(); return; }
  if (eventAct(act, btn)) return;
  if (fleetAct(act, btn)) return;
  if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b) return;
    if (act === 'move'){ startMove(b); return; }
    if (act === 'prio'){ setPrio(islOfB(b.id), b, !b.prio); updateHUD(); renderSheet(); save(); return; }
    if (act === 'keep'){ b.keep = !b.keep; islOfB(b.id).staff = null; syncWalkers(); toast(b.keep ? `${placeName(b)}: Die Leute bleiben hier. Niemand wird ausgeliehen.` : `${placeName(b)}: Die Leute dürfen wieder aushelfen.`, 2600, false); renderSheet(); save(); return; }
    if (act === 'pick'){ const I = islOfB(b.id), v = btn.dataset.v; b.v = {...(b.v || {})}; if (v) b.v.pick = v; else delete b.v.pick; b._by = null; b.idle = null; if (!v) choosePick(I, b); syncWalkers(); updateHUD(); renderSheet(); save(); return; }
    if (act === 'fell'){ const I = islOfB(b.id), n = FELL_WOOD[b.kind] || 0; I.stock.holz = Math.min(storeCap(I), (I.stock.holz || 0) + n); stats.gefaellt = (stats.gefaellt || 0) + 1; I.buildings = I.buildings.filter(x => x.id !== b.id); I.staff = null; syncWalkers(); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} gefällt: ${n} Holz. Was sie trug, ist fort.`, 2800, false); return; }
    if (act === 'fallow'){ const I = islOfB(b.id); b.fallow = !b.fallow; if (b.fallow) stats.brache = (stats.brache || 0) + 1; b.idle = null; I.staff = null; syncWalkers(); invalidate(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'workadd' || act === 'workdel'){ const I = islOfB(b.id), p = act === 'workadd' ? workAdd(I, b) : workDel(I, b); if (p && !awayQuiet) toast(act === 'workadd' ? `${p.n} geht zu ${KINDS[b.kind].n}.` : `${p.n} ist jetzt frei.`, 1800, false); updateHUD(); renderSheet(); save(); checkQuest(); return; }
    if (act === 'mc-' || act === 'mc+'){ const K = KINDS[b.kind], I = islOfB(b.id), n = clamp(capOf(b) + (act === 'mc+' ? 1 : -1), 0, K.crew); b.v = {...b.v, mc:n}; if (n === K.crew) delete b.v.mc; I.staff = null; syncWalkers(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'craft'){ const I = islOfB(b.id), k = btn.dataset.k, K = KINDS[k], cur = craftOf(I, b), off = !!cur && cur.kind === k, why = off ? '' : craftWhy(I, b, k);
      if (why){ toast(`${K.craft}: ${why}.`, 3000, false); return; }
      setCraft(I, b, off ? null : k); sheetData.crafts = false; const f = famOfHome(I, b); if (!off && f) toast(`${famName(f)}: ${K.craft}.`, 2000, false);
      updateHUD(); renderSheet(); save(); checkQuest(); return; }
    if (act === 'askkill'){ sheetData.confirm = true; renderSheet(); return; }
    if (act === 'nokill'){ sheetData.confirm = false; renderSheet(); return; }
    if (act === 'kill'){ const I = islOfB(b.id), c = costOf(b.kind, I); for (const [k, v] of Object.entries(c)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + Math.floor(v / 2)); I.buildings = I.buildings.filter(x => x.id !== b.id); I.staff = null; syncWalkers(); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} ist weg.`, 2600, false); return; }
    if (act === 'feast'){ holdFeast(islOfB(b.id), FEASTS.find(F => F.id === btn.dataset.f)); return; }
    if (act === 'ctab'){ sheetData = {...sheetData, tab:btn.dataset.v, crafts:false}; renderSheet(); return; }   // the tabs of the village centre
    if (act === 'craftpick'){ sheetData = {...sheetData, crafts:!sheetData.crafts}; renderSheet(); return; }
    if (act === 'rain'){ rainDance(islOfB(b.id)); renderSheet(); return; }
    if (act === 'roof'){ const h = findB(+btn.dataset.b) || b; toast(HOME_KINDS.has(h.kind) ? `${roofText(islOfB(h.id), h)}.` : 'Eine Hütte für jede Familie.', 4200, false); return; }
    if (act === 'tieall'){ tieRoofs(islOfB(b.id)); renderSheet(); return; }
    if (act === 'talisman'){ cutTalisman(islOfB(b.id)); renderSheet(); return; }
    if (act === 'strength'){ setStrength(islOfB(b.id), btn.dataset.k); renderSheet(); return; }
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
  if (act === 'upgrade'){ const b = findB(+btn.dataset.b), I = b && islOfB(b.id); if (b && canUpgrade(I, b)) upgradeHouse(I, b); updateHUD(); renderSheet(); save(); checkQuest(); return; }
  if (act === 'autoup' && sheetKind === 'needs'){ const I = isl(active); I.autoUp = !I.autoUp; renderSheet(); save(); return; }
  if (act === 'tab' && sheetKind === 'needs'){ sheetData = {...(sheetData || {}), tab:btn.dataset.v}; renderSheet(); return; }
  if (act === 'hint'){ closeSheet(); hintBuild(btn.dataset.k); return; }
  if (act === 'fleetbar'){ closeSheet(); setBar('fleet'); return; }
  if (act === 'store'){ openSheet('store'); return; }
  if (act === 'upall'){ const I = sheetKind === 'info' ? islOfB(sheetData.id) : isl(active), t = +btn.dataset.t || 0, list = needsOf(I).list; let n = 0; for (const b of readyHomes(I, list)) if ((!t || tierOf(b) === t) && canUpgrade(I, b)){ upgradeHouse(I, b); n++; } if (n > 1) toast(`${n} Häuser ausgebaut.`, 2600, false); updateHUD(); renderSheet(); save(); checkQuest(); return; }
  if (act === 'immig' && sheetKind === 'immig'){ const sh = ships.find(q => q.id === sheetData.ship); if (sh) immigAnswer(sh, btn.dataset.v === 'yes'); updateHUD(); return; }
  if (act === 'fam'){ const I0 = sheetKind === 'info' ? islOfB(sheetData.id) : isl(active), f0 = I0 && famOf(I0, +btn.dataset.f), hb = f0 && f0.home && findB(f0.home); if (hb){ select(hb); return; } openSheet('fam', {id:sheetKind === 'info' ? islOfB(sheetData.id).id : sheetData && sheetData.id && isl(sheetData.id) ? sheetData.id : active, f:+btn.dataset.f}); return; }
  if (act === 'who'){ focusPerson(+btn.dataset.p); return; }
  if (act === 'satopen'){ openSheet('sat', {id:active}); return; }
  if (sheetKind === 'person' && act === 'jobpick'){ sheetData = {...sheetData, pick:!sheetData.pick}; renderSheet(); return; }
  if (sheetKind === 'person' && act === 'setjob'){ const I = isl(sheetData.id), p = I && (I.people || []).find(q => q.id === sheetData.p), b = findB(+btn.dataset.b), r = chooseJob(I, p, b);
    if (r){ toast(`${p.n}: Stammplatz ${placeName(b)}.${r.swap ? ` ${r.swap.n} tauscht${r.swap.job && r.old ? ` und geht zu ${placeName(r.old)}` : ' und ist jetzt frei'}.` : ''}`, 3200, false); sheetData = {...sheetData, pick:false}; updateHUD(); renderSheet(); save(); checkQuest(); }
    return; }
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
    if (act === 'music'){ setMusic(opts.music === false); renderSheet(); return; }
    if (act === 'mvol'){ cycleMusicVol(); renderSheet(); return; }
    if (act === 'night'){ opts.night = !opts.night; saveOpts(); requestDraw(); renderSheet(); return; }
    if (act === 'meter'){ opts.meter = !opts.meter; saveOpts(); showMeter(); renderSheet(); return; }
    if (act === 'askreset'){ sheetData = {confirm:true}; renderSheet(); return; }
    // the game as a file to keep, and back again; or as text where files cannot be saved
    if (act === 'export'){ exportGame(); return; }
    if (act === 'import'){ const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
      inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; f.text().then(loadRaw); }; inp.click(); return; }
    if (act === 'backup'){ const b = backups().find(q => q.i === +btn.dataset.i); if (b) loadRaw(b.raw); return; }
    if (act === 'showtext'){ const t = $('saveText'); save(); t.value = serialize(); t.focus(); t.select(); return; }
    if (act === 'loadtext'){ loadRaw($('saveText').value.trim()); return; }
    if (act === 'reset'){ switchSlot(curSlot, true); return; }
    if (act === 'slot'){ switchSlot(+btn.dataset.n); return; }
    if (act === 'askslot'){ sheetData = {slotNew:+btn.dataset.n}; renderSheet(); return; }
    if (act === 'slotnew'){ switchSlot(+btn.dataset.n, true); return; }
  }
});
/* the game as a file: inside the claude.ai viewer through its downloads capability (the viewer confirms), in a plain
   browser as an ordinary download; where neither works, the text under "Als Text" still does */
async function exportGame(){
  save(); const raw = serialize(), d = new Date(), name = `polinusa-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  const fallback = () => toast('Sichern ging hier nicht. Unter „Als Text“ geht es auch.', 3400, false);
  let dl = null; try { dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch (e){ dl = null; }
  if (dl){ try { await dl.save({filename:name, data:raw}); toast('Spielstand gesichert.', 2200, false); } catch (e){ if (!e || e.code !== 'declined') fallback(); } return; }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([raw], {type:'application/json'})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Spielstand gesichert.', 2200, false); }
  catch (e){ fallback(); }
}
/* load a game from a file, a copy or text: only when it is a whole game of this version; the current one is kept as a copy */
function loadRaw(raw){
  let ok = false; const before = serialize();
  try { ok = !!raw && restore(raw); } catch (e){ ok = false; }
  if (!ok){ restore(before); renderAll(); toast('Das ist kein Spielstand, den Polinusa lesen kann.', 3200, false); return; }
  try { localStorage.setItem(backupKey(BACKUPS - 1), JSON.stringify({at:Date.now() - 1, raw:before})); } catch (e){}
  closeSheet(); renderAll(); save(); toast('Spielstand geladen.', 2200, false);
}
const giftGuess = (C, worth) => { const g = returnGoods(C, worth); return g.load ? giftText(g.cargo) : 'eine kleine Gabe'; };
function select(b){ const craft = b.at && findB(b.at); if (craft) b = craft; selectedId = b.id; invalidate(); setActive(islOfB(b.id).id); openSheet('info', craft ? {id:b.id, tab:'haus'} : {id:b.id}); }   // a craft mat opens its house on the family tab
