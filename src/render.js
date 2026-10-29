'use strict';
/* Canvas renderer.
   - Each piece of art becomes a bitmap once per size step and is then only copied.
   - Sea, islands and buildings sit in a base layer, the fog in a second one. Both are painted a bit larger
     than the screen and only shifted while you pan. They are repainted when a village changes, when you
     reach their edge or when a zoom comes to rest.
   - Smoke, people and boats go on top, at most 30 times a second.
   - Only what is on screen is drawn. */

const mapC = $('map'), ctx = mapC.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let cam = {x:0, y:0, z:.7}, lod = 'mid', camAnim = null;
let vw = 0, vh = 0, topH = 76, botH = 100;
let needDraw = true, frameNo = 0, lastCamMove = 0;
const OVER = 1.6;   // layers are this much larger than the screen
const layer = () => { const c = document.createElement('canvas'); return {c, x:c.getContext('2d'), at:null, w:0, h:0, dirty:true, empty:false}; };
const baseL = layer(), fogL = layer();
function invalidate(fog){ baseL.dirty = true; needDraw = true; if (fog) fogL.dirty = true; }
function requestDraw(){ needDraw = true; }

/* ---------- camera */
function measure(){
  const r = mapC.getBoundingClientRect(), w = r.width || 390, h = r.height || 844;
  if (w !== vw || h !== vh){ vw = w; vh = h; mapC.width = Math.round(vw * DPR); mapC.height = Math.round(vh * DPR); invalidate(true); }
  topH = $('top').offsetHeight; const bot = !$('sheet').hidden ? $('sheet') : (!$('place').hidden ? $('place') : $('bottom')); botH = bot.offsetHeight;
  const t = topH + 8; $('compass').style.top = t + 'px'; $('zoomctl').style.top = t + 'px'; $('toast').style.top = (topH + 10) + 'px';
  $('quest').style.bottom = (botH + 8) + 'px'; renderQuest();
  if (!$('quest').hidden) botH += $('quest').offsetHeight + 8;   // the task card covers the map too
}
const zMin = () => clamp(Math.min(vw / (W * 1.05), vh / (H * .9)), .1, .4), zMax = 4.5;
const clampZ = z => clamp(z, zMin(), zMax);
function clampCam(){ cam.x = clamp(cam.x, 0, W); cam.y = clamp(cam.y, 0, H); }
function applyCam(){ lod = cam.z < .55 ? 'far' : cam.z < 1.3 ? 'mid' : 'near'; lastCamMove = performance.now(); needDraw = true; }
function camXform(c){ const k = cam.z * DPR; c.setTransform(k, 0, 0, k, (vw / 2 - cam.x * cam.z) * DPR, (vh / 2 - cam.y * cam.z) * DPR); }
function view(m = 0){ const w = vw / cam.z / 2, h = vh / cam.z / 2; return {x0:cam.x - w - m, y0:cam.y - h - m, x1:cam.x + w + m, y1:cam.y + h + m}; }
const boxIn = (b, v) => b.x1 >= v.x0 && b.x0 <= v.x1 && b.y1 >= v.y0 && b.y0 <= v.y1;
const ptIn = (x, y, v) => x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1;
const grow = (v, m) => ({x0:v.x0 - m, y0:v.y0 - m, x1:v.x1 + m, y1:v.y1 + m});
function toWorld(sx, sy){ const r = mapC.getBoundingClientRect(); return {x:cam.x + (sx - r.left - r.width / 2) / cam.z, y:cam.y + (sy - r.top - r.height / 2) / cam.z}; }
function zoomAt(z, sx, sy, wp){ const r = mapC.getBoundingClientRect(); cam.z = clampZ(z); cam.x = wp.x - (sx - r.left - r.width / 2) / cam.z; cam.y = wp.y - (sy - r.top - r.height / 2) / cam.z; clampCam(); camAnim = null; applyCam(); }
function visCenter(){ const r = mapC.getBoundingClientRect(); return {sx:r.left + r.width / 2, sy:r.top + topH + (r.height - topH - botH) / 2}; }
function camFor(x, y, z){ const off = (topH - botH) / 2; return {x, y:y - off / z, z}; }
function flyTo(x, y, z){ z = clampZ(z); const to = camFor(x, y, z); if (reduced){ Object.assign(cam, to); clampCam(); applyCam(); return; } camAnim = {from:{...cam}, to, t0:performance.now(), dur:520}; }
function fitBox(b, maxZ = 2){ const bw = b.x1 - b.x0, bh = b.y1 - b.y0; const z = Math.min((vw - 140) / bw, (vh - topH - botH - 60) / bh, maxZ); flyTo((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, z); }
function boxOf(list){ const b = {x0:Infinity, y0:Infinity, x1:-Infinity, y1:-Infinity}; for (const I of list){ b.x0 = Math.min(b.x0, I.box.x0); b.y0 = Math.min(b.y0, I.box.y0); b.x1 = Math.max(b.x1, I.box.x1); b.y1 = Math.max(b.y1, I.box.y1); } return b; }
function overview(){ const b = boxOf(islands); fitBox({x0:b.x0 - 90, y0:b.y0 - 60, x1:b.x1 + 90, y1:b.y1 + 40}, 1.2); }
function stepCam(now){
  if (!camAnim) return; const t = clamp((now - camAnim.t0) / camAnim.dur, 0, 1), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, a = camAnim.from, b = camAnim.to;
  cam.z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * e); cam.x = a.x + (b.x - a.x) * e; cam.y = a.y + (b.y - a.y) * e; clampCam(); applyCam();
  if (t >= 1) camAnim = null;
}

/* ---------- sprites: SVG art → bitmap, one per size step, least recently used ones are dropped */
const sprites = new Map(), LEVELS = [.25, .5, 1, 2, 4, 8], SPRITE_BUDGET = 6e6;
let spritePx = 0, measureSvg = null;
function artBox(art){
  if (!measureSvg){ measureSvg = document.createElementNS(NS, 'svg'); measureSvg.setAttribute('width', '1'); measureSvg.setAttribute('height', '1'); measureSvg.setAttribute('aria-hidden', 'true'); measureSvg.style.cssText = 'position:absolute;left:-10px;top:-10px;overflow:hidden;pointer-events:none'; document.body.appendChild(measureSvg); }
  const g = document.createElementNS(NS, 'g'); g.innerHTML = art; measureSvg.appendChild(g);
  let b; try { b = g.getBBox(); } catch (e){ b = null; }
  g.remove();
  if (!b || !b.width) b = {x:-24, y:-40, width:48, height:48};
  const x = Math.floor(b.x - 3), y = Math.floor(b.y - 3);
  return {x, y, w:Math.ceil(b.x + b.width + 3) - x, h:Math.ceil(b.y + b.height + 3) - y};
}
function rasterize(e, L){
  const {x, y, w, h} = e.box, pw = Math.max(1, Math.round(w * L)), ph = Math.max(1, Math.round(h * L));
  const lv = {L, c:null, ready:false, used:frameNo, px:pw * ph}, img = new Image();
  lv.wait = new Promise(res => {
    img.onload = () => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').drawImage(img, 0, 0, pw, ph); lv.c = c; lv.ready = true; spritePx += lv.px; trimSprites(); invalidate(); res(); };
    img.onerror = res;
  });
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="${NS}" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}"><defs>${defsFor(e.art)}</defs>${e.art}</svg>`);
  return lv;
}
function trimSprites(){
  if (spritePx <= SPRITE_BUDGET) return;
  const all = []; for (const e of sprites.values()) for (const lv of e.lv.values()) if (lv.ready) all.push([e, lv]);
  all.sort((a, b) => a[1].used - b[1].used);
  for (const [e, lv] of all){ if (spritePx <= SPRITE_BUDGET * .7 || lv.used >= frameNo - 1) break; e.lv.delete(lv.L); spritePx -= lv.px; }
}
const pendingSprites = () => { const p = []; for (const e of sprites.values()) for (const lv of e.lv.values()) if (!lv.ready) p.push(lv.wait); return p; };
/* Draws art at the current transform. The size step follows the real on-screen scale. */
function blit(c, key, art, alpha = 1){
  let e = sprites.get(key);
  if (!e){ const a = typeof art === 'function' ? art() : art; e = {art:a, box:artBox(a), lv:new Map()}; sprites.set(key, e); }
  const t = c.getTransform(), need = Math.hypot(t.a, t.b), L = LEVELS.find(l => l >= need) || LEVELS[LEVELS.length - 1];
  let lv = e.lv.get(L); if (!lv){ lv = rasterize(e, L); e.lv.set(L, lv); }
  lv.used = frameNo;
  if (!lv.ready){ lv = null; for (const o of e.lv.values()) if (o.ready && (!lv || Math.abs(Math.log(o.L / L)) < Math.abs(Math.log(lv.L / L)))) lv = o; if (!lv) return; lv.used = frameNo; }
  const g = c.globalAlpha; c.globalAlpha = g * alpha;
  c.drawImage(lv.c, e.box.x, e.box.y, e.box.w, e.box.h);
  c.globalAlpha = g;
}
function put(c, x, y, s, m, rot, key, art, alpha){ c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s * m, s); blit(c, key, art, alpha); c.restore(); }
function drawBuilding(c, b, I, alpha = 1){
  const v = b.v || {}, K = KINDS[b.kind], canoe = b.kind === 'werft' && !!(I && I.canoe), o = {shape:v.shape === 'hr' ? 'hr' : '', roof:K.roof ? roofColor(b) : '', canoe};
  const t = xformOf(b.kind, v);
  put(c, b.x, b.y, t.s, t.m, t.rot, `${b.kind}|${o.shape}|${o.roof}|${canoe ? 1 : ''}`, () => artOf(b.kind, o), alpha);
}

/* ---------- patterns: drawn at 8× and scaled back so they stay sharp when zoomed in */
const pats = {};
function loadPatterns(){
  const R = typeof CanvasPattern !== 'undefined' && CanvasPattern.prototype.setTransform ? 8 : 1;
  return Promise.all(Object.keys(PAT).map(id => new Promise(res => {
    const [w, h, body] = PAT[id], img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = w * R; c.height = h * R; c.getContext('2d').drawImage(img, 0, 0, w * R, h * R); const p = ctx.createPattern(c, 'repeat'); if (R > 1) p.setTransform(new DOMMatrix([1 / R, 0, 0, 1 / R, 0, 0])); pats[id] = p; invalidate(true); res(); };
    img.onerror = res;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="${NS}" width="${w * R}" height="${h * R}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
  })));
}
function fillWith(c, path, color, pat){ c.fillStyle = color; c.fill(path); if (pat && pats[pat]){ c.fillStyle = pats[pat]; c.fill(path); } }
function stroke(c, path, color, w, dash, cap, alpha = 1){
  c.strokeStyle = color; c.lineWidth = w; c.setLineDash(dash || []); c.lineCap = cap || 'butt'; c.lineJoin = 'round';
  const g = c.globalAlpha; c.globalAlpha = g * alpha; c.stroke(path); c.globalAlpha = g;
}
function roundRect(x, y, w, h, r){ const p = new Path2D(); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
const ellipse = (x, y, rx, ry) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, 0, 0, TAU); return p; };

/* ---------- base layer: sea, islands, trade cords, buildings */
const KNOT = '<ellipse rx="4.6" ry="5.4" fill="#7A4E2E" stroke="#2B1D14" stroke-width=".9"/><path d="M-1.4-2.6q1.6 2.6.2 5.2" fill="none" stroke="#C99A62" stroke-width=".8"/>';
/* Far away a village is one small picture that grows with it: one, two or three roofs */
const VILLAGE = ['<use href="#hw" fill="#DDB060"/>',
  '<use href="#hw" fill="#8F8574" transform="translate(-6 2)"/><use href="#hr" fill="#DDB060" transform="translate(6 5) scale(.9)"/>',
  '<use href="#hw" fill="#8F8574" transform="translate(-9 2)"/><use href="#hr" fill="#C99A50" transform="translate(9 3) scale(.9)"/><use href="#hw" fill="#DDB060" transform="translate(0 8) scale(.9)"/>'];
/* An island is drawn if it is known or a clearing in the fog reaches it */
const seen = I => I.discovered || fogHoles.some(h => ((h.cx - I.center.x) / (h.rx * 1.1 + (I.box.x1 - I.box.x0) / 2)) ** 2 + ((h.cy - I.center.y) / (h.ry * 1.1 + (I.box.y1 - I.box.y0) / 2)) ** 2 < 1);
function islandPaths(I){
  if (I._p) return I._p;
  const p = {lands:I.lands.map(L => new Path2D(L.d))};
  p.ring = I.atoll ? ellipse(I.atoll.cx, I.atoll.cy, I.atoll.rx, I.atoll.ry) : new Path2D(I.reef.d);
  p.harbor = ellipse(I.harbor.x, I.harbor.y, I.atoll ? 9 : 9.5, I.atoll ? 9 : 9.5);
  if (I.forest) p.forest = new Path2D(scallop(I.forest, 1, .62));
  if (I.river) p.river = new Path2D(smoothOpen(I.river));
  if (I.patches){ p.patches = new Path2D(); for (const q of I.patches) p.patches.addPath(ellipse(q.x, q.y, q.rx, q.ry)); }
  return I._p = p;
}
function drawIsland(c, I){
  const p = islandPaths(I);
  stroke(c, p.ring, '#24505F', 16, null, null, .45);
  fillWith(c, p.ring, '#79C6B8', 'pLag'); stroke(c, p.ring, '#4E9C9A', 8);
  stroke(c, p.ring, '#F4EEDC', 2, [.1, 3.6], 'round');
  fillWith(c, p.harbor, '#2F5F73', 'pSea');
  if (p.patches){ c.fillStyle = '#4E9C9A'; c.fill(p.patches); stroke(c, p.patches, '#F3F8EE', .6, null, null, .7); }
  for (const L of p.lands){
    fillWith(c, L, '#8DA757', 'pDots');
    c.save(); c.clip(L); stroke(c, L, '#E8D29E', I.atoll ? 11 : 15); stroke(c, L, '#D2B67C', 3.4); c.restore();
    stroke(c, L, '#2B1D14', 1.4, [2.2, 1.7]);
  }
  if (p.forest){ fillWith(c, p.forest, '#557A37', 'pForest'); stroke(c, p.forest, '#2B1D14', 1); }
  if (p.river){ stroke(c, p.river, '#2B1D14', 4.8, null, 'round'); stroke(c, p.river, '#6DB9BE', 3, null, 'round'); stroke(c, p.river, '#EAF5F0', .9, [.1, 3.4], 'round', .85); }
  for (const d of I.deco) put(c, d.x, d.y, 1, 1, d.rot * Math.PI / 180, d.t, `<use href="#${d.t}"/>`);
  if (I.volcano) put(c, I.volcano.x, I.volcano.y, 1.6, 1, 0, 'volcano', '<use href="#volcano"/>');
}
function routeCurve(r){
  if (!r._cv){
    const A = isl(r.a).harbor, B = isl(r.b).harbor, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, k = len * .1;
    r._cv = curve(A, {x:(A.x + B.x) / 2 - dy / len * k, y:(A.y + B.y) / 2 + dx / len * k}, B); r._p = new Path2D(r._cv.d);
  }
  return r._cv;
}
function drawCords(c){
  const far = lod === 'far';
  for (const r of routes){
    const cv = routeCurve(r), p = r._p;
    stroke(c, p, '#123544', far ? 18 : 8, null, null, .3);
    stroke(c, p, '#2B1D14', far ? 13 : 5, null, 'round');
    stroke(c, p, '#B08048', far ? 8 : 3.2, null, 'round');
    stroke(c, p, '#6E4A28', far ? 8 : 3.2, [1.2, 2.4]);
    const n = Math.min(r.knots, 12);
    for (let j = 0; j < n; j++){ const q = curveAt(cv, (j + 1) / (n + 1)); put(c, q.x, q.y, far ? 2.4 : 1, 1, 0, 'knot', KNOT); }
  }
}
function drawObjects(c, area){
  if (lod === 'far'){
    for (const I of islands){
      if (!I.settled) continue; const hs = I.buildings.filter(b => KINDS[b.kind].roof); if (!hs.length) continue;
      const n = hs.length < 3 ? 0 : hs.length < 7 ? 1 : 2;
      put(c, hs.reduce((t, b) => t + b.x, 0) / hs.length, hs.reduce((t, b) => t + b.y, 0) / hs.length, 2.6, 1, 0, 'village' + n, VILLAGE[n]);
    }
    return;
  }
  const v = grow(area, 60), all = [], movingId = mode === 'move' && placing ? placing.moveId : 0;
  for (const I of islands){ if (!I.discovered || !boxIn(I.box, v)) continue; for (const b of I.buildings) if (ptIn(b.x, b.y, v)) all.push([b, I]); }
  all.sort((a, b) => a[0].y - b[0].y);
  for (const [b, I] of all) drawBuilding(c, b, I, b.id === movingId ? .25 : 1);
}
function drawSel(c){
  if (lod === 'far' || !selectedId) return; const b = findB(selectedId); if (!b) return;
  const r = KINDS[b.kind].r + 6; stroke(c, ellipse(b.x, b.y + 1, r, r * .45), '#F4ECD8', 4, [.1, 4], 'round');
}
function seaRect(c, v, color, pat, from){
  c.fillStyle = color; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  if (pats[pat] && cam.z > from){ c.globalAlpha = clamp((cam.z - from) / .35, 0, 1); c.fillStyle = pats[pat]; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); c.globalAlpha = 1; }
}
function drawBase(c, v){
  seaRect(c, v, '#2F5F73', 'pSea', .3);   // waves fade out far away, where they would only flicker
  for (const I of islands) if (boxIn(I.box, grow(v, 20)) && seen(I)) drawIsland(c, I);
  drawSel(c); drawCords(c); drawObjects(c, v);
}

/* ---------- fog: tapa cloth with clearings, cut out on its own layer */
function holePath(h){ return h._p || (h._p = new Path2D(scallop(ring(h.cx, h.cy, h.rx, h.ry, Math.max(16, Math.round((h.rx + h.ry) / 22)), h.seed || 1, .1), 0, .6))); }
function drawFog(c, v){
  // close up the view often lies inside one clearing: then there is no fog to paint at all
  const inside = h => [[v.x0, v.y0], [v.x1, v.y0], [v.x0, v.y1], [v.x1, v.y1]].every(([x, y]) => ((x - h.cx) / (h.rx * .85)) ** 2 + ((y - h.cy) / (h.ry * .85)) ** 2 < 1);
  if (fogHoles.some(inside)) return false;
  seaRect(c, v, '#EADFC6', 'pCloth', .25);
  const hs = fogHoles.filter(h => h.cx + h.rx * 1.3 > v.x0 && h.cx - h.rx * 1.3 < v.x1 && h.cy + h.ry * 1.3 > v.y0 && h.cy - h.ry * 1.3 < v.y1);
  for (const h of hs){ const p = holePath(h); stroke(c, p, '#A84A2C', 10, [4.4, 3.6]); stroke(c, p, '#2B1D14', 1.4); }
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  for (const h of hs) c.fill(holePath(h));
  c.globalCompositeOperation = 'source-over';
}

/* ---------- moving things */
const SMOKE_V = new Path2D('M0-40q-3-3 0-6q3-3 0-6q-3-3 0-6'), SMOKE_T = new Path2D('M-11-1.5q-2.6-2.6 0-5.2q2.6-2.6 0-5.2');
const WALKER = new Path2D('M-1.9 0L0-4L1.9 0Z'), BIRD1 = new Path2D('M-5 0q2.5-3.2 5 0q2.5-3.2 5 0'), BIRD2 = new Path2D('M-4.4 0q2.2-3 4.4 0q2.2-3 4.4 0');
const BUBBLE_LINE = new Path2D('M8 19L2 28');
function drawAnim(c, now){
  const v = view(40), ph = (now % 3400) / 3400 * TAU, a = reduced ? .4 : .41 - .29 * Math.cos(ph), dy = reduced ? 0 : 1.5 * Math.cos(ph);
  for (const I of islands){
    if (!I.volcano || !seen(I) || !boxIn(I.box, v)) continue;
    c.save(); c.translate(I.volcano.x, I.volcano.y + dy * 1.6); c.scale(1.6, 1.6); stroke(c, SMOKE_V, '#2B1D14', .9, null, 'round', a); c.restore();
  }
  if (lod === 'near'){
    for (const I of islands) if (I.settled && boxIn(I.box, v)) for (const b of I.buildings) if (b.kind === 'toepfer' && ptIn(b.x, b.y, v)){ c.save(); c.translate(b.x, b.y + dy); stroke(c, SMOKE_T, '#2B1D14', .8, null, 'round', a); c.restore(); }
    c.setLineDash([]); c.lineWidth = .45; c.strokeStyle = '#2B1D14'; c.lineJoin = 'round';
    for (const w of walkers){
      if (!ptIn(w.x, w.y, v)) continue;
      c.save(); c.translate(w.x, w.y); c.fillStyle = w.col; c.fill(WALKER); c.stroke(WALKER);
      c.beginPath(); c.arc(0, -5.3, 1.25, 0, TAU); c.fillStyle = '#2B1D14'; c.fill(); c.restore();
    }
  }
  if (placing) drawGhost(c);
}
function drawGhost(c){
  const K = KINDS[placing.kind], r = K.r + 5, e = ellipse(placing.x, placing.y + 1, r, r * .45), ok = placing.ok;
  c.fillStyle = ok ? 'rgba(62,122,58,.25)' : 'rgba(168,74,44,.25)'; c.fill(e);
  stroke(c, e, ok ? '#3E7A3A' : '#A84A2C', 2.4, [.1, 3.6], 'round');
  drawBuilding(c, {kind:placing.kind, x:placing.x, y:placing.y, v:placing.v, born:tick}, isl(placing.island), .78);
}
function drawTop(c, now){
  const v = view(80), ks = clamp(.85 / cam.z, 1, 2.6);
  // a cloud with circling birds marks land below the fog
  for (const I of islands){
    if (I.discovered) continue; const x = I.center.x, y = I.center.y - 10; if (!ptIn(x, y, v)) continue;
    c.save(); c.translate(x, y); c.scale(ks, ks);
    if (mode === 'target'){ const t = reduced ? .5 : (now % 1400) / 1400; stroke(c, ellipse(0, 0, 42 * (.6 + .9 * t), 42 * (.6 + .9 * t)), '#A84A2C', 4, [3, 3], null, .9 * (1 - t)); }
    put(c, 0, 0, 1.7, 1, 0, 'cloud', '<use href="#cloud"/>');
    const t1 = reduced ? 0 : (now % 11000) / 11000 * TAU, t2 = reduced ? 0 : (now % 15000) / 15000 * TAU;
    c.save(); c.translate(30 * Math.cos(t1), -40 + 12 * Math.sin(t1)); stroke(c, BIRD1, '#2B1D14', 1.6, null, 'round'); c.restore();
    c.save(); c.translate(-36 * Math.cos(t2), -34 - 14 * Math.sin(t2)); stroke(c, BIRD2, '#2B1D14', 1.6, null, 'round'); c.restore();
    c.restore();
  }
  for (const b of boats) if (b.exp){ if (!b._p) b._p = new Path2D(b.cv.d); stroke(c, b._p, '#F1EBD9', 2.4, [.1, 6], 'round', .9); }
  for (const b of boats){
    if (b.x == null || !ptIn(b.x, b.y, view(120))) continue;
    c.save(); c.translate(b.x, b.y); c.scale(b.k, b.k); c.globalAlpha = b.alpha;
    const small = b.kind === 'oc';
    c.save();
    if (small){ if (b.left) c.scale(-1, 1); blit(c, 'oc', '<use href="#oc"/>'); }
    else { if (b.q === 'NW' || b.q === 'SE') c.scale(-1, 1); const up = b.q === 'NE' || b.q === 'NW'; blit(c, up ? 'dc' : 'dcIn', up ? '<use href="#dc"/>' : '<use href="#dcIn"/>'); }
    c.restore();
    const icons = (b.people ? ['pop'] : []).concat(Object.keys(b.cargo || {}).filter(k => b.cargo[k] > 0)).slice(0, 3);
    if (lod !== 'far' && icons.length){
      if (small) c.scale(1 / 1.5, 1 / 1.5);   // the bubble keeps its size on the smaller, scaled-up canoe
      c.translate(small ? 6 : 10, small ? -34 : -40); const p = roundRect(0, 0, icons.length * 15 + 8, 19, 4);
      c.fillStyle = '#F4ECD8'; c.fill(p); stroke(c, p, '#3E2416', 1.3, [.1, 2.2], 'round');
      icons.forEach((k, i) => put(c, 3 + i * 15, 1.5, .8, 1, 0, 'ic-' + k, `<use href="#ic-${k}"/>`));
      stroke(c, BUBBLE_LINE, '#3E2416', 1);
    }
    c.restore();
  }
}
const NAME_FONT = '800 14px Alegreya, Georgia, serif', SUB_FONT = '700 10px "Alegreya Sans", "Trebuchet MS", sans-serif', CLOUD_FONT = '800 12px "Alegreya Sans", "Trebuchet MS", sans-serif';
function label(c, x, y, k, text, sub, font = NAME_FONT){
  c.save(); c.translate(x, y); c.scale(k, k);
  c.font = font; let w = c.measureText(text).width + 16;
  if (sub){ c.font = SUB_FONT; w = Math.max(w, c.measureText(sub).width + 14); }
  const top = font === NAME_FONT ? -15 : -11, p = roundRect(-w / 2, top, w, sub ? 30 : 20, 4);
  c.fillStyle = '#F4ECD8'; c.fill(p); stroke(c, p, '#3E2416', 1.6, [.1, 2.6], 'round');
  c.textAlign = 'center'; c.fillStyle = '#2B1D14'; c.font = font; c.fillText(text, 0, font === NAME_FONT ? 0 : 4);
  if (sub){ c.font = SUB_FONT; c.fillStyle = '#5A3A26'; c.fillText(sub, 0, 11); }
  c.restore();
}
function drawLabels(c){
  if (lod === 'near') return;
  const k = clamp(.95 / cam.z, .75, 2.6), v = view(200);
  for (const I of islands){
    if (I.discovered){ if (ptIn(I.labelAt.x, I.labelAt.y, v)) label(c, I.labelAt.x, I.labelAt.y, k, I.name, I.settled ? `${I.pop} Bewohner` : 'unbewohnt'); }
    else if (lod === 'far') label(c, I.center.x, I.center.y + 44, k, 'Wolke über Land', '', CLOUD_FONT);
  }
}

/* ---------- layers and one frame */
function renderLayer(L, paint){
  L.w = vw * OVER; L.h = vh * OVER;
  const pw = Math.round(L.w * DPR), ph = Math.round(L.h * DPR), a = L.at = {x:cam.x, y:cam.y, z:cam.z, lod}, k = a.z * DPR;
  if (L.c.width !== pw || L.c.height !== ph){ L.c.width = pw; L.c.height = ph; }
  const c = L.x; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, pw, ph);
  c.setTransform(k, 0, 0, k, (L.w / 2 - a.x * a.z) * DPR, (L.h / 2 - a.y * a.z) * DPR);
  L.dirty = false;
  L.empty = paint(c, {x0:a.x - L.w / 2 / a.z, y0:a.y - L.h / 2 / a.z, x1:a.x + L.w / 2 / a.z, y1:a.y + L.h / 2 / a.z}) === false;
}
/* A layer can be reused while it still covers the screen. During a zoom it is stretched, then repainted sharp. */
function fresh(L, now){
  const a = L.at; if (L.dirty || !a || a.lod !== lod) return false;
  const k = cam.z / a.z; if (k !== 1 && (k > 1.3 || k < .77 || now - lastCamMove > 140)) return false;
  const v = view(), hw = L.w / 2 / a.z, hh = L.h / 2 / a.z;
  return v.x0 >= a.x - hw && v.x1 <= a.x + hw && v.y0 >= a.y - hh && v.y1 <= a.y + hh;
}
function blitLayer(L){
  const a = L.at, k = cam.z / a.z;
  ctx.drawImage(L.c, (vw / 2 + (a.x - L.w / 2 / a.z - cam.x) * cam.z) * DPR, (vh / 2 + (a.y - L.h / 2 / a.z - cam.y) * cam.z) * DPR, L.c.width * k, L.c.height * k);
}
const stale = now => baseL.at && baseL.at.z !== cam.z && now - lastCamMove > 140;
function draw(now){
  frameNo++;
  if (!fresh(baseL, now)) renderLayer(baseL, drawBase);
  if (!fresh(fogL, now)) renderLayer(fogL, drawFog);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2F5F73'; ctx.fillRect(0, 0, mapC.width, mapC.height); blitLayer(baseL);
  camXform(ctx); drawAnim(ctx, now);
  ctx.setTransform(1, 0, 0, 1, 0, 0); if (!fogL.empty) blitLayer(fogL);
  camXform(ctx); drawTop(ctx, now); drawLabels(ctx);
  needDraw = false;
}
/* Something moves on screen, so the top layers need regular frames */
const animating = () => boats.length > 0 || !!placing || lod === 'near' || islands.some(I => !I.discovered || (I.volcano && seen(I)));
