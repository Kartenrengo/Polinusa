'use strict';
/* Game state, the starting villages, save and load */

let seed = 1, islands = [], routes = [], fogHoles = [];
let tick = 0, nextId = 1, active = 'heimat';
let mode = 'idle', placing = null, selectedId = null, sheetKind = null, sheetData = null;
let boats = [], walkers = [], expSource = null;
const isl = id => islands.find(I => I.id === id);
function findB(id){ for (const I of islands){ const b = I.buildings.find(x => x.id === id); if (b) return b; } return null; }
function islOfB(id){ return islands.find(I => I.buildings.some(b => b.id === id)); }
function addB(I, kind, p, v = {}, born = 0){ const b = {id:nextId++, kind, x:fx(p.x), y:fx(p.y), born, v}; I.buildings.push(b); return b; }
const newSeed = () => ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) || 1;

function newGame(s = newSeed()){
  seed = s; const w = makeWorld(seed);
  islands = w.islands; routes = []; boats = []; tick = 0; nextId = 1; active = 'heimat'; quest = 0;
  const Hm = isl('heimat'), T = isl('tochter'), r = rng(seed ^ 0x5eed);
  Object.assign(Hm, {discovered:true, settled:true, pop:5, stock:{holz:8, nahrung:10, toepfe:0, beile:0, matten:0, schnur:0}});
  Object.assign(T, {discovered:true, settled:false, pop:0, stock:{}});
  seedStart(Hm, r); seedAtollPlants(T, r);
  fogHoles = [w.hole];
}

/* Like the first landing: only the meeting house on the plaza, palms on the beach, two wild breadfruit trees */
function seedStart(I, r){
  const an = I.anchor;
  addB(I, 'halle', {x:an.x, y:an.y - 15}, {}, 0);
  for (let i = 0; i < 2; i++){ const a = r() * TAU, p = findSpot(I, 'baum', {x:an.x + Math.cos(a) * 70, y:an.y + Math.sin(a) * 56}); if (p) addB(I, 'baum', p, variant('baum', r), -60); }
  palmsAlong(I, r, 22);
}
function palmsAlong(I, r, n){
  const L = I.lands[0].poly, c = I.center;
  for (let i = 0; i < n; i++){ const q = L[Math.floor(i / n * L.length)], p = {x:q.x + (c.x - q.x) * .07, y:q.y + (c.y - q.y) * .07}; if (!check('palme', I, p.x, p.y)) addB(I, 'palme', p, variant('palme', r), -60); }
}
/* An empty atoll: palms and pandanus on every islet */
function seedAtollPlants(I, r){
  for (const [t0, t1] of I.segs){
    const k = Math.max(2, Math.round((t1 - t0) / 18));
    for (let i = 0; i < k; i++){ const kind = r() < .2 ? 'pandanus' : 'palme', p = I.R(t0 + (t1 - t0) * (i + .5) / k, .96); if (!check(kind, I, p.x, p.y)) addB(I, kind, p, variant(kind, r), -60); }
  }
}
/* Where the first house of new settlers goes: the widest islet of an atoll, else near the harbour */
function homeSpot(I){
  if (I.atoll){ const s = I.segs.reduce((a, b) => b[1] - b[0] > a[1] - a[0] ? b : a); return I.R((s[0] + s[1]) / 2, (1.02 + s[2]) / 2); }
  return {x:I.harbor.x + (I.center.x - I.harbor.x) * .25, y:I.harbor.y + (I.center.y - I.harbor.y) * .25};
}

/* ---------- save and load: the seed rebuilds the islands, only what changed is stored */
function serialize(){
  const now = performance.now();
  return JSON.stringify({v:2, seed, tick, nextId, active, q:quest, routes:routes.map(r => ({a:r.a, b:r.b, knots:r.knots})), fog:fogHoles.map(h => ({cx:h.cx, cy:h.cy, rx:h.rx, ry:h.ry, seed:h.seed})),
    isl:islands.map(I => ({id:I.id, d:I.discovered, s:I.settled, st:I.stock, pop:I.pop, canoe:I.canoe, b:I.buildings.map(b => [b.id, b.kind, b.x, b.y, b.born, b.v])})),
    boats:boats.map(b => ({kind:b.kind, exp:!!b.exp, settle:!!b.settle, people:b.people || 0, route:b.route, from:b.from, to:b.to, cargo:b.cargo, dur:b.dur, up:b.up, reverse:b.reverse, p:clamp((now - b.t0) / b.dur, 0, 1)}))});
}
function restore(raw){
  try {
    const s = JSON.parse(raw); if (!s || s.v !== 2 || !s.seed) return false;
    seed = s.seed >>> 0; islands = makeWorld(seed).islands; tick = s.tick | 0; quest = s.q == null ? QUESTS.length : s.q | 0; nextId = s.nextId | 0 || 1; active = s.active || 'heimat';
    for (const d of s.isl){ const I = isl(d.id); if (!I) continue; I.discovered = !!d.d; I.settled = !!d.s; I.stock = d.st || {}; I.pop = d.pop | 0; I.canoe = !!d.canoe;
      I.buildings = (d.b || []).filter(x => KINDS[x[1]]).map(([id, kind, x, y, born, v]) => ({id, kind, x, y, born, v:v || {}})); }
    routes = (s.routes || []).filter(r => isl(r.a) && isl(r.b)); fogHoles = s.fog || [];
    boats = [];
    for (const b of s.boats || []) if (isl(b.from) && isl(b.to) && (b.exp || b.settle || routes[b.route])) addBoat({...b, t0:performance.now() - b.p * b.dur});
    if (!isl(active) || !isl(active).settled) active = 'heimat';
    return isl('heimat').settled;
  } catch (e){ return false; }
}
function save(){ try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e){} }
