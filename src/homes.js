'use strict';
/* ---------- households. Every person belongs to a family (p.h). A family lives in a house, or, while there is none, under
   makeshift shelter by the meeting house. Needs are met family by family: first a roof, food and water. A family whose
   needs are met grows, and an empty house draws a new family. With pots, mats and coconut oil in store a house rises to
   the second step: the house of a tufunga, a master of a craft, with room for six. Work goes by family too, much as in
   Manor Lords: a family works at one place, the others build and carry. Families are named after the woman who founded
   them; Lapita households most likely lived where the women's families lived. */
const HOME_KINDS = new Set(['haus', 'pfahl', 'fale']);
const TIERS = {
  1:{n:'Familie', cap:4, needs:['dach', 'essen', 'wasser']},
  2:{n:'Familie der Tufunga', cap:6, needs:['dach', 'essen', 'wasser', 'toepfe', 'matten', 'oel', 'speisen'], cost:{holz:1, matten:1}},
  3:{n:'Häuptlingsfamilie', cap:8, needs:['dach', 'essen', 'wasser', 'toepfe', 'matten', 'oel', 'speisen', 'tapa', 'schweine', 'kava', 'schmuck', 'feinmatten', 'bemtapa', 'duftoel']}
};
const TIER2_GOODS = ['toepfe', 'matten', 'oel', 'speisen'];
const START_POP = 17;   // five families: each a woman and a man, children, two elders
let nextFam = 1;
const famsOf = I => I.fams || (I.fams = []);
const famOf = (I, id) => famsOf(I).find(f => f.id === id) || null;
const membersOf = (I, f) => (I.people || []).filter(p => p.h === f.id);
const homeOk = (I, b) => !!b && !b.bt && HOME_KINDS.has(b.kind) && !(b.kind === 'pfahl' && unserved(I, b));
const homesOf = I => I.buildings.filter(b => homeOk(I, b));
const tierOf = b => b && b.kind === 'fale' ? 3 : b && b.t === 2 ? 2 : 1;
const CHIEF_GOODS = TIERS[3].needs.filter(k => !TIERS[2].needs.includes(k));
const homeCap = (I, b) => Math.max(TIERS[tierOf(b)].cap, I.lvl === 3 ? CHIEF.cap : 0);
const famOfHome = (I, b) => famsOf(I).find(f => f.home === b.id) || null;
const famName = f => `Familie ${f.n}`;
const famTier = (I, f) => f.home ? tierOf(findB(f.home)) : 1;
const roofless = I => (I.people || []).filter(p => { const f = famOf(I, p.h); return !f || !f.home; }).length;
const tier2Pop = I => famsOf(I).reduce((t, f) => t + (famTier(I, f) >= 2 ? membersOf(I, f).length : 0), 0);
const tier3Pop = I => famsOf(I).reduce((t, f) => t + (famTier(I, f) === 3 ? membersOf(I, f).length : 0), 0);
const chiefFam = I => famsOf(I).find(f => famTier(I, f) === 3) || null;
/* the matriarch: the eldest woman of the chief's family; the chief: its eldest man, her brother or son */
const eldest = (I, f, s) => membersOf(I, f).filter(p => p.s === s && stageOf(p) !== 'kid').sort((a, b) => a.b - b.b)[0] || null;
function newFam(I, name, home = 0){
  // two families of one name on an island are told apart as the elder and the younger
  const used = new Set(famsOf(I).map(f => f.n)); let n = name; if (used.has(n)) n = [name + ' die Jüngere', name + ' von der Küste', name + ' vom Hang'].find(q => !used.has(q)) || name + ' ' + nextFam;
  const f = {id:nextFam++, n, home, job:0}; famsOf(I).push(f); return f;
}

/* The first people of a village: five families, each a woman and a man, children, and here and there an elder */
function seedFamilies(I, n){
  const out = [], k = Math.max(1, Math.min(5, Math.round(n / 3.4))), size = i => Math.floor(n / k) + (i < n % k ? 1 : 0);
  for (let i = 0; i < k; i++){
    let w = person(I, 18 + Math.random() * 16, null, 'f'); for (let t = 0; t < 20 && famsOf(I).some(q => q.n === w.n); t++) w.n = person(I, 0).n;
    const f = newFam(I, w.n), fam = [w];
    if (size(i) > 1) fam.push(person(I, 20 + Math.random() * 16, null, 'm'));
    // the rest of the household: an elder in every other family, the others children
    while (fam.length < size(i)) fam.push(i % 2 === 1 && fam.length === size(i) - 1 ? person(I, 41 + Math.random() * 4, null, 'f') : person(I, 1 + Math.random() * 5));
    for (const p of fam){ p.h = f.id; out.push(p); }
  }
  return out;
}
/* Someone new is placed: into the house that grows (I._growTo), else a family with room, else a family of their own */
function placePerson(I, p){
  const g = I._growTo && findB(I._growTo);
  if (g && homeOk(I, g)){ const f = famOfHome(I, g) || newFam(I, p.n, g.id); p.h = f.id; return; }
  for (const f of famsOf(I)){ const b = f.home && findB(f.home); if (b && membersOf(I, f).length < homeCap(I, b)){ p.h = f.id; return; } }
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
      let name = ps[0].n; for (const J of islands){ const f = J !== I && J.fams && J.fams.find(q => q.id === old); if (f){ name = f.n; break; } }
      const f = newFam(I, name); for (const p of ps) p.h = f.id; ids.add(f.id);
    }
  }
  I.fams = famsOf(I).filter(f => I.people.some(p => p.h === f.id));
  const homes = homesOf(I), byId = new Map(homes.map(b => [b.id, b])), taken = new Set();
  for (const f of I.fams){ if (f.home && (!byId.has(f.home) || taken.has(f.home))) f.home = 0; if (f.home) taken.add(f.home); }
  // a house too full: the youngest grown-ups (and their small children are not split off) found their own family
  for (const f of I.fams.slice()){
    if (!f.home) continue; const m = membersOf(I, f), cap = homeCap(I, byId.get(f.home)); if (m.length <= cap) continue;
    const go = m.filter(p => stageOf(p) !== 'kid').sort((a, b) => b.b - a.b).slice(0, m.length - cap);
    if (!go.length) continue; const nf = newFam(I, go[0].n); for (const p of go) p.h = nf.id;
  }
  // the chief's house: the family whose eldest woman is the eldest of the families of the tufunga moves in
  const fale = homes.find(b => b.kind === 'fale');
  if (fale && !taken.has(fale.id)){
    const by = f => { const w = eldest(I, f, 'f'); return w ? w.b : Infinity; }, f = I.fams.filter(q => q.home && tierOf(byId.get(q.home)) === 2).sort((a, b) => by(a) - by(b))[0] || I.fams.slice().sort((a, b) => by(a) - by(b))[0];
    if (f){ if (f.home) taken.delete(f.home); f.home = fale.id; taken.add(fale.id); }
  }
  // the roofless move into empty houses, the biggest family first
  const empty = homes.filter(b => !taken.has(b.id) && b.kind !== 'fale');
  for (const f of I.fams.filter(q => !q.home).sort((a, b) => membersOf(I, b).length - membersOf(I, a).length)){
    const b = empty.find(q => homeCap(I, q) >= Math.min(membersOf(I, f).length, 4)) || empty[0]; if (!b) break;
    f.home = b.id; taken.add(b.id); empty.splice(empty.indexOf(b), 1);
  }
}
/* Where the village grows next: an empty house draws a new family; else the family with the most room whose needs
   are met. Nobody grows while food or water have run out. */
function growTarget(I, list){
  if (!I.settled || I.pop >= islandMax(I)) return null;
  const out = new Set(list.filter(n => n.state === 'out').map(n => n.k));
  if (out.has('essen') || out.has('wasser') || haveOf(I, 'essen') <= 0 || (I.stock.wasser || 0) <= 0) return null;
  const okFor = t => TIERS[t].needs.every(k => k === 'dach' || !out.has(k));
  const homes = homesOf(I);
  const empty = homes.find(b => !famOfHome(I, b) && b.kind !== 'fale'); if (empty) return empty;
  let best = null, room = 0;
  for (const b of homes){ const f = famOfHome(I, b), r = homeCap(I, b) - membersOf(I, f).length; if (r > room && okFor(tierOf(b))){ best = b; room = r; } }
  return best;
}
/* What a family has and lacks, by the needs of its step */
function famNeeds(I, f, list){
  const t = famTier(I, f), by = new Map(list.map(n => [n.k, n]));
  return TIERS[t].needs.map(k => k === 'dach' ? {k, state:f.home ? 'ok' : 'out'} : {k, state:(by.get(k) || {state:'ok'}).state});
}
/* Rising and falling: a house rises when its family's needs are met and pots, mats and oil are in store; it falls back
   when one of them has run out for half a minute */
function tierTick(I, list, force = false){
  if (tick % 10 && !force) return;
  const out = new Set(list.filter(n => n.state === 'out').map(n => n.k));
  for (const b of homesOf(I)){
    if (tierOf(b) !== 2) continue;
    b.miss = TIER2_GOODS.some(k => out.has(k)) ? (b.miss || 0) + 10 : 0;
    if (b.miss >= 30){ b.t = 1; b.miss = 0; invalidate(); I.staff = null; const f = famOfHome(I, b); if (I.id === active && !awayQuiet) note(`${f ? famName(f) : 'Ein Haus'} hat keine ${TIER2_GOODS.filter(k => out.has(k)).map(k => GN[k]).join(' und ')} mehr und lebt wieder einfach.`); }
  }
  if (!TIER2_GOODS.every(k => (I.stock[k] || 0) > 0) || out.has('essen') || out.has('wasser') || !canPay(I, TIERS[2].cost)) return;
  const b = homesOf(I).filter(q => tierOf(q) === 1 && famOfHome(I, q) && membersOf(I, famOfHome(I, q)).length >= 3).sort((a, q) => a.born - q.born)[0];
  if (!b) return;
  pay(I, TIERS[2].cost); b.t = 2; b.miss = 0; invalidate(); I.staff = null; stats.tufunga = (stats.tufunga || 0) + 1;
  const f = famOfHome(I, b); if (!awayQuiet && I.id === active) toast(`${famName(f)} baut ihr Haus aus: eine Familie der Tufunga, mit Platz für ${TIERS[2].cap}. Sie will ${andList(TIER2_GOODS.map(k => GN[k]))}.`, 4200);
}
/* A family without a roof waits by the meeting house; when no house is being built for a long while, one of them leaves */
function rooflessTick(I){
  const n = roofless(I);
  I.rl = n && !I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind)) ? (I.rl || 0) + 1 : 0;
  if (I.rl >= 90 && I.pop > 3){ I.rl = 0; I._leaveRoofless = true; I.pop--; syncPeople(I); if (!awayQuiet && I.id === active) note(`Ohne Dach ist jemand von ${I.name} fortgezogen. Baut Häuser.`); }
}

/* ---------- work by family. A workplace takes one family; its grown-ups work there, as many as the place has room for,
   the rest of them build and carry. Without the hand of the player the families are sent where they are needed most:
   water and food first, then the sea, wood, crafts and canoes. */
const PLACE_RANK = {essen:0, meer:1, holz:2, handwerk:3, boot:4};
/* Who of a family goes first to a place, as the old accounts tell: women beat bark cloth, plait mats and thatch, make
   the pots and tend the hens; men fish out at sea, dive, fell trees, climb the palms, grind adzes and keep the pigs. */
const WOMEN_WORK = new Set(['flecht', 'deckerin', 'klopf', 'malerin', 'weberin', 'duftoel', 'toepfer', 'pansammler', 'kurkumagarten', 'huehnerhof', 'riff', 'oelhuette']);
const MEN_WORK = new Set(['fisch', 'taucher', 'faeller', 'beil', 'klingen', 'kletterer', 'pferch', 'harzer', 'kalkbrenner', 'umu', 'pflanzer']);
const workOrder = (b, ad) => { const w = WOMEN_WORK.has(b.kind) ? 'f' : MEN_WORK.has(b.kind) ? 'm' : null; return w ? ad.slice().sort((p, q) => (q.s === w) - (p.s === w)) : ad; };
const famAdults = (I, f) => (I.people || []).filter(p => p.h === f.id && isAdult(p));
const placesOf = I => I.buildings.filter(b => !b.bt && (KINDS[b.kind].crew || b.boat > 0) && !unserved(I, b) && !b.fallow);
const autoWork = I => !I.handWork;
function autoAssign(I, places, byJob){
  const fams = famsOf(I), free = fams.filter(f => !f.job && famAdults(I, f).length).sort((a, b) => famAdults(I, b).length - famAdults(I, a).length);
  const low = b => (I.stock[prodOfB(b)] || 0) < 5 ? 0 : 1;
  const open = places.filter(b => !byJob.has(b.id)).sort((a, b) => (PLACE_RANK[catOf(a)] ?? 3) - (PLACE_RANK[catOf(b)] ?? 3) || low(a) - low(b) || a.born - b.born);
  // building sites need hands: one family stays free while something is being built
  const sites = I.buildings.some(b => b.bt && !KINDS[b.kind].plant) || !!I.yard;
  for (const b of open){
    if (!free.length) break;
    if (sites && free.length === 1 && (PLACE_RANK[catOf(b)] ?? 3) > 0) break;
    const f = free.shift(); f.job = b.id; byJob.set(b.id, f);
  }
  // when water or food has no family while crafts or canoes have one, a family moves over
  for (const b of open){
    if (byJob.has(b.id) || catOf(b) !== 'essen' || low(b)) continue;
    const take = places.filter(q => byJob.has(q.id) && (PLACE_RANK[catOf(q)] ?? 3) >= 3).sort((a, q) => (PLACE_RANK[catOf(q)] ?? 3) - (PLACE_RANK[catOf(a)] ?? 3))[0];
    if (!take) break; const f = byJob.get(take.id); byJob.delete(take.id); f.job = b.id; byJob.set(b.id, f);
  }
}
const prodOfB = b => prodOf(b) || KINDS[b.kind].prod || '';
function staff(I){
  const crew = new Map(), crewP = new Map(), sites = [], boats = [], staffed = new Set();
  if (!I.people){ return I.staff = {key:staffKey(I), crew, crewP, sites, yard:0, boats, staffed, free:0, freeP:[], total:workers(I), build:0, short:0}; }
  const places = placesOf(I), pmap = new Map(places.map(b => [b.id, b])), byJob = new Map();
  for (const f of famsOf(I)){ if (f.job && (!pmap.has(f.job) || byJob.has(f.job))) f.job = 0; if (f.job) byJob.set(f.job, f); }
  if (autoWork(I)) autoAssign(I, places, byJob);
  const pool = [];
  for (const f of famsOf(I)){
    const ad = famAdults(I, f), b = f.job && pmap.get(f.job);
    if (!b){ pool.push(...ad); continue; }
    const want = b.boat > 0 ? 1 : KINDS[b.kind].crew, ord = workOrder(b, ad), use = ord.slice(0, want);
    crew.set(b, use.length); crewP.set(b, use.map(p => p.id)); pool.push(...ord.slice(want));
    if (b.boat > 0) boats.push(b); else staffed.add(b);
  }
  // building sites and the canoe house take those without a place, the oldest site first
  for (const b of I.buildings.filter(q => q.bt && !KINDS[q.kind].plant).slice(0, builders(I))){
    if (!pool.length) break; const use = pool.splice(0, SITE_CREW); crew.set(b, use.length); crewP.set(b, use.map(p => p.id)); sites.push(b);
  }
  let yard = 0; const yardB = I.yard && I.buildings.find(b => b.kind === 'werft' && !b.bt);
  if (yardB && pool.length){ const use = pool.splice(0, YARD_CREW); yard = use.length; crew.set(yardB, use.length); crewP.set(yardB, use.map(p => p.id)); }
  const build = sites.reduce((t, b) => t + crew.get(b), 0) + yard + boats.length;
  const short = places.filter(b => !byJob.has(b.id)).length;
  return I.staff = {key:staffKey(I), crew, crewP, sites, yard, boats, staffed, free:pool.length, freeP:pool.map(p => p.id), total:workers(I), build, short};
}
/* The player sends a family to a place, or calls it away; then the island is worked by hand */
function famAssign(I, b){
  const cur = famsOf(I).find(f => f.job === b.id);
  const free = famsOf(I).filter(f => !f.job && famAdults(I, f).length).sort((a, q) => famAdults(I, q).length - famAdults(I, a).length);
  if (!free.length){ toast('Keine Familie ist frei. Ziehe eine woanders ab, oder das Dorf muss wachsen.', 3200, false); return false; }
  if (cur) cur.job = 0;
  if (autoWork(I)){ I.handWork = true; toast('Die Arbeit wird jetzt von Hand verteilt. In der Übersicht geht es zurück auf Automatisch.', 3600, false); }
  free[0].job = b.id; I.staff = null; syncWalkers(); return true;
}
function famRelease(I, b){
  const f = famsOf(I).find(q => q.job === b.id); if (!f) return;
  if (autoWork(I)){ I.handWork = true; toast('Die Arbeit wird jetzt von Hand verteilt. In der Übersicht geht es zurück auf Automatisch.', 3600, false); }
  f.job = 0; I.staff = null; syncWalkers();
}
/* where a family works, in words */
function famWork(I, f){
  const b = f.job && findB(f.job); if (b) return KINDS[b.kind].n;
  const sf = staffOf(I), ad = famAdults(I, f);
  if (ad.some(p => [...sf.crewP].some(([q, ids]) => q.bt && ids.includes(p.id)))) return 'baut';
  return ad.length ? 'frei' : 'ohne Erwachsene';
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
