'use strict';
/* Game state, the starting villages, save and load */

// awayQuiet: no messages or sounds while missed time is made up; savedAt: when the game was last saved
// cells: the sea already rolled; home0: home, Motu and the first clearing; worldV: which rules the sea was rolled with
let awayQuiet = false, savedAt = 0, seed = 1, islands = [], routes = [], fogHoles = [], cells = new Set(), home0 = null, worldV = 2;
// landing: while the clan is still at sea and chooses where to settle (never saved); homeSwap: Talise was chosen as home
let landing = null, homeSwap = 0;
let tick = 0, nextId = 1, active = 'heimat';
let mode = 'idle', placing = null, selectedId = null, sheetKind = null, sheetData = null;
let walkers = [], mana = 0;   // mana: the clan's standing, from feasts, gifts and a beautiful village
const isl = id => islands.find(I => I.id === id);
function findB(id){ for (const I of islands){ const b = I.buildings.find(x => x.id === id); if (b) return b; } return null; }
function islOfB(id){ return islands.find(I => I.buildings.some(b => b.id === id)); }
function addB(I, kind, p, v = {}, born = 0){ const b = {id:nextId++, kind, x:fx(p.x), y:fx(p.y), born, v}; I.buildings.push(b); return b; }
const newSeed = () => ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) || 1;

/* A new game: the clan is still at sea in its voyaging canoe, off two high islands and an atoll. The village is founded
   where the player chooses (foundHome). */
function newGame(s = newSeed()){
  seed = s; worldV = 3; homeSwap = 0; nextPid = 1; nextFam = 1; home0 = makeWorld(seed, worldV); resetCaches();
  islands = home0.islands; routes = []; ships = []; nextShip = 1; selShip = null; cells = new Set(); tick = 0; nextId = 1; active = 'heimat'; quest = 0; mana = 0;
  stats = {gepflanzt:0, gefaellt:0, fisch:0, gaben:0, stuerme:0, ereignisse:0}; chronik = {}; nextEvent = 300; lastEvent = ''; eventNow = null;
  resetGrid(); for (const I of islands) markLand(I);
  const T = isl('tochter'), r = rng(seed ^ 0x5eed);
  for (const I of islands) Object.assign(I, {discovered:true, settled:false, pop:0, stock:{}});
  seedAtollPlants(T, r);
  // the first settlers on Motu must find enough palms and pandanus for rope and mats near their landing place
  const hs = homeSpot(T); topUp(T, 'pandanus', 3, hs, r); topUp(T, 'palme', 4, hs, r);
  fogHoles = [home0.hole];
  const h = home0.hole; for (let cy = Math.floor((h.cy - h.ry) / CELL); cy <= Math.floor((h.cy + h.ry) / CELL); cy++) for (let cx = Math.floor((h.cx - h.rx) / CELL); cx <= Math.floor((h.cx + h.rx) / CELL); cx++) ensureCell(cx, cy, true);
  // the voyaging canoe waits at the western edge of the clearing, where the clan came from
  const sh = makeShip('dc', isl('heimat'), {name:'Ahnenkanu', founder:true, people:START_POP, cargo:{holz:10, nahrung:30, wasser:20, dach:6, schnur:5}, life:LIFE_BASE.slice(), port:null, last:null, state:'sea'});
  sh.x = h.cx - h.rx * .78; sh.y = h.cy + h.ry * .1; sh.hx = 1; sh.hy = 0;
  landing = {ship:sh.id};
}
/* caches that belong to one world, cleared whenever another is loaded or begun */
function resetCaches(){ news.length = 0; unread = 0; newsBadge(); foldToast(); newKinds.clear(); cyclone = null; loreCache = null; hintCache = null; windCache = null; lifeLog = null; markW = null; hearts = []; landing = null; walkers = []; critters = []; }   // the people and animals of the old world go with it; spawnWalkers brings the new ones
/* The clan lands on the island it chose: that island becomes home. The canoe is drawn ashore, and what it carried is the
   first store: five families, wood and food, and the plants and pigs of the old land. */
function foundHome(I){
  if (!landing || !I || !I.start || I.type !== 'hoch' || I.settled) return false;
  if (I.id !== 'heimat'){ swapHome(islands, I); homeSwap = 1; }
  const Hm = isl('heimat'), r = rng(seed ^ 0x5eed ^ 0x1a4d), sh = ships.find(s => s.founder);
  if (sh) ships.splice(ships.indexOf(sh), 1);
  selShip = null; if (mode === 'steer') mode = 'idle';
  Object.assign(Hm, {discovered:true, settled:true, pop:START_POP, people:null, fams:[], stock:{...emptyStock(), holz:10, nahrung:30, wasser:20, dach:6, schnur:5}, life:LIFE_BASE.slice(), wild:1, gone:0});
  landing.found = 'heimat'; active = 'heimat';   // time still stands until the meeting house has its place (foundAt)
  return true;
}
/* The meeting house goes where the clan chose (or, without a choice, onto the old clearing); then time begins */
function foundAt(p){
  const Hm = isl('heimat'); if (!landing || !landing.found || !Hm) return false;
  seedStart(Hm, rng(seed ^ 0x5eed ^ 0x1a4d), p);
  landing = null;
  return true;
}
/* Roll a cell of sea the first time it is seen. Fresh cells get their clan village; on load the village comes from the save. */
function ensureCell(cx, cy, fresh){
  if (cx < 0 || cy < 0 || cx >= W / CELL || cy >= H / CELL) return null;
  const key = cx + ',' + cy; if (cells.has(key)) return null; cells.add(key);
  const I = genCell(seed, cx, cy, home0, new Set(islands.map(J => J.name)));
  if (!I) return null;
  islands.push(I); markLand(I);
  if (fresh && I.clan) seedClan(I, rng(seed ^ (I.center.x | 0)));
  return I;
}

/* Like the first landing: only the meeting house on the plaza, palms on the beach, two wild breadfruit trees */
function seedStart(I, r, at){
  if (at) I.anchor = {x:fx(at.x), y:fx(at.y + 15)};   // the village grows around the meeting house
  const an = I.anchor;
  addB(I, 'halle', {x:an.x, y:an.y - 15}, {}, 0);
  // the two trees stand together, so a fermenting pit fits between them later
  const a = r() * TAU, grove = {x:an.x + Math.cos(a) * 70, y:an.y + Math.sin(a) * 56};
  for (let i = 0; i < 2; i++){ const p = findSpot(I, 'baum', {x:grove.x + i * 18, y:grove.y}); if (p) addB(I, 'baum', p, variant('baum', r), -60); }
  palmsAlong(I, r, 22);
}
function palmsAlong(I, r, n){
  const L = I.lands[0].poly, c = I.center;
  for (let i = 0; i < n; i++){
    const q = L[Math.floor(i / n * L.length)], p = {x:q.x + (c.x - q.x) * .07, y:q.y + (c.y - q.y) * .07};
    if (I.delta && Math.hypot(p.x - I.delta.mouth.x, p.y - I.delta.mouth.y) < I.delta.reach) continue;   // the delta is mud and mangroves, no palms
    if (!check('palme', I, p.x, p.y)) addB(I, 'palme', p, variant('palme', r), -60);
  }
}
/* An empty atoll: palms and pandanus on every islet */
function seedAtollPlants(I, r){
  const wide = I.segs.reduce((a, b) => b[1] - b[0] > a[1] - a[0] ? b : a);
  for (const sg of I.segs){
    const [t0, t1] = sg, k = Math.max(3, Math.round((t1 - t0) / 13));
    // palms and pandanus grow mixed; on the widest islet every other plant is a pandanus, so both workshops find enough
    for (let i = 0; i < k; i++){ const kind = (sg === wide ? i % 2 : i % 3) === 1 ? 'pandanus' : 'palme', p = I.R(t0 + (t1 - t0) * (i + .5) / k, .96); if (!check(kind, I, p.x, p.y)) addB(I, kind, p, variant(kind, r), -60); }
  }
}
/* A clan's village, there long before us: meeting house, houses, their own workshops and fields */
function seedClan(I, r){
  const age = () => -Math.round(r() * AGE_FULL * 1.5);
  const put = (kind, from) => { const p = findSpot(I, kind, from); return p ? addB(I, kind, p, variant(kind, r), age()) : null; };
  const around = (o, rad) => { const a = r() * TAU, d = rad * (.6 + r() * .6); return {x:o.x + Math.cos(a) * d, y:o.y + Math.sin(a) * d * .8}; };
  if (I.atoll){
    seedAtollPlants(I, r);
    const h = homeSpot(I); for (let i = 0; i < 5; i++) put('haus', around(h, 30));
    put('schmuck', h); put('flecht', h); put('fisch', h); put('speicher', h);
  } else if (I.clan.id === 'alte'){
    // the old people of the Great Land: no meeting house of our kind, no pots; houses among gardens of taro and bananas
    const an = I.anchor;
    for (let i = 0; i < 8; i++) put('haus', around(an, 60));
    for (let i = 0; i < 4; i++) put('taro', around(an, 95));
    for (let i = 0; i < 4; i++) put('bananen', around(an, 100));
    palmsAlong(I, r, 10);
  } else {
    const an = I.anchor; addB(I, 'halle', {x:an.x, y:an.y}, {}, age());
    if (I.clan.id === 'nord') for (let i = 0; i < 2; i++) put('fisch', homeSpot(I));
    for (let i = 0; i < 6; i++) put('haus', around(an, 50));
    const ob = depsOf(I, 'obsidian')[0]; if (ob) put('klingen', ob);
    put('pferch', around(an, 70)); for (let i = 0; i < 3; i++) put('taro', around(an, 80));
    palmsAlong(I, r, 14);
  }
}
function topUp(I, kind, n, at, r){
  for (let i = nearCount(I, kind, at.x, at.y, 70); i < n; i++){ const p = findSpot(I, kind, {x:at.x + (r() - .5) * 60, y:at.y + (r() - .5) * 30}); if (p) addB(I, kind, p, variant(kind, r), -60); }
}
/* Where the first house of new settlers goes: the widest islet of an atoll, else near the harbour */
function homeSpot(I){
  if (I.atoll){ const s = I.segs.reduce((a, b) => b[1] - b[0] > a[1] - a[0] ? b : a); return I.R((s[0] + s[1]) / 2, (1.02 + s[2]) / 2); }
  return {x:I.harbor.x + (I.center.x - I.harbor.x) * .25, y:I.harbor.y + (I.center.y - I.harbor.y) * .25};
}

/* ---------- save and load: the seed rebuilds the islands, only what changed is stored */
/* a person as stored: id, name, birth, lifespan, grown, navigator knowledge, and for the married their clan, where they
   came from and the partner's name */
const packP = p => [p.id, p.n, p.b, p.l, p.a, p.nv ? Math.round(p.nv * 1000) / 1000 : 0, p.w || 0, p.f || 0, p.sp || 0, p.s || 'f', p.h || 0];
const unpackP = ([id, n, b, l, a, nv, w, f, sp, sx, h]) => ({id, n, b, l, a, s:sx || 'f', h:h || 0, ...(nv ? {nv} : {}), ...(w ? {w} : {}), ...(f ? {f} : {}), ...(sp ? {sp} : {})});
function serialize(){
  const keep = I => I.discovered || I.settled || I.clan || I.buildings.length;
  return JSON.stringify({v:4, wv:worldV, hs:homeSwap || undefined, cu:home0.cultures.map(c => [c.k, c.cx, c.cy]), qn:QUESTS.length, at:Date.now(), np:nextPid, nf:nextFam, seed, tick, nextId, nextShip, active, qid:quest < QUESTS.length ? QUESTS[quest].id : 'done', mana, cells:[...cells], st:stats, ch:chronik, ev:[nextEvent, lastEvent],
    routes:routes.map(r => ({a:r.a, b:r.b, knots:r.knots, lg:r.lastGift || 0, plan:r.plan})),
    fog:fogHoles.map(h => [Math.round(h.cx), Math.round(h.cy), Math.round(h.rx), Math.round(h.ry), h.seed | 0]),
    isl:islands.filter(keep).map(I => ({id:I.id, d:I.discovered, s:I.settled, st:I.stock, pop:I.pop, lv:I.lvl || 1, fa:I.feastAt || 0, fe:I.feastEnd || 0,
      fy:I.festYear, dr:I.drought || 0, rh:I.rahui || false, rx:I.rahuiDone, jy:I.joyUntil || 0, yd:I.yard || null,
      lf:I.life || undefined, wl:I.wild != null ? Math.round(I.wild * 1000) / 1000 : undefined, wg:I.gone || undefined, tp:I.tapu || undefined, ta:I.tapuAway || undefined, mo:I.motif || undefined, mk:I.mot && Object.keys(I.mot).length ? I.mot : undefined,
      cl:I.clan ? {debt:I.debt || 0, ra:I.returnAt || 0, lf:I.lastFrom || '', il:I.inlaws && I.inlaws.length ? I.inlaws.map(x => [x.n, x.from, x.at]) : undefined} : undefined,
      ppl:I.people ? I.people.map(packP) : undefined, anc:I.ahnen && I.ahnen.length ? I.ahnen : undefined, chf:I.chief || undefined, chl:I.chiefs && I.chiefs.length ? I.chiefs : undefined,
      nm:I.custom ? I.name : undefined, ts:I.treasure ? I.treasure.left : undefined, wr:I._wg ? wearCode(I._wg) : I.wearSaved || undefined,
      tr:I.treesSaved ? I.trees.map(t => [t.x, t.y, t.v, t.m, t.s, t.st, t.w, t.g]) : undefined, fm:I.fams && I.fams.length ? I.fams.map(f => [f.id, f.n, f.home || 0, f.job || 0]) : undefined, hw:I.handWork ? 1 : undefined, rl:I.rl || undefined, b:I.buildings.map(b => [b.id, b.kind, b.x, b.y, b.born, b.v, b.bt ? Math.round(b.bt * 100) / 100 : 0, b.boat ? Math.round(b.boat * 100) / 100 : 0, b.got || 0, b.soil != null ? Math.round(b.soil * 100) / 100 : null, b.fallow ? 1 : 0, b.t || 0])})),
    ships:ships.filter(s => s.own).map(s => ({id:s.id, kind:s.kind, name:s.name, x:Math.round(s.x), y:Math.round(s.y), port:s.port, last:s.last, cargo:s.cargo, people:s.people, dest:s.dest, route:s.route, state:s.state, hungry:!!s.hungry, tf:s.tripFrom || null, au:s.auto || undefined, lv:s.life && s.life.length ? s.life : undefined, fk:s.folk && s.folk.length ? s.folk.map(packP) : undefined}))});
}
function restore(raw){
  try {
    const s = JSON.parse(raw); if (!s || s.v !== 4 || !s.seed) return false;
    seed = s.seed >>> 0; worldV = s.wv || 1; homeSwap = s.hs ? 1 : 0; home0 = makeWorld(seed, worldV, homeSwap); resetCaches(); islands = home0.islands; cells = new Set(); resetGrid(); for (const I of islands) markLand(I);
    home0.cultures = s.cu ? s.cu.filter(c => CULTURES[c[0]]).map(([k, cx, cy]) => ({k, cx, cy})) : placeCultures(home0.cultures, new Set(s.cells || []));
    for (const key of s.cells || []){ const [cx, cy] = key.split(',').map(Number); ensureCell(cx, cy, false); }
    savedAt = +s.at || 0; nextPid = s.np || 1; nextFam = s.nf || 1; tick = s.tick | 0; nextId = s.nextId | 0 || 1; nextShip = s.nextShip | 0 || 1; active = s.active || 'heimat'; mana = +s.mana || 0;
    quest = questFromSave(s);
    stats = {gepflanzt:0, gefaellt:0, fisch:0, gaben:0, stuerme:0, ereignisse:0, ...(s.st || {})}; chronik = s.ch || {}; [nextEvent, lastEvent] = s.ev || [tick + 300, '']; eventNow = null;
    for (const d of s.isl){ const I = isl(d.id); if (!I) continue; I.discovered = !!d.d; I.settled = !!d.s; I.stock = {...emptyStock(), ...d.st}; I.pop = d.pop | 0;
      I.drought = d.dr || 0; I.lvl = d.lv || 1; I.feastAt = d.fa || 0; I.feastEnd = d.fe || 0; I.festYear = d.fy; I.rahui = !!d.rh; I.rahuiDone = d.rx; I.joyUntil = d.jy || 0; I.yard = d.yd || null;
      I.life = d.lf || null; I.wild = d.wl; I.gone = d.wg; I.tapu = !!d.tp; I.tapuAway = !!d.ta; I.motif = d.mo || null; I.mot = d.mk || {};
      if (I.clan && d.cl){ I.debt = d.cl.debt || 0; I.returnAt = d.cl.ra || 0; I.lastFrom = d.cl.lf || ''; I.inlaws = (d.cl.il || []).map(([n, from, at]) => ({n, from, at})); }
      I.buildings = (d.b || []).filter(x => KINDS[x[1]]).map(([id, kind, x, y, born, v, bt, boat, got, soil, fal, t]) => ({id, kind, x, y, born, v:v || {}, ...(t ? {t} : {}), ...(bt ? {bt} : {}), ...(boat ? {boat} : {}), ...(bt && got != null ? {got} : {}), ...(soil != null ? {soil} : {}), ...(fal ? {fallow:true} : {})}));
      I.fams = (d.fm || []).map(([id, n, home, job]) => ({id, n, home, job})); I.handWork = !!d.hw; I.rl = d.rl || 0;
      if (d.nm){ I.name0 = I.name; I.name = d.nm; I.custom = true; }
      I.people = d.ppl ? d.ppl.map(unpackP) : null; I.ahnen = d.anc || []; I.chief = d.chf || 0; I.chiefs = d.chl || [];
      if (I.treasure && d.ts != null) I.treasure.left = d.ts;
      I.wearSaved = d.wr || null; I._wg = null; I._wp = null;
      if (d.tr){ I.trees = d.tr.map(([x, y, v, m, sc, st, w, g]) => ({x, y, v, m, s:sc, st, w, g})); I.treesSaved = I.treeWork = true; I._tp = null; } }
    for (const I of islands) if (I.clan && !I.buildings.length) seedClan(I, rng(seed ^ (I.center.x | 0)));
    routes = (s.routes || []).filter(r => isl(r.a) && isl(r.b)).map(r => ({a:r.a, b:r.b, knots:r.knots | 0, lastGift:r.lg || 0, plan:r.plan || {a:{}, b:{}}}));
    fogHoles = (s.fog || []).map(([cx, cy, rx, ry, sd]) => ({cx, cy, rx, ry, seed:sd}));
    ships = []; selShip = null;
    for (const o of s.ships || []){
      if (o.port && !isl(o.port)) o.port = null;
      const sh = {...o, own:true, path:[], pi:0, hx:1, hy:0, dist:0, tripFrom:o.tf, auto:!!o.au, life:(o.lv || []).filter(id => LIFE[id]), folk:(o.fk || []).map(unpackP)};
      ships.push(sh);
      if (sh.state === 'sail' && sh.dest && !(sh.dest.isl && !isl(sh.dest.isl))) sailTo(sh, sh.dest); else if (sh.state === 'sail' || sh.state === 'wait') sh.state = sh.port ? 'moored' : 'sea';
      if (sh.route != null && !routes[sh.route]) sh.route = null;
      if (sh.route != null && sh.state === 'moored') sh.state = 'wait', sh.wait = 800;
    }
    for (const I of islands) I.lvl = I.lvl || 1;
    if (!isl(active) || !isl(active).settled) active = 'heimat';
    return isl('heimat').settled;
  } catch (e){ console.error(e); return false; }
}
/* Saves name the current task by id */
const questFromSave = s => s.qid === 'done' ? QUESTS.length : Math.max(0, QUESTS.findIndex(Q => Q.id === s.qid));
function save(){ if (landing) return; try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e){} }   // nothing to keep before the clan has landed
