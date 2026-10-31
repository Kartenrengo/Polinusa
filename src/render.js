'use strict';
/* Canvas renderer.
   - Each piece of art becomes a bitmap once per size step and is then only copied.
   - Sea, islands and buildings sit in a base layer, the fog in a second one. Both are painted a bit larger
     than the screen and only shifted while you pan. They are repainted when a village changes, when you
     reach their edge or when a zoom comes to rest.
   - Smoke, people and canoes go on top, at most 30 times a second.
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
  const t = topH + 8; $('compass').style.top = t + 'px'; $('seasonBtn').style.top = (t + $('compass').offsetHeight + 8) + 'px'; $('sidectl').style.top = t + 'px'; $('toast').style.top = t + 'px'; $('newsList').style.top = t + 'px'; $('newsList').style.maxHeight = Math.max(160, vh - t - botH - 16) + 'px';
  $('quest').style.bottom = (botH + 8) + 'px'; renderQuest();
  if (!$('quest').hidden) botH += $('quest').offsetHeight + 8;   // the task card covers the map too
}
const zMin = () => clamp(Math.min(vw / (W * 1.05), vh / (H * .9)), .1, .4), zMax = 4.5;
const clampZ = z => clamp(z, zMin(), zMax);
function clampCam(){ cam.x = clamp(cam.x, 0, W); cam.y = clamp(cam.y, 0, H); }
function applyCam(){ lod = cam.z < .55 ? 'far' : cam.z < 1.3 ? 'mid' : 'near'; lastCamMove = performance.now(); needDraw = true; followView(); }
/* Close up, the island you look at is the one you build on: zoom in, build, zoom out, zoom in on the next */
function followView(){
  if (lod === 'far' || placing || !islands.length) return;
  const p = {x:cam.x, y:cam.y + (topH - botH) / 2 / cam.z}; let best = null, bd = Infinity;
  for (const I of islands){
    const b = I.box; if (!I.settled || p.x < b.x0 - 30 || p.x > b.x1 + 30 || p.y < b.y0 - 30 || p.y > b.y1 + 30) continue;
    const d = Math.hypot(p.x - I.center.x, p.y - I.center.y); if (d < bd){ bd = d; best = I; }
  }
  if (best && best.id !== active){ setActive(best.id); updateHUD(); }
}
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
function spriteOf(key, art){
  let e = sprites.get(key);
  if (!e){ const a = typeof art === 'function' ? art() : art; e = {art:a, box:artBox(a), lv:new Map()}; sprites.set(key, e); }
  return e;
}
function blit(c, key, art, alpha = 1){
  const e = spriteOf(key, art);
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
  // houses of a chief's village are a little bigger, with carved posts and shell ornaments
  const v = b.v || {}, K = KINDS[b.kind], canoe = b.kind === 'werft' && I && I.yard ? I.yard.kind + yardStage(I.yard) : '', chief = b.kind === 'haus' && !!I && I.lvl === 3;
  const boat = b.boat > 0 && K.canoe ? Math.min(2, Math.floor((1 - b.boat / K.canoe) * 3)) + 1 : 0;
  const o = {shape:v.shape === 'hr' ? 'hr' : '', roof:K.roof ? roofColor(b) : '', canoe, chief, prop:b.kind === 'haus' ? (v.prop != null ? v.prop : (b.id || 0) % HOUSE_PROPS.length) : 0, lvl:b.kind === 'halle' && I ? I.lvl || 1 : 0, boat, dry:b.kind === 'fisch' && !!I}, t = xformOf(b.kind, v);
  // young plants grow from a third of their size. A building site: first stakes and a cord mark the ground and the wood
  // is piled up, then the building rises from the ground as the builders work
  // progress is shown in ten steps, so the ground layer is only painted again when a step is reached
  const step = b.bt ? Math.floor((1 - b.bt / K.bt) * 10) / 10 : 1, site = b.bt && !K.plant, f = site ? step : 1, grown = b.bt && K.plant ? .35 + .65 * step : 1;
  const key = `${b.kind}|${o.shape}|${o.roof}|${canoe}|${chief ? 1 : ''}|${o.prop || ''}|${o.lvl || ''}|${boat || ''}|${o.dry ? 'd' : ''}`, art = () => artOf(b.kind, o), sc = t.s * (chief ? 1.12 : 1) * grown;
  if (!site){ put(c, b.x, b.y, sc, t.m, t.rot, key, art, alpha); return; }
  drawStakes(c, b, K, f, alpha, I);
  if (f > .15) putRising(c, b.x, b.y, sc, t.m, t.rot, key, art, (f - .15) / .85, alpha);
  drawSite(c, b, K, f, alpha);
}
function putRising(c, x, y, s, m, rot, key, art, f, alpha){
  const e = spriteOf(key, art), bx = e.box;
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s * m, s);
  c.beginPath(); c.rect(bx.x - 2, bx.y + bx.h * (1 - f), bx.w + 4, bx.h * f + 2); c.clip();
  blit(c, key, art, alpha); c.restore();
}
function drawStakes(c, b, K, f, alpha, I){
  // four stakes, and a cord pulled straight from one to the next
  const rx = Math.max(6, K.r * .95), ry = rx * .45, p = new Path2D(), cord = new Path2D(), pts = [.8, 2.35, 3.95, 5.5].map(a => ({x:b.x + Math.cos(a) * rx, y:b.y + Math.sin(a) * ry}));
  pts.forEach((q, i) => { p.moveTo(q.x, q.y + .6); p.lineTo(q.x, q.y - 2.8); if (i) cord.lineTo(q.x, q.y - 2); else cord.moveTo(q.x, q.y - 2); }); cord.closePath();
  c.globalAlpha = alpha; stroke(c, cord, '#E9DCC0', .5, null, null, .95); stroke(c, p, '#3B2618', 1, null, 'round'); c.globalAlpha = 1;
  // the wood the builders have brought, used up as the work goes on
  const need = I ? costOf(b.kind, I).holz || 0 : 0, logs = clamp(Math.ceil((b.got || 0) - f * need - .01), 0, 4), L = new Path2D();
  for (let i = 0; i < logs; i++){ const x = b.x + rx + 2, y = b.y + 3 - i * 1.6 + (i ? 0 : 0); L.moveTo(x - 3.4 + i * .6, y); L.lineTo(x + 3.4 - i * .6, y); }
  if (logs){ stroke(c, L, '#2B1D14', 1.9, null, 'round', alpha); stroke(c, L, '#9C7246', 1.1, null, 'round', alpha); }
}
/* No bar over the site: the frame stands while the walls go up, and the rising building shows how far it is */
function drawSite(c, b, K, f, alpha){
  const s = clamp(K.r / 11, .7, 1.5);
  if (f > .1 && f < .97) put(c, b.x, b.y, s, 1, 0, 'scaffold', '<use href="#scaffold"/>', alpha);
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
/* Lines drawn by hand: a loop that wavers, drawn twice like a quick sketch; a tag with uneven edges */
const loopPath = (x, y, rx, ry, seed, j = .07, n = 13) => new Path2D(wobble(x, y, rx, ry, seed, j, n).d);
function sketch(c, x, y, rx, ry, seed, color, w, alpha = 1, dash){
  stroke(c, loopPath(x, y, rx, ry, seed), color, w, dash, 'round', alpha);
  if (!dash) stroke(c, loopPath(x, y, rx * 1.04, ry * 1.06, seed + 17, .09, 11), color, w * .45, null, 'round', alpha * .7);
}
const tagPath = (x, y, w, h, seed) => new Path2D(smooth(tagPts(x, y, w, h, seed, .9)).d);

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
  // the reef of an atoll is no drawn ellipse but wavers like the real thing; the passage is an uneven gap of deep water
  p.ring = I.atoll ? loopPath(I.atoll.cx, I.atoll.cy, I.atoll.rx, I.atoll.ry, I.center.x | 0, .022, 44) : new Path2D(I.reef.d);
  p.harbor = loopPath(I.harbor.x, I.harbor.y, 11, 7.5, I.center.y | 0, .18, 9);
  if (I.river) p.river = new Path2D(smoothOpen(I.river));
  if (I.delta){
    // the arms are ribbons: as wide as the stream where they split, narrower on the way, wider again where they open into the sea
    p.armInk = new Path2D(); p.armWater = new Path2D(); p.arms = new Path2D();
    I.delta.arms.forEach((arm, k) => {
      const e = I.delta.exitAt[k], w = i => { const f = i / e; return f < .3 ? 1.5 - .4 * f / .3 : f < .7 ? 1.1 : Math.min(1.75, 1.1 + .65 * (f - .7) / .3); };
      p.armInk.addPath(ribbon(arm, i => w(i) + .9)); p.armWater.addPath(ribbon(arm, w)); p.arms.addPath(new Path2D(smoothOpen(arm)));
    });
    // the coast line has a gap where an arm opens into the sea
    p.gaps = new Path2D(); const b = I.box; p.gaps.rect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
    for (const q of I.delta.exits){ p.gaps.moveTo(q.x + 3.4, q.y); p.gaps.arc(q.x, q.y, 3.4, 0, TAU); }
  }
  if (I.hills){
    const out = smooth(I.hills.out), c = I.hills.c; p.hill = new Path2D(out.d); p.top = new Path2D(smooth(I.hills.top).d); p.hach = new Path2D();
    // short hachures run down the slope, like on an old chart
    out.poly.forEach((q, i) => { if (i % 2) return; const dx = q.x - c.x, dy = q.y - c.y, l = Math.hypot(dx, dy) || 1; p.hach.moveTo(q.x - dx / l * 1.5, q.y - dy / l * 1.5); p.hach.lineTo(q.x + dx / l * 4.5, q.y + dy / l * 4.5); });
  }
  if (I.patches){ p.patches = new Path2D(); for (const q of I.patches) p.patches.addPath(loopPath(q.x, q.y, q.rx * 1.2, q.ry * 1.2, q.x * 3 + q.y | 0, .2, 7)); }
  return I._p = p;
}
function drawIsland(c, I, area){
  const p = islandPaths(I);
  stroke(c, p.ring, '#24505F', 16, null, null, .45);
  fillWith(c, p.ring, '#79C6B8', 'pLag'); stroke(c, p.ring, '#4E9C9A', 8);
  stroke(c, p.ring, '#F4EEDC', 2, [.1, 3.6], 'round');
  fillWith(c, p.harbor, '#2F5F73', 'pSea');
  if (p.patches){ c.fillStyle = '#4E9C9A'; c.fill(p.patches); stroke(c, p.patches, '#F3F8EE', .6, null, null, .7); }
  // silt clouds the water off each mouth and fades out into the lagoon
  if (I.delta) for (const q of I.delta.exits){ const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, 20); g.addColorStop(0, 'rgba(201,214,170,.75)'); g.addColorStop(1, 'rgba(201,214,170,0)'); c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, 20, 0, TAU); c.fill(); }
  p.lands.forEach((L, i) => {
    stroke(c, L, '#F1F6EC', 4.4, null, null, .4);   // surf along the beach
    fillWith(c, L, '#8DA757', 'pDots');
    const tint = SEASON_TINT[seasonOf().id]; if (tint){ c.fillStyle = tint; c.fill(L); }   // dry grass in the lean months, lush and dark in the rains
    c.save(); c.clip(L); stroke(c, L, '#E8D29E', I.atoll ? 11 : 15); stroke(c, L, '#D2B67C', 3.4);
    // fresh alluvial sand around the arms, fading into the grass; the arms run through it and end exactly where the land ends
    if (p.arms && i === 0){
      const f = I.delta.fan, g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, I.delta.reach);
      g.addColorStop(0, 'rgba(222,204,146,.9)'); g.addColorStop(.6, 'rgba(214,200,140,.55)'); g.addColorStop(1, 'rgba(214,200,140,0)');
      c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, I.delta.reach, 0, TAU); c.fill(); c.fillStyle = '#2B1D14'; c.fill(p.armInk); }
    c.restore();
    if (p.gaps && i === 0){ c.save(); c.clip(p.gaps, 'evenodd'); stroke(c, L, '#2B1D14', 1.4, [2.2, 1.7]); c.restore(); }
    else stroke(c, L, '#2B1D14', 1.4, [2.2, 1.7]);
  });
  if (p.hill){ fillWith(c, p.hill, '#80A050', 'pDots'); stroke(c, p.hach, '#5E7A3A', .9, null, 'round', .8); c.fillStyle = '#76944A'; c.fill(p.top); stroke(c, p.top, '#5E7A3A', .7, [1.4, 1.4], null, .8); }
  // river and delta arms are one water: first every bank, then all the water, then the glints, so no bank crosses the water at the fork
  if (p.river){
    stroke(c, p.river, '#2B1D14', 4.8, null, 'round'); stroke(c, p.river, '#6DB9BE', 3, null, 'round');
    if (p.armWater){ c.save(); c.clip(p.lands[0]); c.fillStyle = '#6DB9BE'; c.fill(p.armWater); stroke(c, p.arms, '#EAF5F0', .8, [.1, 3.2], 'round', .85); c.restore(); }
    stroke(c, p.river, '#EAF5F0', .9, [.1, 3.4], 'round', .85);
  }
  const tp = treePaths(I);
  if (lod === 'far'){ if (tp.canopy){ stroke(c, tp.canopy, '#2B1D14', 2); c.fillStyle = '#3F6B2E'; c.fill(tp.canopy); } }
  else if (tp.under){ c.globalAlpha = .55; c.fillStyle = '#5E8440'; c.fill(tp.under); c.globalAlpha = 1; }
  // grass, shells and such hide where a building stands on them
  const under = d => d.s && I.buildings.some(b => { const r = KINDS[b.kind].r; return Math.abs(b.x - d.x) < r + 3 && Math.abs(b.y - d.y) < r * .7 + 3; });
  const v = area ? grow(area, 40) : I.box;
  for (const d of I.deco) if (ptIn(d.x, d.y, v) && !(d.s && (lod === 'far' || under(d)))) put(c, d.x, d.y, 1, 1, d.rot * Math.PI / 180, d.t, `<use href="#${d.t}"/>`);
  if (I.volcano) put(c, I.volcano.x, I.volcano.y, 1.6, 1, 0, 'volcano', '<use href="#volcano"/>');
}
const SEASON_TINT = {mager:'rgba(212,180,92,.2)', sturm:'rgba(34,74,56,.08)'};
/* A band along a line whose half width changes along it; its start hides under the round end of the stream */
function ribbon(pts, w){
  const L = [], R = [], n = pts.length, P = new Path2D();
  for (let i = 0; i < n; i++){
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, h = w(i);
    L.push({x:pts[i].x - dy / l * h, y:pts[i].y + dx / l * h}); R.push({x:pts[i].x + dy / l * h, y:pts[i].y - dx / l * h});
  }
  P.moveTo(L[0].x, L[0].y); for (const q of L) P.lineTo(q.x, q.y); for (let i = n - 1; i >= 0; i--) P.lineTo(R[i].x, R[i].y); P.closePath();
  return P;
}
/* Worn footpaths from every house to the meeting house, and from each workplace to the nearest house */
/* Footpaths: bare ground where people walk often (see stepWear), soft at the edges and lighter where most feet go */
function drawWear(c, I){
  const g = I._wg; if (!g) return;
  if (!I._wp){
    const P = [new Path2D(), new Path2D(), new Path2D()], R = [4.8, 3.6, 2.4];
    for (let i = 0; i < g.lv.length; i++){
      const l = g.lv[i]; if (!l) continue;
      const h = Math.imul(i + 1, 2654435761) >>> 0, x = g.x0 + (i % g.w + .5) * WEAR_CELL + ((h & 15) / 15 - .5) * 2.6, y = g.y0 + (Math.floor(i / g.w) + .5) * WEAR_CELL + (((h >> 4) & 15) / 15 - .5) * 2.6;
      if (!landAt(I, {x, y}) || (I.river && polyDist({x, y}, I.river, false) < 3)) continue;
      for (let k = 0; k < l; k++){ const r = R[k] * (.82 + ((h >> (8 + k * 3)) & 7) / 22); P[k].moveTo(x + r, y); P[k].ellipse(x, y, r, r * .78, ((h >> 20) & 7) / 7, 0, TAU); }
    }
    I._wp = P;
  }
  const [a, b, d] = I._wp;
  c.fillStyle = '#9C7E4E'; c.globalAlpha = .2; c.fill(a); c.fillStyle = '#B89A62'; c.globalAlpha = .26; c.fill(b); c.fillStyle = '#D9C48E'; c.globalAlpha = .32; c.fill(d); c.globalAlpha = 1;
}
/* Laid paths: crushed shell and coral sand between darker edges, rounded through the points you set */
const roadCurve = r => r.length > 2 ? spline([r[0], ...r, r[r.length - 1]], 6) : r;
function drawRoads(c, I){
  if (!I.roads || !I.roads.length) return;
  if (!I._rp){ const p = new Path2D(); for (const r of I.roads){ if (r.length < 2) continue; const sm = roadCurve(r); p.moveTo(sm[0].x, sm[0].y); for (const q of sm) p.lineTo(q.x, q.y); } I._rp = p; }
  stroke(c, I._rp, '#7E6440', 7.4, null, 'round', .38); stroke(c, I._rp, '#E6DABA', 5.4, null, 'round', .95);
  stroke(c, I._rp, '#BFA67A', 1.3, [.1, 2.7], 'round', .75); stroke(c, I._rp, '#FFFBF0', 1.2, [.1, 3.9], 'round', .9);
}
/* The forest floor under the trees close up, one green mass far away. Cached until a tree changes. */
function treePaths(I){
  if (I._tp) return I._tp;
  const T = (I.trees || []).filter(t => t.st === 0 || (t.st === 2 && t.g < GROW_TICKS * .5));
  if (!T.length) return I._tp = {};
  const under = new Path2D(), canopy = new Path2D();
  for (const t of T){ under.moveTo(t.x + 8.5, t.y - 1); under.ellipse(t.x, t.y - 1, 8.5, 5.5, 0, 0, TAU); canopy.moveTo(t.x + 8, t.y - 8); canopy.arc(t.x, t.y - 8, 8, 0, TAU); }
  return I._tp = {under, canopy};
}
const TREE_ART = ['wt0', 'wt1', 'wt2'];
function drawTree(c, t){
  const m = t.m ? -1 : 1;
  if (t.st === 1){ put(c, t.x, t.y, t.s, m, 0, 'stump', '<use href="#stump"/>'); return; }
  const f = t.st === 2 ? 1 - t.g / GROW_TICKS : 1;
  if (f < .3){ put(c, t.x, t.y, .8 + f * 1.4, m, 0, 'sapling', '<use href="#sapling"/>'); return; }
  const k = TREE_ART[t.v]; put(c, t.x, t.y, t.s * (.45 + .55 * f), m, 0, k, `<use href="#${k}"/>`);
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
      if (!lived(I)) continue; const hs = I.buildings.filter(b => KINDS[b.kind].roof); if (!hs.length) continue;
      const n = hs.length < 3 ? 0 : hs.length < 7 ? 1 : 2;
      put(c, hs.reduce((t, b) => t + b.x, 0) / hs.length, hs.reduce((t, b) => t + b.y, 0) / hs.length, 2.6, 1, 0, 'village' + n, VILLAGE[n]);
    }
    return;
  }
  const v = grow(area, 60), all = [], movingId = mode === 'move' && placing ? placing.moveId : 0;
  for (const I of islands){
    if (!seen(I) || !boxIn(I.box, v)) continue;
    if (I.discovered) for (const b of I.buildings) if (ptIn(b.x, b.y, v)) all.push([b, I]);
    for (const t of I.trees || []) if (ptIn(t.x, t.y, v)) all.push([t, null]);
  }
  all.sort((a, b) => a[0].y - b[0].y);
  for (const [b, I] of all) if (I) drawBuilding(c, b, I, b.id === movingId ? .25 : 1); else drawTree(c, b);
}
function drawSel(c){
  if (lod === 'far' || !selectedId) return; const b = findB(selectedId); if (!b) return;
  const r = KINDS[b.kind].r + 6; sketch(c, b.x, b.y + 1, r, r * .45, b.id * 7 + 3, '#F4ECD8', 2.6);
}
function seaRect(c, v, color, pat, from){
  c.fillStyle = color; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  if (pats[pat] && cam.z > from){ c.globalAlpha = clamp((cam.z - from) / .35, 0, 1); c.fillStyle = pats[pat]; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); c.globalAlpha = 1; }
}
function drawBase(c, v){
  seaRect(c, v, '#2F5F73', 'pSea', .3);   // waves fade out far away, where they would only flicker
  for (const I of islands) if (boxIn(I.box, grow(v, 20)) && seen(I)) drawIsland(c, I, v);
  if (lod !== 'far') for (const I of islands) if (lived(I) && boxIn(I.box, v)){ drawWear(c, I); drawRoads(c, I); }
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
const PEOPLE_Z = .9;   // people show from this zoom on
const FLAME = new Path2D('M0 0C-3.4 0-4-2.6-2.6-4.6C-2-3.4-1-3.2-1-3.2C-1.6-5.6 0-7.6 1.2-9C1.2-6.6 3.8-5.4 3-2.4C2.6-.8 1.6 0 0 0Z');
const HEART = new Path2D('M0 0C-3-2.5-4-5-2-6C-1-6.6 0-5.8 0-5C0-5.8 1-6.6 2-6C4-5 3-2.5 0 0Z'), BIRD1 = new Path2D('M-5 0q2.5-3.2 5 0q2.5-3.2 5 0'), BIRD2 = new Path2D('M-4.4 0q2.2-3 4.4 0q2.2-3 4.4 0');
function drawAnim(c, now){
  const v = view(40), ph = (now % 3400) / 3400 * TAU, a = reduced ? .4 : .41 - .29 * Math.cos(ph), dy = reduced ? 0 : 1.5 * Math.cos(ph);
  for (const I of islands){
    if (!I.volcano || !seen(I) || !boxIn(I.box, v)) continue;
    c.save(); c.translate(I.volcano.x, I.volcano.y + dy * 1.6); c.scale(1.6, 1.6); stroke(c, SMOKE_V, '#2B1D14', .9, null, 'round', a); c.restore();
  }
  if (lod === 'near') for (const I of islands) if (I.settled && boxIn(I.box, v)) for (const b of I.buildings) if (b.kind === 'toepfer' && ptIn(b.x, b.y, v)){ c.save(); c.translate(b.x, b.y + dy); stroke(c, SMOKE_T, '#2B1D14', .8, null, 'round', a); c.restore(); }
  for (const I of islands){
    if (!(I.feastEnd > tick) || !boxIn(I.box, v) || lod === 'far') continue;
    const h = I.buildings.find(b => b.kind === 'halle'); if (!h) continue;
    const fl = reduced ? 1 : 1 + Math.sin(now / 90) * .12 + Math.sin(now / 53) * .08;
    c.save(); c.translate(h.x, h.y + 24);
    c.scale(fl, fl); c.fillStyle = '#E0803A'; c.fill(FLAME); c.scale(.55, .6); c.fillStyle = '#F3D9A0'; c.fill(FLAME); c.restore();
  }
  // a pair of frigate birds circles over each known island
  if (!reduced && lod !== 'far') for (const I of islands){
    if (!I.discovered || !boxIn(I.box, v)) continue;
    const w = (I.box.x1 - I.box.x0) * .4, h = (I.box.y1 - I.box.y0) * .32;
    for (let k = 0; k < 2; k++){
      const a = now / (9000 + k * 4000) * (k ? -1 : 1) + k * 2.4 + I.center.x, x = I.center.x + Math.cos(a) * w, y = I.center.y + Math.sin(a) * h - 24;
      c.save(); c.translate(x, y); stroke(c, Math.sin(now / 220 + k * 3) > -.3 ? BIRD1 : BIRD2, '#2B1D14', 1.3, null, 'round', .85); c.restore();
    }
  }
  if (lod === 'near') for (const I of islands) if (lived(I) && boxIn(I.box, v)) for (const b of I.buildings){
    // smoke from the cooking fires of some houses
    if (b.kind !== 'haus' || b.bt || b.id % 3 || !ptIn(b.x, b.y, v)) continue;
    const q = ((now / 3400 + b.id * .37) % 1) * TAU, al = reduced ? .3 : .3 - .2 * Math.cos(q), sc = (b.v && b.v.scale) || 1;
    c.save(); c.translate(b.x - 4 * sc, b.y - KINDS.haus.hy * sc + 6 + (reduced ? 0 : Math.cos(q))); c.scale(.8, .8); stroke(c, SMOKE_T, '#2B1D14', .8, null, 'round', al); c.restore();
  }
  if (lod !== 'far' && !reduced) for (const I of islands){
    // surf runs along the reef and swells now and then
    if (!seen(I) || !boxIn(I.box, v)) continue;
    const p = islandPaths(I), sw = .5 + .5 * Math.sin(now / 1900 + I.center.x);
    stroke(c, p.ring, '#F4EEDC', 7, null, null, .05 + .09 * sw);
    c.lineDashOffset = -(now / 240) % 3.7; stroke(c, p.ring, '#F4EEDC', 2.2, [.1, 3.6], 'round', .5); c.lineDashOffset = 0;
  }
  if (lod !== 'far'){ drawLagoonLife(c, v, now); drawDugouts(c, v, now); drawFishers(c, v, now); }
  drawWhales(c, v, now);
  if (cam.z > PEOPLE_Z) drawPeople(c, v, now);
  drawWork(c, v);
  if (!reduced) drawWeather(c, v, now);
  if (lod !== 'far') drawNeeds(c, v, now);
  if (placing) drawGhost(c);
}
/* ---------- life on the water */
/* Fish schools and a turtle swim round the lagoon */
function lagoonLoop(I){
  if (I._ll) return I._ll;
  const pts = racePath(I), cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length].x - pts[i - 1].x, pts[i % pts.length].y - pts[i - 1].y));
  return I._ll = {pts, cum, len:cum[cum.length - 1]};
}
function alongLoop(lp, d){
  d = ((d % lp.len) + lp.len) % lp.len; let j = 1; while (lp.cum[j] < d) j++;
  const a = lp.pts[j - 1], b = lp.pts[j % lp.pts.length], f = (d - lp.cum[j - 1]) / (lp.cum[j] - lp.cum[j - 1] || 1);
  return {x:a.x + (b.x - a.x) * f, y:a.y + (b.y - a.y) * f, a:Math.atan2(b.y - a.y, b.x - a.x)};
}
function drawLagoonLife(c, v, now){
  const t = reduced ? 0 : now / 1000;
  for (const I of islands){
    if (!I.discovered || !boxIn(I.box, v)) continue;
    const lp = lagoonLoop(I);
    for (let k = 0; k < 2; k++){ const q = alongLoop(lp, t * 7 + k * lp.len / 2 + I.center.x); put(c, q.x, q.y, 1, 1, q.a, 'fishes', '<use href="#fishes"/>'); }
    // the sun glints on the lagoon
    if (!reduced && nightLevel() < .3) for (let k = 0; k < 7; k++){
      const tw = Math.sin(now / 650 + k * 2.1 + I.center.x); if (tw < .6) continue;
      const q = alongLoop(lp, k * lp.len / 7 + I.center.y), off = ((k * 37) % 11 - 5) * 1.4, x = q.x + Math.sin(q.a) * off, y = q.y - Math.cos(q.a) * off, r = 1.2 + (tw - .6) * 4;
      stroke(c, glint(x, y, r), '#FFFFFF', .7, null, 'round', (tw - .6) * 2.2);
    }
    if ((I.center.x | 0) % 2 === 0){ const q = alongLoop(lp, -t * 2.6 + lp.len / 4); put(c, q.x + Math.sin(q.a) * 6, q.y - Math.cos(q.a) * 6, 1, 1, q.a + Math.PI, 'turtle', '<use href="#turtle"/>'); }
  }
}
/* The catch hangs on the racks, as much as the fishers have brought in lately. On your islands the fishers themselves
   paddle out (see drawPeople); the clans' fishers paddle about off their racks and their reef gatherers wade. */
const RACK_FISH = [[-5, -3.8, 1], [-2, -3.8, 1], [1, -3.8, 1], [4, -3.8, 1], [5.5, .34, .7], [7.6, .34, .7], [9.7, .34, .7]];
const rackFish = n => '<g fill="#9FB7C0" stroke="#2B1D14" stroke-width=".4">' + RACK_FISH.slice(0, n).map(([x, y, k]) => `<path d="M${x} ${y - 2.1 * k}V${y - 1.6 * k}" stroke-width=".3"/><ellipse cx="${x}" cy="${y}" rx="${.9 * k}" ry="${1.9 * k}"/><path d="M${x - .7 * k} ${y + 2.5 * k}L${x} ${y + 1.7 * k}L${x + .7 * k} ${y + 2.5 * k}Z"/>`).join('') + '</g>';
function drawFishers(c, v, now){
  for (const I of islands){
    if (!lived(I) || !boxIn(I.box, v)) continue;
    for (const b of I.buildings){
      if ((b.kind !== 'fisch' && b.kind !== 'riff') || b.bt || !ptIn(b.x, b.y, grow(v, 40))) continue;
      if (b.kind === 'fisch'){
        const n = I.settled ? b.hung || 0 : 4, t = xformOf(b.kind, b.v || {}); if (n) put(c, b.x, b.y, t.s, t.m, t.rot, 'rackfish|' + n, rackFish(n));
        // the dugout lies on the beach while nobody is out in it
        if (I.settled && !(b.boat > 0) && !walkers.some(w => w.boat && w.job && w.job.b === b)) put(c, b.x, b.y, t.s, t.m, t.rot, 'fishbeach', '<use href="#beached" transform="translate(-9 6) scale(.75)"/>');
      }
      if (I.settled || b.boat > 0 || I.rahui) continue;
      const w = waterNear(I, b), dx = w.x - b.x, dy = w.y - b.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, t = reduced ? 0 : now / 1000 + b.id * 3.1;
      if (b.kind === 'fisch'){
        let C = {x:w.x + ux * 12, y:w.y + uy * 12}; if (landAt(I, C)) C = w;
        const a = t / 11, x = C.x + Math.cos(a) * 9, y = C.y + Math.sin(a) * 4, left = -Math.sin(a) < 0;
        put(c, x, y, 1, left ? -1 : 1, 0, 'einbaum', '<use href="#einbaum"/>');
        const n = ((now + b.id * 1300) % 9000) / 1400;
        if (!reduced && n < 1){ const nx = x + (left ? -6 : 6), r = 2 + n * 7; stroke(c, loopPath(nx, y + 1, r, r * .55, b.id, .14, 11), '#F4ECD8', .7, [.6, .9], 'round', 1 - n * .7); }
      } else if (cam.z > PEOPLE_Z){
        const sway = Math.sin(t / 3) * 5, x = w.x + ux * 7 - uy * sway, y = w.y + uy * 7 + ux * sway;
        c.save(); c.translate(x, y); if (Math.cos(t / 3) < 0) c.scale(-1, 1);
        blit(c, 'fig|' + figureLook(b.id * 31), () => figureArt(figureLook(b.id * 31))); blit(c, 'load|muschel', LOADS.muschel);
        c.fillStyle = '#79C6B8'; c.fill(WADE); stroke(c, ellipse(0, -.2, 3.6, 1.1), '#F4ECD8', .55, null, null, .9); c.restore();
      }
    }
  }
}
/* Someone in a dugout: the canoe goes in a gentle curve rather than a straight line, rocks a little, and a fisher
   casts the net now and then */
function drawBoatFig(c, w, now){
  if (w.sx == null){ w.sx = w.x; w.sy = w.y; }
  const d = Math.hypot(w.tx - w.sx, w.ty - w.sy) || 1, f = clamp(1 - Math.hypot(w.tx - w.x, w.ty - w.y) / d, 0, 1), bend = (w.look.charCodeAt(1) % 2 ? 1 : -1) * Math.min(14, d * .16) * Math.sin(f * Math.PI);
  const nx = -(w.ty - w.sy) / d, ny = (w.tx - w.sx) / d, x = w.x + nx * bend, y = w.y + ny * bend, rock = reduced ? 0 : Math.sin(now / 700 + w.phase) * .05;
  put(c, x, y + (reduced ? 0 : Math.sin(now / 900 + w.x) * .3), 1, w.left ? -1 : 1, rock, 'einbaum', '<use href="#einbaum"/>');
  if (!w.fishing || reduced) return;
  const n = ((now - w.fishing) % 3600) / 1200; if (n > 1) return;
  const ox = x + (w.left ? -6 : 6), r = 2 + n * 7;
  stroke(c, loopPath(ox, y + 1, r, r * .55, w.x | 0, .14, 11), '#F4ECD8', .7, [.6, .9], 'round', 1 - n * .7);
}
const WADE = ellipse(0, .3, 3, 1.3);
const glint = (x, y, r) => { const p = new Path2D(); p.moveTo(x - r, y); p.lineTo(x + r, y); p.moveTo(x, y - r * .7); p.lineTo(x, y + r * .7); return p; };
/* ---------- day and night: a day lasts six minutes. At dusk the light turns warm, the night is deep blue,
   and fires, torches and doorways shine. It can be switched off in the menu. */
const DAY_TICKS = 180;
let lastEconAt = 0;
function dayPhase(){ const f = lastEconAt ? clamp((performance.now() - lastEconAt) / TICK, 0, 1) : 0; return ((tick + f + 30) % DAY_TICKS) / DAY_TICKS; }
const smooth01 = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function nightLevel(){
  if (!opts.night) return 0;
  const p = dayPhase();
  return .55 * (p < .06 ? 1 - smooth01(p / .06) : p < .58 ? 0 : p < .68 ? smooth01((p - .58) / .1) : 1);
}
const nightC = document.createElement('canvas'), nightX = nightC.getContext('2d');
function lightsOf(v, now){
  const L = [], fl = id => reduced ? 1 : 1 + .07 * Math.sin(now / 95 + id) + .04 * Math.sin(now / 41 + id * 3);
  for (const I of islands){
    if (!seen(I) || !boxIn(I.box, grow(v, 80))) continue;
    if (I.volcano) L.push({x:I.volcano.x, y:I.volcano.y - 40, r:46, c:'255,90,40'});
    if (!lived(I)) continue;
    for (const b of I.buildings){
      if (b.bt || !ptIn(b.x, b.y, grow(v, 60))) continue;
      if (b.kind === 'fackel') L.push({x:b.x, y:b.y - 12, r:34 * fl(b.id), c:'255,170,70'});
      else if (b.kind === 'halle') L.push({x:b.x, y:b.y + 18, r:(I.feastEnd > tick ? 62 : 30) * fl(b.id), c:'255,150,60'});
      else if (b.kind === 'haus' && b.id % 2 === 0) L.push({x:b.x, y:b.y - 2, r:13 * fl(b.id), c:'255,180,90'});
      else if (b.kind === 'toepfer') L.push({x:b.x - 11, y:b.y + 2, r:16 * fl(b.id), c:'255,130,50'});
    }
  }
  return L;
}
function drawNight(now){
  const lv = nightLevel(); if (lv <= .01) return;
  if (nightC.width !== mapC.width || nightC.height !== mapC.height){ nightC.width = mapC.width; nightC.height = mapC.height; }
  // the colour runs from a warm dusk to the blue of the night
  const f = lv / .55, dusk = dayPhase() > .5, warm = dusk ? [120, 58, 40] : [110, 70, 92], blue = [10, 22, 54], col = warm.map((w, i) => Math.round(w + (blue[i] - w) * f));
  const n = nightX, v = view(40), lights = lightsOf(v, now);
  n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, nightC.width, nightC.height);
  n.fillStyle = `rgba(${col.join()},${lv})`; n.fillRect(0, 0, nightC.width, nightC.height);
  n.globalCompositeOperation = 'destination-out'; camXform(n);
  for (const L of lights){ const g = n.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.45, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = g; n.beginPath(); n.arc(L.x, L.y, L.r, 0, TAU); n.fill(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(nightC, 0, 0);
  camXform(ctx); ctx.globalCompositeOperation = 'lighter';
  for (const L of lights){ const r = L.r * .55, g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, r); g.addColorStop(0, `rgba(${L.c},${.32 * f})`); g.addColorStop(1, `rgba(${L.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.x, L.y, r, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
}
/* Now and then a whale surfaces in the open sea that the canoes have seen: its back, a spout, then the fluke as it dives */
let whale = null, nextWhale = 0;
function drawWhales(c, v, now){
  if (reduced) return;
  if (!whale && now > nextWhale){
    nextWhale = now + 9000 + Math.random() * 14000;
    for (let i = 0; i < 8; i++){
      const p = {x:v.x0 + (v.x1 - v.x0) * (.15 + Math.random() * .7), y:v.y0 + (v.y1 - v.y0) * (.15 + Math.random() * .7)};
      if (revealed(p) && islands.every(I => !boxIn(I.box, {x0:p.x - 50, y0:p.y - 50, x1:p.x + 50, y1:p.y + 50}))){ whale = {x:p.x, y:p.y, t0:now, dir:Math.random() < .5 ? -1 : 1}; break; }
    }
    if (!whale) nextWhale = now + 2500;   // no open water in sight yet, look again soon
  }
  if (!whale) return;
  const t = (now - whale.t0) / 1000, k = clamp(.9 / cam.z, 1, 2.6);
  if (t > 8){ whale = null; return; }
  const x = whale.x + whale.dir * t * 3 * k, y = whale.y;
  c.save(); c.translate(x, y); c.scale(k * whale.dir, k);
  if (t < 5.6){ const up = Math.min(1, t / 1, (5.6 - t) / .8); c.globalAlpha = up; blit(c, 'whale', '<use href="#whale"/>'); if (t > 1.2 && t < 3.2){ c.globalAlpha = 1 - Math.abs(t - 2.2); c.translate(-6, -3); blit(c, 'spout', '<use href="#spout"/>'); } }
  else { c.globalAlpha = Math.min(1, (8 - t) / .8); c.translate(-10, 0); blit(c, 'fluke', '<use href="#fluke"/>'); }
  c.restore();
}
/* Cloud shadows drift over sea and land with the north wind; in the storm season they are rain showers */
const CLOUD_T = 1100, PUFFS = [[0, 0, 1], [.55, -.18, .7], [-.6, .08, .62]];
function drawWeather(c, v, now){
  const rain = seasonOf().id === 'sturm', t = now / 1000, ox = t * 4, oy = t * 7, far = lod === 'far';   // far away one soft puff per cloud is enough
  for (let ty = Math.floor((v.y0 - 200) / CLOUD_T); ty <= Math.floor((v.y1 + 200) / CLOUD_T); ty++) for (let tx = Math.floor((v.x0 - 200) / CLOUD_T); tx <= Math.floor((v.x1 + 200) / CLOUD_T); tx++){
    for (let k = 0; k < 3; k++){
      const h = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233 + k * 37.719) * 43758.5453), r1 = h % 1, r2 = (h * 7.13) % 1, r3 = (h * 3.71) % 1;
      const x = tx * CLOUD_T + ((r1 * CLOUD_T + ox) % CLOUD_T), y = ty * CLOUD_T + ((r2 * CLOUD_T + oy) % CLOUD_T), R = 60 + r3 * 70;
      if (x + R * 1.6 < v.x0 || x - R * 1.6 > v.x1 || y + R < v.y0 || y - R > v.y1) continue;
      // three soft puffs, dark in the middle and fading out at the edge
      for (const [px, py, pr] of far ? [[0, 0, 1.15]] : PUFFS){
        c.save(); c.translate(x + px * R, y + py * R); c.scale(1, .55);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, R * pr); g.addColorStop(0, rain ? 'rgba(22,34,44,.24)' : 'rgba(18,38,48,.12)'); g.addColorStop(.55, rain ? 'rgba(22,34,44,.15)' : 'rgba(18,38,48,.07)'); g.addColorStop(1, 'rgba(18,38,48,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * pr, 0, TAU); c.fill(); c.restore();
      }
      if (rain && r3 > .35 && !far){
        // streaks of rain, slanting with the wind
        const p = new Path2D(), fall = (t * 60) % 14;
        for (let i = 0; i < 26; i++){ const a = (i * 2.399) % TAU, d = Math.sqrt((i + .5) / 26) * R * .8, sx = x + Math.cos(a) * d * 1.3, sy = y + Math.sin(a) * d * .6 + ((fall + i * 5) % 14) - 7; p.moveTo(sx, sy); p.lineTo(sx + 1.6, sy + 6); }
        stroke(c, p, '#EAF2F4', .8, null, 'round', .55);
      }
    }
  }
}
/* A dugout paddles from its jetty to each place it serves and back, one after the other */
function waterNear(I, b){
  if (b._wp && b._wp.k === b.x + b.y) return b._wp;
  let p = {x:b.x, y:b.y + 4};
  if (b.kind === 'steg'){ const a = ((b.v && b.v.rot) || 0) * Math.PI / 180; p = {x:b.x + Math.cos(a) * 30, y:b.y + Math.sin(a) * 30 + 2}; }
  else if (!KINDS[b.kind].water){
    const c = I.atoll ? {x:I.atoll.cx, y:I.atoll.cy} : I.center, out = I.atoll && !(b.kind === 'steg' && !inLagoonSide(I, b)) ? -1 : 1, d = Math.hypot(b.x - c.x, b.y - c.y) || 1, ux = (b.x - c.x) / d * out, uy = (b.y - c.y) / d * out;
    for (let k = 4; k < 60; k += 2){ const q = {x:b.x + ux * k, y:b.y + uy * k}; if (!landAt(I, q) && I.lands.every(L => polyDist(q, L.poly) > 5)){ p = q; break; } }
  }
  return b._wp = {x:p.x, y:p.y, k:b.x + b.y};
}
const inLagoonSide = (I, b) => { const a = I.atoll; return ((b.x - a.cx) / a.rx) ** 2 + ((b.y - a.cy) / a.ry) ** 2 < .78; };
function drawDugouts(c, v, now){
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v)) continue;
    const lg = lagoonOf(I), served = [...lg.served];
    lg.jetties.forEach((j, n) => {
      const A = waterNear(I, j), goals = served.slice(n * KINDS.steg.serves, (n + 1) * KINDS.steg.serves).map(b => waterNear(I, b)).filter(B => !overLand(A, B, 1));
      if (!goals.length){ put(c, A.x, A.y, 1, 1, 0, 'einbaum', '<use href="#einbaum"/>'); return; }
      // each crossing swings out in a bow, as far as the water allows
      const legs = goals.map((B, i) => { const d = Math.hypot(B.x - A.x, B.y - A.y), nx = -(B.y - A.y) / (d || 1), ny = (B.x - A.x) / (d || 1); let k = Math.min(14, d * .2) * ((j.id + i) % 2 ? 1 : -1); if (landAt(I, {x:(A.x + B.x) / 2 + nx * k, y:(A.y + B.y) / 2 + ny * k})) k = 0; return {B, d, nx, ny, k}; });
      const SPEED = 11, per = l => l.d / SPEED * 2000 + 2600, cyc = legs.reduce((t, l) => t + per(l), 0);
      let t = reduced ? 0 : (now + j.id * 977) % cyc, l = legs[0];
      for (const q of legs){ if (t < per(q)){ l = q; break; } t -= per(q); }
      // out, a pause there, back, a pause at the jetty
      const go = l.d / SPEED * 1000, f = t < go ? t / go : t < go + 1300 ? 1 : t < 2 * go + 1300 ? 1 - (t - go - 1300) / go : 0, bow = l.k * Math.sin(f * Math.PI);
      const x = A.x + (l.B.x - A.x) * f + l.nx * bow, y = A.y + (l.B.y - A.y) * f + l.ny * bow, left = (t < go + 1300) === (l.B.x < A.x);
      put(c, x, y, 1, left ? -1 : 1, reduced ? 0 : Math.sin(now / 760 + j.id) * .05, 'einbaum', '<use href="#einbaum"/>');
    });
  }
}
/* Figures bob and sway a little while they walk. Loads over the shoulder go behind the body, loads on the head in front. */
function drawPeople(c, v, now){
  const vis = [...walkers, ...critters].filter(w => ptIn(w.x, w.y, v)), items = vis.map(w => [w.y, w]), near = new Map(), mk = markUntil > now ? markW : null;
  // buildings standing in front of someone are drawn again over them, so people can walk behind a house
  for (const w of vis){
    const I = isl(w.isl);
    for (const b of I.buildings){
      const K = KINDS[b.kind]; if (b.kind === 'taro' || near.has(b)) continue;
      if (b.y > w.y && b.y - w.y < K.hy * ((b.v && b.v.scale) || 1) + 14 && Math.abs(b.x - w.x) < K.r + 6) near.set(b, I);
    }
    for (const t of I.trees) if (t.st !== 1 && !near.has(t) && t.y > w.y && t.y - w.y < 24 && Math.abs(t.x - w.x) < 9) near.set(t, null);
  }
  for (const b of near.keys()) items.push([b.y, b]);
  items.sort((a, b) => a[0] - b[0]);
  for (const [, w] of items){
    if (w.home){ drawCritter(c, w); continue; }
    if (w.kind){ drawBuilding(c, w, near.get(w)); continue; }
    if (w.st != null){ drawTree(c, w); continue; }
    // across the lagoon they paddle a dugout
    if (w.boat || (w.paddle && !landAt(isl(w.isl), w))){ drawBoatFig(c, w, now); continue; }
    const bob = w.moving && !reduced ? -Math.abs(Math.sin(w.phase)) * (w.child ? 1 : .7) : 0, rot = w.moving && !reduced ? Math.sin(w.phase) * .05 : 0;
    c.save(); c.translate(w.x, w.y + bob); if (rot) c.rotate(rot); if (w.left) c.scale(-1, 1);
    // someone sitting on a mat in front of a house; children are smaller
    if (w.sit && (!w.moving || w.busy)){ c.fillStyle = '#DCC48C'; c.fill(MAT); stroke(c, MAT, '#2B1D14', .35); c.scale(1, .78); }
    if (w.child) c.scale(.7, .7);
    if (w.carry && LOAD_BACK.has(w.carry)) blit(c, 'load|' + w.carry, LOADS[w.carry]);
    blit(c, 'fig|' + w.look + (w.old ? 'o' : ''), () => figureArt(w.look, w.old));
    const tool = w.old ? 'stab' : !w.carry && w.job && w.job.tool, at = w.busy && Math.hypot(w.x - w.busy.x, w.y - w.busy.y) < 3;
    // at work the adze and the digging stick swing
    if (tool){ const sw = at && !reduced && SWING.has(w.fx) ? Math.sin(now / 95 + w.phase) * .38 : 0; if (sw){ c.save(); c.translate(1.3, -4.2); c.rotate(sw); c.translate(-1.3, 4.2); } blit(c, 'tool|' + tool, TOOLS[tool]); if (sw) c.restore(); }
    if (at && w.fx) workFx(c, w, now);
    if (w.carry && !LOAD_BACK.has(w.carry)) blit(c, 'load|' + w.carry, LOADS[w.carry]);
    if (w.busy && w.job && w.job.type === 'wade'){ c.fillStyle = '#79C6B8'; c.fill(WADE); stroke(c, ellipse(0, -.2, 3.6, 1.1), '#F4ECD8', .55, null, null, .9); }
    // who works at the selected place, or the one you tapped: a small mark over the head
    if (w === mk || (w.job && w.job.b.id === selectedId)){ c.fillStyle = w === mk ? '#D9A441' : '#F4ECD8'; c.fill(MARK); stroke(c, MARK, '#2B1D14', .55, null, 'round'); }
    c.restore();
  }
}
/* What each kind of work looks like, small and in front of the worker, who faces right here */
const SWING = new Set(['dig', 'chop', 'build', 'carve']);
function workFx(c, w, now){
  const t = reduced ? .35 : now / 1000 + (w.x % 7), f = (t * 1.3) % 1;
  const dot = (x, y, r, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; };
  const line = (x0, y0, x1, y1, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.setLineDash([]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  const blob = (x, y, rx, ry, col, ink = '#2B1D14') => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = .35; c.stroke(); };
  const arcFly = (x0, y0, dx, h, col, r = .5) => { if (f < .7){ const g = f / .7; dot(x0 + dx * g, y0 - Math.sin(g * Math.PI) * h, r, col, 1 - g * .5); } };
  switch (w.fx){
    case 'dig': arcFly(4, -.3, 4, 3, '#6B4A2E', .6); break;                            // a clod of earth hops off the digging stick
    case 'chop': arcFly(5, -4, 4, 3, '#D9B27A'); arcFly(4.6, -3.4, 2.6, 4.4, '#C99A62', .4); break;   // chips fly from the trunk
    case 'build': if (f < .35) dot(4 + f * 4, -.8 - f * 3, .5, '#B89A62', 1 - f * 2); break;      // dust where the adze strikes
    case 'carve': if (f < .6){ c.strokeStyle = '#E0B97E'; c.lineWidth = .45; c.beginPath(); c.arc(4 + f * 4, -1.2 - f * 2.4, .7, 0, Math.PI * 1.4); c.stroke(); } break;   // curled shavings
    case 'plant': arcFly(3.5, -.4, 2.4, 1.6, '#6B4A2E', .45); break;
    case 'scoop': if (f < .5) dot(3 + f * 3, -1.6 - Math.sin(f * 2 * Math.PI) * 2, .45, '#F4ECD8'); break;
    case 'hang': blob(3.6, -5 + Math.sin(t * 6) * .3, .6, 1.3, '#9FB7C0'); break;
    case 'pot': {   // a pot grows coil by coil under the hands
      blob(4.4, -1.1, 1.8, 1.3, '#B5774A'); line(2.9, -2.2, 5.9, -2.2, '#2B1D14', .45);
      const a = t * 4; line(4.4 + Math.cos(a) * 1.5, -1.6 + Math.sin(a) * .4, 4.4 + Math.cos(a) * 1.5, -.6 + Math.sin(a) * .4, '#E3B08A', .5); break; }
    case 'grind': {   // an adze blade rubbed on a slab of sandstone
      blob(4.6, -.2, 2.6, .8, '#A7A49C'); const x = 4.6 + Math.sin(t * 7) * 1.1; blob(x, -.9, 1.1, .55, '#5C6066');
      if (f < .4) dot(6.6 + f * 3, -.5 - f * 2, .35, '#C8C4BA', 1 - f * 2); break; }
    case 'knap': {   // obsidian struck with a hammer stone, flakes spring off
      c.fillStyle = '#1C1719'; c.beginPath(); c.moveTo(3.4, -.2); c.lineTo(4.3, -2); c.lineTo(5.4, -.3); c.closePath(); c.fill();
      const g = (t * 1.8) % 1; if (g < .4){ dot(4.6 + g * 6, -1.6 - g * 4, .35, '#1C1719'); dot(4.4 + g * 4, -2 - g * 6, .25, '#F4ECD8'); } break; }
    case 'weave': {   // a mat on the lap, the next strip goes over and under
      c.fillStyle = '#DCC48C'; c.fillRect(2.4, -1.4, 5, 1.8); c.strokeStyle = '#2B1D14'; c.lineWidth = .35; c.strokeRect(2.4, -1.4, 5, 1.8);
      for (let x = 3.2; x < 7.4; x += 1) line(x, -1.4, x, .4, '#BFA169', .3);
      const x = 2.6 + ((t * .9) % 1) * 4.6; line(x, -1.6, x, .6, '#8C6440', .55); break; }
    case 'cord': {   // coconut fibre rolled on the thigh into cord
      const a = t * 5; blob(3.6, -2.4, 1, 1, '#B08048'); line(3.6, -2.4, 3.6 + Math.cos(a) * .9, -2.4 + Math.sin(a) * .9, '#6B4428', .35);
      c.strokeStyle = '#8C6440'; c.lineWidth = .4; c.beginPath(); c.moveTo(4.4, -2); c.quadraticCurveTo(6.2, -1.6 + Math.sin(t * 3) * .6, 6.8, .2); c.stroke(); break; }
    case 'beat': case 'pound': {   // bark beaten thin on a log, or kava root pounded with a stone
      const up = Math.abs(Math.sin(t * 5.5)), tip = {x:4.8, y:-1.2 - up * 3.2};
      c.fillStyle = '#8C5C36'; c.fillRect(3, -.9, 4, 1.1); if (w.fx === 'beat'){ c.fillStyle = '#E9DCC0'; c.fillRect(3.2, -1.2, 3.4, .5); }
      line(1.6, -4.6, tip.x, tip.y, '#2B1D14', .7); blob(tip.x + .2, tip.y, w.fx === 'beat' ? 1 : .8, .55, w.fx === 'beat' ? '#7A5434' : '#8A8A86');
      if (up < .2){ line(3.4, -2.6, 2.9, -3.3, '#2B1D14', .3); line(6.2, -2.6, 6.7, -3.3, '#2B1D14', .3); } break; }
    case 'drill': {   // a shell ring bored with a bow drill and an obsidian point
      blob(4.4, -.4, 1.4, .55, '#F3D9A0'); line(4.4, -.6, 4.4, -4, '#7A5434', .45);
      const s = Math.sin(t * 9) * 1.4; line(2.4 + s, -3.1, 6.4 + s, -3.1, '#2B1D14', .4); break; }
    case 'feed': { const g = (t * 1.1) % 1; if (g < .6){ const q = g / .6; dot(3.4 + q * 2.4, -4 + q * q * 4, .55, '#5E8A3A'); } break; }   // taro thrown to the pigs
    case 'leaf': { const h = .5 + Math.abs(Math.sin(t * 2)) * .9; blob(4.4, -.5, 2.8, h, '#5E8A3A'); line(1.8, -.5, 7, -.5, '#B9D08A', .3); break; }   // banana leaves laid over the pit
  }
}
const MARK = new Path2D('M-2.3-18.2Q0-18.8 2.4-18.1L.2-14.6Q-.4-15.6-2.3-18.2Z');
/* Who works where: over each workplace a little tag with one mark per place. Close up, or for the selected building. */
function slotsOf(I, b, sf, on){
  const K = KINDS[b.kind]; let n, open;
  if (b.bt){ if (K.plant) return null; n = open = SITE_CREW; }
  else if (b.kind === 'werft'){ if (!I.yard) return null; n = open = YARD_CREW; }
  else if (b.boat > 0) n = open = 1;
  else if (K.crew){ n = K.crew; open = capOf(b); }
  else return null;
  const crew = sf.crew.get(b) || 0, here = Math.min(crew, on.get(b) || 0);
  return Array.from({length:n}, (_, i) => i < here ? 'on' : i < crew ? 'way' : i < open ? 'free' : 'off');
}
function drawWork(c, v){
  if (lod === 'far') return;
  const s = clamp(1.7 / cam.z, .7, 1.6);
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v)) continue;
    let sf = null, on = null;
    for (const b of I.buildings){
      if ((lod !== 'near' && b.id !== selectedId) || !ptIn(b.x, b.y, v)) continue;
      if (!sf){ sf = staffOf(I); on = presentAt(I); }
      const sl = slotsOf(I, b, sf, on); if (!sl) continue;
      const K = KINDS[b.kind], w = sl.length * 5 + 3, top = b.bt ? K.hy * Math.max(.35, 1 - b.bt / K.bt) : K.hy * ((b.v && b.v.scale) || 1);
      c.save(); c.translate(b.x, b.y - top - 4); c.scale(s, s);
      const p = tagPath(-w / 2, -7.4, w, 8.4, b.id); c.globalAlpha = .92; c.fillStyle = '#F4ECD8'; c.fill(p); c.globalAlpha = 1; stroke(c, p, '#3E2416', .6, null, 'round');
      sl.forEach((k, i) => { c.save(); c.translate(-w / 2 + 4 + i * 5, -.9); blit(c, 'pip|' + k, PIP[k]); c.restore(); });
      c.restore();
    }
  }
}
const MAT = roundRect(-3.2, -.9, 6.4, 1.8, .6);
function drawCritter(c, a){
  const hop = a.moving && !reduced ? -Math.abs(Math.sin(a.phase)) * (a.kind === 'chicken' ? .9 : .5) : 0;
  c.save(); c.translate(a.x, a.y + hop); if (a.left) c.scale(-1, 1); if (a.kind === 'chicken' && a.peck > 0) c.rotate(.35);
  blit(c, 'cr|' + a.kind, `<use href="#${a.kind}"/>`); c.restore();
}
/* What an island lacks floats as a small bubble over some of its houses; a heart rises when someone moves in */
const bubbleArt = inner => `<path d="M-6.1-13.7Q-1.2-14.5 6.4-13.8Q7-8.2 6.1-2.4Q3.4-1.9 1.6-2.2L0 .6L-1.5-2.1Q-4.2-1.8-6.4-2.5Q-7.1-8.1-6.1-13.7Z" fill="#F4ECD8" stroke="#3E2416" stroke-width=".9" stroke-linejoin="round"/>${inner}`;
const needBubble = k => bubbleArt(`<use href="#ic-${k}" transform="translate(-4.6 -12.8) scale(.46)"/>`);
const PLANT_ART = {palme:'palm', pandanus:'pan', baum:'tree'};
/* An idle workshop shows what it lacks: a good, or the plants it needs close by */
const idleBubble = w => w.why === 'use' ? ['need|' + w.k, needBubble(w.k)] : w.why === 'crew' ? ['need|pop', needBubble('pop')] : w.why === 'boat' || w.why === 'carving' ? ['need|einbaum', needBubble('einbaum')] : w.why === 'space' ? ['need|sapling', needBubble('sapling')] :
  w.why === 'trees' ? ['idle|wald', bubbleArt('<use href="#wt0" transform="translate(0 -3) scale(.38)"/>')] : PLANT_ART[w.kind] ? ['idle|' + w.kind, bubbleArt(`<use href="#${PLANT_ART[w.kind]}" transform="translate(0 -3.2) scale(.36)"/>`)] : ['need|tapa', needBubble('tapa')];
function drawNeeds(c, v, now){
  const s = clamp(1 / cam.z, 1, 1.8);
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v)) continue;
    for (const b of I.buildings){
      if (!b.idle || b.idle.why === 'full' || b.idle.why === 'way' || (b.idle.why === 'crew' && lod === 'near') || !ptIn(b.x, b.y, v)) continue;
      const [key, art] = idleBubble(b.idle), bob = reduced ? 0 : Math.sin(now / 600 + b.id) * .8;
      put(c, b.x, b.y - KINDS[b.kind].hy - 14 + bob, s, 1, 0, key, art);
    }
    for (const b of lagoonOf(I).need) if (!lagoonOf(I).served.has(b) && !b.idle && ptIn(b.x, b.y, v)) put(c, b.x, b.y - KINDS[b.kind].hy - 14, s, 1, 0, 'need|einbaum', needBubble('einbaum'));
    const miss = needsOf(I).missing; if (!miss.length) continue;
    for (const b of I.buildings){
      if (!(b.kind === 'haus' || b.kind === 'pfahl' || b.kind === 'halle') || b.id % 3 || !ptIn(b.x, b.y, v)) continue;
      const k = miss[(b.id / 3 | 0) % miss.length].k, bob = reduced ? 0 : Math.sin(now / 600 + b.id) * .8, sc = (b.v && b.v.scale) || 1;
      put(c, b.x, b.y - KINDS[b.kind].hy * sc - 12 + bob, s, 1, 0, 'need|' + k, needBubble(k));
    }
  }
  const t = now;
  hearts = hearts.filter(h => t - h.t0 < 1600);
  for (const h of hearts){
    const f = (t - h.t0) / 1600; if (f < 0) continue;
    c.save(); c.translate(h.x, h.y - f * 12); c.scale(s * .9, s * .9); c.fillStyle = '#C8402C'; c.globalAlpha = f < .2 ? f / .2 : 1 - (f - .2) / .8; c.fill(HEART);
    c.lineWidth = .45; c.strokeStyle = '#2B1D14'; c.setLineDash([]); c.stroke(HEART); c.restore();
  }
}
function drawGhost(c){
  if (placing.road){ drawRoadGhost(c); return; }
  const K = KINDS[placing.kind], r = K.r + 5, e = loopPath(placing.x, placing.y + 1, r, r * .45, 7, .06, 13), ok = placing.ok, I = isl(placing.island);
  // while placing, rings show where the deposit is and how far the workshop reaches for its plants
  // how far a workshop reaches: a ring of dots laid on the ground by hand
  if (K.dep) for (const d of depsOf(I, K.dep)) stroke(c, loopPath(d.x, d.y, K.depR, K.depR * .8, d.x | 0, .05, 16), '#F3D9A0', 2.2, [.1, 5], 'round', .9);
  if (K.near) stroke(c, loopPath(placing.x, placing.y, K.near.r, K.near.r * .8, 11, .05, 16), '#F4ECD8', 1.8, [.1, 4], 'round', .9);
  const reach = K.trees || K.plants; if (reach) stroke(c, loopPath(placing.x, placing.y, reach.r, reach.r * .8, 13, .05, 16), '#F4ECD8', 1.8, [.1, 4], 'round', .9);
  c.fillStyle = ok ? 'rgba(62,122,58,.25)' : 'rgba(168,74,44,.25)'; c.fill(e);
  sketch(c, placing.x, placing.y + 1, r, r * .45, 7, ok ? '#3E7A3A' : '#A84A2C', 2.2);
  drawBuilding(c, {kind:placing.kind, x:placing.x, y:placing.y, v:placing.v, born:tick}, isl(placing.island), .78);
}
/* While laying a path: the points so far, the way between them, and a ring round the last one (tap it to take it back) */
function drawRoadGhost(c){
  const pts = placing.pts; if (!pts.length) return;
  if (pts.length > 1){ const p = new Path2D(), sm = roadCurve(pts); p.moveTo(sm[0].x, sm[0].y); for (const q of sm) p.lineTo(q.x, q.y); stroke(c, p, '#3E2416', 6.4, null, 'round', .35); stroke(c, p, '#F4ECD8', 4.4, [5, 3], 'round', .95); }
  for (const q of pts){ c.fillStyle = '#F4ECD8'; c.fill(ellipse(q.x, q.y, 2.4, 2)); stroke(c, ellipse(q.x, q.y, 2.4, 2), '#3E2416', .9); }
  const l = pts[pts.length - 1]; sketch(c, l.x, l.y, 7, 5, pts.length * 7, '#F4ECD8', 1.8);
}
function drawTop(c, now){
  const v = view(120), far = lod === 'far', ks = far ? clamp(.6 / cam.z, 1, 2.4) : 1;
  // the steered canoe: a ring around it and the way it still has to go
  const S = selShip && ships.includes(selShip) ? selShip : null;
  if (S && S.state === 'sail' && S.pi < S.path.length){
    const p = new Path2D(); p.moveTo(S.x, S.y); for (let i = S.pi; i < S.path.length; i++) p.lineTo(S.path[i].x, S.path[i].y);
    stroke(c, p, '#F4ECD8', 2.4 / Math.min(1, cam.z), [.1, 7 / Math.min(1, cam.z)], 'round', .95);
    // where it is going: a cross as the navigators scratched it
    const e = S.path[S.path.length - 1], q = 4 * ks, X = new Path2D(); X.moveTo(e.x - q, e.y - q * .6); X.lineTo(e.x + q, e.y + q * .5); X.moveTo(e.x + q * .9, e.y - q * .7); X.lineTo(e.x - q * .8, e.y + q * .6); stroke(c, X, '#F4ECD8', 2.2, null, 'round', .95);
  }
  for (const s of ships){
    if (!ptIn(s.x, s.y, v) || (!s.own && !revealed(s))) continue;
    // dolphins leap alongside a canoe under way
    if (!far && !reduced && s.state === 'sail') for (let k = 0; k < 2; k++){
      const t = (now + s.id * 777 + k * 2300) % 4600; if (t > 1200) continue;
      const f = t / 1200, hx = s.hx || 1, hy = s.hy || 0, side = k ? 11 : -11, x = s.x + hx * (8 + f * 14) - hy * side, y = s.y + hy * (8 + f * 14) + hx * side - Math.sin(f * Math.PI) * 4;
      put(c, x, y, 1, hx < 0 ? -1 : 1, (f - .5) * 1.1 * (hx < 0 ? -1 : 1), 'dolphin', '<use href="#dolphin"/>');
      if (f > .85) stroke(c, ellipse(x + hx * 3, y + 4, 3, 1), '#F4ECD8', .6, [.5, .8], 'round', .8);
    }
    c.save(); c.translate(s.x, s.y); c.scale(ks, ks);
    if (s === S){ const t = reduced ? .5 : (now % 1600) / 1600; sketch(c, 0, 1, 16 + 3 * t, 8 + 1.5 * t, s.id * 5, '#F4ECD8', 2.2, .95); }
    c.save(); if (!reduced && !far) c.rotate(Math.sin(now / 820 + s.id) * (s.state === 'sail' ? .05 : .025));
    if (s.kind === 'oc'){ c.scale(1.3, 1.3); if (s.hx < 0) c.scale(-1, 1); blit(c, 'oc', '<use href="#oc"/>'); }
    else { const up = s.hy < 0; if (up ? s.hx < 0 : s.hx > 0) c.scale(-1, 1); blit(c, up ? 'dc' : 'dcIn', up ? '<use href="#dc"/>' : '<use href="#dcIn"/>'); }
    c.restore();
    if (!far) shipPanel(c, s);
    c.restore();
  }
}
/* Over every canoe: who is aboard (crew, settlers or guests) and what it carries, with numbers */
const SHIP_FONT = '800 9px "Alegreya Sans", "Trebuchet MS", sans-serif';
function shipPanel(c, s){
  const ent = [[s.own ? 'crew' : 'gast', s.own ? SHIPS[s.kind].crew : s.guest ? 4 : 2]];
  if (s.people) ent.push(['pop', s.people]);
  for (const k of GOODS) if (s.cargo && s.cargo[k] > 0) ent.push([k, s.cargo[k]]);
  const shown = ent.length > 5 ? [...ent.slice(0, 4), ['+', ent.length - 4]] : ent, sc = clamp(1 / cam.z, 1, 1.7);
  c.save(); c.translate(s.kind === 'oc' ? 3 : 6, s.kind === 'oc' ? -14 : -30); c.scale(sc, sc); c.font = SHIP_FONT;
  const ws = shown.map(([k, n]) => (k === '+' ? 2 : 13) + c.measureText(k === '+' ? '+' + n : String(n)).width + 4), w = ws.reduce((a, b) => a + b, 4);
  const p = tagPath(0, -17, w, 15, s.id * 11 + shown.length);
  c.fillStyle = s.own ? '#F4ECD8' : '#F3D9A0'; c.fill(p); stroke(c, p, '#3E2416', 1.1, null, 'round');
  stroke(c, SHIP_LINE, '#3E2416', .9);
  let x = 3; c.fillStyle = '#2B1D14'; c.textBaseline = 'alphabetic';
  shown.forEach(([k, n], i) => {
    if (k !== '+') put(c, x, -15.6, .6, 1, 0, 'ic-' + k, `<use href="#ic-${k}"/>`);
    c.fillText(k === '+' ? '+' + n : String(n), x + (k === '+' ? 1 : 12.5), -6.2); x += ws[i];
  });
  c.restore();
}
const SHIP_LINE = new Path2D('M5-2L1 5');
const NAME_FONT = '800 14px Alegreya, Georgia, serif', SUB_FONT = '700 10px "Alegreya Sans", "Trebuchet MS", sans-serif';
function label(c, x, y, k, text, sub, font = NAME_FONT){
  c.save(); c.translate(x, y); c.scale(k, k);
  c.font = font; let w = c.measureText(text).width + 16;
  if (sub){ c.font = SUB_FONT; w = Math.max(w, c.measureText(sub).width + 14); }
  // a name tag of bark cloth with uneven edges, the same for the same name
  const top = font === NAME_FONT ? -15 : -11, seed = [...text].reduce((t, ch) => t * 31 + ch.charCodeAt(0) | 0, 7), p = tagPath(-w / 2, top, w, sub ? 30 : 20, seed);
  c.fillStyle = '#F4ECD8'; c.fill(p); stroke(c, p, '#3E2416', 1.4, null, 'round');
  c.textAlign = 'center'; c.fillStyle = '#2B1D14'; c.font = font; c.fillText(text, 0, font === NAME_FONT ? 0 : 4);
  if (sub){ c.font = SUB_FONT; c.fillStyle = '#5A3A26'; c.fillText(sub, 0, 11); }
  c.restore();
}
function drawLabels(c){
  if (lod === 'near') return;
  const k = clamp(.95 / cam.z, .75, 2.6), v = view(200);
  for (const I of islands){
    if (I.discovered && ptIn(I.labelAt.x, I.labelAt.y, v)) label(c, I.labelAt.x, I.labelAt.y, k, I.name, I.clan ? I.clan.name : I.settled ? `${I.pop} Bewohner, ${LEVEL_NAMES[I.lvl || 1]}` : 'unbewohnt');
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
  camXform(ctx); drawTop(ctx, now); drawNight(now); camXform(ctx); drawLabels(ctx);
  needDraw = false;
}
/* Something moves on screen, so the top layers need regular frames */
const animating = () => !!selShip || (lod !== 'far' && islands.some(I => I.settled && I.buildings.some(b => b.kind === 'steg' && !b.bt))) || ships.some(s => s.state === 'sail' || s.race) || !!placing || hearts.length > 0 || islands.some(I => I.feastEnd > tick) || cam.z > PEOPLE_Z || islands.some(I => I.volcano && seen(I));
