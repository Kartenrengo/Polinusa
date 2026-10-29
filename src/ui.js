'use strict';
/* Interface: top bar, build bar, placing, sheets and messages. Plain HTML over the map. */

/* ---------- top bar */
let lastStock = {};
function updateHUD(){
  const I = isl(active);
  $('isleName').textContent = I.name; $('isleType').textContent = (I.volcano ? 'Vulkan' : I.type === 'hoch' ? 'Hohe Insel' : 'Atoll') + ' · ' + LEVEL_NAMES[I.lvl || 1];
  $('manaBtn').hidden = mana <= 0 && !feastsOpen();
  $('manaNum').textContent = Math.floor(mana);
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
  $('storeBtn').setAttribute('aria-label', 'Lager: ' + shown.map(k => `${GN[k]} ${I.stock[k] || 0}`).join(', ') + '. Tippen zeigt alles.');
  for (const btn of $('buildList').children){ const k = btn.dataset.kind; btn.classList.toggle('poor', !canPay(I, costOf(k, I))); }
}
function renderBuildBar(){
  const I = isl(active);
  $('buildWhere').textContent = 'auf ' + I.name;
  const linked = routes.some(r => r.a === active || r.b === active);
  $('tradeBtn').hidden = !linked; $('tradeBtn').previousElementSibling.toggleAttribute('hidden', !linked);
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
  placing.ok = ok; placing.msg = msg;
  // workshops that need plants close by can stand anywhere, but the bar says whether they will run
  const K = KINDS[placing.kind], n = K.near ? nearCount(I, K.near.kind, placing.x, placing.y, K.near.r) : 0, few = K.near && n < K.near.n;
  const m = $('placeMsg'); m.textContent = !ok ? msg : few ? `Nur ${n} von ${K.near.n} ${NEAR_PL[K.near.kind]} in der Nähe, so steht sie still.` : K.near ? `Passt, ${n} ${NEAR_PL[K.near.kind]} in der Nähe.` : mode === 'move' ? 'Passt.' : 'Passt. Tippe auf Bauen.';
  m.classList.toggle('bad', !ok || few);
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
  const vc = visCenter(), wc = toWorld(vc.sx, vc.sy), near = lod === 'near' && onIsland(I, wc), base = near && !K.dep && !K.near ? wc : startSpot(I, K);
  if (!near) flyTo(base.x, base.y, Math.max(cam.z, 1.6));
  const p = findSpot(I, kind, base) || base; placing.x = p.x; placing.y = p.y; ghostRender();
  for (const b of $('buildList').children) b.setAttribute('aria-pressed', b.dataset.kind === kind ? 'true' : 'false');
}
function startSpot(I, K){
  const vc = villageCenter(I);
  const pick = list => list.reduce((m, q) => Math.hypot(q.x - vc.x, q.y - vc.y) < Math.hypot(m.x - vc.x, m.y - vc.y) ? q : m);
  if (K.dep){ const d = pick(depsOf(I, K.dep)); return {x:d.x + (vc.x - d.x) * .15, y:d.y + (vc.y - d.y) * .15 + 14}; }
  // next to the plant that has the most of its kind around it, nearest to the village if several are equal
  if (K.near){ const src = I.buildings.filter(b => b.kind === K.near.kind); if (src.length){
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
  $('placeInfo').textContent = mode === 'move' ? 'Ziehen oder woanders hintippen.' : (Object.keys(costOf(placing.kind, I)).length ? `Kostet ${costText(costOf(placing.kind, I))}. ${K.info}` : K.info);
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
  if (mode === 'move'){ const b = findB(placing.moveId); if (b){ b.x = fx(placing.x); b.y = fx(placing.y); } endPlace(); invalidate(); save(); toast(`${K.n} versetzt.`); return; }
  const c = costOf(placing.kind, I); if (!canPay(I, c)){ toast(`Zu wenig ${lacking(I, c)}.`); return; }
  pay(I, c); addB(I, placing.kind, placing, placing.v, tick); invalidate(); updateHUD(); syncWalkers(); save(); checkQuest();
  toast(`${K.n} ${K.plant ? 'gepflanzt' : 'gebaut'}.`, 1600);
  if (K.max || !canPay(I, c)){ endPlace(); return; }
  placing.v = variant(placing.kind); const p = findSpot(I, placing.kind, {x:placing.x + K.r * 2.2, y:placing.y}); if (p){ placing.x = p.x; placing.y = p.y; } ghostRender();
}

/* ---------- sheets */
function openSheet(kind, data){ sheetKind = kind; sheetData = data; $('sheet').hidden = false; renderSheet(); measure(); }
function closeSheet(){ if (!sheetKind) return; sheetKind = null; sheetData = null; $('sheet').hidden = true; selectedId = null; invalidate(); measure(); }
const perMin = v => v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
function growText(I, nd){
  if (nd.missing.length) return `Das Dorf wächst nicht, es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`;
  if (nd.full) return 'Alle Häuser sind voll.';
  return 'Das Dorf wächst.';
}
/* Needs sheet: room first, then every good the people use, with what the island makes per minute */
function needsMarkup(I){
  const nd = needsOf(I), chip = (cls, t) => `<span class="state ${cls}">${t}</span>`, bar = f => `<span class="mbar"><i style="width:${clamp(f, 0, 1) * 100}%"></i></span>`;
  let h = head(`Bedarf auf ${I.name}`, `${LEVEL_NAMES[I.lvl || 1]}, ${I.pop} Bewohner, Platz für ${nd.cap}. ${growText(I, nd)}`);
  h += `<ul class="list needs">`;
  h += `<li><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-pop"/></svg><span class="nm">Wohnraum<small>${I.pop} von ${nd.cap} Plätzen belegt</small>${bar(I.pop / Math.max(1, nd.cap))}</span>${nd.full ? chip('low', 'voll') : chip('ok', 'frei')}</li>`;
  for (const n of nd.list){
    const st = n.state === 'ok' ? chip('ok', 'reicht') : n.state === 'low' ? chip('low', n.mins < 1 ? 'knapp' : `noch ${Math.floor(n.mins)} Min`) : chip('out', 'fehlt');
    h += `<li class="${n.state === 'ok' ? '' : 'need'}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${n.k}"/></svg><span class="nm">${GN[n.k]}<small>Bedarf ${perMin(n.use)}${n.work ? ` und ${perMin(n.work)} für Werkstätten` : ''}, Ernte ${perMin(n.make)} pro Minute, im Lager ${n.stock}</small>${bar(n.use + n.work ? n.make / (n.use + n.work) : 1)}</span>${st}</li>`;
  }
  h += `</ul>`;
  const tips = nd.list.filter(n => n.state !== 'ok').map(n => n.N.hint[I.type]);
  if (nd.full) tips.push('Baue Häuser, dann ziehen mehr Menschen zu.');
  if (tips.length) h += `<p class="sub">${tips.join(' ')}</p>`;
  if (nd.list.some(n => n.k === 'nahrung' && n.state === 'out')) h += `<p class="sub">Ohne Essen ziehen nach und nach Leute fort.</p>`;
  if (nd.next && nd.next.lvl < 3) h += `<p class="sub">Ab ${nd.next.from} Bewohnern brauchen die Familien auch ${GN[nd.next.k]}.</p>`;
  if (I.lvl < 3) h += `<p class="sub"><b>Häuptlingsdorf:</b> ab ${CHIEF.pop} Bewohnern und Ansehen ${CHIEF.mana} (jetzt ${Math.floor(mana)}), wenn Töpfe und Matten reichen und Tapa, Schweine und Muschelschmuck im Lager sind. Dann wohnen ${CHIEF.cap} Menschen in jedem Haus, und sie brauchen diese Waren laufend.</p>`;
  return h;
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
  h += `<ul class="help"><li>Für jede weitere Siedlung mit dem Doppelkanu: Ansehen ${MANA_PER_COLONY} mehr. Jetzt nötig: ${manaNeeded()}.</li><li>Für ein Häuptlingsdorf: Ansehen ${CHIEF.mana}.</li></ul>`;
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
  h += `<div class="rowx"><span></span><button class="btn primary" type="button" data-act="gift" ${r ? '' : 'disabled'}>Gabe schicken</button></div>`;
  return h;
}
function head(title, sub){ return `<div class="sheet-head"><div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div><button class="x" type="button" data-act="close" aria-label="Schließen">×</button></div>`; }
function windOf(from, to){
  const A = isl(from).harbor, B = isl(to).harbor, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), c = dy / len;
  const f = c < -.35 ? 3 : c > .35 ? 1 : 2; return {f, len, label:f === 3 ? 'Gegen den Wind' : f === 1 ? 'Mit dem Wind' : 'Seitenwind', cls:f === 1 ? 'with' : ''};
}
function tripDays(r, from, to){ const w = windOf(from, to); const k = Math.max(.6, 1 - .04 * r.knots); return Math.max(1, Math.round(w.len / 372 * w.f * k)); }
function renderSheet(){
  const body = $('sheetBody'); let h = '';
  if (sheetKind === 'trade'){
    const t = sheetData, r = routes[t.r], F = isl(t.from), T = isl(t.to), w = windOf(t.from, t.to), days = tripDays(r, t.from, t.to);
    const load = Object.values(t.cargo).reduce((a, b) => a + b, 0);
    const mine = routes.map((x, i) => [x, i]).filter(([x]) => x.a === active || x.b === active);
    h += T.clan ? head(`Gabe an den ${T.clan.name}`, `Von ${F.name} nach ${T.name}`) : head(`Nach ${T.name}`, `Ladung von ${F.name}`);
    if (T.clan){ const worth = giftValue(T.clan, t.cargo) * returnRate(r.knots); h += `<p class="sub">Sie schätzen ${T.clan.wants.map(k => GN[k]).join(', ')} und antworten mit ${T.clan.makes.map(k => GN[k]).join(' und ')}. ${load ? `Diese Gabe bringt später etwa ${giftGuess(T.clan, worth)} zurück.` : ''}</p>`; }
    if (mine.length > 1) h += `<div class="chips" role="group" aria-label="Ziel">${mine.map(([x, i]) => { const o = x.a === active ? x.b : x.a; return `<button class="chip" type="button" data-act="route" data-r="${i}" aria-pressed="${i === t.r}">${isl(o).name}</button>`; }).join('')}</div>`;
    h += `<div class="rowx"><div class="windline"><span class="tag ${w.cls}">${w.label}</span><span>${days} ${days === 1 ? 'Tag' : 'Tage'} (${Math.round(days * DAY)} Sekunden)</span></div>${T.clan ? '' : '<button class="btn small" type="button" data-act="swap">Andersherum</button>'}</div>`;
    h += `<div class="knotsline"><svg viewBox="0 0 44 22" width="44" height="22" aria-hidden="true"><path d="M3 11H41" stroke="#2B1D14" stroke-width="4.4" stroke-linecap="round"/><path d="M3 11H41" stroke="#B08048" stroke-width="2.8" stroke-linecap="round"/><g fill="#7A4E2E" stroke="#2B1D14" stroke-width=".9"><ellipse cx="15" cy="11" rx="4.2" ry="5.2"/><ellipse cx="29" cy="11" rx="4.2" ry="5.2"/></g></svg><span>${r.knots} Knoten. Jede Fahrt knüpft einen dazu. Je mehr Knoten, desto kürzer die Fahrt.</span></div>`;
    h += `<ul class="list">${GOODS.filter(k => (F.stock[k] || 0) > 0 || t.cargo[k]).map(k => { const have = F.stock[k] || 0, n = t.cargo[k] || 0; return `<li><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span class="nm">${GN[k]}</span><span class="st">Lager ${have}</span><span class="step"><button type="button" data-act="minus" data-k="${k}" aria-label="${GN[k]} weniger" ${n ? '' : 'disabled'}>−</button><output aria-live="polite">${n}</output><button type="button" data-act="plus" data-k="${k}" aria-label="${GN[k]} mehr" ${n < have && load < LOAD ? '' : 'disabled'}>+</button></span></li>`; }).join('')}</ul>`;
    h += `<div class="rowx"><span class="sub">Ladung ${load} von ${LOAD}</span><button class="btn primary" type="button" data-act="send" ${load ? '' : 'disabled'}>Ablegen</button></div>`;
  } else if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b){ closeSheet(); return; }
    const K = KINDS[b.kind], I = islOfB(b.id), age = roofAge(b);
    h += head(K.n, `Auf ${I.name}. ${K.info}`);
    if (K.prod){
      const w = b.idle || workState(I, b), rate = PER_MIN / K.every;
      h += `<p>${w ? `<b>Steht still.</b> ${w.text}` : '<b>Arbeitet.</b>'} Macht ${perMin(rate)} ${GN[K.prod]} pro Minute${K.use ? `, braucht ${Object.entries(K.use).map(([k, v]) => `${perMin(rate * v)} ${GN[k]}`).join(' und ')}` : ''}.</p>`;
    }
    if (K.roof) h += `<p class="sub">${age < .34 ? 'Frisches Dach' : age < .8 ? 'Das Dach wird grau' : 'Altes Dach, bald erneuern'}</p>`;
    if (b.kind === 'werft') h += werftMarkup(I);
    if (b.kind === 'halle' && feastsOpen()) h += `<p class="sub">Ansehen des Clans: ${Math.floor(mana)}.</p>` + feastMarkup(I);
    if (sheetData.confirm) h += `<div class="rowx"><span>${Object.keys(costOf(b.kind, I)).length ? 'Wirklich entfernen? Die Hälfte kommt zurück.' : 'Wirklich entfernen?'}</span><span class="chips"><button class="btn" type="button" data-act="nokill">Behalten</button><button class="btn primary" type="button" data-act="kill">Entfernen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="move">Versetzen</button><button class="btn" type="button" data-act="askkill">Entfernen</button></span></div>`;
  } else if (sheetKind === 'intro'){
    const first = sheetData && sheetData.first;
    h += head(first ? 'Land in Sicht' : 'So geht es', first ? 'Euer Doppelkanu ist auf Panua gelandet. Noch steht nur das Versammlungshaus.' : '');
    h += `<ul class="help"><li>Über der Bauleiste steht immer die nächste Aufgabe. Tippe darauf, dann zeigt dir das Spiel, wo es weitergeht.</li><li>Tippe oben auf die Bewohnerzahl, dann siehst du, was die Menschen brauchen und was fehlt. Der Punkt daneben ist grün, solange das Dorf wächst.</li><li>Tippe auf die Warenleiste, dann siehst du das ganze Lager mit allem, was pro Minute dazukommt und weggeht.</li><li>Ziehen schiebt die Karte. Zwei Finger oder das Mausrad zoomen.</li><li>Zum Bauen unten etwas wählen, auf Land tippen, dann Bauen.</li><li>Tippe auf die Schnur zwischen zwei Inseln, um ein Kanu mit Waren zu schicken.</li></ul>`;
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
  } else if (sheetKind === 'menu'){
    h += head('Menü', `Dein Spiel bleibt in diesem Browser gespeichert. Welt Nr. ${seed}`);
    if (sheetData && sheetData.confirm) h += `<div class="rowx"><span>Alles von vorn, mit neuen Inseln?</span><span class="chips"><button class="btn" type="button" data-act="close">Nein</button><button class="btn primary" type="button" data-act="reset">Neu anfangen</button></span></div>`;
    else h += `<div class="rowx"><span class="chips"><button class="btn" type="button" data-act="help">So geht es</button><button class="btn" type="button" data-act="askreset">Neu anfangen</button></span></div>`;
  }
  body.innerHTML = h; lastSig = sheetSig();
}
let lastSig = '';
function sheetSig(){
  if (sheetKind === 'quest') return quest + ':' + (QUESTS[quest] ? QUESTS[quest].n() : '');
  if (sheetKind === 'needs' || sheetKind === 'store' || sheetKind === 'mana'){ const I = isl(active), nd = needsOf(I); return [sheetKind, active, I.pop, I.lvl, Math.floor(mana), nd.cap, ...GOODS.map(k => I.stock[k] || 0), ...I.buildings.map(b => b.idle ? b.idle.why : '')].join(); }
  if (sheetKind === 'clan'){ const T = isl(sheetData.id), r = routes.find(q => q.a === T.id || q.b === T.id); return [r && r.knots, T.debt >= 1].join(); }
  if (sheetKind !== 'info' || !sheetData) return '';
  const b = findB(sheetData.id); if (!b) return 'gone';
  const I = islOfB(b.id), age = Math.floor(roofAge(b) * 3);
  if (b.kind !== 'werft') return ['a' + age, b.idle && b.idle.why, b.kind === 'halle' && [Math.floor(mana), tick - (I.feastAt || 0) < FEAST_PAUSE, ...FEASTS.map(F => canPay(I, F.cost))].join()].join();
  return [I.canoe, I.stock.proviant, Math.floor(mana), I.pop >= SETTLE.people + SETTLE.keep, isl('tochter').settled, boats.length, ...GOODS.map(k => Math.min(I.stock[k] || 0, 6))].join();
}
const needList = (I, need) => `<ul class="list">${Object.entries(need).map(([k, v]) => { const have = k === 'pop' ? I.pop : I.stock[k] || 0, ok = have >= v; return `<li class="${ok ? 'okk' : 'need'}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span class="nm">${k === 'pop' ? 'Bewohner' : GN[k]}</span><span class="st">${Math.min(have, v)} von ${v}${ok ? ' ✓' : ''}</span></li>`; }).join('')}</ul>`;
function werftMarkup(I){
  const T = isl('tochter');
  if (I.id === 'heimat' && !T.settled){
    // first the outrigger to the atoll next door, the double canoe comes later
    if (boats.some(b => b.settle && b.to === T.id)) return `<p><b>Das Auslegerkanu ist auf dem Weg nach ${T.name}.</b></p>`;
    const need = {...SETTLE.cost, pop:SETTLE.people + SETTLE.keep}, ok = Object.entries(need).every(([k, v]) => (k === 'pop' ? I.pop : I.stock[k] || 0) >= v);
    return `<p>Ein Auslegerkanu bringt ${SETTLE.people} Menschen mit Holz, Essen und einem Topf hinüber nach ${T.name}. Mindestens ${SETTLE.keep} bleiben hier.</p>` + needList(I, need) +
      `<div class="rowx"><span class="sub">${ok ? 'Alles da.' : 'Es fehlt noch etwas.'}</span><button class="btn primary" type="button" data-act="settle" ${ok ? '' : 'disabled'}>Siedler schicken</button></div>`;
  }
  let h = `<p>Ein Doppelkanu braucht Holz und Steinbeile von hier. Matten für das Segel und Schnur kommen vom Atoll.</p>`;
  if (I.canoe){
    const left = islands.filter(J => !J.discovered).length;
    const need = manaNeeded(), pv = I.stock.proviant || 0;
    h += `<p class="sub">Proviant im Lager: ${pv}, das reicht für etwa ${Math.floor(pv / PROVIANT_PER_DAY)} Tage auf See.${need ? ` Für eine weitere Siedlung braucht es Ansehen ${need}, jetzt ${Math.floor(mana)}.` : ''}</p>`;
    h += left ? `<p><b>Das Doppelkanu liegt bereit.</b> Such dir eine Wolke im Nebel aus.</p><div class="rowx"><span></span><button class="btn primary" type="button" data-act="target" ${mana >= need ? '' : 'disabled'}>Ziel wählen</button></div>` : `<p><b>Das Doppelkanu liegt bereit.</b> Gerade ist kein neues Land in Sicht.</p>`;
    return h;
  }
  h += `<ul class="list">${Object.entries(CANOE).map(([k, v]) => { const have = I.stock[k] || 0, ok = have >= v; return `<li class="${ok ? 'okk' : 'need'}"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg><span class="nm">${GN[k]}</span><span class="st">${Math.min(have, v)} von ${v}${ok ? ' ✓' : ''}</span></li>`; }).join('')}</ul>`;
  h += `<div class="rowx"><span class="sub">${canPay(I, CANOE) ? 'Alles da.' : 'Es fehlt noch etwas. Schick es mit einem Kanu her.'}</span><button class="btn primary" type="button" data-act="canoe" ${canPay(I, CANOE) ? '' : 'disabled'}>Doppelkanu bauen</button></div>`;
  return h;
}
$('sheetBody').addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'close'){ closeSheet(); return; }
  if (sheetKind === 'trade'){
    const t = sheetData, F = isl(t.from), load = Object.values(t.cargo).reduce((a, b) => a + b, 0);
    if (act === 'plus'){ const k = btn.dataset.k; if ((t.cargo[k] || 0) < (F.stock[k] || 0) && load < LOAD) t.cargo[k] = (t.cargo[k] || 0) + 1; }
    if (act === 'minus'){ const k = btn.dataset.k; t.cargo[k] = Math.max(0, (t.cargo[k] || 0) - 1); }
    if (act === 'swap'){ [t.from, t.to] = [t.to, t.from]; t.cargo = {}; setActive(t.from); }
    if (act === 'route'){ const r = routes[+btn.dataset.r]; t.r = +btn.dataset.r; t.from = active; t.to = r.a === active ? r.b : r.a; t.cargo = {}; }
    if (act === 'send'){ sendBoat(t); return; }
    renderSheet(); return;
  }
  if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b) return;
    if (act === 'move'){ startMove(b); return; }
    if (act === 'askkill'){ sheetData.confirm = true; renderSheet(); return; }
    if (act === 'nokill'){ sheetData.confirm = false; renderSheet(); return; }
    if (act === 'kill'){ const I = islOfB(b.id), c = costOf(b.kind, I); for (const [k, v] of Object.entries(c)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + Math.floor(v / 2)); I.buildings = I.buildings.filter(x => x.id !== b.id); closeSheet(); invalidate(); updateHUD(); save(); toast(`${KINDS[b.kind].n} ist weg.`); return; }
    if (act === 'canoe'){ const I = islOfB(b.id); if (canPay(I, CANOE) && !I.canoe){ pay(I, CANOE); I.canoe = true; invalidate(); updateHUD(); save(); toast('Das Doppelkanu ist fertig.'); } renderSheet(); return; }
    if (act === 'target'){ startTarget(islOfB(b.id)); return; }
    if (act === 'settle'){ startSettlers(islOfB(b.id), isl('tochter')); return; }
    if (act === 'feast'){ holdFeast(islOfB(b.id), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  }
  if (sheetKind === 'quest' && act === 'showq'){ showQuest(); return; }
  if (sheetKind === 'mana' && act === 'feast'){ holdFeast(isl(active), FEASTS.find(F => F.id === btn.dataset.f)); return; }
  if (sheetKind === 'clan' && act === 'gift'){ const ri = routes.findIndex(r => r.a === sheetData.id || r.b === sheetData.id); if (ri >= 0) openTrade(ri); return; }
  if (sheetKind === 'menu'){
    if (act === 'help'){ openSheet('intro'); return; }
    if (act === 'askreset'){ sheetData = {confirm:true}; renderSheet(); return; }
    if (act === 'reset'){ try { localStorage.removeItem(SAVE_KEY); } catch (err){} newGame(); closeSheet(); renderAll(); fitBox(isl('heimat').box, 1.4); save(); toast('Neues Spiel, neue Inseln.'); return; }
  }
});
const giftGuess = (C, worth) => { const g = returnGoods(C, worth); return g.load ? giftText(g.cargo) : 'eine kleine Gabe'; };
function openTrade(ri, cargo = {}){
  const r = routes[ri], mine = id => isl(id).settled, from = (r.a === active || r.b === active) && mine(active) ? active : mine(r.a) ? r.a : r.b, to = from === r.a ? r.b : r.a;
  setActive(from); selectedId = null; invalidate(); openSheet('trade', {r:ri, from, to, cargo});
}
function select(b){ selectedId = b.id; invalidate(); setActive(islOfB(b.id).id); openSheet('info', {id:b.id}); }
