'use strict';
/* Game logic: economy, boats and expeditions, input, main loop and start */

/* ---------- boats and expeditions */
function expCurve(S, T){
  const A = S.harbor, B = T.harbor, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
  return curve(A, {x:(A.x + B.x) / 2 + dy / len * 60, y:(A.y + B.y) / 2 - dx / len * 60}, B);
}
function addBoat(o){
  const b = {...o, t0:o.t0 != null ? o.t0 : performance.now(), q:'NE', x:null, k:1, alpha:0};
  if (b.exp) b.cv = expCurve(isl(b.from), isl(b.to));
  boats.push(b); requestDraw(); return b;
}
function sendBoat(t){
  const r = routes[t.r], F = isl(t.from), load = Object.values(t.cargo).reduce((a, b) => a + b, 0); if (!load) return;
  for (const [k, v] of Object.entries(t.cargo)){ if ((F.stock[k] || 0) < v){ toast(`Zu wenig ${GN[k]}.`); return; } }
  for (const [k, v] of Object.entries(t.cargo)) F.stock[k] -= v;
  const days = tripDays(r, t.from, t.to), w = windOf(t.from, t.to);
  addBoat({route:t.r, from:t.from, to:t.to, cargo:{...t.cargo}, dur:days * DAY * 1000, up:w.f === 3, reverse:r.a !== t.from});
  closeSheet(); updateHUD(); save(); toast(`Das Kanu fährt nach ${isl(t.to).name}. ${days} ${days === 1 ? 'Tag' : 'Tage'}.`);
}
function startTarget(I){
  if (!islands.some(J => !J.discovered)){ toast('Gerade ist kein neues Land in Sicht.'); return; }
  expSource = I.id; closeSheet(); mode = 'target'; overview(); requestDraw(); toast('Tippe auf eine Wolke im Nebel.', 4200);
}
function startExpedition(T){
  const S = isl(expSource); mode = 'idle'; if (!S || !S.canoe) return;
  const A = S.harbor, B = T.harbor, dy = B.y - A.y, len = Math.hypot(B.x - A.x, dy);
  const c = dy / len, f = c < -.35 ? 3 : c > .35 ? 1 : 2, days = Math.max(2, Math.round(len / 480 * f));
  S.canoe = false; invalidate();
  addBoat({exp:true, from:S.id, to:T.id, dur:days * DAY * 1000, up:f === 3, cargo:{}});
  save(); toast(`Das Doppelkanu legt ab. Etwa ${days} Tage.`);
}
function settle(T, S, cv){
  T.discovered = true; T.settled = true; T.pop = 5; T.stock = {holz:4, nahrung:6, toepfe:1, beile:0, matten:0, schnur:0};
  const r = rng(T.center.x | 0);
  if (T.atoll){ T.lands.forEach(L => { for (let i = 0; i < 5; i++){ const q = L.poly[Math.floor(r() * L.poly.length)], c = T.atoll; const p = {x:q.x + (c.cx - q.x) * .06, y:q.y + (c.cy - q.y) * .06}; if (!check('palme', T, p.x, p.y)) addB(T, 'palme', p, {mirror:i % 2, scale:fx(.62 + r() * .15)}, tick - 60); } }); }
  else { palmsAlong(T, r, 16);
    for (let i = 0; i < 4; i++){ const a = r() * TAU, p = {x:T.center.x + Math.cos(a) * 64, y:T.center.y + Math.sin(a) * 46}; if (!check('baum', T, p.x, p.y)) addB(T, 'baum', p, {scale:fx(.9 + r() * .15)}, tick - 60); } }
  const toward = {x:T.harbor.x + (T.center.x - T.harbor.x) * .25, y:T.harbor.y + (T.center.y - T.harbor.y) * .25};
  const hs = findSpot(T, 'haus', toward); if (hs) addB(T, 'haus', hs, variant('haus'), tick);
  routes.push({a:S.id, b:T.id, knots:1});
  fogHoles.push({cx:T.center.x, cy:T.center.y, rx:fx((T.box.x1 - T.box.x0) / 2 + 140), ry:fx((T.box.y1 - T.box.y0) / 2 + 140), seed:T.center.x | 0});
  for (let i = 1; i < 8; i++){ const q = curveAt(cv, i / 8); fogHoles.push({cx:fx(q.x), cy:fx(q.y), rx:150, ry:130, seed:i * 7 + 1}); }
  renderAll(); setActive(T.id); renderBuildBar(); flyTo(T.center.x, T.center.y, 1.3); save();
  toast(`Auf ${T.name} steht das erste Haus. Eine neue Schnur führt nach ${S.name}.`, 4200);
}
function stepBoats(now){
  for (let i = boats.length - 1; i >= 0; i--){
    const b = boats[i], p = clamp((now - b.t0) / b.dur, 0, 1), cv = b.exp ? b.cv : routes[b.route] && routeCurve(routes[b.route]);
    if (!cv){ boats.splice(i, 1); continue; }
    const s = b.reverse ? 1 - p : p, q = curveAt(cv, s), q2 = curveAt(cv, clamp(s + (b.reverse ? -.01 : .01), 0, 1));
    let dx = q2.x - q.x, dy = q2.y - q.y; const dl = Math.hypot(dx, dy) || 1; let x = q.x, y = q.y;
    // against the wind the canoe tacks: it zigzags and turns its bow
    if (b.up){ const cyc = Math.max(3, Math.round(cv.len / 70)), off = Math.sin(p * TAU * cyc) * 13 * Math.sin(p * Math.PI); x += -dy / dl * off; y += dx / dl * off; const tilt = Math.cos(p * TAU * cyc); dx += -dy / dl * tilt * dl * 1.4; dy += dx / dl * tilt * .2; }
    b.q = dy < 0 ? (dx >= 0 ? 'NE' : 'NW') : (dx < 0 ? 'SW' : 'SE');
    b.k = lod === 'far' ? clamp(.9 / cam.z, 1.6, 3.2) : (b.exp ? 1.25 : 1);
    b.x = x; b.y = y; b.alpha = p < .04 ? p / .04 : p > .96 ? (1 - p) / .04 : 1;
    if (p >= 1){
      boats.splice(i, 1);
      if (b.exp) settle(isl(b.to), isl(b.from), b.cv);
      else { const T = isl(b.to), r = routes[b.route]; for (const [k2, v] of Object.entries(b.cargo)) T.stock[k2] = Math.min(storeCap(T), (T.stock[k2] || 0) + v); r.knots = Math.min(12, r.knots + 1); invalidate(); updateHUD(); if (sheetKind) renderSheet(); save(); toast(`Das Kanu ist in ${T.name}. ${r.knots} Knoten.`); }
    }
  }
}

/* ---------- people walking between the houses (close up only) */
function spawnWalkers(){
  walkers = [];
  const cols = ['#A84A2C', '#D9A441', '#6B4A2A', '#C8893A', '#8C5F6E'];
  for (const I of islands){
    if (!I.settled) continue;
    const spots = I.buildings.filter(b => !KINDS[b.kind].water && KINDS[b.kind].roof); if (spots.length < 2) continue;
    const n = clamp(Math.round(I.pop / 8), 1, 5);
    for (let i = 0; i < n; i++){ const a = spots[(i * 3) % spots.length]; walkers.push({isl:I.id, x:a.x + 4, y:a.y + 4, tx:a.x, ty:a.y, col:cols[i % cols.length], wait:0}); }
  }
}
function stepWalkers(dt){
  for (const w of walkers){
    if (w.wait > 0){ w.wait -= dt; continue; }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 1.5){ const I = isl(w.isl); const sp = I.buildings.filter(b => !KINDS[b.kind].water && b.kind !== 'palme' && b.kind !== 'pandanus'); const t = sp[Math.floor(Math.random() * sp.length)]; if (t){ w.tx = t.x + (Math.random() - .5) * 8; w.ty = t.y + 3 + Math.random() * 4; } w.wait = 600 + Math.random() * 1800; continue; }
    const v = Math.min(d, dt * .007); w.x += dx / d * v; w.y += dy / d * v;
  }
}

/* ---------- economy: one step every two seconds, for every island, seen or not */
function econ(){
  tick++;
  for (const I of islands){
    if (!I.settled) continue;
    const st = I.stock, cap = storeCap(I), add = (k, n) => { st[k] = Math.min(cap, (st[k] || 0) + n); };
    if (I.type === 'hoch') add('holz', 1);
    for (const b of I.buildings){ const K = KINDS[b.kind]; if (K.prod && tick % K.every === 0) add(K.prod, 1); }
    if (tick % 2 === 0) st.nahrung = Math.max(0, (st.nahrung || 0) - Math.ceil(I.pop / 12));
    const hc = houseCap(I);
    if ((st.nahrung || 0) > 0 && I.pop < hc) I.pop++; else if (I.pop > hc) I.pop = hc;
  }
  if (tick % 8 === 0) invalidate();   // roofs age
  requestDraw(); updateHUD(); if (placing) ghostRender();
  if (sheetKind === 'info' && sheetSig() !== lastSig) renderSheet();
  if (tick % 3 === 0) save();
}

/* ---------- hit tests and input */
function hitBuilding(p){
  if (lod === 'far') return null; let best = null, bd = Infinity;
  for (const I of islands){ if (!I.settled) continue; for (const b of I.buildings){ const K = KINDS[b.kind]; const d = Math.hypot(p.x - b.x, p.y - (b.y - K.hy * .6)); const lim = Math.max(K.r + 3, 14 / cam.z); if (d < lim && d < bd){ bd = d; best = b; } } }
  return best;
}
function hitCord(p){ const lim = Math.max(9, 16 / cam.z); for (let i = 0; i < routes.length; i++){ for (const q of routeCurve(routes[i]).pts) if (Math.hypot(p.x - q.x, p.y - q.y) < lim) return i; } return -1; }
function hitSign(p){ const lim = Math.max(55, 40 / cam.z); return islands.find(I => !I.discovered && Math.hypot(p.x - I.center.x, p.y - (I.center.y - 10)) < lim) || null; }
function hitIsland(p){ return islands.find(I => I.discovered && onIsland(I, p)) || null; }
function onTap(p){
  if (mode === 'target'){ const T = hitSign(p); if (T) startExpedition(T); else toast('Tippe auf eine Wolke im Nebel.'); return; }
  if (mode === 'place' || mode === 'move'){ placing.x = p.x; placing.y = p.y; ghostRender(); return; }
  const b = hitBuilding(p); if (b){ select(b); return; }
  const ri = hitCord(p); if (ri >= 0){ openTrade(ri); return; }
  const T = hitSign(p); if (T){ toast('Vögel kreisen über einer Wolke. Darunter liegt Land. Bau im Kanuhaus ein Doppelkanu.', 3600); return; }
  const I = hitIsland(p); if (I){ closeSheet(); setActive(I.id); if (lod === 'far') flyTo(I.center.x, I.center.y, 1.4); return; }
  closeSheet();
}
const ptrs = new Map(); let ges = null;
mapC.addEventListener('pointerdown', e => {
  try { mapC.setPointerCapture(e.pointerId); } catch (err){} ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); camAnim = null;
  if (ptrs.size === 1){
    const wp = toWorld(e.clientX, e.clientY);
    const onGhost = placing && Math.hypot(wp.x - placing.x, wp.y - (placing.y - KINDS[placing.kind].hy * .6)) < Math.max(KINDS[placing.kind].r + 8, 26 / cam.z);
    ges = {type:onGhost ? 'ghost' : 'tap', sx:e.clientX, sy:e.clientY, t:performance.now(), cx:cam.x, cy:cam.y, gx:onGhost ? placing.x - wp.x : 0, gy:onGhost ? placing.y - wp.y : 0};
  } else if (ptrs.size === 2){
    const [a, b] = [...ptrs.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ges = {type:'pinch', d0:Math.hypot(a.x - b.x, a.y - b.y) || 1, z0:cam.z, w0:toWorld(mx, my)};
  }
});
mapC.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); if (!ges) return;
  if (ges.type === 'pinch' && ptrs.size >= 2){ const [a, b] = [...ptrs.values()]; zoomAt(ges.z0 * Math.hypot(a.x - b.x, a.y - b.y) / ges.d0, (a.x + b.x) / 2, (a.y + b.y) / 2, ges.w0); return; }
  if (ges.type === 'ghost'){ const wp = toWorld(e.clientX, e.clientY); placing.x = wp.x + ges.gx; placing.y = wp.y + ges.gy; ghostRender(); return; }
  const dx = e.clientX - ges.sx, dy = e.clientY - ges.sy;
  if (ges.type === 'tap' && Math.hypot(dx, dy) > 8) ges.type = 'pan';
  if (ges.type === 'pan'){ cam.x = ges.cx - dx / cam.z; cam.y = ges.cy - dy / cam.z; clampCam(); applyCam(); }
});
function endPtr(e){
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (ges && ges.type === 'tap' && ptrs.size === 0 && performance.now() - ges.t < 600) onTap(toWorld(e.clientX, e.clientY));
  if (ptrs.size === 0) ges = null;
  else if (ges && ges.type === 'pinch'){ const [q] = [...ptrs.values()]; ges = {type:'pan', sx:q.x, sy:q.y, cx:cam.x, cy:cam.y}; }
}
mapC.addEventListener('pointerup', endPtr); mapC.addEventListener('pointercancel', endPtr);
mapC.addEventListener('wheel', e => { e.preventDefault(); zoomAt(cam.z * Math.exp(-e.deltaY * .0016), e.clientX, e.clientY, toWorld(e.clientX, e.clientY)); }, {passive:false});
mapC.addEventListener('keydown', e => {
  const s = 70 / cam.z, vc = visCenter();
  if (e.key === 'ArrowLeft') cam.x -= s; else if (e.key === 'ArrowRight') cam.x += s; else if (e.key === 'ArrowUp') cam.y -= s; else if (e.key === 'ArrowDown') cam.y += s;
  else if (e.key === '+' || e.key === '=') { zoomAt(cam.z * 1.3, vc.sx, vc.sy, toWorld(vc.sx, vc.sy)); return; }
  else if (e.key === '-') { zoomAt(cam.z / 1.3, vc.sx, vc.sy, toWorld(vc.sx, vc.sy)); return; }
  else if (e.key === 'Escape'){ if (placing) endPlace(); else if (mode === 'target'){ mode = 'idle'; requestDraw(); } else closeSheet(); return; }
  else return;
  e.preventDefault(); clampCam(); applyCam();
});
function zoomBtn(f){ const vc = visCenter(); const w = toWorld(vc.sx, vc.sy), z = clampZ(cam.z * f); flyTo(w.x, w.y, z); }
$('zIn').addEventListener('click', () => zoomBtn(1.6));
$('zOut').addEventListener('click', () => zoomBtn(1 / 1.6));
$('zAll').addEventListener('click', overview);
$('menuBtn').addEventListener('click', () => openSheet('menu', {}));
$('buildList').addEventListener('click', e => { const b = e.target.closest('.bbtn'); if (b) startPlace(b.dataset.kind); });
$('tradeBtn').addEventListener('click', () => { const i = routes.findIndex(r => r.a === active || r.b === active); if (i < 0){ toast('Von hier fährt noch kein Kanu.'); return; } openTrade(i); });
$('placeOk').addEventListener('click', confirmPlace);
$('placeDone').addEventListener('click', endPlace);
window.addEventListener('resize', () => { measure(); applyCam(); });
if (document.fonts) document.fonts.ready.then(() => invalidate());

/* ---------- loop and start */
function renderAll(){ invalidate(true); spawnWalkers(); renderBuildBar(); }
let last = performance.now(), lastDraw = 0;
function frame(now){
  const dt = Math.min(64, now - last); last = now;
  stepCam(now); if (boats.length) stepBoats(now); if (lod === 'near') stepWalkers(dt);
  if (needDraw || stale(now) || (animating() && now - lastDraw > 32)){ draw(now); lastDraw = now; }
  requestAnimationFrame(frame);
}
function start(data){
  injectDefs();
  let ok = false;
  try { const raw = (data && data.save) || localStorage.getItem(SAVE_KEY); if (raw) ok = restore(raw); } catch (e){}
  if (!ok) newGame();
  renderAll(); measure();
  const b = boxOf([isl('heimat'), isl('tochter')]), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const z = clampZ(Math.min((vw - 50) / bw, (vh - topH - botH - 40) / bh, 1));
  Object.assign(cam, camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, z)); clampCam(); applyCam();
  // fonts, patterns and the first bitmaps load before the first frame, so nothing pops in
  const fonts = document.fonts ? Promise.all([document.fonts.load(NAME_FONT), document.fonts.load(SUB_FONT)]).catch(() => {}) : null;
  const ready = loadPatterns().then(() => { draw(performance.now()); return Promise.all(pendingSprites()); });
  Promise.race([Promise.all([fonts, ready]), new Promise(res => setTimeout(res, 2500))]).then(() => {
    invalidate(true); requestAnimationFrame(frame); setInterval(econ, TICK);
    if (!ok){ openSheet('intro'); save(); }
  });
}
try { window.claude?.hot?.snapshot?.(() => ({save:serialize()})); } catch (e){}
const hot = window.claude?.hot;
if (hot && hot.ready) hot.ready(start); else start(hot?.data ?? {});
