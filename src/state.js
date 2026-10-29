'use strict';
/* Game state, the starting villages, save and load */

let seed = 1, islands = [], routes = [], fogHoles = [];
let tick = 0, nextId = 1, active = 'heimat';
let mode = 'idle', placing = null, selectedId = null, sheetKind = null, sheetData = null;
let boats = [], walkers = [], expSource = null, mana = 0;   // mana: the clan's standing, from feasts and gifts
const isl = id => islands.find(I => I.id === id);
function findB(id){ for (const I of islands){ const b = I.buildings.find(x => x.id === id); if (b) return b; } return null; }
function islOfB(id){ return islands.find(I => I.buildings.some(b => b.id === id)); }
function addB(I, kind, p, v = {}, born = 0){ const b = {id:nextId++, kind, x:fx(p.x), y:fx(p.y), born, v}; I.buildings.push(b); return b; }
const newSeed = () => ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) || 1;

function newGame(s = newSeed()){
  seed = s; const w = makeWorld(seed);
  islands = w.islands; routes = []; boats = []; tick = 0; nextId = 1; active = 'heimat'; quest = 0; mana = 0;
  const Hm = isl('heimat'), T = isl('tochter'), r = rng(seed ^ 0x5eed);
  Object.assign(Hm, {discovered:true, settled:true, pop:5, stock:{...emptyStock(), holz:8, nahrung:10}});
  Object.assign(T, {discovered:true, settled:false, pop:0, stock:{}});
  seedStart(Hm, r); seedAtollPlants(T, r);
  // the first settlers on Motu must find enough palms and pandanus for rope and mats near their landing place
  const hs = homeSpot(T); topUp(T, 'pandanus', 3, hs, r); topUp(T, 'palme', 4, hs, r);
  for (const I of islands) if (I.clan) seedClan(I, rng(seed ^ I.center.x));
  fogHoles = [w.hole];
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
  for (let i = 0; i < n; i++){ const q = L[Math.floor(i / n * L.length)], p = {x:q.x + (c.x - q.x) * .07, y:q.y + (c.y - q.y) * .07}; if (!check('palme', I, p.x, p.y)) addB(I, 'palme', p, variant('palme', r), -60); }
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
  const now = performance.now();
  return JSON.stringify({v:2, seed, tick, nextId, active, qid:quest < QUESTS.length ? QUESTS[quest].id : 'done', mana, routes:routes.map(r => ({a:r.a, b:r.b, knots:r.knots, lg:r.lastGift || 0})), fog:fogHoles.map(h => ({cx:h.cx, cy:h.cy, rx:h.rx, ry:h.ry, seed:h.seed})),
    isl:islands.map(I => ({id:I.id, d:I.discovered, s:I.settled, st:I.stock, pop:I.pop, canoe:I.canoe, lv:I.lvl || 1, fa:I.feastAt || 0, fe:I.feastEnd || 0,
      cl:I.clan ? {debt:I.debt || 0, ra:I.returnAt || 0, lf:I.lastFrom || ''} : undefined, b:I.buildings.map(b => [b.id, b.kind, b.x, b.y, b.born, b.v])})),
    boats:boats.map(b => ({kind:b.kind, exp:!!b.exp, back:!!b.back, settle:!!b.settle, gift:!!b.gift, people:b.people || 0, route:b.route, from:b.from, to:b.to, cargo:b.cargo, dur:b.dur, up:b.up, reverse:b.reverse, p:clamp((now - b.t0) / b.dur, 0, 1)}))});
}
function restore(raw){
  try {
    const s = JSON.parse(raw); if (!s || s.v !== 2 || !s.seed) return false;
    seed = s.seed >>> 0; islands = makeWorld(seed).islands; tick = s.tick | 0; nextId = s.nextId | 0 || 1; active = s.active || 'heimat'; mana = +s.mana || 0;
    quest = questFromSave(s);
    for (const d of s.isl){ const I = isl(d.id); if (!I) continue; I.discovered = !!d.d; I.settled = !!d.s; I.stock = {...emptyStock(), ...d.st}; I.pop = d.pop | 0; I.canoe = !!d.canoe;
      I.lvl = d.lv || 1; I.feastAt = d.fa || 0; I.feastEnd = d.fe || 0;
      if (I.clan && d.cl){ I.debt = d.cl.debt || 0; I.returnAt = d.cl.ra || 0; I.lastFrom = d.cl.lf || ''; }
      I.buildings = (d.b || []).filter(x => KINDS[x[1]]).map(([id, kind, x, y, born, v]) => ({id, kind, x, y, born, v:v || {}})); }
    for (const I of islands) if (I.clan && !I.buildings.length) seedClan(I, rng(seed ^ I.center.x));   // saves from before the clans
    routes = (s.routes || []).filter(r => isl(r.a) && isl(r.b)).map(r => ({a:r.a, b:r.b, knots:r.knots | 0, lastGift:r.lg || 0})); fogHoles = s.fog || [];
    boats = [];
    for (const b of s.boats || []) if (isl(b.from) && isl(b.to) && (b.exp || b.settle || routes[b.route])) addBoat({...b, t0:performance.now() - b.p * b.dur});
    for (const I of islands) I.lvl = I.lvl || 1;
    if (!isl(active) || !isl(active).settled) active = 'heimat';
    return isl('heimat').settled;
  } catch (e){ return false; }
}
/* Saves name the current task by id. Older saves counted tasks; this maps the old order onto the new list. */
function questFromSave(s){
  if (s.qid) return s.qid === 'done' ? QUESTS.length : Math.max(0, QUESTS.findIndex(Q => Q.id === s.qid));
  if (s.q == null) return QUESTS.length;
  const old = ['dach', 'essen', 'wachsen', 'ton', 'beile', 'wasser', 'motu', 'segel', 'tausch', 'kanu', 'land', 'fest'];
  return Math.max(0, QUESTS.findIndex(Q => Q.id === old[Math.min(s.q | 0, old.length - 1)]));
}
function save(){ try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e){} }
