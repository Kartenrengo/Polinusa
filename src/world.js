'use strict';
/* The world: islands generated from one seed, plus the rules for where things may stand.
   Only the seed is saved, so the save stays tiny and every new game looks different. */

const W = 2400, H = 3600;
/* Island names are Proto-Oceanic words */
const NAMES = {
  hoch: ['Patu', 'Kuro', 'Langi', 'Talise', 'Wai'],   // Stein, Topf, Himmel, Mandelbaum, Süßwasser
  atoll: ['Namo', 'One', 'Niu', 'Ika', 'Tasi', 'Manu'] // Lagune, Sand, Kokospalme, Fisch, Meer, Vogel
};
const radOf = (kind, size) => kind === 'atoll' ? size + 12 : size * 1.36 + 50;

function makeWorld(seed){
  const r = rng(seed), spots = [];
  const hx = W * (.36 + r() * .12), hy = H * (.6 + r() * .1);
  spots.push({id:'heimat', name:'Panua', kind:'hoch', x:hx, y:hy, size:138 + r() * 16});
  const a = (-100 + r() * 70) * Math.PI / 180, d = 470 + r() * 70;
  spots.push({id:'tochter', name:'Motu', kind:'atoll', x:hx + Math.cos(a) * d, y:hy + Math.sin(a) * d, size:112 + r() * 16});
  for (const s of spots) s.rad = radOf(s.kind, s.size);
  const hole = startHoleFor(spots);

  const kinds = shuffle(r, ['vulkan', 'atoll', 'hoch', 'atoll', 'hoch', 'atoll', 'vulkan']);
  const names = {hoch:shuffle(r, NAMES.hoch), atoll:shuffle(r, NAMES.atoll)};
  let volcanoes = 0, n = 0;
  for (const kind of kinds){
    const size = kind === 'atoll' ? 92 + r() * 36 : kind === 'vulkan' ? 104 + r() * 22 : 108 + r() * 32, rad = radOf(kind, size);
    for (let t = 0; t < 400; t++){
      const x = rad + 50 + r() * (W - 2 * rad - 100), y = rad + 50 + r() * (H - 2 * rad - 100);
      if (spots.some(s => Math.hypot(s.x - x, s.y - y) < s.rad + rad + 150)) continue;
      const ex = (x - hole.cx) / (hole.rx + rad + 100), ey = (y - hole.cy) / (hole.ry + rad + 100);
      if (ex * ex + ey * ey < 1) continue;
      const name = kind === 'vulkan' && !volcanoes++ ? 'Api' : names[kind === 'atoll' ? 'atoll' : 'hoch'].pop();
      spots.push({id:'i' + (++n), name, kind, x, y, size, rad});
      break;
    }
  }
  // each harbour faces the nearest neighbour, the first two face each other
  const islands = spots.map((s, i) => {
    const o = i < 2 ? spots[1 - i] : spots.filter(q => q !== s).reduce((b, q) => Math.hypot(q.x - s.x, q.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y) ? q : b);
    const len = Math.hypot(o.x - s.x, o.y - s.y) || 1, dir = {x:(o.x - s.x) / len, y:(o.y - s.y) / len};
    const I = s.kind === 'atoll' ? genAtoll(s, dir, rng(seed ^ (i + 1) * 7919)) : genHigh(s, dir, rng(seed ^ (i + 1) * 7919), s.kind === 'vulkan', i === 0);
    Object.assign(I, {id:s.id, name:s.name, discovered:false, settled:false, stock:{}, pop:0, buildings:[], canoe:false});
    return I;
  });
  return {islands, hole};
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
  const fd = volcano ? .62 : .36, fc = {x:cx + Math.cos(away) * rx * fd, y:cy + Math.sin(away) * ry * fd};
  const fs = r() * 1e9 | 0;
  for (let sc = 1; sc > .3; sc -= .1){
    const pts = ring(fc.x, fc.y, rx * (volcano ? .2 : .3) * sc, ry * (volcano ? .16 : .24) * sc, volcano ? 9 : 14, fs, .2);
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
    if (pts.length > 3 && !inPoly(p, land.poly)) I.river = pts.map(q => ({x:fx(q.x), y:fx(q.y)}));
  }
  // things that take up ground: the village plaza and a garden on the home island, a rock on most
  const free = (p, rad) => inland(p, rad + 6) && !(I.forest && (inPoly(p, I.forest) || polyDist(p, I.forest) < rad + 6)) &&
    !(I.river && polyDist(p, I.river, false) < rad + 8) && I.blocked.every(z => Math.hypot(p.x - z.x, p.y - z.y) > z.r + rad + 10);
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
  if (r() < .8) place('rock', 15);

  I.box = polyBox(rf.poly, 6);
  I.labelAt = {x:fx(cx), y:fx(I.box.y0 - 12)};
  return I;
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
  const hb = R(th, 1);
  return {type:'atoll', center:{x:cx, y:cy}, lands, R, segs, patches, atoll:{cx, cy, rx, ry}, harbor:{x:fx(hb.x), y:fx(hb.y)}, blocked:[], deco:[],
    box:{x0:cx - rx - 8, y0:cy - ry - 8, x1:cx + rx + 8, y1:cy + ry + 8}, labelAt:{x:fx(cx), y:fx(cy - ry - 18)}};
}

/* ---------- island rules */
const storeCap = I => 20 + 10 * I.buildings.filter(b => b.kind === 'speicher').length;
const houseCap = I => 2 + I.buildings.reduce((s, b) => s + (KINDS[b.kind].cap || 0), 0);
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
    if (K.coast && dEdge > 18) return 'Das Kanuhaus gehört an den Strand';
    if (I.forest && inPoly(p, I.forest)) return 'Hier steht Wald';
    if (I.river && polyDist(p, I.river, false) < 6) return 'Hier fließt der Bach';
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
  else if (kind === 'speicher') v.scale = fx(.75 + r() * .12);
  return v;
}
