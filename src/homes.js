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
  2:{n:'Familienhaus', fam:'Familie', cap:6, needs:['dach', 'essen', 'wasser', 'brenn', 'speisen'], cost:{holz:2, faser:3, schnur:2}},
  3:{n:'Meisterhaus', fam:'Meisterfamilie', cap:8, needs:['dach', 'essen', 'wasser', 'brenn', 'speisen', 'toepfe', 'matten', 'oel'], cost:{holz:2, matten:2}},
  4:{n:'Häuptlingshaus', fam:'Häuptlingsfamilie', cap:10, needs:['dach', 'essen', 'wasser', 'brenn', 'speisen', 'toepfe', 'matten', 'oel', 'tapa', 'schweine', 'kava', 'schmuck', 'feinmatten', 'bemtapa', 'duftoel']}
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
  const leak = roofState(b) === 'out' ? 1 : 0;   // under a broken roof one fewer finds a dry place
  if (t === 1) return Math.min(max, 2 + basic) - leak;
  const extra = TIERS[t].needs.filter(k => !['dach', 'essen', 'wasser'].includes(k)), share = extra.filter(have).length / extra.length;
  return Math.min(max, 2 + basic + Math.round(share * (max - 4))) - leak;
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
    for (const p of fam){ p.h = f.id; p.ln = ln; lifeEvent(p, 'kam', first ? 'der Ahnen' : 'zur neuen Insel'); out.push(p); }
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
// the morning meal decides: today's was enough for everyone, and the next morning there will be enough for everyone and
// a family more (MEAL_SPARE)
const MEAL_SPARE = 4;
const surplus = (I, list) => !(I.meal && (I.meal.hungry || I.meal.thirsty)) && ['essen', 'wasser'].every(k => { const n = list.find(q => q.k === k); if (!n) return true; const f = mealFore(I);
  return (k === 'essen' ? f.food : f.water) >= f.n + MEAL_SPARE; });
/* which of food and water does not reach the surplus children and newcomers need ('' when both do) */
const surplusMiss = (I, list) => ['essen', 'wasser'].find(k => !surplus(I, list.filter(n => n.k === k))) || '';
function growTarget(I, list, lean = false){
  if (!I.settled || I.pop >= islandMax(I)) return null;
  const out = new Set(list.filter(n => n.state === 'out').map(n => n.k)), F = mealFore(I);
  if (out.has('essen') || out.has('wasser') || (I.meal && (I.meal.hungry || I.meal.thirsty)) || F.food < F.n || F.water < F.n) return null;   // nobody new while the morning meal falls short
  // children come fastest where there is more than enough: the harvest covers what everyone eats and drinks with some to
  // spare, or the stores are well filled. Without that they still come, seldom (lean), so a village never dies out
  // only because it eats what it grows.
  if (!lean && !surplus(I, list)) return null;
  let best = null, room = 0;
  for (const b of homesOf(I)){
    const t = tierOf(b), f = t >= 2 && famOfHome(I, b); if (!f) continue;
    const m = membersOf(I, f); if (!m.some(p => p.s === 'f' && isAdult(p) && ageOf(p) >= 16 && ageOf(p) < 42) || !m.some(p => p.s === 'm' && isAdult(p) && ageOf(p) >= 16)) continue;
    const r = homeCap(I, b) - m.length; if (r > room){ best = b; room = r; }
  }
  return best;
}
/* Children are born now and then where there is room, more seldom where the families are close kin (see kinFactor) */
const BIRTH_EVERY = 60, LEAN_BIRTH = .3;   // ticks between births on an island where all is well; without a surplus, this share
function birthTick(I, ticks = 1){
  if (I.lastBirth == null) I.lastBirth = tick;
  const nd = needsOf(I); if (!growTarget(I, nd.list, true)){ I.birthAcc = Math.min(I.birthAcc || 0, BIRTH_EVERY / 2); return 0; }
  I.birthAcc = (I.birthAcc || 0) + ticks * kinFactor(I) * (I.joyUntil > tick ? 2 : 1) * zealOf(I).birth * (surplus(I, nd.list) ? 1 : LEAN_BIRTH);
  let n = 0;
  while (I.birthAcc >= BIRTH_EVERY){
    I.birthAcc -= BIRTH_EVERY; const b = growTarget(I, needsOf(I).list, true); if (!b) break;
    I._growTo = b.id; I._birth = true; I.pop++; syncPeople(I); I._growTo = 0; I._birth = false; if (!awayQuiet) heartAt(I, b); n++; I.lastBirth = tick;
  }
  return n;
}
/* why no child comes ('' when one can): what the player can do about it */
function birthWhy(I, list){
  list = list || needsOf(I).list;
  if (I.pop >= islandMax(I)) return '';
  const out = new Set(list.filter(n => n.state === 'out').map(n => n.k));
  if (out.has('essen') || out.has('wasser')) return `${out.has('essen') ? 'Essen' : 'Wasser'} fehlt. Dann kommen keine Kinder.`;
  if (I.meal && (I.meal.hungry || I.meal.thirsty)) return `Beim Morgenmahl fehlte ${I.meal.hungry ? 'Essen' : 'Wasser'}. Dann kommen keine Kinder.`;
  const fh = homesOf(I).filter(b => tierOf(b) >= 2 && famOfHome(I, b));
  if (!fh.length) return 'Kinder kommen nur im Familienhaus. Baut eine Hütte aus.';
  const pair = b => { const m = membersOf(I, famOfHome(I, b)); return m.some(p => p.s === 'f' && isAdult(p) && ageOf(p) >= 16 && ageOf(p) < 42) && m.some(p => p.s === 'm' && isAdult(p) && ageOf(p) >= 16); };
  const withPair = fh.filter(pair); if (!withPair.length) return 'In keinem Familienhaus lebt ein junges Paar. Familien von weit her bringen junge Leute.';
  if (!withPair.some(b => homeCap(I, b) - membersOf(I, famOfHome(I, b)).length > 0)) return 'Die Familienhäuser sind voll. Erfüllt mehr Bedürfnisse, dann ist Platz, oder baut mehr Hütten aus.';
  if (kinFactor(I) < .5) return 'Die Familien sind zu nah verwandt. Neues Blut hilft.';
  return '';
}
const yearsNoChild = I => I.lastBirth == null ? 0 : (tick - I.lastBirth) / YEAR;
/* the people by age: children, grown-ups, the old, and how many grown-ups turn old within five years */
function ageMix(I){
  const P = I.people || [], st = q => P.filter(p => stageOf(p) === q).length;
  return {kid:st('kid'), adult:st('adult'), old:st('old'), soon:P.filter(p => isAdult(p) && ageOf(p) >= OLD_Y - 5).length, oldWork:P.filter(p => stageOf(p) === 'old' && p.job).length};
}
/* What a family has and lacks, by the needs of its step */
function famNeeds(I, f, list){
  const t = famTier(I, f), by = new Map(list.map(n => [n.k, n]));
  return TIERS[t].needs.map(k => k === 'dach' ? {k, state:f.home ? roofState(findB(f.home)) : 'out'} : {k, state:(by.get(k) || {state:'ok'}).state});
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
  if (t === 2) for (const k of MASTER_GOODS) steps.push({k, ok:haveOf(I, k) > 0, t:`${GN[k]} im Lager`, have:haveOf(I, k), need:1});
  for (const [k, v] of Object.entries(T.cost)) steps.push({k, ok:(I.stock[k] || 0) >= v, t:amount(k, v), have:I.stock[k] || 0, need:v});
  return {t:t + 1, T, steps, ready:steps.every(q => q.ok)};
}
const canUpgrade = (I, b, list) => { const u = upgradeSteps(I, b, list); return !!u && u.ready; };
const readyHomes = (I, list) => homesOf(I).filter(b => canUpgrade(I, b, list));
function upgradeHouse(I, b){
  const t = tierOf(b) + 1, f = famOfHome(I, b); if (t > 3 || !f) return false;
  pay(I, TIERS[t].cost); b.t = t; b.miss = 0; b.rw = 0; b.rf = tick; b.blessAt = typeof performance !== 'undefined' ? performance.now() : 0; invalidate(); I.staff = null;
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
/* Roofs wear. Palm thatch lasts a few years on the islands (here four years of the game, 48 minutes). A worn roof
   is mended by the family itself with palm fronds from the store, a family house also takes a piece of wood for the posts.
   A roof nobody mends leaks (Dach undicht), and at last lets the rain in (Dach kaputt): then the family lacks its roof. */
const ROOF = {life:4 * YEAR, mend:.75, leak:1, broken:1.3, keep:4, work:4, crew:2};
const roofCost = b => tierOf(b) >= 2 ? {dach:2, holz:1} : {dach:2};
const roofState = b => !b ? 'out' : (b.rw || 0) >= ROOF.broken ? 'out' : (b.rw || 0) >= ROOF.leak ? 'low' : 'ok';
const roofDue = (I, b) => (b.rw || 0) >= ROOF.mend && !!famOfHome(I, b) && canPay(I, roofCost(b)) && (b.rw >= ROOF.leak || (I.stock.dach || 0) >= roofCost(b).dach + ROOF.keep);   // a roof still tight waits while fronds are few, for building
function roofTick(I, n = 1){
  for (const b of homesOf(I)){
    if (b.bt) continue;
    b.rw = (b.rw || 0) + n / ROOF.life;
    if (awayQuiet && roofDue(I, b)){ pay(I, roofCost(b)); b.rw = 0; b.rf = tick; }   // while you are away it simply happens
  }
}
/* the roofs to be covered anew now, the worst first; someone of the family goes up for a few moments (see staff) */
const roofTodo = I => homesOf(I).filter(b => !b.bt && roofDue(I, b)).sort((a, b) => b.rw - a.rw);
function mendTick(I){
  if (I.storm && I.storm.tie && tick < I.storm.at) return;   // in a storm the roofs are tied, not covered
  const on = presentAt(I);
  for (const b of homesOf(I)){
    if (!(on.get(b) > 0) || (b.rw || 0) < ROOF.mend) continue;
    b.rp = (b.rp || 0) + 1; if (b.rp < ROOF.work) continue;
    b.rp = 0; const c = roofCost(b), f = famOfHome(I, b); if (!canPay(I, c)) continue;
    const was = b.rw >= ROOF.leak; pay(I, c); b.rw = 0; b.rf = tick; I.staff = null; syncWalkers(); invalidate();
    if (I.id === active && !awayQuiet && f) note(`${famName(f)} hat das Dach neu gedeckt${was ? ', es war undicht' : ''}: ${costText(c)}.`);
  }
}
/* A cyclone is announced by the elders, and there is about a minute to tie the roofs down: one person to a house, borrowed
   from their work (the nearest houses first, four at a time), a few moments and one cord of sennit (or two of coconut
   fibre) each. When it comes, tied roofs hold; loose ones tear and leak, one or two houses may be wrecked, a workplace
   too when most roofs were loose. A talisman of kauri resin, cut by the matriarch, keeps the storm off the roofs once. */
const STORM = {warn:30, work:3, crew:4};
const tieCost = I => (I.stock.schnur || 0) >= 1 ? {schnur:1} : (I.stock.faser || 0) >= 2 ? {faser:2} : null;
const stormNear = I => !!I.storm && tick < I.storm.at;
function stormWarn(I, tie){
  if (!I) return; stats.stuerme = (stats.stuerme || 0) + 1;
  I.storm = {at:tick + STORM.warn, tie:!!tie, tied:[], p:{}}; I.staff = null; syncWalkers(); invalidate();
}
/* "Alle an die Dächer!" also later, after waiting first */
function tieRoofs(I){
  const S = I && I.storm; if (!S || tick >= S.at || S.tie) return;
  S.tie = true; I.staff = null; syncWalkers(); invalidate();
  if (!awayQuiet) toast(tieCost(I) ? `Die Leute von ${I.name} laufen zu den Dächern.` : `Zum Festbinden fehlt Schnur oder Kokosfasern.`, 3000, false);
}
function stormTick(I){
  const S = I.storm; if (!S) return;
  if (tick < S.at){
    if (!S.tie) return;
    if (awayQuiet){ for (const h of homesOf(I)){ if (h.bt || S.tied.includes(h.id)) continue; const c = tieCost(I); if (!c) break; pay(I, c); S.tied.push(h.id); } return; }   // while you are away they tie what they can
    const on = presentAt(I);
    for (const h of homesOf(I)){
      if (h.bt || S.tied.includes(h.id) || !(on.get(h) > 0)) continue;
      S.p[h.id] = (S.p[h.id] || 0) + 1;
      if (S.p[h.id] >= STORM.work){ const c = tieCost(I); if (c){ pay(I, c); S.tied.push(h.id); I.staff = null; syncWalkers(); } }
    }
    return;
  }
  I.storm = null; I.staff = null;
  const msg = stormStrike(I, S); cycloneStart(I, 10); syncWalkers();
  if (I.id === active && !awayQuiet){ toast(msg, 6000); sfx && sfx('horn'); } else note(msg);
}
/* What a storm wrecked is built anew with half of what it cost, from the store. What is not there yet the site waits
   for (b.unpaid): nobody builds on it until the wood and fronds are in the store (see payRebuilds). */
function rebuildCost(I, b){
  const c = {}; for (const [k, v] of Object.entries(costOf(b.kind, I))) if (v > 0) c[k] = Math.ceil(v / 2);
  if (!Object.keys(c).length) return; b.unpaid = c; payRebuild(I, b);
}
function payRebuild(I, b){ if (!b.unpaid || !canPay(I, b.unpaid)) return false; pay(I, b.unpaid); delete b.unpaid; I.staff = null; return true; }
function payRebuilds(I){ for (const b of I.buildings) if (b.unpaid && b.bt && payRebuild(I, b) && I.id === active && !awayQuiet) note(`${KINDS[b.kind].n}: Das Holz für den Wiederaufbau ist da.`); }
function stormStrike(I, S){
  const homes = homesOf(I).filter(h => !h.bt), pick = (list, n) => list.slice().sort(() => Math.random() - .5).slice(0, n);
  let loose = homes.filter(h => !S.tied.includes(h.id)), charm = false;
  if (loose.length && (I.stock.talisman || 0) > 0){ I.stock.talisman--; charm = true; loose = []; }
  for (const h of loose){ h.rw = Math.max(h.rw || 0, ROOF.leak); h.rf = tick - AGE_FULL; }
  const wreck = loose.filter(() => Math.random() < .15).slice(0, 2); for (const h of wreck){ h.bt = Math.ceil(KINDS[h.kind].bt / 2); h.rw = 0; rebuildCost(I, h); }   // built anew, with a new roof
  const hit = loose.length > homes.length / 2 && pickOf(I.buildings.filter(b => KINDS[b.kind].crew && !b.bt && !b.at)); if (hit){ hit.bt = Math.ceil(KINDS[hit.kind].bt / 2); rebuildCost(I, hit); }
  const down = pick(I.trees.filter(t => t.st === 0), Math.round(I.trees.filter(t => t.st === 0).length * .06)); for (const t of down){ t.st = 1; t.g = STUMP_TICKS; t.w = 0; }
  if (down.length) treesChanged(I);
  for (const b of I.buildings) if (KINDS[b.kind].soil && !b.bt) b.soil = Math.max(.12, (b.soil ?? 1) - .1);
  const slide = erosionOf(I) && pickOf(I.buildings.filter(b => KINDS[b.kind].soil && !b.bt)); if (slide){ slide.bt = Math.ceil(KINDS[slide.kind].bt / 2); slide.soil = .2; rebuildCost(I, slide); }   // off a bare slope the earth slides
  invalidate(true);
  for (const p of I.people || []) if (isAdult(p)) lifeEvent(p, 'sturm', charm ? 'übersteht einen Sturm, der Talisman hielt die Dächer' : loose.length ? 'übersteht einen Sturm, der Dächer abdeckte' : 'übersteht einen Sturm, die Dächer hielten');
  const held = homes.length - loose.length;
  return `Der Sturm fegt über ${I.name}. ${charm ? `Der Harz-Talisman der Matriarchin hält ihn von den Dächern: alle ${homes.length} Dächer halten.` : `${held} von ${homes.length} Dächern ${held === 1 ? 'hielt' : 'hielten'}.`}${loose.length ? ` ${loose.length} ${loose.length === 1 ? 'Dach ist' : 'Dächer sind'} undicht: Die Familien flicken sie mit Palmwedeln.` : ''}${wreck.length ? ` Zerstört: ${wreck.length === 1 ? 'ein Haus' : `${wreck.length} Häuser`}${hit ? ` und ${KINDS[hit.kind].n}` : ''}, das muss neu gebaut werden.` : hit ? ` ${KINDS[hit.kind].n} ist beschädigt.` : ''}${down.length ? ` ${down.length} ${down.length === 1 ? 'Baum liegt' : 'Bäume liegen'} am Boden.` : ''}${slide ? ` Vom kahlen Hang ist Erde über ${slide.kind === 'pulaka' ? 'eine Pulakagrube' : `ein ${KINDS[slide.kind].n}`} gerutscht.` : ''}`;
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
const MEN_WORK = new Set(['hakenmacher', 'schnitzer', 'fisch', 'taucher', 'faeller', 'beil', 'klingen', 'ernte', 'pferch', 'harzer', 'kalkbrenner', 'pflanzer']);
const workOrder = (b, ad) => { const w = WOMEN_WORK.has(b.kind) ? 'f' : MEN_WORK.has(b.kind) ? 'm' : null; return w ? ad.slice().sort((p, q) => (q.s === w) - (p.s === w)) : ad; };
const famAdults = (I, f) => (I.people || []).filter(p => p.h === f.id && isAdult(p));
const placesOf = I => I.buildings.filter(b => !b.bt && (KINDS[b.kind].crew || b.boat > 0) && !unserved(I, b) && !b.fallow && !(b.grow > 0) && !(KINDS[b.kind].yam && b.ys !== 1) && !(b.nutRest && NUT_PICKS.has(prodOf(b))));   // a growing garden needs nobody yet; a yam field only at planting; palms picked clean wait for nuts
/* how many work at a place: its crew, or one who carves the dugout of a jetty (a jetty has no crew of its own) */
const crewOf = b => KINDS[b.kind].crew || (b.boat > 0 ? 1 : 0);
const autoWork = I => !I.handWork;
const prodOfB = b => prodOf(b) || KINDS[b.kind].prod || '';
/* how much a place is needed now: 0 its good is short, 1 as usual, 2 its store is nearly full */
function needOf(I, places){
  const cap = storeCap(I), outs = b => [prodOfB(b), ...Object.keys(byOf(b) || {}), ...Object.keys(KINDS[b.kind].picks || {})].filter(Boolean);
  const short = new Set(places.map(prodOfB).filter(k => k && (I.stock[k] || 0) < 5));
  for (const b of places) if (short.has(prodOfB(b)) && KINDS[b.kind].use) for (const k of Object.keys(KINDS[b.kind].use)) for (const q of GROUPS[k] || [k]) if ((I.stock[q] || 0) < 5) short.add(q);
  // food and water are short when the next morning meal will not reach everyone and a family more (see mealFore)
  const F = mealFore(I);
  if (haveOf(I, 'essen') < 12 || F.food < F.n + MEAL_SPARE) for (const k of FOODS) short.add(k);
  if ((I.stock.wasser || 0) < 6 || F.water < F.n + MEAL_SPARE) short.add('wasser');
  if ((I.stock.dach || 0) < 4) short.add('dach');
  if ((I.stock.holz || 0) < 4) short.add('holz');
  const full = b => KINDS[b.kind].picks ? Object.keys(KINDS[b.kind].picks).every(k => (I.stock[k] || 0) >= cap * .75) : (I.stock[prodOfB(b)] || 0) >= cap * .75;
  return b => !b ? 1 : b.boat > 0 || outs(b).some(k => short.has(k)) ? 0 : full(b) ? 2 : 1;   // (a resting place is not in the list: as usual)
}
const rankOf = b => PLACE_RANK[catOf(b)] ?? 3;
/* is water or food short for the next morning meal? On below everyone and a family more, off again from three families
   more; looked at once a minute and after the meal, so the borrowed hands do not go back and forth */
function vitalOf(I){
  const V = I.vital || (I.vital = {wasser:false, essen:false});
  if (V.t != null && tick - V.t < 30 && !(I.meal && I.meal.at > V.t)) return V;
  const F = mealFore(I); V.t = tick;
  for (const [k, have] of [['wasser', F.water], ['essen', F.food]]) V[k] = have < F.n + MEAL_SPARE || (V[k] && have < F.n + 3 * MEAL_SPARE);
  return V;
}
/* the best of those free for a place: someone of the family already there, then by the old ways, then who lives nearest */
function pickWorker(I, b, free, here){
  const w = WOMEN_WORK.has(b.kind) ? 'f' : MEN_WORK.has(b.kind) ? 'm' : null, fams = new Set(here.map(p => p.h));
  const hb = b.at && findB(b.at), own = hb ? famOfHome(I, hb) : null;   // a household craft: the family itself first
  const score = p => { const f = famOf(I, p.h), h = f && f.home && findB(f.home); return (own && p.h === own.id ? 300 : 0) + (fams.has(p.h) ? 100 : 0) + (w && p.s === w ? 50 : 0) - (h ? Math.hypot(h.x - b.x, h.y - b.y) : 200) / 10; };
  return free.reduce((m, p) => score(p) > score(m) ? p : m, free[0]);
}
/* Work by standing, as in Anno: the grown-ups of a master family no longer go to the fields, the sea or the forest; they
   work at crafts, canoes and on building sites. Only when food or water have run out does everyone go out again. */
const masterSet = I => new Set((I.people || []).filter(p => { const f = famOf(I, p.h); return f && famTier(I, f) >= 3; }).map(p => p.id));
const lowWork = b => !b.at && rankOf(b) < 3;
function fitOf(I){
  const M = masterSet(I), F = mealFore(I), hunger = F.food < F.n || F.water < F.n;   // the next morning meal falls short
  return (p, b) => hunger || !M.has(p.id) || !lowWork(b);
}
function autoAssign(I, places, at, adults, fit = () => true, away = []){
  const free = adults.filter(p => !p.job), need = needOf(I, places);
  const open = places.slice().sort((a, b) => (b.prio ? 1 : 0) - (a.prio ? 1 : 0) || need(a) - need(b) || rankOf(a) - rankOf(b) || a.born - b.born);   // a called place first
  for (const b of open){
    const l = at.get(b) || []; at.set(b, l);
    while (l.length < crewOf(b) && free.length){
      if (need(b) === 2 && l.length) break;   // a full store does not need more hands
      const cand = free.filter(p => fit(p, b)); if (!cand.length) break;
      const p = pickWorker(I, b, cand, l); free.splice(free.indexOf(p), 1); p.job = b.id; l.push(p);
    }
  }
  // whose own place rests (a garden growing, a field lying fallow) fills a place still open meanwhile, as a loan: they keep
  // their own place and go back to it when it works again
  const idle = away.filter(p => !p.loan);
  for (const b of open){
    const l = at.get(b);
    while (l.length < crewOf(b) && idle.length){
      if (need(b) === 2 && l.length) break;
      const cand = idle.filter(p => fit(p, b)); if (!cand.length) break;
      const p = cand.find(q => q.loanPrev === b.id) || pickWorker(I, b, cand, l); idle.splice(idle.indexOf(p), 1); p.loan = b.id; l.push(p);
    }
  }
  // a place whose good is short (or was a moment ago, so nobody walks to and fro) borrows people from a place whose store
  // is full, or from crafts and canoes. They keep their own place and go back when the shortage is over. A place set to
  // "Bleiben" lends nobody.
  for (const b of open){
    if (!shortish(b, need)) continue;
    const l = at.get(b);
    while (l.length < crewOf(b)){
      const can = p => fit(p, b) && !p.loan;
      const take = places.filter(q => q !== b && !q.prio && !q.keep && !q.at && (at.get(q) || []).some(can) && need(q) > 0 && (need(q) === 2 || rankOf(q) >= 3) && rankOf(q) >= rankOf(b)).sort((a, q) => need(q) - need(a) || rankOf(q) - rankOf(a))[0];
      if (!take) break;
      const tl = at.get(take), c = tl.filter(can), p = c.find(q => q.loanPrev === b.id) || c[c.length - 1]; tl.splice(tl.indexOf(p), 1); p.loan = b.id; l.push(p);
    }
  }
}
/* short now, or short in the last twenty seconds */
const shortish = (b, need) => need(b) === 0 ? (b._short = tick + 10, true) : (b._short || 0) > tick;
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
/* The household craft comes first, either or: its hands come from the family of the house, out of any other work they
   had, else from those without work, else from the place that can wait best. Who works at home works nowhere else. */
function craftFirst(I, places, at, adults){
  const crafts = places.filter(b => b.at); if (!crafts.length) return;
  const need = needOf(I, places), pmap = new Map(places.map(b => [b.id, b]));
  for (const b of crafts){
    const l = at.get(b) || []; at.set(b, l);
    while (l.length < crewOf(b)){
      const hb = findB(b.at), own = hb ? famOfHome(I, hb) : null, fam = own ? adults.filter(p => p.h === own.id && p.job !== b.id) : [];
      const old = (I.people || []).filter(p => stageOf(p) === 'old' && !p.job), oldFam = own ? old.filter(p => p.h === own.id) : [];
      const from = p => p.job && pmap.get(p.job), ok = p => { const q = from(p); return !q || (!q.prio && !q.at); };
      // the old of the house first: they no longer go to the fields, but they still plait and roll sennit
      const p = oldFam[0] || fam.filter(p => !p.job)[0] || fam.filter(ok).sort((x, y) => need(from(y)) - need(from(x)))[0] || old[0] || (adults.some(p => !p.job) ? pickWorker(I, b, adults.filter(p => !p.job), l) : null);
      if (!p) break;
      const q = from(p); if (q){ const m = at.get(q); if (m) m.splice(m.indexOf(p), 1); }
      p.job = b.id; l.push(p);
    }
  }
}
/* Nobody stands about: who is still without work after all places and sites are filled goes as a helper where a good is
   short, then where the store has room. A place takes up to as many helpers as its crew; they make it faster, though not
   as much as a full crew. A full store sends its helpers away again. */
const helpOk = (I, b, need) => !b.at && !(b.boat > 0) && !KINDS[b.kind].trip && !KINDS[b.kind].yam && KINDS[b.kind].crew > 0 && need(b) < 2;
function addHelpers(I, places, at, pool, fit = () => true){
  const help = new Map(); if (!pool.length) return help;
  const need = needOf(I, places), open = places.filter(b => helpOk(I, b, need) && (at.get(b) || []).length >= crewOf(b)).sort((a, b) => need(a) - need(b) || rankOf(a) - rankOf(b) || a.born - b.born);
  if (!open.length) return help;
  const room = b => (at.get(b) || []).length < 2 * crewOf(b), put = (p, b) => { pool.splice(pool.indexOf(p), 1); p.loan = b.id; at.get(b).push(p); help.set(b, (help.get(b) || 0) + 1); };
  // who helped somewhere before stays there
  for (const p of pool.slice()){ const b = p.loanPrev && open.find(q => q.id === p.loanPrev); if (b && room(b) && fit(p, b)) put(p, b); }
  for (const lvl of [0, 1]){
    let go = true;
    while (pool.length && go){
      go = false;
      for (const b of open){ if (!pool.length) break; if (need(b) !== lvl || !room(b)) continue; const c = pool.filter(p => fit(p, b)); if (!c.length) continue; put(p0(I, b, c, at), b); go = true; }
    }
  }
  return help;
}
const p0 = (I, b, pool, at) => pickWorker(I, b, pool, at.get(b) || []);
const makesK = (kind, k) => { const K = KINDS[kind] || {}, m = q => K.prod === q || !!(K.picks && K.picks[q]); return k === 'essen' ? FOODS.some(m) : m(k); };
function staff(I){
  const crew = new Map(), crewP = new Map(), sites = [], boats = [], staffed = new Set(), pulled = new Map();
  if (!I.people) return I.staff = {key:staffKey(I), crew, crewP, sites, yard:0, boats, staffed, pulled, free:0, freeP:[], restP:[], home:new Map(), loan:new Map(), help:new Map(), rest:false, oldAt:new Map(), total:workers(I), build:0, short:0, queue:[]};
  const places = placesOf(I), pmap = new Map(places.map(b => [b.id, b])), at = new Map(), adults = I.people.filter(isAdult), fit = fitOf(I);
  // Everyone keeps their own place (p.job) until the player moves them, the place is gone, or life changes them (grown old,
  // a master family, the craft of their house). Where the place rests for a while (a garden growing, a field lying fallow,
  // the yams out of season) they keep it and help elsewhere meanwhile; building, helping out and the conch only borrow
  // people (p.loan), and they come back by themselves.
  const bmap = new Map(I.buildings.map(b => [b.id, b])), count = new Map(), away = [];
  const workplace = b => !b.bt && (KINDS[b.kind].crew > 0 || b.boat > 0) && !(b.at && !bmap.has(b.at));
  for (const p of I.people){
    p.loanPrev = p.loan || 0; p.loan = 0;
    const b = p.job && bmap.get(p.job);
    if (!isAdult(p) && !(b && b.at && stageOf(p) === 'old')){ p.job = 0; continue; }   // the old still sit at the household craft
    if (!b || !workplace(b) || !fit(p, b)){ p.job = 0; continue; }
    const n = count.get(b) || 0; if (n >= crewOf(b)){ p.job = 0; continue; } count.set(b, n + 1);
    if (pmap.has(b.id)){ const l = at.get(b) || []; l.push(p); at.set(b, l); } else away.push(p);
  }
  craftFirst(I, places, at, adults);
  if (autoWork(I)) autoAssign(I, places, at, adults, fit, away); else autoAssign(I, places.filter(b => b.at), at, adults, fit);   // a household craft finds its hands even when the rest is given by hand
  // a place called with the conch (b.prio) is filled at once: first by whoever is free, then from the place that can wait best
  { const need = needOf(I, places);
    for (const b of places.filter(q => q.prio)){
      const l = at.get(b) || []; at.set(b, l);
      while (l.length < crewOf(b)){
        const free = adults.find(p => !p.job && fit(p, b));
        if (free){ free.job = b.id; l.push(free); continue; }
        const can = p => fit(p, b) && !p.loan, from = places.filter(q => q !== b && !q.prio && !q.keep && !q.at && (at.get(q) || []).some(can)).sort((x, y) => need(y) - need(x) || rankOf(y) - rankOf(x) || y.born - x.born)[0];
        if (!from) break;
        const fl = at.get(from), p = fl.filter(can).pop(); fl.splice(fl.indexOf(p), 1); p.loan = b.id; l.push(p);   // borrowed: back home when the call ends
      }
    } }
  // the morning meal comes first: while the next morning will fall short of water or food, an empty place that makes it
  // borrows hands from a place that can wait (back home when there is enough again; decided once a minute, see vitalOf)
  { const V = vitalOf(I), need = needOf(I, places), stuck = new Set(['full', 'use', 'near', 'trees', 'dep', 'fallow', 'grow', 'yam', 'nuts', 'carving', 'storm', 'rahui']);
    for (const k of ['wasser', 'essen']){ if (!V[k]) continue;
      for (const b of places.filter(q => !q.prio && !q.at && makesK(q.kind, k) && !(q.idle && stuck.has(q.idle.why)))){
        const l = at.get(b) || []; at.set(b, l);
        while (l.length < crewOf(b)){
          const can = p => fit(p, b) && !p.loan, from = places.filter(q => q !== b && !q.prio && !q.keep && !q.at && need(q) !== 0 && (at.get(q) || []).some(can)).sort((x, y) => need(y) - need(x) || rankOf(y) - rankOf(x) || y.born - x.born)[0];
          if (!from) break;
          const fl = at.get(from), p = fl.filter(can).pop(); fl.splice(fl.indexOf(p), 1); p.loan = b.id; l.push(p);
        } } } }
  const pool = away.filter(p => !p.loan).concat(adults.filter(p => !p.job && !p.loan));   // whose place rests first, then who has none
  // the building sites and the canoe house: first who has no work, then the people of the place needed least
  // a site that will make what is running out (water, food) goes first, then huts for those without a roof, then in order
  const F = mealFore(I), shortK = [F.water < F.n + MEAL_SPARE ? 'wasser' : '', F.food < F.n + MEAL_SPARE ? 'essen' : ''].filter(Boolean), urgent = b => shortK.some(k => makesK(b.kind, k)), roofNeed = roofless(I);
  // a site called with the conch comes first of all, and always gets its builders, even beyond the usual number of sites
  const rank = b => b.prio ? -1 : urgent(b) ? 0 : b.kind === 'haus' && roofNeed ? 1 : 2;
  const all = I.buildings.filter(q => q.bt && !KINDS[q.kind].plant && !q.unpaid).sort((a, b) => rank(a) - rank(b) || a.id - b.id), lim = builders(I) + all.filter(q => q.prio).length;   // a called site comes on top, it does not stop one already worked
  const want = all.slice(0, lim).map(b => [b, SITE_CREW]);
  const yardB = I.yard && I.buildings.find(b => b.kind === 'werft' && !b.bt); if (yardB) want.push([yardB, YARD_CREW]);
  let yard = 0;
  if (want.length){
    // whose work can wait best: a full store first, then a good in plenty, crafts before wood, wood before food and water
    const need = needOf(I, places), cap = storeCap(I), plenty = b => (I.stock[prodOfB(b)] || 0) / cap, pull = b => need(b) * 10 + plenty(b) * 5 + rankOf(b);
    // nobody leaves water or food that is running out
    const order = places.filter(b => !b.at && !b.keep && (at.get(b) || []).length && !(need(b) === 0 && rankOf(b) === 0)).sort((a, b) => pull(b) - pull(a) || b.born - a.born);
    // a site keeps its builders until it is done: the same people carry the wood and build it to the end. Before, the
    // crew could change with every count, and whoever was carrying a load dropped it on the way.
    const mem = I.siteCrew || (I.siteCrew = {}); for (const id of Object.keys(mem)) if (!want.some(([w]) => w.id === +id)) delete mem[id];
    const taken = new Set();
    for (const [s, n] of want){
      const use = [];
      for (const pid of mem[s.id] || []){
        if (use.length >= n) break; const p = adults.find(q => q.id === pid); if (!p || taken.has(p)) continue;
        const i = pool.indexOf(p); if (i >= 0){ pool.splice(i, 1); use.push(p); continue; }
        const b = [...at.keys()].find(q => at.get(q).includes(p)), l = b && at.get(b); if (l && !b.prio && !b.at && !b.keep){ l.splice(l.indexOf(p), 1); use.push(p); pulled.set(b, s); }
      }
      use.push(...pool.splice(0, n - use.length));
      // for a site that ends the shortage, or one called with the conch, even a place of a short good gives hands, never one
      // making the same good, never a place called itself
      let from = urgent(s) || s.prio ? places.filter(b => !b.at && !b.keep && (at.get(b) || []).length && !b.prio && !shortK.some(k => makesK(b.kind, k) && makesK(s.kind, k))).sort((a, b) => pull(b) - pull(a) || b.born - a.born) : order.filter(b => !b.prio);
      while (use.length < n){
        const b = from.find(q => (at.get(q) || []).length); if (!b) break;
        const l = at.get(b); use.push(...l.splice(Math.max(0, l.length - (n - use.length)))); pulled.set(b, s);
      }
      for (const p of use){ taken.add(p); p.loan = s.id; }   // builders are borrowed: back to their own place when it is built
      mem[s.id] = use.map(p => p.id);
      if (!use.length) continue;
      crew.set(s, use.length); crewP.set(s, use.map(p => p.id)); if (s === yardB) yard = use.length; else sites.push(s);
    }
  }
  // a storm is coming: the roofs are tied down, one person to a house, the nearest houses first, borrowed from anywhere but
  // a place set to stay; they go back to their work when it is done
  if (I.storm && I.storm.tie && tick < I.storm.at){
    const ctr = centerOf(I) || I.anchor || I.center, needS = needOf(I, places);
    const todo = homesOf(I).filter(h => !h.bt && !I.storm.tied.includes(h.id)).sort((a, b) => Math.hypot(a.x - ctr.x, a.y - ctr.y) - Math.hypot(b.x - ctr.x, b.y - ctr.y)).slice(0, STORM.crew);
    for (const h of todo){
      let p = pool.shift();
      if (!p){ const from = places.filter(b => !b.keep && !b.prio && (at.get(b) || []).some(isAdult)).sort((x, y) => needS(y) - needS(x) || rankOf(y) - rankOf(x))[0];
        if (from){ const l = at.get(from); p = l.filter(isAdult).pop(); l.splice(l.indexOf(p), 1); pulled.set(from, h); } }
      if (!p) break;
      p.loan = h.id; crew.set(h, 1); crewP.set(h, [p.id]);
    }
  }
  // a worn roof: someone of the family that lives under it goes up for a few moments, borrowed from their work; two at a time
  else for (const h of roofTodo(I).slice(0, ROOF.crew)){
    const f = famOfHome(I, h), mine = q => q.h === f.id && isAdult(q); let p = pool.find(mine) || null;
    if (p) pool.splice(pool.indexOf(p), 1);
    else { const e = [...at.entries()].find(([b, l]) => !b.keep && !b.prio && l.some(mine)); if (e){ p = e[1].filter(mine).pop(); e[1].splice(e[1].indexOf(p), 1); } else p = pool.shift() || null; }
    if (!p) continue;
    p.loan = h.id; crew.set(h, 1); crewP.set(h, [p.id]);
  }
  const rest = zealOf(I) === ZEAL[0], help = autoWork(I) && !rest ? addHelpers(I, places, at, pool, fit) : new Map();   // with much free time, who has no place rests instead of helping
  for (const b of places){
    const l = at.get(b) || []; if (!l.length) continue;
    const ord = workOrder(b, l); crew.set(b, ord.length); crewP.set(b, ord.map(p => p.id));
    if (b.boat > 0) boats.push(b); else staffed.add(b);
  }
  const oldAt = new Map(); for (const b of places){ const n = (at.get(b) || []).filter(p => stageOf(p) === 'old').length; if (n) oldAt.set(b, n); }
  const build = sites.reduce((t, b) => t + crew.get(b), 0) + yard;
  const short = places.filter(b => !crew.get(b)).length;
  const home = new Map(); for (const p of I.people) if (p.job){ const b = bmap.get(p.job); if (b){ const l = home.get(b) || []; l.push(p.id); home.set(b, l); } }
  const loan = new Map(); for (const p of adults) if (p.loan) loan.set(p.id, p.loan);
  const freeL = pool.filter(p => !p.job);
  return I.staff = {key:staffKey(I), crew, crewP, sites, yard, boats, staffed, pulled, free:freeL.length, freeP:freeL.map(p => p.id), restP:pool.filter(p => p.job).map(p => p.id), home, loan, help, rest, oldAt, total:adults.length, build, short, queue:all.map(b => b.id)};
}
/* The player sends one more person to a place, or calls one away; then the island is worked by hand */
const handNote = I => { if (autoWork(I)){ I.handWork = true; toast('Die Arbeit wird jetzt von Hand verteilt. In der Übersicht geht es zurück auf Automatisch.', 3600, false); } };
function workAdd(I, b){
  const K = KINDS[b.kind], here = (I.people || []).filter(p => p.job === b.id);
  if (here.length >= crewOf(b)){ toast(`${K.n} hat Platz für ${crewOf(b)}. Alle Plätze sind besetzt.`, 2600, false); return false; }
  const fit = fitOf(I), all = (I.people || []).filter(p => isAdult(p) && !p.job), free = all.filter(p => fit(p, b));
  if (all.length && !free.length){ toast('Frei sind nur Leute aus Meisterfamilien. Sie arbeiten im Handwerk, nicht auf Feld, Meer oder im Wald.', 3600, false); return false; }
  if (!free.length){ toast('Niemand ist frei. Ruf jemanden woanders mit − ab, oder baut Hütten: Dann kommen Familien von weit her.', 3600, false); return false; }
  handNote(I); const p = pickWorker(I, b, free, here); p.job = b.id; I.staff = null; syncWalkers(); return p;
}
function workDel(I, b){
  const here = (I.people || []).filter(p => p.job === b.id); if (!here.length) return false;
  handNote(I); const ids = staffOf(I).crewP.get(b) || [], p = here.find(q => q.id === ids[ids.length - 1]) || here[here.length - 1];
  p.job = 0; I.staff = null; syncWalkers(); return p;
}
/* The player gives someone a new Stammplatz on their sheet. A full place swaps: the last of its own people takes the
   old place in exchange (or is free, when it does not suit them). Nothing else changes: the island stays automatic. */
const jobPlaces = (I, p) => I.buildings.filter(b => !b.bt && KINDS[b.kind].crew > 0 && (!b.at || (findB(b.at) && famOfHome(I, findB(b.at)) && famOfHome(I, findB(b.at)).id === p.h)));
function jobWhy(I, p, b){
  if (!fitOf(I)(p, b)) return 'Meisterfamilie: arbeitet im Handwerk, nicht auf Feld, Meer oder im Wald';
  return '';
}
function chooseJob(I, p, b){
  if (!p || !b || !isAdult(p) || p.job === b.id) return false;
  const why = jobWhy(I, p, b); if (why){ toast(`${placeName(b)}: ${why}.`, 3000, false); return false; }
  const old = p.job && findB(p.job), own = (I.people || []).filter(q => q !== p && q.job === b.id);
  let swap = null;
  if (own.length >= crewOf(b)){ swap = own[own.length - 1]; swap.job = old && fitOf(I)(swap, old) && !old.bt ? old.id : 0; swap.loan = 0; }
  p.job = b.id; p.loan = 0; I.staff = null; syncWalkers();
  return {swap, old};
}
/* where someone works, in words */
function personWork(I, p){
  if (!isAdult(p)){ if (stageOf(p) === 'kid') return 'Kind'; const c = p.job && findB(p.job); return c && c.at ? `alt, ${placeName(c)}` : 'alt'; }
  const sf = staffOf(I), b = p.job && findB(p.job), away = loanWord(I, p);
  if (b) return away ? `${placeName(b)} · ${away}` : (sf.restP || []).includes(p.id) ? `${placeName(b)} · ${restWord(I, b)}` : placeName(b);
  return away || 'frei';
}
/* where someone is borrowed to, in a word or two: building, helping out, called by the conch */
function loanWord(I, p){
  const t = p.loan && findB(p.loan); if (!t) return '';
  if (HOME_KINDS.has(t.kind) && !t.bt) return I.storm && I.storm.tie && tick < I.storm.at ? 'bindet ein Dach fest' : 'deckt das Dach neu';
  if (t.bt) return `baut ${KINDS[t.kind].n}`;
  if (t.kind === 'werft' && I.yard) return `baut ${SHIPS[I.yard.kind].n}`;
  return `hilft bei ${placeName(t)}`;
}
/* why a place rests for a while, so its people do something else meanwhile */
const restWord = (I, b) => b.grow > 0 ? 'wächst noch' : b.fallow ? 'Feld ruht' : KINDS[b.kind].yam && b.ys !== 1 ? 'Pflanzzeit kommt' : unserved(I, b) ? 'wartet aufs Kanu' : 'Pause';
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
  openSheet('person', {id:I.id, p:pid});
}
/* ---------- household crafts. Sennit was rolled on the thigh at home, mats plaited, bark beaten into cloth, pots built up
   from coils of clay: work of the families, not of workshops. A house takes up one craft; whoever does it sits on a mat in
   front of the house, the family itself first. The place still counts: pots only near the clay, mats only with pandanus
   close by, tapa only near a mulberry garden. Inside, a craft is a small workplace that belongs to its house (b.at) and
   works like the old workshop: same hands, same recipe. */
const craftOf = (I, h) => I.buildings.find(b => b.at === h.id) || null;
const placeName = b => b.at ? KINDS[b.kind].craft : KINDS[b.kind].n;
const craftSpot = h => { const s = h.v && h.v.mirror ? -1 : 1; return {x:h.x + s * (KINDS[h.kind].r + 4), y:h.y + 5}; };
const doIt = k => KINDS[k].craft ? `Lass eine Familie ${CRAFT_DO[k] || KINDS[k].craft}` : `Baue ${KINDS[k].n}`;
/* what speaks against a craft on this island at all ('' when nothing does) */
function craftIsle(I, k){
  const K = KINDS[k];
  if (!K.on.includes(I.type)) return K.on.includes('hoch') ? 'nur auf hohen Inseln' : 'nur auf Atollen';
  if (!unlocked(k)){ const st = STAGES[stageOfKind(k)]; return st && st.gate ? `erst mit ${st.n}` : st ? `erst ab ${st.pop} Menschen` : 'noch nicht'; }
  if (SPEC_OF_KIND[k] && specOf(I) !== SPEC_OF_KIND[k]) return `nur auf Inseln mit ${SPECS[SPEC_OF_KIND[k]].n}`;
  if (!hasLife(I, k)) return lifeMissing(I, k);
  if (K.dep && !depsOf(I, K.dep).length) return `auf ${I.name} gibt es keinen ${DEPOSITS[K.dep].n}`;
  return '';
}
const craftsHere = I => CRAFT_KINDS.filter(k => !craftIsle(I, k));
/* and against it in this house: its place */
function craftWhy(I, h, k){
  const K = KINDS[k], why = craftIsle(I, k); if (why) return why;
  const p = craftSpot(h);
  if (K.dep && !depNear(I, K.dep, p.x, p.y, K.depR)) return `nur in einem Haus nah am ${DEPOSITS[K.dep].n}`;
  if (K.near && nearCount(I, K.near.kind, p.x, p.y, K.near.r) < K.near.n) return `braucht ${K.near.n} ${NEAR_PL[K.near.kind]} nah am Haus`;
  return '';
}
const placeWhy = (I, k) => { const K = KINDS[k]; return !craftIsle(I, k) && (K.dep || K.near); };   // a house elsewhere would do
/* where a house for a craft would have to stand: by the clay, among the pandanus, beside the mulberry */
function craftPlace(I, k){
  const K = KINDS[k];
  if (K.dep){ const d = depsOf(I, K.dep)[0]; return d ? {x:d.x, y:d.y + 10} : null; }
  if (K.near){ const kinds = [].concat(K.near.kind), src = I.buildings.filter(b => kinds.includes(b.kind) && !b.bt); if (!src.length) return null;
    return src.reduce((m, q) => nearCount(I, K.near.kind, q.x, q.y, K.near.r * .7) > nearCount(I, K.near.kind, m.x, m.y, K.near.r * .7) ? q : m); }
  return null;
}
function setCraft(I, h, k){
  const old = craftOf(I, h); if (old) I.buildings = I.buildings.filter(b => b !== old);
  if (k && !(old && old.kind === k) && !craftWhy(I, h, k)){ const b = addB(I, k, craftSpot(h), {}, tick); b.at = h.id; }
  I.staff = null; syncWalkers(); invalidate();
}
/* The village centre: the house by the plaza, the first one of the village. The family that founded the village lives in
   it, and there the village keeps its stores, holds its feasts, dances for rain and throws the knucklebones. Moved away
   or gone, the house next to the plaza takes its place. */
function centerOf(I){
  if (!I || !I.settled) return null;
  if (I._cz && I._cz.t === tick && I._cz.n === I.buildings.length) return I._cz.b;
  const pz = I.buildings.find(b => b.kind === 'platz'), hs = I.buildings.filter(b => HOME_KINDS.has(b.kind) && !b.bt);
  const b = !hs.length ? null : pz ? hs.reduce((m, q) => Math.hypot(q.x - pz.x, q.y - pz.y) < Math.hypot(m.x - pz.x, m.y - pz.y) ? q : m) : hs.reduce((m, q) => q.id < m.id ? q : m);
  I._cz = {t:tick, n:I.buildings.length, b}; return b;
}
/* a craft goes with its house: moved with it, gone with it */
function cleanCrafts(I){ if (I.buildings.some(b => b.at && !I.buildings.some(h => h.id === b.at))){ I.buildings = I.buildings.filter(b => !b.at || I.buildings.some(h => h.id === b.at)); I.staff = null; } }
/* What a family makes at home has no workshop of its own any more: an old workshop from an earlier game moves into the
   nearest house without a craft, best one where the craft may stand, else the nearest at all; the workshop goes. */
function oldShops(I){
  const shops = I.buildings.filter(b => KINDS[b.kind] && KINDS[b.kind].craft && !b.at); if (!shops.length) return;
  for (const s of shops){
    I.buildings = I.buildings.filter(b => b !== s); I.staff = null;
    if (s.bt) continue;   // a workshop not yet built is simply given up
    const homes = I.buildings.filter(h => HOME_KINDS.has(h.kind) && !h.bt && !craftOf(I, h)).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
    const h = homes.find(q => !craftWhy(I, q, s.kind)) || homes[0];
    if (!h){ if (I.id === active) note(`${KINDS[s.kind].n} ist aufgelöst: ${KINDS[s.kind].craft} macht jetzt eine Familie zu Hause. Alle Häuser haben schon ein Hauswerk.`); continue; }
    const b = addB(I, s.kind, craftSpot(h), {}, tick); b.at = h.id; if (s.prio) b.prio = true;
    for (const p of I.people || []) if (p.job === s.id) p.job = 0;
    if (I.id === active) note(`${KINDS[s.kind].n} ist jetzt Hauswerk: ${KINDS[s.kind].craft} bei ${(f => f ? famName(f) : 'einer Familie')(famOfHome(I, h))}.`);
  }
  syncWalkers(); invalidate();
}
function moveCraft(I, h){ const c = craftOf(I, h); if (!c) return; if (craftWhy(I, h, c.kind)){ setCraft(I, h, null); return; } const p = craftSpot(h); c.x = p.x; c.y = p.y; }
