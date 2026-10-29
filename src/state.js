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
  islands = w.islands; routes = []; boats = []; tick = 0; nextId = 1; active = 'heimat';
  const Hm = isl('heimat'), T = isl('tochter'), r = rng(seed ^ 0x5eed);
  Object.assign(Hm, {discovered:true, settled:true, pop:30, stock:{holz:12, nahrung:16, toepfe:3, beile:2, matten:0, schnur:0}});
  Object.assign(T, {discovered:true, settled:true, pop:8, stock:{holz:3, nahrung:6, toepfe:1, beile:0, matten:1, schnur:0}});
  seedVillage(Hm, r); seedAtoll(T, r);
  routes = [{a:'heimat', b:'tochter', knots:3}];
  fogHoles = [w.hole];
}

/* The home village: meeting house on the plaza, houses around it, canoe house on the beach */
function seedVillage(I, r){
  const an = I.anchor, c = I.center, age = () => -Math.round(r() * AGE_FULL);
  const put = (kind, from, born = age()) => { const p = findSpot(I, kind, from); return p ? addB(I, kind, p, variant(kind, r), born) : null; };
  const near = (rad, o = an) => { const a = r() * TAU, d = rad * (.6 + r() * .6); return {x:o.x + Math.cos(a) * d, y:o.y + Math.sin(a) * d * .8}; };
  const shore = nearestOn(I.lands[0].poly, I.harbor), inward = 1 / Math.hypot(c.x - shore.x, c.y - shore.y);
  addB(I, 'halle', {x:an.x, y:an.y - 15}, {}, -25);
  put('werft', {x:shore.x + (c.x - shore.x) * inward * 10, y:shore.y + (c.y - shore.y) * inward * 10}, -AGE_FULL / 2);
  put('speicher', near(40));
  for (let i = 0; i < 6; i++) put('haus', near(55));
  put('toepfer', near(70)); put('beil', near(70)); put('speicher', near(80));
  for (let i = 0; i < 3; i++) put('pfahl', {x:shore.x - (c.x - shore.x) * inward * 16 + (r() - .5) * 40, y:shore.y - (c.y - shore.y) * inward * 16 + (r() - .5) * 30});
  const fields = {x:(an.x + c.x) / 2, y:(an.y + c.y) / 2};
  for (let i = 0; i < 6; i++) put('taro', near(45, fields));
  for (let i = 0; i < 6; i++) put('baum', {x:c.x + (r() - .5) * (I.box.x1 - I.box.x0) * .6, y:c.y + (r() - .5) * (I.box.y1 - I.box.y0) * .6});
  palmsAlong(I, r, 22);
}
function palmsAlong(I, r, n){
  const L = I.lands[0].poly, c = I.center;
  for (let i = 0; i < n; i++){ const q = L[Math.floor(i / n * L.length)], p = {x:q.x + (c.x - q.x) * .07, y:q.y + (c.y - q.y) * .07}; if (!check('palme', I, p.x, p.y)) addB(I, 'palme', p, variant('palme', r), -60); }
}
/* The first atoll: a few houses on its widest islet, palms and pandanus all round */
function seedAtoll(I, r){
  const s = I.segs.reduce((a, b) => b[1] - b[0] > a[1] - a[0] ? b : a), am = (s[0] + s[1]) / 2, sp = s[1] - s[0], km = (1.02 + s[2]) / 2;
  const put = (kind, f, born) => { const p = findSpot(I, kind, I.R(am + sp * f, km)); if (p) addB(I, kind, p, variant(kind, r), born); };
  put('haus', -.28, -20); put('haus', .02, -10); put('haus', .3, -15); put('fisch', -.12, -25); put('flecht', .16, -25);
  for (const [t0, t1] of I.segs){
    const k = Math.max(2, Math.round((t1 - t0) / 18));
    for (let i = 0; i < k; i++){ const kind = r() < .2 ? 'pandanus' : 'palme', p = I.R(t0 + (t1 - t0) * (i + .5) / k, .96); if (!check(kind, I, p.x, p.y)) addB(I, kind, p, variant(kind, r), -60); }
  }
}

/* ---------- save and load: the seed rebuilds the islands, only what changed is stored */
function serialize(){
  const now = performance.now();
  return JSON.stringify({v:2, seed, tick, nextId, active, routes:routes.map(r => ({a:r.a, b:r.b, knots:r.knots})), fog:fogHoles.map(h => ({cx:h.cx, cy:h.cy, rx:h.rx, ry:h.ry, seed:h.seed})),
    isl:islands.map(I => ({id:I.id, d:I.discovered, s:I.settled, st:I.stock, pop:I.pop, canoe:I.canoe, b:I.buildings.map(b => [b.id, b.kind, b.x, b.y, b.born, b.v])})),
    boats:boats.map(b => ({exp:!!b.exp, route:b.route, from:b.from, to:b.to, cargo:b.cargo, dur:b.dur, up:b.up, reverse:b.reverse, p:clamp((now - b.t0) / b.dur, 0, 1)}))});
}
function restore(raw){
  try {
    const s = JSON.parse(raw); if (!s || s.v !== 2 || !s.seed) return false;
    seed = s.seed >>> 0; islands = makeWorld(seed).islands; tick = s.tick | 0; nextId = s.nextId | 0 || 1; active = s.active || 'heimat';
    for (const d of s.isl){ const I = isl(d.id); if (!I) continue; I.discovered = !!d.d; I.settled = !!d.s; I.stock = d.st || {}; I.pop = d.pop | 0; I.canoe = !!d.canoe;
      I.buildings = (d.b || []).filter(x => KINDS[x[1]]).map(([id, kind, x, y, born, v]) => ({id, kind, x, y, born, v:v || {}})); }
    routes = (s.routes || []).filter(r => isl(r.a) && isl(r.b)); fogHoles = s.fog || [];
    boats = [];
    for (const b of s.boats || []) if (isl(b.from) && isl(b.to) && (b.exp || routes[b.route])) addBoat({...b, t0:performance.now() - b.p * b.dur});
    if (!isl(active) || !isl(active).settled) active = 'heimat';
    return isl('heimat').settled;
  } catch (e){ return false; }
}
function save(){ try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e){} }
