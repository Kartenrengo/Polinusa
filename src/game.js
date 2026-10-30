'use strict';
/* Game logic: economy, building sites, people, input, main loop and start */

/* ---------- settling, clans and gifts (the canoes themselves live in fleet.js) */
const routeIndex = (a, b) => routes.findIndex(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
/* Each colony after the first two needs more standing: people follow a chief they respect */
const manaNeeded = () => Math.max(0, islands.filter(I => I.settled).length - 2) * MANA_PER_COLONY;
/* Settlers land: the island gets its first house and a cord to where they came from */
function settle(T, S, o){
  T.discovered = true; T.settled = true; T.pop = o.pop; T.lvl = 1; T.stock = {...emptyStock(), ...o.stock};
  const r = rng(T.center.x | 0);
  if (!T.buildings.length){
    if (T.atoll) seedAtollPlants(T, r);
    else { palmsAlong(T, r, 16);
      for (let i = 0; i < 4; i++){ const a = r() * TAU, p = {x:T.center.x + Math.cos(a) * 64, y:T.center.y + Math.sin(a) * 46}; if (!check('baum', T, p.x, p.y)) addB(T, 'baum', p, {scale:fx(.9 + r() * .15)}, tick - 60); } }
  }
  const hs = findSpot(T, 'haus', homeSpot(T)); if (hs) addB(T, 'haus', hs, variant('haus'), tick);
  if (S && routeIndex(S.id, T.id) < 0) routes.push({a:S.id, b:T.id, knots:1, lastGift:tick, plan:{a:{}, b:{}}});
  renderAll(); setActive(T.id); renderBuildBar(); flyTo(T.center.x, T.center.y, 1.3); save(); checkQuest();
  toast(`Auf ${T.name} steht das erste Haus.${S ? ` Eine Schnur führt nach ${S.name}.` : ''}`, 4200);
}
/* A gift is not paid for. The clan remembers it and answers later with what they make; trust (knots) makes the answer richer. */
function receiveGift(T, cargo, from, r){
  const C = T.clan, worth = giftValue(C, cargo);
  T.debt = (T.debt || 0) + worth * returnRate(r.knots);
  r.knots = Math.min(12, r.knots + 1 + (cargo.schmuck ? 1 : 0)); r.lastGift = tick; stats.gaben++;
  T.lastFrom = from; if (!(T.returnAt > tick)) T.returnAt = tick + 15 + Math.round(Math.random() * 10);
  mana += Math.min(4, Math.round(worth / 4)) + 1; invalidate();
  toast(`Der ${C.name} nimmt eure Gabe an. Die Gegengabe kommt später. ${r.knots} Knoten Vertrauen.`, 4200);
}
function answerGifts(){
  for (const T of islands){
    if (!T.clan || !T.discovered || !(T.debt >= 1) || tick < (T.returnAt || 0) || !isl(T.lastFrom)) continue;
    const {cargo, left, load} = returnGoods(T.clan, T.debt);
    if (!load){ T.returnAt = 0; continue; }
    T.debt = Math.max(0, left); T.returnAt = T.debt >= 1 ? tick + 20 : 0;
    clanShip(T, T.lastFrom, cargo, false);
  }
}

/* ---------- people. Every resident is a figure: the workers at their places, those without work about the village,
   children and the old. You see them close up only, but the work goes on when you look away. */
const JOB_LOAD = {taro:'taro', pulaka:'taro', kavagarten:'taro', baum:'frucht', fisch:'fisch', riff:'muschel', toepfer:'topf', beil:'stein', flecht:'matte', schnur:'rolle', gaergrube:'paket', klingen:'obsidian', klopf:'tapa', pferch:'taro', schmuck:'muschel'};
const landOf = (I, p) => I.lands.indexOf(landAt(I, p));
const landOfB = (I, b) => b._lk === b.x + b.y ? b._l : (b._lk = b.x + b.y, b._l = landOf(I, b));   // buildings stay put, so this is kept
const lived = I => I.settled || (I.clan && I.discovered);
const popOf = I => I.settled ? I.pop : I.clan ? I.clan.pop : 0;
const rnd = r => (Math.random() - .5) * 2 * r;
/* What one worker at a place does: builders fetch the wood from the store and then build, the canoe builders too,
   a fisher first carves his dugout, woodcutters fell their tree, planters carry a sapling, fishers paddle out,
   reef gatherers wade in the shallows, everyone else carries what the workplace makes to the store. */
function jobFor(I, b, i){
  const K = KINDS[b.kind], side = i % 2 ? -1 : 1, job = (type, x, y, more) => ({key:type + ':' + b.id + '#' + i, type, b, x, y, ...more});
  if (b.bt) return job('site', b.x + 6 * side, b.y + 5, {tool:'toki'});
  if (b.kind === 'werft' && I.yard){ const h = yardSpot(b); return job('yard', h.x + (i - 1) * 7, h.y + 3, {tool:'toki'}); }
  if (b.boat > 0){ const h = dugSpot(b); return job('carve', h.x + 3, h.y + 2, {tool:'toki'}); }
  if (b.kind === 'faeller'){ const t = b.cutAt && b.cutAt.st === 0 ? b.cutAt : treesNear(I, b.x, b.y, K.trees.r)[i]; return t ? job('chop', t.x + 4, t.y + 3, {load:'holz', tool:'toki'}) : job('wait', b.x + 5 * side, b.y + 6, {tool:'toki'}); }
  if (b.kind === 'pflanzer'){ const t = b.plantAt && b.plantAt.st === 2 ? b.plantAt : null; return job('plant', b.x, b.y + 4, {drop:t ? {x:t.x + 3, y:t.y + 2} : {x:b.x + 26, y:b.y + 8}, load:'setzling', tool:'ko'}); }
  if (b.kind === 'fisch') return job('fish', b.x + 3 * side, b.y + 4, {load:'fisch', tool:'speer'});
  if (b.kind === 'riff'){ const w = waterNear(I, b); return job('wade', w.x + 3 * side, w.y, {load:'muschel'}); }
  return job('carry', b.x + side * 4 * i, b.y + 4, {load:JOB_LOAD[b.kind] || null, tool:catOf(b) === 'essen' ? 'ko' : null});
}
const yardSpot = b => ({x:b.x + 11, y:b.y + 12});
const dugSpot = b => b.kind === 'steg' ? {x:b.x + 2, y:b.y + 7} : {x:b.x - 9, y:b.y + 7};
/* A clan's village: its people carry from their workshops, about one figure for six people */
function clanJobs(I){
  const jobs = []; for (const b of I.buildings) if (JOB_LOAD[b.kind] && !b.bt) jobs.push({key:'carry:' + b.id, type:'carry', b, x:b.x, y:b.y + 4, load:JOB_LOAD[b.kind]});
  return jobs.slice(0, Math.round(popOf(I) / 6));
}
/* ---------- the lagoon: stilt houses, fish traps and workplaces on an islet without houses are reached by dugout.
   Each jetty has one dugout and serves four of them, the oldest first. A jetty serves only once its dugout is carved. */
function lagoonOf(I){
  const key = I.buildings.map(b => b.bt ? 0 : b.x + b.y + (b.boat > 0 ? .5 : 0)).join();
  if (I._lg && I._lg.key === key) return I._lg;
  const homes = new Set(I.buildings.filter(b => !b.bt && (b.kind === 'haus' || b.kind === 'halle')).map(b => landOf(I, b)));
  const far = b => !!I.atoll && !KINDS[b.kind].water && !!KINDS[b.kind].crew && homes.size > 0 && !homes.has(landOf(I, b));
  const need = I.buildings.filter(b => !b.bt && (KINDS[b.kind].water || far(b)));
  const jetties = I.buildings.filter(b => b.kind === 'steg' && !b.bt && !(b.boat > 0));
  return I._lg = {key, need, jetties, served:new Set(need.slice(0, jetties.length * KINDS.steg.serves)), far:new Set(need.filter(far))};
}
const unserved = (I, b) => { const lg = lagoonOf(I); return lg.need.includes(b) && !lg.served.has(b); };
/* ---------- work force, much as in Manor Lords. About seven in ten people can work; children and the old do not.
   Work is handed out in the order the island's priorities give: building, staple food, fish and sea, wood, canoes, crafts;
   within each the oldest place first. Whoever builds is missing from what comes later and goes back once the site is done.
   Each workplace can be held to fewer workers than it has room for. */
const WORK_SHARE = .7, GROW_EVERY = 3;   // a new person moves in every third tick while there is room and nothing is missing
const workers = I => Math.round(I.pop * WORK_SHARE);
const builders = I => 1 + Math.floor(I.pop / 10);   // sites worked at the same time
const PRIO = [{id:'bau', n:'Bauen'}, {id:'essen', n:'Grundnahrung'}, {id:'meer', n:'Fisch und Meer'}, {id:'holz', n:'Holz'}, {id:'boot', n:'Kanubau'}, {id:'handwerk', n:'Handwerk'}];
const prioOf = I => I.prio && I.prio.length === PRIO.length ? I.prio : (I.prio = PRIO.map(q => q.id));
const catOf = b => { const K = KINDS[b.kind]; return K.prod === 'nahrung' ? 'essen' : K.prod === 'fisch' || K.prod === 'meeres' ? 'meer' : b.kind === 'faeller' || b.kind === 'pflanzer' ? 'holz' : b.kind === 'steg' || b.kind === 'werft' ? 'boot' : 'handwerk'; };
const capOf = b => { const K = KINDS[b.kind], mc = b.v && b.v.mc; return mc == null ? K.crew || 0 : Math.min(K.crew || 0, mc); };
function staff(I){
  let free = workers(I); const crew = new Map(), sites = [], boats = [], staffed = new Set(), cats = {}; let yard = 0;
  const give = (b, want, cat) => { const n = Math.max(0, Math.min(want, free)); cats[cat] = cats[cat] || {used:0, want:0}; cats[cat].want += want; if (n){ crew.set(b, (crew.get(b) || 0) + n); free -= n; cats[cat].used += n; } return n; };
  const siteList = I.buildings.filter(b => b.bt && !KINDS[b.kind].plant).slice(0, builders(I));
  const yardB = I.yard && I.buildings.find(b => b.kind === 'werft' && !b.bt);
  for (const cat of prioOf(I)){
    if (cat === 'bau'){ for (const b of siteList) if (give(b, SITE_CREW, cat)) sites.push(b); continue; }
    if (cat === 'boot'){
      if (yardB) yard = give(yardB, YARD_CREW, cat);
      for (const b of I.buildings) if (b.kind === 'steg' && b.boat > 0 && !b.bt && give(b, 1, cat)) boats.push(b);
      continue;
    }
    for (const b of I.buildings.filter(q => KINDS[q.kind].crew && !q.bt && catOf(q) === cat)){
      if (b.boat > 0){ if (give(b, 1, cat)) boats.push(b); continue; }   // first the fisher carves his dugout
      if (unserved(I, b)) continue;
      if (give(b, capOf(b), cat)) staffed.add(b);
    }
  }
  const build = sites.reduce((t, b) => t + crew.get(b), 0) + yard + boats.length;
  const short = I.buildings.filter(b => KINDS[b.kind].crew && !b.bt && !(b.boat > 0) && (crew.get(b) || 0) < capOf(b) && !unserved(I, b)).length;
  return I.staff = {key:staffKey(I), crew, sites, yard, boats, staffed, cats, free, total:workers(I), build, short};
}
const staffKey = I => [tick, I.pop, I.buildings.length, I.buildings.filter(b => b.bt).length, I.buildings.filter(b => b.boat > 0).length, !!I.yard, prioOf(I).join(), I.buildings.reduce((t, b) => t + ((b.v && b.v.mc) != null ? b.v.mc + 1 : 0), 0)].join();
const staffOf = I => I.staff && I.staff.key === staffKey(I) ? I.staff : staff(I);
const activeSites = I => staffOf(I).sites;
const crewAt = (I, b) => staffOf(I).crew.get(b) || 0;
function storeNear(I, p){
  // the nearest store or meeting house on the same piece of land, else a house there; on an atoll the lagoon is in the way,
  // so only when there is none they paddle over to another islet
  const L = landOf(I, p), st = I.buildings.filter(b => !b.bt && (b.kind === 'speicher' || b.kind === 'halle')), hs = I.buildings.filter(b => !b.bt && b.kind === 'haus');
  const pool = [st.filter(b => landOfB(I, b) === L), hs.filter(b => landOfB(I, b) === L), st, hs].find(l => l.length);
  if (!pool) return null;
  const b = pool.reduce((m, q) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(m.x - p.x, m.y - p.y) ? q : m);
  return {x:b.x + rnd(5), y:b.y + 4 + Math.random() * 4};
}
/* What builders work on: a building site, the canoe at the canoe house, or a dugout. The wood comes first: each builder
   carries one piece from the store, and the work only gets as far as the wood that is already there. */
function workOf(I, j){
  let W = null;
  if (j.type === 'site' && j.b.bt) W = {o:j.b, f:'bt', all:KINDS[j.b.kind].bt, need:costOf(j.b.kind, I).holz || 0, crew:SITE_CREW};
  else if (j.type === 'yard' && I.yard) W = {o:I.yard, f:'left', all:SHIPS[I.yard.kind].bt, need:SHIPS[I.yard.kind].cost.holz || 0, crew:YARD_CREW};
  else if (j.type === 'carve' && j.b.boat > 0) W = {o:j.b, f:'boat', all:KINDS[j.b.kind].canoe, need:0, crew:1};
  if (W && W.o.got == null) W.o.got = Math.max(0, Math.ceil(W.need * (1 - W.o[W.f] / W.all) - 1e-6));   // a site from an older game
  return W;
}
const BUILD_JOBS = new Set(['site', 'yard', 'carve']);
const woodFloor = W => W.need ? W.all * (1 - Math.min(1, W.o.got / W.need)) : 0;
const woodOnWay = (I, j) => walkers.reduce((t, w) => t + (w.isl === I.id && w.job && w.job.type === j.type && w.job.b === j.b && (w.leg === 'fetch' || w.leg === 'bring') ? 1 : 0), 0);
/* Who is really there: a worker counts once they have reached their place */
function presentAt(I){
  const m = new Map(); for (const w of walkers) if (w.isl === I.id && w.on && w.job) m.set(w.job.b, (m.get(w.job.b) || 0) + 1);
  return m;
}
/* ---------- people as figures. On your islands every resident is one: each worker stands for one place at one workplace;
   when work moves, the same person walks over. The rest of the grown-ups have no work and stroll about, children play,
   the old sit in front of the houses. Only in a very big village do some stay at home. */
const MAX_FIG = 80;
const PEOPLE_NAMES = ['Tama', 'Hina', 'Manu', 'Lupe', 'Fetu', 'Lagi', 'Vai', 'Niu', 'Ula', 'Talo', 'Moana', 'Nalu', 'Pua', 'Toa', 'Ata', 'Ao', 'Kula', 'Mahina', 'Tane', 'Ika', 'Fala', 'Tui', 'Sina', 'Lani', 'Kai', 'Ola', 'Rua', 'Tasi', 'Koa', 'Lea', 'Hoku', 'Malu', 'Fai', 'Rehu', 'Tiare', 'Nohea', 'Siva'];
let nameNo = 0, initSync = false;
function spawnFig(I, homes, role, at){
  const h = homes[Math.floor(Math.random() * homes.length)], n = nameNo++;
  const w = {isl:I.id, name:PEOPLE_NAMES[(n * 7 + (I.center.x | 0)) % PEOPLE_NAMES.length], look:figureLook(n * 7919 + I.center.x | 0), role, child:role === 'kid', old:role === 'old',
    x:h.x + 4, y:h.y + 5, tx:h.x + 4, ty:h.y + 5, job:null, leg:'free', carry:null, wait:Math.random() * 800, phase:0, left:false, moving:false, on:false, bout:false};
  // at the start everyone is already about the village
  const p = at || (initSync && homes[Math.floor(Math.random() * homes.length)]);
  if (p){ w.x = w.tx = p.x + rnd(8); w.y = w.ty = p.y + 5 + Math.random() * 4; }
  walkers.push(w); return w;
}
function setJob(I, w, j){
  Object.assign(w, {job:j, role:'work', carry:null, bout:false, busy:null, sit:false, sea:false, paddle:false, wait:0});
  if (initSync){ w.on = true; w.leg = 'work'; w.wait = Math.random() * 1500; return; }   // already at work
  w.on = false; w.leg = 'go'; goTo(I, w, j.x, j.y);
}
function freeFig(w){ Object.assign(w, {job:null, role:'idle', on:false, leg:'free', carry:null, bout:false, busy:null, sea:false}); }
function syncWalkers(){
  for (const I of islands){
    const mine = walkers.filter(w => w.isl === I.id);
    const homes = lived(I) ? I.buildings.filter(b => !KINDS[b.kind].water && KINDS[b.kind].roof && !b.bt) : [];
    if (!homes.length){ if (mine.length) walkers = walkers.filter(w => w.isl !== I.id); I.inside = 0; continue; }
    let slots = [], idle, kids, old;
    if (I.settled){
      const sf = staffOf(I);
      for (const [b, n] of sf.crew) for (let i = 0; i < n; i++) slots.push(jobFor(I, b, i));
      const rest = Math.max(0, I.pop - sf.total); idle = sf.free; kids = Math.round(rest * .6); old = rest - kids;
    } else { slots = clanJobs(I); const p = popOf(I); idle = Math.max(1, Math.round(p / 9)); kids = clamp(Math.round(p / 9), 0, 4); old = Math.min(2, Math.round(p / 15)); }
    // a very big village: some stay in their houses, the old first
    let over = slots.length + idle + kids + old - MAX_FIG; I.inside = Math.max(0, over);
    const cut = n => { const d = clamp(over, 0, n); over -= d; return n - d; };
    old = cut(old); idle = cut(idle); kids = cut(kids); if (over > 0) slots.length -= over;
    const keep = new Set(), want = new Map(slots.map(j => [j.key, j])), loose = [];
    for (const w of mine){ if (w.child || w.old) continue; const j = w.job && want.get(w.job.key); if (j){ w.job = j; want.delete(j.key); keep.add(w); } else loose.push(w); }
    // a new place takes someone who has just lost theirs, from the same place if there is one, else the nearest, so you see them walk over
    for (const j of want.values()){
      let bi = -1, bd = Infinity;
      loose.forEach((w, i) => { const d = (w.job && w.job.b === j.b ? 0 : 1e6) + Math.hypot(w.x - j.x, w.y - j.y); if (d < bd){ bd = d; bi = i; } });
      const w = bi >= 0 ? loose.splice(bi, 1)[0] : spawnFig(I, homes, 'work', initSync && j);
      setJob(I, w, j); keep.add(w);
    }
    for (let i = 0; i < idle; i++){ const w = loose.shift() || spawnFig(I, homes, 'idle'); if (w.role !== 'idle') freeFig(w); keep.add(w); }
    const fit = (list, n, role) => { list.slice(0, n).forEach(w => keep.add(w)); for (let i = list.length; i < n; i++) keep.add(spawnFig(I, homes, role)); };
    fit(mine.filter(w => w.child), kids, 'kid'); fit(mine.filter(w => w.old), old, 'old');
    if (keep.size !== mine.length) walkers = walkers.filter(w => w.isl !== I.id || keep.has(w));
  }
  syncCritters();
}
function spawnWalkers(){ walkers = []; critters = []; initSync = true; try { syncWalkers(); } finally { initSync = false; } }
/* Who someone is and what they do, for a tap on a figure */
function whatDoes(w){
  const I = isl(w.isl), j = w.job;
  if (w.child) return 'Kind'; if (w.old) return 'alt, arbeitet nicht mehr'; if (!j) return 'hat gerade keine Arbeit';
  const K = KINDS[j.b.kind], way = !w.on ? 'auf dem Weg' : w.leg === 'fetch' ? 'holt Holz' : w.leg === 'bring' ? 'bringt Holz' : w.sea ? 'auf See' : w.leg === 'store' && w.carry && j.type !== 'plant' ? 'bringt es ins Lager' : '';
  const what = j.type === 'site' ? `Bau ${K.n}` : j.type === 'yard' && I.yard ? `Kanuhaus, ${SHIPS[I.yard.kind].n}` : j.type === 'carve' ? `${K.n}, schnitzt den Einbaum` : K.n;
  return what + (way ? ' · ' + way : '');
}
function hitWalker(p){
  if (cam.z <= PEOPLE_Z) return null;
  let best = null, bd = Math.max(4, 12 / cam.z);
  for (const w of walkers){ if (w.sea || !isl(w.isl).settled) continue; const d = Math.hypot(p.x - w.x, p.y - (w.y - 5)); if (d < bd){ bd = d; best = w; } }
  return best;
}
let markW = null, markUntil = 0;   // the person you tapped wears a small mark for a while
/* ---------- the animals the Lapita settlers brought in their canoes: pigs, dogs and chickens. They roam the village. */
let critters = [];
const CRITTER = {dog:{v:.011, wait:[900, 2800], r:36}, chicken:{v:.005, wait:[300, 1500], r:26}, pig:{v:.0032, wait:[1600, 4200], r:30}};
function syncCritters(){
  for (const I of islands){
    const mine = critters.filter(a => a.isl === I.id), homes = lived(I) ? I.buildings.filter(b => !b.bt && (b.kind === 'haus' || b.kind === 'halle')) : [];
    const pens = lived(I) ? I.buildings.filter(b => b.kind === 'pferch' && !b.bt).length : 0, pop = popOf(I);
    const want = homes.length ? {dog:clamp(Math.ceil(pop / 12), 1, 3), chicken:clamp(Math.ceil(pop / 6), 1, 6), pig:Math.min(4, pens + (I.clan ? 1 : 0))} : {dog:0, chicken:0, pig:0};
    for (const kind of Object.keys(CRITTER)){
      const have = mine.filter(a => a.kind === kind);
      for (let i = have.length; i < want[kind]; i++){ const h = homes[Math.floor(Math.random() * homes.length)]; critters.push({isl:I.id, kind, home:h, x:h.x + (Math.random() - .5) * 12, y:h.y + 7, tx:h.x, ty:h.y + 7, wait:Math.random() * 2000, left:Math.random() < .5, moving:false, phase:0, peck:0}); }
      if (have.length > want[kind]){ const drop = new Set(have.slice(want[kind])); critters = critters.filter(a => !drop.has(a)); }
    }
  }
  critters = critters.filter(a => isl(a.isl).buildings.includes(a.home));
}
function stepCritters(dt){
  for (const a of critters){
    const C = CRITTER[a.kind]; a.moving = false;
    if (a.wait > 0){ a.wait -= dt; if (a.kind === 'chicken' && a.peck <= 0 && Math.random() < dt / 600) a.peck = 260; a.peck -= dt; continue; }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
    if (d < 1){
      const I = isl(a.isl), L = landOf(I, a.home); let p = null;
      // now and then a dog trots after someone
      if (a.kind === 'dog' && Math.random() < .4){ const w = walkers.find(q => q.isl === a.isl && !q.sea && !q.paddle && Math.hypot(q.x - a.x, q.y - a.y) < 70); if (w) p = {x:w.x - 6, y:w.y + 2}; }
      for (let i = 0; !p && i < 6; i++){ const q = {x:a.home.x + (Math.random() - .5) * 2 * C.r, y:a.home.y + 7 + (Math.random() - .5) * C.r}; if (landOf(I, q) === L) p = q; }
      if (p && landOf(I, p) === L){ a.tx = p.x; a.ty = p.y; }
      a.wait = C.wait[0] + Math.random() * (C.wait[1] - C.wait[0]); continue;
    }
    const v = Math.min(d, dt * C.v); a.x += dx / d * v; a.y += dy / d * v; a.moving = true; a.left = dx < 0; a.phase += v * 1.6;
  }
}
/* Where to next; across the lagoon of an atoll they paddle a dugout */
function goTo(I, w, x, y, wait = 0){
  w.tx = x; w.ty = y; w.wait = wait;
  const a = landOf(I, w), b = landOf(I, {x, y}); w.paddle = !!I.atoll && a >= 0 && b >= 0 && a !== b;
}
function nextLeg(w){
  const I = isl(w.isl);
  // during a feast everyone gathers in front of the meeting house; at the feast of the Pleiades they dance in a ring on the dance ground
  w.dance = false; w.busy = null; w.hurry = I.feastEnd > tick; w.paddle = false;   // people hurry to a feast
  if (I.feastEnd > tick && !w.sea){
    const d = I.festYear === yearOf() && I.buildings.find(b => b.kind === 'tanzplatz' && !b.bt), h = I.buildings.find(b => b.kind === 'halle' && !b.bt);
    if (d || h){ if (w.job){ w.leg = 'go'; w.bout = false; } w.carry = null; w.sit = false; }
    if (d){ const a = Math.random() * TAU; goTo(I, w, d.x + Math.cos(a) * 15, d.y + Math.sin(a) * 6, 1800 + Math.random() * 1400); w.dance = d; return; }
    if (h){ goTo(I, w, h.x + (Math.random() - .5) * 40, h.y + 14 + Math.random() * 16, 700 + Math.random() * 1400); return; }
  }
  if (w.job){ jobLeg(I, w, w.job); return; }
  const L = landOf(I, w), sp = I.buildings.filter(b => !KINDS[b.kind].water && b.kind !== 'palme' && b.kind !== 'pandanus' && (!w.old || KINDS[b.kind].roof) && landOfB(I, b) === L), t = sp[Math.floor(Math.random() * sp.length)];
  if (t) goTo(I, w, t.x + rnd(w.old ? 8 : 11), t.y + 4 + Math.random() * 8);
  // grown-ups who stroll sometimes sit down on a mat for a while, the old more often; children are off again quickly
  w.sit = !w.child && Math.random() < (w.old ? .65 : .35);
  w.wait = w.child ? 200 + Math.random() * 700 : w.sit ? 3500 + Math.random() * 4500 : 600 + Math.random() * 1800;
}
/* One step of the work. Builders: fetch wood, bring it, build a while at the site, until it is done.
   Everyone else: a while at the place (felling, wading, out fishing), then the load to the store, and back. */
function jobLeg(I, w, j){
  const T = j.type;
  if (w.leg === 'go'){ w.on = true; w.leg = 'work'; w.bout = false; }
  if (BUILD_JOBS.has(T)){
    const W = workOf(I, j);
    if (w.leg === 'fetch'){ w.carry = 'holz'; w.leg = 'bring'; goTo(I, w, j.x + rnd(5), j.y + rnd(2), 300); return; }
    if (w.leg === 'bring'){ w.carry = null; w.leg = 'work'; w.bout = false; if (W){ W.o.got = Math.min(W.need, W.o.got + 1); invalidate(); } }
    if (!w.bout && W){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.wait = 2200 + Math.random() * 1400; return; }
    w.bout = false;
    if (W && W.need && W.o.got + woodOnWay(I, j) < W.need && W.o[W.f] <= woodFloor(W) + .01){
      const s = storeNear(I, w); if (s){ w.leg = 'fetch'; goTo(I, w, s.x, s.y); return; }
      W.o.got = W.need;   // no store left: they take what lies about
    }
    const r = T === 'site' ? KINDS[j.b.kind].r * .7 : 5, cx = T === 'site' ? j.b.x : j.x, cy = T === 'site' ? j.b.y + 4 : j.y;
    goTo(I, w, cx + rnd(r), cy + rnd(r * .4), W ? 0 : 900);
    return;
  }
  if (w.leg === 'work'){
    if (!w.bout){
      w.bout = true;
      if (T === 'fish' && !I.rahui){ w.sea = true; w.wait = 6500 + Math.random() * 3500; return; }   // out in the dugout
      w.busy = T === 'chop' || T === 'wade' ? {x:w.x, y:w.y} : null; w.sit = T === 'wait' && Math.random() < .5;
      w.wait = T === 'chop' ? 2400 + Math.random() * 1200 : T === 'wade' ? 2600 + Math.random() * 2400 : T === 'plant' ? 500 : T === 'wait' ? 2500 + Math.random() * 3000 : 900 + Math.random() * 1600;
      return;
    }
    w.bout = false; w.sea = false;
    if (T === 'wait'){ goTo(I, w, j.x + rnd(8), j.y + rnd(4)); return; }
    const s = j.drop || storeNear(I, w); if (!s){ w.wait = 1500; return; }
    w.carry = j.load; w.leg = 'store'; goTo(I, w, s.x + rnd(3), s.y);
    return;
  }
  // where the load goes: a planter kneels to set the sapling, then all go back
  if (T === 'plant' && !w.bout){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.wait = 2200 + Math.random() * 1000; return; }
  w.bout = false; w.carry = null; w.leg = 'work'; goTo(I, w, j.x + rnd(4), j.y + Math.random() * 3, 300 + Math.random() * 500);
}
/* Builders who are at their site move the work on, a little with every moment they are there */
function buildBit(w, dt){
  const W = workOf(isl(w.isl), w.job); if (!W) return;
  const left = W.o[W.f], floor = Math.max(1e-4, woodFloor(W));
  if (left > floor) W.o[W.f] = Math.max(floor, left - dt / TICK / W.crew);
}
function stepWalkers(dt){
  for (const w of walkers){
    w.moving = false;
    if (w.on && w.leg === 'work' && w.job && BUILD_JOBS.has(w.job.type) && !w.hurry) buildBit(w, dt);
    if (w.wait > 0){
      w.wait -= dt;
      if (w.dance && Math.hypot(w.x - w.dance.x, (w.y - w.dance.y) * 2) < 26){ w.moving = true; w.phase += dt * .008; }
      else if (w.busy && Math.hypot(w.x - w.busy.x, w.y - w.busy.y) < 3){ w.moving = true; w.phase += dt * .014; }
      continue;
    }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 1.5){ nextLeg(w); continue; }
    w.sit = false;
    const v = Math.min(d, dt * (w.paddle ? .014 : w.carry ? .006 : w.old ? .0045 : .007) * (w.hurry ? 2.4 : w.child ? 1.7 : 1)); w.x += dx / d * v; w.y += dy / d * v;
    w.moving = true; w.left = dx < 0; w.phase += v * .9;
  }
}
/* People keep working while the map is not drawn: the steps are made up in small pieces */
let walkAt = 0;
function walkUntil(now){
  let gap = walkAt ? Math.min(3000, now - walkAt) : 0; walkAt = now;
  while (gap > 0){ const s = Math.min(50, gap); stepWalkers(s); gap -= s; }
}

/* ---------- work: a workshop runs only with its deposit, its plants nearby and its input goods */
const NEAR_PL = {pandanus:'Pandanus', palme:'Kokospalmen', baum:'Brotfruchtbäume', garten:'Maulbeergärten', wald:'Bäume'};
function workState(I, b){
  const K = KINDS[b.kind];
  if (I.settled && unserved(I, b)) return {why:'boat', text:'Kein Einbaum fährt hierher. Ein Kanusteg bringt die Leute hin, jeder Steg für bis zu 4 Plätze.'};
  if (K.crew && I.settled && !crewAt(I, b)){
    const sf = staffOf(I), pr = prioOf(I), building = sf.build > 0 && pr.indexOf('bau') < pr.indexOf(catOf(b));
    return {why:'crew', text:capOf(b) === 0 ? 'Du hast die Arbeit hier angehalten.' : building ? 'Die Leute bauen gerade. Danach kommen sie zurück.' : 'Es fehlen Leute. Andere Arbeit geht vor, oder das Dorf muss wachsen.'};
  }
  if (K.trees && !treesNear(I, b.x, b.y, K.trees.r).length) return {why:'trees', text:'Keine Bäume mehr in der Nähe. Ein Baumpflanzer lässt den Wald nachwachsen.'};
  if (K.near){ const n = nearCount(I, K.near.kind, b.x, b.y, K.near.r); if (n < K.near.n) return {why:'near', kind:K.near.kind, text:`Zu wenig ${NEAR_PL[K.near.kind]} in der Nähe, ${n} von ${K.near.n}.`}; }
  if (K.prod && (I.stock[K.prod] || 0) >= storeCap(I)) return {why:'full', text:'Das Lager ist voll. Baue einen Speicher oder schick Waren weg.'};
  if (K.use && !canPay(I, K.use)){ const k = Object.keys(K.use).find(q => (I.stock[q] || 0) < K.use[q]); return {why:'use', k, text:`Es fehlt ${GN[k]}.`}; }
  return null;
}
/* ---------- needs: what each island uses, makes and lacks, per minute */
const PER_MIN = 60000 / TICK;
/* A tool that wears out: with it the work goes at full speed, without it slower */
const tooled = (I, K) => !K.boost || (I.stock[K.boost.k] || 0) > 0;
const pace = (I, K) => tooled(I, K) ? 1 : K.boost.slow;
function makeRate(I, k){
  let m = 0;
  for (const b of I.buildings){ const K = KINDS[b.kind]; if (K.prod === k && !b.bt && !(b.boat > 0) && !(b.idle && b.idle.why !== 'full')) m += PER_MIN / K.every / pace(I, K) * (K.crew ? crewAt(I, b) / K.crew : 1); }
  return m;
}
function workUse(I, k){
  let u = 0;
  for (const b of I.buildings){
    const K = KINDS[b.kind]; if (b.bt || (b.idle && b.idle.why !== 'full')) continue;
    if (K.use && K.use[k]) u += PER_MIN / K.every * K.use[k];
    if (K.boost && K.boost.k === k && tooled(I, K)) u += PER_MIN / K.every / K.boost.per;
  }
  return u;
}
const needActive = (I, N) => N.lvl < 3 ? I.pop >= N.from : I.lvl === 3;
function needsOf(I){
  const list = NEEDS.filter(N => needActive(I, N)).map(N => {
    const use = I.pop * N.rate, work = workUse(I, N.k), make = makeRate(I, N.k), stock = I.stock[N.k] || 0, all = use + work;
    const state = make >= all ? 'ok' : stock > 0 ? 'low' : 'out';
    return {N, k:N.k, use, work, make, stock, state, mins:make < all ? stock / (all - make) : Infinity};
  });
  const cap = houseCap(I), missing = list.filter(n => n.state === 'out');
  return {list, cap, missing, full:I.pop >= cap, next:NEEDS.find(N => !needActive(I, N)), growing:I.pop < cap && !missing.length && (I.stock.nahrung || 0) > 0};
}
/* Level: a village from 20 people; a chief's village with enough people, standing, pots and mats. It stays one while its needs hold. */
function updateLevel(I, nd){
  const lowOut = nd.missing.some(n => n.N.lvl < 3);
  if (I.lvl === 3){
    I.chiefMiss = nd.missing.length ? (I.chiefMiss || 0) + 1 : 0;
    if (I.chiefMiss >= 30){ I.lvl = 2; I.chiefMiss = 0; I.chiefBan = tick + 60; invalidate(); toast(`${I.name} ist kein Häuptlingsdorf mehr. Es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`, 4200); }
    return;
  }
  // to rise, the chief's goods must already be in store, and after a fall the village needs two minutes
  if (I.pop >= CHIEF.pop && mana >= CHIEF.mana && beautyOf(I) >= CHIEF.beauty && !lowOut && chiefGoods(I) && tick >= (I.chiefBan || 0)){ I.lvl = 3; invalidate(); toast(`${I.name} ist jetzt ein Häuptlingsdorf. In jedem Haus wohnen nun ${CHIEF.cap} Menschen.`, 4600); return; }
  I.lvl = I.pop >= 20 ? 2 : 1;
}
const chiefGoods = I => NEEDS.filter(N => N.lvl === 3).every(N => (I.stock[N.k] || 0) > 0);
/* ---------- feasts: food, pots, pigs and bark cloth for standing */
function feastState(I, F){
  if (!I.buildings.some(b => b.kind === 'halle')) return 'Feste feiert man im Versammlungshaus.';
  const wait = (I.feastAt || -FEAST_PAUSE) + FEAST_PAUSE - tick; if (I.feastAt && wait > 0) return `Das nächste Fest geht in ${Math.ceil(wait * TICK / 1000)} Sekunden.`;
  if (!canPay(I, F.cost)) return `Es fehlt ${lacking(I, F.cost)}.`;
  return '';
}
function holdFeast(I, F){
  const no = feastState(I, F); if (no){ toast(no, 2600, false); return; }
  pay(I, F.cost); mana += F.mana; I.feastAt = tick; I.feastEnd = tick + FEAST_LEN;
  for (const w of walkers) if (w.isl === I.id){ nextLeg(w); w.wait = 0; }
  for (let i = 0; i < 6; i++) heartAt(I);
  updateHUD(); if (sheetKind) renderSheet(); save(); checkQuest();
  toast(`${F.n} auf ${I.name}. Ansehen +${F.mana}.`, 3600);
}
let hearts = [];   // a heart rises over a house when someone moves in
function econ(){
  tick++; lastEconAt = performance.now();
  for (const I of islands){
    if (!I.settled) continue;
    const st = I.stock, cap = storeCap(I), add = (k, n) => { st[k] = Math.min(cap, (st[k] || 0) + n); };
    // young plants grow by themselves; building sites and dugouts move on only while their builders are there (see buildBit)
    const sf = staff(I), on = presentAt(I);
    for (const b of I.buildings){
      if (!b.bt) continue;
      if (KINDS[b.kind].plant) b.bt -= 1;
      if (b.bt <= .001){ delete b.bt; delete b.got; done(I, b); }
    }
    // a dugout is carved before anyone goes out on the water
    for (const b of I.buildings){
      if (!(b.boat > 0)) continue;
      const q = Math.floor((1 - b.boat / KINDS[b.kind].canoe) * 3); if (q !== b._q){ b._q = q; invalidate(); }
      if (b.boat <= .001){ delete b.boat; invalidate(); syncWalkers(); if (I.id === active) toast(`Der Einbaum ${b.kind === 'steg' ? 'am Kanusteg' : 'der Fischer'} ist fertig.${b.kind === 'fisch' ? ' Jetzt fahren sie hinaus.' : ''}`, 2600); }
    }
    for (const b of I.buildings) if (b.bt){ const q = Math.floor((1 - b.bt / KINDS[b.kind].bt) * 10); if (q !== b._q){ b._q = q; invalidate(); } }
    for (const b of I.buildings){
      const K = KINDS[b.kind]; if (!(K.prod || K.plants) || b.bt) continue;
      if (b.boat > 0){ b.idle = {why:'carving', text:'Erst wird der Einbaum geschnitzt, dann geht es aufs Wasser.'}; continue; }
      // only those who have got there work; fewer workers than there is room for: the work goes slower
      const n = K.crew ? Math.min(sf.crew.get(b) || 0, on.get(b) || 0) : 1;
      if (K.crew && !n){ b.idle = workState(I, b) || {why:'way', text:'Die Leute sind auf dem Weg hierher.'}; continue; }
      const every = Math.round(seasonalEvery(I, b, K) * pace(I, K) * (K.crew ? K.crew / n : 1));
      if (!every || tick % every){ if (b.idle && b.idle.why === 'way') b.idle = null; continue; }
      b.idle = workState(I, b); if (b.idle) continue;
      if (K.plants){ if (!plantTree(I, b)) b.idle = {why:'space', text:'In der Nähe ist kein Platz mehr für junge Bäume.'}; continue; }
      if (K.use) pay(I, K.use);
      if (K.trees) fellTree(I, b);
      if (K.prod === 'fisch') stats.fisch++;
      if (K.boost && tooled(I, K) && (b.worn = (b.worn || 0) + 1) >= K.boost.per){ b.worn = 0; st[K.boost.k]--; }   // the net tears, the adze breaks
      add(K.prod, 1);
    }
    growTrees(I);
    // use up what people need; fractions carry over so small villages use little
    I.owe = I.owe || {};
    for (const N of NEEDS){
      if (!needActive(I, N)) continue;
      I.owe[N.k] = (I.owe[N.k] || 0) + I.pop * N.rate / PER_MIN;
      const take = Math.floor(I.owe[N.k]); if (take > 0){ st[N.k] = Math.max(0, (st[N.k] || 0) - take); I.owe[N.k] -= take; }
    }
    let nd = needsOf(I);
    updateLevel(I, nd); nd = needsOf(I);
    if (nd.growing && tick % GROW_EVERY === 0){ I.pop = Math.min(nd.cap, I.pop + (I.joyUntil > tick ? 2 : 1)); heartAt(I); }
    else if (I.pop > nd.cap) I.pop--;   // when houses shrink back, people move away one by one
    // without food people leave, slowly, but a few always stay
    I.hunger = nd.missing.some(n => n.k === 'nahrung') ? (I.hunger || 0) + 1 : 0;
    if (I.hunger >= 15 && I.pop > 3){ I.pop--; I.hunger = 0; }
  }
  if (tick % MANA_FADE === 0) mana = Math.max(0, mana - 1);
  // a beautiful village adds to the clan's standing, every half minute, as far as its people can enjoy it, at most 2 a minute
  if (tick % 15 === 0) for (const I of islands) if (I.settled) mana += Math.min(1, Math.floor(Math.min(beautyOf(I), I.pop / 2) / 6));
  answerGifts(); stepYards(); feedCrews(); calendarTick(); eventTick(); if (tick % 5 === 0) chronikTick();
  // a cord to a clan slackens when no gift has gone along it for a long time
  for (const r of routes){ const c = isl(r.a).clan || isl(r.b).clan; if (c && r.knots > 0 && tick - (r.lastGift || 0) > 90){ r.knots--; r.lastGift = tick; invalidate(); } }
  if (tick % 8 === 0) invalidate();   // roofs age
  syncWalkers(); if (performance.now() - walkAt > 400) walkUntil(performance.now());   // the map is not drawn, so the people walk on from here
  requestDraw(); updateHUD(); if (placing) ghostRender(); checkQuest();
  if (sheetKind && sheetSig() !== lastSig) renderSheet();
  if (tick % 3 === 0) save();
}
/* ---------- trees: each holds a little wood. Felled, it leaves a stump that sprouts again only after a long while;
   a planter sets saplings on stumps and free ground at once. */
function fellTree(I, b){
  const t = b.cutAt && b.cutAt.st === 0 && b.cutAt.w > 0 && I.trees.includes(b.cutAt) ? b.cutAt : treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
  if (!t) return; b.cutAt = t;
  if (--t.w <= 0){ t.st = 1; t.g = STUMP_TICKS; t.w = 0; b.cutAt = null; stats.gefaellt++; }
  treesChanged(I);
}
function plantable(I, p){
  const L = landAt(I, p); if (!L || polyDist(p, L.poly) < 9) return false;
  if ((I.river && polyDist(p, I.river, false) < 9) || inDelta(I, p, 8)) return false;
  if (I.blocked.some(z => Math.hypot(p.x - z.x, p.y - z.y) < z.r + 6)) return false;
  if (I.buildings.some(q => Math.hypot(q.x - p.x, q.y - p.y) < KINDS[q.kind].r + 8)) return false;
  return !I.trees.some(t => Math.hypot(t.x - p.x, t.y - p.y) < 10);
}
function plantTree(I, b){
  const R = KINDS[b.kind].plants.r, T = I.trees, dist = t => Math.hypot(t.x - b.x, (t.y - b.y) * 1.25);
  const stump = T.filter(t => t.st === 1 && dist(t) < R).sort((p, q) => dist(p) - dist(q))[0];
  if (stump){ stump.st = 2; stump.g = GROW_TICKS; b.plantAt = stump; stats.gepflanzt++; treesChanged(I); return true; }
  if (T.filter(t => dist(t) < R).length >= 36) return false;   // the forest here is dense enough
  // new trees go where others already stand, so the forest grows at its edge and not across the village
  let best = null, bs = -1;
  for (let i = 0; i < 18; i++){
    const a = Math.random() * TAU, d = 14 + Math.random() * (R - 14), p = {x:b.x + Math.cos(a) * d, y:b.y + Math.sin(a) * d * .8};
    if (!plantable(I, p)) continue;
    const sc = T.filter(t => Math.hypot(t.x - p.x, t.y - p.y) < 32).length; if (sc >= 2 && sc > bs){ bs = sc; best = p; }   // only next to standing trees
  }
  if (!best) return false;
  const k = Math.random(), t = {x:fx(best.x), y:fx(best.y), v:k < .55 ? 0 : k < .85 ? 1 : 2, m:Math.random() < .5 ? 1 : 0, s:fx(.86 + Math.random() * .24), st:2, w:0, g:GROW_TICKS};
  T.push(t); b.plantAt = t; stats.gepflanzt++; treesChanged(I); return true;
}
function growTrees(I){
  if (!I.treeWork) return;
  let n = 0;
  for (const t of I.trees){
    if (t.st === 0) continue; n++;
    if (--t.g > 0) continue;
    if (t.st === 1){ t.st = 2; t.g = GROW_TICKS; } else { t.st = 0; t.w = TREE_WOOD; }
    treesChanged(I);
  }
  if (tick % 5 === 0 && n) invalidate();   // young trees grow a little
  I.treeWork = n > 0;
}
function treesChanged(I){ I.treeWork = true; I.treesSaved = true; I._tp = null; invalidate(); }
/* A building on stumps clears them */
function clearStumps(I, b){ const r = (KINDS[b.kind].r + TREE_R) * .8, n = I.trees.length; I.trees = I.trees.filter(t => !(t.st === 1 && Math.hypot(t.x - b.x, t.y - b.y) < r)); if (I.trees.length !== n) treesChanged(I); }
function done(I, b){
  const K = KINDS[b.kind];
  if (K.canoe) b.boat = K.canoe;   // fishers and the jetty need their dugout first
  if (!K.plant && !K.path && I.id === active){ toast(`${K.n} ist fertig.`, 1600); sfx('knock'); }
  syncWalkers(); checkQuest();
}
function heartAt(I){
  if (lod === 'far' || !boxIn(I.box, view(60))) return;
  const hs = I.buildings.filter(b => b.kind === 'haus' || b.kind === 'pfahl' || b.kind === 'halle'); if (!hs.length) return;
  const b = hs[Math.floor(Math.random() * hs.length)];
  hearts.push({x:b.x + (Math.random() - .5) * 8, y:b.y - KINDS[b.kind].hy - 10, t0:performance.now() + Math.random() * 600});
}

/* ---------- hit tests and input */
function hitBuilding(p){
  if (lod === 'far') return null; let best = null, bd = Infinity;
  for (const I of islands){ if (!I.settled) continue; for (const b of I.buildings){ const K = KINDS[b.kind]; const d = Math.hypot(p.x - b.x, p.y - (b.y - K.hy * .6)); const lim = Math.max(K.r + 3, 14 / cam.z); if (d < lim && d < bd){ bd = d; best = b; } } }
  return best;
}
function hitCord(p){ const lim = Math.max(9, 16 / cam.z); for (let i = 0; i < routes.length; i++){ for (const q of routeCurve(routes[i]).pts) if (Math.hypot(p.x - q.x, p.y - q.y) < lim) return i; } return -1; }
function hitIsland(p){ return islands.find(I => I.discovered && onIsland(I, p)) || null; }
function onTap(p){
  if (mode === 'place' || mode === 'move'){ placing.x = p.x; placing.y = p.y; ghostRender(); return; }
  const sh = hitShip(p);
  if (sh && !sh.own){ const C = isl(sh.clan).clan; toast(`Kanu vom ${C.name}. An Bord ${sh.guest ? '4 Gäste für das Fest' : '2 Boten'} mit ${giftText(sh.cargo) || 'leeren Händen'}. Es fährt nach ${isl(sh.to).name}.`, 4200, false); return; }
  if (sh){ if (sh === selShip){ closeSheet(); return; } closeSheet(); selectShip(sh); return; }
  if (mode === 'steer'){ steerTap(p); return; }
  // a tap on someone: who it is and what they do, and their workplace opens
  const w = hitWalker(p);
  if (w){ markW = w; markUntil = performance.now() + 5000; toast(`${w.name} · ${whatDoes(w)}`, 3200, false); if (w.job && findB(w.job.b.id)) select(w.job.b); else requestDraw(); return; }
  const b = hitBuilding(p); if (b){ select(b); return; }
  const ri = hitCord(p); if (ri >= 0){ openRoute(ri); return; }
  const I = hitIsland(p);
  if (I && I.clan){ closeSheet(); openSheet('clan', {id:I.id}); return; }
  if (I && !I.settled){ toast(`${I.name} ist noch unbewohnt. Bring ${SETTLE.people} Siedler mit einem Kanu her.`, 3600, false); return; }
  if (I){ closeSheet(); setActive(I.id); if (lod === 'far') flyTo(I.center.x, I.center.y, 1.4); return; }
  closeSheet();
}
const ptrs = new Map(); let ges = null;
mapC.addEventListener('pointerdown', e => {
  closeNews();
  try { mapC.setPointerCapture(e.pointerId); } catch (err){} ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); camAnim = null;
  if (ptrs.size === 1){
    const wp = toWorld(e.clientX, e.clientY);
    const onGhost = placing && Math.hypot(wp.x - placing.x, wp.y - (placing.y - KINDS[placing.kind].hy * .6)) < Math.max(KINDS[placing.kind].r + 8, 26 / cam.z);
    ges = {type:onGhost ? 'ghost' : 'tap', sx:e.clientX, sy:e.clientY, t:performance.now(), cx:cam.x, cy:cam.y, gx:onGhost ? placing.x - wp.x : 0, gy:onGhost ? placing.y - wp.y : 0};
  } else if (ptrs.size === 2){
    const [a, b] = [...ptrs.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ges = {type:'pinch', d0:Math.hypot(a.x - b.x, a.y - b.y) || 1, z0:cam.z, w0:toWorld(mx, my)};
  }
});
mapC.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); if (!ges) return;
  if (ges.type === 'pinch' && ptrs.size >= 2){ const [a, b] = [...ptrs.values()]; zoomAt(ges.z0 * Math.hypot(a.x - b.x, a.y - b.y) / ges.d0, (a.x + b.x) / 2, (a.y + b.y) / 2, ges.w0); return; }
  if (ges.type === 'ghost'){ const wp = toWorld(e.clientX, e.clientY); placing.x = wp.x + ges.gx; placing.y = wp.y + ges.gy; ghostRender(); return; }
  const dx = e.clientX - ges.sx, dy = e.clientY - ges.sy;
  if (ges.type === 'tap' && Math.hypot(dx, dy) > 8) ges.type = 'pan';
  if (ges.type === 'pan'){ cam.x = ges.cx - dx / cam.z; cam.y = ges.cy - dy / cam.z; clampCam(); applyCam(); }
});
function endPtr(e){
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (ges && ges.type === 'tap' && ptrs.size === 0 && performance.now() - ges.t < 600) onTap(toWorld(e.clientX, e.clientY));
  if (ptrs.size === 0) ges = null;
  else if (ges && ges.type === 'pinch'){ const [q] = [...ptrs.values()]; ges = {type:'pan', sx:q.x, sy:q.y, cx:cam.x, cy:cam.y}; }
}
mapC.addEventListener('pointerup', endPtr); mapC.addEventListener('pointercancel', endPtr);
mapC.addEventListener('wheel', e => { e.preventDefault(); zoomAt(cam.z * Math.exp(-e.deltaY * .0016), e.clientX, e.clientY, toWorld(e.clientX, e.clientY)); }, {passive:false});
mapC.addEventListener('keydown', e => {
  const s = 70 / cam.z, vc = visCenter();
  if (e.key === 'ArrowLeft') cam.x -= s; else if (e.key === 'ArrowRight') cam.x += s; else if (e.key === 'ArrowUp') cam.y -= s; else if (e.key === 'ArrowDown') cam.y += s;
  else if (e.key === '+' || e.key === '=') { zoomAt(cam.z * 1.3, vc.sx, vc.sy, toWorld(vc.sx, vc.sy)); return; }
  else if (e.key === '-') { zoomAt(cam.z / 1.3, vc.sx, vc.sy, toWorld(vc.sx, vc.sy)); return; }
  else if (e.key === 'Escape'){ if (newsOpen()) closeNews(); else if (placing) endPlace(); else closeSheet(); return; }
  else return;
  e.preventDefault(); clampCam(); applyCam();
});
$('menuBtn').addEventListener('click', () => openSheet('menu', {}));
$('popBtn').addEventListener('click', () => openSheet('needs'));
$('vitalBtn').addEventListener('click', () => openSheet('needs'));
$('storeBtn').addEventListener('click', () => openSheet('store'));
$('manaBtn').addEventListener('click', () => openSheet('mana'));
$('buildList').addEventListener('click', e => { const b = e.target.closest('.bbtn'); if (!b) return; newKinds.delete(b.dataset.kind); b.classList.remove('new', 'hint'); startPlace(b.dataset.kind); });
$('tradeBtn').addEventListener('click', () => openSheet('fleet'));
$('seasonBtn').addEventListener('click', () => openSheet('calendar'));
$('placeOk').addEventListener('click', confirmPlace);
$('placeDone').addEventListener('click', endPlace);
window.addEventListener('resize', () => { measure(); applyCam(); });
if (document.fonts) document.fonts.ready.then(() => invalidate());

/* ---------- loop and start */
function renderAll(){ invalidate(true); spawnWalkers(); renderBuildBar(); }
let last = performance.now(), lastDraw = 0;
function frame(now){
  const dt = Math.min(64, now - last); last = now;
  stepCam(now); if (ships.length) stepShips(now, dt); walkUntil(now); if (cam.z > PEOPLE_Z) stepCritters(dt); audioTick(now);
  // clouds, whales and fish move all the time, but slowly: a few frames a second are enough when nothing else moves
  if (needDraw || stale(now) || (animating() && now - lastDraw > 32) || (!reduced && now - lastDraw > 140)){ draw(now); lastDraw = now; }
  requestAnimationFrame(frame);
}
function start(data){
  injectDefs();
  let ok = false;
  try { const raw = (data && data.save) || localStorage.getItem(SAVE_KEY); if (raw) ok = restore(raw); } catch (e){}
  if (!ok) newGame();
  renderAll(); measure();
  // a new game opens close to the landing place, a saved one shows home and the first atoll
  const b = ok ? boxOf([isl('heimat'), isl('tochter')]) : isl('heimat').box, bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const z = clampZ(Math.min((vw - 50) / bw, (vh - topH - botH - 40) / bh, ok ? 1 : 1.4));
  Object.assign(cam, camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, z)); clampCam(); applyCam();
  // fonts, patterns and the first bitmaps load before the first frame, so nothing pops in
  const fonts = document.fonts ? Promise.all([document.fonts.load(NAME_FONT), document.fonts.load(SUB_FONT)]).catch(() => {}) : null;
  const ready = loadPatterns().then(() => { draw(performance.now()); return Promise.all(pendingSprites()); });
  Promise.race([Promise.all([fonts, ready]), new Promise(res => setTimeout(res, 2500))]).then(() => {
    invalidate(true); requestAnimationFrame(frame); setInterval(econ, TICK);
    if (!ok){ openSheet('intro', {first:true}); save(); }
    else if (!islands.some(I => I.settled && I.buildings.some(b => b.kind === 'faeller'))) toast('Neu: Holz kommt jetzt vom Holzfäller. Bau einen am Waldrand.', 6000);
  });
}
try { window.claude?.hot?.snapshot?.(() => ({save:serialize()})); } catch (e){}
const hot = window.claude?.hot;
if (hot && hot.ready) hot.ready(start); else start(hot?.data ?? {});
