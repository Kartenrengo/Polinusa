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
  I.immigAt = tick + IMMIG_GAP;
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
  hoch:d => `heiratet ${d}`, nav:d => `wird Navigator: ${d}`, sturm:d => d || 'übersteht einen Sturm', haupt:() => 'wird Häuptling', alt:() => 'wird alt und sitzt jetzt vor dem Haus'
};
const storyOf = p => (p.ev || []).filter(e => STORY_TEXT[e[1]]).map(e => ({year:yearOf(e[0]) + 1, text:STORY_TEXT[e[1]](e[2])}));
/* once in a while: who has started to work, who has grown old */
function storyTick(I){
  for (const p of I.people || []){
    if (isAdult(p) && p.job && !(p.ev || []).some(e => e[1] === 'arb')){ const b = findB(p.job); if (b) lifeEvent(p, 'arb', placeName(b)); }
    if (stageOf(p) === 'old' && (p.ev || []).length && !p.ev.some(e => e[1] === 'alt')) lifeEvent(p, 'alt');
  }
}
/* ---------- daughter villages run themselves. Every village but the first is led by its elders (I.rat, on by default;
   the overview can hand it back): once a minute they do what their own advice says, as a player would: build one thing
   at a time, tie the roofs before a storm, take in families, give houses a craft, and let houses rise by themselves.
   And at every dawn a daughter sends a small canoe to the mother village with what it has to spare (packTick). */
const ELDERS = {every:30}, PACK = {max:8, from:.6, keep:.45, mother:.85};
const SPEC_GOODS = new Set(Object.keys(SPEC_OF_KIND).map(q => KINDS[q].prod).filter(Boolean));   // what only special ground makes
const eldersOn = I => !!I && I.settled && !I.clan && (I.rat ?? I.id !== 'heimat');
function eldersBuild(I, kind){
  const K = KINDS[kind]; if (!K || !unlocked(kind) || K.fixed || !K.on.includes(I.type)) return false;
  if (K.craft){ const h = homesOf(I).find(q => famOfHome(I, q) && !craftOf(I, q) && !craftWhy(I, q, kind)); if (!h) return false; setCraft(I, h, kind); return true; }
  if (I.buildings.some(b => b.bt && !KINDS[b.kind].plant)) return false;   // one site at a time, like a careful player
  if (K.max && I.buildings.filter(b => b.kind === kind).length >= K.max) return false;
  if (!hasLife(I, kind) || (K.spring && !I.river) || (SPEC_OF_KIND[kind] && specOf(I) !== SPEC_OF_KIND[kind]) || (K.dep && !depsOf(I, K.dep).length)) return false;
  // one of the kind already stands still: a second would too
  if (!HOME_KINDS.has(kind) && I.buildings.some(b => b.kind === kind && (b.bt || (b.idle && b.idle.why !== 'full')))) return false;
  // a workplace nobody is free for would only stand empty
  if (K.crew && !HOME_KINDS.has(kind) && !staffOf(I).free && placesOf(I).some(b => b.idle && b.idle.why === 'crew')) return false;
  const c = costOf(kind, I); if (!canPay(I, c)) return false;
  const p = findSpot(I, kind, startSpot(I, K)); if (!p) return false;
  pay(I, c); const b = addB(I, kind, p, variant(kind), tick); if (K.bt) b.bt = K.bt; clearStumps(I, b); I.staff = null;
  (I.ratLog = I.ratLog || []).unshift({t:tick, k:kind}); I.ratLog.length = Math.min(I.ratLog.length, 4);
  if (I.id === active && !awayQuiet){ invalidate(); syncWalkers(); note(`Der Rat von ${I.name} lässt bauen: ${K.n}.`); }
  return true;
}
function eldersTick(I, force = false){
  if (!eldersOn(I) || (!force && tick % ELDERS.every !== 7)) return;
  I.autoUp = true; if (I.handWork) I.handWork = false;
  if (!I.ratSaid && !awayQuiet){ I.ratSaid = true; note(`Der Rat von ${I.name} führt das junge Dorf. Unter Übersicht, „Insel“, kannst du es selbst führen.`); }
  const A = adviceOf(I) || {};
  if (A.tie){ tieRoofs(I); return; }
  if (A.immig){ const s = ships.find(q => q.id === A.immig); if (s && s.immig) immigAnswer(s, true, true); return; }
  if (A.rain && !rainState(I)){ rainDance(I); return; }   // a dance it cannot hold does not stop the rest
  // a young village first needs its harvest house, then water and food; only then what the advice says
  { const has = k => I.buildings.some(b => b.kind === k), F = mealFore(I);
    if (!has('ernte')){ eldersBuild(I, 'ernte'); return; }
    if (F.water < F.n + 2 && !I.river && I.buildings.filter(b => b.kind === 'ernte').length < 2 && eldersBuild(I, 'ernte')) return;
    if (F.food < F.n + 2 && !has(foodBuild(I)) && eldersBuild(I, foodBuild(I))) return; }
  if (A.build && (A.urgent || I.pop >= 8) && eldersBuild(I, A.build)) return;
  // nothing urgent: room for one more family when the meal reaches everyone
  if (!roofless(I) && surplus(I, needsOf(I).list) && !I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind)) && homesOf(I).every(b => famOfHome(I, b))) eldersBuild(I, 'haus');
}
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
  else { M.packs = (M.packs || 0) + 1; I.packLast = {t:tick, g:got}; stats.packs = (stats.packs || 0) + 1; }
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
const HELP = {pop:15, max:16};
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
  if (got && !awayQuiet){ const msg = P.help ? `${I.name} hilft dem jungen Dorf ${M.name}: ${packText(got)}.` : `Ein Kanu aus ${I.name} bringt ${packText(got)}.`; note(msg); if (M.id === active){ toast(msg, 3600); sfx('shells'); updateHUD(); } }
  s.leaving = true; if (!s.home || !sailTo(s, {x:s.home.x, y:s.home.y}, true)){ const i = ships.indexOf(s); if (i >= 0) ships.splice(i, 1); }
  requestDraw();
}
