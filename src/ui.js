'use strict';
/* Interface: top bar, build bar, placing, sheets and messages. Plain HTML over the map. */

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
  // the dot next to the people count: green while the village grows, yellow when the houses are full, red when something is missing
  const nd = needsOf(I), st = nd.missing.length ? 'out' : nd.full ? 'full' : 'ok';
  $('popDot').className = 'dot ' + st;
  $('popBtn').setAttribute('aria-label', `${I.pop} Bewohner, Platz für ${nd.cap}. ${growText(I, nd)} Tippen zeigt den Bedarf.`);
  // the goods row shows what matters here: food and wood, then whatever is stored, made or needed, at most seven
  const shown = GOODS.filter(k => k === 'nahrung' || k === 'holz' || (I.stock[k] || 0) > 0 || makeRate(I, k) > 0 || nd.list.some(n => n.k === k)).slice(0, 7);
  const ul = $('goods'); if (ul.dataset.keys !== shown.join()){ ul.dataset.keys = shown.join(); ul.innerHTML = shown.map(k => `<span class="g" data-k="${k}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span></span></span>`).join(''); }
  for (const li of ul.children){ const k = li.dataset.k, v = I.stock[k] || 0; li.querySelector('span').textContent = v; li.classList.toggle('zero', !v);
    if (lastStock.isl === active && v >= (lastStock[k] || 0) + 2){ li.classList.remove('up'); void li.offsetWidth; li.classList.add('up'); } }
  lastStock = {isl:active, ...I.stock};
  $('vitalBtn').innerHTML = vitalLine(I);
  $('storeBtn').setAttribute('aria-label', 'Lager: ' + shown.map(k => `${GN[k]} ${I.stock[k] || 0}`).join(', ') + '. Tippen zeigt alles.');
  for (const btn of $('buildList').children){ const k = btn.dataset.kind; btn.classList.toggle('poor', !canPay(I, costOf(k, I))); }
}
function renderBuildBar(){
  const I = isl(active);
  $('buildWhere').textContent = 'auf ' + I.name;
  const fleet = own().length > 0 || routes.length > 0;
  $('tradeBtn').hidden = !fleet; $('tradeBtn').previousElementSibling.toggleAttribute('hidden', !fleet);
  $('buildList').innerHTML = ORDER.filter(k => KINDS[k].on.includes(I.type) && unlocked(k) && (!KINDS[k].dep || depsOf(I, KINDS[k].dep).length)).map(k => { const K = KINDS[k];
    return `<button type="button" class="bbtn${newKinds.has(k) ? ' new' : ''}" data-kind="${k}" aria-pressed="false" aria-label="${K.n}, kostet ${costText(costOf(k, I))}"><svg viewBox="${K.vb}" aria-hidden="true">${iconMarkup(k)}</svg><span>${K.s}</span></button>`; }).join('');
  updateHUD();
}
function villageCenter(I){
  const hs = I.buildings.filter(b => KINDS[b.kind].roof); if (!hs.length) return I.anchor || I.center;
  return {x:hs.reduce((t, b) => t + b.x, 0) / hs.length, y:hs.reduce((t, b) => t + b.y, 0) / hs.length};
}
function setActive(id){ if (active === id || !isl(id).settled) return; active = id; renderBuildBar(); }
let toastT = 0;
function toast(msg, ms = 2600){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }

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
  if (K.max && I.buildings.filter(b => b.kind === kind).length >= K.max){ toast(`Nur ein ${K.n} pro Insel.`); return; }
  const c = costOf(kind, I); if (!canPay(I, c)){ toast(`Zu wenig ${lacking(I, c)}.`); return; }
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
  $('placeOk').textContent = mode === 'move' ? 'Hier hin' : 'Bauen';
  $('bottom').hidden = true; $('place').hidden = false; measure();
}
function endPlace(){
  const wasMove = mode === 'move'; mode = 'idle'; placing = null; ghostRender();
  $('place').hidden = true; $('bottom').hidden = false; measure();
  for (const b of $('buildList').children) b.setAttribute('aria-pressed', 'false');
  if (wasMove) invalidate();
}
function confirmPlace(){
  if (!placing || !placing.ok) return;
  const I = isl(placing.island), K = KINDS[placing.kind];
  if (mode === 'move'){ const b = findB(placing.moveId); if (b){ b.x = fx(placing.x); b.y = fx(placing.y); b.v = placing.v; clearStumps(I, b); } endPlace(); invalidate(); save(); toast(`${K.n} versetzt.`); return; }
  const c = costOf(placing.kind, I); if (!canPay(I, c)){ toast(`Zu wenig ${lacking(I, c)}.`); return; }
  // nothing stands at once: a building site waits for builders, a young plant grows
  pay(I, c); const b = addB(I, placing.kind, placing, placing.v, tick); if (K.bt) b.bt = K.bt; clearStumps(I, b);
  invalidate(); updateHUD(); syncWalkers(); save(); checkQuest();
  const busy = !K.plant && !activeSites(I).includes(b);
  toast(K.plant ? `${K.n} gepflanzt. Sie wächst jetzt.` : busy ? `Baustelle ${K.n}. Sie wartet, bis Bauleute frei sind.` : `Baustelle ${K.n}. ${SITE_CREW} Leute bauen etwa ${Math.round(K.bt * TICK / 1000)} Sekunden daran und arbeiten so lange nirgends sonst.`, 3000);
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
  h += row('pop', `${I.pop} Bewohner`, `${sf.total} können arbeiten, ${I.pop - sf.total} sind Kinder und Alte. Wohnraum für ${nd.cap}.`, bar(I.pop / Math.max(1, nd.cap)), nd.full ? chip('low', 'voll') : chip('ok', `${nd.cap - I.pop} frei`));
  h += row('pop', 'Zuzug', arrivalText(I, nd), '', nd.growing ? chip('ok', 'wächst') : chip(nd.missing.length ? 'out' : 'low', nd.missing.length ? 'stockt' : 'voll'), nd.growing ? '' : 'need');
  h += `</ul>`;
  // work in the order of the priorities, which can be changed
  h += `<p class="sec">Arbeit nach Reihenfolge</p><ul class="list needs">`;
  prioOf(I).forEach((id, i, pr) => {
    const P = PRIO.find(q => q.id === id), c = sf.cats[id] || {used:0, want:0}, short = c.used < c.want;
    const what = id === 'bau' ? (c.want ? `${c.used} Bauleute an ${sf.sites.length || activeCount(I)} Baustellen` : 'Gerade wird nichts gebaut') : c.want ? `${c.used} von ${c.want} Plätzen besetzt` : 'Gerade nichts zu tun';
    h += `<li class="${short ? 'need' : ''}"><b class="qty">${i + 1}.</b><span class="nm">${P.n}<small>${what}</small></span><span class="chips"><button class="chip" type="button" data-act="pup" data-c="${id}" aria-label="${P.n} vor" ${i ? '' : 'disabled'}>▲</button><button class="chip" type="button" data-act="pdown" data-c="${id}" aria-label="${P.n} zurück" ${i < pr.length - 1 ? '' : 'disabled'}>▼</button></span></li>`;
  });
  h += row('', `${sf.free} ohne Arbeit`, sf.free ? 'Sie helfen, sobald es etwas zu tun gibt.' : 'Alle haben zu tun.', '', sf.short ? chip('out', `${sf.short} leer`) : chip('ok', 'reicht'));
  h += `</ul><p class="sub">Was oben steht, bekommt zuerst Leute. Wer baut, fehlt bei allem, was weiter unten steht, bis die Baustelle fertig ist. In jedem Gebäude lässt sich die Zahl der Arbeiter begrenzen.</p>`;
  // food: what is there, what comes in and goes out, and how long it lasts
  const food = ['nahrung', 'fisch', 'meeres'].filter(k => nd.list.some(n => n.k === k) || (I.stock[k] || 0) > 0);
  h += `<p class="sec">Essen</p><ul class="list needs">`;
  for (const k of food){
    const n = nd.list.find(x => x.k === k), stock = I.stock[k] || 0, make = makeRate(I, k), use = n ? n.use + n.work : workUse(I, k), net = make - use;
    const left = net < 0 ? stock / -net : Infinity, st = !n || net >= 0 ? chip('ok', 'reicht') : stock > 0 ? chip('low', left < 1 ? 'knapp' : `${Math.floor(left)} Min`) : chip('out', 'fehlt');
    h += row(k, GN[k], `Im Lager ${stock}. Pro Minute +${perMin(make)} und −${perMin(use)}. ${net >= 0 ? 'Es wird mehr.' : stock ? `Reicht noch ${left < 1 ? 'weniger als eine Minute' : Math.floor(left) + ' Minuten'}.` : 'Es ist nichts mehr da.'}`, bar(use ? make / use : 1), st, n && n.state !== 'ok' ? 'need' : '');
  }
  h += `</ul>`;
  // the other needs
  const other = nd.list.filter(n => !food.includes(n.k));
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
  if (nd.list.some(n => n.k === 'nahrung' && n.state === 'out')) h += `<p class="sub">Ohne Grundnahrung ziehen nach und nach Leute fort.</p>`;
  if (nd.next && nd.next.lvl < 3) h += `<p class="sub">Ab ${nd.next.from} Bewohnern brauchen die Familien auch ${GN[nd.next.k]}.</p>`;
  if (I.lvl < 3) h += `<p class="sub"><b>Häuptlingsdorf:</b> ab ${CHIEF.pop} Bewohnern, Ansehen ${CHIEF.mana} (jetzt ${Math.floor(mana)}) und Schönheit ${CHIEF.beauty} (jetzt ${beautyOf(I)}), wenn Töpfe, Matten und Meeresfrüchte reichen und Tapa, Schweine, Kava und Muschelschmuck im Lager sind. Dann wohnen ${CHIEF.cap} Menschen in jedem Haus, und sie brauchen diese Waren laufend.</p>`;
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
  const food = ['nahrung', 'fisch', 'meeres'].map(k => { const n = nd.list.find(x => x.k === k); if (!n) return null; const net = n.make - n.use - n.work; return {k, left:net >= 0 ? Infinity : (I.stock[k] || 0) / -net}; }).filter(Boolean).sort((a, b) => a.left - b.left)[0];
  const parts = [`<span>${ic('beile')}${busy}/${sf.total}${sf.build ? ` · Bau ${sf.build}` : ''}</span>`];
  if (food) parts.push(food.left === Infinity ? `<span>${ic('nahrung')}reicht</span>` : `<span class="warn">${ic(food.k)}${food.left < 1 ? 'knapp' : `${Math.floor(food.left)} Min`}</span>`);
  parts.push(nd.missing.length ? `<span class="warn">${ic('pop')}kein Zuzug</span>` : nd.full ? `<span>${ic('pop')}Häuser voll</span>` : `<span>${ic('pop')}+1 in ${(GROW_EVERY - tick % GROW_EVERY) * TICK / 1000} s</span>`);
  return parts.join('');
}
/* Storage sheet: every good on the island with what comes in and goes out per minute */
function storeMarkup(I){
  const nd = needsOf(I), rows = GOODS.map(k => {
    const make = makeRate(I, k), need = nd.list.find(n => n.k === k), use = (need ? need.use : 0) + workUse(I, k), have = I.stock[k] || 0;
    return {k, make, use, have};
  }).filter(g => g.have || g.make || g.use);
  let h = head(`Lager auf ${I.name}`, `Platz für ${storeCap(I)} von jeder Ware. Mehr Platz gibt jeder Speicher.`);
  h += `<ul class="list needs">${rows.map(g => `<li><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${g.k}"/></svg><span class="nm">${GN[g.k]}<small>${g.make ? `+${perMin(g.make)}` : '+0'} ${g.use ? `−${perMin(g.use)}` : ''} pro Minute</small></span><b class="qty">${g.have}</b></li>`).join('')}</ul>`;
  const idle = I.buildings.filter(b => b.idle && b.idle.why !== 'full');
  if (idle.length) h += `<p class="sub">Es stehen still: ${idle.map(b => `${KINDS[b.kind].n} (${b.idle.text.replace(/\.$/, '')})`).join(', ')}.</p>`;
  return h;
}
/* Standing sheet: what mana is for, and the feasts this island can hold */
function feastMarkup(I){
  return FEASTS.map(F => { const no = feastState(I, F); return `<div class="rowx"><span><b>${F.n}</b> <span class="sub">${costText(F.cost)}, Ansehen +${F.mana}</span>${no ? `<br><span class="sub">${no}</span>` : ''}</span><button class="btn${no ? '' : ' primary'}" type="button" data-act="feast" data-f="${F.id}" ${no ? 'disabled' : ''}>Feiern</button></div>`; }).join('');
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
  let h = head('Das Lapita-Netz ist geknüpft', `Nach ${yearOf() + 1} ${yearOf() ? 'Jahren' : 'Jahr'} auf See und an Land.`);
  h += `<p>Vom ersten Versammlungshaus auf Panua aus ist ein Netz aus Dörfern und Freundschaften entstanden, wie es die Lapita-Leute vor über dreitausend Jahren über den Pazifik gespannt haben.</p>`;
  h += `<ul class="list needs">${row('pop', 'Eigene Dörfer', mine.length)}${row('pop', 'Menschen', people)}${row('schnur', 'Befreundete Clans', friends.length)}${row('schnur', 'Knoten auf allen Schnüren', routes.reduce((t, r) => t + r.knots, 0))}${row('einbaum', 'Kanus', own().length)}${row('mana', 'Ansehen', Math.floor(mana))}${row('', 'Entdeckte Inseln', islands.filter(I => I.discovered).length)}</ul>`;
  h += `<p class="sub">Das Meer bleibt offen. Es gibt noch Nebel zu lichten, Dörfer zu Häuptlingsdörfern zu machen und Feste zu feiern.</p>`;
  return h + `<div class="rowx"><span></span><button class="btn primary" type="button" data-act="close">Weiterspielen</button></div>`;
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
    const K = KINDS[b.kind], I = islOfB(b.id), age = roofAge(b);
    h += head(K.n, `Auf ${I.name}. ${K.info}`);
    if (b.bt){
      const f = Math.round((1 - b.bt / K.bt) * 100), secs = Math.ceil(b.bt * TICK / 1000);
      const n = crewAt(I, b), left = n ? Math.ceil(b.bt * SITE_CREW / n * TICK / 1000) : 0;
      h += K.plant ? `<p><b>Wächst noch.</b> In etwa ${secs} Sekunden ist sie groß.</p>` : n ? `<p><b>Baustelle, ${f} Prozent.</b> ${n === 1 ? 'Eine Person baut' : n + ' Leute bauen'} daran, noch etwa ${left} Sekunden.</p>` : `<p><b>Baustelle, ${f} Prozent.</b> Gerade baut niemand daran. Gleichzeitig wird an ${builders(I)} ${builders(I) === 1 ? 'Stelle' : 'Stellen'} gebaut, je 10 Bewohner an einer mehr. Steht Bauen in der Übersicht weiter vorn, kommen eher Leute.</p>`;
      h += `<span class="mbar big"><i style="width:${f}%"></i></span>`;
    }
    if (K.boost && !b.bt) h += `<p class="sub">${tooled(I, K) ? `Mit ${GN[K.boost.k]} aus dem Lager geht die Arbeit schnell. ${K.boost.k === 'schnur' ? 'Ein Netz hält für' : 'Ein Beil hält für'} ${K.boost.per} ${GN[K.prod]}.` : `Ohne ${GN[K.boost.k]} geht es ${K.boost.slow === 2 ? 'nur halb so schnell' : 'langsamer'}. ${K.boost.k === 'schnur' ? 'Schnur kommt von den Seilereien der Atolle.' : 'Steinbeile macht die Beilwerkstatt.'}`}</p>`;
    if (b.boat > 0) h += `<p><b>Der Einbaum wird geschnitzt, ${Math.round((1 - b.boat / K.canoe) * 100)} Prozent.</b> ${crewAt(I, b) ? `Noch etwa ${Math.ceil(b.boat * TICK / 1000)} Sekunden.` : 'Gerade schnitzt niemand daran.'} ${b.kind === 'steg' ? 'Erst dann fährt der Einbaum zu den Pfahlhäusern.' : 'Erst dann fahren die Fischer hinaus.'}</p>`;
    if (K.crew && !b.bt && !(b.boat > 0)) h += `<div class="rowx"><span class="sub">Arbeiter: ${crewAt(I, b)} bei der Arbeit, höchstens ${capOf(b)} von ${K.crew}.${K.trees ? ` ${treesNear(I, b.x, b.y, K.trees.r).length} Bäume in Reichweite.` : ''}</span>${stepper('mc', 'mc', capOf(b), capOf(b) > 0, capOf(b) < K.crew, 'Arbeiter')}</div>`;
    if (K.plants && !b.bt) h += `<p>${b.idle ? `<b>Steht still.</b> ${b.idle.text}` : '<b>Arbeitet.</b>'} Setzt alle ${K.every * TICK / 1000} Sekunden einen jungen Baum. Ein Baum wächst in etwa ${Math.round(GROW_TICKS * TICK / 60000)} Minuten heran.</p>`;
    if (K.prod && !b.bt){
      const w = b.idle || workState(I, b), rate = PER_MIN / K.every / pace(I, K);
      h += `<p>${w ? `<b>Steht still.</b> ${w.text}` : '<b>Arbeitet.</b>'} Macht ${perMin(rate)} ${GN[K.prod]} pro Minute${K.use ? `, braucht ${Object.entries(K.use).map(([k, v]) => `${perMin(rate * v)} ${GN[k]}`).join(' und ')}` : ''}.</p>`;
    }
    if (K.roof) h += `<p class="sub">${age < .34 ? 'Frisches Dach' : age < .8 ? 'Das Dach wird grau' : 'Altes Dach, bald erneuern'}</p>`;
    if (K.beauty && !b.bt) h += `<p class="sub">Schmuck für das Dorf: +${K.beauty}. Schönheit auf ${I.name}: ${beautyOf(I)}.</p>`;
    if (b.kind === 'werft' && !b.bt) h += yardMarkup(I);
    if (b.kind === 'halle' && !b.bt){ if (feastsOpen()) h += `<p class="sub">Ansehen des Clans: ${Math.floor(mana)}.</p>` + feastMarkup(I); h += festivalMarkup(I); }
    if (sheetData.confirm) h += `<div class="rowx"><span>${Object.keys(costOf(b.kind, I)).length ? 'Wirklich entfernen? Die Hälfte kommt zurück.' : 'Wirklich entfernen?'}</span><span class="chips"><button class="btn" type="button" data-act="nokill">Behalten</button><button class="btn primary" type="button" data-act="kill">Entfernen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="move">Versetzen</button><button class="btn" type="button" data-act="askkill">Entfernen</button></span></div>`;
  } else if (sheetKind === 'intro'){
    const first = sheetData && sheetData.first;
    h += head(first ? 'Land in Sicht' : 'So geht es', first ? 'Euer Doppelkanu ist auf Panua gelandet. Noch steht nur das Versammlungshaus.' : '');
    h += `<ul class="help"><li>Über der Bauleiste steht immer die nächste Aufgabe. Tippe darauf, dann zeigt dir das Spiel, wo es weitergeht.</li><li>Tippe oben auf die Bewohnerzahl oder die Zeile darunter. Die Übersicht zeigt Bewohner, Zuzug, Arbeit, Essen und was fehlt. Dort legst du fest, welche Arbeit zuerst Leute bekommt.</li><li>Tippe auf die Warenleiste, dann siehst du das ganze Lager mit allem, was pro Minute dazukommt und weggeht.</li><li>Ziehen schiebt die Karte. Zwei Finger oder das Mausrad zoomen.</li><li>Zum Bauen unten etwas wählen, auf Land tippen, dann Bauen.</li><li>Alles braucht Holz und Zeit. Holz kommt vom Holzfäller, der die Bäume in seiner Nähe fällt. Gefällte Bäume wachsen nur langsam nach, ein Baumpflanzer hilft.</li><li>An jeder Baustelle arbeiten 2 Leute. Solange sie bauen, fehlen sie auf den Feldern und in den Werkstätten.</li><li>Zu jeder Mahlzeit gehört Grundnahrung wie Taro und Brotfrucht und etwas aus dem Meer: Fisch, später Meeresfrüchte vom Riff.</li><li>Pfahlhäuser und Steinreusen in der Lagune erreicht man nur mit dem Einbaum vom Kanusteg.</li><li>Ab und zu geschieht etwas. Dann ertönt ein Muschelhorn, und du entscheidest. Im Menü stehen die Chronik und die Schalter für Klang und für Tag und Nacht.</li><li>Tippe ein Kanu an, dann tippe auf das Meer oder eine Insel, und es fährt dorthin. Was im Nebel liegt, weiß niemand.</li><li>Tippe auf die Schnur zwischen zwei Inseln, dann kannst du Kanus in diese Handelskette setzen.</li><li>Oben rechts steht der Mond. Im ersten Mond, wenn die Plejaden aufgehen, wird das Fest der ersten Früchte gefeiert.</li></ul>`;
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
  if (sheetKind === 'needs' || sheetKind === 'store' || sheetKind === 'mana'){ const I = isl(active), nd = needsOf(I); const sf = staffOf(I); return [sheetKind, active, I.pop, I.lvl, Math.floor(mana), nd.cap, sf.free, sf.build, prioOf(I).join(), tick % GROW_EVERY, ...Object.values(sf.cats).map(c => c.used), ...GOODS.map(k => I.stock[k] || 0), ...I.buildings.map(b => b.idle ? b.idle.why : '')].join(); }
  if (sheetKind === 'clan'){ const T = isl(sheetData.id), r = routes.find(q => q.a === T.id || q.b === T.id); return [r && r.knots, T.debt >= 1].join(); }
  if (sheetKind === 'calendar') return [moonOf(), isl(active).rahui, Math.floor(untilFestival() / 30)].join();
  if (sheetKind === 'fleet') return own().map(s => [s.state, s.port, s.route, s.hungry].join(':')).join() + routes.map(r => r.knots).join();
  if (sheetKind === 'ship'){
    const s = ships.find(q => q.id === sheetData.id); if (!s) return 'gone';
    const P = s.port ? isl(s.port) : null;
    return [s.state, s.port, s.route, s.hungry, s.people, cargoLoad(s), Math.floor(mana), P && P.pop, ...(P ? GOODS.map(k => Math.min(P.stock[k] || 0, 30)) : [])].join();
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
  return ['a' + age, b.bt, b.boat, b.idle && b.idle.why, crewAt(I, b), capOf(b), KINDS[b.kind].trees ? treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).length : '', yard, staffOf(I).yard, hall].join();
}
$('sheetBody').addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'close'){ closeSheet(); return; }
  if (eventAct(act, btn)) return;
  if (fleetAct(act, btn)) return;
  if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b) return;
    if (act === 'move'){ startMove(b); return; }
    if (act === 'mc-' || act === 'mc+'){ const K = KINDS[b.kind], I = islOfB(b.id), n = clamp(capOf(b) + (act === 'mc+' ? 1 : -1), 0, K.crew); b.v = {...b.v, mc:n}; if (n === K.crew) delete b.v.mc; I.staff = null; syncWalkers(); updateHUD(); save(); renderSheet(); return; }
    if (act === 'askkill'){ sheetData.confirm = true; renderSheet(); return; }
    if (act === 'nokill'){ sheetData.confirm = false; renderSheet(); return; }
    if (act === 'kill'){ const I = islOfB(b.id), c = costOf(b.kind, I); for (const [k, v] of Object.entries(c)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + Math.floor(v / 2)); I.buildings = I.buildings.filter(x => x.id !== b.id); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} ist weg.`); return; }
    if (act === 'feast'){ holdFeast(islOfB(b.id), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  }
  if (sheetKind === 'quest' && act === 'showq'){ showQuest(); return; }
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
    if (act === 'reset'){ try { localStorage.removeItem(SAVE_KEY); } catch (err){} newGame(); closeSheet(); renderAll(); fitBox(isl('heimat').box, 1.4); save(); toast('Neues Spiel, neue Inseln.'); return; }
  }
});
const giftGuess = (C, worth) => { const g = returnGoods(C, worth); return g.load ? giftText(g.cargo) : 'eine kleine Gabe'; };
function select(b){ selectedId = b.id; invalidate(); setActive(islOfB(b.id).id); openSheet('info', {id:b.id}); }
