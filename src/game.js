'use strict';
/* Game logic: economy, boats and expeditions, input, main loop and start */

/* ---------- boats and expeditions */
function expCurve(S, T){
  const A = S.harbor, B = T.harbor, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
  return curve(A, {x:(A.x + B.x) / 2 + dy / len * 60, y:(A.y + B.y) / 2 - dx / len * 60}, B);
}
/* Small outriggers (oc) carry goods and settlers, the double canoe (dc) sails into the unknown */
function addBoat(o){
  const b = {kind:o.exp ? 'dc' : 'oc', ...o, t0:o.t0 != null ? o.t0 : performance.now(), q:'NE', x:null, k:1, alpha:0};
  if (b.exp || b.settle) b.cv = expCurve(isl(b.from), isl(b.to));
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
function startSettlers(S, T){
  if (T.settled || boats.some(b => b.settle && b.to === T.id)) return;
  if (!canPay(S, SETTLE.cost)){ toast(`Zu wenig ${lacking(S, SETTLE.cost)}.`); return; }
  if (S.pop < SETTLE.people + SETTLE.keep){ toast(`Es braucht ${SETTLE.people + SETTLE.keep} Bewohner.`); return; }
  pay(S, SETTLE.cost); S.pop -= SETTLE.people;
  const w = windOf(S.id, T.id), days = Math.max(1, Math.round(w.len / 372 * w.f));
  addBoat({settle:true, from:S.id, to:T.id, people:SETTLE.people, cargo:{...SETTLE.cost}, dur:days * DAY * 1000, up:w.f === 3});
  closeSheet(); updateHUD(); save(); toast(`Das Auslegerkanu bringt ${SETTLE.people} Siedler nach ${T.name}. ${days} ${days === 1 ? 'Tag' : 'Tage'}.`);
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
  save(); measure(); toast(`Das Doppelkanu legt ab. Etwa ${days} Tage.`);
}
/* Settlers land: the island gets its first house, a cord to where they came from and, if it was unknown, a clearing in the fog */
function settle(T, S, cv, o){
  const unknown = !T.discovered;
  T.discovered = true; T.settled = true; T.pop = o.pop; T.stock = {holz:0, nahrung:0, toepfe:0, beile:0, matten:0, schnur:0, ...o.stock};
  const r = rng(T.center.x | 0);
  if (!T.buildings.length){
    if (T.atoll) seedAtollPlants(T, r);
    else { palmsAlong(T, r, 16);
      for (let i = 0; i < 4; i++){ const a = r() * TAU, p = {x:T.center.x + Math.cos(a) * 64, y:T.center.y + Math.sin(a) * 46}; if (!check('baum', T, p.x, p.y)) addB(T, 'baum', p, {scale:fx(.9 + r() * .15)}, tick - 60); } }
  }
  const hs = findSpot(T, 'haus', homeSpot(T)); if (hs) addB(T, 'haus', hs, variant('haus'), tick);
  routes.push({a:S.id, b:T.id, knots:1});
  if (unknown){
    fogHoles.push({cx:T.center.x, cy:T.center.y, rx:fx((T.box.x1 - T.box.x0) / 2 + 140), ry:fx((T.box.y1 - T.box.y0) / 2 + 140), seed:T.center.x | 0});
    for (let i = 1; i < 8; i++){ const q = curveAt(cv, i / 8); fogHoles.push({cx:fx(q.x), cy:fx(q.y), rx:150, ry:130, seed:i * 7 + 1}); }
  }
  renderAll(); setActive(T.id); renderBuildBar(); flyTo(T.center.x, T.center.y, 1.3); save(); checkQuest();
  toast(`Auf ${T.name} steht das erste Haus. Eine neue Schnur führt nach ${S.name}.`, 4200);
}
function stepBoats(now){
  for (let i = boats.length - 1; i >= 0; i--){
    const b = boats[i], p = clamp((now - b.t0) / b.dur, 0, 1), cv = b.cv || routes[b.route] && routeCurve(routes[b.route]);
    if (!cv){ boats.splice(i, 1); continue; }
    const s = b.reverse ? 1 - p : p, q = curveAt(cv, s), q2 = curveAt(cv, clamp(s + (b.reverse ? -.01 : .01), 0, 1));
    let dx = q2.x - q.x, dy = q2.y - q.y; const dl = Math.hypot(dx, dy) || 1; let x = q.x, y = q.y;
    // against the wind the canoe tacks: it zigzags and turns its bow
    if (b.up){ const cyc = Math.max(3, Math.round(cv.len / 70)), off = Math.sin(p * TAU * cyc) * 13 * Math.sin(p * Math.PI); x += -dy / dl * off; y += dx / dl * off; const tilt = Math.cos(p * TAU * cyc); dx += -dy / dl * tilt * dl * 1.4; dy += dx / dl * tilt * .2; }
    if (p < 1){ b.q = dy < 0 ? (dx >= 0 ? 'NE' : 'NW') : (dx < 0 ? 'SW' : 'SE'); b.left = dx < 0; }
    const small = b.kind === 'oc';
    b.k = lod === 'far' ? clamp(.9 / cam.z, 1.6, 3.2) * (small ? 1.3 : 1) : (b.exp ? 1.25 : small ? 1.5 : 1);
    b.x = x; b.y = y; b.alpha = p < .04 ? p / .04 : p > .96 ? (1 - p) / .04 : 1;
    if (p >= 1){
      boats.splice(i, 1);
      if (b.exp) settle(isl(b.to), isl(b.from), b.cv, {pop:5, stock:{holz:4, nahrung:6, toepfe:1}});
      else if (b.settle) settle(isl(b.to), isl(b.from), b.cv, {pop:b.people, stock:b.cargo});
      else { const T = isl(b.to), r = routes[b.route]; for (const [k2, v] of Object.entries(b.cargo)) T.stock[k2] = Math.min(storeCap(T), (T.stock[k2] || 0) + v); r.knots = Math.min(12, r.knots + 1); invalidate(); updateHUD(); if (sheetKind) renderSheet(); save(); checkQuest(); toast(`Das Kanu ist in ${T.name}. ${r.knots} Knoten.`); }
    }
  }
}

/* ---------- people: they carry the village's work from field, workshop or forest to the store and back.
   About one figure for every four residents, at most ten per island. Close up only. */
const JOB_LOAD = {taro:'taro', baum:'frucht', fisch:'fisch', toepfer:'topf', beil:'stein', flecht:'matte', schnur:'rolle'};
const landOf = (I, p) => I.lands.indexOf(landAt(I, p));
function jobsOf(I){
  const jobs = I.buildings.filter(b => JOB_LOAD[b.kind]).map(b => ({x:b.x, y:b.y + 4, load:JOB_LOAD[b.kind]}));
  if (I.forest){ const c = villageCenter(I), q = nearestOn(I.forest, c); jobs.push({x:q.x + (c.x - q.x) * .1, y:q.y + (c.y - q.y) * .1, load:'holz'}); }
  return jobs.filter(j => landOf(I, j) >= 0);
}
function storeNear(I, p){
  // the nearest store or meeting house on the same piece of land; on an atoll the lagoon is in the way otherwise
  const L = landOf(I, p), st = I.buildings.filter(b => (b.kind === 'speicher' || b.kind === 'halle') && landOf(I, b) === L);
  if (!st.length) return null;
  const b = st.reduce((m, q) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(m.x - p.x, m.y - p.y) ? q : m);
  return {x:b.x + (Math.random() - .5) * 10, y:b.y + 4 + Math.random() * 4};
}
function syncWalkers(){
  for (const I of islands){
    const mine = walkers.filter(w => w.isl === I.id), homes = I.settled ? I.buildings.filter(b => !KINDS[b.kind].water && KINDS[b.kind].roof) : [];
    const want = homes.length ? clamp(Math.round(I.pop / 4), 1, 10) : 0, jobs = jobsOf(I);
    for (const w of mine) if (w.job && !jobs.some(j => j.x === w.job.x && j.y === w.job.y)){ w.job = null; w.carry = null; }
    for (let i = mine.length; i < want; i++){
      const a = homes[Math.floor(Math.random() * homes.length)], n = walkers.length;
      // every third person has no fixed work and strolls between the houses
      const job = jobs.length && i % 3 !== 2 ? jobs[i % jobs.length] : null;
      walkers.push({isl:I.id, look:figureLook(n * 7919 + I.center.x | 0), x:a.x + 4, y:a.y + 5, tx:a.x, ty:a.y + 5, job, leg:'work', carry:null, wait:Math.random() * 1500, phase:0, left:false, moving:false});
    }
    // a newly built workplace takes a worker from the strollers, as long as a third keep strolling
    const same = (a, b) => a && b && a.x === b.x && a.y === b.y, free = jobs.filter(j => !walkers.some(o => same(o.job, j)));
    for (const w of mine){ if (!free.length || mine.filter(o => !o.job).length <= want / 3) break; if (!w.job) w.job = free.shift(); }
    if (mine.length > want){ const drop = new Set(mine.slice(want)); walkers = walkers.filter(w => !drop.has(w)); }
  }
}
function spawnWalkers(){ walkers = []; syncWalkers(); }
function nextLeg(w){
  const I = isl(w.isl);
  if (w.job){
    if (w.leg === 'work'){
      // at the workplace: pick up the load, then carry it to the store
      const s = storeNear(I, w.job); if (s){ w.carry = w.job.load; w.leg = 'store'; w.tx = s.x; w.ty = s.y; w.wait = 900 + Math.random() * 1600; return; }
    } else { w.carry = null; w.leg = 'work'; w.tx = w.job.x + (Math.random() - .5) * 8; w.ty = w.job.y + Math.random() * 4; w.wait = 400 + Math.random() * 600; return; }
  }
  const L = landOf(I, w), sp = I.buildings.filter(b => !KINDS[b.kind].water && b.kind !== 'palme' && b.kind !== 'pandanus' && landOf(I, b) === L), t = sp[Math.floor(Math.random() * sp.length)];
  if (t){ w.tx = t.x + (Math.random() - .5) * 22; w.ty = t.y + 4 + Math.random() * 8; } w.wait = 600 + Math.random() * 1800;
}
function stepWalkers(dt){
  for (const w of walkers){
    w.moving = false;
    if (w.wait > 0){ w.wait -= dt; continue; }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 1.5){ nextLeg(w); continue; }
    const v = Math.min(d, dt * (w.carry ? .006 : .007)); w.x += dx / d * v; w.y += dy / d * v;
    w.moving = true; w.left = dx < 0; w.phase += v * .9;
  }
}

/* ---------- needs: what each island uses, makes and lacks, per minute */
const PER_MIN = 60000 / TICK;
function makeRate(I, k){ let m = k === 'holz' && I.type === 'hoch' ? PER_MIN : 0; for (const b of I.buildings){ const K = KINDS[b.kind]; if (K.prod === k) m += PER_MIN / K.every; } return m; }
function needsOf(I){
  const list = NEEDS.filter(N => I.pop >= N.from).map(N => {
    const use = I.pop * N.rate, make = makeRate(I, N.k), stock = I.stock[N.k] || 0;
    const state = make >= use ? 'ok' : stock > 0 ? 'low' : 'out';
    return {N, k:N.k, use, make, stock, state, mins:make < use ? stock / (use - make) : Infinity};
  });
  const cap = houseCap(I), missing = list.filter(n => n.state === 'out');
  return {list, cap, missing, full:I.pop >= cap, next:NEEDS.find(N => I.pop < N.from), growing:I.pop < cap && !missing.length && (I.stock.nahrung || 0) > 0};
}
let hearts = [];   // a heart rises over a house when someone moves in
function econ(){
  tick++;
  for (const I of islands){
    if (!I.settled) continue;
    const st = I.stock, cap = storeCap(I), add = (k, n) => { st[k] = Math.min(cap, (st[k] || 0) + n); };
    if (I.type === 'hoch') add('holz', 1);
    for (const b of I.buildings){ const K = KINDS[b.kind]; if (K.prod && tick % K.every === 0) add(K.prod, 1); }
    // use up what people need; fractions carry over so small villages use little
    I.owe = I.owe || {};
    for (const N of NEEDS){
      if (I.pop < N.from) continue;
      I.owe[N.k] = (I.owe[N.k] || 0) + I.pop * N.rate / PER_MIN;
      const take = Math.floor(I.owe[N.k]); if (take > 0){ st[N.k] = Math.max(0, (st[N.k] || 0) - take); I.owe[N.k] -= take; }
    }
    const nd = needsOf(I);
    if (nd.growing){ I.pop++; heartAt(I); }
    else if (I.pop > nd.cap) I.pop = nd.cap;
    // without food people leave, slowly, but a few always stay
    I.hunger = nd.missing.some(n => n.k === 'nahrung') ? (I.hunger || 0) + 1 : 0;
    if (I.hunger >= 15 && I.pop > 3){ I.pop--; I.hunger = 0; }
  }
  if (tick % 8 === 0) invalidate();   // roofs age
  if (tick % 5 === 0) syncWalkers();
  requestDraw(); updateHUD(); if (placing) ghostRender(); checkQuest();
  if ((sheetKind === 'info' || sheetKind === 'quest' || sheetKind === 'needs') && sheetSig() !== lastSig) renderSheet();
  if (tick % 3 === 0) save();
}
function heartAt(I){
  if (lod === 'far' || !boxIn(I.box, view(60))) return;
  const hs = I.buildings.filter(b => b.kind === 'haus' || b.kind === 'pfahl' || b.kind === 'halle'); if (!hs.length) return;
  const b = hs[Math.floor(Math.random() * hs.length)];
  hearts.push({x:b.x, y:b.y - KINDS[b.kind].hy - 10, t0:performance.now()});
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
  const I = hitIsland(p);
  if (I && !I.settled){ toast(`${I.name} ist noch unbewohnt. Siedler schickst du vom Kanuhaus auf Panua.`, 3600); return; }
  if (I){ closeSheet(); setActive(I.id); if (lod === 'far') flyTo(I.center.x, I.center.y, 1.4); return; }
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
$('popBtn').addEventListener('click', () => openSheet('needs'));
$('buildList').addEventListener('click', e => { const b = e.target.closest('.bbtn'); if (!b) return; newKinds.delete(b.dataset.kind); b.classList.remove('new', 'hint'); startPlace(b.dataset.kind); });
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
  stepCam(now); if (boats.length) stepBoats(now); if (cam.z > PEOPLE_Z) stepWalkers(dt);
  if (needDraw || stale(now) || (animating() && now - lastDraw > 32)){ draw(now); lastDraw = now; }
  requestAnimationFrame(frame);
}
function start(data){
  injectDefs();
  let ok = false;
  try { const raw = (data && data.save) || localStorage.getItem(SAVE_KEY); if (raw) ok = restore(raw); } catch (e){}
  if (!ok) newGame();
  renderAll(); measure();
  // a new game opens close to the landing place, a saved one shows home and the first atoll
  const b = ok ? boxOf([isl('heimat'), isl('tochter')]) : isl('heimat').box, bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const z = clampZ(Math.min((vw - 50) / bw, (vh - topH - botH - 40) / bh, ok ? 1 : 1.4));
  Object.assign(cam, camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, z)); clampCam(); applyCam();
  // fonts, patterns and the first bitmaps load before the first frame, so nothing pops in
  const fonts = document.fonts ? Promise.all([document.fonts.load(NAME_FONT), document.fonts.load(SUB_FONT)]).catch(() => {}) : null;
  const ready = loadPatterns().then(() => { draw(performance.now()); return Promise.all(pendingSprites()); });
  Promise.race([Promise.all([fonts, ready]), new Promise(res => setTimeout(res, 2500))]).then(() => {
    invalidate(true); requestAnimationFrame(frame); setInterval(econ, TICK);
    if (!ok){ openSheet('intro', {first:true}); save(); }
  });
}
try { window.claude?.hot?.snapshot?.(() => ({save:serialize()})); } catch (e){}
const hot = window.claude?.hot;
if (hot && hot.ready) hot.ready(start); else start(hot?.data ?? {});
