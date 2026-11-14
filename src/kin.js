'use strict';
/* ---------- kin and newcomers. The Lapita colonists were small groups, often one canoe's people. What kept them alive was
   the net they stayed bound to: canoes went back and forth between the villages and the old islands in the west, with
   obsidian, pots and people, a lifeline as the archaeologist Patrick Kirch called it. Islands within sailing reach married
   into each other for generations, and newcomers from elsewhere were taken in. So here every person belongs to a line
   (p.ln), the line of the mother. A family that comes by canoe from far away brings a new line, so does someone who
   marries in from a clan. Children are born more seldom where all are close kin, and some are weak. */
let nextLine = 1, LINES = {};   // LINES: the name a line is known by and where it came from
const newLine = (n, from) => { const id = nextLine++; if (n) LINES[id] = {n, from}; return id; };
const lineName = id => typeof id === 'string' && id[0] === 'c' ? (isl(id.slice(1)) && isl(id.slice(1)).clan ? isl(id.slice(1)).clan.name : 'ein Clan') : LINES[id] ? LINES[id].n : 'die Ahnen';
const lineFrom = id => typeof id === 'string' && id[0] === 'c' ? (isl(id.slice(1)) ? isl(id.slice(1)).name : '') : LINES[id] ? LINES[id].from || '' : '';
/* the lines on an island, the biggest first */
function linesOf(I){
  const m = new Map(); for (const p of I.people || []){ const k = p.ln || 0; m.set(k, (m.get(k) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]);
}
/* how many lines there are in effect: four lines of the same size count 4, one big line and two tiny ones a little over 1 */
function kinDiv(I){ const P = I.people || []; if (!P.length) return 0; let s = 0; for (const [, n] of linesOf(I)) s += (n / P.length) ** 2; return 1 / s; }
const KIN_OK = 3, KIN_LOW = 2;
const kinState = I => { const d = kinDiv(I); return d >= KIN_OK - .05 ? 'ok' : d >= KIN_LOW - .05 ? 'low' : 'out'; };
const kinFactor = I => ({ok:1, low:.6, out:.25})[kinState(I)];
const kinWord = I => ({ok:'gesund', low:'eng verwandt', out:'zu nah verwandt'})[kinState(I)];
const linesWith = (I, n = 2) => linesOf(I).filter(([, c]) => c >= n).length;
/* a child of close kin is born weak: it lives, but not long */
function weakBirth(I, p){
  if (kinState(I) !== 'out' || Math.random() > .3) return;
  p.wk = 1; p.l = Math.round((22 + Math.random() * 12) * YEAR); stats.schwach = (stats.schwach || 0) + 1;
  if (!awayQuiet && I.id === active) note(`Das Kind ${p.n} ist schwach. Auf ${I.name} sind alle zu nah verwandt: Es braucht Familien aus anderen Linien.`);
}

/* ---------- newcomers by canoe. When a hut stands empty, the word goes along the cords: after a while a canoe comes from
   far away with a family that asks to stay. They bring food for the first days, sometimes cord or a pot, and now and
   then plants the village does not have yet. You take them in or send them on; whoever is not answered stays, as the
   custom of hospitality wants it. */
const ORIGINS = ['aus Mussau', 'von Emirau', 'aus Eloaua', 'von Watom', 'von den Inseln im Westen', 'von der Küste am Feuerberg', 'von einem Riff im Süden', 'aus dem Dorf eurer Ahnen'];
const IMMIG_GAP = 40, IMMIG_WAIT = 75;   // ticks at least between two canoes for one island; ticks a family waits for an answer
const emptyHome = I => homesOf(I).find(b => !famOfHome(I, b) && b.kind !== 'fale') || null;
function wantsSettlers(I){
  if (!I.settled || !I.people || I.pop >= islandMax(I) || roofless(I) || !emptyHome(I)) return false;
  const nd = needsOf(I); return !nd.missing.some(n => n.k === 'essen' || n.k === 'wasser') && !(I.meal && (I.meal.hungry || I.meal.thirsty)) && surplus(I, nd.list);   // a new family only where there is enough for them, also at the morning meal
}
const immigFor = I => ships.find(s => s.immig && s.to === I.id) || null;
function newImmig(I){
  const from = ORIGINS[Math.floor(Math.random() * ORIGINS.length)], fam = nextFam++;
  const w = person(I, 18 + Math.random() * 12, null, 'f'), P = [w];
  if (Math.random() < .9) P.push(person(I, 20 + Math.random() * 12, null, 'm'));
  const kids = Math.random() < .3 ? 0 : Math.random() < .6 ? 1 : 2;
  for (let i = 0; i < kids && P.length < 4; i++) P.push(person(I, Math.random() < .5 ? 1 + Math.random() * 4 : 7 + Math.random() * 6));
  const ln = newLine(w.n, from); for (const p of P){ p.h = fam; p.ln = ln; }
  const gift = {nahrung:1 + Math.floor(Math.random() * 2)}; if (Math.random() < .3) gift.schnur = 2; if (I.type === 'atoll' && Math.random() < .3) gift.toepfe = 1;
  const miss = LIFE_BASE.filter(id => lifeFits(I, id) && !lifeOf(I).includes(id)), life = miss.length && Math.random() < .5 ? [miss[Math.floor(Math.random() * miss.length)]] : [];
  return {from, people:P, gift, life, n:w.n};
}
/* where they come from: the far edge of the known sea, to the west, where the old islands lie */
function immigStart(I){
  const h = fogHoles.find(q => ((I.center.x - q.cx) / q.rx) ** 2 + ((I.center.y - q.cy) / q.ry) ** 2 < 1.2) || fogHoles[0];
  for (let k = 0; k < 24; k++){
    const a = Math.PI + (Math.random() - .5) * (1 + k * .15), p = {x:h.cx + Math.cos(a) * h.rx * .86, y:h.cy + Math.sin(a) * h.ry * .86};
    if (revealed(p) && !islands.some(J => J.box && p.x > J.box.x0 - 24 && p.x < J.box.x1 + 24 && p.y > J.box.y0 - 24 && p.y < J.box.y1 + 24) && !overLand(p, p, 8)) return p;
  }
  return {x:I.harbor.x - 260, y:I.harbor.y};
}
function immigTick(I){
  const s = immigFor(I);
  // a family that is not answered stays, by custom
  if (s){ if (s.state === 'moored' && s.askAt && tick - s.askAt > IMMIG_WAIT) immigAnswer(s, true, true); return; }
  if (tick < (I.immigAt || 0) || !wantsSettlers(I)) return;
  I.immigAt = tick + Math.round(IMMIG_GAP * giftF('conus'));
  const F = newImmig(I);
  if (awayQuiet){ immigLand(I, F); return; }   // while you were away they came and stayed
  const from = immigStart(I), sh = {id:nextShip++, kind:'oc', own:false, immig:F, to:I.id, cargo:{}, life:[], people:F.people.length, folk:F.people, path:[], pi:0, state:'moored', x:from.x, y:from.y, hx:1, hy:0, dist:0, home:from};
  ships.push(sh);
  if (!sailTo(sh, {isl:I.id}, true)){ ships.splice(ships.indexOf(sh), 1); immigLand(I, F); return; }
  if (I.id === active) note(`Ein Kanu ${F.from} hält auf ${I.name} zu. Eine Familie sucht ein Zuhause.`);
}
function immigArrive(s){
  const I = isl(s.to); if (!I){ ships.splice(ships.indexOf(s), 1); return; }
  s.state = 'moored'; s.port = I.id; const m = moorSpot(I, s); s.x = m.x; s.y = m.y; s.askAt = tick;
  if (!wantsSettlers(I)){ immigLeave(s); if (I.id === active && !awayQuiet) note(`Die Familie ${s.immig ? s.immig.from : ''} fand keinen Platz mehr auf ${I.name} und fährt weiter.`); return; }
  const F = s.immig, msg = `Ein Kanu ${F.from} legt an: Familie ${F.n}, ${F.people.length} Menschen, fragt, ob sie auf ${I.name} bleiben darf.`;
  note(msg); requestDraw();
  if (!awayQuiet){ sfx('shells'); if (!sheetKind && I.id === active) openSheet('immig', {ship:s.id}); else toast(msg + ' Tippe das Kanu an.', 5200); }
}
function immigAnswer(s, yes, custom = false){
  const I = isl(s.to), F = s.immig; if (!I || !F) return;
  if (yes) immigLand(I, F, custom); else { I.immigAt = tick + IMMIG_GAP * 2; if (!awayQuiet) toast(`Familie ${F.n} fährt weiter. Ein anderes Mal kommt wieder jemand.`, 3200, false); }
  immigLeave(s);
  if (sheetKind === 'immig') closeSheet();
}
function immigLand(I, F, custom = false){
  syncPeople(I); I.people.push(...F.people); I.pop += F.people.length;
  for (const [k, v] of Object.entries(F.gift)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + v);
  const fresh = F.life.length ? landLife(I, {life:F.life.slice()}, true) : [];
  stats.zuzug = (stats.zuzug || 0) + 1; if (lifeLog) lifeLog.came += F.people.length;
  syncPeople(I); I.staff = null; I.immigAt = tick + IMMIG_GAP; syncWalkers(); invalidate();
  const f = famsOf(I).find(q => F.people.some(p => p.h === q.id)), home = f && f.home && findB(f.home);
  if (!awayQuiet){ for (let i = 0; i < 4; i++) heartAt(I, home || undefined);
    if (I.id === active) toast(`Familie ${F.n} ${custom ? 'bleibt' : 'zieht ein'}, mit ${giftText(F.gift)}${fresh.length ? ` und ${andList(fresh.map(id => LIFE[id].s))}` : ''}. Neue Linie.`, 3600);
    save(); checkQuest(); }
}
function immigLeave(s){
  s.immig = null; s.folk = []; s.people = 0; s.leaving = true; s.askAt = 0;
  if (!s.home || !sailTo(s, {x:s.home.x, y:s.home.y}, true)){ const i = ships.indexOf(s); if (i >= 0) ships.splice(i, 1); }
  requestDraw();
}
/* the sheet of a canoe that asks */
function immigMarkup(s){
  const F = s && s.immig, I = s && isl(s.to); if (!F || !I) return head('Fremdes Kanu', '') + '<p class="sub">Das Kanu ist weitergefahren.</p>';
  const nd = needsOf(I), fn = nd.list.find(n => n.k === 'essen'), left = Math.max(0, IMMIG_WAIT - (tick - (s.askAt || tick)));
  let h = head(`Familie ${F.n}`, `Ein Kanu ${F.from}`);
  h += `<p>${F.people.length} Menschen fragen, ob sie auf ${I.name} bleiben dürfen. Eine Hütte steht leer.</p>`;
  h += `<div class="folk">${F.people.map(p => `<span class="who chip">${p.s === 'm' ? '♂' : '♀'} ${p.n}<small>${Math.floor(ageOf(p))}${stageOf(p) === 'kid' ? ', Kind' : ''}</small></span>`).join('')}</div>`;
  h += `<p class="sub">Sie bringen ${giftText(F.gift)}${F.life.length ? ` und ${andList(F.life.map(id => LIFE[id].s))}` : ''}. Jeder Erwachsene ist eine Arbeitskraft, und sie sind von einer anderen Linie: Ihre Kinder machen das Dorf gesünder.${fn && fn.make < fn.use + fn.work ? ' Bedenke: Schon jetzt wird mehr gegessen, als ihr erntet.' : ''}</p>`;
  h += `<p class="sub">Antwortet ihr nicht, bleiben sie nach dem Brauch der Gastfreundschaft, in etwa ${Math.ceil(left * TICK / 1000)} Sekunden.</p>`;
  return h + `<div class="rowx"><span></span><span class="chips"><button class="btn" type="button" data-act="immig" data-v="no">Weiterschicken</button><button class="btn primary" type="button" data-act="immig" data-v="yes">Aufnehmen</button></span></div>`;
}
/* the lines of an island in a few words, for the overview */
function kinText(I){
  const L = linesOf(I), d = kinDiv(I), st = kinState(I);
  const names = L.slice(0, 4).map(([id, n]) => { const f = lineFrom(id); return `${lineName(id)}${f ? ` ${/^(aus|von|vom) /.test(f) ? f : 'aus ' + f}` : ''} (${n})`; }).join(', ');
  const kids = homesOf(I).some(b => tierOf(b) >= 2);
  return {d, st, line:`${L.length} ${L.length === 1 ? 'Linie' : 'Linien'}: ${names}${L.length > 4 ? ' …' : ''}`,
    soft:!kids && st !== 'ok', help:st === 'ok' ? 'Genug Linien: Die Kinder kommen gesund zur Welt.' : !kids ? 'Für gesunde Kinder braucht es später Familien aus anderen Linien. Leere Hütten ziehen sie an.' : st === 'low' ? 'Eng verwandt: Kinder kommen seltener. Familien von weit her (eine leere Hütte zieht sie an) oder eine Hochzeit mit einem Clan bringen neues Blut.' : 'Zu nah verwandt: Kaum Kinder, und manche sind schwach. Baut Hütten für Familien von weit her, holt Leute von euren anderen Inseln oder verheiratet jemanden mit einem Clan.'};
}

/* ---------- the stories of people. A few things in a life are written down: p.ev is a list of [tick, what, detail], newest
   last, at most twelve; the first one (birth, arrival) is always kept. They show on the person's sheet, so you know the
   people again and care about them. */
const STORY_MAX = 12, STORY_ONCE = new Set(['geb', 'kam', 'arb', 'tat', 'alt', 'haupt']);
function lifeEvent(p, what, detail = ''){
  if (!p) return;
  const ev = p.ev || (p.ev = []);
  if (STORY_ONCE.has(what) && ev.some(e => e[1] === what)) return;
  if (what === 'sturm' && ev.filter(e => e[1] === 'sturm').length >= 2) ev.splice(ev.findIndex(e => e[1] === 'sturm'), 1);   // the two latest storms
  ev.push([tick, what, detail]); if (ev.length > STORY_MAX) ev.splice(1, ev.length - STORY_MAX);
}
const STORY_TEXT = {
  geb:() => 'wird geboren', kam:d => `kommt mit dem Kanu ${d}`, kind:d => `bekommt ein Kind: ${d}`, arb:d => `fängt bei ${d} an zu arbeiten`, tat:() => 'bekommt das Tatau',
  hoch:d => `heiratet ${d}`, nav:d => `wird Navigator: ${d}`, sturm:d => d || 'übersteht einen Sturm', haupt:() => 'wird Häuptling', gru:d => `gründet das Dorf ${d} und wird ein Ahn des Dorfes`, wal:() => 'sieht in der Nacht den Lichtwal', wunsch:d => `freut sich: Die Familie bekam ${d}`, alt:() => 'wird alt und sitzt jetzt vor dem Haus'
};
const storyOf = p => (p.ev || []).filter(e => STORY_TEXT[e[1]]).map(e => ({year:yearOf(e[0]) + 1, text:STORY_TEXT[e[1]](e[2])}));
/* once in a while: who has started to work, who has grown old */
function storyTick(I){
  for (const p of I.people || []){
    if (isAdult(p) && p.job && !(p.ev || []).some(e => e[1] === 'arb')){ const b = findB(p.job); if (b) lifeEvent(p, 'arb', placeName(b)); }
    if (stageOf(p) === 'old' && (p.ev || []).length && !p.ev.some(e => e[1] === 'alt')) lifeEvent(p, 'alt');
  }
}
/* ---------- the elders of a daughter village never act alone. When it is in need (I.rat, on by default for every village
   but the first; the overview turns it off or on) they ask you, once a minute at most: water or food will not last until
   the morning, people sleep without a roof, a storm comes. The request (I.ask = {k, why, at}) stands as a small bubble over
   the village and as a line at the top of the overview, with "Ja" (they do what they would have done, from the store of that
   village) and "Nein" (not asked again for a day). It goes when its cause is gone. Everything else the player builds.
   And at every dawn a daughter sends a small canoe to the mother village with what it has to spare (packTick). */
const ELDERS = {every:30}, PACK = {max:8, from:.6, keep:.45, mother:.85};
const SPEC_GOODS = new Set(Object.keys(SPEC_OF_KIND).map(q => KINDS[q].prod).filter(Boolean));   // what only special ground makes
const eldersOn = I => !!I && I.settled && !I.clan && (I.rat ?? I.id !== 'heimat');
/* dry: only asks whether it could be built now (nothing paid, nothing placed) */
function eldersBuild(I, kind, dry = false){
  const K = KINDS[kind]; if (!K || !unlocked(kind) || K.fixed || !K.on.includes(I.type)) return false;
  if (K.craft){ const h = homesOf(I).find(q => famOfHome(I, q) && !craftOf(I, q) && !craftWhy(I, q, kind)); if (!h) return false; if (!dry) setCraft(I, h, kind); return true; }
  if (I.buildings.some(b => b.bt && !KINDS[b.kind].plant)) return false;   // one site at a time, like a careful player
  if (K.max && I.buildings.filter(b => b.kind === kind).length >= K.max) return false;
  if (!hasLife(I, kind) || (K.spring && !I.river) || (SPEC_OF_KIND[kind] && specOf(I) !== SPEC_OF_KIND[kind]) || (K.dep && !depsOf(I, K.dep).length)) return false;
  // one of the kind already stands still: a second would too
  if (!HOME_KINDS.has(kind) && I.buildings.some(b => b.kind === kind && (b.bt || (b.idle && b.idle.why !== 'full')))) return false;
  // a workplace nobody is free for would only stand empty
  if (K.crew && !HOME_KINDS.has(kind) && !staffOf(I).free && placesOf(I).some(b => b.idle && b.idle.why === 'crew')) return false;
  const c = costOf(kind, I); if (!canPay(I, c)) return false;
  const p = findSpot(I, kind, startSpot(I, K)); if (!p) return false;
  if (dry) return true;
  pay(I, c); const b = addB(I, kind, p, variant(kind), tick); if (K.bt) b.bt = K.bt; clearStumps(I, b); I.staff = null;
  (I.ratLog = I.ratLog || []).unshift({t:tick, k:kind}); I.ratLog.length = Math.min(I.ratLog.length, 4);
  if (!awayQuiet){ invalidate(); syncWalkers(); if (I.id === active) note(`${I.name}: ${K.n} wird gebaut.`); }
  return true;
}
/* what the elders would do now, and why (the first thing that is wanting and could be done), or null */
function askCause(I){
  const A = adviceOf(I) || {}, F = mealFore(I), has = k => I.buildings.some(b => b.kind === k);
  const dry = (k, why) => eldersBuild(I, k, true) ? {k, why} : null;
  if (A.tie) return {k:'tie', why:'Ein Sturm kommt, die Dächer sind lose'};
  if (A.rain && !rainState(I)) return {k:'rain', why:'Wasser reicht nicht bis morgen'};
  // no water or food for the next morning: the harvest house, a second one for green nuts, a place for food
  if (!has('ernte') && (F.water < F.n + 2 || F.food < F.n + 2)) return dry('ernte', F.water < F.n + 2 ? 'Wasser reicht nicht bis morgen' : 'Essen reicht nicht bis morgen');
  if (F.water < F.n && !I.river && I.buildings.filter(b => b.kind === 'ernte').length < 2){ const c = dry('ernte', 'Wasser reicht nicht bis morgen'); if (c) return c; }
  if (F.food < F.n && !has(foodBuild(I))){ const c = dry(foodBuild(I), 'Essen reicht nicht bis morgen'); if (c) return c; }
  // people sleeping without a roof: one hut
  if (roofless(I) && !I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind))) return dry('haus', `${roofless(I)} ${roofless(I) === 1 ? 'Mensch schläft' : 'Menschen schlafen'} ohne Dach`);
  return null;
}
const ASK_NO = 180;   // ticks (one day) a "no" holds
const askShown = I => I && I.ask && !(I.ask.no > tick) ? I.ask : null;
const askName = k => k === 'tie' ? 'Dächer festbinden' : k === 'rain' ? 'Regentanz' : KINDS[k].craft ? `Hauswerk: ${KINDS[k].craft}` : `${KINDS[k].n} bauen`;
const askYesText = k => k === 'tie' ? 'Ja, festbinden' : k === 'rain' ? 'Ja, tanzen' : 'Ja, bauen';
function eldersTick(I, force = false){
  if (!I || !I.settled) return;
  if (!eldersOn(I)){ if (I.ask) I.ask = null; return; }
  if (I.ask && I.ask.k === 'tie' && !(I.storm && tick < I.storm.at && !I.storm.tie)) I.ask = null;   // the storm is over, or the roofs are tied
  if (!force && tick % ELDERS.every !== 7) return;
  if (!I.ratSaid && !awayQuiet){ I.ratSaid = true; hush(`Der Rat von ${I.name} fragt dich in der Not: Wasser, Essen, Dächer. Alles andere baust du.`); }
  const c = askCause(I), a = I.ask;
  if (!c){ I.ask = null; return; }
  if (a && a.k === c.k){ a.why = c.why; if (a.no && a.no <= tick) delete a.no; return; }   // the same request stands; a "no" that has run out asks again
  I.ask = {k:c.k, why:c.why, at:tick};
  hush(`Bitte aus ${I.name}: ${askName(c.k)}. ${c.why}.`);
}
/* the answer: "Ja" does what the elders would have done; "Nein" holds the request back for a day */
function askYes(I){
  const a = askShown(I); if (!a) return false;
  const c = askCause(I);
  if (!c || c.k !== a.k){ I.ask = null; toast('Das ist nicht mehr nötig.', 2400, false); return false; }
  const ok = a.k === 'tie' ? (tieRoofs(I), true) : a.k === 'rain' ? rainDance(I) : eldersBuild(I, a.k);
  if (!ok){ toast('Das geht gerade nicht.', 2400, false); return false; }
  I.ask = null; I.staff = null; I._fore = null; return true;
}
function askNo(I){ if (I && I.ask) I.ask.no = tick + ASK_NO; }
/* what a daughter can spare: goods it has plenty of, the ones the mother lacks first; never food or water it will need
   itself tomorrow morning, never fuel for its own night fires */
function packOf(I, M){
  const cap = storeCap(I), mcap = storeCap(M), F = mealFore(I), keepFood = F.food < F.n + 2 * MEAL_SPARE;
  const out = [], room = k => Math.floor(mcap * PACK.mother) - (M.stock[k] || 0);
  for (const k of GOODS){
    if (k === 'wasser' || TREASURE_GOODS.includes(k) || (keepFood && FOODS.includes(k)) || (GROUPS.brenn.includes(k) && fireShort(I))) continue;
    const have = I.stock[k] || 0; if (have < cap * PACK.from) continue;
    const n = Math.min(have - Math.ceil(cap * PACK.keep), room(k)); if (n < 1) continue;
    const lack = (M.stock[k] || 0) < mcap * .3 ? 2 : 0, fine = SPEC_GOODS.has(k) ? 1 : 0;
    out.push({k, n, w:lack + fine + n / cap});
  }
  out.sort((a, b) => b.w - a.w); const goods = {}; let left = PACK.max;
  for (const o of out){ if (left <= 0) break; const n = Math.min(o.n, left); goods[o.k] = n; left -= n; }
  return goods;
}
const packText = g => andList(Object.entries(g).map(([k, n]) => `${n} ${n === 1 ? G1[k] : GN[k]}`));
function packGive(I, M, g, help = false){
  const mcap = storeCap(M), got = {};
  for (const [k, n0] of Object.entries(g)){ const n = Math.min(n0, I.stock[k] || 0, mcap - (M.stock[k] || 0)); if (n < 1) continue; I.stock[k] -= n; M.stock[k] = (M.stock[k] || 0) + n; got[k] = n; }
  if (!Object.keys(got).length) return null;
  if (help){ M.helpLast = {t:tick, g:got}; M.helps = (M.helps || 0) + 1; }   // M: the young village that is helped
  else { M.packs = (M.packs || 0) + 1; I.packLast = {t:tick, g:got}; stats.packs = (stats.packs || 0) + 1;
    if (Object.keys(got).some(k => !canMakeOn(M, k))) M.fernAt = tick;   // fine things from afar: the mother is glad (satOf)
    mana += NET.mana; }   // every canoe between the villages of the clan adds a little standing
  I.staff = null; M.staff = null; I._fore = M._fore = null; I._ffore = M._ffore = null;
  return got;
}
function sendPack(I, M, g, help = false){
  if (!Object.keys(g).length) return;
  if (awayQuiet){ packGive(I, M, g, help); return; }
  const from = I.harbor || I.center, sh = {id:nextShip++, kind:'oc', own:false, pack:{from:I.id, g, help}, to:M.id, cargo:{...g}, life:[], people:2, folk:[], path:[], pi:0, state:'moored', x:from.x, y:from.y, hx:1, hy:0, dist:0, home:{x:from.x, y:from.y}};
  ships.push(sh); if (!sailTo(sh, {isl:M.id}, true)){ ships.splice(ships.indexOf(sh), 1); packGive(I, M, g, help); }
}
/* at dawn: a daughter sends what it has to spare to the mother; the mother helps a young daughter (under HELP.pop people)
   with what it lacks to build and to get through the next morning */
const HELP = {pop:15, max:16}, NET = {mana:.5};
function helpOf(M, D){
  const cap = storeCap(D), mcap = storeCap(M), F = mealFore(D), FM = mealFore(M), g = {}; let left = HELP.max;
  const give = (k, want) => { const spare = Math.floor((M.stock[k] || 0) - mcap * .4), n = Math.min(want, spare, cap - (D.stock[k] || 0), left); if (n > 0){ g[k] = n; left -= n; } };
  if (F.water < F.n + 2 && FM.water >= FM.n + MEAL_SPARE) give('wasser', F.n + 2 - F.water);
  if (F.food < F.n + 2 && FM.food >= FM.n + MEAL_SPARE) for (const k of FOODS){ if (F.food + Object.values(g).reduce((t, v) => t + v, 0) >= F.n + 2) break; give(k, F.n + 2 - F.food); }
  if ((D.stock.holz || 0) < 4) give('holz', 6 - (D.stock.holz || 0));
  if ((D.stock.dach || 0) < 4) give('dach', 6 - (D.stock.dach || 0));
  return g;
}
function packTick(I){
  if (!eldersOn(I) || I.id === 'heimat') return; const M = isl('heimat'); if (!M || !M.settled || M === I) return;
  if (I.pop < HELP.pop) sendPack(M, I, helpOf(M, I), true);
  sendPack(I, M, packOf(I, M));
}
/* the canoe lands at the mother village: what is still there at home goes into the store (taken only now, so a game
   saved on the way loses nothing), then it paddles back */
function packArrive(s){
  const P = s.pack, I = isl(P.from), M = isl(s.to); s.pack = null; s.cargo = {};
  const got = I && M ? packGive(I, M, P.g, P.help) : null;
  if (got && !awayQuiet){ const msg = P.help ? `${I.name} hilft dem jungen Dorf ${M.name}: ${packText(got)}.` : `Ein Kanu aus ${I.name} bringt ${packText(got)}.`; note(msg); if (M.id === active){ sfx('shells'); updateHUD(); } }   // into the conch only: a canoe every morning would be too much
  s.leaving = true; if (!s.home || !sailTo(s, {x:s.home.x, y:s.home.y}, true)){ const i = ships.indexOf(s); if (i >= 0) ships.splice(i, 1); }
  requestDraw();
}
/* ---------- the gifts of the islands. Every island but the first has one: its special ground (SPECS), obsidian on a
   volcano, or else a bird rock or a turtle beach. A gift counts for the whole clan only while a village of its own
   lives there; by trade comes the good, not the gift. Old games keep their islands: only islands that had nothing
   before get a bird rock or a turtle beach. */
const GIFTS = {
  obsidian:{n:'Obsidian', ic:'klingen', does:'Kanubau und Schnitzen gehen ein Viertel schneller.', f:1.25},
  feinpandanus:{n:'Feiner Pandanus', ic:'matten', does:'Segelmatten aus feinem Pandanus: alle eigenen Kanus fahren ein Fünftel schneller.', f:1.2},
  conus:{n:'Kegelschnecken', ic:'schmuck', does:'Armringe als Brautgabe: Familien von weit her kommen öfter.', f:.75},
  kurkuma:{n:'Rote Erde', ic:'kurkuma', does:'Rote Farbe für Feste: Feste bringen ein Viertel mehr Ansehen.', f:1.25},
  kava:{n:'Feuchte Hänge', ic:'kava', does:'Taro wächst hier anderthalbmal so gut.', f:1.5},
  voegel:{n:'Vogelfelsen', ic:'eier', does:'Navigatoren lernen anderthalbmal so schnell: Sie lesen die Vögel.', f:1.5},
  schildkroete:{n:'Schildkrötenstrand', ic:'wild', does:'Auf langer Fahrt reicht der Proviant länger.', f:.75}
};
function giftOf(I){
  if (!I || I.clan || I.id === 'heimat' || I.treasure || I.culture) return null;
  const s = specOf(I); if (s) return s;
  if (depsOf(I, 'obsidian').length) return 'obsidian';
  return Math.abs(Math.round(I.center.x * 11 + I.center.y * 5)) % 2 ? 'voegel' : 'schildkroete';
}
let giftMemo = {t:-1, set:new Set()};
function giftsHeld(){
  if (giftMemo.t === tick) return giftMemo.set;
  const set = new Set(); for (const I of islands) if (I.settled && I.pop > 0){ const g = giftOf(I); if (g) set.add(g); }
  if (giftMemo.t >= 0 && !awayQuiet) for (const g of set) if (!giftMemo.set.has(g) && !(stats.gifts || []).includes(g)){
    stats.gifts = [...(stats.gifts || []), g]; mana += 2; note(`Eine neue Gabe für den Clan: ${GIFTS[g].n}. ${GIFTS[g].does} Ansehen +2.`); }
  giftMemo = {t:tick, set}; return set;
}
const hasGift = g => giftsHeld().has(g);
const giftF = (g, k = GIFTS[g].f) => hasGift(g) ? k : 1;
// the gift that works on a place: obsidian for the carvers, the damp slopes for taro on that very island
const giftWork = (I, b) => (['schnitzer', 'klingen', 'beil'].includes(b.kind) ? giftF('obsidian') : 1) * (b.kind === 'taro' && giftOf(I) === 'kava' ? GIFTS.kava.f : 1);
/* the clan's gifts in the overview: which it has, which it knows (and where), which are still to be found */
function giftsMarkup(){
  const held = giftsHeld(), known = g => islands.filter(J => J.discovered && !J.settled && giftOf(J) === g);
  return `<p class="sec">Gaben des Clans · ${held.size} von ${Object.keys(GIFTS).length}</p><ul class="list gifts">` + Object.entries(GIFTS).map(([g, G]) => {
    const k = known(g), st = held.has(g) ? 'ok' : k.length ? 'low' : '';
    return `<li class="${held.has(g) ? 'okk' : ''}">${icon(G.ic)}<span class="nm">${G.n}<small>${G.does}</small></span>${held.has(g) ? chipS('ok', 'da') : k.length ? chipS('low', k[0].name) : chipS('', '?')}</li>`; }).join('') + '</ul>';
}
/* ---------- what the other peoples teach: their rightful influence. Lapita grew out of meetings: the gardens of New Guinea,
   the obsidian of New Britain, the people of the islands already there. In the game the first gift of each people brings
   what only they have (bananas, star paths); more trust (knots) brings a lesson that stays with the clan for good. */
const TEACH = [
  {id:'garten', c:'alte', knots:6, n:'Gartenwissen vom Großen Land', does:'Felder laugen halb so schnell aus: Mulch und Brache, wie in den Bergen des Großen Landes.'},
  {id:'wetter', c:'nord', knots:6, n:'Wetterzeichen vom Nordmeer', does:'Böen auf See kosten nur halb so viel Proviant: Sie lesen Wolken und Dünung.'}
];
const cultureTrust = id => Math.max(0, ...routes.filter(r => [r.a, r.b].some(x => { const T = isl(x); return T && T.clan && T.clan.culture && T.clan.id === id; })).map(r => r.knots || 0));
const taught = id => (stats.teach || []).includes(id);
function teachTick(){
  for (const L of TEACH) if (!taught(L.id) && cultureTrust(L.c) >= L.knots){
    stats.teach = [...(stats.teach || []), L.id]; mana += 3;
    if (!awayQuiet){ const m = `${CULTURES[L.c].name} lehren euch: ${L.n}. ${L.does} Ansehen +3.`; note(m); toast(m, 5200); }
  }
}
/* the overview: what the other peoples gave the clan, with where it came from */
function teachMarkup(){
  const met = id => islands.some(T => T.discovered && T.clan && T.clan.culture && T.clan.id === id);
  const rows = [
    ['banane', 'Bananen vom Großen Land', 'Der Bananenhain: Nahrung das ganze Jahr.', lifeKnown('banane'), met('alte'), 'erste Gegengabe'],
    ['passat', 'Sternwege vom Nordmeer', 'Das Wissen der Navigatoren reicht eine Stufe weiter.', !!stats.nordLehre, met('nord'), 'erste Gegengabe'],
    ...TEACH.map(L => [L.c === 'alte' ? 'soil' : 'sturm', L.n, L.does, taught(L.id), met(L.c), `${Math.min(cultureTrust(L.c), L.knots)} von ${L.knots} Knoten`])];
  if (!rows.some(r => r[4])) return '';
  return `<p class="sec">Was andere Völker lehrten</p><ul class="list gifts">` + rows.filter(r => r[4]).map(([ic, n, d, ok, , how]) =>
    `<li class="${ok ? 'okk' : ''}">${icon(ic)}<span class="nm">${n}<small>${d}</small></span>${ok ? chipS('ok', 'da') : chipS('low', how)}</li>`).join('') + '</ul>';
}

/* ---------- the light whale. Not from any people's tradition: an invented creature of this game, to leave room for
   wonder. On some nights a whale of soft light swims past a village on the open water; who taps it, tells of it. */
let lightWhale = null;
const WHALE = {chance:1 / 420, life:45000, mana:2};
function whaleTick(){
  if (lightWhale || awayQuiet || !opts.night || nightLevel() < .3 || Math.random() > WHALE.chance) return;
  const I = isl(active); if (!I || !I.settled) return;
  const R = Math.max(I.box.x1 - I.box.x0, I.box.y1 - I.box.y0) / 2 + 160, a = Math.random() * TAU, dir = Math.random() < .5 ? 1 : -1;
  const x = I.center.x + Math.cos(a) * R, y = I.center.y + Math.sin(a) * R;
  if (islands.some(J => J.discovered && Math.hypot(J.center.x - x, J.center.y - y) < 120)) return;
  lightWhale = {x, y, hx:-Math.sin(a) * dir, hy:Math.cos(a) * dir, t0:performance.now(), isl:I.id, seen:false}; requestDraw();
}
const whalePos = (W, now) => { const s = (now - W.t0) / 1000 * 9; return {x:W.x + W.hx * s, y:W.y + W.hy * s}; };
function drawLightWhale(now){
  const W = lightWhale; if (!W) return;
  const age = now - W.t0; if (age > WHALE.life){ lightWhale = null; return; }
  const f = Math.min(1, age / 4000, (WHALE.life - age) / 4000), q = whalePos(W, now), c = ctx, sw = reduced ? 0 : Math.sin(now / 900);
  camXform(c); c.save(); c.translate(q.x, q.y); c.rotate(Math.atan2(W.hy, W.hx));
  const g = c.createRadialGradient(0, 0, 2, 0, 0, 46); g.addColorStop(0, `rgba(170,240,230,${.45 * f})`); g.addColorStop(1, 'rgba(170,240,230,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 50, 24, 0, 0, TAU); c.fill();
  c.globalAlpha = .85 * f; c.fillStyle = '#BFF2EA'; c.strokeStyle = '#2B1D14'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(14, -8, -4, -7); c.quadraticCurveTo(-16, -5, -22, sw * 2); c.quadraticCurveTo(-16, 5, -4, 7); c.quadraticCurveTo(14, 8, 20, 0); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-21, sw * 2); c.lineTo(-30, -6 + sw * 3); c.lineTo(-27, sw * 2); c.lineTo(-30, 6 + sw * 3); c.closePath(); c.fill(); c.stroke();   // the flukes
  c.fillStyle = '#2B1D14'; for (let i = 0; i < 6; i++){ c.beginPath(); c.arc(10 - i * 5, (i % 2 ? -2 : 2), .8, 0, TAU); c.fill(); }   // a row of dots, as on the pots
  if (!reduced && Math.sin(now / 1300) > .93){ c.globalAlpha = f * .7; c.strokeStyle = '#E6FFFA'; c.beginPath(); c.moveTo(8, -7); c.lineTo(6, -16); c.moveTo(8, -7); c.lineTo(11, -15); c.stroke(); }   // it blows
  c.restore(); c.globalAlpha = 1;
}
function hitWhale(p){ const W = lightWhale; if (!W || W.seen) return false; const q = whalePos(W, performance.now()); return Math.hypot(p.x - q.x, p.y - q.y) < Math.max(26, 30 / cam.z); }
function seeWhale(){
  const W = lightWhale; if (!W || W.seen) return; W.seen = true; mana += WHALE.mana; stats.wal = (stats.wal || 0) + 1;
  const I = isl(W.isl), p = I && (I.people || []).filter(isAdult)[Math.floor(Math.random() * Math.max(1, (I.people || []).filter(isAdult).length))];
  if (p) lifeEvent(p, 'wal'); sfx('shells');
  toast(`Der Lichtwal zieht an ${I ? I.name : 'der Insel'} vorbei.${p ? ` ${p.n} sah ihn zuerst und erzählt es den Kindern.` : ''} Ansehen +${WHALE.mana}.`, 4600); note('Der Lichtwal kam in der Nacht vorbei.');
}
/* ---------- shake a palm: tap it twice quickly and something falls out of the crown, by chance: a ripe nut, a frond, an
   old shell, a tuft of fibre. A palm gives again only after a while (PALM_SHAKE.rest ticks), so it stays a small joy. */
const PALM_SHAKE = {rest:45, gap:1500, dbl:420, drops:[['kokos', .5], ['dach', .2], ['schalen', .17], ['faser', .13]]};
let palmTap = null, palmShakeAt = 0;
const palmDrops = [];
function palmDouble(p){
  const b = hitBuilding(p); if (!b || b.kind !== 'palme' || b.bt || b.grow > 0) { palmTap = null; return false; }
  const now = performance.now(), dbl = palmTap && palmTap.id === b.id && now - palmTap.t < PALM_SHAKE.dbl;
  palmTap = dbl ? null : {id:b.id, t:now};
  if (!dbl) return false;
  const I = islOfB(b.id); b._shake = now;
  if (!I || !I.settled || now - palmShakeAt < PALM_SHAKE.gap || (b.shookAt != null && tick - b.shookAt < PALM_SHAKE.rest)){ requestDraw(); return true; }   // it sways, but nothing is left up there
  palmShakeAt = now; b.shookAt = tick;
  let r = Math.random(), k = PALM_SHAKE.drops[0][0]; for (const [q, w] of PALM_SHAKE.drops){ if (r < w){ k = q; break; } r -= w; }
  if ((I.stock[k] || 0) < storeCap(I)) I.stock[k] = (I.stock[k] || 0) + 1;
  const sc = (b.v && b.v.scale) || 1; palmDrops.push({k, x:b.x + (Math.random() - .5) * 8, y0:b.y - KINDS.palme.hy * sc * 2, y1:b.y + 3, t0:now});
  sfx('plop'); updateHUD(); requestDraw(); return true;
}
/* what falls: it drops from the crown, bounces once on the ground and shows what it is for a moment */
function drawPalmDrops(now){
  if (!palmDrops.length) return;
  const c = ctx; camXform(c);
  for (let i = palmDrops.length - 1; i >= 0; i--){
    const d = palmDrops[i], a = (now - d.t0) / 1000; if (a > 2.2){ palmDrops.splice(i, 1); continue; }
    const fall = Math.min(1, a / .45), y = fall < 1 ? d.y0 + (d.y1 - d.y0) * fall * fall : d.y1 - Math.max(0, Math.sin(Math.min(1, (a - .45) / .3) * Math.PI)) * 4;
    c.save(); c.globalAlpha = a > 1.7 ? (2.2 - a) / .5 : 1; c.translate(d.x, y); c.rotate(fall < 1 ? a * 6 : 0);
    put(c, 0, 0, .55, 1, 0, 'ic|' + d.k, `<use href="#ic-${d.k}" transform="translate(-10 -10)"/>`);
    c.restore();
    if (a > .5 && a < 1.9){ c.save(); c.globalAlpha = Math.min(1, (a - .5) * 4) * (a > 1.6 ? (1.9 - a) / .3 : 1); c.font = `700 ${(9 / Math.max(1, cam.z * .6)).toFixed(1)}px sans-serif`; c.textAlign = 'center'; c.fillStyle = '#2B1D14'; c.fillText('+1 ' + G1[d.k], d.x, d.y1 - 14 - (a - .5) * 6); c.restore(); }
  }
  c.globalAlpha = 1;
}

/* ---------- the wishes of the families. In every village of your own (the mother village too) one family wishes for
   something that makes the village nicer or livelier, every six to ten minutes, while no wish is open: a flower bed, a
   drum, a dance place, a feast, more free time. I.wish = {k, f, at, until, n}. It shows as a bubble over the house of that
   family and as a line in its sheet. Met within two days, the family is content for three days more (SAT.wish, satOf) and
   one of them has it in their story. Not met, it simply fades: no penalty. */
const WISH = {first:[180, 300], gap:[180, 300], life:360, joy:540, kinds:['hibiskus', 'blumen', 'fackel', 'trommel', 'tanzplatz', 'pfosten']};
const WISH_TXT = {blumen:'ein Blumenbeet', hibiskus:'Hibiskus', fackel:'eine Fackel', trommel:'eine Trommel', tanzplatz:'einen Tanzplatz', pfosten:'einen Ahnenpfosten', feast:'ein Fest', zeit:'mehr Freizeit'};
const wishBtn = k => k === 'feast' ? 'Feiern' : k === 'zeit' ? 'Ja, Freizeit' : 'Bauen';
const wishRand = (I, a, b, salt = 0) => Math.floor(a + rng((seed + tick * 7919 + I.pop * 31 + salt) >>> 0)() * (b - a + 1));
const wishCount = (I, k) => I.buildings.filter(b => b.kind === k).length;
function wishPick(I){
  const fs = famsOf(I).filter(f => f.home && homeOk(I, findB(f.home)) && membersOf(I, f).some(isAdult)); if (!fs.length) return null;
  const opts = [];
  for (const k of WISH.kinds){ const K = KINDS[k]; if (!K || !unlocked(k) || !K.on.includes(I.type) || (K.max && wishCount(I, k) >= K.max) || !hasLife(I, k) || I.buildings.some(b => b.kind === k && b.bt) || !canPay(I, costOf(k, I))) continue; opts.push(k); }
  if (opts.length > 1){ const lo = Math.min(...opts.map(k => wishCount(I, k))); for (let i = opts.length - 1; i >= 0; i--) if (wishCount(I, opts[i]) > lo + 1) opts.splice(i, 1); }   // what is still rare comes first
  if (feastsOpen() && !feastState(I, FEASTS[0])) opts.push('feast');
  if ((I.zeal ?? 1) !== 0) opts.push('zeit');
  if (!opts.length) return null;
  const k = opts[wishRand(I, 0, opts.length - 1, 1)], f = fs[wishRand(I, 0, fs.length - 1, 2)];
  return {k, f:f.id, at:tick, until:tick + WISH.life, n:wishCount(I, k)};
}
const wishMet = (I, w) => w.k === 'feast' ? (I.feastAt || 0) >= w.at && I.feastAt > 0 : w.k === 'zeit' ? I.zeal === 0 : wishCount(I, w.k) > w.n;
function wishTick(I){
  if (!I || !I.settled || I.clan) return;
  const w = I.wish, next = () => { I.wishAt = tick + wishRand(I, WISH.gap[0], WISH.gap[1], 3); };
  if (w){
    const f = famOf(I, w.f);
    if (f && wishMet(I, w)){
      I.wish = null; next(); (I.wishOk = I.wishOk || {})[w.f] = tick + WISH.joy;
      for (const q in I.wishOk) if (I.wishOk[q] <= tick) delete I.wishOk[q];
      const p = membersOf(I, f).find(isAdult) || membersOf(I, f)[0]; if (p) lifeEvent(p, 'wunsch', WISH_TXT[w.k]);
      stats.wuensche = (stats.wuensche || 0) + 1; I._sat = null;
      const h = f.home && findB(f.home); if (h && !awayQuiet) heartAt(I, h);
      hush(`${famName(f)} auf ${I.name} freut sich: Der Wunsch nach ${WISH_TXT[w.k]} ist erfüllt.`);
    } else if (!f || tick >= w.until){ I.wish = null; next(); }   // it fades
    return;
  }
  if (I.wishAt == null){ I.wishAt = tick + wishRand(I, WISH.first[0], WISH.first[1]); return; }
  if (tick < I.wishAt) return;
  const n = wishPick(I); if (!n){ I.wishAt = tick + 60; return; }
  I.wish = n; const f = famOf(I, n.f); hush(`${famName(f)} auf ${I.name} wünscht sich ${WISH_TXT[n.k]}.`);
}
/* the wish of the family that lives in this house, or null */
const wishOfHome = (I, b) => { const w = I && I.wish, f = w && famOfHome(I, b); return f && w.f === f.id ? w : null; };
/* the button in the house: build it, open the feast, or give free time */
function wishGo(I, w){
  if (w.k === 'feast'){ const c = centerOf(I); if (c){ sheetData = null; setActive(I.id); select(c); } return; }
  if (w.k === 'zeit'){ I.zeal = 0; I.staff = null; syncWalkers(); updateHUD(); toast(`${I.name}: Viel Freizeit.`, 2000, false); if (sheetKind) renderSheet(); save(); return; }
  setActive(I.id); startPlace(w.k);
}
