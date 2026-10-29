'use strict';
/* The world: islands generated from one seed, plus the rules for where things may stand.
   Only the start is laid out at once. The sea is cut into cells; a cell is rolled the moment a canoe first sees into it,
   always with the same result for the same seed. Before that the game itself does not know what lies there.
   Only the seed and the cells already seen are saved. */

const W = 4800, H = 7200, CELL = 800;
/* Island names are Proto-Oceanic words */
const NAMES = {
  hoch: ['Patu', 'Kuro', 'Langi', 'Talise', 'Wai', 'Ulu', 'Mata'],   // Stein, Topf, Himmel, Mandelbaum, Süßwasser, Kopf, Auge
  vulkan: ['Api', 'Ulu', 'Langi', 'Patu'],                            // Feuer, Kopf, Himmel, Stein
  atoll: ['Namo', 'One', 'Niu', 'Ika', 'Tasi', 'Manu', 'Ponu']        // Lagune, Sand, Kokospalme, Fisch, Meer, Vogel, Schildkröte
};
const NUMBER = ['', ' Rua', ' Tolu', ' Pati', ' Lima'];               // the second, third ... island of a name: zwei, drei, vier, fünf
const radOf = (kind, size) => kind === 'atoll' ? size + 12 : size * 1.36 + 50;

/* The start: Panua with its first atoll Motu next door */
function makeWorld(seed){
  const r = rng(seed), spots = [];
  const hx = W * (.42 + r() * .1), hy = H * (.55 + r() * .1);
  spots.push({id:'heimat', name:'Panua', kind:'hoch', x:hx, y:hy, size:138 + r() * 16});
  const a = (-100 + r() * 70) * Math.PI / 180, d = 470 + r() * 70;
  spots.push({id:'tochter', name:'Motu', kind:'atoll', x:hx + Math.cos(a) * d, y:hy + Math.sin(a) * d, size:112 + r() * 16});
  for (const s of spots) s.rad = radOf(s.kind, s.size);
  const hole = startHoleFor(spots);
  const islands = spots.map((s, i) => {
    const o = spots[1 - i], len = Math.hypot(o.x - s.x, o.y - s.y) || 1, dir = {x:(o.x - s.x) / len, y:(o.y - s.y) / len};
    const I = s.kind === 'atoll' ? genAtoll(s, dir, rng(seed ^ (i + 1) * 7919)) : genHigh(s, dir, rng(seed ^ (i + 1) * 7919), false, true);
    Object.assign(I, {id:s.id, name:s.name, discovered:false, settled:false, stock:{}, pop:0, buildings:[], canoe:false, lvl:1});
    return I;
  });
  return {islands, hole, home:{x:hx, y:hy}, keep:spots};
}
/* One cell of open sea: maybe an island, maybe a clan on it. Near home islands are more likely. */
function genCell(seed, cx, cy, start, used){
  const r = rng((seed ^ Math.imul(cx + 101, 73856093) ^ Math.imul(cy + 211, 19349663)) >>> 0);
  const hc = {x:Math.floor(start.home.x / CELL), y:Math.floor(start.home.y / CELL)}, dc = Math.max(Math.abs(cx - hc.x), Math.abs(cy - hc.y));
  if (r() > (dc <= 1 ? .75 : dc <= 3 ? .6 : .45)) return null;
  const roll = r(), kind = roll < .42 ? 'atoll' : roll < .66 ? 'vulkan' : 'hoch';
  const size = kind === 'atoll' ? 92 + r() * 36 : kind === 'vulkan' ? 104 + r() * 22 : 108 + r() * 32, rad = radOf(kind, size), m = rad + 50;
  const x = cx * CELL + m + r() * (CELL - 2 * m), y = cy * CELL + m + r() * (CELL - 2 * m);
  // never crowd the start
  if (start.keep.some(k => Math.hypot(k.x - x, k.y - y) < k.rad + rad + 160)) return null;
  const h = start.hole, ex = (x - h.cx) / (h.rx + rad + 60), ey = (y - h.cy) / (h.ry + rad + 60); if (ex * ex + ey * ey < 1) return null;
  const len = Math.hypot(start.home.x - x, start.home.y - y) || 1, dir = {x:(start.home.x - x) / len, y:(start.home.y - y) / len};
  const sp = {x, y, size, kind};
  const I = kind === 'atoll' ? genAtoll(sp, dir, r) : genHigh(sp, dir, r, kind === 'vulkan', false);
  const pool = NAMES[kind], base = pool[Math.floor(r() * pool.length)];
  let name = base; for (let i = 1; used.has(name) && i < NUMBER.length; i++) name = base + NUMBER[i];
  if (used.has(name)) name = base + ' ' + (cx * 10 + cy);
  // a clan, further out: on a volcano with obsidian, on an atoll, or in a kava grove on a high island
  const clanRoll = r();
  if (dc >= 2 && clanRoll < .3){ const t = kind === 'vulkan' ? 'feuer' : kind === 'atoll' ? 'riff' : 'hain'; if (t !== 'feuer' || I.deco.some(d => d.t === 'obsidian')) I.clan = {id:t, ...CLANS[t]}; }
  Object.assign(I, {id:`c${cx}_${cy}`, name, discovered:false, settled:false, stock:{}, pop:0, buildings:[], canoe:false, lvl:1, cell:[cx, cy]});
  return I;
}
function startHoleFor(spots){
  const [a, b] = spots, x0 = Math.min(a.x - a.rad, b.x - b.rad), x1 = Math.max(a.x + a.rad, b.x + b.rad), y0 = Math.min(a.y - a.rad, b.y - b.rad), y1 = Math.max(a.y + a.rad, b.y + b.rad);
  return {cx:fx((x0 + x1) / 2), cy:fx((y0 + y1) / 2), rx:fx((x1 - x0) / 2 * 1.3 + 60), ry:fx((y1 - y0) / 2 * 1.12 + 60), seed:3};
}

/* ---------- high island: green hills, forest inland, reef ring with a lagoon */
function genHigh(s, hdir, r, volcano, home){
  const cx = s.x, cy = s.y, rx = s.size, ry = s.size * (1.02 + r() * .3), n = 32;
  const ph = [r(), r(), r(), r()].map(v => v * TAU), am = [.09 + r() * .06, .05 + r() * .05, .025 + r() * .025];
  const wob = t => 1 + am[0] * Math.sin(2 * t + ph[0]) + am[1] * Math.sin(3 * t + ph[1]) + am[2] * Math.sin(5 * t + ph[2]);
  const coast = [], reef = [];
  for (let i = 0; i < n; i++){
    const t = i / n * TAU, k = wob(t), c = Math.cos(t), sn = Math.sin(t), j = 1 + (r() - .5) * .05, off = 40 + 8 * Math.sin(2 * t + ph[3]);
    coast.push({x:cx + c * rx * k * j, y:cy + sn * ry * k * j});
    reef.push({x:cx + c * (rx * k + off), y:cy + sn * (ry * k + off)});
  }
  const land = smooth(coast), rf = smooth(reef);
  let harbor = rf.poly[0], best = -Infinity;
  for (const p of rf.poly){ const v = (p.x - cx) * hdir.x + (p.y - cy) * hdir.y; if (v > best){ best = v; harbor = p; } }
  const I = {type:'hoch', center:{x:cx, y:cy}, lands:[land], reef:rf, harbor:{x:fx(harbor.x), y:fx(harbor.y)}, blocked:[], deco:[]};
  const inland = (p, m) => inPoly(p, land.poly) && polyDist(p, land.poly) >= m;

  // village anchor: between the middle and the harbour, with room around it
  let an = {x:cx + (harbor.x - cx) * .42, y:cy + (harbor.y - cy) * .42};
  for (let i = 0; i < 6 && !inland(an, 34); i++) an = {x:an.x + (cx - an.x) * .25, y:an.y + (cy - an.y) * .25};
  I.anchor = {x:fx(an.x), y:fx(an.y)};

  const away = Math.atan2(-hdir.y, -hdir.x) + (r() - .5) * 1.2;
  if (volcano){
    I.volcano = {x:fx(cx + 2), y:fx(cy + 16)};
    I.blocked.push({x:I.volcano.x, y:I.volcano.y - 28, r:38});
  }
  // forest on the far side of the harbour, shrunk until it fits inside the coast
  const fd = volcano ? .62 : .34, fc = {x:cx + Math.cos(away) * rx * fd, y:cy + Math.sin(away) * ry * fd};
  const fs = r() * 1e9 | 0;
  for (let sc = 1; sc > .3; sc -= .1){
    const pts = ring(fc.x, fc.y, rx * (volcano ? .22 : .4) * sc, ry * (volcano ? .18 : .32) * sc, volcano ? 9 : 14, fs, .2);
    if (pts.every(p => inland(p, 10))){ I.forest = pts.map(p => ({x:fx(p.x), y:fx(p.y)})); break; }
  }
  // a stream runs from the forest sideways to the sea, away from the village
  if (!volcano && I.forest && (home || r() < .6)){
    let ang = Math.atan2(hdir.y, hdir.x) + (r() < .5 ? -1 : 1) * (Math.PI * .5 + r() * .35);
    let p = {x:fc.x + Math.cos(ang) * rx * .2, y:fc.y + Math.sin(ang) * ry * .16};
    const pts = [p];
    for (let i = 0; i < 24; i++){
      ang += (r() - .5) * .6; p = {x:p.x + Math.cos(ang) * 22, y:p.y + Math.sin(ang) * 22}; pts.push(p);
      if (!inPoly(p, land.poly)) break;
    }
    if (pts.length > 4 && !inPoly(p, land.poly)) riverMouth(I, pts, land);
  }
  // things that take up ground: the village plaza and a garden on the home island, a rock on most
  const free = (p, rad) => inland(p, rad + 6) && !(I.forest && (inPoly(p, I.forest) || polyDist(p, I.forest) < rad + 6)) &&
    !(I.river && polyDist(p, I.river, false) < rad + 8) && !inDelta(I, p, rad + 6) && I.blocked.every(z => Math.hypot(p.x - z.x, p.y - z.y) > z.r + rad + 10);
  const place = (t, rad, near) => {
    for (let i = 0; i < 300; i++){
      const p = near ? {x:near.x + (r() - .5) * 2 * (20 + i), y:near.y + (r() - .5) * 2 * (16 + i * .8)} : {x:cx + (r() - .5) * 1.5 * rx, y:cy + (r() - .5) * 1.5 * ry};
      if (!free(p, rad)) continue;
      if (t !== 'plaza' && Math.hypot(p.x - I.anchor.x, p.y - I.anchor.y) < rad + 60) continue;
      const q = {t, x:fx(p.x), y:fx(p.y), rot:t === 'garden' ? Math.round((r() - .5) * 30) : 0};
      I.deco.push(q); I.blocked.push({x:q.x, y:q.y, r:rad}); return q;
    }
    return null;
  };
  if (home){ const pz = place('plaza', 20, I.anchor); if (pz) I.anchor = {x:pz.x, y:pz.y}; place('garden', 32, {x:(I.anchor.x + cx) / 2, y:(I.anchor.y + cy) / 2}); }
  r(); place('rock', 20);   // basalt for stone adzes on every high island
  // clay: on the bank of the stream, or in a damp hollow near the shore
  if (home || r() < .7){
    let done = false;
    if (I.river) for (let i = 0; i < 40 && !done; i++){
      const j = 1 + Math.floor(r() * (I.river.length - 2)), a = I.river[j], b = I.river[j + 1] || I.river[j - 1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, side = r() < .5 ? -1 : 1;
      const p = {x:a.x - (b.y - a.y) / l * 16 * side, y:a.y + (b.x - a.x) / l * 16 * side};
      if (inland(p, 16) && !(I.forest && inPoly(p, I.forest)) && polyDist(p, I.river, false) > 10 && I.blocked.every(z => Math.hypot(p.x - z.x, p.y - z.y) > z.r + 18)){ I.deco.push({t:'clay', x:fx(p.x), y:fx(p.y), rot:0}); I.blocked.push({x:fx(p.x), y:fx(p.y), r:10}); done = true; }
    }
    if (!done) place('clay', 10);
  }
  // obsidian: dark glass on the slopes around the volcano, up to two places
  if (volcano){
    const v = I.volcano; let n = 0;
    for (let i = 0; i < 40 && n < 2; i++){
      const a = (i % 2 ? Math.PI - .5 : .5) + (r() - .5) * 1.6 + (i > 10 ? r() * TAU : 0), d = 46 + r() * 22;
      const q = {x:v.x + Math.cos(a) * d, y:v.y - 10 + Math.sin(a) * d * .7};
      if (free(q, 10) && depsOf(I, 'obsidian').every(o => Math.hypot(o.x - q.x, o.y - q.y) > 50)){ I.deco.push({t:'obsidian', x:fx(q.x), y:fx(q.y), rot:0}); I.blocked.push({x:fx(q.x), y:fx(q.y), r:10}); n++; }
    }
  }

  I.box = polyBox(rf.poly, 6);
  I.labelAt = {x:fx(cx), y:fx(I.box.y0 - 12)};
  // the rest only adorns the island and comes from its own random numbers, so it never shifts the world
  const r2 = rng((Math.round(cx * 7 + cy * 13) ^ 0x51ab) >>> 0);
  if (!volcano) hillsOf(I, r2, fc, inland);
  treesOf(I, r2, inland, home);
  smallThings(I, r2, coast, reef, inland);
  return I;
}
/* The stream ends where it meets the beach and fans out into a small delta of sand and three arms */
function riverMouth(I, pts, land){
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  let lo = 0, hi = 1; for (let i = 0; i < 12; i++){ const m = (lo + hi) / 2; if (inPoly({x:a.x + (b.x - a.x) * m, y:a.y + (b.y - a.y) * m}, land.poly)) lo = m; else hi = m; }
  const M = {x:a.x + (b.x - a.x) * lo, y:a.y + (b.y - a.y) * lo}, dl = Math.hypot(b.x - a.x, b.y - a.y) || 1, n = {x:(b.x - a.x) / dl, y:(b.y - a.y) / dl}, t = {x:-n.y, y:n.x};
  // the arms split a little inland
  const S = {x:M.x - n.x * 20, y:M.y - n.y * 20}, main = pts.slice(0, -1).filter(q => Math.hypot(q.x - M.x, q.y - M.y) > 22);
  main.push(S);
  I.river = main.map(q => ({x:fx(q.x), y:fx(q.y)}));
  const arms = [-1, 0, 1].map(k => {
    const E = {x:M.x + n.x * (k ? 4 : 7) + t.x * k * 12, y:M.y + n.y * (k ? 4 : 7) + t.y * k * 12};
    const C = {x:(S.x + E.x) / 2 + t.x * k * 3, y:(S.y + E.y) / 2 + t.y * k * 3};
    return [S, C, E].map(q => ({x:fx(q.x), y:fx(q.y)}));
  });
  // the fan is a little larger than the arms, so they end in the sand and not in open water
  const fan = [S, {x:M.x - n.x * 9 + t.x * 19, y:M.y - n.y * 9 + t.y * 19}, {x:M.x + n.x * 9 + t.x * 23, y:M.y + n.y * 9 + t.y * 23},
    {x:M.x + n.x * 16, y:M.y + n.y * 16}, {x:M.x + n.x * 9 - t.x * 23, y:M.y + n.y * 9 - t.y * 23}, {x:M.x - n.x * 9 - t.x * 19, y:M.y - n.y * 9 - t.y * 19}];
  I.delta = {fan:fan.map(q => ({x:fx(q.x), y:fx(q.y)})), arms, mouth:{x:fx(M.x), y:fx(M.y)}};
}
const inDelta = (I, p, m = 0) => !!I.delta && (inPoly(p, I.delta.fan) || polyDist(p, I.delta.fan) < m);
/* Hills under the forest: a slope and a summit, drawn with hachures like on an old chart */
function hillsOf(I, r, fc, inland){
  const hc = {x:fc.x + (I.center.x - fc.x) * .3, y:fc.y + (I.center.y - fc.y) * .3}, rx = I.box.x1 - I.box.x0, ry = I.box.y1 - I.box.y0, sd = r() * 1e9 | 0;
  for (let sc = 1; sc > .35; sc -= .08){
    const out = ring(hc.x, hc.y, rx * .23 * sc, ry * .19 * sc, 18, sd, .16);
    if (!out.every(p => inland(p, 14))) continue;
    const top = ring(hc.x + rx * .02, hc.y - ry * .02, rx * .1 * sc, ry * .08 * sc, 12, sd + 7, .18);
    I.hills = {out:out.map(p => ({x:fx(p.x), y:fx(p.y)})), top:top.map(p => ({x:fx(p.x), y:fx(p.y)})), c:{x:fx(hc.x), y:fx(hc.y)}};
    return;
  }
}
/* Trees: a forest of single trees, each with some wood in it, and a few groves elsewhere */
const TREE_WOOD = 3, TREE_R = 6;
function treesOf(I, r, inland, home){
  const T = I.trees = [];
  const ok = p => inland(p, 9) && !(I.river && polyDist(p, I.river, false) < 9) && !inDelta(I, p, 8) && I.blocked.every(z => Math.hypot(p.x - z.x, p.y - z.y) > z.r + 7) &&
    T.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 10);
  const add = p => { const wet = I.river && polyDist(p, I.river, false) < 30, k = r(); T.push({x:fx(p.x), y:fx(p.y), v:wet && k < .45 ? 2 : k < .55 ? 0 : k < .85 ? 1 : 2, m:r() < .5 ? 1 : 0, s:fx(.86 + r() * .24), st:0, w:TREE_WOOD, g:0}); };
  if (I.forest){
    const b = polyBox(I.forest, 0);
    for (let y = b.y0; y < b.y1; y += 11) for (let x = b.x0 + (Math.round(y / 11) % 2) * 6; x < b.x1; x += 13){
      const p = {x:x + (r() - .5) * 7, y:y + (r() - .5) * 5};
      if ((inPoly(p, I.forest) || (polyDist(p, I.forest) < 10 && r() < .4)) && ok(p)) add(p);
    }
  }
  // groves away from the village
  const an = I.anchor;
  for (let g = 0, tries = 0; g < 3 && tries < 60; tries++){
    const c = {x:I.center.x + (r() - .5) * (I.box.x1 - I.box.x0) * .7, y:I.center.y + (r() - .5) * (I.box.y1 - I.box.y0) * .7};
    if (!inland(c, 20) || Math.hypot(c.x - an.x, c.y - an.y) < (home ? 110 : 80)) continue;
    g++; for (let i = 0, n = 3 + Math.floor(r() * 4); i < n * 3 && n > 0; i++){ const a = r() * TAU, d = r() * 22, p = {x:c.x + Math.cos(a) * d, y:c.y + Math.sin(a) * d * .8}; if (ok(p)){ add(p); n--; } }
  }
  T.sort((a, b) => a.y - b.y);
}
/* Small things that make an island look lived in by nature: grass, flowers, ferns, reeds, shells, driftwood, coral */
function smallThings(I, r, coast, reef, inland){
  const D = I.deco, put = (t, p, rot = 0) => D.push({t, x:fx(p.x), y:fx(p.y), rot:Math.round(rot), s:1});
  const L = I.lands[0].poly, rnd = (a, b) => a + r() * (b - a);
  const clear = p => !(I.river && polyDist(p, I.river, false) < 7) && !inDelta(I, p, 4) && I.blocked.every(z => Math.hypot(p.x - z.x, p.y - z.y) > z.r + 4);
  const inner = () => ({x:I.center.x + rnd(-.5, .5) * (I.box.x1 - I.box.x0), y:I.center.y + rnd(-.5, .5) * (I.box.y1 - I.box.y0)});
  for (let i = 0, n = 0; i < 140 && n < 34; i++){ const p = inner(); if (inland(p, 10) && clear(p)){ put(r() < .8 ? 'tuft' : 'flowers', p, rnd(-20, 20)); n++; } }
  if (I.forest) for (let i = 0; i < 10; i++){ const q = I.forest[Math.floor(r() * I.forest.length)], p = {x:q.x + rnd(-8, 8), y:q.y + rnd(-6, 6)}; if (inland(p, 8) && clear(p)) put('fern', p); }
  if (I.river) for (let i = 0; i < 9; i++){ const j = 1 + Math.floor(r() * (I.river.length - 2)), a = I.river[j], b = I.river[j + 1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, sd = r() < .5 ? -1 : 1;
    const p = {x:a.x - (b.y - a.y) / l * 7 * sd, y:a.y + (b.x - a.x) / l * 7 * sd}; if (inland(p, 6)) put('reed', p); }
  if (I.delta) for (const sd of [-1, 1]){ const m = I.delta.mouth, f = I.delta.fan[sd < 0 ? 5 : 1]; put('reed', {x:(m.x + f.x) / 2, y:(m.y + f.y) / 2}); }
  // the beach: shells, driftwood and dark stones in the sand
  for (let i = 0; i < 22; i++){
    const q = L[Math.floor(r() * L.length)], c = I.center, d = Math.hypot(c.x - q.x, c.y - q.y) || 1, k = rnd(3, 6), p = {x:q.x + (c.x - q.x) / d * k, y:q.y + (c.y - q.y) / d * k};
    if (!clear(p) || inDelta(I, p, 10)) continue;
    const t = i < 12 ? 'shell' : i < 15 ? 'drift' : 'stone'; put(t, p, t === 'drift' ? Math.atan2(c.y - q.y, c.x - q.x) * 180 / Math.PI + 90 : rnd(0, 360));
  }
  // coral heads between the beach and the reef
  for (let i = 0; i < 14; i++){ const j = Math.floor(r() * coast.length), a = coast[j], b = reef[j], f = rnd(.4, .75), p = {x:a.x + (b.x - a.x) * f, y:a.y + (b.y - a.y) * f};
    if (polyDist(p, L) > 8 && !inPoly(p, L) && !inDelta(I, p, 6)) put('coral', p, rnd(0, 360)); }
}

/* ---------- atoll: a ring of low sandy islets around a lagoon, the widest gap is the passage */
function genAtoll(s, hdir, r){
  const cx = s.x, cy = s.y, rx = s.size, ry = s.size * (.62 + r() * .1);
  const th = Math.atan2(hdir.y / ry, hdir.x / rx) * 180 / Math.PI, gap = 32 + r() * 14;
  const R = (t, k) => ({x:cx + rx * k * Math.cos(t * Math.PI / 180), y:cy + ry * k * Math.sin(t * Math.PI / 180)});
  const segs = []; let t = th + gap / 2; const end = th + 360 - gap / 2;
  while (t < end - 18){
    const span = Math.min(34 + r() * 56, end - t);
    if (span >= 18) segs.push([fx(t), fx(t + span), fx(.66 + r() * .18)]);
    t += span + 14 + r() * 24;
  }
  segs.reduce((a, b) => b[1] - b[0] > a[1] - a[0] ? b : a)[2] = .62;   // the longest islet is wide enough for a village
  const lands = segs.map(([t0, t1, kin]) => {
    const steps = Math.max(3, Math.round((t1 - t0) / 14)), ts = [];
    for (let i = 0; i < steps; i++) ts.push(t0 + (t1 - t0) * i / (steps - 1));
    const kout = 1.02, mid = (kout + kin) / 2;
    return smooth([...ts.map(q => R(q, kout)), R(t1 + 5, mid), ...ts.slice().reverse().map(q => R(q, kin)), R(t0 - 5, mid)]);
  });
  const patches = [];
  for (let i = 0; i < 7; i++){ const a = r() * TAU, k = .2 + r() * .45; patches.push({x:fx(cx + Math.cos(a) * rx * k), y:fx(cy + Math.sin(a) * ry * k), rx:fx(2 + r() * 2), ry:fx(1.4 + r())}); }
  const hb = R(th, 1), deco = [], r2 = rng((Math.round(cx * 7 + cy * 13) ^ 0x51ab) >>> 0), put = (t, p, rot = 0) => deco.push({t, x:fx(p.x), y:fx(p.y), rot:Math.round(rot), s:1});
  // shells and driftwood on the outer beach, grass on the islets, coral heads in the lagoon
  for (const [t0, t1, kin] of segs){
    const n = Math.max(2, Math.round((t1 - t0) / 12));
    for (let i = 0; i < n; i++){ const q = t0 + (t1 - t0) * r2(); put(r2() < .75 ? 'shell' : 'drift', R(q, .995 - r2() * .01), r2() * 360); }
    for (let i = 0; i < n - 1; i++) put('tuft', R(t0 + (t1 - t0) * (.15 + r2() * .7), (1.02 + kin) / 2 + (r2() - .5) * .04), (r2() - .5) * 40);
  }
  for (let i = 0; i < 9; i++){ const a = r2() * TAU, k = .25 + r2() * .4; put('coral', {x:cx + Math.cos(a) * rx * k, y:cy + Math.sin(a) * ry * k}, r2() * 360); }
  return {type:'atoll', center:{x:cx, y:cy}, lands, R, segs, patches, atoll:{cx, cy, rx, ry}, harbor:{x:fx(hb.x), y:fx(hb.y)}, blocked:[], deco, trees:[],
    box:{x0:cx - rx - 8, y0:cy - ry - 8, x1:cx + rx + 8, y1:cy + ry + 8}, labelAt:{x:fx(cx), y:fx(cy - ry - 18)}};
}

/* ---------- island rules */
const storeCap = I => 20 + 10 * I.buildings.filter(b => b.kind === 'speicher' && !b.bt).length;
/* In a chief's village every house and stilt house holds 6 instead of 4 */
const houseCap = I => 2 + I.buildings.reduce((s, b) => s + (b.bt ? 0 : I.lvl === 3 && (b.kind === 'haus' || b.kind === 'pfahl') ? CHIEF.cap : KINDS[b.kind].cap || 0), 0);
const DEP_DECO = {ton:'clay', basalt:'rock', obsidian:'obsidian'};
const depsOf = (I, dep) => I.deco.filter(d => d.t === DEP_DECO[dep]);
const depNear = (I, dep, x, y, r) => depsOf(I, dep).find(d => Math.hypot(d.x - x, d.y - y) < r) || null;
/* Trees standing or growing block the ground; a stump does not, building on it clears it */
const treeAt = (I, x, y, rad) => I.trees && I.trees.find(t => t.st !== 1 && Math.hypot(t.x - x, t.y - y) < rad);
const treesNear = (I, x, y, rad) => (I.trees || []).filter(t => t.st === 0 && t.w > 0 && Math.hypot(t.x - x, (t.y - y) * 1.25) < rad);
const nearCount = (I, kind, x, y, r) => I.buildings.filter(b => b.kind === kind && !b.bt && Math.hypot(b.x - x, b.y - y) < r).length;
/* Beauty: what adorns an island, counted from finished decorations */
const beautyOf = I => I.buildings.reduce((s, b) => s + (b.bt ? 0 : KINDS[b.kind].beauty || 0), 0);
function landAt(I, p){ return I.lands.find(L => inPoly(p, L.poly)); }
function inLagoon(I, p){
  if (landAt(I, p)) return false;
  for (const L of I.lands) if (polyDist(p, L.poly) < 5) return false;
  if (I.atoll){ const a = I.atoll, e = ((p.x - a.cx) / a.rx) ** 2 + ((p.y - a.cy) / a.ry) ** 2; return e < .8; }
  return inPoly(p, I.reef.poly) && polyDist(p, I.reef.poly) > 10;
}
function onIsland(I, p){
  if (I.atoll){ const a = I.atoll; return ((p.x - a.cx) / a.rx) ** 2 + ((p.y - a.cy) / a.ry) ** 2 < 1.08; }
  return inPoly(p, I.reef.poly);
}
function check(kind, I, x, y, ignoreId){
  const K = KINDS[kind], p = {x, y};
  if (!K.on.includes(I.type)) return 'Geht auf dieser Insel nicht';
  if (K.water){ if (!inLagoon(I, p)) return 'Pfahlhäuser stehen in der Lagune'; }
  else {
    const L = landAt(I, p); if (!L) return 'Nur auf Land';
    const dEdge = polyDist(p, L.poly);
    if (!K.beach && dEdge < 6) return 'Zu nah am Wasser';
    if (K.coast && dEdge > 18) return `${K.n} gehört an den Strand`;
    if (K.dep && !depNear(I, K.dep, x, y, K.depR)) return `Hier ist kein ${DEPOSITS[K.dep].n} in der Nähe. ${DEPOSITS[K.dep].where}`;
    if (treeAt(I, x, y, (K.r + TREE_R) * .8)) return 'Hier stehen Bäume. Ein Holzfäller kann sie fällen.';
    if (I.river && polyDist(p, I.river, false) < 6) return 'Hier fließt der Bach';
    if (inDelta(I, p, 3) || (I.delta && I.delta.arms.some(a => polyDist(p, a, false) < 5))) return 'Hier mündet der Bach ins Meer';
    for (const z of I.blocked) if (Math.hypot(x - z.x, y - z.y) < z.r) return 'Hier ist kein Platz';
  }
  for (const b of I.buildings){ if (b.id === ignoreId) continue; if (Math.hypot(b.x - x, b.y - y) < (K.r + KINDS[b.kind].r) * .8) return 'Zu eng'; }
  return '';
}
function findSpot(I, kind, from){
  if (!check(kind, I, from.x, from.y)) return {x:from.x, y:from.y};
  for (let r = 6; r < 220; r += 5){ const n = Math.max(8, Math.round(r / 3)); for (let i = 0; i < n; i++){ const a = i / n * TAU; const x = from.x + Math.cos(a) * r, y = from.y + Math.sin(a) * r * .8; if (!check(kind, I, x, y)) return {x, y}; } }
  return null;
}
/* Every house looks a little different: mirrored, sized, roof shape and tint */
function variant(kind, r = Math.random){
  const v = {mirror:r() < .5 ? 1 : 0};
  if (kind === 'haus') Object.assign(v, {shape:r() < .32 ? 'hr' : 'hw', scale:fx(.7 + r() * .18), tint:r() < .3 ? 1 : 0});
  else if (kind === 'pfahl') v.scale = fx(.72 + r() * .14);
  else if (kind === 'palme' || kind === 'pandanus') v.scale = fx(.7 + r() * .22);
  else if (kind === 'baum') v.scale = fx(.85 + r() * .2);
  else if (kind === 'taro') v.rot = Math.round(r() * 80);
  else if (kind === 'weg') v.rot = Math.round((r() - .5) * 60);
  else if (kind === 'hibiskus') v.scale = fx(.85 + r() * .25);
  else if (kind === 'speicher') v.scale = fx(.75 + r() * .12);
  return v;
}
