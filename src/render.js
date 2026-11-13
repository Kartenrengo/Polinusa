'use strict';
/* Canvas renderer.
   - Each piece of art becomes a bitmap once per size step and is then only copied.
   - Sea, islands and buildings sit in a base layer, the fog in a second one. Both are painted a bit larger
     than the screen and only shifted while you pan. They are repainted when a village changes, when you
     reach their edge or when a zoom comes to rest.
   - Smoke, people and canoes go on top, at most 30 times a second.
   - Only what is on screen is drawn. */

const mapC = $('map'), ctx = mapC.getContext('2d');
let DPR = Math.min(window.devicePixelRatio || 1, 2);
/* On a slow device the picture gets simpler by itself, step by step, and finer again when there is room:
   2 everything, 1 plants and trees stand still, 0 also fewer pixels. See govern in game.js. */
const DPR_MAX = DPR;
let quality = 2;
function setQuality(q){
  q = clamp(q, 0, 2); if (q === quality) return; quality = q;
  const d = q === 0 ? Math.min(DPR_MAX, 1.25) : DPR_MAX; if (d !== DPR){ DPR = d; vw = 0; measure(); }
  invalidate(true);
}
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
  const t0 = topH + 8, t = t0 + $('hudbar').offsetHeight + 6; $('hudbar').style.top = t0 + 'px';   // the toast and the news hang under the bar
  $('toast').style.top = t + 'px'; $('newsList').style.top = t + 'px'; $('newsList').style.maxHeight = Math.max(160, vh - t - botH - 16) + 'px';
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
const sprites = new Map(), LEVELS = [.25, .5, 1, 2, 4, 8], SPRITE_BUDGET = 9e6;
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
  // only what has not been drawn for a while goes, the biggest first, and every picture keeps at least one size ready,
  // so nothing ever vanishes from the map for a frame (that was the flicker in big villages)
  all.sort((a, b) => a[1].used - b[1].used || b[1].px - a[1].px);
  for (const [e, lv] of all){
    if (spritePx <= SPRITE_BUDGET * .7 || lv.used >= frameNo - 240) break;
    if ([...e.lv.values()].filter(o => o.ready).length < 2) continue;
    e.lv.delete(lv.L); spritePx -= lv.px * (lv.sh ? 2 : 1);
  }
}
const hasReady = e => { for (const o of e.lv.values()) if (o.ready) return true; return false; };
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
/* ---------- shadows. The sun rises in the east, stands high in the north at noon (we are south of the equator) and sets
   in the west; the shadows fall the other way, long in the morning and evening, short at noon, none at night. Each thing
   casts its own outline, laid down on the ground: the same bitmap, filled dark and slanted. */
function sunShadow(){
  let k = .72, day = 1;   // without day and night: a late afternoon sun
  if (opts.night){ const p = dayPhase(); k = Math.round(clamp(p / .63, 0, 1) * 12) / 12; day = p < .63 ? Math.round(Math.min(1, Math.sin(Math.PI * k) * 3 + .15) * 4) / 4 : 0; }
  const a = Math.PI * k, L = .4 + (1 - Math.sin(a)) * 1.2;
  return {key:k + '|' + day, c:Math.cos(a) * L * .9, d:-(.2 + .3 * Math.sin(a) * L), alpha:.3 * day};
}
function blitShadow(c, key, art, alpha){
  const e = spriteOf(key, art), t = c.getTransform(), need = Math.hypot(t.a, t.b), L = LEVELS.find(l => l >= need) || LEVELS[LEVELS.length - 1];
  let lv = e.lv.get(L); if (!lv){ lv = rasterize(e, L); e.lv.set(L, lv); }
  lv.used = frameNo;
  if (!lv.ready){ lv = null; for (const o of e.lv.values()) if (o.ready && (!lv || Math.abs(Math.log(o.L / L)) < Math.abs(Math.log(lv.L / L)))) lv = o; if (!lv) return; lv.used = frameNo; }   // a shadow of another size rather than none
  if (!lv.sh){ const s = document.createElement('canvas'); s.width = lv.c.width; s.height = lv.c.height; const x = s.getContext('2d'); x.drawImage(lv.c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#1A120C'; x.fillRect(0, 0, s.width, s.height); lv.sh = s; spritePx += lv.px; }
  const g = c.globalAlpha; c.globalAlpha = g * alpha;
  // only what stands above the ground casts a shadow; what lies in front (a fire pit, a mat) does not
  c.save(); c.beginPath(); c.rect(e.box.x, e.box.y, e.box.w, Math.max(0, 1 - e.box.y)); c.clip();
  c.drawImage(lv.sh, e.box.x, e.box.y, e.box.w, e.box.h); c.restore();
  c.globalAlpha = g;
}
function putShadow(c, x, y, s, m, rot, key, art, sh){
  c.save(); c.translate(x, y); c.transform(1, 0, sh.c, sh.d, 0, 0); if (rot) c.rotate(rot); c.scale(s * m, s); blitShadow(c, key, art, sh.alpha); c.restore();
}
const craftArt = k => `<ellipse cx="0" cy="1.6" rx="9" ry="3.6" fill="#D8BF86" stroke="#2B1D14" stroke-width=".55"/><path d="M-6.4 .5H6.4M-7.6 1.7H7.6M-6.4 2.9H6.4" stroke="#A8864E" stroke-width=".4" stroke-dasharray="1.2 .8"/><use href="#ic-${KINDS[k].prod}" transform="translate(.5 -6) scale(.44)"/>`;
/* the village centre: a carved post beside the house with a streamer of bark cloth that flies with the wind (painted
   with the ground layer, so it does not flutter, but it turns with the wind) */
function drawCenterMark(c, b){
  const K = KINDS[b.kind], s = (b.v && b.v.scale) || 1, x = b.x + (K.r + 3) * s * (b.v && b.v.mirror ? -1 : 1), y = b.y + 3, h = K.hy * s + 9, W = wind(), fl = Math.sin(b.id * 1.7) * .8;
  stroke(c, new Path2D(`M${x} ${y}L${x} ${y - h}`), '#2B1D14', 1.9, null, 'round'); stroke(c, new Path2D(`M${x} ${y}L${x} ${y - h}`), '#8C5C36', 1.1, null, 'round');
  for (let k = 0; k < 3; k++) stroke(c, new Path2D(`M${x - .9} ${y - h * .3 - k * 2.2}h1.8`), '#2B1D14', .45);   // the carving
  const d = W.tx < 0 ? -1 : 1, T = new Path2D(`M${x} ${y - h + .6}Q${x + d * 4} ${y - h - .4 + fl} ${x + d * 8} ${y - h + 1.2 + fl}L${x + d * 7} ${y - h + 3.2 + fl * .6}Q${x + d * 3.6} ${y - h + 3.6} ${x} ${y - h + 4}Z`);
  c.fillStyle = '#A84A2C'; c.fill(T); stroke(c, T, '#2B1D14', .5, null, 'round');
  stroke(c, new Path2D(`M${x + d * 1.6} ${y - h + 1.4}L${x + d * 1.4} ${y - h + 3.6}M${x + d * 4} ${y - h + 1}L${x + d * 3.8} ${y - h + 3.4}`), '#F3D9A0', .45);
}
/* rain called by the dance: a big grey cloud over the village, rain slanting from it, rings on the ground and the water */
function drawRainCall(c, v, now){
  if (reduced) return;
  for (const I of islands){
    if (!I.settled || !(I.rainUntil > tick) || tick < (I.rainAt || 0) + RAIN.dance - 1) continue;
    const ctr = centerOf(I) || I.anchor; if (!ctr || !ptIn(ctr.x, ctr.y, grow(v, 200))) continue;
    const left = (I.rainUntil - tick) / RAIN.len, a = clamp(Math.min(1 - left + .25, left * 3), 0, 1), x = ctr.x + 6, y = ctr.y - 56, W = wind(), t = now / 1000, shape = cloudShape(7);
    const p = new Path2D(), sl = W.tx * 3;
    for (let i = 0; i < 40; i++){ const qx = x + ((i * .618) % 1 - .5) * 110, f = (t * 1.3 + i * .37) % 1, qy = y + 3 + f * 58; p.moveTo(qx + sl * f * 2, qy); p.lineTo(qx + sl * f * 2 + sl, qy + 5); }
    c.save(); c.globalAlpha = .5 * a; c.strokeStyle = '#2B1D14'; c.lineWidth = .6; c.lineCap = 'round'; c.stroke(p); c.restore();
    for (let i = 0; i < 8; i++){ const f2 = (t * .8 + i / 8) % 1, rx = x + ((i * .73) % 1 - .5) * 120, ry = ctr.y + ((i * .41) % 1 - .5) * 40;
      c.globalAlpha = (1 - f2) * .6 * a; c.strokeStyle = '#F4ECD8'; c.lineWidth = .5; c.beginPath(); c.ellipse(rx, ry, .6 + f2 * 3, (.6 + f2 * 3) * .4, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    c.save(); c.translate(x, y); c.scale(1.15, 1.15); c.globalAlpha = .9 * a; c.fillStyle = '#C9CBC3'; c.fill(shape.P);
    c.save(); c.clip(shape.P); c.fillStyle = '#9DA29D'; c.fillRect(-60, -9, 120, 12); c.restore();
    c.strokeStyle = '#2B1D14'; c.lineWidth = 1.1 / 1.15; c.lineJoin = 'round'; c.stroke(shape.P); c.globalAlpha = .55 * a; c.stroke(shape.inner); c.restore(); c.globalAlpha = 1;
  }
}
function drawBuilding(c, b, I, alpha = 1, sh = null){
  if (b.at){ if (!sh) put(c, b.x, b.y, 1, 1, 0, 'craft|' + b.kind, craftArt(b.kind), alpha); return; }
  // houses of a chief's village are a little bigger, with carved posts and shell ornaments
  const v = b.v || {}, K = KINDS[b.kind], canoe = b.kind === 'werft' && I && I.yard ? I.yard.kind + yardStage(I.yard) : '', chief = b.kind === 'haus' && !!I && I.lvl === 3;
  const boat = b.boat > 0 && K.canoe ? Math.min(2, Math.floor((1 - b.boat / K.canoe) * 3)) + 1 : 0;
  const o = {shape:HOUSE_SHAPES.includes(v.shape) && v.shape !== 'hw' ? v.shape : '', roof:K.roof ? roofColor(b) : '', canoe, chief, prop:b.kind === 'haus' ? (v.prop != null ? v.prop : (b.id || 0) % HOUSE_PROPS.length) : 0, lvl:b.kind === 'halle' && I ? I.lvl || 1 : 0, t2:b.t >= 2, t3:b.t >= 3, yam:b.kind === 'yams' && !b.bt ? (b.ys || 0) + (b.kept > 0 ? 'k' : '') : '', boat, dry:b.kind === 'fisch' && !!I, soil:K.soil || K.grow ? (b.grow > 0 ? 'y' : b.fallow ? 'f' : (b.soil ?? 1) < .45 ? 't' : '') : ''}, t = xformOf(b.kind, v);
  // young plants grow from a third of their size. A building site: first stakes and a cord mark the ground and the wood
  // is piled up, then the building rises from the ground as the builders work
  // progress is shown in ten steps, so the ground layer is only painted again when a step is reached
  const step = b.bt ? Math.floor((1 - b.bt / K.bt) * 10) / 10 : 1, site = b.bt && !K.plant, f = site ? step : 1, grown = b.bt && K.plant ? .35 + .65 * step : 1;
  let key = `${b.kind}|${o.shape}|${o.roof}|${canoe}|${chief ? 1 : ''}|${o.prop || ''}|${o.lvl || ''}|${boat || ''}|${o.dry ? 'd' : ''}|${o.soil}|${o.t3 ? 3 : o.t2 ? 2 : ''}|${o.yam}`, art = () => artOf(b.kind, o);
  const sc = t.s * (chief ? 1.12 : 1) * grown;
  // when its look changes (a new roof, a field worn out, a canoe step), the old picture stays until the new one is painted
  if (!sh && hasReady(spriteOf(key, art))) b._sk = key;
  else if (b._sk && b._sk !== key && sprites.has(b._sk)){ if (!sh) put(c, b.x, b.y, sc, t.m, t.rot, key, art, 0); const old = sprites.get(b._sk); key = b._sk; art = old.art; }
  if (sh){ if (!site && K.hy > 3) putShadow(c, b.x, b.y, sc, t.m, t.rot, key, art, sh); return; }   // flat things like fields and paths cast none
  if (!site){ put(c, b.x, b.y, sc, t.m, t.rot, key, art, alpha); if (I && alpha >= 1 && HOME_KINDS.has(b.kind) && centerOf(I) === b) drawCenterMark(c, b); return; }
  // a field, a pit or a plaza: no frame of posts; the ground is dug row by row and the picture comes up out of it
  if (FLAT.has(b.kind) || K.soil){ drawStakes(c, b, K, f, alpha, I); put(c, b.x, b.y, sc, t.m, t.rot, key, art, alpha * (.18 + .82 * f)); drawFurrows(c, b, K, f, alpha); return; }
  drawStakes(c, b, K, f, alpha, I);
  if (f > .15) putRising(c, b.x, b.y, sc, t.m, t.rot, key, art, (f - .15) / .85, alpha);
  drawSite(c, b, K, f, alpha);
}
function drawFurrows(c, b, K, f, alpha){
  if (f >= .97) return;
  const rx = Math.max(6, K.r * .8), ry = rx * .38, n = 6, done = Math.ceil(f * n), P = new Path2D(), M = new Path2D();
  for (let i = 0; i < n; i++){ const y = b.y - ry + (i + .5) * (2 * ry / n), w = rx * Math.sqrt(Math.max(0, 1 - ((y - b.y) / ry) ** 2)) * .9; if (w < 1.5) continue;
    if (i < done){ P.moveTo(b.x - w, y); P.lineTo(b.x + w, y); } else for (let k = -w; k < w; k += 3.2){ M.moveTo(b.x + k + 1.2, y); M.ellipse(b.x + k, y, 1.2, .45, 0, 0, TAU); } }
  stroke(c, P, '#6B4A2E', .9, [1.6, .9], 'round', alpha * .85);   // dug rows
  c.globalAlpha = alpha * .5; c.fillStyle = '#8C9A52'; c.fill(M); c.globalAlpha = 1;   // grass still standing
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
  c.save(); c.globalCompositeOperation = 'destination-out'; c.fill(p.harbor); c.restore();   // the passage is open sea
  if (p.patches){ c.fillStyle = '#4E9C9A'; c.fill(p.patches); stroke(c, p.patches, '#F3F8EE', .6, null, null, .7); }
  // silt clouds the water off each mouth and fades out into the lagoon
  const ero = I.settled ? I._ero || 0 : 0, mouths = I.delta ? I.delta.exits : I.river && I.river.length ? [I.river[I.river.length - 1]] : [];
  if (ero) for (const q of mouths){ const R = 34 + ero * 26, g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, R); g.addColorStop(0, `rgba(140,104,58,${.45 + ero * .15})`); g.addColorStop(.6, 'rgba(140,104,58,.22)'); g.addColorStop(1, 'rgba(140,104,58,0)'); c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, R, 0, TAU); c.fill(); }
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
  const sw = swayOn();
  for (const d of I.deco) if (ptIn(d.x, d.y, v) && !(d.s && (lod === 'far' || under(d))) && !(sw && SWAY_DECO.has(d.t))) put(c, d.x, d.y, 1, 1, d.rot * Math.PI / 180, d.t, `<use href="#${d.t}"/>`);
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
/* Footpaths: they appear where people walk often (see stepWear). Each worn spot joins its worn neighbours in a band, so
   the paths run on as lines: first the grass lies flat, then the earth shows, then it is trodden bare and pale in the
   middle. Grass tufts stand at the edges, pebbles lie on the bare ground, and a path walked for a long time is strewn
   with coral sand and bits of shell. */
const WEAR_W = [0, 6.2, 4.4, 3, 1.7], WEAR_C = [null, ['#B5B47A', .26], ['#9C7E4E', .34], ['#C6A877', .5], ['#E0CC9E', .55]];
function drawWear(c, I){
  const g = I._wg; if (!g) return;
  if (!I._wp){
    const band = [null, new Path2D(), new Path2D(), new Path2D(), new Path2D()], road = new Path2D(), bits = new Path2D(), pebbles = new Path2D(), tufts = new Path2D();
    const pt = [], ok = [];
    for (let i = 0; i < g.lv.length; i++){
      const l = g.road[i] ? WEAR_TOP : g.lv[i]; if (!l) continue;
      const h = Math.imul(i + 1, 2654435761) >>> 0, x = g.x0 + (i % g.w + .5) * WEAR_CELL + ((h & 15) / 15 - .5) * 2.6, y = g.y0 + (Math.floor(i / g.w) + .5) * WEAR_CELL + (((h >> 4) & 15) / 15 - .5) * 2.6;
      if (!landAt(I, {x, y}) || (I.river && polyDist({x, y}, I.river, false) < 3)) continue;
      pt[i] = {x, y, l, h, r:g.road[i]}; ok[i] = 1;
    }
    const lvAt = i => ok[i] ? pt[i].l : 0;
    for (let i = 0; i < g.lv.length; i++){
      if (!ok[i]) continue;
      const P = pt[i], cx = i % g.w, nb = [cx + 1 < g.w ? i + 1 : -1, i + g.w, cx + 1 < g.w ? i + g.w + 1 : -1, cx > 0 ? i + g.w - 1 : -1];
      for (let k = 1; k <= P.l; k++){
        let joined = false;
        for (const j of nb){ if (j < 0 || lvAt(j) < k) continue; const Q = pt[j]; band[k].moveTo(P.x, P.y); band[k].lineTo(Q.x, Q.y); joined = true; }
        // a spot with no worn neighbour on its own step is a small round patch; it joins once the neighbours wear too
        if (!joined && !(i - 1 >= 0 && lvAt(i - 1) >= k) && !(lvAt(i - g.w) >= k) && !(lvAt(i - g.w - 1) >= k) && !(lvAt(i - g.w + 1) >= k)){ band[k].moveTo(P.x, P.y); band[k].lineTo(P.x + .01, P.y); }
      }
      if (P.r) for (const j of nb){ if (j >= 0 && ok[j] && pt[j].r){ road.moveTo(P.x, P.y); road.lineTo(pt[j].x, pt[j].y); } }
      if (P.r && (P.h & 3) === 0){ const sx = P.x + (((P.h >> 12) & 7) - 3.5) * .6, sy = P.y + (((P.h >> 15) & 7) - 3.5) * .45; bits.moveTo(sx + .7, sy); bits.ellipse(sx, sy, .7, .45, 0, 0, TAU); }
      // pebbles on the bare ground, grass tufts at the edge of the flattened grass
      if (P.l >= 3 && !P.r && (P.h >> 7) % 5 === 0){ const px = P.x + (((P.h >> 18) & 7) - 3.5) * .5, py = P.y + (((P.h >> 21) & 7) - 3.5) * .35, pr = .45 + ((P.h >> 24) & 3) * .15; pebbles.moveTo(px + pr, py); pebbles.ellipse(px, py, pr, pr * .7, 0, 0, TAU); }
      if (P.l <= 2 && (P.h >> 9) % 3 === 0){ const side = (P.h >> 11) & 1 ? 1 : -1, tx = P.x + side * (2.6 + ((P.h >> 13) & 3) * .4), ty = P.y + (((P.h >> 16) & 7) - 3.5) * .4; tufts.moveTo(tx - .9, ty); tufts.lineTo(tx - .3, ty - 1.5); tufts.moveTo(tx, ty); tufts.lineTo(tx + .2, ty - 1.9); tufts.moveTo(tx + .9, ty); tufts.lineTo(tx + .6, ty - 1.4); }
    }
    I._wp = {band, road, bits, pebbles, tufts};
  }
  const {band, road, bits, pebbles, tufts} = I._wp;
  c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);
  for (let k = 1; k <= WEAR_TOP; k++){ c.strokeStyle = WEAR_C[k][0]; c.globalAlpha = WEAR_C[k][1]; c.lineWidth = WEAR_W[k]; c.stroke(band[k]); }
  c.globalAlpha = .8; c.lineWidth = 5.4; c.strokeStyle = '#B9A06C'; c.stroke(road); c.globalAlpha = .95; c.lineWidth = 4.2; c.strokeStyle = '#EDE3C8'; c.stroke(road);
  c.fillStyle = '#FFFFFF'; c.globalAlpha = .8; c.fill(bits);
  c.fillStyle = '#8E8576'; c.globalAlpha = .55; c.fill(pebbles);
  c.strokeStyle = '#5E7A3A'; c.lineWidth = .45; c.globalAlpha = .5; c.stroke(tufts);
  c.globalAlpha = 1; c.lineCap = 'butt';
}
function treePaths(I){
  if (I._tp) return I._tp;
  const T = (I.trees || []).filter(t => t.st === 0 || (t.st === 2 && t.g < GROW_TICKS * .5));
  if (!T.length) return I._tp = {};
  const under = new Path2D(), canopy = new Path2D();
  for (const t of T){ under.moveTo(t.x + 8.5, t.y - 1); under.ellipse(t.x, t.y - 1, 8.5, 5.5, 0, 0, TAU); canopy.moveTo(t.x + 8, t.y - 8); canopy.arc(t.x, t.y - 8, 8, 0, TAU); }
  return I._tp = {under, canopy};
}
const TREE_ART = ['wt0', 'wt1', 'wt2'];
function drawTree(c, t, sh){
  const m = t.m ? -1 : 1, P = sh ? (x, y, s, mm, r, k, a) => putShadow(c, x, y, s, mm, r, k, a, sh) : (x, y, s, mm, r, k, a) => put(c, x, y, s, mm, r, k, a);
  if (t.st === 1){ if (!sh) put(c, t.x, t.y, t.s, m, 0, 'stump', '<use href="#stump"/>'); return; }
  const f = t.st === 2 ? 1 - t.g / GROW_TICKS : 1;
  if (f < .3){ P(t.x, t.y, .8 + f * 1.4, m, 0, 'sapling', '<use href="#sapling"/>'); return; }
  const k = TREE_ART[t.v]; P(t.x, t.y, t.s * (.45 + .55 * f), m, 0, k, `<use href="#${k}"/>`);
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
/* Close up, grass, palms and trees move in the wind. They are then not part of the still ground layer but drawn with the
   people, each frame, swaying a little; the forest only where not too many trees are in view. */
const SWAY_KINDS = new Set(['palme', 'pandanus', 'baum', 'hibiskus']), SWAY_DECO = new Set(['tuft', 'fern', 'reed', 'flowers']);
const swayOn = () => !reduced && cam.z > PEOPLE_Z && quality > 1;
function swayK(x, y, amp, now){
  const W = wind(), t = now / 1000, ph = Math.sin(x * 12.9898 + y * 78.233) * 6, g = (x * W.tx + y * W.ty) / 90;   // gusts run across with the wind
  return amp * (.35 + .65 * W.str) * (Math.sin(t * 1.25 + ph) * .65 + Math.sin(t * .5 - g) * .35 + W.tx * W.str * .5);
}
function drawObjects(c, area){
  if (lod === 'far'){
    for (const I of islands){
      if (!lived(I)) continue; const hs = I.buildings.filter(b => KINDS[b.kind].roof && !b.at); if (!hs.length) continue;
      const n = hs.length < 3 ? 0 : hs.length < 7 ? 1 : 2;
      put(c, hs.reduce((t, b) => t + b.x, 0) / hs.length, hs.reduce((t, b) => t + b.y, 0) / hs.length, 2.6, 1, 0, 'village' + n, VILLAGE[n]);
    }
    return;
  }
  const v = grow(area, 60), all = [], movingId = mode === 'move' && placing ? placing.moveId : 0, sw = swayOn();
  let trees = 0; if (sw) for (const I of islands) if (seen(I) && boxIn(I.box, v)) for (const t of I.trees || []) if (ptIn(t.x, t.y, v)) trees++;
  const swT = sw && trees < 320; if (baseL.at) baseL.at.swT = swT;
  for (const I of islands){
    if (!seen(I) || !boxIn(I.box, v)) continue;
    const storm = cycloneOver(I);   // in a cyclone the palms bend and are drawn moving (drawStormSea)
    if (I.discovered) for (const b of I.buildings) if (ptIn(b.x, b.y, v) && !(storm && (b.kind === 'palme' || b.kind === 'pandanus'))) all.push([b, I]);
    for (const t of I.trees || []) if (ptIn(t.x, t.y, v)) all.push([t, null]);
  }
  all.sort((a, b) => a[0].y - b[0].y);
  // first every shadow on the ground, then the things themselves, so no shadow lies over a roof; what sways is drawn later
  const sh = sunShadow(); if (sh.alpha > 0) for (const [b, I] of all){ if (I){ if (b.id !== movingId) drawBuilding(c, b, I, 1, sh); } else drawTree(c, b, sh); }
  for (const [b, I] of all){ if (I){ if (!(sw && SWAY_KINDS.has(b.kind))) drawBuilding(c, b, I, b.id === movingId ? .25 : 1); } else if (!swT || b.st === 1) drawTree(c, b); }
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
  // the open sea is not in this layer: it is painted under it every frame, so its waves can move (drawSea)
  for (const I of islands) if (boxIn(I.box, grow(v, 20)) && seen(I)) drawIsland(c, I, v);
  if (lod !== 'far') for (const I of islands) if (lived(I) && boxIn(I.box, v)){ drawWear(c, I); }
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
/* more birds in the same stroke: the frigatebird, long angled wings and a forked tail, that mostly soars; the small tern
   with narrow wings that beats fast; and the noddy and booby of the old shape */
const FRIG1 = new Path2D('M-7.6 1.2L-3.4-1.9L0 .2L3.4-1.9L7.6 1.2M0 .2L-.7 2.2M0 .2L.7 2.2'), FRIG2 = new Path2D('M-7.2.5L-3.4-.7L0 .2L3.4-.7L7.2.5M0 .2L-.7 2.2M0 .2L.7 2.2');
const TERN1 = new Path2D('M-4.2-.2q2-1.9 4.2.2q2.1-2.1 4.2-.2'), TERN2 = new Path2D('M-4-.1q2-.6 4 .1q2-.8 4-.1');
const birdOf = (k, t) => k % 3 === 1 ? {p:Math.sin(t / 900 + k) > .6 ? FRIG2 : FRIG1, s:1.25, w:1.1} : k % 3 === 2 ? {p:Math.sin(t / 110 + k * 2) > -.2 ? TERN1 : TERN2, s:.7, w:1.2} : {p:Math.sin(t / 220 + k * 3) > -.3 ? BIRD1 : BIRD2, s:1, w:1.3};
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
  // birds circle over each known island: many over untouched land, one or two where the wild has been hunted out
  if (!reduced && lod !== 'far') for (const I of islands){
    if (!I.discovered || !boxIn(I.box, v)) continue;
    const w = (I.box.x1 - I.box.x0) * .4, h = (I.box.y1 - I.box.y0) * .32, n = 1 + Math.round(wildOf(I) * wildKeep(I) * 6);
    for (let k = 0; k < n; k++){
      const a = now / (9000 + k * 2300) * (k % 2 ? -1 : 1) + k * 2.4 + I.center.x, rr = k < 2 ? 1 : .45 + (k * 7 % 5) / 8, x = I.center.x + Math.cos(a) * w * rr, y = I.center.y + Math.sin(a) * h * rr - 24 - (k % 3) * 6;
      const B = birdOf(k, now); c.save(); c.translate(x, y); c.scale(B.s, B.s); stroke(c, B.p, '#2B1D14', B.w / B.s, null, 'round', .85); c.restore();
    }
  }
  // smoke from the cooking fires: at dawn, when everyone eats (see mealTick), from every house where a family lives, then
  // thinning out; during the day from some. Soft puffs rise, widen and drift with the wind.
  if (lod === 'near'){ const W = wind(), dp = dayPhase(), dawn = dp < .14 ? 1 - dp / .14 : 0;
    for (const I of islands) if (lived(I) && boxIn(I.box, v)) for (const b of I.buildings){
      if (!HOME_KINDS.has(b.kind) || b.bt || !ptIn(b.x, b.y, v)) continue;
      const lit = Math.max(b.id % 3 ? 0 : .7, dawn && famOfHome(I, b) ? dawn : 0); if (!lit) continue;
      const sc = (b.v && b.v.scale) || 1, x0 = b.x - 4 * sc, y0 = b.y - KINDS[b.kind].hy * sc + 5;
      if (reduced){ c.save(); c.translate(x0, y0 + 1); c.scale(.8, .8); stroke(c, SMOKE_T, '#2B1D14', .8, null, 'round', .3 * lit); c.restore(); continue; }
      for (let k = 0; k < 4; k++){
        const q = (now / 2700 + b.id * .37 + k / 4) % 1, r = 1 + q * 3.2, drift = q * q * 12 * (.25 + W.str);
        c.globalAlpha = lit * (1 - q) * .85 * Math.min(1, q * 6); c.fillStyle = k % 2 ? '#F6F1E6' : '#E9E2D3';
        c.beginPath(); c.ellipse(x0 + W.tx * drift + Math.sin(q * 5 + b.id + k) * .7, y0 - q * 18 + W.ty * drift * .5, r, r * .78, 0, 0, TAU); c.fill();
        c.globalAlpha *= .45; c.strokeStyle = '#2B1D14'; c.lineWidth = .35; c.stroke();   // a thin ink line, as the clouds have
      }
      c.globalAlpha = 1;
    } }
  if (lod !== 'far' && !reduced) for (const I of islands){
    // surf runs along the reef and swells now and then
    if (!seen(I) || !boxIn(I.box, v)) continue;
    const p = islandPaths(I), sk = cycloneOver(I) ? cycloneLevel() : 0, sw = .5 + .5 * Math.sin(now / (2600 - 1900 * sk) + I.center.x * .01);
    stroke(c, p.ring, '#F4EEDC', 7 + 9 * sk, null, null, .06 + .07 * sw + .3 * sk);   // the swell breaks on the reef in an even rhythm; in a storm the breakers pound it
    c.lineDashOffset = -(now / (700 - 450 * sk)) % 3.7; stroke(c, p.ring, '#F4EEDC', 2.2, [.1, 3.6], 'round', .5); c.lineDashOffset = 0;
  }
  if (cyclone && lod !== 'far') drawStormSea(c, v, now);
  if (lod !== 'far'){ drawLagoonLife(c, v, now); drawDugouts(c, v, now); drawFishers(c, v, now); }
  if (lod === 'near' && !reduced && nightLevel() < .2) drawButterflies(c, v, now);
  drawWhales(c, v, now); if (lod !== 'far' && !reduced) drawSeaLife(c, v, now); if (lod !== 'far') drawDrift(c, v, now);
  if (cam.z > PEOPLE_Z){ drawPeople(c, v, now); if (falls.length) drawFalls(c, v, now); }
  drawWork(c, v);
  if (!reduced) drawWeather(c, v, now);
  drawRainCall(c, v, now);
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
      if ((b.kind !== 'fisch' && b.kind !== 'taucher') || b.bt || !ptIn(b.x, b.y, grow(v, 40))) continue;
      if (b.kind === 'taucher'){ if (I.settled && !(b.boat > 0) && !walkers.some(w => w.boat && w.job && w.job.b === b)){ const t = xformOf(b.kind, b.v || {}); put(c, b.x, b.y, t.s, t.m, t.rot, 'fishbeach', '<use href="#beached" transform="translate(-9 6) scale(.75)"/>'); } continue; }
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
        const n = ((now + b.id * 1300) % 9000) / 1400;
        drawDugout2(c, x, y, left, 0, figureLook(b.id * 17 + 3), false, figureLook(b.id * 23 + 5), false, now, b.id, n >= 1);
        if (!reduced && n < 1){ const nx = x + (left ? -7 : 7), r = 2 + n * 7; stroke(c, loopPath(nx, y + 1, r, r * .55, b.id, .14, 11), '#F4ECD8', .7, [.6, .9], 'round', 1 - n * .7); }
      }
      if (b.kind === 'fisch' && cam.z > PEOPLE_Z){   // and someone of theirs gleans the reef flat
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
/* ---------- people in canoes are the same people as on land: sitting, the upper body above the gunwale, the hull over
   their legs, and a paddle that dips with the stroke */
function seatedFig(c, look, old, x, y, s = 1){
  c.save(); c.beginPath(); c.rect(x - 7 * s, y - 16 * s, 14 * s, 15.2 * s); c.clip();   // only what rises above the gunwale
  c.translate(x, y + 3.1 * s); c.scale(s * .92, s * .92); blit(c, 'fig|' + look + (old ? 'o' : ''), () => figureArt(look, old)); c.restore();
}
function paddleStroke(c, x, y, s, now, ph){
  const a = reduced ? 0 : Math.sin(now / 340 + ph), bx = x + (3.4 + a * 1.7) * s, by = y + (1.5 - Math.max(0, -a) * .5) * s;
  const p = new Path2D(); p.moveTo(x + 1.1 * s, y - 4.6 * s); p.lineTo(bx, by);
  stroke(c, p, '#2B1D14', .8 * s, null, 'round'); stroke(c, p, '#9C7246', .36 * s, null, 'round');
  c.fillStyle = '#9C7246'; const bl = ellipse(bx, by + .2 * s, .55 * s, 1.15 * s); c.fill(bl); stroke(c, bl, '#2B1D14', .3 * s);
  if (!reduced && a > .55) stroke(c, ellipse(bx - .6 * s, by + 1.2 * s, 1.4 * s, .45 * s), '#F4FBFA', .4 * s, [.4, .7], 'round', .85);   // the water swirls behind the blade
  if (!reduced && a < -.3 && lod === 'near'){ const q = (-a - .3) / .7; c.fillStyle = '#F4FBFA';   // drops run off the blade as it comes out of the water
    for (let k = 0; k < 3; k++){ c.globalAlpha = (1 - q) * .9; c.beginPath(); c.arc(bx - (.5 + k * .7 + q * 1.4) * s, by + (-.6 - k * .25 + q * q * 2.2) * s, (.3 - k * .06) * s, 0, TAU); c.fill(); }
    c.globalAlpha = 1; }
}
function drawDugout(c, x, y, left, rock, look, old, now, ph, paddling){
  c.save(); c.translate(x, y); if (left) c.scale(-1, 1); if (rock) c.rotate(rock);
  seatedFig(c, look, old, -.6, -.2);
  blit(c, 'einbaumH', '<use href="#einbaumH"/>');
  if (paddling) paddleStroke(c, -.6, -.2, 1, now, ph);
  c.restore();
}
/* two in one canoe: the steersman at the stern paddles, the fisher sits at the bow */
function drawDugout2(c, x, y, left, rock, look, old, look2, old2, now, ph, paddling){
  c.save(); c.translate(x, y); if (left) c.scale(-1, 1); if (rock) c.rotate(rock);
  seatedFig(c, look2, old2, 3.8, -.4, .94); seatedFig(c, look, old, -3.8, -.1);
  c.save(); c.scale(1.5, 1); blit(c, 'einbaumH', '<use href="#einbaumH"/>'); c.restore();
  if (paddling) paddleStroke(c, -3.8, -.1, 1, now, ph);
  c.restore();
}
function drawBoatFig(c, w, now){
  if (w.sx == null){ w.sx = w.x; w.sy = w.y; }
  const d = Math.hypot(w.tx - w.sx, w.ty - w.sy) || 1, f = clamp(1 - Math.hypot(w.tx - w.x, w.ty - w.y) / d, 0, 1), bend = (w.look.charCodeAt(1) % 2 ? 1 : -1) * Math.min(14, d * .16) * Math.sin(f * Math.PI);
  const nx = -(w.ty - w.sy) / d, ny = (w.tx - w.sx) / d, x = w.x + nx * bend, y = w.y + ny * bend, rock = reduced ? 0 : Math.sin(now / 700 + w.phase) * .05;
  // a diver is down: the canoe floats empty, the cord with the stone runs into the water, bubbles rise
  if (w.under){
    put(c, x, y + (reduced ? 0 : Math.sin(now / 900 + w.x) * .3), 1, w.left ? -1 : 1, rock, 'einbaumE', '<use href="#einbaumE"/>');
    const sx = x + (w.left ? -5 : 5), cord = new Path2D(); cord.moveTo(sx, y - .4); cord.quadraticCurveTo(sx + (w.left ? -2 : 2), y + 2, sx + (w.left ? -1.5 : 1.5), y + 4.5);
    stroke(c, cord, '#E9DCC0', .45, null, 'round', .9); stroke(c, ellipse(sx + (w.left ? -1.5 : 1.5), y + 4.6, 1.3, .55), '#F4ECD8', .5, null, null, .5);
    if (!reduced) for (let k = 0; k < 3; k++){ const f = (Math.max(0, now - w.under) / 1400 + k / 3) % 1; c.globalAlpha = 1 - f; stroke(c, ellipse(sx + Math.sin(f * 6 + k) * .8, y + 4 - f * 4, .55 + f * .4, .55 + f * .4), '#F4FBFA', .4); c.globalAlpha = 1; }
    // the splash where the diver went in, feet last
    const g = Math.max(0, now - w.under) / 600; if (g < 1 && !reduced){ for (let k = 0; k < 6; k++){ const a = k / 6 * Math.PI; c.globalAlpha = 1 - g; c.fillStyle = '#F4FBFA'; c.beginPath(); c.arc(sx + 1.5 * (w.left ? -1 : 1) + Math.cos(a) * (1.5 + g * 2.5), y + 4.4 - Math.sin(a) * g * 3, .4, 0, TAU); c.fill(); } c.globalAlpha = 1; stroke(c, ellipse(sx, y + 4.6, 2 + g * 3, (2 + g * 3) * .4), '#F4FBFA', .5, null, null, 1 - g); }
    return;
  }
  // up again beside the canoe: a puff of breath, the catch held up, then back in
  const up = w.upAt && w.leg === 'spot' && !reduced ? (now - w.upAt) / 1900 : 9;
  if (up < 1){
    put(c, x, y, 1, w.left ? -1 : 1, rock, 'einbaumE', '<use href="#einbaumE"/>');
    const sx = x + (w.left ? -6.5 : 6.5), hy = y + 3.2, rise = Math.min(1, up * 4) * (up > .8 ? 1 - (up - .8) * 3 : 1);
    c.save(); c.beginPath(); c.rect(sx - 6, hy - 16, 12, 16); c.clip(); c.translate(sx, hy + 7 - rise * 2); if (w.left) c.scale(-1, 1); blit(c, 'fig|' + w.look + (w.old ? 'o' : ''), () => figureArt(w.look, w.old));
    // what was found: a giant clam with its wavy rim, or an octopus that curls round the body; held against the chest
    c.save(); c.translate(.5, 4.2);
    if (hsh(w.dives || 0, w.x | 0) < .4){
      const O = new Path2D('M2.6-13.6Q4.4-13.6 4.2-11.6Q4-10.4 2.6-10.4Q1.2-10.4 1-11.6Q.8-13.6 2.6-13.6Z'); c.fillStyle = '#B0607A'; c.fill(O); stroke(c, O, '#2B1D14', .35);
      const wv = reduced ? 0 : Math.sin(now / 160); stroke(c, new Path2D(`M1.6-10.6Q.6-9 ${1.4 + wv * .4}-8.2M2.6-10.4Q2.6-8.6 ${3.2 - wv * .4}-8M3.6-10.6Q4.8-9.2 ${4.6 + wv * .4}-8.6`), '#B0607A', .45, null, 'round');
      c.fillStyle = '#2B1D14'; c.beginPath(); c.arc(2.1, -12, .2, 0, TAU); c.arc(3.1, -12, .2, 0, TAU); c.fill();
    } else {
      const C = new Path2D('M.2-10.2Q.6-12.6 2.6-13Q4.6-12.6 5-10.2Q2.6-9.4.2-10.2Z'); c.fillStyle = '#E4DCC4'; c.fill(C); stroke(c, C, '#2B1D14', .4);
      const R = new Path2D('M1.4-10.1L2-12.4M2.6-9.9V-12.9M3.8-10.1L3.2-12.4'); stroke(c, R, '#8C8470', .3);
    }
    c.restore(); c.restore();
    stroke(c, ellipse(sx, hy, 3.6, 1.3), '#F4FBFA', .5, [.5, .8], 'round', .8);
    if (up < .35) for (let k = 0; k < 4; k++){ const q = up / .35; c.globalAlpha = 1 - q; c.fillStyle = '#F4FBFA'; c.beginPath(); c.arc(sx - 1 + k * .7, hy - 5 - q * 4 - k * .5, .35, 0, TAU); c.fill(); c.globalAlpha = 1; }
    return;
  }
  // on the reef flat: the canoe lies in the shallows, both wade and gather
  if (w.glean){
    put(c, x, y, 1, w.left ? -1 : 1, 0, 'einbaumE', '<use href="#einbaumE"/>');
    const figs = [[w.look, w.old, -7], ...(w.mate ? [[w.mate.look, w.mate.old, 7]] : [])];
    for (const [lk, od, dx] of figs){
      const sway = reduced ? 0 : Math.sin(now / 900 + dx) * 1.5; c.save(); c.translate(x + dx + sway, y + 2); if (dx < 0) c.scale(-1, 1);
      blit(c, 'fig|' + lk + (od ? 'o' : ''), () => figureArt(lk, od)); blit(c, 'load|muschel', LOADS.muschel);
      c.fillStyle = '#79C6B8'; c.fill(WADE); stroke(c, ellipse(0, -.2, 3.6, 1.1), '#F4ECD8', .55, null, null, .9);
      const f = ((now / 1000 + dx) * 1.3) % 1;
      if (dx > 0){ const pk = reduced ? 0 : Math.sin(now / 300 + dx); stroke(c, new Path2D(`M1.6-5.2L${4.6 + pk * .6} ${.8 + Math.max(0, pk) * .4}`), '#8C6440', .45, null, 'round'); if (pk > .8) stroke(c, ellipse(4.8, 1, 1.4, .5), '#F4FBFA', .35, null, null, .7); }   // the other probes under the stones with a stick
      else if (f < .5 && !reduced){ c.fillStyle = '#F4ECD8'; c.beginPath(); c.arc(3 + f * 3, -1.6 - Math.sin(f * 2 * Math.PI) * 2, .45, 0, TAU); c.fill(); }
      c.restore();
    }
    return;
  }
  const yy = y + (reduced ? 0 : Math.sin(now / 900 + w.x) * .3);
  // at night a torch of dry coconut leaves at the bow: the fish come to the light
  if (nightLevel() > .15 && w.job && w.job.type === 'fish'){ const tx = x + (w.left ? -5.4 : 5.4), fl = reduced ? 1 : 1 + Math.sin(now / 90 + w.x) * .15; stroke(c, new Path2D(`M${tx} ${yy}L${tx + (w.left ? -1.2 : 1.2)} ${yy - 6.4}`), '#5A3F22', .7, null, 'round'); c.save(); c.translate(tx + (w.left ? -1.3 : 1.3), yy - 6.4); c.scale(.55 * fl, .55 * fl); c.fillStyle = '#E0803A'; c.fill(FLAME); c.scale(.55, .6); c.fillStyle = '#F3D9A0'; c.fill(FLAME); c.restore(); }
  if (w.mate) drawDugout2(c, x, yy, w.left, rock, w.look, w.old, w.mate.look, w.mate.old, now, w.phase || 0, !w.fishing);
  else drawDugout(c, x, yy, w.left, rock, w.look, w.old, now, w.phase || 0, !w.fishing);
  if (!w.fishing || reduced) return;
  const cyc = Math.max(0, now - w.fishing) / 3600, n = (cyc % 1) * 3, ox = x + (w.left ? -6 : 6), net = hsh(Math.floor(cyc), (w.x | 0) + 7) < .45;   // the frame time can lie a moment before the start
  if (n <= 1 && net){
    // a round throw net: flung out, it opens in the air, falls flat and sinks
    const o = Math.min(1, n * 1.8), d = w.left ? -1 : 1, cx = x + d * (5 + o * 6), cy = y + 1 - Math.sin(o * Math.PI) * 5 + (n > .55 ? (n - .55) * 2 : 0), r = 1 + o * 4.4;
    c.save(); c.globalAlpha = n > .6 ? 1 - (n - .6) * 2.2 : 1; const N = new Path2D(); N.ellipse(cx, cy, r, r * .42, 0, 0, TAU);
    for (let k = 0; k < 6; k++){ const a = k / 6 * TAU; N.moveTo(cx, cy); N.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .42); }
    stroke(c, N, '#E9DCC0', .4); stroke(c, new Path2D(`M${x + d * 3} ${y - 4}Q${(x + cx) / 2} ${cy - 3} ${cx} ${cy}`), '#E9DCC0', .3); c.restore();
    if (n > .5 && n < .7) for (let k = 0; k < 5; k++){ c.fillStyle = '#F4FBFA'; c.beginPath(); c.arc(cx - r + k * r / 2, cy + .4, .35, 0, TAU); c.fill(); }
  }
  else if (n <= 1){ const r = 2 + n * 7; stroke(c, loopPath(ox, y + 1, r, r * .55, w.x | 0, .14, 11), '#F4ECD8', .7, [.6, .9], 'round', 1 - n * .7); }
  // now and then a fish comes up over the side, flapping, into the canoe
  else if (n > 1.4 && n < 2.2 && hsh(Math.floor(cyc), w.x | 0) < .6){
    const g = (n - 1.4) / .8, d = w.left ? -1 : 1, fx = x + d * (9 - g * 7), fy = y + 1 - Math.sin(g * Math.PI) * 6;
    c.save(); c.translate(fx, fy); c.rotate(d * (g * 2.4 - 1.2) + Math.sin(now / 60) * .25); c.fillStyle = '#9FB7C0'; c.beginPath(); c.ellipse(0, 0, 1.6, .6, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-1.4, 0); c.lineTo(-2.4, -.7); c.lineTo(-2.4, .7); c.closePath(); c.fill(); stroke(c, ellipse(0, 0, 1.6, .6), '#2B1D14', .3); c.restore();
    if (g < .25) for (let k = 0; k < 3; k++){ c.fillStyle = '#F4FBFA'; c.beginPath(); c.arc(x + d * (9 + k - 1), y + 1.4 - g * 6, .35, 0, TAU); c.fill(); }
  }
  // sea birds circle over the canoe, as they gather over a shoal: the old sign where the fish are
  for (let k = 0; k < 2; k++){ const a = now / 2600 * (k ? -1 : 1) + k * 2.6 + w.x; c.save(); c.translate(x + Math.cos(a) * 12, y - 18 + Math.sin(a) * 4 - k * 3); c.scale(.55, .55); stroke(c, Math.sin(now / 190 + k * 2) > -.2 ? BIRD1 : BIRD2, '#2B1D14', 1.4, null, 'round', .8); c.restore(); }
}
const WADE = ellipse(0, .3, 3, 1.3);
const glint = (x, y, r) => { const p = new Path2D(); p.moveTo(x - r, y); p.lineTo(x + r, y); p.moveTo(x, y - r * .7); p.lineTo(x, y + r * .7); return p; };
/* ---------- day and night: a day lasts six minutes. At dusk the light turns warm, the night is deep blue,
   and fires, torches and doorways shine. It can be switched off in the menu. */
const DAY_TICKS = 180;
let lastEconAt = 0;
function dayPhase(){ const f = lastEconAt ? clamp((performance.now() - lastEconAt) * gameSpeed / TICK, 0, 1) : 0; return ((tick + f + 30) % DAY_TICKS) / DAY_TICKS; }
const smooth01 = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
/* By day butterflies flutter over the flowers, the hibiscus and the gardens: each loops on its own path, the wings beat,
   now and then it rests a moment on a blossom */
const BUTTERFLY_KINDS = new Set(['blumen', 'hibiskus', 'garten', 'kurkumagarten', 'bananen']), BUTTERFLY_COL = ['#E8913A', '#F3D35A', '#F6F1E6', '#7FB6C8'];
function drawButterflies(c, v, now){
  const t = now / 1000;
  for (const I of islands){ if (!I.settled || !boxIn(I.box, v)) continue;
    for (const b of I.buildings){
      if (!BUTTERFLY_KINDS.has(b.kind) || b.bt || !ptIn(b.x, b.y, v)) continue;
      for (let k = 0; k < (b.kind === 'blumen' ? 2 : 1); k++){
        const sd = (b.id * 7 + k * 13) % 17, f = .35 + sd * .02, rest = Math.sin(t * .4 + sd) > .82;   // now and then it sits still
        const x = b.x + (rest ? 2 : Math.cos(t * f * 2.1 + sd) * 7 + Math.sin(t * f * 3.3) * 2), y = b.y - 4 + (rest ? -1 : Math.sin(t * f * 2.9 + sd) * 3.5 - 3 - Math.abs(Math.sin(t * 1.7 + sd)) * 2);
        const flap = rest ? .25 + .2 * Math.abs(Math.sin(t * 2 + sd)) : .2 + .8 * Math.abs(Math.sin(t * 17 + sd)), col = BUTTERFLY_COL[sd % BUTTERFLY_COL.length];
        c.save(); c.translate(x, y); c.rotate(Math.sin(t * f * 2.1 + sd) * .4); c.fillStyle = col; c.strokeStyle = '#2B1D14'; c.lineWidth = .22;
        for (const d of [-1, 1]){ c.save(); c.scale(d * flap, 1); c.beginPath(); c.ellipse(.75, -.35, .8, .55, -.5, 0, TAU); c.ellipse(.6, .45, .55, .4, .4, 0, TAU); c.fill(); c.stroke(); c.restore(); }
        c.fillStyle = '#2B1D14'; c.fillRect(-.12, -.7, .24, 1.4); c.restore();
      }
    } }
}
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
    for (const w of walkers) if (w.isl === I.id && w.boat && w.job && w.job.type === 'fish' && ptIn(w.x, w.y, grow(v, 40))) L.push({x:w.x + (w.left ? -5 : 5), y:w.y - 7, r:24 * fl(w.x | 0), c:'255,165,70'});   // torch fishing
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
/* ---------- a cyclone. Over the island the sky darkens, rain lashes slantwise in the wind, gusts and torn leaves race
   past and lightning flashes; on the water spray flies off the wave tops, the breakers pound the reef, the palms bend. */
const hsh = (i, k) => { const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return h - Math.floor(h); };
const stormSpot = () => { const I = cyclone && isl(cyclone.isl); return I ? {I, x:I.center.x, y:I.center.y, R:Math.max(I.box.x1 - I.box.x0, I.box.y1 - I.box.y0) * .5 + 420} : null; };
let bolt = null, boltNext = 0;
function drawStormSea(c, v, now){
  const k = cycloneLevel(), S = stormSpot(); if (k <= .01 || !S || !boxIn(S.I.box, grow(v, 400))) return;
  const W = wind(), t = now / 1000;
  // white tops on the waves, running with the wind
  if (!reduced) for (let i = 0; i < 70; i++){
    const a = hsh(i, 1) * TAU, d = Math.sqrt(hsh(i, 2)) * S.R, f = (t * .5 + hsh(i, 3)) % 1, x = S.x + Math.cos(a) * d + W.tx * f * 40, y = S.y + Math.sin(a) * d * .8 + W.ty * f * 40;
    if (!ptIn(x, y, v) || onIsland(S.I, {x, y})) continue;
    const p = new Path2D(); p.moveTo(x - 5, y); p.quadraticCurveTo(x, y - 3.2, x + 5, y + .4);
    stroke(c, p, '#F4FBFA', 1.4, null, 'round', k * .8 * Math.sin(f * Math.PI));
  }
  // the palms bend with the wind and whip back and forth
  const lean = clamp(W.tx, -1, 1) * .2 * k, list = S.I.buildings.filter(b => (b.kind === 'palme' || b.kind === 'pandanus') && ptIn(b.x, b.y, v)).sort((a, b) => a.y - b.y);
  for (const b of list){ const sw = reduced ? 0 : Math.sin(now / 240 + b.id * 1.7) * .08 * k + Math.sin(now / 610 + b.id) * .04 * k;
    c.save(); c.translate(b.x, b.y); c.rotate(lean + sw); c.translate(-b.x, -b.y); drawBuilding(c, b, S.I); c.restore(); }
}
function drawStorm(now){
  const k = cycloneLevel(), S = stormSpot(); if (k <= .01 || !S) return;
  const W = wind(), z = cam.z, C = {x:vw / 2 + (S.x - cam.x) * z, y:vh / 2 + (S.y - cam.y) * z}, R = S.R * z;
  if (C.x + R < 0 || C.x - R > vw || C.y + R < 0 || C.y - R > vh) return;
  const c = ctx; c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = c.createRadialGradient(C.x, C.y, R * .15, C.x, C.y, R); g.addColorStop(0, `rgba(16,24,32,${.55 * k})`); g.addColorStop(1, 'rgba(16,24,32,0)');
  c.fillStyle = g; c.fillRect(0, 0, vw, vh);
  // the clouds of the storm: heavy grey masses turning about the eye, the rain falls from under them
  { const t = now / 1000, spin = reduced ? 0 : t * .08;
    for (let i = 0; i < 14; i++){
      const a = hsh(i, 21) * TAU + spin * (1 + hsh(i, 22) * .3), d = (.25 + hsh(i, 23) * .7) * R, x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * .75 - R * .08, rr = R * (.22 + hsh(i, 24) * .18);
      const cg = c.createRadialGradient(x - rr * .2, y - rr * .3, rr * .1, x, y, rr); cg.addColorStop(0, `rgba(120,130,138,${.75 * k})`); cg.addColorStop(.7, `rgba(70,80,90,${.6 * k})`); cg.addColorStop(1, 'rgba(60,70,80,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
    } }
  const inside = (x, y) => { const d = Math.hypot(x - C.x, y - C.y) / R; return d < 1 ? 1 - d * d : 0; };
  if (!reduced){
    const t = now / 1000, L = 12 + 8 * Math.min(1, z), Wd = vw + 80, Hd = vh + 80;
    // rain, slanting with the wind
    c.beginPath();
    for (let i = 0, n = Math.round(340 * k); i < n; i++){
      const sp = 420 + hsh(i, 3) * 260, x = (((hsh(i, 1) * Wd + t * sp * W.tx * .8) % Wd) + Wd) % Wd - 40, y = ((hsh(i, 2) * Hd + t * sp) % Hd) - 40, a = inside(x, y);
      if (a > .05){ c.moveTo(x, y); c.lineTo(x + W.tx * L * .8, y + L); }
    }
    c.strokeStyle = '#DCE8EC'; c.lineWidth = 1; c.lineCap = 'round'; c.globalAlpha = .6 * k; c.stroke();
    // gusts: long pale wavy lines racing with the wind
    c.beginPath();
    for (let i = 0; i < 12; i++){
      const f = (t * (.3 + hsh(i, 5) * .25) + hsh(i, 6)) % 1, side = (hsh(i, 7) - .5) * 1.6 * R, len = 50 + hsh(i, 8) * 70;
      const x0 = C.x + W.tx * (f * 2 - 1) * R - W.ty * side, y0 = C.y + W.ty * (f * 2 - 1) * R + W.tx * side; if (inside(x0, y0) < .1) continue;
      const nx = -W.ty * 5, ny = W.tx * 5; c.moveTo(x0, y0); c.bezierCurveTo(x0 + W.tx * len * .33 + nx, y0 + W.ty * len * .33 + ny, x0 + W.tx * len * .66 - nx, y0 + W.ty * len * .66 - ny, x0 + W.tx * len, y0 + W.ty * len);
    }
    c.strokeStyle = '#EEF4F2'; c.lineWidth = 2; c.globalAlpha = .6 * k; c.stroke();
    // torn leaves tumbling past
    c.globalAlpha = k; c.lineWidth = .6; c.strokeStyle = '#2B1D14';
    for (let i = 0; i < 14; i++){
      const f = (t * (.22 + hsh(i, 9) * .2) + hsh(i, 10)) % 1, side = (hsh(i, 11) - .5) * 1.4 * R, x = C.x + W.tx * (f * 2 - 1) * R - W.ty * side, y = C.y + W.ty * (f * 2 - 1) * R + W.tx * side + Math.sin(t * 3 + i) * 6;
      if (inside(x, y) < .1) continue;
      c.save(); c.translate(x, y); c.rotate(t * (3 + hsh(i, 12) * 4) + i); c.fillStyle = i % 3 ? '#5E8A3A' : '#B9A456'; c.beginPath(); c.ellipse(0, 0, 3.4, 1.3, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
    }
    // lightning: now and then a bolt into the island and a flash over it all
    if (now > boltNext){ boltNext = now + 2600 + Math.random() * 4200; const bx = (Math.random() - .5) * .9, pts = []; let x = C.x + bx * R, y = C.y - R * .9; const ex = C.x + bx * R * .4, ey = C.y + (Math.random() - .3) * R * .3;
      for (let j = 0; j <= 7; j++){ pts.push([x, y]); x += (ex - x) / (8 - j) + (Math.random() - .5) * 22; y += (ey - y) / (8 - j); } pts.push([ex, ey]); bolt = {t:now, pts}; if (k > .6) sfx('thunder'); }
    const age = bolt ? now - bolt.t : 1e9;
    if (age < 260 && k > .3){
      const a = 1 - age / 260;
      c.globalAlpha = .3 * a * k; c.fillStyle = '#F4FBFF'; c.fillRect(0, 0, vw, vh);
      c.globalAlpha = a; c.beginPath(); bolt.pts.forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y));
      c.strokeStyle = 'rgba(200,225,255,.6)'; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.stroke();
    }
  }
  c.restore();
}
/* Now and then a whale surfaces in the open sea that the canoes have seen: its back, a spout, then the fluke as it dives */
let whale = null, nextWhale = 0;
function drawWhales(c, v, now){
  if (reduced) return;
  if (!whale && now > nextWhale){
    nextWhale = now + (seasonOf().id === 'passat' ? 7000 : 26000) + Math.random() * 14000;
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
/* Life in the open sea that the canoes have seen: a pod of dolphins leaping, a turtle paddling, flying fish skipping over
   the waves, and seabirds diving where the fishers of a village work. Each lives in its own patch of sea, so it stays
   where it is while the map moves; only what is in sight is drawn. */
const SEA_CELL = 260;
function drawSeaLife(c, v, now){
  const t = now / 1000, k = clamp(.9 / cam.z, 1, 2.2);
  const water = p => revealed(p) && islands.every(I => !boxIn(I.box, {x0:p.x - 24, y0:p.y - 24, x1:p.x + 24, y1:p.y + 24}));
  for (let cy = Math.floor(v.y0 / SEA_CELL); cy <= Math.floor(v.y1 / SEA_CELL); cy++) for (let cx = Math.floor(v.x0 / SEA_CELL); cx <= Math.floor(v.x1 / SEA_CELL); cx++){
    const h = hsh(cx * 7919 + cy, 41), kind = h < .18 ? 'dolphins' : h < .3 ? 'turtle' : h < .44 ? 'flyfish' : null; if (!kind) continue;
    const p = {x:(cx + .2 + hsh(cx, cy + 3) * .6) * SEA_CELL, y:(cy + .2 + hsh(cy, cx + 5) * .6) * SEA_CELL};
    if (!ptIn(p.x, p.y, v) || !water(p)) continue;
    if (kind === 'dolphins'){
      // three dolphins leap in turn, the pod moving slowly along
      const dir = hsh(cx, cy) < .5 ? -1 : 1, drift = ((t * 4 + h * 400) % 120) - 60;
      for (let i = 0; i < 3; i++){
        const T = (t + i * .9 + h * 9) % 5.2; if (T > 1.3) continue;
        const f = T / 1.3, x = p.x + dir * (drift + i * 9 + f * 16) , y = p.y + i * 5 - Math.sin(f * Math.PI) * 6;
        put(c, x, y, k * .9, dir, (f - .5) * 1.1 * dir, 'dolphin', '<use href="#dolphin"/>');
        if (f > .85 || f < .1) stroke(c, ellipse(x, y + 3, 3.4 * k, 1.1 * k), '#F4FBFA', .7, [.5, .8], 'round', .8);
      }
    } else if (kind === 'turtle'){
      const a = t * .05 + h * 20, x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 22, up = Math.sin(t * .4 + h * 30) > -.2;
      if (up){ c.save(); c.globalAlpha = .9; put(c, x, y, k * .9, Math.cos(a + Math.PI / 2) < 0 ? -1 : 1, 0, 'turtle', '<use href="#turtle"/>'); c.restore(); }
    } else {
      // flying fish: a little shoal skims off the water in flat arcs, then is gone
      const T = (t + h * 13) % 7; if (T > 1.6) continue;
      const dir = hsh(cy, cx) < .5 ? -1 : 1, P = new Path2D();
      for (let i = 0; i < 5; i++){ const f = clamp(T / 1.6 - i * .06, 0, 1); if (!f || f >= 1) continue; const x = p.x + dir * (f * 60 + i * 4), y = p.y + i * 3 - Math.sin(f * Math.PI) * 5; P.moveTo(x - 2.4 * dir, y); P.lineTo(x + 2.4 * dir, y - .4); }
      stroke(c, P, '#E8F2F4', 1.6, null, 'round', .9);
    }
  }
  // seabirds over the fishing grounds of the villages: they circle and dive where the fish are
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, grow(v, 80))) continue;
    for (const b of I.buildings){
      if (b.kind !== 'fisch' || b.bt) continue;
      const w = waterNear(I, b), gx = w.x + (w.x - b.x) * 1.6, gy = w.y + (w.y - b.y) * 1.6 + 10; if (!ptIn(gx, gy, v)) continue;
      for (let i = 0; i < 4; i++){
        const a = t * (.7 + i * .13) + i * 1.7 + b.id, dive = (t + i * 1.3 + b.id) % 6 < .5, x = gx + Math.cos(a) * 14, y = gy + Math.sin(a) * 6 - (dive ? 0 : 10);
        c.save(); c.translate(x, y); c.scale(.75, .75); stroke(c, Math.sin(t * 4.4 + i * 3) > -.3 ? BIRD1 : BIRD2, '#2B1D14', 1.3, null, 'round', .85); c.restore();
        if (dive) stroke(c, ellipse(x, y + 2, 2.4, .8), '#F4FBFA', .7, null, 'round', .8);
      }
    }
  }
}
/* Clouds of the trade winds, drawn like everything else: an ink outline, flat colour, a shaded underside and a few
   strokes inside. Each one grows, stands a while and dissolves again (out there in tens of minutes, here in a minute or
   two); while it dissolves its outline breaks up. It drifts with the wind, its shadow lies on the sea and the land below.
   A big cloud rains while it is mature: rows of short strokes slant with the wind, rings spread on the water. In the
   storm season there are more of them, greyer and wetter, in the lean season only a few. */
const CLOUD_T = 900;
let cloudX = 0, cloudY = 0, cloudAt = 0;
const cloudArt = new Map();
/* the outline of a cumulus 100 wide: a flat base, round billows over the top, bigger towards the middle, the one in the
   middle towering; a few strokes inside where billows overlap */
function cloudShape(seed){
  const key = seed % 24; if (cloudArt.has(key)) return cloudArt.get(key);
  const r = rng(seed * 7919 + 17), n = 5 + Math.floor(r() * 2), x0 = -50, x1 = 50, step = (x1 - x0) / n, P = new Path2D(), inner = new Path2D(), base = new Path2D();
  P.moveTo(x0, 0);
  for (let i = 1; i <= 5; i++) P.lineTo(x0 + (x1 - x0) * i / 5, (r() - .5) * 1.2);
  const top = Math.floor(n / 2) - (r() < .5 ? 0 : 1);
  let x = x1, y = 0;
  for (let i = 0; i < n; i++){
    const xn = x - step, mid = (x + xn) / 2, hump = 1 - Math.abs(mid) / 55, yn = i === n - 1 ? 0 : -(3 + hump * 11 + r() * 3);
    const b = step * (.5 + .45 * hump) * (n - 1 - i === top ? 1.2 : 1) * (.9 + r() * .2);
    P.bezierCurveTo(x - step * .02, y - b * 1.35, xn + step * .02, yn - b * 1.35, xn, yn);
    if (i > 0 && i < n - 1 && r() < .75){ const cx = xn + step * .15, cy = yn - b * .25; inner.moveTo(cx - 4, cy + 3); inner.quadraticCurveTo(cx - 1, cy - 2, cx + 4, cy - 1); }
    x = xn; y = yn;
  }
  P.closePath();
  base.moveTo(x0 + 8, -4); base.quadraticCurveTo(0, -1.5, x1 - 8, -4);
  const o = {P, inner, base}; cloudArt.set(key, o); return o;
}
const smooth01c = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
function drawWeather(c, v, now){
  const W = wind(), dt = Math.min(100, now - (cloudAt || now)); cloudAt = now; cloudX += W.tx * (4 + 10 * W.str) * dt / 1000; cloudY += W.ty * (4 + 10 * W.str) * dt / 1000;
  const S = seasonOf().id, wetness = S === 'sturm' ? .85 : S === 'mager' ? .12 : .4, per = S === 'sturm' ? 4 : S === 'mager' ? 1 : 2, t = now / 1000, far = lod === 'far', sh = sunShadow();
  const ox = (cloudX % CLOUD_T + CLOUD_T) % CLOUD_T, oy = (cloudY % CLOUD_T + CLOUD_T) % CLOUD_T, night = opts.night ? nightLevel() : 0;
  for (let ty = Math.floor((v.y0 - 250) / CLOUD_T); ty <= Math.floor((v.y1 + 250) / CLOUD_T); ty++) for (let tx = Math.floor((v.x0 - 250) / CLOUD_T); tx <= Math.floor((v.x1 + 250) / CLOUD_T); tx++){
    for (let k = 0; k < per; k++){
      // every cloud lives through its own generations: a new one rises where the last dissolved
      const h0 = hsh(tx * 31 + ty * 17, k * 13 + 1), life = 70 + h0 * 90, age = (t + hsh(tx, ty * 7 + k) * life) / life, gen = Math.floor(age), ph = age - gen;
      const r1 = hsh(tx * 13 + gen * 7.3, ty * 11 + k), r2 = hsh(ty * 19 + gen * 3.1, tx * 5 + k * 3), r3 = hsh(gen + k * 17.7, tx + ty * 3);
      const R = 46 + r3 * 74, x = tx * CLOUD_T + ((r1 * CLOUD_T + ox) % CLOUD_T), y = ty * CLOUD_T + ((r2 * CLOUD_T + oy) % CLOUD_T);
      if (x + R * 2 < v.x0 || x - R * 2 > v.x1 || y + R < v.y0 || y - R * 2 > v.y1) continue;
      const grow = ph < .22 ? smooth01c(ph / .22) : ph > .72 ? smooth01c(1 - (ph - .72) / .28) : 1, wet = R > 78 && hsh(gen * 2.3, k + tx) < wetness;
      const rain = wet ? clamp((ph - .3) / .08, 0, 1) * clamp((.74 - ph) / .1, 0, 1) : 0, shape = cloudShape(Math.floor(r3 * 997) + gen * 31 + k);
      const sc = R / 50 * (.55 + .45 * grow + (ph > .72 ? (ph - .72) * .4 : 0)), lift = R * .8, cx = x - sh.c * 8 - W.tx * 4, cy = y - lift;
      // its shadow below: the same shape, flat and dark, like every shadow in the game
      c.globalAlpha = (wet ? .13 : .08) * grow * (1 - night * .7); c.fillStyle = '#1F140D'; c.fill(loopPath(x, y, R * .95 * (.6 + .4 * grow), R * .3 * (.6 + .4 * grow), gen + k, .1, 15)); c.globalAlpha = 1;
      if (far) continue;
      if (rain > .01){
        // rain: rows of short strokes from the base of the cloud down to its shadow, slanting with the wind
        const p = new Path2D(), fall = (t * 1.3) % 1, n = Math.round(14 + R * .14), sl = W.tx * 3;
        for (let i = 0; i < n; i++){ const qx = cx + ((i * .618) % 1 - .5) * R * 1.5, f = (fall + i * .37) % 1, qy = cy + 3 + f * (lift - 6);
          p.moveTo(qx + sl * f * 2, qy); p.lineTo(qx + sl * f * 2 + sl, qy + 5); }
        c.save(); c.globalAlpha = .45 * rain * (1 - night * .4); c.strokeStyle = '#2B1D14'; c.lineWidth = .6; c.lineCap = 'round'; c.setLineDash([]); c.stroke(p); c.restore();
        if (lod === 'near') for (let i = 0; i < 5; i++){ const f2 = (t * .8 + i / 5) % 1, rx = x + ((i * .73) % 1 - .5) * R * 1.2 + W.tx * 6, ry = y + ((i * .41) % 1 - .5) * R * .3;
          c.globalAlpha = (1 - f2) * .6 * rain; c.strokeStyle = '#F4ECD8'; c.lineWidth = .5; c.beginPath(); c.ellipse(rx, ry, .6 + f2 * 3, (.6 + f2 * 3) * .4, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; }
      }
      // the cloud: cream or grey, a shaded underside, the ink line that breaks up while it dissolves
      const a = (wet ? .9 : .84) * grow * (1 - night * .45), gone = ph > .72 ? (ph - .72) / .28 : 0;
      c.save(); c.translate(cx, cy); c.scale(sc, sc); c.globalAlpha = a;
      c.fillStyle = wet ? '#D3D4CC' : '#F7F1E3'; c.fill(shape.P);
      c.save(); c.clip(shape.P); c.fillStyle = wet ? '#A9AEA9' : '#DCDCD0'; c.fillRect(-60, -9, 120, 12); c.restore();
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#2B1D14'; c.lineWidth = 1.1 / sc;
      if (gone > 0) c.setLineDash([(8 - gone * 6) / sc * 2, (1 + gone * 9) / sc * 2]); else c.setLineDash([]);
      c.stroke(shape.P); c.setLineDash([]); c.globalAlpha = a * .6; c.lineWidth = .8 / sc; c.stroke(shape.inner); c.globalAlpha = a * .35; c.stroke(shape.base);
      c.restore();
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
      const ferry = figureLook(j.id * 13 + 7);   // the ferryman of this jetty
      if (!goals.length){ drawDugout(c, A.x, A.y, false, 0, ferry, false, now, j.id, false); return; }
      // each crossing swings out in a bow, as far as the water allows
      const legs = goals.map((B, i) => { const d = Math.hypot(B.x - A.x, B.y - A.y), nx = -(B.y - A.y) / (d || 1), ny = (B.x - A.x) / (d || 1); let k = Math.min(14, d * .2) * ((j.id + i) % 2 ? 1 : -1); if (landAt(I, {x:(A.x + B.x) / 2 + nx * k, y:(A.y + B.y) / 2 + ny * k})) k = 0; return {B, d, nx, ny, k}; });
      const SPEED = 11, per = l => l.d / SPEED * 2000 + 2600, cyc = legs.reduce((t, l) => t + per(l), 0);
      let t = reduced ? 0 : (now + j.id * 977) % cyc, l = legs[0];
      for (const q of legs){ if (t < per(q)){ l = q; break; } t -= per(q); }
      // out, a pause there, back, a pause at the jetty
      const go = l.d / SPEED * 1000, f = t < go ? t / go : t < go + 1300 ? 1 : t < 2 * go + 1300 ? 1 - (t - go - 1300) / go : 0, bow = l.k * Math.sin(f * Math.PI);
      const x = A.x + (l.B.x - A.x) * f + l.nx * bow, y = A.y + (l.B.y - A.y) * f + l.ny * bow, left = (t < go + 1300) === (l.B.x < A.x);
      drawDugout(c, x, y, left, reduced ? 0 : Math.sin(now / 760 + j.id) * .05, ferry, false, now, j.id, f > 0 && f < 1);
    });
  }
}
const SWAY_AMP = {palme:.07, pandanus:.06, baum:.035, hibiskus:.05};
/* grass, ferns, reeds and flowers bend in the wind, the grass most */
function drawSwayDeco(c, v, now){
  for (const I of islands){
    if (!seen(I) || !boxIn(I.box, grow(v, 20))) continue;
    for (const d of I.deco){
      if (!SWAY_DECO.has(d.t) || !ptIn(d.x, d.y, v)) continue;
      if (d.s && I.buildings.some(b => { const r = KINDS[b.kind].r; return Math.abs(b.x - d.x) < r + 3 && Math.abs(b.y - d.y) < r * .7 + 3; })) continue;
      const k = swayK(d.x, d.y, d.t === 'tuft' || d.t === 'reed' ? .16 : .09, now);
      c.save(); c.translate(d.x, d.y); c.transform(1, 0, -k, 1, 0, 0); if (d.rot) c.rotate(d.rot * Math.PI / 180); blit(c, d.t, `<use href="#${d.t}"/>`); c.restore();
    }
  }
}
const FLAT = new Set(['taro', 'platz', 'tanzplatz', 'pulaka', 'garten', 'kurkumagarten', 'kavagarten', 'brunnen', 'quelle']);
/* Figures bob and sway a little while they walk. Loads over the shoulder go behind the body, loads on the head in front. */
function drawPeople(c, v, now){
  const vis = [...walkers, ...critters].filter(w => !w.asleep && ptIn(w.x, w.y, v)), items = vis.map(w => [w.y, w]), near = new Map(), mk = markUntil > now ? markW : null;
  // close up, palms and trees sway: they are drawn here, and whatever stands in front of them is drawn again over them
  const sway = new Set(), sw = swayOn() && baseL.at && baseL.at.sw, swT = sw && baseL.at.swT, vv = grow(v, 30);
  if (sw){
    drawSwayDeco(c, v, now);
    for (const I of islands){
      if (!seen(I) || !boxIn(I.box, vv)) continue;
      const storm = cycloneOver(I), front = I.buildings.filter(b => !FLAT.has(b.kind) && !SWAY_KINDS.has(b.kind) && ptIn(b.x, b.y, grow(v, 60))), mine = [];
      if (I.discovered) for (const b of I.buildings) if (SWAY_KINDS.has(b.kind) && ptIn(b.x, b.y, vv) && !(storm && (b.kind === 'palme' || b.kind === 'pandanus'))){ near.set(b, I); sway.add(b); mine.push(b); }
      if (swT) for (const t of I.trees) if (t.st !== 1 && ptIn(t.x, t.y, vv)){ near.set(t, null); sway.add(t); mine.push(t); }
      for (const q of mine){
        for (const b of front) if (!near.has(b) && b.y > q.y && b.y - q.y < KINDS[b.kind].hy * ((b.v && b.v.scale) || 1) + 26 && Math.abs(b.x - q.x) < KINDS[b.kind].r + 12) near.set(b, I);
        if (!swT) for (const t of I.trees) if (t.st !== 1 && !near.has(t) && t.y > q.y && t.y - q.y < 24 && Math.abs(t.x - q.x) < 10) near.set(t, null);
      }
    }
  }
  // buildings standing in front of someone are drawn again over them, so people can walk behind a house
  for (const w of vis){
    const I = isl(w.isl);
    for (const b of I.buildings){
      const K = KINDS[b.kind]; if (FLAT.has(b.kind) || near.has(b)) continue;
      if (b.y > w.y && b.y - w.y < K.hy * ((b.v && b.v.scale) || 1) + 14 && Math.abs(b.x - w.x) < K.r + 6) near.set(b, I);
    }
    for (const t of I.trees) if (t.st !== 1 && !near.has(t) && t.y > w.y && t.y - w.y < 24 && Math.abs(t.x - w.x) < 9) near.set(t, null);
  }
  for (const b of near.keys()) items.push([b.y, b]);
  items.sort((a, b) => a[0] - b[0]);
  const sh = sunShadow();
  if (sh.alpha > 0) for (const w of vis){
    if (w.ride || w.boat || w.lie || (w.paddle || w.swim) && !landAt(isl(w.isl), w)) continue;
    c.save(); c.translate(w.x, w.y); c.transform(1, 0, sh.c, sh.d, 0, 0); if (w.left) c.scale(-1, 1);
    if (w.home) blitShadow(c, 'cr|' + w.kind, `<use href="#${w.kind}"/>`, sh.alpha);
    else { if (w.child) c.scale(.7, .7); if (w.sit && (!w.moving || w.busy)) c.scale(1, .78); blitShadow(c, 'fig|' + w.look + (w.old ? 'o' : ''), () => figureArt(w.look, w.old), sh.alpha); }
    c.restore();
  }
  for (const [, w] of items){
    if (w.home){ drawCritter(c, w); continue; }
    if (w.kind || w.st != null){
      const k = sway.has(w) ? swayK(w.x, w.y, w.kind ? SWAY_AMP[w.kind] : .03, now) : 0;
      if (k){ c.save(); c.translate(w.x, w.y); c.transform(1, 0, -k, 1, 0, 0); c.translate(-w.x, -w.y); }
      if (w.kind) drawBuilding(c, w, near.get(w)); else drawTree(c, w);
      if (k) c.restore(); continue;
    }
    if (w.ride) continue;   // in the canoe of the other fisher
    // across the lagoon they paddle a dugout
    if (w.boat || (w.paddle && !landAt(isl(w.isl), w))){ drawBoatFig(c, w, now); continue; }
    if (w.swim && swimming(isl(w.isl), w, now)){ drawSwimmer(c, w, now); continue; }
    // a nap in the shade: lying on a mat, breathing slowly
    if (w.lie && !w.moving){
      c.save(); c.translate(w.x, w.y); if (w.left) c.scale(-1, 1); c.fillStyle = '#DCC48C'; c.fill(MAT_L); stroke(c, MAT_L, '#2B1D14', .35);
      if (w.child) c.scale(.7, .7);
      c.save(); c.translate(4.6, -1.3); c.rotate(-Math.PI / 2); c.scale(.8, 1 + (reduced ? 0 : Math.sin(now / 1100 + w.phase) * .025)); figOf(c, w); c.restore();
      if (!reduced){ const q = ((now / 2600) + w.x * .1) % 1; c.globalAlpha = (1 - q) * .8; c.fillStyle = '#2B1D14'; c.font = `800 ${2.2 + q * 1.4}px "Alegreya Sans", sans-serif`; c.fillText('z', -4.6 + q * 2, -3 - q * 6); c.globalAlpha = 1; }
      c.restore(); continue;
    }
    const up = CLIMB_FX.has(w.fx) && w.busy && Math.hypot(w.x - w.busy.x, w.y - w.busy.y) < 3 ? climbH(w) : 0;
    const bob = w.moving && !reduced && !up ? -Math.abs(Math.sin(w.phase)) * (w.child ? 1 : .7) : 0, rot = w.moving && !reduced && !up ? Math.sin(w.phase) * .05 : 0;
    // up at the crown a nut drops now and then
    if (up > 12 && !reduced){ const f = (now / 900 + w.x) % 1; c.fillStyle = '#7A5434'; c.beginPath(); c.arc(w.x + 3, w.y - up - 2 + f * (up + 1), .9, 0, TAU); c.fill(); }
    c.save(); c.translate(w.x, w.y + bob - up); if (rot) c.rotate(rot); if (w.left) c.scale(-1, 1);
    // someone sitting on a mat in front of a house; children are smaller
    if (w.sit && (!w.moving || w.busy)){ c.fillStyle = '#DCC48C'; c.fill(MAT); stroke(c, MAT, '#2B1D14', .35); c.scale(1, .78); }
    if (w.child) c.scale(.7, .7);
    // a load: on the head or the shoulder, or two baskets on a carrying pole; builders drag a log behind them
    const drag = w.carry === 'holz' && w.pole && w.job && BUILD_JOBS.has(w.job.type), pole = !drag && w.pole && POLE_LOADS.has(w.carry);
    if (drag) dragLog(c, w, now); else if (w.carry && LOAD_BACK.has(w.carry)) blit(c, 'load|' + w.carry, LOADS[w.carry]);
    if (w.play && w.play.k === 'surf'){ c.save(); c.translate(2.4, -4.4); c.rotate(-1.25); c.fillStyle = '#C9A36A'; c.fill(BOARD_S); stroke(c, BOARD_S, '#2B1D14', .4); c.restore(); }   // the board under the arm
    const at = w.busy && Math.hypot(w.x - w.busy.x, w.y - w.busy.y) < 3, show = (at || w.dance || w.hop || w.cheer) && w.fx && w.fx[0] !== '~';
    w._sq = 0; const ln = show && LEAN[w.fx] ? LEAN[w.fx](reduced ? .35 : now / 1000 + (w.x % 7), w, now) : 0; w._ln = ln;
    if (ln){ c.save(); c.rotate(ln); if (w._sq) c.scale(1, w._sq); }
    blit(c, 'fig|' + w.look + (w.old ? 'o' : ''), () => figureArt(w.look, w.old));
    const tool = w.old ? 'stab' : !w.carry && w.job && !(at && NOTOOL.has(w.fx)) && w.job.tool;
    // at work the adze and the digging stick swing
    if (tool){ const sw = at && !reduced && SWING.has(w.fx) ? workBeat(w, now).sw * .4 : 0; if (sw){ c.save(); c.translate(1.3, -4.2); c.rotate(sw); c.translate(-1.3, 4.2); } blit(c, 'tool|' + tool, TOOLS[tool]); if (sw) c.restore(); }
    if (ln) c.restore();
    if (show) workFx(c, w, now);
    if (pole) poleLoads(c, w); else if (w.carry && !LOAD_BACK.has(w.carry) && !drag) blit(c, 'load|' + w.carry, LOADS[w.carry]);
    if (w.busy && w.job && w.job.type === 'wade'){ c.fillStyle = '#79C6B8'; c.fill(WADE); stroke(c, ellipse(0, -.2, 3.6, 1.1), '#F4ECD8', .55, null, null, .9); }
    // who works at the selected place, or the one you tapped: a small mark over the head
    if (w === mk || (w.job && w.job.b.id === selectedId)){ c.fillStyle = w === mk ? '#D9A441' : '#F4ECD8'; c.fill(MARK); stroke(c, MARK, '#2B1D14', .55, null, 'round'); }
    c.restore();
  }
}
/* ---------- in the water for fun. Swimmers show head and shoulders and leave rings, and now and then duck under;
   children jump in from the beach. Surfers paddle out lying on the board, sit up and wait for the wave, and ride it in
   standing, knees bent, the white water curling behind them. */
const BOARD = ellipse(0, 0, 5.4, 1.15), BOARD_S = ellipse(0, 0, 3.8, .95);
const figOf = (c, w) => blit(c, 'fig|' + w.look + (w.old ? 'o' : ''), () => figureArt(w.look, w.old));
const swimming = (I, w, now) => w.swim && (!landAt(I, w) || jumpF(w, now) < 1);
const jumpF = (w, now) => { const P = w.play; return P && P.k === 'swim' && P.ph === 'in' && P.jump ? (now - P.at) / 760 : 9; };
function drawSwimmer(c, w, now){
  const P = w.play || {}, t = reduced ? 0 : now, dir = w.left ? -1 : 1, s = w.child ? .72 : 1, ph = (w.phase || 0) + w.x;
  const ring = (x, y, r, a) => stroke(c, ellipse(x, y, r, r * .42), '#F4FBFA', .45, [.5, .8], 'round', a);
  const drop = (x, y, r, a = 1) => { c.globalAlpha = a; c.fillStyle = '#F4FBFA'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; };
  c.save(); c.translate(w.x, w.y);
  if (P.k === 'surf'){
    c.scale(dir, 1);
    const left = Math.hypot(w.tx - w.x, w.ty - w.y);
    if (P.ph === 'ride' && P.fall && left < 7){
      // a wipe-out: the wave takes the rider, the board flies up, a burst of white water
      const g = clamp(1 - left / 7, 0, 1);
      c.save(); c.scale(s, s); c.save(); c.translate(3, -1 - g * 2); c.rotate(-.8 - g * .6); c.fillStyle = '#C9A36A'; c.fill(BOARD_S); stroke(c, BOARD_S, '#2B1D14', .4); c.restore();
      c.save(); c.beginPath(); c.rect(-12, -14, 24, 14.4); c.clip(); c.translate(2.4, 1 + g * 2.2); c.rotate(-1 - g * .45); figOf(c, w); c.restore();   // thrown backwards into the white water
      for (let k = 0; k < 6; k++){ const a = k / 6 * Math.PI, r = 2 + g * 3; drop(Math.cos(a) * r, -Math.sin(a) * r * .8, .45, 1 - g * .6); }
      ring(0, .6, 3 + g * 3, .8); c.restore(); c.restore(); return;
    }
    if (P.ph === 'ride'){
      // the wave behind the rider, a curl of white; spray off the tail of the board
      const g = ((now - (P.at || now)) / 1000) % 1, lean = reduced ? 0 : Math.sin(t / 240 + ph) * .07;
      const wave = new Path2D(); wave.moveTo(-15, 2.6); wave.quadraticCurveTo(-8, -1.4, -2, 1.2); wave.quadraticCurveTo(1, 2.4, 3, 1.8);
      stroke(c, wave, '#2F5F73', 2.4, null, 'round', .35); stroke(c, wave, '#F4FBFA', 1.1, null, 'round', .95);
      stroke(c, ellipse(-9, 2.2, 6, 1.2), '#F4FBFA', .5, [.4, .9], 'round', .7);
      if (!reduced) for (let k = 0; k < 4; k++){ const q = (g + k / 4) % 1; drop(-4.5 - q * 5, -.6 - Math.sin(q * Math.PI) * 2.4, .38 * (1 - q) + .1, 1 - q); }
      c.save(); c.scale(s, s); c.fillStyle = '#C9A36A'; c.fill(BOARD); stroke(c, BOARD, '#2B1D14', .45);
      c.translate(0, -.3); c.rotate(lean); c.scale(1, .9); figOf(c, w);
      c.restore();
    } else if (P.ph === 'sit'){
      // astride the board, bobbing on the swell, looking out for the next wave
      const bob = reduced ? 0 : Math.sin(t / 700 + ph) * .5;
      c.translate(0, bob); ring(0, .6, 5.6 * s, .6);
      seatedFig(c, w.look, w.old, 0, -.2, s);
      c.save(); c.scale(s, s); c.fillStyle = '#C9A36A'; c.fill(BOARD); stroke(c, BOARD, '#2B1D14', .45); c.restore();
    } else {
      // lying on the board, arms paddling in turn
      c.save(); c.scale(s, s); c.fillStyle = '#C9A36A'; c.fill(BOARD); stroke(c, BOARD, '#2B1D14', .45);
      c.save(); c.translate(-4.4, -.9); c.rotate(Math.PI / 2); c.scale(.8, .95); figOf(c, w); c.restore();
      const a = reduced ? 0 : Math.sin(t / 260 + ph);
      for (const side of [-1, 1]){ const k = side * a; if (k > .4) drop(2.4 + k * 1.5, side * 1.5 + .4, .45, .9); }
      ring(-5.6, .2, 2.2, .6);
      c.restore();
    }
    c.restore(); return;
  }
  // the jump from the beach: up, over, and in with a splash
  const jf = jumpF(w, now);
  if (jf < 1){
    const up = Math.sin(jf * Math.PI) * 6; c.save(); c.translate(0, -up); c.rotate(dir * jf * 1.1); c.scale(s, s); figOf(c, w); c.restore();
    if (jf > .82) for (let k = 0; k < 5; k++){ const a = k / 5 * Math.PI; drop(Math.cos(a) * 3, -Math.sin(a) * 2.6 * (jf - .8) * 5, .4); }
    c.restore(); return;
  }
  const duck = P.duck && now > P.duck && now < P.duck + 1300;
  if (P.float && !w.moving && !duck){
    // floating on the back, the face to the sky, the toes out of the water
    const bob = reduced ? 0 : Math.sin(t / 800 + ph) * .3;
    c.save(); c.translate(0, bob); c.save(); c.beginPath(); c.rect(-9, -4, 18, 4.4); c.clip(); c.translate(4.4, -.2); c.rotate(-Math.PI / 2); c.scale(s * .9, s); figOf(c, w); c.restore();
    ring(0, .3, 5 * s, .6); c.restore(); c.restore(); return;
  }
  if (duck){
    // under water: only rings and rising bubbles
    if (!reduced) for (let k = 0; k < 3; k++){ const q = ((now - P.duck) / 600 + k / 3) % 1; stroke(c, ellipse(Math.sin(q * 5 + k), -q * 2, .4 + q * .3, .4 + q * .3), '#F4FBFA', .35, null, null, 1 - q); }
    ring(0, .3, 3, .7);
  } else {
    // head and shoulders over the water, the arms reach forward in turn
    c.save(); c.beginPath(); c.rect(-6, -14, 12, 14); c.clip(); c.translate(0, 6.4 * s); c.scale(s * dir, s); figOf(c, w); c.restore();
    const a = reduced ? 0 : Math.sin(t / 330 + ph), moving = w.moving;
    if (moving && a > .6) drop(dir * 4.6, -.2, .45, .9);   // no arms: only the splash of each stroke
    ring(0, .2, 3.4 * s + (reduced ? 0 : (t / 900 + ph) % 1 * 1.4), .75);
    if (moving) stroke(c, ellipse(-dir * 4.5, .3, 2.4, .6), '#F4FBFA', .4, [.4, .7], 'round', .55);   // the wake
  }
  c.restore();
}
/* ---------- a tree comes down: slowly at first, then fast, away from the people at work; it strikes the ground in a
   puff of dust, lies a moment and is gone (the wood is in the store by then) */
let falls = [];
function falling(x, y, what, by){
  if (reduced || awayQuiet || !what.isl || !isl(what.isl)) return;
  falls.push({x, y, ...what, dir:by && by.x > x ? -1 : 1, t0:performance.now()}); if (falls.length > 10) falls.shift(); requestDraw();
  if (cam.z > PEOPLE_Z && ptIn(x, y, view(20))) sfx('fall');
}
function drawFalls(c, v, now){
  falls = falls.filter(f => now - f.t0 < 2300);
  for (const f of falls){
    if (!ptIn(f.x, f.y, grow(v, 40))) continue;
    const g = (now - f.t0) / 950, a = f.dir * 1.48 * (g >= 1 ? 1 : g * g), al = now - f.t0 > 1800 ? 1 - (now - f.t0 - 1800) / 500 : 1;
    c.save(); c.globalAlpha = al; c.translate(f.x, f.y); c.rotate(a); c.translate(-f.x, -f.y);
    if (f.palm) drawBuilding(c, f.palm, isl(f.isl)); else drawTree(c, f.tree);
    c.restore(); c.globalAlpha = 1;
    const hit = (now - f.t0 - 950) / 700, h = f.palm ? 26 : 18;
    if (hit > 0 && hit < 1) for (let k = 0; k < 6; k++){ const x = f.x + f.dir * (h * (.35 + k * .12)) , r = 1.6 + hit * 3; c.globalAlpha = (1 - hit) * .55; c.fillStyle = '#E6D6B0'; c.beginPath(); c.ellipse(x, f.y - hit * 3 - (k % 2) * 1.5, r, r * .6, 0, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  }
}
/* Carrying, two ways: baskets on the head, or two on a pole across the shoulder (as on the islands with heavy loads of taro
   and nuts); a builder drags a log behind on a rope, the dust rising where it scrapes */
const POLE_LOADS = new Set(['taro', 'frucht', 'nuss', 'eier', 'muschel', 'stein', 'obsidian']);
function poleLoads(c, w){
  stroke(c, new Path2D('M-5.2-7.9L5.2-7.3'), '#2B1D14', 1, null, 'round'); stroke(c, new Path2D('M-5.2-7.9L5.2-7.3'), '#9C7246', .5, null, 'round');
  for (const dx of [-4.4, 4.4]){ stroke(c, new Path2D(`M${dx}-7.6L${dx}-5.4`), '#6B4428', .3); c.save(); c.translate(dx, 4.36); c.scale(.8, .8); blit(c, 'load|' + w.carry, LOADS[w.carry]); c.restore(); }
}
function dragLog(c, w, now){
  stroke(c, new Path2D('M-1.2-4.4L-3.6-3.4'), '#B08048', .35);   // the rope
  stroke(c, new Path2D('M-3.6-3.4L-10.4-.2'), '#2B1D14', 1.9, null, 'round'); stroke(c, new Path2D('M-3.6-3.4L-10.4-.2'), '#9C7246', 1.2, null, 'round');
  if (w.moving && !reduced){ const q = (now / 500 + w.x) % 1; c.globalAlpha = (1 - q) * .45; c.fillStyle = '#E6D6B0'; c.beginPath(); c.ellipse(-11 - q * 2, -.4 - q, .8 + q, .5 + q * .5, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
}
/* What each kind of work looks like, small and in front of the worker, who faces right here */
const SWING = new Set(['dig', 'chop', 'build', 'carve', 'knap']);
/* One shared work rhythm, so tool, body and effects move together. A stroke: slow wind-up, fast strike, a short hold on impact,
   recover. m 'hit' = strokes (P ms, lean back / forward / resting lean); 'rub' = back and forth; 'nod' = small steady nod;
   'dip' = bend and rise. Each worker has their own timing; about one stroke in 8 is a pause (a stretch). */
const WORK = {dig:{m:'hit', P:760, bk:.1, fw:.22, bs:.12}, chop:{m:'hit', P:680, bk:.12, fw:.22, bs:.04}, build:{m:'hit', P:700, bk:.1, fw:.22, bs:.06},
  carve:{m:'hit', P:560, bk:.05, fw:.12, bs:.08}, plant:{m:'hit', P:900, bk:.05, fw:.24, bs:.1}, pound:{m:'hit', P:620, bk:.1, fw:.2, bs:.05},
  beat:{m:'hit', P:560, bk:.08, fw:.18, bs:.06}, tamp:{m:'hit', P:820, bk:.13, fw:.2, bs:.04}, knap:{m:'hit', P:460, bk:.04, fw:.14, bs:.1},
  wedge:{m:'hit', P:900, bk:.12, fw:.2, bs:.05}, paddle:{m:'hit', P:600, bk:.06, fw:.14, bs:.05},
  grind:{m:'rub', P:1500, am:.07, bs:.14}, file:{m:'rub', P:1300, am:.06, bs:.1}, polish:{m:'rub', P:1500, am:.05, bs:.1}, rub:{m:'rub', P:1700, am:.05, bs:.1},
  grate:{m:'rub', P:1100, am:.05, bs:.1}, paint:{m:'rub', P:1800, am:.04, bs:.08},
  weave:{m:'nod', P:1500, am:.035, bs:.06}, cord:{m:'nod', P:900, am:.04, bs:.08}, net:{m:'nod', P:1300, am:.03, bs:.06}, braid:{m:'nod', P:1100, am:.03, bs:.06},
  stamp:{m:'nod', P:900, am:.05, bs:.08}, thatch:{m:'nod', P:1000, am:.05, bs:-.05}, hang:{m:'nod', P:1200, am:.05, bs:-.04},
  scoop:{m:'dip', P:1500, am:.28, bs:.04}, water:{m:'dip', P:1700, am:.24, bs:.04}};
const hash01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
/* the swing of one stroke, -1 (wound back) .. 1 (struck), impact at p = .56 */
function swing01(p){
  if (p < .45) return -smooth01(p / .45);
  if (p < .56){ const q = (p - .45) / .11; return -1 + 2 * q * q; }
  if (p < .66) return 1;
  return 1 - smooth01((p - .66) / .34);
}
/* where a worker is in the rhythm now; cached for the frame. n stroke count, p 0..1 in the stroke, pause, sw swing -1..1,
   age ms since the last impact (nn its stroke, pz = that one was a pause), r rub -1..1, sq body squash, ls lean */
function workBeat(w, now){
  if (w._bn === now && w._bf === w.fx) return w._bt;
  const D = WORK[w.fx] || WORK.dig, off = (w.phase || 0) * 137 + (w.x % 13) * 53, u = (now + off) / D.P, n = Math.floor(u), p = u - n;
  const pause = hash01(n, w.x) < .125, ip = D.m === 'dip' ? .5 : .56, bell = Math.sin(p * Math.PI), B = {n, p, pause, sw:0, r:0, sq:1, ls:0};
  B.nn = p >= ip ? n : n - 1; B.pz = hash01(B.nn, w.x) < .125; B.age = ((p - ip + 1) % 1) * D.P;
  if (pause) B.ls = -.07 * bell, B.sq = 1 + .02 * bell;                       // a short upright stretch
  else if (D.m === 'hit'){ B.sw = swing01(p); B.ls = D.bs + (B.sw < 0 ? D.bk : D.fw) * B.sw; B.sq = p > .56 && p < .7 ? 1 - .04 * Math.sin((p - .56) / .14 * Math.PI) : 1; }
  else if (D.m === 'rub'){ B.r = Math.sin(p * TAU * 3); B.ls = D.bs + B.r * D.am; }
  else if (D.m === 'nod') B.ls = D.bs + Math.sin(p * TAU * 2) * D.am;
  else B.ls = D.bs + D.am * bell * bell;
  w._bn = now; w._bf = w.fx; w._bt = B; return B;
}
const workLean = (t, w, now) => {
  const D = WORK[w.fx]; if (reduced) return D ? D.bs || 0 : 0;
  const B = workBeat(w, now); w._sq = B.sq; return B.ls;
};
/* for some work the body bends forward (an angle at the feet), for dozing and dancing it sways */
const LEAN = {lift:() => .35, mulch:() => .3, eggs:() => .4, gather:() => .4, grope:() => .5, crab:() => .3, stalk:() => .16, mound:t => .28 + Math.sin(t * 4) * .03,
  doze:t => .13 + Math.sin(t * .9) * .07, nod:t => Math.sin(t * 2.2) * .05, siva:t => Math.sin(t * 2.2) * .07, hop:() => 0};
for (const k in WORK) LEAN[k] = workLean;
/* where the hands hold something else, the tool is put down */
const NOTOOL = new Set(['spear', 'stalk', 'tamp', 'wedge', 'coil', 'lift', 'mound', 'eggs', 'gather', 'twigs', 'snap', 'mulch', 'grope', 'crab', 'thatch', 'trim', 'herd', 'pour', 'stones', 'fire', 'burn', 'hollow', 'twist']);
/* short, small effects at the moment of impact; random but stable per stroke (seed: stroke count and x) */
function strikeFx(c, w, B, now){
  const k = w.fx, ms = B.age, s = ms / 1000, r = i => hash01(B.nn * 7.31 + i * 3.7, w.x), fade = q => q < .55 ? 1 : 1 - (q - .55) / .45;
  const dot = (x, y, rad, col, al) => { c.globalAlpha = al; c.fillStyle = col; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill(); c.globalAlpha = 1; };
  const shard = (life, x0, y0, vx, vy, g, col, size, spin) => {   // a chip that spins as it flies
    if (ms >= life) return; const q = ms / life; c.save(); c.globalAlpha = fade(q); c.translate(x0 + vx * s, y0 + vy * s + g * s * s / 2); c.rotate(spin * s + r(9) * 3);
    c.fillStyle = col; c.fillRect(-size, -size * .45, size * 2, size * .9); c.restore(); };
  const clod = (life, x0, y0, vx, vy, g, col, rad) => { if (ms < life){ const q = ms / life; dot(x0 + vx * s, y0 + vy * s + g * s * s / 2, rad * (1 - q * .3), col, fade(q)); } };
  const curl = (life, x0, y0, vx, vy, col) => {   // a shaving that curls up and drifts off
    if (ms >= life) return; const q = ms / life; c.save(); c.globalAlpha = fade(q); c.strokeStyle = col; c.lineWidth = .4; c.lineCap = 'round';
    c.beginPath(); c.arc(x0 + vx * s, y0 + vy * s, .5 + q * .35, q * 2, q * 2 + Math.PI * 1.5); c.stroke(); c.restore(); };
  const dust = (life, x, y, rad, col, al) => { if (ms < life){ const q = ms / life; c.globalAlpha = (1 - q) * al; c.fillStyle = col; c.beginPath(); c.ellipse(x + q * 1.2, y - q * 1.6, rad * (.6 + q), rad * (.6 + q) * .7, 0, 0, TAU); c.fill(); c.globalAlpha = 1; } };
  const ring = (life, x, rx) => { if (ms < life){ const q = ms / life; c.globalAlpha = (1 - q) * .6; c.strokeStyle = '#C8B48A'; c.lineWidth = .4; c.beginPath(); c.ellipse(x, 0, 1 + q * rx, (1 + q * rx) * .28, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; } };
  const spark = (life, x, y, rad) => { if (ms < life){ const q = ms / life; c.save(); c.globalAlpha = 1 - q; c.strokeStyle = '#F4ECD8'; c.lineWidth = .3; c.stroke(glint(x, y, rad * (1 - q * .4))); c.restore(); } };
  if (!B.pz) switch (k){
    case 'dig':
      clod(460, 4.2, -.3, 5 + r(1) * 5, -17 - r(2) * 6, 60, '#6B4A2E', .6); if (r(3) < .5) clod(380, 3.6, -.3, 2 + r(4) * 3, -11 - r(5) * 4, 60, '#7A5434', .4);
      dust(420, 4.4, -.6, 1.1, '#C8B48A', .5); break;
    case 'chop':
      for (let i = 0; i < 2 + (r(1) < .5 ? 1 : 0); i++) shard(480, 5, -4 + r(i + 2), 4 + r(i + 5) * 8, -11 - r(i + 7) * 9, 55, i % 2 ? '#C99A62' : '#D9B27A', .55 - i * .08, (r(i) - .5) * 40);
      break;
    case 'build':
      dust(380, 4.2, -.8, .9, '#B89A62', .55); shard(420, 4, -1, 3 + r(1) * 3, -9 - r(2) * 5, 55, '#D9B27A', .4, 25); curl(480, 4.6, -1.4, 3 + r(3) * 2, -3, '#E0B97E'); break;
    case 'carve':
      curl(560, 4, -1.2, 3 + r(1) * 2, -4.5 - r(2) * 2, '#E0B97E'); if (r(3) < .6) curl(480, 4.6, -1, 2 + r(4) * 2, -3.5, '#D9B27A');
      dot(5 + s * 4, -1.2 - s * 5, .28, '#B89A62', Math.max(0, 1 - ms / 380)); break;
    case 'knap': case 'flake':
      for (let i = 0; i < 2 + (r(1) < .4 ? 1 : 0); i++) shard(380, 4.6, -1.6, 4 + r(i + 2) * 8, -9 - r(i + 5) * 8, 50, '#1C1719', .4, 50);
      spark(200, 5, -2.2, .9); break;
    case 'grind': if (B.r > .85 || B.r < -.85) spark(260, B.r > 0 ? 6 : 3.4, -1.6, .6);
      if (Math.abs(B.r) > .5) dot(4.6 + B.r * 2.4, -.4 - (Math.abs(B.r) - .5) * 2, .3, '#C8C4BA', .6); break;
    case 'pound': case 'beat': ring(460, 4.8, 3.2); dust(380, 6.6, -.4, .8, '#C8B48A', .4); break;
    case 'tamp': ring(560, 4.6, 4.2); dust(460, 3.4, -.5, 1, '#C8B48A', .5); dust(460, 5.8, -.5, .8, '#C8B48A', .4); break;
    case 'paddle': dust(300, 3.2, -3.4, .6, '#C8B48A', .4); break;
    case 'scoop': case 'water':
      for (let i = 0; i < 3; i++) clod(520, 3.4 + i * .5, -1.6, 2 + r(i + 1) * 5, -9 - r(i + 3) * 5, 40, i === 1 ? '#BFE3EA' : '#F4ECD8', .35); break;
    case 'plant': {   // the clod falls back and a green leaf bobs up where the shoot was set
      clod(420, 3.5, -.4, 2 + r(1) * 3, -10 - r(2) * 4, 45, '#6B4A2E', .45);
      const q = Math.min(1, ms / 600), h = Math.sin(q * Math.PI * 1.5) * (1 - q * .5) * 1.6 + 1.6;
      c.fillStyle = '#7FA84F'; c.beginPath(); c.ellipse(6.4, -h, .8, .35, -.5, 0, TAU); c.ellipse(5.6, -h * .8, .7, .3, .5, 0, TAU); c.fill();
      c.strokeStyle = '#5E8A3A'; c.lineWidth = .3; c.beginPath(); c.moveTo(6, .1); c.lineTo(6, -h + .2); c.stroke(); break; }
  }
  if (k === 'chop'){   // now and then a leaf drifts down from the crown (its own slow clock, not tied to a stroke)
    const L = 2300, m = Math.floor(now / L), e = (now % L) / 1100;
    if (e < 1 && hash01(m, w.x + 3) < .4){ const x = 2 + hash01(m, w.x) * 5 + Math.sin(e * 5) * 1.1, y = -15 + e * 15; c.save(); c.globalAlpha = fade(e); c.translate(x, y); c.rotate(Math.sin(e * 5) * .8);
      c.fillStyle = '#6E9A3A'; c.beginPath(); c.ellipse(0, 0, .9, .38, 0, 0, TAU); c.fill(); c.restore(); }
  }
}
function workFx(c, w, now){
  const t = reduced ? .35 : now / 1000 + (w.x % 7), f = (t * 1.3) % 1;
  const dot = (x, y, r, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; };
  const line = (x0, y0, x1, y1, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.setLineDash([]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  const blob = (x, y, rx, ry, col, ink = '#2B1D14') => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = .35; c.stroke(); };
  const arcFly = (x0, y0, dx, h, col, r = .5) => { if (f < .7){ const g = f / .7; dot(x0 + dx * g, y0 - Math.sin(g * Math.PI) * h, r, col, 1 - g * .5); } };
  // an arm from the shoulder to the hand; a shoulder follows the body when it bends (w._ln, see LEAN); a puff of smoke
  const sk = SKINS[+w.look[0]] || SKINS[0], L = w._ln || 0, rp = (x, y) => [x * Math.cos(L) - y * Math.sin(L), x * Math.sin(L) + y * Math.cos(L)];
  // no arms: what a figure holds sits right at the torso. hold() moves what is drawn next so that its nominal grip (nx, ny)
  // lands on the torso edge (ax, ay); it leans with the body. unhold() ends that, for what lies on the ground or flies off.
  let held = 0;
  const hold = (nx, ny, ax, ay) => { const [px, py] = rp(ax, ay); c.save(); held++; c.translate(px - nx, py - ny); };
  const unhold = () => { if (held){ held--; c.restore(); } };
  const puff = (x, y, r, a) => { c.globalAlpha = a; c.fillStyle = '#E6E0D4'; c.beginPath(); c.ellipse(x, y, r, r * .7, 0, 0, TAU); c.fill(); c.globalAlpha = 1; };
  const star = (x, y, r) => { c.beginPath(); for (let i = 0; i < 8; i++){ const a = i / 8 * TAU, q = i % 2 ? r * .32 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); };
  const B = WORK[w.fx] && !reduced ? workBeat(w, now) : null;
  if (B && cam.z >= 1.6 && (w.fx === 'chop' || (!B.pz && B.age < 900))) strikeFx(c, w, B, now);
  switch (w.fx){
    case 'dig': if (!B) arcFly(4, -.3, 4, 3, '#6B4A2E', .6); break;                            // a clod of earth hops off the digging stick
    case 'chop': if (!B){ arcFly(5, -4, 4, 3, '#D9B27A'); arcFly(4.6, -3.4, 2.6, 4.4, '#C99A62', .4); } break;   // chips fly from the trunk
    case 'build': if (!B && f < .35) dot(4 + f * 4, -.8 - f * 3, .5, '#B89A62', 1 - f * 2); break;      // dust where the adze strikes
    case 'carve': if (!B && f < .6){ c.strokeStyle = '#E0B97E'; c.lineWidth = .45; c.beginPath(); c.arc(4 + f * 4, -1.2 - f * 2.4, .7, 0, Math.PI * 1.4); c.stroke(); } break;   // curled shavings
    case 'plant': if (!B) arcFly(3.5, -.4, 2.4, 1.6, '#6B4A2E', .45); break;
    case 'scoop': if (!B && f < .5) dot(3 + f * 3, -1.6 - Math.sin(f * 2 * Math.PI) * 2, .45, '#F4ECD8'); break;
    case 'hang': blob(2.6, -5 + Math.sin(t * 6) * .3, .6, 1.3, '#9FB7C0'); break;
    case 'pot': {   // a pot grows coil by coil under the hands
      blob(4.4, -1.1, 1.8, 1.3, '#B5774A'); line(2.9, -2.2, 5.9, -2.2, '#2B1D14', .45);
      const a = t * 4; line(4.4 + Math.cos(a) * 1.5, -1.6 + Math.sin(a) * .4, 4.4 + Math.cos(a) * 1.5, -.6 + Math.sin(a) * .4, '#E3B08A', .5); break; }
    case 'grind': {   // an adze blade rubbed on a slab of sandstone
      blob(4.6, -.2, 2.6, .8, '#A7A49C'); const x = 4.6 + (B ? B.r : Math.sin(t * 7)) * 1.1; blob(x, -.9, 1.1, .55, '#5C6066');
      if (!B && f < .4) dot(6.6 + f * 3, -.5 - f * 2, .35, '#C8C4BA', 1 - f * 2); break; }
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
      const up = B ? (1 - B.sw) / 2 : Math.abs(Math.sin(t * 5.5)), tip = {x:4.8, y:-1.2 - up * 3.2};
      c.fillStyle = '#8C5C36'; c.fillRect(3, -.9, 4, 1.1); if (w.fx === 'beat'){ c.fillStyle = '#E9DCC0'; c.fillRect(3.2, -1.2, 3.4, .5); }
      line(1.6, -4.6, tip.x, tip.y, '#2B1D14', .7); blob(tip.x + .2, tip.y, w.fx === 'beat' ? 1 : .8, .55, w.fx === 'beat' ? '#7A5434' : '#8A8A86');
      if (!B && up < .2){ line(3.4, -2.6, 2.9, -3.3, '#2B1D14', .3); line(6.2, -2.6, 6.7, -3.3, '#2B1D14', .3); } break; }
    case 'drill': {   // a shell ring bored with a bow drill and an obsidian point
      blob(4.4, -.4, 1.4, .55, '#F3D9A0'); line(4.4, -.6, 4.4, -4, '#7A5434', .45);
      const s = Math.sin(t * 9) * 1.4; line(2.4 + s, -3.1, 6.4 + s, -3.1, '#2B1D14', .4); break; }
    case 'feed': { const g = (t * 1.1) % 1; if (g < .6){ const q = g / .6; dot(3.4 + q * 2.4, -4 + q * q * 4, .55, '#5E8A3A'); } break; }   // taro thrown to the pigs
    case 'stars': { const a = t * 1.2; c.strokeStyle = '#8E8A80'; c.lineWidth = .35; c.beginPath(); c.ellipse(5, -.4, 3, 1.3, 0, 0, TAU); c.stroke(); dot(5 + Math.cos(a) * 3, -.4 + Math.sin(a) * 1.3, .5, '#F4ECD8'); dot(5, -.4, .45, '#3A2E2A'); break; }   // a pebble walks the star compass
    case 'leaf': { const h = .5 + Math.abs(Math.sin(t * 2)) * .9; blob(4.4, -.5, 2.8, h, '#5E8A3A'); line(1.8, -.5, 7, -.5, '#B9D08A', .3); break; }   // banana leaves laid over the pit
    case 'pull': { const tug = Math.abs(Math.sin(t * 2.2)); c.strokeStyle = '#B08048'; c.lineWidth = .45; c.lineCap = 'round'; c.beginPath(); c.moveTo(2.2, -5.2); c.quadraticCurveTo(5.6, -7.2 - tug * 1.4, 8.6, -12.6); c.stroke(); break; }   // leaning on the rope, the trunk bends away from the cut
    case 'climb': { c.strokeStyle = '#B08048'; c.lineWidth = .5; c.beginPath(); c.ellipse(.2, -.6, 1.6, .5, 0, 0, TAU); c.stroke(); break; }   // the foot loop of coconut fibre
    case 'husk': {   // a nut pressed onto the pointed stake, the husk torn off in strips
      line(4.4, .4, 4.4, -3.4, '#6B4428', .6); const up = Math.abs(Math.sin(t * 3)); blob(4.4, -3.9 - up * 1.1, 1.3, 1.1, '#8C6440');
      if (up < .25){ dot(5.9, -3.6, .35, '#C99A62'); dot(2.9, -3.2, .3, '#C99A62'); } blob(6.6, -.3, .9, .75, '#6B4A2E'); blob(7.6, .1, .8, .7, '#7A5434'); break; }
    case 'net': {   // mending the net on the lap, the netting needle goes through the meshes
      c.strokeStyle = '#8C6440'; c.lineWidth = .3; c.beginPath(); for (let k = 0; k < 4; k++){ c.moveTo(2.2 + k * 1.2, -1.6); c.lineTo(3 + k * 1.2, .4); c.moveTo(3 + k * 1.2, -1.6); c.lineTo(2.2 + k * 1.2, .4); } c.stroke();
      const x = 2.4 + ((t * .8) % 1) * 4.8; line(x, -2.2, x + .6, -1, '#2B1D14', .5); break; }
    case 'spear': {   // in the shallows, the spear raised; now and then a thrust and a splash
      const th = (t * .7) % 1, down = th > .85 ? (th - .85) / .15 : 0; c.fillStyle = '#79C6B8'; c.fill(WADE);
      line(1.2, -6.5 + down * 3, 6.5, -2 + down * 4, '#6B4428', .55); if (down > .5) for (let k = 0; k < 3; k++) dot(5.7 + k * .8, 1.6, .35, '#F4FBFA', 1 - down * .5); break; }
    case 'water': {   // dipping a coconut shell, filling the bamboo
      const d = Math.abs(Math.sin(t * 2)); blob(4.8, -.1 + d * .3, 1.5, .7, '#5AA9B8'); blob(3.6, -1.6 - d * 1.2, .9, .6, '#7A5434');
      if (d > .8) dot(4.8 + Math.cos(t * 9) * .8, -1, .3, '#E2F2F4'); line(6.8, .4, 6.8, -3.4, '#B3A15C', .9); break; }
    case 'pick': { line(1.8, -5.4, 3.6, -9.4 - Math.abs(Math.sin(t * 2)) * .8, '#2B1D14', .45); blob(4.2, -10, 1.5, 1.7, '#D9893A'); break; }   // reaching up for pandanus fruit
    case 'tap': { line(5.6, .4, 5.6, -7, '#5C4A33', 1.4); const f2 = (t * .9) % 1; dot(5.2, -3 + f2 * 3, .3, '#F4ECD8', 1 - f2 * .3); blob(5.2, .2, 1, .45, '#B08048'); break; }   // the milky sap drips into a shell
    case 'paint': {   // a brush dipped in turmeric, strokes on the bark cloth
      c.fillStyle = '#E9DCC0'; c.fillRect(2.4, -1.2, 5, 1.6); c.fillStyle = '#D9A441'; for (let k = 0; k < 3; k++) c.fillRect(2.8 + k * 1.6, -1, .5, 1.2);
      const x = 2.8 + ((t * .7) % 1) * 4.2; line(x, -3, x + .4, -1.2, '#6B4428', .5); break; }
    case 'stir': { blob(4.6, -.6, 2, .9, '#7A5434'); blob(4.6, -1, 1.5, .4, '#E3C35A'); const a = t * 4; dot(4.6 + Math.cos(a) * .9, -1.1, .4, '#E86A8A'); line(3.4, -4, 4.6 + Math.cos(a) * .6, -1.2, '#6B4428', .4); break; }   // blossoms stirred into the oil
    case 'grate': { blob(4.8, -.4, 1.6, 1, '#6B4A2E'); blob(4.8, -.9, 1.1, .6, '#F4ECD8'); const x = 4.8 + Math.sin(t * 8); line(x - 1, -2, x + 1, -2, '#8C6440', .5); if (Math.sin(t * 8) > .8) dot(6.6, .2, .3, '#F4ECD8'); break; }   // coconut flesh rasped on a shell
    case 'cut': { line(5.4, .4, 5.4, -8, '#7A9A4A', 1.2); blob(4, -6.4, 1.6, 1.3, '#D8C24A'); const sw = Math.sin(t * 3) * .4; line(1.6, -4.5, 4.2 + sw, -6 + sw, '#2B1D14', .45); break; }   // a bunch of bananas cut down
    case 'lash': {   // a post bound to the beam with sennit, round and round, the cord pulled tight
      line(5, .6, 5, -10, '#7A5434', 1.3); line(2.6, -8.2, 8.4, -8.2, '#7A5434', 1);
      c.strokeStyle = '#C99A62'; c.lineWidth = .4; c.beginPath(); for (let k = 0; k < 4; k++){ const y = -9.2 + k * .55; c.moveTo(4.2, y); c.lineTo(5.8, y + .5); } c.stroke();
      const a = t * 5;
      if (Math.cos(a) > .9) line(6.6, -8.2, 8, -7.4, '#C99A62', .4); break; }
    case 'raise': {   // a post set upright: from slanting to standing over the bout, pushed from below
      const p = clamp(1 - w.wait / (w.boutT || 3000), 0, 1), ang = (1 - smooth01(p)) * 1.05, bx = 6, len = 11;
      const tx = bx + Math.sin(ang) * -len * -1, ty = -Math.cos(ang) * len;
      line(bx, .4, tx, ty, '#2B1D14', 1.7); line(bx, .4, tx, ty, '#8C5C36', 1.1);
      
      if (p > .92) for (let k = 0; k < 3; k++) dot(bx - 1.5 + k * 1.5, .2, .4, '#C8B48A', .8); break; }
    case 'show': {   // what was made, held up high, a moment of pride
      const up = Math.min(1, (1 - w.wait / (w.boutT || 1500)) * 4), back = LOAD_BACK.has(w.show), sk = SKINS[+w.look[0]];
      if (w.show && LOADS[w.show]){ c.save(); c.translate(back ? 1 : 0, -up * 1.4 - (back ? 5 : 0)); blit(c, 'load|' + w.show, LOADS[w.show]); c.restore(); }
      if (up >= 1){ const q = (t * 2) % 1; c.globalAlpha = 1 - q; c.strokeStyle = '#E3B23C'; c.lineWidth = .4; c.beginPath(); for (let k = 0; k < 5; k++){ const a = -Math.PI / 2 + (k - 2) * .55, r0 = 4.5 + q * 1.5; c.moveTo(Math.cos(a) * r0, -14.5 + Math.sin(a) * r0 * .7); c.lineTo(Math.cos(a) * (r0 + 1.4), -14.5 + Math.sin(a) * (r0 + 1.4) * .7); } c.stroke(); c.globalAlpha = 1; }
      break; }
    // ---- the second looks of the crafts and fields: every activity has at least two
    case 'file': {   // the hook shaped with a file of coral, back and forth over the shell
      blob(4.8, -.2, 2, .6, '#A7A49C');
      c.strokeStyle = '#F3D9A0'; c.lineWidth = .6; c.lineCap = 'round'; c.beginPath(); c.moveTo(4.1, -2.4); c.lineTo(4.1, -1.2); c.quadraticCurveTo(4.1, -.5, 4.8, -.6); c.quadraticCurveTo(5.5, -.7, 5.5, -1.4); c.stroke();
      const s = (B ? B.r : Math.sin(t * 6)) * .9; hold(2.2, -2.9, 1.9, -4.4); line(2.2 + s, -2.9, 4.9 + s, -1.9, '#2B1D14', .9); line(2.2 + s, -2.9, 4.9 + s, -1.9, '#E3D2B0', .5); unhold();
      if (s > .6) dot(5.8, -1.6, .25, '#F4ECD8', .8); break; }
    case 'polish': {   // rubbed smooth with coral and pumice: a wooden bowl, or a shell for an ornament
      if (w.job && w.job.b.kind === 'schmuck'){ blob(4.6, -.5, 1.7, .8, '#F3D9A0'); blob(4.6, -.5, .55, .25, '#C9B48A'); }
      else { const B = new Path2D('M2.4-1.5Q4.6 1.2 6.8-1.5Z'); c.fillStyle = '#8C5C36'; c.fill(B); stroke(c, B, '#2B1D14', .35); line(2.4, -1.5, 6.8, -1.5, '#5A3F22', .4); }
      const a = t * 4, px = 4.6 + Math.cos(a) * 1.1, py = -1.8 + Math.sin(a) * .3; hold(4.1, -2, 2.2, -4.4); blob(px, py, .7, .45, '#C8C4BA'); unhold();
      if (Math.cos(a) > .96) stroke(c, glint(6.4, -2.8, .7), '#F4ECD8', .3); break; }
    case 'hollow': {   // a bowl hollowed from a block of wood with the adze, shavings curl off
      blob(5, -.8, 2.6, 1.2, '#9C7246'); blob(5, -1.3, 1.7, .45, '#6B4428');
      const sw = Math.sin(t * 5), hx = 3.6 + sw * .6, hy = -3.4 - Math.max(0, sw) * 1.6; hold(3.6, -3.8, 1.9, -4.6); line(hx - .2, hy, hx + 1.3, hy + .9, '#5C6066', .8); unhold();
      if (sw < -.6){ c.strokeStyle = '#E0B97E'; c.lineWidth = .4; c.beginPath(); c.arc(6.4, -2.2, .7, 0, Math.PI * 1.4); c.stroke(); } break; }
    case 'mound': {   // earth heaped round the young yam vine and patted firm
      const h = 1.1 + Math.abs(Math.sin(t * 1.5)) * .25; c.fillStyle = '#6B4A2E'; c.beginPath(); c.ellipse(5.2, .1, 2.8, h, 0, Math.PI, TAU); c.fill();
      line(5.2, -h + .1, 5.6, -6.2, '#8C6440', .35); dot(5.8, -4.6, .6, '#5E8A3A'); dot(5, -5.6, .55, '#7E9A3A');
      arcFly(2.4, -.2, 2.4, 1.6, '#6B4A2E', .45); break; }
    case 'lift': {   // a taro corm or a turmeric root pulled up by the leaves, the earth shaken off
      const g = (t * .6) % 1, u = Math.sin(Math.min(1, g * 1.6) * Math.PI / 2) * (g < .85 ? 1 : (1 - g) / .15), y = -u * 3, root = w.job && w.job.b.kind === 'kurkumagarten' ? '#D9A441' : '#8C6A8A';
      blob(5, y - .2, 1.1, .8, root); line(5, y - .8, 4.4, y - 4.2, '#6E9A3A', .35); line(5, y - .8, 5.7, y - 4, '#6E9A3A', .35);
      blob(4.1, y - 4.6, 1.3, .75, '#5E8A3A'); blob(6, y - 4.4, 1.2, .7, '#6E9A3A');
      
      if (u > .7 && g < .85) for (let k = 0; k < 2; k++) dot(4.4 + k * 1.2, y + .8 + ((t * 3 + k * .5) % 1) * 2.4, .28, '#6B4A2E'); break; }
    case 'mulch': {   // leaves and compost thrown into the pulaka pit, layer on layer
      blob(5.6, .3, 3, 1, '#3E2C20'); blob(4.8, 0, 1, .32, '#5E8A3A'); blob(6.4, .2, .9, .3, '#7E9A3A');
      const g = (t * .9) % 1; if (g < .7){ const q = g / .7; c.save(); c.translate(2.4 + q * 3.2, -4.4 + q * q * 4.4); c.rotate(q * 2.2); blob(0, 0, 1.1, .42, '#7E9A3A'); c.restore(); }
      break; }
    case 'stones': {   // the hot stones of the earth oven lifted with wooden tongs; smoke over the pit
      blob(5, .2, 3.1, 1, '#3A2E2A'); for (let k = 0; k < 3; k++) dot(3.8 + k * 1.2, -.2, .6, k % 2 ? '#B0483A' : '#7A6A60');
      const u = Math.abs(Math.sin(t * 1.6)), sy = -.6 - u * 3; dot(5.4, sy, .65, '#D0603A');
      line(1.8, -5, 5.2, sy - .4, '#7A5434', .4); line(1.9, -4.6, 5.6, sy + .3, '#7A5434', .4);
      for (let k = 0; k < 2; k++){ const q = (t * .45 + k * .5) % 1; puff(4.4 + Math.sin(q * 5 + k) * .8, -1.4 - q * 7, .7 + q * 1.1, (1 - q) * .45); } break; }
    case 'wrap': {   // food folded into banana leaves for the oven, or breadfruit paste for the pit, and tied
      const p = (t * .45) % 1, f = Math.min(1, p * 1.6), lift = Math.sin(f * Math.PI) * .8;
      c.fillStyle = '#5E8A3A'; c.fillRect(2.4, -1.1, 4.8, 1.5); line(2.4, -.35, 7.2, -.35, '#B9D08A', .25);
      if (p < .75){ blob(4.8, -.9, 1, .55, w.job && w.job.b.kind === 'gaergrube' ? '#D8C47A' : '#E3C35A'); blob(2.9 + f * 1.4, -.9 - lift, 1.1, .5, '#6E9A3A'); blob(6.7 - f * 1.4, -.9 - lift, 1.1, .5, '#6E9A3A'); }
      else { blob(4.8, -1.1, 1.6, .9, '#6E9A3A'); line(4.8, -2, 4.8, -.2, '#B08048', .4); } break; }
    case 'fire': {   // the fire under the coral tended with a long stick; sparks go up
      line(3.6, .2, 6.6, -.6, '#5A3F22', .7); line(3.8, -.6, 6.6, .3, '#5A3F22', .7);
      const fl = 1 + Math.sin(t * 9) * .12; c.save(); c.translate(5.2, -.4); c.scale(.42 * fl, .5 * fl); c.fillStyle = '#E0803A'; c.fill(FLAME); c.scale(.55, .6); c.fillStyle = '#F3D9A0'; c.fill(FLAME); c.restore();
      const pk = Math.sin(t * 2.4); line(1.8, -4.6, 4.6 + pk * .5, -1 - Math.max(0, pk) * .5, '#6B4428', .45);
      for (let k = 0; k < 3; k++){ const q = (t * .9 + k / 3) % 1; dot(5 + Math.sin(q * 7 + k) * .9, -2.4 - q * 6, .22, '#F3B04A', 1 - q); } break; }
    case 'eggs': {   // eggs from the nests into a basket
      blob(6.6, -.7, 1.4, 1, '#B08048'); line(5.3, -1.3, 7.9, -1.3, '#8C6440', .3); dot(6.2, -1.6, .45, '#F4ECD8'); 
      const g = (t * .8) % 1, ex = 3.4 + g * 3.2, ey = -.4 - Math.sin(g * Math.PI) * 2.4; blob(ex, ey, .45, .58, '#F4ECD8');
      break; }
    case 'herd': {   // the pigs driven back to the pen with a stick, trotting a few steps
      const px = 7 + Math.sin(t * 1.4) * 1.2, bob = Math.abs(Math.sin(t * 6)) * .3;
      blob(px, -1.4 - bob, 2, 1.2, '#5A4636'); blob(px + 1.9, -1.8 - bob, .9, .75, '#5A4636'); blob(px + 2.7, -1.6 - bob, .35, .3, '#8A6A5A');
      for (const dx of [-1.2, 1]) line(px + dx, -.6 - bob, px + dx + Math.sin(t * 6 + dx) * .3, 0, '#2B1D14', .4);
      c.strokeStyle = '#2B1D14'; c.lineWidth = .3; c.beginPath(); c.arc(px - 2.2, -1.8 - bob, .45, 0, Math.PI * 1.5); c.stroke();
      const sw = Math.sin(t * 3) * .6; line(1.9, -4.8, 4.4 + sw, -.6, '#8C6440', .45); break; }
    case 'strip': {   // a pandanus leaf split into fine strips with a shell; the strips pile up on the lap
      line(2.2, -3.6, 7.6, -1.4, '#C8B06A', .9);
      for (let k = 0; k < 3; k++) line(2.6 + k * .35, -3.4 + k * .15, 2 + k * .5, .2, '#DCC48C', .32);
      const x = 2.6 + ((t * .7) % 1) * 4.6, y = -3.4 + (x - 2.2) / 5.4 * 2.2; 
      line(4.2, .1, 7.4, .1, '#DCC48C', .35); line(4.4, -.2, 7.2, -.2, '#CDB57A', .3); break; }
    case 'rub': {   // bark cloth laid on a carved board and rubbed with dye: the pattern comes through
      c.fillStyle = '#8C5C36'; c.fillRect(2.4, -.6, 5, 1); c.fillStyle = '#E9DCC0'; c.fillRect(2.4, -1.3, 5, .8);
      const p = (t * .22) % 1, x = 2.6 + p * 4.6 + Math.sin(t * 6) * .4; c.fillStyle = '#7A3F22';
      for (let k = 0; k < 6; k++){ const px = 2.7 + k * .8; if (px < 2.6 + p * 4.6) c.fillRect(px, -1.2, .28, .6); }
      blob(2.6 + (x - 2.6) * .3, -2.4, .9, .5, '#A84A2C'); break; }
    case 'squeeze': {   // grated coconut squeezed in a strainer of fibre; the oil drips into the bowl
      blob(4.8, -.3, 1.8, .7, '#6B4A2E'); blob(4.8, -.6, 1.3, .3, w.job && w.job.b.kind === 'duftoel' ? '#E8B07A' : '#E3C35A');
      const tw = Math.sin(t * 3); c.save(); c.translate(3.6, -4.4); c.rotate(tw * .3); blob(0, 0, 1.6, .8, '#B08048'); line(-1.4, -.3, 1.4, .3, '#8C6440', .3); c.restore();
      const q = (t * 1.4) % 1; dot(3.8, -3.4 + q * 2.6, .28, '#E8C25A', 1 - q * .4); break; }
    case 'scrape': {   // the dried gum scraped off the bark into a shell
      line(5.6, .4, 5.6, -7.6, '#5C4A33', 1.4); blob(5.1, -4.8, .5, .3, '#E3C35A'); blob(5.1, -3.2, .4, .25, '#E3C35A');
      const s = Math.sin(t * 4), y = -5 + s; hold(4.6, -5, 2.1, -5); blob(4.8, y, .6, .4, '#F3D9A0'); unhold();
      if (s > .5){ const q = (t * 2) % 1; dot(5, y + .8 + q * 3, .28, '#E3C35A', 1 - q); } blob(5, .2, 1, .45, '#B08048'); break; }
    case 'pour': {   // water poured from a coconut shell into a bamboo tube for the house
      line(6.8, .4, 6.8, -4.2, '#B3A15C', 1.1); line(6.2, -4.2, 7.4, -4.2, '#8C7A3A', .35); line(6.2, -2, 7.4, -2, '#8C7A3A', .25);
      const tip = .5 + .5 * Math.sin(t * 1.3); c.save(); c.translate(2.8, -5.2); c.rotate(tip * .9); blob(0, 0, 1.2, .62, '#7A5434'); c.restore();
      if (tip > .55){ c.strokeStyle = '#BFE3EA'; c.lineWidth = .35; c.beginPath(); c.moveTo(3.9, -4.7); c.quadraticCurveTo(6.4, -4.5, 6.8, -4); c.stroke(); } break; }
    case 'point': {   // the master points to a star rising out of the sea and names it; the pupil follows its path
      const tw = .7 + .3 * Math.sin(t * 5);
      star(8.4, -17, 1.4 * tw); c.fillStyle = '#F4ECD8'; c.fill(); c.strokeStyle = '#2B1D14'; c.lineWidth = .25; c.stroke();
      c.setLineDash([.4, .7]); c.strokeStyle = '#8E8A80'; c.lineWidth = .3; c.beginPath(); c.arc(8.4, -9, 8, -Math.PI * .5, -Math.PI * .05); c.stroke(); c.setLineDash([]); break; }
    case 'split': {   // a green nut opened with a stone: water to drink
      const g = (t * .5) % 1, u = g < .7 ? Math.abs(Math.sin(t * 3)) : 0;
      if (g < .7) blob(5, -.9, 1.3, 1.1, '#7E9A3A');
      else { blob(4.1, -.6, 1, .75, '#7E9A3A'); blob(6, -.6, 1, .75, '#7E9A3A'); blob(4.2, -1, .6, .35, '#F4ECD8'); blob(5.9, -1, .6, .35, '#F4ECD8'); }
      const sy = -2.8 - u * 2; hold(4.2, -3.8, 2, -4.8); blob(4.6, sy, .8, .6, '#8A8A86'); unhold(); break; }
    case 'trim': {   // the dry leaves cut from the banana stem; one drifts down
      line(5.8, .4, 5.8, -9, '#7A9A4A', 1.2); blob(7.2, -9.4, 2.1, .7, '#6E9A3A'); blob(4.4, -8.6, 1.6, .55, '#7E9A3A');
      const g = (t * .55) % 1; c.save(); c.translate(6.6 - g * 1.6, -7 + g * 7); c.rotate(g * 1.8); blob(0, 0, 1.8, .45, '#B08A4A'); c.restore();
      const sw = Math.sin(t * 4) * .5; hold(4.6, -7.6, 1.9, -5.6); line(4.6 + sw, -7.6 + sw, 5.6 + sw, -8.3 + sw, '#E9DCC0', .4); unhold(); break; }
    case 'paddle': {   // paddle and anvil: the pot wall beaten thin from outside, a stone held against it inside
      blob(5.6, -1.7, 2.1, 1.8, '#B5774A'); line(4, -3.3, 7.2, -3.3, '#2B1D14', .45);
      const hit = Math.max(0, Math.sin(t * 6)), px = 2.6 - (1 - hit) * .8; hold(2.2, -3.8, 1.9, -4.4);
      c.fillStyle = '#8C5C36'; c.fillRect(px - .3, -2.8, .6, 2.2); stroke(c, new Path2D(`M${px - .3} -2.8h.6v2.2h-.6Z`), '#2B1D14', .25); unhold();
      if (hit > .92){ line(3.2, -3.4, 2.7, -3.9, '#2B1D14', .3); line(3.2, -.4, 2.7, .1, '#2B1D14', .3); } break; }
    case 'stamp': {   // dentate stamping, the mark of Lapita: a toothed stamp pressed row by row into the wet clay
      blob(5, -1.6, 2.3, 1.6, '#C08458'); line(3, -3.1, 7, -3.1, '#2B1D14', .4);
      const p = (t * .35) % 1, n = Math.floor(p * 7); c.fillStyle = '#5A3F22';
      for (let k = 0; k < n; k++) for (let d = 0; d < 3; d++) c.fillRect(3.3 + k * .55, -2.5 + d * .38, .2, .2);
      const tx = 3.3 + n * .55, pr = Math.sin(t * 9) > 0 ? .25 : 0; c.fillStyle = '#7A5434'; c.fillRect(2.2, -4.6 + pr, .5, 1.8); break; }
    case 'chip': {   // the adze blade roughed out of basalt with a hammer stone; chips spring off
      const B = new Path2D('M3.4-.2L4.4-2.2L6.2-1.9L6.5-.2Z'); c.fillStyle = '#5C6066'; c.fill(B); stroke(c, B, '#2B1D14', .3);
      const u = Math.abs(Math.sin(t * 4)); hold(4.6, -4, 2, -4.8); blob(5, -2.8 - u * 2.4, .8, .6, '#8A8A86'); unhold();
      if (u < .25){ const q = u * 4; dot(6.8 + q, -2.6 - q, .3, '#5C6066'); dot(3.4 - q, -2.8 - q * .6, .25, '#5C6066'); } break; }
    case 'flake': {   // fine flakes pressed off the obsidian edge with a point of bone
      hold(3.4, -3.2, 1.9, -4.4); const O = new Path2D('M3.2-3.4L6-4L5.6-2.5Z'); c.fillStyle = '#1C1719'; c.fill(O);
      const pr = (t * 1.8) % 1; line(6.4, -4.8 + pr * .6, 5.5, -3.4, '#E9DCC0', .5);
      if (pr > .8) dot(5.4 + (pr - .8) * 8, -3 + (pr - .8) * 10, .22, '#1C1719'); break; }
    case 'braid': {   // three strands of sennit plaited; the braid hangs from the big toe and grows
      const Lb = 1.6 + ((t * .25) % 1) * 2.6, top = -4.6, cols = ['#B08048', '#C99A62', '#8C6440'];
      for (let k = 0; k < 6; k++){ const y = top + k * (Lb / 6); line(4.6 + (k % 2 ? .45 : -.45), y, 4.6 + (k % 2 ? -.45 : .45), y + Lb / 6, cols[k % 3], .5); }
      const by = top + Lb; for (let k = -1; k <= 1; k++) line(4.6 + k * .3, by, 4.6 + k * 1.4 + Math.sin(t * 3 + k) * .3, .2, '#C99A62', .35);
      break; }
    case 'peel': {   // the bark stripped from a stick of paper mulberry; the white inner bark comes off in a long band
      line(2.4, -1.5, 7.6, -2.7, '#8C6440', .75);
      const p = (t * .5) % 1; c.strokeStyle = '#E9DCC0'; c.lineWidth = .6; c.lineCap = 'round'; c.beginPath(); c.moveTo(2.8 + p * 4, -1.7 - p * .9); c.quadraticCurveTo(3.6 + p * 4, -4.2 - p, 5 + p * 3, -3.6 - p * .6); c.stroke();
      break; }
    case 'twigs': {   // dry sticks picked up from the ground onto a bundle
      for (let k = 0; k < 3; k++) line(2.8 + k * 1.3, .3, 5 + k * 1.3, -.3, '#8C6440', .5);
      line(6.6, -.5, 9.6, -1.7, '#2B1D14', 1.1); line(6.6, -.5, 9.6, -1.7, '#A37A4C', .6); line(6.8, -.1, 9.8, -1.1, '#2B1D14', 1.1); line(6.8, -.1, 9.8, -1.1, '#A37A4C', .6);
      const g = (t * .8) % 1, x = 3.4 + g * 4.4, y = -.3 - Math.sin(g * Math.PI) * 2.4; line(x - .9, y + .3, x + .9, y - .3, '#9C7246', .55);
      break; }
    case 'snap': {   // a dry branch broken in two over the knee; a splinter springs off
      const u = Math.abs(Math.sin(t * 2.4)), b = u * 1.3;
      line(1.8, -4.4, 4, -5 + b, '#2B1D14', 1.1); line(1.8, -4.4, 4, -5 + b, '#9C7246', .6); line(4, -5 + b, 6.2, -4.4, '#2B1D14', 1.1); line(4, -5 + b, 6.2, -4.4, '#9C7246', .6);
      if (u > .92) dot(4, -5.6 + b, .35, '#E9DCC0'); break; }
    case 'gather': {   // fallen pandanus keys picked from the ground into a basket
      blob(6.8, -.7, 1.4, 1, '#B08048'); dot(6.4, -1.6, .5, '#D9893A'); dot(7.2, -1.5, .45, '#E0A04A');
      for (let k = 0; k < 2; k++) blob(3.4 + k * 1.4, .1, .55, .4, '#D9893A');
      const g = (t * .9) % 1, x = 3.8 + g * 3, y = -.4 - Math.sin(g * Math.PI) * 2; blob(x, y, .5, .42, '#E0A04A');
      break; }
    case 'tamp': {   // the earth stamped firm with a heavy pole: round a young tree, or over a new floor
      const u = B ? (1 - B.sw) / 2 : Math.abs(Math.sin(t * 3.2)); hold(4.4, -5.4, 1.9, -5); line(4.6, -1 - u * 3, 4.6, -6.4 - u * 3, '#7A5434', .8); blob(4.6, -.9 - u * 3, .9, .5, '#8C6440'); unhold();
      if (!B && u < .18) for (let k = 0; k < 3; k++) dot(3.4 + k * 1.2, -.2, .4, '#C8B48A', .7);
      if (w.job && w.job.type === 'plant'){ line(7, .2, 7, -3.2, '#6B4A2E', .4); dot(6.6, -3.4, .7, '#7FA84F'); dot(7.5, -3.6, .6, '#7FA84F'); } break; }
    case 'wedge': {   // a wedge of hard wood driven into the cut with a club; the trunk creaks
      const Wd = new Path2D('M4.9-3.6L6.2-3.1L4.9-2.6Z'); c.fillStyle = '#C99A62'; c.fill(Wd); stroke(c, Wd, '#2B1D14', .25);
      const u = Math.abs(Math.sin(t * 3.4)), mx = 3.8 - u * 1.4, my = -3.2 - u * 2.8; hold(3.4, -2.8, 1.9, -4.8); blob(mx, my, .9, .7, '#7A5434'); unhold();
      if (u < .15){ line(6.6, -4.4, 7.4, -5, '#2B1D14', .3); line(6.6, -2, 7.4, -1.6, '#2B1D14', .3); } break; }
    case 'coil': {   // the rope coiled between hand and elbow, loop over loop
      const a = t * 3, n = 2 + Math.floor(((t * .4) % 1) * 3);
      c.strokeStyle = '#B08048'; c.lineWidth = .4; for (let k = 0; k < n; k++){ c.beginPath(); c.ellipse(3.2 + k * .2, -5, 1.1, 2, .3, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(3.6, -3); c.quadraticCurveTo(6, -1.4 + Math.sin(a) * .5, 8.6, 0); c.stroke();
      break; }
    case 'twist': {   // up in the crown the nuts twisted off one by one; a dry frond thrown down
      c.strokeStyle = '#B08048'; c.lineWidth = .5; c.beginPath(); c.ellipse(.2, -.6, 1.6, .5, 0, 0, TAU); c.stroke();
      const H = climbH(w); if (H > 12){ const a = t * 4; blob(3, -10.6, 1.6, 1.2, '#7A5434');
        const g = (t * .4) % 1; c.save(); c.translate(4 + g * 4, -8 + g * (H + 8)); c.rotate(g * 2.6); line(-2.4, 0, 2.4, 0, '#B08A4A', .45); for (let k = -2; k <= 2; k++) line(k, 0, k + .6, .9, '#B08A4A', .25); c.restore(); } break; }
    case 'grope': {   // bent low in the shallows, an arm under a rock: octopus and shellfish hide there
      blob(5.8, .3, 1.7, .7, '#6E6A60'); const q = (t * .8) % 1; stroke(c, ellipse(4.8, .6, 1 + q * 2.6, (1 + q * 2.6) * .4), '#F4FBFA', .35, null, null, 1 - q);
      
      if ((t * .3) % 1 > .72){ c.strokeStyle = '#B0607A'; c.lineWidth = .4; c.beginPath(); c.moveTo(6.6, 0); c.quadraticCurveTo(7.6, -1.4, 8.2, -.4); c.stroke(); } break; }
    case 'gut': {   // the catch cleaned on a board by the hut; the scales flash
      c.fillStyle = '#8C5C36'; c.fillRect(2.6, -.8, 4.8, .9); blob(5, -1.2, 1.8, .55, '#9FB7C0');
      const T = new Path2D('M6.6-1.2L7.6-1.9V-.5Z'); c.fillStyle = '#9FB7C0'; c.fill(T); stroke(c, T, '#2B1D14', .25);
      const x = 4 + Math.sin(t * 4) * 1.2; hold(4, -3.6, 2, -4.6); line(x, -3.6, x + .4, -1.5, '#E9DCC0', .45); unhold();
      if (Math.sin(t * 4) > .8) stroke(c, glint(5.6, -2.4, .6), '#F4FBFA', .25); break; }
    case 'stalk': {   // the spear held low, creeping up on a fish in the clear water
      c.fillStyle = '#79C6B8'; c.fill(WADE); line(.6, -4.6, 7.8, -2.8, '#6B4428', .55);
      const Tp = new Path2D('M7.8-2.8L8.8-2.5L7.7-2.4Z'); c.fillStyle = '#2B1D14'; c.fill(Tp);
      const fx = 9 + Math.sin(t * .9) * 2; c.globalAlpha = .45; c.fillStyle = '#2F5F73'; c.beginPath(); c.ellipse(fx, 1.2, 1, .35, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      const q = (t * .6) % 1; stroke(c, ellipse(0, .4, 3 + q * 2, (3 + q * 2) * .35), '#F4FBFA', .3, null, null, 1 - q); break; }
    case 'turn': {   // the fish on the drying rack turned to the sun
      line(2.6, .4, 2.6, -6.6, '#7A5434', .5); line(7.6, .4, 7.6, -6.6, '#7A5434', .5); line(2.2, -6.2, 8, -6.2, '#7A5434', .55);
      for (let k = 0; k < 3; k++){ const r = k === 1 ? Math.sin(t * 3) : 1; c.save(); c.translate(3.8 + k * 1.7, -6.1); c.scale(Math.max(.25, Math.abs(r)), 1); blob(0, 1.3, .5, 1.2, '#9FB7C0'); c.restore(); }
      break; }
    case 'burn': {   // the hull hollowed with fire: embers glow along the log, the charcoal scraped out after
      blob(5, -.6, 3.6, 1.2, '#7A5434'); blob(5, -1.1, 2.3, .45, '#2B1D14');
      for (let k = 0; k < 3; k++) dot(4 + k, -1.2, .35, ['#D0603A', '#E0803A', '#F3D9A0'][k], .6 + .4 * Math.sin(t * 5 + k));
      for (let k = 0; k < 2; k++){ const q = (t * .4 + k * .5) % 1; puff(5 + Math.sin(q * 4 + k), -2 - q * 7, .6 + q, (1 - q) * .4); }
      const s = Math.sin(t * 2); hold(3.2, -2.6, 1.9, -4.4); line(3.2 + s * .6, -2.6, 4.4 + s * .6, -1.4, '#5C6066', .5); unhold(); break; }
    case 'wring': {   // back from the dive: the hair wrung out, the drops fall
      
      for (let k = 0; k < 3; k++){ const q = (t * 1.3 + k / 3) % 1; dot(-1.6 + k * .4, -8 + q * 8, .25, '#BFE3EA', 1 - q); } break; }
    case 'thatch': {   // the thatch tied on in rows, from the eaves upward
      line(2.4, -12.6, 9.4, -8.6, '#7A5434', .7);
      for (let k = 0; k < 5; k++){ const x = 3 + k * 1.4, y = -12.2 + k * .8; line(x, y, x - .3, y + 2.6, '#B9A35A', .5); }
      const a = t * 4, hx = 5 + Math.cos(a) * .8, hy = -10.8 + Math.sin(a) * .5;
      if (Math.cos(a) > .9){ hold(hx, hy, 1.9, -6); line(hx, hy, hx + 1.4, hy - .6, '#C99A62', .35); unhold(); } break; }
    case 'crab': {   // gathering on the shore: a crab chased and caught by a leg
      const g = (t * .5) % 1, run = g < .6, x = run ? 7 - g * 4 : 3, y = run ? .2 : -4.4 - Math.sin((g - .6) * 10) * .3;
      c.save(); c.translate(x, y); blob(0, 0, .9, .6, '#D0603A'); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) line(s * .6, k * .12, s * 1.4, .5 + k * .25 - (run ? Math.sin(t * 20 + k) * .2 : 0), '#2B1D14', .2);
      dot(-.4, -.5, .15, '#2B1D14'); dot(.4, -.5, .15, '#2B1D14'); c.restore();
      break; }
    // ---- free time and short rests
    case 'kite': {   // a kite of pandanus leaf on a cord of coconut fibre, off downwind, dancing in the gusts
      const kx = 15 + Math.sin(t * .9) * 1.6, ky = -25 + Math.cos(t * 1.3) * 2.2, rot = Math.sin(t * 1.7) * .25;
      c.strokeStyle = '#6B4428'; c.lineWidth = .3; c.beginPath(); c.moveTo(1.9, -5.4); c.quadraticCurveTo(kx * .55, ky * .3, kx, ky + 2); c.stroke();
      c.save(); c.translate(kx, ky); c.rotate(rot); const K = new Path2D('M0-3.6Q2.6-1.4 0 3.2Q-2.6-1.4 0-3.6Z'); c.fillStyle = '#D9C27A'; c.fill(K); stroke(c, K, '#2B1D14', .4); line(0, -3.2, 0, 3, '#8C6440', .3);
      c.strokeStyle = '#B03A2E'; c.lineWidth = .35; c.beginPath(); c.moveTo(0, 3.2); for (let k = 1; k <= 4; k++) c.lineTo(Math.sin(t * 3 + k) * 1.2, 3.2 + k * 1.6); c.stroke(); c.restore();
      break; }
    case 'toy': {   // a toy outrigger with a crab-claw sail goes round in the shallows
      c.fillStyle = '#79C6B8'; c.fill(WADE); stroke(c, ellipse(0, -.2, 3.6, 1.1), '#F4ECD8', .55, null, null, .9);
      const a = t * .9, x = 6 + Math.cos(a) * 3, y = 1.2 + Math.sin(a) * 1.1, d = Math.cos(a + Math.PI / 2) < 0 ? -1 : 1;
      c.save(); c.translate(x, y); c.scale(d, 1); blob(0, 0, 1.6, .45, '#8C5C36'); line(-.6, -.1, -.6, 1, '#6B4428', .25); line(-1.2, 1.1, 1, 1.1, '#6B4428', .35);
      const S = new Path2D('M0-.2L-1.4-3.8Q-.2-2.6 .3-3.6Q.2-1.6 0-.2Z'); c.fillStyle = '#E9DCC0'; c.fill(S); stroke(c, S, '#2B1D14', .25); c.restore();
      if (Math.sin(a * 3) > .7) dot(x - 2, y + .3, .3, '#F4FBFA'); break; }
    case 'string': {   // a string figure between the hands, a new one every few breaths
      const k = Math.floor(t / 1.6) % 3, x0 = 1.9, x1 = 5.4, y = -5.4;
      c.strokeStyle = '#B03A2E'; c.lineWidth = .3; c.beginPath();
      if (k === 0){ c.moveTo(x0, y - 1); c.lineTo(x1, y + 1); c.moveTo(x0, y + 1); c.lineTo(x1, y - 1); c.moveTo(x0, y - 1); c.lineTo(x1, y - 1); c.moveTo(x0, y + 1); c.lineTo(x1, y + 1); }
      else if (k === 1){ for (let i = 0; i < 3; i++){ const a = x0 + i * 1.13; c.moveTo(a, y - 1); c.lineTo(a + .57, y + 1); c.lineTo(a + 1.13, y - 1); } c.moveTo(x0, y + 1); c.lineTo(x1, y + 1); }
      else { c.moveTo(x0, y); c.lineTo((x0 + x1) / 2, y - 1.4); c.lineTo(x1, y); c.lineTo((x0 + x1) / 2, y + 1.4); c.closePath(); c.moveTo(x0, y - 1); c.lineTo(x1, y + 1); }
      c.stroke(); break; }
    case 'hiko': {   // three candlenuts in a loop over the head, caught and thrown, never one on the ground
      for (let k = 0; k < 3; k++){ const a = (t * 1.2 + k / 3) * TAU, y = -14.2 + Math.sin(a) * 2.6 - (Math.sin(a) < 0 ? 1.6 : 0); blob(.6 + Math.cos(a) * 2.6, y, .75, .75, k === 1 ? '#A0703E' : '#7A5434'); }
      
      break; }
    case 'garland': {   // blossoms threaded on a strip of hibiscus bast, one after the other
      c.strokeStyle = '#7E9A3A'; c.lineWidth = .35; c.beginPath(); c.moveTo(2, -1.2); c.quadraticCurveTo(4.6, .6, 7.2, -1.2); c.stroke();
      const n = 1 + Math.floor((t * .6) % 5), col = ['#E86A8A', '#F4ECD8', '#F3D9A0', '#E86A8A', '#F4ECD8'];
      for (let k = 0; k < n; k++){ const q = k / 4; dot(2 + q * 5.2, -1.2 + Math.sin(q * Math.PI) * 1.4, .6, col[k]); }
      line(1.9, -4.4, 2.4 + n * 1.1, -1.2, '#2B1D14', .3); break; }
    case 'story': {   // the hand moves with the words; over it what the story is about: turtle, canoe, star, shark, fish
      const g = Math.floor(t / 2.6), k = (g + (w.x | 0)) % 5, pop = Math.min(1, (t / 2.6 - g) * 5);
      c.save(); c.translate(4.6, -15.4); c.scale(pop, pop); const B = loopPath(0, 0, 3.4, 2.7, 7 + k, .06, 11); c.globalAlpha = .95; c.fillStyle = '#F4ECD8'; c.fill(B); c.globalAlpha = 1; stroke(c, B, '#3E2416', .4);
      c.fillStyle = '#2B1D14'; c.strokeStyle = '#2B1D14'; c.lineWidth = .35;
      if (k === 0){ c.beginPath(); c.ellipse(0, 0, 1.5, 1, 0, 0, TAU); c.fill(); for (const [x, y] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]]){ c.beginPath(); c.arc(x, y, .4, 0, TAU); c.fill(); } c.beginPath(); c.arc(1.9, 0, .45, 0, TAU); c.fill(); }
      else if (k === 1){ c.beginPath(); c.moveTo(-2, .6); c.quadraticCurveTo(0, 1.8, 2, .6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, .6); c.lineTo(-1.2, -1.8); c.quadraticCurveTo(0, -1, .8, -1.9); c.closePath(); c.stroke(); }
      else if (k === 2){ c.beginPath(); for (let i = 0; i < 8; i++){ const a = i / 8 * TAU, r = i % 2 ? .5 : 1.7; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
      else if (k === 3){ c.beginPath(); c.moveTo(-2, .8); c.lineTo(.2, -1.8); c.lineTo(1.2, .8); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-2.4, 1); c.lineTo(2.4, 1); c.stroke(); }
      else { c.beginPath(); c.ellipse(-.3, 0, 1.5, .8, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(1, 0); c.lineTo(2.2, -.9); c.lineTo(2.2, .9); c.closePath(); c.fill(); }
      c.restore(); break; }
    case 'drum': {   // the slit drum (lali, pātē): a hollowed log, beaten with two sticks; the sound goes out in rings
      blob(5.2, -.6, 3.4, 1.2, '#6B4428'); line(3.2, -1.1, 7.2, -1.1, '#1F140D', .45);
      const a = Math.sin(t * 7), b = Math.sin(t * 7 + Math.PI);
      line(1.9, -5.2, 4.2, -2 - Math.max(0, a) * 2.4, '#8C6440', .5); line(1.9, -4.7, 6.2, -2 - Math.max(0, b) * 2.4, '#8C6440', .5);
      const q = (t * 1.2) % 1; c.globalAlpha = 1 - q; c.strokeStyle = '#2B1D14'; c.lineWidth = .3; c.beginPath(); c.arc(5.2, -2, 2 + q * 5, -2.4, -.7); c.stroke(); c.globalAlpha = 1; break; }
    // ---- the second looks of free time, and the village sitting and dancing together
    case 'kitepull': {   // a bird kite (manu) that swoops and climbs again; the line pulled in hand over hand
      const a = t * 1.1, kx = 14 + Math.cos(a) * 4, ky = -24 + Math.sin(a * 2) * 4, rot = Math.cos(a) * .9, h = Math.sin(t * 5);
      c.strokeStyle = '#6B4428'; c.lineWidth = .3; c.beginPath(); c.moveTo(1.9, -5.6 + h * .4); c.quadraticCurveTo(kx * .5, ky * .25, kx, ky + 1.4); c.stroke();
      c.save(); c.translate(kx, ky); c.rotate(rot); const M = new Path2D('M0-1L-4.2-2.6Q-2.2 0-.6 1.2L0 3L.6 1.2Q2.2 0 4.2-2.6Z'); c.fillStyle = '#E9DCC0'; c.fill(M); stroke(c, M, '#2B1D14', .35);
      line(-1.6, -1.2, -.4, .6, '#B03A2E', .3); line(1.6, -1.2, .4, .6, '#B03A2E', .3); c.restore();
      break; }
    case 'stringshow': {   // the finished figure held up high and turned, for the others to guess what it is
      const up = .7 + .3 * Math.sin(t * 1.6), y = -6 - up * .8, x0 = 1.9, x1 = 6, mx = (x0 + x1) / 2;
      c.strokeStyle = '#B03A2E'; c.lineWidth = .3; c.beginPath(); c.moveTo(x0, y); c.lineTo(mx, y - 1.6); c.lineTo(x1, y); c.lineTo(mx, y + 1.6); c.closePath(); c.moveTo(x0, y); c.lineTo(x1, y); c.moveTo(mx, y - 1.6); c.lineTo(mx, y + 1.6); c.stroke(); break; }
    case 'hiko2': {   // two nuts round and round in one hand, the third thrown high from the other now and then
      for (let k = 0; k < 2; k++){ const a = (t * 1.6 + k / 2) * TAU; blob(2.2 + Math.cos(a) * 1.1, -11.6 + Math.sin(a) * 1.8, .7, .7, '#7A5434'); }
      const g = (t * .35) % 1; blob(-1.6, -9 - Math.sin(g * Math.PI) * 9, .7, .7, '#A0703E');
      break; }
    case 'doze': {   // sitting against a trunk, the head nods, sleep comes
      const q = (t * .4) % 1; c.globalAlpha = (1 - q) * .8; c.fillStyle = '#2B1D14'; c.font = `800 ${2 + q * 1.4}px "Alegreya Sans", sans-serif`; c.fillText('z', 1.6 + q * 2, -11 - q * 5); c.globalAlpha = 1;
      break; }
    case 'drum2': {   // standing at the big drum: one heavy beater, slow strokes that carry far
      blob(5.6, -1, 3.8, 1.5, '#5A3B24'); line(3.2, -1.8, 8, -1.8, '#1F140D', .5);
      const u = Math.max(0, Math.sin(t * 3.2)), hx = 4.6 - u * .6, hy = -2.6 - u * 3.4; hold(4, -2.2, 1.9, -4.4); line(hx - .6, hy + .8, hx + .6, hy, '#8C6440', .7); blob(hx + .7, hy, .55, .55, '#6B4428'); unhold();
      const q = (t * .51) % 1; c.globalAlpha = 1 - q; c.strokeStyle = '#2B1D14'; c.lineWidth = .35; c.beginPath(); c.arc(5.6, -2.4, 2.6 + q * 7, -2.5, -.6); c.stroke(); c.globalAlpha = 1; break; }
    case 'toyline': {   // wading, the toy outrigger pulled behind on a cord; it rides the ripples
      c.fillStyle = '#79C6B8'; c.fill(WADE); stroke(c, ellipse(0, -.2, 3.6, 1.1), '#F4ECD8', .55, null, null, .9);
      const x = -7 + Math.sin(t * 1.2) * .8, y = 1.2 + Math.sin(t * 2.4) * .3; line(-1.5, -4.2, x + 1, y, '#6B4428', .25);
      c.save(); c.translate(x, y); blob(0, 0, 1.6, .45, '#8C5C36'); line(-.4, -.1, -.4, 1, '#6B4428', .25); line(-1, 1.1, 1.2, 1.1, '#6B4428', .35);
      const S = new Path2D('M0-.2L-1.4-3.8Q-.2-2.6 .3-3.6Q.2-1.6 0-.2Z'); c.fillStyle = '#E9DCC0'; c.fill(S); stroke(c, S, '#2B1D14', .25); c.restore();
      dot(x + 2, y + .3, .3, '#F4FBFA', .7); break; }
    case 'wear': {   // the finished garland put on: up over the head, then worn, a moment to be admired
      const p = (t * .3) % 1, y = p < .5 ? -4 - p * 2 * 6.2 : -10.2, col = ['#E86A8A', '#F4ECD8', '#F3D9A0'];
      for (let k = 0; k < 8; k++){ const a = k / 8 * TAU; dot(Math.cos(a) * 1.9, y + Math.sin(a) * .55, .5, col[k % 3]); }
      break; }
    case 'sand': {   // the old one draws in the sand with a stick while telling: a turtle takes shape
      const p = (t * .18) % 1, n = Math.floor(p * 12), P = [[3, -.6], [4, -1.4], [5, -.6], [6, -1.4], [7, -.6], [7.6, .2], [6.4, .6], [5, .6], [3.6, .6], [3, -.6], [4.2, 0], [5.8, 0]];
      c.strokeStyle = '#8C7A5A'; c.lineWidth = .3; c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= n && k < P.length; k++) c.lineTo(P[k][0], P[k][1]); c.stroke();
      const e = P[Math.min(n, P.length - 1)]; line(1.9, -4.4, e[0], e[1], '#8A6040', .4); break; }
    case 'nod': {   // listening, the chin on the hand, nodding along
      break; }
    case 'clap': {   // clapping along: the hands meet before the chest
      const k = Math.abs(Math.sin(t * 5));
      if (k < .2){ c.strokeStyle = '#2B1D14'; c.lineWidth = .3; c.beginPath(); c.arc(2.2, -8.1, 1.6, -1.2, -.2); c.stroke(); } break; }
    case 'kava': {   // kava in the evening: from the wooden bowl in a half coconut shell, drunk in one go
      blob(5.4, -.4, 2, .7, '#7A5434'); blob(5.4, -.7, 1.5, .35, '#B8A27A');
      const p = (t * .35) % 1, up = p < .5 ? Math.sin(p * 2 * Math.PI) : 0, cx = 2.9 - up * .5, cy = -5 - up * 3;
      blob(cx, cy, .9, .55, '#6B4428'); break; }
    case 'chat': {   // talking with the hands; the words go out in little arcs
      
      const q = (t * .7) % 1; if (q < .6){ c.globalAlpha = 1 - q / .6; c.strokeStyle = '#2B1D14'; c.lineWidth = .3; for (let k = 0; k < 2; k++){ c.beginPath(); c.arc(2.6, -9.4, 1.4 + k * .9 + q, -1, -.2); c.stroke(); } c.globalAlpha = 1; } break; }
    case 'eat': {   // a meal from the earth oven on a leaf, hand to mouth
      blob(4.6, -.2, 2, .55, '#5E8A3A'); blob(4.2, -.5, .7, .45, '#E3C35A'); blob(5.2, -.5, .6, .4, '#B58A5A');
      const p = (t * .5) % 1, up = Math.sin(Math.min(1, p * 2) * Math.PI); if (p < .5) blob(2.6 - up * .8, -4.8 - up * 3.4, .5, .4, '#E3C35A'); break; }
    case 'fan': {   // fanning in the heat with a fan of plaited palm leaf
      const a = Math.sin(t * 6) * .5; c.save(); c.translate(2.3, -5.6); c.rotate(a - .4); const F = new Path2D('M0 0L-.6-2.6Q.9-3.6 2.4-2.4Z'); c.fillStyle = '#DCC48C'; c.fill(F); stroke(c, F, '#2B1D14', .3); c.restore(); break; }
    case 'siva': {   // the dance: knees bent, the hands tell the story in soft waves
      break; }
    case 'clapd': {   // in the ring they clap above the head to the drum
      const k = Math.abs(Math.sin(t * 4));
      if (k < .2){ c.strokeStyle = '#2B1D14'; c.lineWidth = .3; c.beginPath(); c.arc(.6, -11.6, 1.8, -2.4, -.7); c.stroke(); } break; }
    case 'hop': {   // children jumping to the drum, the arms flung up
      break; }
    case 'drink': {   // a green coconut tipped to the mouth
      const up = .5 + .5 * Math.sin(t * 1.4), x = 1.6 - up * .2, y = -7.6 - up * 1.2;
      blob(x + .8, y + 1.2, 1.2, 1.05, '#7E9A3A'); if (up > .8) dot(x - .2, y + .6, .25, '#F4FBFA'); break; }
    case 'stretch': {   // arms up, a long breath
      const u = Math.min(1, Math.sin(Math.min(1, (1 - w.wait / (w.boutT || 2400))) * Math.PI) * 1.6), sk = SKINS[+w.look[0]];
      void u; break; }
    case 'wipe': {   // the back of the hand across the brow, a drop runs down
      const q = (t * .8) % 1; dot(-1.4, -9 + q * 4, .25, '#BFE3EA', 1 - q); break; }
  }
  while (held) unhold();
}
/* how high a climber is up the palm: up, a while at the crown, down again */
const climbH = w => { const p = clamp(1 - w.wait / (w.boutT || 5600), 0, 1); return 15 * (p < .3 ? smooth01(p / .3) : p > .78 ? smooth01((1 - p) / .22) : 1); };
const MARK = new Path2D('M-2.3-18.2Q0-18.8 2.4-18.1L.2-14.6Q-.4-15.6-2.3-18.2Z');
/* Who works where: over each workplace a little tag with one mark per place. Close up, or for the selected building. */
function slotsOf(I, b, sf, on){
  const K = KINDS[b.kind]; let n, open;
  if (b.bt){ if (K.plant) return null; n = open = SITE_CREW; }
  else if (b.kind === 'werft'){ if (!I.yard) return null; n = open = YARD_CREW; }
  else if (b.boat > 0) n = open = 1;
  else if (K.crew){
    // a place always shows its fixed places: its own people at work, its own people away (building, helping elsewhere: they
    // come back), then guests who help here (smaller, with a plus), then the free places
    const own = (sf.home && sf.home.get(b)) || [], pres = sf.crewP.get(b) || [], ownIn = own.filter(id => pres.includes(id)).length, ownOut = own.length - ownIn;
    const guests = Math.max(0, pres.length - ownIn), here = Math.min(pres.length, on.get(b) || 0), cap = capOf(b), marks = [];
    let g = guests; for (let i = 0; i < K.crew; i++) marks.push(i < ownIn ? (i < here ? 'on' : 'way') : i < ownIn + ownOut ? 'away' : g > 0 ? (g--, 'aid') : i < cap ? 'free' : 'off');
    for (; g > 0; g--) marks.push('aid');
    return marks;
  }
  else return null;
  const crew = sf.crew.get(b) || 0, here = Math.min(crew, on.get(b) || 0);
  return Array.from({length:n}, (_, i) => i < Math.min(here, n) ? 'on' : i < Math.min(crew, n) ? 'way' : i < open ? 'free' : 'off');
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
      const K = KINDS[b.kind], step = b.kind === 'werft' && I.yard ? `${yardStep(I.yard) + 1}/6` : '', w = sl.length * 5 + 3 + (step ? 12 : 0), top = b.bt ? K.hy * Math.max(.35, 1 - b.bt / K.bt) : K.hy * ((b.v && b.v.scale) || 1);
      c.save(); c.translate(b.x, b.y - top - 4); c.scale(s, s);
      const p = tagPath(-w / 2, -7.4, w, 8.4, b.id); c.globalAlpha = .92; c.fillStyle = '#F4ECD8'; c.fill(p); c.globalAlpha = 1; stroke(c, p, '#3E2416', .6, null, 'round');
      sl.forEach((k, i) => { c.save(); c.translate(-w / 2 + 4 + i * 5, -.9); blit(c, 'pip|' + k, PIP[k]); c.restore(); });
      // the canoe house also shows which of its six steps it is at
      if (step){ c.font = '800 5.4px "Alegreya Sans", sans-serif'; c.fillStyle = '#2B1D14'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(step, w / 2 - 1.6, -3.1); }
      c.restore();
    }
  }
}
const MAT = roundRect(-3.2, -.9, 6.4, 1.8, .6), MAT_L = roundRect(-5.8, -2.4, 11.6, 3, .8);
function drawCritter(c, a){
  const hop = a.moving && !reduced ? -Math.abs(Math.sin(a.phase)) * (a.kind === 'chicken' ? .9 : .5) : 0;
  c.save(); c.translate(a.x, a.y + hop); if (a.left) c.scale(-1, 1); if (a.kind === 'chicken' && a.peck > 0) c.rotate(.35);
  blit(c, 'cr|' + a.kind, `<use href="#${a.kind}"/>`); c.restore();
}
/* What an island lacks floats as a small bubble over some of its houses; a heart rises when someone moves in */
const bubbleArt = inner => `<path d="M-6.1-13.7Q-1.2-14.5 6.4-13.8Q7-8.2 6.1-2.4Q3.4-1.9 1.6-2.2L0 .6L-1.5-2.1Q-4.2-1.8-6.4-2.5Q-7.1-8.1-6.1-13.7Z" fill="#F4ECD8" stroke="#3E2416" stroke-width=".9" stroke-linejoin="round"/>${inner}`;
const UP_BUBBLE = bubbleArt('<g transform="translate(-4.6 -12.9) scale(.46)"><use href="#ic-knot"/></g><g transform="translate(3.1 -11.2)" fill="#F7F1E3" stroke="#2B1D14" stroke-width=".28">' + [0, 72, 144, 216, 288].map(a => `<ellipse cy="-1.05" rx=".72" ry="1.12" transform="rotate(${a})"/>`).join('') + '<circle r=".55" fill="#E3B23C"/></g>');
const LEAVE_BUBBLE = bubbleArt('<use href="#ic-einbaum" transform="translate(-4.6 -12.8) scale(.46)"/>').replace('#F4ECD8', '#F3C9B4');   // this family packs its canoe
const needBubble = k => bubbleArt(`<use href="#ic-${k}" transform="translate(-4.6 -12.8) scale(.46)"/>`);
const PLANT_ART = {palme:'palm', pandanus:'pan', baum:'tree'};
/* An idle workshop shows what it lacks: a good, or the plants it needs close by */
const idleBubble = w => w.why === 'use' ? ['need|' + w.k, needBubble(w.k)] : w.why === 'crew' ? ['need|pop', needBubble('pop')] : w.why === 'boat' || w.why === 'carving' ? ['need|einbaum', needBubble('einbaum')] : w.why === 'space' ? ['need|sapling', needBubble('sapling')] :
  w.why === 'wind' || w.why === 'storm' ? ['need|wind', needBubble('sturm')] : w.why === 'night' ? ['need|night', needBubble('plejaden')] : w.why === 'fallow' ? ['need|soil', bubbleArt('<use href="#tuft" transform="translate(0 -5) scale(1.3)"/>')] : w.why === 'nuts' ? ['idle|palme', bubbleArt('<use href="#palm" transform="translate(0 -3.2) scale(.36)"/>')] : w.why === 'trees' ? ['idle|wald', bubbleArt('<use href="#wt0" transform="translate(0 -3) scale(.38)"/>')] : PLANT_ART[[].concat(w.kind)[0]] ? ['idle|' + w.kind, bubbleArt(`<use href="#${PLANT_ART[[].concat(w.kind)[0]]}" transform="translate(0 -3.2) scale(.36)"/>`)] : ['need|tapa', needBubble('tapa')];
/* every bubble drawn this frame, so a tap on it leads to what helps (see hitBubble) */
let bubbleHits = [];
const hitBubble = p => bubbleHits.filter(q => Math.hypot(p.x - q.x, p.y - q.y) < q.r).sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0] || null;
/* what a tap on a bubble does: what is missing leads to the building that makes it (or the household craft, or the
   canoes); a house ready to rise, a place that waits for people, a family that wants to leave open their sheet */
function needGo(I, k, b){
  if (k === 'haus'){ closeSheet(); hintBuild('haus'); return; }
  const w = wantWay(I, k, b && HOME_KINDS.has(b.kind) ? b : null);
  if (w.build){ closeSheet(); hintBuild(w.build); return; }
  if (w.fleet){ closeSheet(); setBar('fleet'); return; }
  if (b) select(b); toast(`${GN[k] || k}: ${w.text}.`, 3600, false);
}
function drawNeeds(c, v, now){
  const s = clamp(1 / cam.z, 1, 1.8); bubbleHits = [];
  const hit = (x, y, go) => bubbleHits.push({x, y:y - 7.5 * s, r:Math.max(8 * s, 12 / cam.z), go});
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v)) continue;
    for (const b of I.buildings){
      if (!b.idle || b.idle.why === 'full' || b.idle.why === 'way' || b.idle.why === 'rahui' || b.idle.why === 'grow' || b.idle.why === 'yam' || (b.idle.why === 'crew' && lod === 'near') || !ptIn(b.x, b.y, v)) continue;
      const [key, art] = idleBubble(b.idle), bob = reduced ? 0 : Math.sin(now / 600 + b.id) * .8, by = b.y - KINDS[b.kind].hy - 14 + bob, w = b.idle;
      put(c, b.x, by, s, 1, 0, key, art); hit(b.x, by, () => w.why === 'use' && w.k ? needGo(I, w.k, b) : select(b));
    }
    for (const b of I.buildings) if (KINDS[b.kind].soil && !b.bt && !b.fallow && (b.soil ?? 1) < .35 && !b.idle && ptIn(b.x, b.y, v)){ put(c, b.x, b.y - 14, s, 1, 0, 'need|soil', needBubble('soil')); hit(b.x, b.y - 14, () => select(b)); }
    for (const b of lagoonOf(I).need) if (!lagoonOf(I).served.has(b) && !b.idle && ptIn(b.x, b.y, v)){ put(c, b.x, b.y - KINDS[b.kind].hy - 14, s, 1, 0, 'need|einbaum', needBubble('einbaum')); hit(b.x, b.y - KINDS[b.kind].hy - 14, () => select(b)); }
    // over each house what its family lacks; over the meeting house a roof, while families sleep there without one
    const list = needsOf(I).list, S = I.storm && tick < I.storm.at ? I.storm : null;
    for (const b of I.buildings){
      if (!ptIn(b.x, b.y, v)) continue;
      // a cyclone on the way: over every loose roof a cord, shaking; a tap sends the people to the roofs
      if (S && homeOk(I, b) && !S.tied.includes(b.id)){ const sc = (b.v && b.v.scale) || 1, by = b.y - KINDS[b.kind].hy * sc - 12 + (reduced ? 0 : Math.sin(now / 150 + b.id) * 1.1), bb = b;
        put(c, b.x, by, s * 1.1, 1, reduced ? 0 : Math.sin(now / 190 + b.id) * .12, 'need|schnur', needBubble('schnur')); hit(b.x, by, () => S.tie ? select(bb) : tieRoofs(I)); continue; }
      let k = null;
      if ((b.kind === 'halle' && !b.bt || b.kind === 'platz' && !I.buildings.some(q => q.kind === 'halle' && !q.bt)) && roofless(I)) k = 'haus';
      else if (homeOk(I, b)){ const f = famOfHome(I, b); if (f){ const miss = famNeeds(I, f, list).filter(n => n.state === 'out'); if (miss.length) k = miss[Math.floor(now / 2400 + b.id) % miss.length].k; } }
      // a house that can rise shows the arrow, as in Anno
      const up = !k && !I.autoUp && homeOk(I, b) && canUpgrade(I, b, list);
      if (!k && !up) continue;
      const bob = reduced ? 0 : Math.sin(now / 600 + b.id) * .8, sc = (b.v && b.v.scale) || 1;
      const by = b.y - KINDS[b.kind].hy * sc - 12 + bob;
      if (up){ put(c, b.x, by + bob * .6, s * 1.1 * (reduced ? 1 : 1 + Math.max(0, Math.sin(now / 420 + b.id)) * .06), 1, reduced ? 0 : Math.sin(now / 900 + b.id) * .08, 'need|up', UP_BUBBLE); hit(b.x, by, () => select(b)); }
      else { put(c, b.x, by, s, 1, 0, 'need|' + k, needBubble(k)); const kk = k; hit(b.x, by, () => needGo(I, kk, HOME_KINDS.has(b.kind) ? b : null)); }
    }
  }
  // hunger has lasted a while: over the house of the family that would go first, its canoe, rocking
  for (const I of islands){
    if (!I.settled || (I.hunger || 0) < HUNGER_GO / 2 || !boxIn(I.box, v)) continue;
    const f = leaverOf(I), b = f && f.home && findB(f.home); if (!b || !ptIn(b.x, b.y, v)) continue;
    const sc = (b.v && b.v.scale) || 1, k = (I.hunger - HUNGER_GO / 2) / (HUNGER_GO / 2), rock = reduced ? 0 : Math.sin(now / (260 - 140 * k)) * (.08 + .12 * k);
    put(c, b.x + 9, b.y - KINDS[b.kind].hy * sc - 10, s * (1.05 + .15 * k), 1, rock, 'need|leave', LEAVE_BUBBLE); hit(b.x + 9, b.y - KINDS[b.kind].hy * sc - 10, () => select(b));
  }
  // a place called with the conch: the horn over it, sounding
  for (const I of islands){ if (!I.settled || !boxIn(I.box, v)) continue;
    for (const b of I.buildings){ if (!b.prio || !ptIn(b.x, b.y, v)) continue;
      const sc = (b.v && b.v.scale) || 1, top = b.bt ? KINDS[b.kind].hy * .5 : KINDS[b.kind].hy * sc, pulse = reduced ? 1 : 1 + Math.max(0, Math.sin(now / 260)) * .08;
      put(c, b.x - 10, b.y - top - 12 + (reduced ? 0 : Math.sin(now / 500 + b.id) * .8), s * pulse, 1, 0, 'need|horn', needBubble('horn')); hit(b.x - 10, b.y - top - 12, () => select(b)); } }
  // a canoe from far away waits at the beach: the family asks to stay
  for (const sh of ships) if (sh.immig && sh.state === 'moored' && ptIn(sh.x, sh.y, v)){ const bob = reduced ? 0 : Math.sin(now / 500 + sh.id) * 1.2; put(c, sh.x, sh.y - 16 + bob, s * 1.15, 1, 0, 'need|pop', needBubble('pop')); const id = sh.id; hit(sh.x, sh.y - 16, () => openSheet('immig', {ship:id})); }
  const t = now;
  // a house newly bound: blossoms rain on its roof, as garlands are laid on a new house at its blessing
  for (const I of islands) if (I.settled && boxIn(I.box, v)) for (const b of I.buildings){
    const f = b.blessAt ? (t - b.blessAt) / 8000 : 9; if (f < 0 || f >= 1 || !ptIn(b.x, b.y, v)) continue;
    const top = b.y - KINDS[b.kind].hy * ((b.v && b.v.scale) || 1);
    // first the work: a scaffold of bamboo against the house, bundles of fibre drawn up on a cord, the new binding hammered
    // and pulled tight, dust at the posts; then the scaffold comes down and the blossoms fall
    if (f < .55){ const g = f / .55, r = KINDS[b.kind].r, a = g < .12 ? g / .12 : g > .85 ? (1 - g) / .15 : 1, tt = t / 1000;
      c.save(); c.globalAlpha = a; c.lineCap = 'round';
      for (const sx of [-1, 1]){ const x0 = b.x + sx * (r + 3), x1 = b.x + sx * (r - 2);
        c.strokeStyle = '#2B1D14'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, b.y + 3); c.lineTo(x1, top - 5); c.stroke();
        c.strokeStyle = '#C9A35A'; c.lineWidth = .8; c.beginPath(); c.moveTo(x0, b.y + 3); c.lineTo(x1, top - 5); c.stroke();
        for (let k = 1; k < 4; k++){ const q = k / 4, yy = b.y + 3 + (top - 8 - b.y) * q, xa = x0 + (x1 - x0) * q; c.strokeStyle = '#8C6440'; c.lineWidth = .7; c.beginPath(); c.moveTo(xa - sx * 3.4, yy); c.lineTo(xa + sx * 1.2, yy); c.stroke(); } }
      c.strokeStyle = '#8C6440'; c.lineWidth = .8; c.beginPath(); c.moveTo(b.x - r + 2, top - 5); c.lineTo(b.x + r - 2, top - 5); c.stroke();
      // a bundle goes up on its cord, again and again
      { const u = (tt * .9 + b.id) % 1, bx = b.x + r - 3, by = b.y + 2 + (top - 4 - b.y) * u; c.strokeStyle = '#6B4428'; c.lineWidth = .4; c.beginPath(); c.moveTo(bx, top - 5); c.lineTo(bx, by); c.stroke();
        c.fillStyle = '#D8BF86'; c.strokeStyle = '#2B1D14'; c.lineWidth = .35; c.beginPath(); c.ellipse(bx, by, 1.9, 1.2, 0, 0, TAU); c.fill(); c.stroke(); }
      // the binding grows round the house, and chips fly where the adze strikes
      c.strokeStyle = '#E9DCC0'; c.lineWidth = 1; c.setLineDash([1.2, 1.6]); c.beginPath(); c.moveTo(b.x - r * .7, (b.y + top) / 2 + 2); c.lineTo(b.x - r * .7 + r * 1.4 * g, (b.y + top) / 2 + 2); c.stroke(); c.setLineDash([]);
      for (let k = 0; k < 5; k++){ const u = (tt * 2.2 + k * .2) % 1, sx = k % 2 ? 1 : -1; c.globalAlpha = a * (1 - u); c.fillStyle = k % 2 ? '#D9B27A' : '#B89A62'; c.beginPath(); c.arc(b.x + sx * (r * .5 + u * 5), b.y - 1 - Math.sin(u * Math.PI) * 5 - k, .7, 0, TAU); c.fill(); }
      c.restore(); c.globalAlpha = 1;
      if (!reduced && Math.floor(tt * 3) !== b._knk){ b._knk = Math.floor(tt * 3); if (b._knk % 2 === 0) sfx('knock'); }
      continue; }
    const fb = (f - .55) / .45;   // the blessing, once the work is done
    for (let k = 0; k < 18; k++){
      const q = (fb * 1.6 + hsh(k, b.id) * .9) % 1, x = b.x + (hsh(k + 3, b.id) - .5) * 30 + Math.sin(q * 6 + k) * 3, y = top - 14 + q * 30, al = (1 - fb) * (q < .1 ? q * 10 : 1);
      c.save(); c.translate(x, y); c.rotate(q * 5 + k); c.globalAlpha = al; c.fillStyle = ['#E86A8A', '#F7F1E3', '#F3D9A0', '#D9472B'][k % 4]; c.beginPath(); c.ellipse(0, 0, 1.3 * s, .7 * s, 0, 0, TAU); c.fill(); c.restore();
    }
    c.globalAlpha = 1;
    if (fb < .5){ const r = 6 + fb * 50; stroke(c, ellipse(b.x, b.y + 2, r, r * .4), '#F7F1E3', 1.2, [.5, 1.6], 'round', (.5 - fb) * 1.6); }   // the voices go out over the village
  }
  // the morning meal: over every house a bowl rises, full where all of the family ate and drank, empty and red where
  // someone went without (mealTick)
  for (let i = mealFx.length - 1; i >= 0; i--){
    const M = mealFx[i], f = (t - M.t0) / 3400; if (f > 1){ mealFx.splice(i, 1); continue; } if (f < 0) continue;
    const I = isl(M.isl); if (!I || !boxIn(I.box, v)) continue;
    for (const F of famsOf(I)){
      const b = F.home && findB(F.home); if (!b || b.bt || !ptIn(b.x, b.y, v)) continue;
      const bad = M.short.has(F.id), sc = (b.v && b.v.scale) || 1, y = b.y - KINDS[b.kind].hy * sc * .55 - f * 8, al = f < .15 ? f / .15 : f > .7 ? (1 - f) / .3 : 1;
      c.save(); c.translate(b.x - KINDS[b.kind].r * .9, y); c.scale(s, s); c.globalAlpha = al;   // beside the roof, clear of the bubbles
      c.fillStyle = bad ? '#F4ECD8' : '#F3D9A0'; c.strokeStyle = '#2B1D14'; c.lineWidth = .5; c.setLineDash([]);
      c.beginPath(); c.moveTo(-3.6, -1.2); c.quadraticCurveTo(-3.2, 2.6, 0, 2.7); c.quadraticCurveTo(3.2, 2.6, 3.6, -1.2); c.closePath(); c.fill(); c.stroke();   // the bowl
      if (!bad){ c.fillStyle = '#C8902E'; c.beginPath(); c.ellipse(0, -1.2, 3.1, .9, 0, 0, TAU); c.fill(); c.fillStyle = '#6E9A3A'; c.beginPath(); c.ellipse(-1, -1.9, 1.2, .6, -.4, 0, TAU); c.fill(); }   // taro and greens
      else { c.strokeStyle = '#B3261E'; c.lineWidth = .8; c.beginPath(); c.moveTo(-1.6, -3.4); c.lineTo(1.6, -.4); c.moveTo(1.6, -3.4); c.lineTo(-1.6, -.4); c.stroke(); }   // nothing in it
      if (!reduced && !bad && f < .6){ c.globalAlpha = al * (1 - f / .6) * .7; c.strokeStyle = '#F7F1E3'; c.lineWidth = .5; for (const dx of [-1.2, 1.2]){ c.beginPath(); c.moveTo(dx, -2.6 - f * 4); c.quadraticCurveTo(dx + .8, -3.6 - f * 4, dx, -4.6 - f * 4); c.stroke(); } }   // steam
      c.restore();
    }
  }
  if (mealFx.length) requestDraw();
  hearts = hearts.filter(h => t - h.t0 < 1600);
  for (const h of hearts){
    const f = (t - h.t0) / 1600; if (f < 0) continue;
    c.save(); c.translate(h.x, h.y - f * 12); c.scale(s * .9, s * .9); c.fillStyle = '#C8402C'; c.globalAlpha = f < .2 ? f / .2 : 1 - (f - .2) / .8; c.fill(HEART);
    c.lineWidth = .45; c.strokeStyle = '#2B1D14'; c.setLineDash([]); c.stroke(HEART); c.restore();
  }
}
function drawGhost(c){
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
    // the wake: a fading white trail where the canoe has just been
    if (!far && !reduced && s.state === 'sail' && s.trail && s.trail.length > 2){ const tr = s.trail, n = tr.length;
      for (let i = 1; i < n; i++){ const a = tr[i - 1], b = tr[i], f = i / n, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, w = (1 - f) * 5 + 1.5, px = -dy / d * w, py = dx / d * w;
        const p = new Path2D(); p.moveTo(a.x + px, a.y + py); p.lineTo(b.x + px * .8, b.y + py * .8); p.moveTo(a.x - px, a.y - py); p.lineTo(b.x - px * .8, b.y - py * .8);
        stroke(c, p, '#F4FBFA', 1.1, null, 'round', f * .55); } }
    // spray at the bow, more when the wind is strong; the canoe leans into a turn
    if (!far && !reduced && s.state === 'sail'){
      const hx = s.hx || 1, hy = s.hy || 0, str = wind().str, bx = s.x + hx * 11 * ks, by = s.y + hy * 6 * ks + 1;
      for (let i = 0; i < 3; i++){ const f = (now / 420 + i / 3 + s.id * .37) % 1, side = i % 2 ? 1 : -1, P = new Path2D();
        const x = bx - hx * f * 6 - hy * side * (2 + f * 4), y = by - hy * f * 4 + hx * side * (1 + f * 2) - Math.sin(f * Math.PI) * (2 + str * 3);
        P.moveTo(x - 1.4, y); P.quadraticCurveTo(x, y - 1.6, x + 1.4, y); stroke(c, P, '#F4FBFA', .9, null, 'round', (1 - f) * (.5 + str * .4)); }
    }
    { const a = Math.atan2(s.hy || 0, s.hx || 1), d = s._ha == null ? 0 : Math.atan2(Math.sin(a - s._ha), Math.cos(a - s._ha)); s._ha = a; s.heel = (s.heel || 0) * .92 + clamp(d * 6, -.12, .12) * .08; }
    c.save(); c.translate(s.x, s.y); c.scale(ks, ks);
    if (s === S){ const t = reduced ? .5 : (now % 1600) / 1600; sketch(c, 0, 1, 16 + 3 * t, 8 + 1.5 * t, s.id * 5, '#F4ECD8', 2.2, .95); }
    // the canoe's shadow on the water, the sail's longest
    const sh = far ? null : sunShadow();
    if (sh && sh.alpha > 0){ c.save(); c.transform(1, 0, sh.c, sh.d, 0, 0); if (s.kind === 'oc'){ c.scale(1.3, 1.3); if ((s.face || (s.hx < 0 ? -1 : 1)) < 0) c.scale(-1, 1); blitShadow(c, 'oc', '<use href="#oc"/>', sh.alpha * .55); } else { const up = s.up ?? s.hy < 0, left = (s.face || (s.hx < 0 ? -1 : 1)) < 0; if (up ? left : !left) c.scale(-1, 1); blitShadow(c, up ? 'dc' : 'dcIn', up ? '<use href="#dc"/>' : '<use href="#dcIn"/>', sh.alpha * .55); } c.restore(); }
    // the swell rocks the canoe, it heels in a turn
    c.save(); if (!reduced && !far) c.rotate(Math.sin(now / 820 + s.id) * (s.state === 'sail' ? .05 : .025) + (s.state === 'sail' ? (s.heel || 0) : 0));
    const crew = !far && cam.z > .45 && !s.race;   // close enough to see who is aboard
    if (s.kind === 'oc'){ c.scale(1.3, 1.3); if ((s.face || (s.hx < 0 ? -1 : 1)) < 0) c.scale(-1, 1); blit(c, 'oc', '<use href="#oc"/>');
      // two paddlers in the hull of the outrigger canoe
      if (crew) for (let k = 0; k < 2; k++){ const px = k ? 4.6 : -4.4; seatedFig(c, crewLook(s, k), false, px, -.9, .82); if (s.state === 'sail') paddleStroke(c, px, -.9, .82, now, s.id + k * 1.7); } }
    else { const up = s.up ?? s.hy < 0, left = (s.face || (s.hx < 0 ? -1 : 1)) < 0; if (up ? left : !left) c.scale(-1, 1); if (s.kind === 'vaka') c.scale(1.25, 1.25);   // the voyaging canoe: a bigger double canoe
      if (!crew) blit(c, up ? 'dc' : 'dcIn', up ? '<use href="#dc"/>' : '<use href="#dcIn"/>');
      else {
        // the double canoe: the hull, the people on the platform and the steersman at the stern, then the sail over them
        blit(c, up ? 'dcB' : 'dcInB', up ? '<use href="#dcBase"/>' : '<use href="#dcInBase"/>');
        const a = (up ? -24 : 156) * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), at = (px, py) => ({x:px * co - py * si, y:px * si + py * co});
        const spots = [[-12.6, -1.4], [-5.4, -1.2], [2.6, -1.4], [-1.4, .4], [5.2, .6]].slice(0, Math.min(5, 3 + Math.ceil((s.people || 0) / 3))).map(([px, py]) => at(px, py)).sort((p, q) => p.y - q.y);
        spots.forEach((p, k) => { c.save(); c.translate(p.x, p.y + 1.2); c.scale(.78, .78); blit(c, 'fig|' + crewLook(s, k), () => figureArt(crewLook(s, k))); c.restore(); });
        // the mat sail fills with the wind: fuller when it blows hard, slack in a calm
        { const fill = s.state === 'sail' ? .88 + wind().str * .26 : .9; c.save(); c.scale(fill, 1); blit(c, up ? 'dcS' : 'dcInS', up ? '<use href="#sail" transform="translate(2.5 -3) scale(1.05)"/>' : '<use href="#sail" transform="translate(-2.5 -3) scale(-1.05 1.05)"/>'); c.restore(); }
      } }
    c.restore();
    if (!far) shipPanel(c, s);
    c.restore();
  }
}
const crewLook = (s, k) => figureLook((s.own ? s.id : 900 + s.id) * 53 + k * 11);   // the same faces aboard each canoe
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
  seaNames(c, k); drawNavHints(c, performance.now());
  for (const I of islands){
    if (!I.discovered || !ptIn(I.labelAt.x, I.labelAt.y, v)) continue;
    label(c, I.labelAt.x, I.labelAt.y, k, I.name, I.clan ? I.clan.name : I.settled ? `${I.pop} Bewohner, ${LEVEL_NAMES[I.lvl || 1]}${specOf(I) ? ' · ' + SPECS[specOf(I)].s : ''}` : I.treasure ? `Schatzinsel: ${GN[I.treasure.k]}` : specOf(I) ? `unbewohnt · ${SPECS[specOf(I)].s}` : 'unbewohnt');
    // a treasure island shows what it gives next to its name
    if (I.treasure) put(c, I.labelAt.x, I.labelAt.y + 24 * k, k * .9, 1, 0, 'tr|' + I.treasure.k, `<use href="#ic-${I.treasure.k}" transform="translate(-10 -10)"/>`);
    // the patterns stamped here, the island's own first: on the chart one sees how far each has travelled
    const ms = I.settled || I.clan ? motifsOf(I).slice(0, 5) : [];
    ms.forEach((m, i) => put(c, I.labelAt.x + (i - (ms.length - 1) / 2) * 18 * k, I.labelAt.y + (I.treasure ? 46 : 26) * k, k * .8, 1, 0, 'mo|' + m, MOTIF_ART[m]));
  }
}
/* What the voyagers read (see navHints): birds that fly out from hidden land at dawn and home at dusk; with a navigator
   the swell bending around it in slow arcs; from the second level on a cloud that stands still over it while the others
   drift, green underneath over a lagoon */
function drawNavHints(c, now){
  const H = navHints(); if (!H.length) return;
  const v = view(300), p = dayPhase(), k = clamp(1.2 / cam.z, .8, 4.5);
  for (const {I, near, cloud, swell} of H){
    if (!boxIn(I.box, v)) continue;
    const dx = near.cx - I.center.x, dy = near.cy - I.center.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (cloud){
      // a cloud that stands still over land while others pass: drawn as puffs with one outline, the underside grey, or green over a lagoon
      const R = (I.atoll ? 1.15 : 1) * Math.max(1, .3 / cam.z), puffs = [[-44, 4, 30], [-14, -14, 40], [24, -8, 36], [50, 6, 26], [4, 10, 34]];
      c.save(); c.translate(I.center.x, I.center.y - 40); c.scale(R, R); c.lineWidth = 2.4 / (cam.z * R); c.strokeStyle = 'rgba(30,20,16,.5)';
      const shape = () => { c.beginPath(); for (const [x, y, r] of puffs){ c.moveTo(x + r, y * .6); c.ellipse(x, y * .6, r, r * .62, 0, 0, TAU); } };
      shape(); c.stroke(); c.fillStyle = '#FBF8EF'; shape(); c.fill();
      c.save(); shape(); c.clip(); const u = c.createLinearGradient(0, -4, 0, 30); u.addColorStop(0, I.atoll ? 'rgba(121,198,184,0)' : 'rgba(140,140,135,0)'); u.addColorStop(1, I.atoll ? 'rgba(121,198,184,.8)' : 'rgba(140,140,135,.45)'); c.fillStyle = u; c.fillRect(-90, -4, 180, 50); c.restore();
      c.restore();
    }
    if (swell){   // the swell bends around the land and runs on towards the known sea, arc after arc, fading
      const a = Math.atan2(uy, ux); c.save(); c.lineCap = 'round'; c.lineWidth = 2.4 / Math.min(cam.z, 1.5); c.setLineDash([9 / Math.min(cam.z, 1.5), 6 / Math.min(cam.z, 1.5)]);
      for (let i = 0; i < 3; i++){ const f = (now / 6000 + i / 3) % 1, r = 70 + f * 230; c.strokeStyle = `rgba(110,68,40,${(.7 * (1 - f)).toFixed(3)})`; c.beginPath(); c.ellipse(I.center.x, I.center.y, r, r * .85, 0, a - .5, a + .5); c.stroke(); }
      c.restore();
    }
    // at dawn the birds fly out towards the known sea, at dusk they come home; in between they fish far out
    const out = p < .25 ? p / .25 : p < .45 ? 1 : p < .62 ? 1 - (p - .45) / .17 : 0; if (out <= 0) continue;
    for (let i = 0; i < 4; i++){
      const f = ((now / 9000 + i * .23 + I.center.x * .01) % 1) * .35, dist = 90 + (out * .8 + f) * Math.min(d, 520), side = (i - 1.5) * 12;
      const x = I.center.x + ux * dist - uy * side, y = I.center.y + uy * dist + ux * side;
      c.save(); c.translate(x, y); c.scale(k, k); stroke(c, Math.sin(now / 200 + i * 2) > -.2 ? BIRD1 : BIRD2, '#1E1410', 1.2, null, 'round', .9); c.restore();
    }
  }
}
/* The open sea has names too: written faintly on the chart, even where the fog still lies */
function seaNames(c, k){
  const y = home0.home.y + 40, names = [[FAR_X + (EMPTY_X - FAR_X) / 2, 'Die Fernen Inseln'], ...(stats.hawaiki ? [[(EMPTY_X + MORN_X) / 2, 'Die Leere See'], [MORN_X + (W - MORN_X) / 2, 'Die Inseln des Morgens']] : [])];
  if (home0.v >= 2) names.unshift([(WIDE_X + FAR_X) / 2, 'Die Weite See']);
  const fs = 17 / cam.z;   // the same size on screen at any zoom
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `italic 700 ${fs.toFixed(1)}px Alegreya, Georgia, serif`;
  for (const [x, t] of names){ c.globalAlpha = .6; c.fillStyle = '#F4ECD8'; c.fillText(t, x, y); c.globalAlpha = .35; c.fillText('·  ·  ·', x, y + fs * 1.1); }
  c.restore();
}

/* ---------- the open sea: two layers of wave marks drift slowly and evenly with the wind, the upper one a little faster,
   and rise and fall gently. They fade out far away, where they would only flicker. */
let seaX = 0, seaY = 0, seaAt = 0;
function drawSea(now){
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2F5F73'; ctx.fillRect(0, 0, mapC.width, mapC.height);
  const P = pats.pSeaW; if (!P || cam.z <= .3) return;
  const W = wind(), dt = Math.min(100, now - (seaAt || now)); seaAt = now;
  if (!reduced){ seaX += W.tx * (1.6 + 1.4 * W.str) * dt / 1000; seaY += W.ty * (1.6 + 1.4 * W.str) * dt / 1000; }
  camXform(ctx); const v = view(40), t = reduced ? 0 : now / 1000, fade = clamp((cam.z - .3) / .35, 0, 1);
  for (const [k, sp, a, bob] of quality ? [[1.7, .55, .45, 1.2], [1, 1, .9, .6]] : [[1, 1, .9, .6]]){   // on a slow device one layer of waves
    const ox = seaX * sp, oy = seaY * sp + Math.sin(t * .8 + k) * bob;
    ctx.save(); ctx.scale(k, k); ctx.translate(((ox / k) % 16 + 16) % 16, ((oy / k) % 10 + 10) % 10);
    ctx.globalAlpha = fade * a; ctx.fillStyle = P; ctx.fillRect(v.x0 / k - 32, v.y0 / k - 32, (v.x1 - v.x0) / k + 64, (v.y1 - v.y0) / k + 64); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
/* ---------- layers and one frame */
function renderLayer(L, paint){
  L.w = vw * OVER; L.h = vh * OVER;
  const pw = Math.round(L.w * DPR), ph = Math.round(L.h * DPR), a = L.at = {x:cam.x, y:cam.y, z:cam.z, lod, sw:swayOn(), dpr:DPR}, k = a.z * DPR;
  if (L.c.width !== pw || L.c.height !== ph){ L.c.width = pw; L.c.height = ph; }
  const c = L.x; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, pw, ph);
  c.setTransform(k, 0, 0, k, (L.w / 2 - a.x * a.z) * DPR, (L.h / 2 - a.y * a.z) * DPR);
  L.dirty = false;
  L.empty = paint(c, {x0:a.x - L.w / 2 / a.z, y0:a.y - L.h / 2 / a.z, x1:a.x + L.w / 2 / a.z, y1:a.y + L.h / 2 / a.z}) === false;
}
/* A layer can be reused while it still covers the screen. During a zoom it is stretched, then repainted sharp. */
function fresh(L, now){
  const a = L.at; if (L.dirty || !a || a.lod !== lod || a.dpr !== DPR || (L === baseL && a.sw !== swayOn())) return false;
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
  drawSea(now); ctx.setTransform(1, 0, 0, 1, 0, 0); blitLayer(baseL);
  camXform(ctx); drawAnim(ctx, now);
  ctx.setTransform(1, 0, 0, 1, 0, 0); if (!fogL.empty) blitLayer(fogL);
  camXform(ctx); drawTop(ctx, now); drawNight(now); drawStorm(now); camXform(ctx); drawLabels(ctx);
  needDraw = false;
}
/* Something moves on screen, so the top layers need regular frames */
const animating = () => !!cyclone || !!selShip || driftFx.length > 0 || (lod !== 'far' && islands.some(I => I.settled && I.buildings.some(b => b.kind === 'steg' && !b.bt))) || ships.some(s => s.state === 'sail' || s.race) || !!placing || hearts.length > 0 || islands.some(I => I.feastEnd > tick) || cam.z > PEOPLE_Z || islands.some(I => I.volcano && seen(I));
