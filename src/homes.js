'use strict';
/* ---------- households. Every person belongs to a family (p.h). A family lives in a house, or, while there is none, under
   makeshift shelter by the village plaza. Needs are met family by family: first a roof, food and water. A house has four
   steps. A hut of posts and palm fronds holds one family, at most four people, and no children are born in it: new people
   come from far away, by canoe, when a hut stands empty. Bound anew with coconut fibre and sennit it becomes a family house
   with room for children, and the family wants cooked food. With pots, mats and coconut oil in store it becomes the house
   of a master family, the tufunga of later times. The chief's house is the fourth step. Families are named after the woman
   who founded them; Lapita households most likely lived where the women's families lived. */
const HOME_KINDS = new Set(['haus', 'pfahl', 'fale']);
const TIERS = {
  1:{n:'Hütte', fam:'Familie', cap:4, needs:['dach', 'essen', 'wasser']},
  2:{n:'Familienhaus', fam:'Familie', cap:6, needs:['dach', 'essen', 'wasser', 'speisen'], cost:{holz:2, faser:3, schnur:2}},
  3:{n:'Meisterhaus', fam:'Meisterfamilie', cap:8, needs:['dach', 'essen', 'wasser', 'speisen', 'toepfe', 'matten', 'oel'], cost:{holz:2, matten:2}},
  4:{n:'Häuptlingshaus', fam:'Häuptlingsfamilie', cap:10, needs:['dach', 'essen', 'wasser', 'speisen', 'toepfe', 'matten', 'oel', 'tapa', 'schweine', 'kava', 'schmuck', 'feinmatten', 'bemtapa', 'duftoel']}
};
const MASTER_GOODS = ['toepfe', 'matten', 'oel'];
const UPGRADE_KEEP = {schnur:2};   // what stays in store when huts are bound anew by themselves: sennit for nets and canoes
const START_POP = 4;   // one family: a woman, a man and their two half-grown children; everyone works
let nextFam = 1;
const famsOf = I => I.fams || (I.fams = []);
const famOf = (I, id) => famsOf(I).find(f => f.id === id) || null;
const membersOf = (I, f) => (I.people || []).filter(p => p.h === f.id);
const homeOk = (I, b) => !!b && !b.bt && HOME_KINDS.has(b.kind) && !(b.kind === 'pfahl' && unserved(I, b));
const homesOf = I => I.buildings.filter(b => homeOk(I, b));
const tierOf = b => !b ? 1 : b.kind === 'fale' ? 4 : b.t >= 2 ? Math.min(3, b.t) : 1;
const CHIEF_GOODS = TIERS[4].needs.filter(k => !TIERS[3].needs.includes(k));
/* Room in a house, as in Anno: every need met brings room for one more. A hut holds 2, with food and water 4; a family
   house 4 to 6 with cooked food, a master's house 4 to 8, the chief's house 4 to 10, by how many of their goods are in
   store. When a need runs out the house has less room, and one by one people leave it (crowdTick). */
const homeCapMax = (I, b) => TIERS[tierOf(b)].cap;
const DRY_GRACE = 15;   // ticks a good may be gone before the houses lose the room it gives
function homeCap(I, b){
  const t = tierOf(b), max = homeCapMax(I, b), have = k => haveOf(I, k) > 0 || ((I.dry && I.dry[k]) || 0) < DRY_GRACE, basic = ['essen', 'wasser'].filter(have).length;
  if (t === 1) return Math.min(max, 2 + basic);
  const extra = TIERS[t].needs.filter(k => !['dach', 'essen', 'wasser'].includes(k)), share = extra.filter(have).length / extra.length;
  return Math.min(max, 2 + basic + Math.round(share * (max - 4)));
}
/* a house fuller than its room: every half minute one of its people moves away */
function crowdTick(I, force = false){
  if ((tick % 15 && !force) || tick < (I.grace || 0)) return;
  for (const b of homesOf(I)){
    const f = famOfHome(I, b); if (!f || membersOf(I, f).length <= homeCap(I, b)) continue;
    I._leaveFrom = f.id; I.pop--; syncPeople(I); I._leaveFrom = 0;
    if (!awayQuiet && I.id === active) note(`Bei ${famName(f)} fehlt etwas, das Haus ist zu eng: Jemand zieht fort.`);
    return;
  }
}
const famOfHome = (I, b) => famsOf(I).find(f => f.home === b.id) || null;
const famName = f => `Familie ${f.n}`;
const famTier = (I, f) => f.home ? tierOf(findB(f.home)) : 1;
const roofless = I => (I.people || []).filter(p => { const f = famOf(I, p.h); return !f || !f.home; }).length;
const popTier = (I, t) => famsOf(I).reduce((n, f) => n + (famTier(I, f) >= t ? membersOf(I, f).length : 0), 0);
const tier2Pop = I => popTier(I, 2), tier3Pop = I => popTier(I, 3), tier4Pop = I => popTier(I, 4);
const chiefFam = I => famsOf(I).find(f => famTier(I, f) === 4) || null;
const famLabel = (I, f) => f.home ? TIERS[famTier(I, f)].n : 'ohne Dach';
/* the matriarch: the eldest woman of the chief's family; the chief: its eldest man, her brother or son */
const eldest = (I, f, s) => membersOf(I, f).filter(p => p.s === s && stageOf(p) !== 'kid').sort((a, b) => a.b - b.b)[0] || null;
function newFam(I, name, home = 0){
  // two families of one name on an island are told apart as the elder and the younger
  const used = new Set(famsOf(I).map(f => f.n)); let n = name; if (used.has(n)) n = [name + ' die Jüngere', name + ' von der Küste', name + ' vom Hang'].find(q => !used.has(q)) || name + ' ' + nextFam;
  const f = {id:nextFam++, n, home, job:0}; famsOf(I).push(f); return f;
}

/* The first people of a village. The clan's canoe brings one family: a woman, a man and their two children, old enough to
   work. More families of about four come together when a canoe brings more people. Each family is a line of its own. */
function seedFamilies(I, n){
  const out = [], k = Math.max(1, Math.round(n / 4)), size = i => Math.floor(n / k) + (i < n % k ? 1 : 0);
  for (let i = 0; i < k; i++){
    let w = person(I, 26 + Math.random() * 8, null, 'f'); for (let t = 0; t < 20 && famsOf(I).some(q => q.n === w.n); t++) w.n = person(I, 0).n;
    const first = I.id === 'heimat' && !famsOf(I).length, f = newFam(I, w.n), ln = newLine(w.n, first ? 'vom Ahnenkanu' : ''), fam = [w];
    if (size(i) > 1) fam.push(person(I, 28 + Math.random() * 8, null, 'm'));
    // the rest of the household: half-grown children who already help, and in a big household an elder
    while (fam.length < size(i)) fam.push(fam.length === 4 ? person(I, 41 + Math.random() * 4, null, 'f') : person(I, 9 + Math.random() * 6, null, fam.length === 2 ? 'f' : 'm'));
    for (const p of fam){ p.h = f.id; p.ln = ln; out.push(p); }
  }
  return out;
}
/* Someone new is placed: a child into the house it was born in (I._growTo), else a family with room, else a family of their own */
function placePerson(I, p){
  const g = I._growTo && findB(I._growTo);
  if (g && homeOk(I, g)){ const f = famOfHome(I, g) || newFam(I, p.n, g.id); p.h = f.id; return; }
  for (const f of famsOf(I)){ const b = f.home && findB(f.home); if (b && membersOf(I, f).length < homeCapMax(I, b)){ p.h = f.id; return; } }
  p.h = newFam(I, p.n).id;
}
/* Families follow the people and the houses: gone families free their house, the roofless move into empty houses,
   an overfull house sends its youngest grown-ups to found a family of their own. People who came from elsewhere (settlers,
   those who married in) form families again, by the family they came from. */
function syncFamilies(I){
  if (!I.people) return;
  const fams = famsOf(I), ids = new Set(fams.map(f => f.id));
  const orphans = I.people.filter(p => !ids.has(p.h));
  if (orphans.length){
    const groups = new Map(); for (const p of orphans){ const k = p.h || 0; (groups.get(k) || groups.set(k, []).get(k)).push(p); }
    for (const [old, ps] of groups){
      // someone who married in joins their partner's family
      if (!old){ for (const p of ps){ const sp = p.sp && I.people.find(q => q.n === p.sp && ids.has(q.h)); if (sp) p.h = sp.h; else placePerson(I, p); ids.add(p.h); } continue; }
      let name = (ps.find(p => p.s === 'f' && stageOf(p) !== 'kid') || ps[0]).n; for (const J of islands){ const f = J !== I && J.fams && J.fams.find(q => q.id === old); if (f){ name = f.n; break; } }
      const f = newFam(I, name); for (const p of ps) p.h = f.id; ids.add(f.id);
    }
  }
  I.fams = famsOf(I).filter(f => I.people.some(p => p.h === f.id));
  const homes = homesOf(I), byId = new Map(homes.map(b => [b.id, b])), taken = new Set();
  for (const f of I.fams){ if (f.home && (!byId.has(f.home) || taken.has(f.home))) f.home = 0; if (f.home) taken.add(f.home); }
  // a house too full: the youngest grown-ups (and their small children are not split off) found their own family
  for (const f of I.fams.slice()){
    if (!f.home) continue; const m = membersOf(I, f), cap = homeCapMax(I, byId.get(f.home)); if (m.length <= cap) continue;
    const go = m.filter(p => stageOf(p) !== 'kid').sort((a, b) => b.b - a.b).slice(0, m.length - cap);
    if (!go.length) continue; const nf = newFam(I, (go.find(p => p.s === 'f') || go[0]).n); for (const p of go) p.h = nf.id;
  }
  // the chief's house: the family whose eldest woman is the eldest of the master families moves in
  const fale = homes.find(b => b.kind === 'fale');
  if (fale && !taken.has(fale.id)){
    const by = f => { const w = eldest(I, f, 'f'); return w ? w.b : Infinity; }, f = I.fams.filter(q => q.home && tierOf(byId.get(q.home)) === 3).sort((a, b) => by(a) - by(b))[0] || I.fams.slice().sort((a, b) => by(a) - by(b))[0];
    if (f){ if (f.home) taken.delete(f.home); f.home = fale.id; taken.add(fale.id); }
  }
  // the roofless move into empty houses, the biggest family first
  const empty = homes.filter(b => !taken.has(b.id) && b.kind !== 'fale');
  for (const f of I.fams.filter(q => !q.home).sort((a, b) => membersOf(I, b).length - membersOf(I, a).length)){
    const b = empty.find(q => homeCapMax(I, q) >= Math.min(membersOf(I, f).length, 4)) || empty[0]; if (!b) break;
    f.home = b.id; taken.add(b.id); empty.splice(empty.indexOf(b), 1);
  }
}
/* Where the next child is born: a family house (step 2 or more) with room, a woman and a man. Room comes with the
   needs met (homeCap), so without cooked food a family house has no room for a child. Nobody is born while food or
   water have run out. */
const surplus = (I, list) => ['essen', 'wasser'].every(k => { const n = list.find(q => q.k === k); return !n || n.make >= (n.use + n.work) * 1.15 || n.stock >= storeCap(I) * .6; });
function growTarget(I, list){
  if (!I.settled || I.pop >= islandMax(I)) return null;
  const out = new Set(list.filter(n => n.state === 'out').map(n => n.k));
  if (out.has('essen') || out.has('wasser') || haveOf(I, 'essen') <= 0 || (I.stock.wasser || 0) <= 0) return null;
  // children come where there is more than enough: the harvest covers what everyone eats and drinks with some to spare,
  // or the stores are well filled
  if (!surplus(I, list)) return null;
  let best = null, room = 0;
  for (const b of homesOf(I)){
    const t = tierOf(b), f = t >= 2 && famOfHome(I, b); if (!f) continue;
    const m = membersOf(I, f); if (!m.some(p => p.s === 'f' && isAdult(p) && ageOf(p) >= 16 && ageOf(p) < 42) || !m.some(p => p.s === 'm' && isAdult(p) && ageOf(p) >= 16)) continue;
    const r = homeCap(I, b) - m.length; if (r > room){ best = b; room = r; }
  }
  return best;
}
/* Children are born now and then where there is room, more seldom where the families are close kin (see kinFactor) */
const BIRTH_EVERY = 60;   // ticks between births on an island where all is well
function birthTick(I, ticks = 1){
  const nd = needsOf(I); if (!growTarget(I, nd.list)){ I.birthAcc = Math.min(I.birthAcc || 0, BIRTH_EVERY / 2); return 0; }
  I.birthAcc = (I.birthAcc || 0) + ticks * kinFactor(I) * (I.joyUntil > tick ? 2 : 1);
  let n = 0;
  while (I.birthAcc >= BIRTH_EVERY){
    I.birthAcc -= BIRTH_EVERY; const b = growTarget(I, needsOf(I).list); if (!b) break;
    I._growTo = b.id; I._birth = true; I.pop++; syncPeople(I); I._growTo = 0; I._birth = false; if (!awayQuiet) heartAt(I, b); n++;
  }
  return n;
}
/* What a family has and lacks, by the needs of its step */
function famNeeds(I, f, list){
  const t = famTier(I, f), by = new Map(list.map(n => [n.k, n]));
  return TIERS[t].needs.map(k => k === 'dach' ? {k, state:f.home ? 'ok' : 'out'} : {k, state:(by.get(k) || {state:'ok'}).state});
}
/* Rising, as in Anno. A house can rise one step when every need of its family is met and the material for the next step
   lies in store; for a master's house its new goods must be there too. You tap the house and "Aufsteigen" (or let houses
   rise by themselves). A hut is bound anew with fibre and sennit: a family house, with room for children. A family house
   with pots, mats and coconut oil becomes a master's house. A master family falls back when one of its goods has run out
   for half a minute; the sennit of a family house holds. */
function upgradeSteps(I, b, list){
  const t = tierOf(b), f = famOfHome(I, b); if (t >= 3 || !f || b.bt) return null;
  list = list || needsOf(I).list;
  const T = TIERS[t + 1], fn = famNeeds(I, f, list), miss = fn.filter(n => n.state === 'out').map(n => n.k), steps = [];
  steps.push({k:'needs', ok:!miss.length, miss, t:miss.length ? `Es fehlt ${andList(miss.map(k => k === 'dach' ? 'Dach' : GN[k]))}` : 'Alle Bedürfnisse erfüllt'});
  if (t === 2) for (const k of MASTER_GOODS) steps.push({k, ok:(I.stock[k] || 0) > 0, t:`${GN[k]} im Lager`, have:I.stock[k] || 0, need:1});
  for (const [k, v] of Object.entries(T.cost)) steps.push({k, ok:(I.stock[k] || 0) >= v, t:amount(k, v), have:I.stock[k] || 0, need:v});
  return {t:t + 1, T, steps, ready:steps.every(q => q.ok)};
}
const canUpgrade = (I, b, list) => { const u = upgradeSteps(I, b, list); return !!u && u.ready; };
const readyHomes = (I, list) => homesOf(I).filter(b => canUpgrade(I, b, list));
function upgradeHouse(I, b){
  const t = tierOf(b) + 1, f = famOfHome(I, b); if (t > 3 || !f) return false;
  pay(I, TIERS[t].cost); b.t = t; b.miss = 0; b.blessAt = typeof performance !== 'undefined' ? performance.now() : 0; invalidate(); I.staff = null;
  if (t === 2) stats.ausbau = (stats.ausbau || 0) + 1; else stats.tufunga = (stats.tufunga || 0) + 1;
  if (!awayQuiet && I.id === active) sfx('rise');
  if (!awayQuiet && I.id === active) toast(t === 2 ? `${famName(f)}: Familienhaus. Jetzt können Kinder kommen.` : `${famName(f)}: Meisterhaus.`, 2800);
  return true;
}
function tierTick(I, list, force = false){
  if (tick % 10 && !force) return;
  const out = new Set(list.filter(n => n.state === 'out').map(n => n.k));
  for (const b of homesOf(I)){
    if (tierOf(b) !== 3) continue;
    b.miss = MASTER_GOODS.some(k => out.has(k)) ? (b.miss || 0) + 10 : 0;
    if (b.miss >= 30){ b.t = 2; b.miss = 0; invalidate(); I.staff = null; const f = famOfHome(I, b); if (I.id === active && !awayQuiet) note(`${f ? famName(f) : 'Ein Haus'} hat keine ${MASTER_GOODS.filter(k => out.has(k)).map(k => GN[k]).join(' und ')} mehr und lebt wieder als einfache Familie.`); }
  }
  // by themselves the houses rise only when the player wants it so; a reserve of sennit stays for nets and canoes
  if (!I.autoUp) return;
  const b = homesOf(I).sort((a, q) => tierOf(a) - tierOf(q) || a.born - q.born).find(q => canUpgrade(I, q, list) && (tierOf(q) > 1 || (I.stock.schnur || 0) >= TIERS[2].cost.schnur + UPGRADE_KEEP.schnur));
  if (b) upgradeHouse(I, b);
}
/* A family without a roof waits by the plaza; when no house is being built for a long while, one of them leaves */
function rooflessTick(I){
  const n = roofless(I);
  I.rl = n && !I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind)) ? (I.rl || 0) + 1 : 0;
  if (I.rl >= 90 && I.pop > 3 && tick >= (I.grace || 0)){ I.rl = 0; I._leaveRoofless = true; I.pop--; syncPeople(I); if (!awayQuiet && I.id === active) note(`Ohne Dach ist jemand von ${I.name} fortgezogen. Baut Hütten.`); }
}

/* ---------- work by person. Every grown-up works; each has a place (p.job). Without the hand of the player people go where
   they are needed most: what is short first, then food and water, the sea, wood, crafts and canoes; a place is filled
   with its whole crew before the next, so the work that needs two gets two. A building site takes those without work;
   when nobody is free, the people of the place that is needed least leave it for the time of building, and that place
   makes nothing meanwhile. */
const PLACE_RANK = {essen:0, meer:1, holz:2, handwerk:3, boot:4};
/* Who goes first to a place, as the old accounts tell: women beat bark cloth, plait mats and thatch, make the pots, tend
   the hens and glean the reef; men fish out at sea, dive, fell trees, climb the palms, grind adzes and keep the pigs. */
const WOMEN_WORK = new Set(['flecht', 'klopf', 'malerin', 'weberin', 'duftoel', 'toepfer', 'pansammler', 'kurkumagarten', 'huehnerhof', 'oelhuette', 'quelle', 'brunnen']);
const MEN_WORK = new Set(['fisch', 'taucher', 'faeller', 'beil', 'klingen', 'ernte', 'pferch', 'harzer', 'kalkbrenner', 'pflanzer']);
const workOrder = (b, ad) => { const w = WOMEN_WORK.has(b.kind) ? 'f' : MEN_WORK.has(b.kind) ? 'm' : null; return w ? ad.slice().sort((p, q) => (q.s === w) - (p.s === w)) : ad; };
const famAdults = (I, f) => (I.people || []).filter(p => p.h === f.id && isAdult(p));
const placesOf = I => I.buildings.filter(b => !b.bt && (KINDS[b.kind].crew || b.boat > 0) && !unserved(I, b) && !b.fallow);
const autoWork = I => !I.handWork;
const prodOfB = b => prodOf(b) || KINDS[b.kind].prod || '';
/* how much a place is needed now: 0 its good is short, 1 as usual, 2 its store is nearly full */
function needOf(I, places){
  const cap = storeCap(I), outs = b => [prodOfB(b), ...Object.keys(byOf(b) || {}), ...Object.keys(KINDS[b.kind].picks || {})].filter(Boolean);
  const short = new Set(places.map(prodOfB).filter(k => k && (I.stock[k] || 0) < 5));
  for (const b of places) if (short.has(prodOfB(b)) && KINDS[b.kind].use) for (const k of Object.keys(KINDS[b.kind].use)) for (const q of GROUPS[k] || [k]) if ((I.stock[q] || 0) < 5) short.add(q);
  if (haveOf(I, 'essen') < 12) for (const k of FOODS) short.add(k);
  if ((I.stock.wasser || 0) < 6) short.add('wasser');
  if ((I.stock.dach || 0) < 4) short.add('dach');
  if ((I.stock.holz || 0) < 4) short.add('holz');
  const full = b => KINDS[b.kind].picks ? Object.keys(KINDS[b.kind].picks).every(k => (I.stock[k] || 0) >= cap * .75) : (I.stock[prodOfB(b)] || 0) >= cap * .75;
  return b => b.boat > 0 || outs(b).some(k => short.has(k)) ? 0 : full(b) ? 2 : 1;
}
const rankOf = b => PLACE_RANK[catOf(b)] ?? 3;
/* the best of those free for a place: someone of the family already there, then by the old ways, then who lives nearest */
function pickWorker(I, b, free, here){
  const w = WOMEN_WORK.has(b.kind) ? 'f' : MEN_WORK.has(b.kind) ? 'm' : null, fams = new Set(here.map(p => p.h));
  const score = p => { const f = famOf(I, p.h), h = f && f.home && findB(f.home); return (fams.has(p.h) ? 100 : 0) + (w && p.s === w ? 50 : 0) - (h ? Math.hypot(h.x - b.x, h.y - b.y) : 200) / 10; };
  return free.reduce((m, p) => score(p) > score(m) ? p : m, free[0]);
}
function autoAssign(I, places, at, adults){
  const free = adults.filter(p => !p.job), need = needOf(I, places);
  const open = places.slice().sort((a, b) => (b.prio ? 1 : 0) - (a.prio ? 1 : 0) || need(a) - need(b) || rankOf(a) - rankOf(b) || a.born - b.born);   // a called place first
  for (const b of open){
    const l = at.get(b) || []; at.set(b, l);
    while (l.length < KINDS[b.kind].crew && free.length){
      if (need(b) === 2 && l.length) break;   // a full store does not need more hands
      const p = pickWorker(I, b, free, l); free.splice(free.indexOf(p), 1); p.job = b.id; l.push(p);
    }
  }
  // a place whose good is short and is not fully worked takes people from a place whose store is full, or from crafts and canoes
  for (const b of open){
    if (need(b) > 0) continue;
    const l = at.get(b);
    while (l.length < KINDS[b.kind].crew){
      const take = places.filter(q => q !== b && !q.prio && (at.get(q) || []).length && need(q) > 0 && (need(q) === 2 || rankOf(q) >= 3) && rankOf(q) >= rankOf(b)).sort((a, q) => need(q) - need(a) || rankOf(q) - rankOf(a))[0];
      if (!take) break;
      const p = at.get(take).pop(); p.job = b.id; l.push(p);
    }
  }
}
/* The conch (pū): blown at a place, its people come at once. At most two places at a time; a third call takes the oldest
   back. A site's call ends when it is built, a workplace's when its store is well filled again. */
const PRIO_MAX = 2;
function setPrio(I, b, on){
  if (on){ const others = I.buildings.filter(q => q.prio && q !== b).sort((x, y) => (x.prioAt || 0) - (y.prioAt || 0)); while (others.length >= PRIO_MAX) others.shift().prio = false; b.prio = true; b.prioAt = tick; }
  else { b.prio = false; }
  I.staff = null; syncWalkers(); invalidate(); if (on) sfx('horn');
}
function prioTick(I){
  if (tick % 5) return;
  for (const b of I.buildings) if (b.prio && !b.bt && !(b.boat > 0)){ const k = prodOfB(b); if (k && (I.stock[k] || 0) >= storeCap(I) * .75){ b.prio = false; I.staff = null; } }
}
const makesK = (kind, k) => { const K = KINDS[kind] || {}, m = q => K.prod === q || !!(K.picks && K.picks[q]); return k === 'essen' ? FOODS.some(m) : m(k); };
function staff(I){
  const crew = new Map(), crewP = new Map(), sites = [], boats = [], staffed = new Set(), pulled = new Map();
  if (!I.people) return I.staff = {key:staffKey(I), crew, crewP, sites, yard:0, boats, staffed, pulled, free:0, freeP:[], total:workers(I), build:0, short:0, queue:[]};
  const places = placesOf(I), pmap = new Map(places.map(b => [b.id, b])), at = new Map(), adults = I.people.filter(isAdult);
  for (const p of I.people){
    if (!isAdult(p)){ p.job = 0; continue; }
    const b = p.job && pmap.get(p.job); if (!b){ p.job = 0; continue; }
    const l = at.get(b) || []; if (l.length >= KINDS[b.kind].crew){ p.job = 0; continue; } l.push(p); at.set(b, l);
  }
  if (autoWork(I)) autoAssign(I, places, at, adults);
  // a place called with the conch (b.prio) is filled at once: first by whoever is free, then from the place that can wait best
  { const need = needOf(I, places);
    for (const b of places.filter(q => q.prio)){
      const l = at.get(b) || []; at.set(b, l);
      while (l.length < KINDS[b.kind].crew){
        const free = adults.find(p => !p.job);
        if (free){ free.job = b.id; l.push(free); continue; }
        const from = places.filter(q => q !== b && !q.prio && (at.get(q) || []).length).sort((x, y) => need(y) - need(x) || rankOf(y) - rankOf(x) || y.born - x.born)[0];
        if (!from) break;
        const p = at.get(from).pop(); p.job = b.id; l.push(p);
      }
    } }
  const pool = adults.filter(p => !p.job);
  // the building sites and the canoe house: first who has no work, then the people of the place needed least
  // a site that will make what is running out (water, food) goes first, then huts for those without a roof, then in order
  const shortK = ['wasser', 'essen'].filter(k => haveOf(I, k) < 6), urgent = b => shortK.some(k => makesK(b.kind, k)), roofNeed = roofless(I);
  // a site called with the conch comes first of all, and always gets its builders, even beyond the usual number of sites
  const rank = b => b.prio ? -1 : urgent(b) ? 0 : b.kind === 'haus' && roofNeed ? 1 : 2;
  const all = I.buildings.filter(q => q.bt && !KINDS[q.kind].plant).sort((a, b) => rank(a) - rank(b) || a.id - b.id), lim = builders(I) + all.filter(q => q.prio).length;   // a called site comes on top, it does not stop one already worked
  const want = all.slice(0, lim).map(b => [b, SITE_CREW]);
  const yardB = I.yard && I.buildings.find(b => b.kind === 'werft' && !b.bt); if (yardB) want.push([yardB, YARD_CREW]);
  let yard = 0;
  if (want.length){
    // whose work can wait best: a full store first, then a good in plenty, crafts before wood, wood before food and water
    const need = needOf(I, places), cap = storeCap(I), plenty = b => (I.stock[prodOfB(b)] || 0) / cap, pull = b => need(b) * 10 + plenty(b) * 5 + rankOf(b);
    // nobody leaves water or food that is running out
    const order = places.filter(b => (at.get(b) || []).length && !(need(b) === 0 && rankOf(b) === 0)).sort((a, b) => pull(b) - pull(a) || b.born - a.born);
    // a site keeps its builders until it is done: the same people carry the wood and build it to the end. Before, the
    // crew could change with every count, and whoever was carrying a load dropped it on the way.
    const mem = I.siteCrew || (I.siteCrew = {}); for (const id of Object.keys(mem)) if (!want.some(([w]) => w.id === +id)) delete mem[id];
    const taken = new Set();
    for (const [s, n] of want){
      const use = [];
      for (const pid of mem[s.id] || []){
        if (use.length >= n) break; const p = adults.find(q => q.id === pid); if (!p || taken.has(p)) continue;
        const i = pool.indexOf(p); if (i >= 0){ pool.splice(i, 1); use.push(p); continue; }
        const b = p.job && pmap.get(p.job), l = b && at.get(b); if (l && l.includes(p) && !b.prio){ l.splice(l.indexOf(p), 1); use.push(p); pulled.set(b, s); }
      }
      use.push(...pool.splice(0, n - use.length));
      // for a site that ends the shortage, or one called with the conch, even a place of a short good gives hands, never one
      // making the same good, never a place called itself
      let from = urgent(s) || s.prio ? places.filter(b => (at.get(b) || []).length && !b.prio && !shortK.some(k => makesK(b.kind, k) && makesK(s.kind, k))).sort((a, b) => pull(b) - pull(a) || b.born - a.born) : order.filter(b => !b.prio);
      while (use.length < n){
        const b = from.find(q => (at.get(q) || []).length); if (!b) break;
        const l = at.get(b); use.push(...l.splice(Math.max(0, l.length - (n - use.length)))); pulled.set(b, s);
      }
      for (const p of use) taken.add(p);
      mem[s.id] = use.map(p => p.id);
      if (!use.length) continue;
      crew.set(s, use.length); crewP.set(s, use.map(p => p.id)); if (s === yardB) yard = use.length; else sites.push(s);
    }
  }
  for (const b of places){
    const l = at.get(b) || []; if (!l.length) continue;
    const ord = workOrder(b, l); crew.set(b, ord.length); crewP.set(b, ord.map(p => p.id));
    if (b.boat > 0) boats.push(b); else staffed.add(b);
  }
  const build = sites.reduce((t, b) => t + crew.get(b), 0) + yard;
  const short = places.filter(b => !crew.get(b)).length;
  return I.staff = {key:staffKey(I), crew, crewP, sites, yard, boats, staffed, pulled, free:pool.length, freeP:pool.map(p => p.id), total:adults.length, build, short, queue:all.map(b => b.id)};
}
/* The player sends one more person to a place, or calls one away; then the island is worked by hand */
const handNote = I => { if (autoWork(I)){ I.handWork = true; toast('Die Arbeit wird jetzt von Hand verteilt. In der Übersicht geht es zurück auf Automatisch.', 3600, false); } };
function workAdd(I, b){
  const K = KINDS[b.kind], here = (I.people || []).filter(p => p.job === b.id);
  if (here.length >= K.crew){ toast(`${K.n} hat Platz für ${K.crew}. Alle Plätze sind besetzt.`, 2600, false); return false; }
  const free = (I.people || []).filter(p => isAdult(p) && !p.job);
  if (!free.length){ toast('Niemand ist frei. Ruf jemanden woanders mit − ab, oder baut Hütten: Dann kommen Familien von weit her.', 3600, false); return false; }
  handNote(I); const p = pickWorker(I, b, free, here); p.job = b.id; I.staff = null; syncWalkers(); return p;
}
function workDel(I, b){
  const here = (I.people || []).filter(p => p.job === b.id); if (!here.length) return false;
  handNote(I); const ids = staffOf(I).crewP.get(b) || [], p = here.find(q => q.id === ids[ids.length - 1]) || here[here.length - 1];
  p.job = 0; I.staff = null; syncWalkers(); return p;
}
/* where someone works, in words */
function personWork(I, p){
  if (!isAdult(p)) return stageOf(p) === 'kid' ? 'Kind' : 'alt';
  const sf = staffOf(I), site = [...sf.crewP].find(([q, ids]) => (q.bt || (q.kind === 'werft' && I.yard)) && ids.includes(p.id));
  if (site) return `baut: ${site[0].bt ? KINDS[site[0].kind].n : SHIPS[I.yard.kind].n}`;
  const b = p.job && findB(p.job); if (b) return KINDS[b.kind].n;
  return 'frei';
}
function famWork(I, f){
  const ad = famAdults(I, f); if (!ad.length) return 'ohne Erwachsene';
  const by = new Map(); for (const p of ad){ const w = personWork(I, p); by.set(w, (by.get(w) || 0) + 1); }
  return [...by].map(([w, n]) => n > 1 ? `${n}× ${w}` : w).join(', ');
}
/* A tap on a name: the map flies to the person and shows who they are */
function focusPerson(pid){
  const w = walkers.find(q => q.pid === pid);
  const I = islands.find(J => J.people && J.people.some(p => p.id === pid)); if (!I) return;
  if (I.id !== active) setActive(I.id);
  closeSheet();
  if (!w){ toast(`${I.people.find(p => p.id === pid).n} ist gerade im Haus.`, 2600, false); return; }
  markW = w; markUntil = performance.now() + 6000; flyTo(w.x, w.y, Math.max(cam.z, 3.2));
  toast(`${whoIs(w)} · ${whatDoes(w)}`, 3400, false);
}
