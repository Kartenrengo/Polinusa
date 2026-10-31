'use strict';
/* Game state, the starting villages, save and load */

let seed = 1, islands = [], routes = [], fogHoles = [], cells = new Set(), home0 = null;   // cells: the sea already rolled; home0: home, Motu and the first clearing
let tick = 0, nextId = 1, active = 'heimat';
let mode = 'idle', placing = null, selectedId = null, sheetKind = null, sheetData = null;
let walkers = [], mana = 0;   // mana: the clan's standing, from feasts, gifts and a beautiful village
const isl = id => islands.find(I => I.id === id);
function findB(id){ for (const I of islands){ const b = I.buildings.find(x => x.id === id); if (b) return b; } return null; }
function islOfB(id){ return islands.find(I => I.buildings.some(b => b.id === id)); }
function addB(I, kind, p, v = {}, born = 0){ const b = {id:nextId++, kind, x:fx(p.x), y:fx(p.y), born, v}; I.buildings.push(b); return b; }
const newSeed = () => ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) || 1;

function newGame(s = newSeed()){
  seed = s; home0 = makeWorld(seed);
  islands = home0.islands; routes = []; ships = []; nextShip = 1; selShip = null; cells = new Set(); tick = 0; nextId = 1; active = 'heimat'; quest = 0; mana = 0;
  stats = {gepflanzt:0, gefaellt:0, fisch:0, gaben:0, stuerme:0, ereignisse:0}; chronik = {}; nextEvent = 300; lastEvent = ''; eventNow = null;
  resetGrid(); for (const I of islands) markLand(I);
  const Hm = isl('heimat'), T = isl('tochter'), r = rng(seed ^ 0x5eed);
  Object.assign(Hm, {discovered:true, settled:true, pop:5, stock:{...emptyStock(), holz:10, nahrung:10}});
  Object.assign(T, {discovered:true, settled:false, pop:0, stock:{}});
  seedStart(Hm, r); seedAtollPlants(T, r);
  // the first settlers on Motu must find enough palms and pandanus for rope and mats near their landing place
  const hs = homeSpot(T); topUp(T, 'pandanus', 3, hs, r); topUp(T, 'palme', 4, hs, r);
  fogHoles = [home0.hole];
  const h = home0.hole; for (let cy = Math.floor((h.cy - h.ry) / CELL); cy <= Math.floor((h.cy + h.ry) / CELL); cy++) for (let cx = Math.floor((h.cx - h.rx) / CELL); cx <= Math.floor((h.cx + h.rx) / CELL); cx++) ensureCell(cx, cy, true);
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
function seedStart(I, r){
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
  } else {
    const an = I.anchor; addB(I, 'halle', {x:an.x, y:an.y}, {}, age());
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
function serialize(){
  const keep = I => I.discovered || I.settled || I.clan || I.buildings.length;
  return JSON.stringify({v:3, seed, tick, nextId, nextShip, active, qid:quest < QUESTS.length ? QUESTS[quest].id : 'done', mana, cells:[...cells], st:stats, ch:chronik, ev:[nextEvent, lastEvent],
    routes:routes.map(r => ({a:r.a, b:r.b, knots:r.knots, lg:r.lastGift || 0, plan:r.plan})),
    fog:fogHoles.map(h => [Math.round(h.cx), Math.round(h.cy), Math.round(h.rx), Math.round(h.ry), h.seed | 0]),
    isl:islands.filter(keep).map(I => ({id:I.id, d:I.discovered, s:I.settled, st:I.stock, pop:I.pop, lv:I.lvl || 1, fa:I.feastAt || 0, fe:I.feastEnd || 0,
      fy:I.festYear, dr:I.drought || 0, rh:I.rahui || false, rd:I.rahuiDone, jy:I.joyUntil || 0, yd:I.yard || null,
      cl:I.clan ? {debt:I.debt || 0, ra:I.returnAt || 0, lf:I.lastFrom || ''} : undefined,
      nm:I.custom ? I.name : undefined, wr:I._wg ? wearCode(I._wg) : I.wearSaved || undefined, rd:I.roads && I.roads.length ? I.roads.map(r => r.map(p => [Math.round(p.x), Math.round(p.y)])) : undefined,
      tr:I.treesSaved ? I.trees.map(t => [t.x, t.y, t.v, t.m, t.s, t.st, t.w, t.g]) : undefined, pr:I.prio, b:I.buildings.map(b => [b.id, b.kind, b.x, b.y, b.born, b.v, b.bt ? Math.round(b.bt * 100) / 100 : 0, b.boat ? Math.round(b.boat * 100) / 100 : 0, b.got || 0])})),
    ships:ships.filter(s => s.own).map(s => ({id:s.id, kind:s.kind, name:s.name, x:Math.round(s.x), y:Math.round(s.y), port:s.port, last:s.last, cargo:s.cargo, people:s.people, dest:s.dest, route:s.route, state:s.state, hungry:!!s.hungry, tf:s.tripFrom || null}))});
}
function restore(raw){
  try {
    const s = JSON.parse(raw); if (!s || s.v !== 3 || !s.seed) return false;
    seed = s.seed >>> 0; home0 = makeWorld(seed); islands = home0.islands; cells = new Set(); resetGrid(); for (const I of islands) markLand(I);
    for (const key of s.cells || []){ const [cx, cy] = key.split(',').map(Number); ensureCell(cx, cy, false); }
    tick = s.tick | 0; nextId = s.nextId | 0 || 1; nextShip = s.nextShip | 0 || 1; active = s.active || 'heimat'; mana = +s.mana || 0;
    quest = questFromSave(s);
    stats = {gepflanzt:0, gefaellt:0, fisch:0, gaben:0, stuerme:0, ereignisse:0, ...(s.st || {})}; chronik = s.ch || {}; [nextEvent, lastEvent] = s.ev || [tick + 300, '']; eventNow = null;
    for (const d of s.isl){ const I = isl(d.id); if (!I) continue; I.discovered = !!d.d; I.settled = !!d.s; I.stock = {...emptyStock(), ...d.st}; I.pop = d.pop | 0;
      I.drought = d.dr || 0; I.lvl = d.lv || 1; I.feastAt = d.fa || 0; I.feastEnd = d.fe || 0; I.festYear = d.fy; I.rahui = !!d.rh; I.rahuiDone = d.rd; I.joyUntil = d.jy || 0; I.yard = d.yd || null;
      if (I.clan && d.cl){ I.debt = d.cl.debt || 0; I.returnAt = d.cl.ra || 0; I.lastFrom = d.cl.lf || ''; }
      I.buildings = (d.b || []).filter(x => KINDS[x[1]]).map(([id, kind, x, y, born, v, bt, boat, got]) => ({id, kind, x, y, born, v:v || {}, ...(bt ? {bt} : {}), ...(boat ? {boat} : {}), ...(bt && got != null ? {got} : {})}));
      if (d.pr) I.prio = d.pr;
      if (d.nm){ I.name0 = I.name; I.name = d.nm; I.custom = true; }
      I.wearSaved = d.wr || null; I._wg = null; I._wp = null; I.roads = (d.rd || []).map(r => r.map(([x, y]) => ({x, y}))); I._rp = null;
      if (d.tr){ I.trees = d.tr.map(([x, y, v, m, sc, st, w, g]) => ({x, y, v, m, s:sc, st, w, g})); I.treesSaved = I.treeWork = true; I._tp = null; } }
    for (const I of islands) if (I.clan && !I.buildings.length) seedClan(I, rng(seed ^ (I.center.x | 0)));
    routes = (s.routes || []).filter(r => isl(r.a) && isl(r.b)).map(r => ({a:r.a, b:r.b, knots:r.knots | 0, lastGift:r.lg || 0, plan:r.plan || {a:{}, b:{}}}));
    fogHoles = (s.fog || []).map(([cx, cy, rx, ry, sd]) => ({cx, cy, rx, ry, seed:sd}));
    ships = []; selShip = null;
    for (const o of s.ships || []){
      if (o.port && !isl(o.port)) o.port = null;
      const sh = {...o, own:true, path:[], pi:0, hx:1, hy:0, dist:0, tripFrom:o.tf};
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
/* Saves name the current task by id. Older saves counted tasks; this maps the old order onto the new list. */
function questFromSave(s){
  if (s.qid) return s.qid === 'done' ? QUESTS.length : Math.max(0, QUESTS.findIndex(Q => Q.id === s.qid));
  if (s.q == null) return QUESTS.length;
  const old = ['dach', 'essen', 'wachsen', 'ton', 'beile', 'wasser', 'motu', 'segel', 'tausch', 'kanu', 'land', 'fest'];
  return Math.max(0, QUESTS.findIndex(Q => Q.id === old[Math.min(s.q | 0, old.length - 1)]));
}
function save(){ try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e){} }
