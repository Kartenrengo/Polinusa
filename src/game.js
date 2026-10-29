'use strict';
/* Game logic: economy, building sites, people, input, main loop and start */

/* ---------- settling, clans and gifts (the canoes themselves live in fleet.js) */
const routeIndex = (a, b) => routes.findIndex(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
/* Each colony after the first two needs more standing: people follow a chief they respect */
const manaNeeded = () => Math.max(0, islands.filter(I => I.settled).length - 2) * MANA_PER_COLONY;
/* Settlers land: the island gets its first house and a cord to where they came from */
function settle(T, S, o){
  T.discovered = true; T.settled = true; T.pop = o.pop; T.lvl = 1; T.stock = {...emptyStock(), ...o.stock};
  const r = rng(T.center.x | 0);
  if (!T.buildings.length){
    if (T.atoll) seedAtollPlants(T, r);
    else { palmsAlong(T, r, 16);
      for (let i = 0; i < 4; i++){ const a = r() * TAU, p = {x:T.center.x + Math.cos(a) * 64, y:T.center.y + Math.sin(a) * 46}; if (!check('baum', T, p.x, p.y)) addB(T, 'baum', p, {scale:fx(.9 + r() * .15)}, tick - 60); } }
  }
  const hs = findSpot(T, 'haus', homeSpot(T)); if (hs) addB(T, 'haus', hs, variant('haus'), tick);
  if (S && routeIndex(S.id, T.id) < 0) routes.push({a:S.id, b:T.id, knots:1, lastGift:tick, plan:{a:{}, b:{}}});
  renderAll(); setActive(T.id); renderBuildBar(); flyTo(T.center.x, T.center.y, 1.3); save(); checkQuest();
  toast(`Auf ${T.name} steht das erste Haus.${S ? ` Eine Schnur führt nach ${S.name}.` : ''}`, 4200);
}
/* A gift is not paid for. The clan remembers it and answers later with what they make; trust (knots) makes the answer richer. */
function receiveGift(T, cargo, from, r){
  const C = T.clan, worth = giftValue(C, cargo);
  T.debt = (T.debt || 0) + worth * returnRate(r.knots);
  r.knots = Math.min(12, r.knots + 1 + (cargo.schmuck ? 1 : 0)); r.lastGift = tick;
  T.lastFrom = from; if (!(T.returnAt > tick)) T.returnAt = tick + 15 + Math.round(Math.random() * 10);
  mana += Math.min(4, Math.round(worth / 4)) + 1; invalidate();
  toast(`Der ${C.name} nimmt eure Gabe an. Die Gegengabe kommt später. ${r.knots} Knoten Vertrauen.`, 4200);
}
function answerGifts(){
  for (const T of islands){
    if (!T.clan || !T.discovered || !(T.debt >= 1) || tick < (T.returnAt || 0) || !isl(T.lastFrom)) continue;
    const {cargo, left, load} = returnGoods(T.clan, T.debt);
    if (!load){ T.returnAt = 0; continue; }
    T.debt = Math.max(0, left); T.returnAt = T.debt >= 1 ? tick + 20 : 0;
    clanShip(T, T.lastFrom, cargo, false);
  }
}

/* ---------- people: they carry the village's work from field, workshop or forest to the store and back.
   About one figure for every four residents, at most ten per island. Close up only. */
const JOB_LOAD = {taro:'taro', baum:'frucht', fisch:'fisch', toepfer:'topf', beil:'stein', flecht:'matte', schnur:'rolle', gaergrube:'paket', klingen:'obsidian', klopf:'tapa', pferch:'taro', schmuck:'muschel'};
const landOf = (I, p) => I.lands.indexOf(landAt(I, p));
const lived = I => I.settled || (I.clan && I.discovered);
const popOf = I => I.settled ? I.pop : I.clan ? I.clan.pop : 0;
/* Building sites come first: a builder fetches wood from the store and carries it to the site */
function jobsOf(I){
  const jobs = [];
  for (const b of activeSites(I)){ const st = storeNear(I, b); if (st) jobs.push({key:'s' + b.id, x:st.x, y:st.y, drop:{x:b.x + 6, y:b.y + 5}, load:'holz'}); }
  for (const b of I.buildings) if (JOB_LOAD[b.kind] && !b.bt) jobs.push({key:b.x + ',' + b.y, x:b.x, y:b.y + 4, load:JOB_LOAD[b.kind]});
  if (I.forest){ const c = villageCenter(I), q = nearestOn(I.forest, c); jobs.push({key:'wald', x:q.x + (c.x - q.x) * .1, y:q.y + (c.y - q.y) * .1, load:'holz'}); }
  return jobs.filter(j => landOf(I, j) >= 0);
}
/* How many sites are worked at once grows with the village: one, and one more for every eight people */
const builders = I => 1 + Math.floor(I.pop / 8);
function activeSites(I){ return I.buildings.filter(b => b.bt && !KINDS[b.kind].plant).sort((a, b) => a.id - b.id).slice(0, builders(I)); }
function storeNear(I, p){
  // the nearest store or meeting house on the same piece of land; on an atoll the lagoon is in the way otherwise
  const L = landOf(I, p), st = I.buildings.filter(b => (b.kind === 'speicher' || b.kind === 'halle') && landOf(I, b) === L);
  const pool = st.length ? st : I.buildings.filter(b => b.kind === 'haus' && landOf(I, b) === L);
  if (!pool.length) return null;
  const b = pool.reduce((m, q) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(m.x - p.x, m.y - p.y) ? q : m);
  return {x:b.x + (Math.random() - .5) * 10, y:b.y + 4 + Math.random() * 4};
}
function syncWalkers(){
  for (const I of islands){
    const mine = walkers.filter(w => w.isl === I.id), homes = lived(I) ? I.buildings.filter(b => !KINDS[b.kind].water && KINDS[b.kind].roof) : [];
    const want = homes.length ? clamp(Math.round(popOf(I) / 4), 1, 10) : 0, jobs = jobsOf(I);
    for (const w of mine) if (w.job && !jobs.some(j => j.key === w.job.key)){ w.job = null; w.carry = null; }
    for (let i = mine.length; i < want; i++){
      const a = homes[Math.floor(Math.random() * homes.length)], n = walkers.length;
      // every third person has no fixed work and strolls between the houses
      const job = jobs.length && i % 3 !== 2 ? jobs[i % jobs.length] : null;
      walkers.push({isl:I.id, look:figureLook(n * 7919 + I.center.x | 0), x:a.x + 4, y:a.y + 5, tx:a.x, ty:a.y + 5, job, leg:'work', carry:null, wait:Math.random() * 1500, phase:0, left:false, moving:false});
    }
    // a newly built workplace takes a worker from the strollers, as long as a third keep strolling
    const free = jobs.filter(j => !walkers.some(o => o.job && o.job.key === j.key));
    // building sites always get someone, other new workplaces only while a third of the people keep strolling
    for (const w of mine){ if (!free.length) break; if (!w.job && (free[0].drop || mine.filter(o => !o.job).length > want / 3)) w.job = free.shift(); }
    if (mine.length > want){ const drop = new Set(mine.slice(want)); walkers = walkers.filter(w => !drop.has(w)); }
  }
}
function spawnWalkers(){ walkers = []; syncWalkers(); }
function nextLeg(w){
  const I = isl(w.isl);
  // during a feast everyone gathers in front of the meeting house; at the feast of the Pleiades they dance in a ring on the dance ground
  w.dance = false; w.hurry = I.feastEnd > tick;   // people hurry to a feast
  if (I.feastEnd > tick){
    const d = I.festYear === yearOf() && I.buildings.find(b => b.kind === 'tanzplatz' && !b.bt);
    if (d){ const a = Math.random() * TAU; w.carry = null; w.tx = d.x + Math.cos(a) * 15; w.ty = d.y + Math.sin(a) * 6; w.wait = 1800 + Math.random() * 1400; w.dance = d; return; }
    const h = I.buildings.find(b => b.kind === 'halle'); if (h){ w.carry = null; w.tx = h.x + (Math.random() - .5) * 40; w.ty = h.y + 14 + Math.random() * 16; w.wait = 700 + Math.random() * 1400; return; }
  }
  if (w.job){
    if (w.leg === 'work'){
      // at the workplace: pick up the load, then carry it to the store
      const s = w.job.drop || storeNear(I, w.job); if (s){ w.carry = w.job.load; w.leg = 'store'; w.tx = s.x + (Math.random() - .5) * 6; w.ty = s.y; w.wait = w.job.drop ? 400 : 900 + Math.random() * 1600; return; }
    } else { w.carry = null; w.leg = 'work'; w.tx = w.job.x + (Math.random() - .5) * 8; w.ty = w.job.y + Math.random() * 4; w.wait = 400 + Math.random() * 600; return; }
  }
  const L = landOf(I, w), sp = I.buildings.filter(b => !KINDS[b.kind].water && b.kind !== 'palme' && b.kind !== 'pandanus' && landOf(I, b) === L), t = sp[Math.floor(Math.random() * sp.length)];
  if (t){ w.tx = t.x + (Math.random() - .5) * 22; w.ty = t.y + 4 + Math.random() * 8; } w.wait = 600 + Math.random() * 1800;
}
function stepWalkers(dt){
  for (const w of walkers){
    w.moving = false;
    if (w.wait > 0){ w.wait -= dt; if (w.dance && Math.hypot(w.x - w.dance.x, (w.y - w.dance.y) * 2) < 26){ w.moving = true; w.phase += dt * .008; } continue; }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 1.5){ nextLeg(w); continue; }
    const v = Math.min(d, dt * (w.carry ? .006 : .007) * (w.hurry ? 2.4 : 1)); w.x += dx / d * v; w.y += dy / d * v;
    w.moving = true; w.left = dx < 0; w.phase += v * .9;
  }
}

/* ---------- work: a workshop runs only with its deposit, its plants nearby and its input goods */
const NEAR_PL = {pandanus:'Pandanus', palme:'Kokospalmen', baum:'Brotfruchtbäume', garten:'Maulbeergärten'};
function workState(I, b){
  const K = KINDS[b.kind];
  if (K.near){ const n = nearCount(I, K.near.kind, b.x, b.y, K.near.r); if (n < K.near.n) return {why:'near', kind:K.near.kind, text:`Zu wenig ${NEAR_PL[K.near.kind]} in der Nähe, ${n} von ${K.near.n}.`}; }
  if (K.prod && (I.stock[K.prod] || 0) >= storeCap(I)) return {why:'full', text:'Das Lager ist voll. Baue einen Speicher oder schick Waren weg.'};
  if (K.use && !canPay(I, K.use)){ const k = Object.keys(K.use).find(q => (I.stock[q] || 0) < K.use[q]); return {why:'use', k, text:`Es fehlt ${GN[k]}.`}; }
  return null;
}
/* ---------- needs: what each island uses, makes and lacks, per minute */
const PER_MIN = 60000 / TICK;
function makeRate(I, k){
  let m = k === 'holz' && I.type === 'hoch' ? PER_MIN : 0;
  for (const b of I.buildings){ const K = KINDS[b.kind]; if (K.prod === k && !(b.idle && b.idle.why !== 'full')) m += PER_MIN / K.every; }
  return m;
}
function workUse(I, k){ let u = 0; for (const b of I.buildings){ const K = KINDS[b.kind]; if (K.use && K.use[k] && !(b.idle && b.idle.why === 'near')) u += PER_MIN / K.every * K.use[k]; } return u; }
const needActive = (I, N) => N.lvl < 3 ? I.pop >= N.from : I.lvl === 3;
function needsOf(I){
  const list = NEEDS.filter(N => needActive(I, N)).map(N => {
    const use = I.pop * N.rate, work = workUse(I, N.k), make = makeRate(I, N.k), stock = I.stock[N.k] || 0, all = use + work;
    const state = make >= all ? 'ok' : stock > 0 ? 'low' : 'out';
    return {N, k:N.k, use, work, make, stock, state, mins:make < all ? stock / (all - make) : Infinity};
  });
  const cap = houseCap(I), missing = list.filter(n => n.state === 'out');
  return {list, cap, missing, full:I.pop >= cap, next:NEEDS.find(N => !needActive(I, N)), growing:I.pop < cap && !missing.length && (I.stock.nahrung || 0) > 0};
}
/* Level: a village from 20 people; a chief's village with enough people, standing, pots and mats. It stays one while its needs hold. */
function updateLevel(I, nd){
  const lowOut = nd.missing.some(n => n.N.lvl < 3);
  if (I.lvl === 3){
    I.chiefMiss = nd.missing.length ? (I.chiefMiss || 0) + 1 : 0;
    if (I.chiefMiss >= 30){ I.lvl = 2; I.chiefMiss = 0; I.chiefBan = tick + 60; invalidate(); toast(`${I.name} ist kein Häuptlingsdorf mehr. Es fehlt ${nd.missing.map(n => GN[n.k]).join(' und ')}.`, 4200); }
    return;
  }
  // to rise, the chief's goods must already be in store, and after a fall the village needs two minutes
  if (I.pop >= CHIEF.pop && mana >= CHIEF.mana && beautyOf(I) >= CHIEF.beauty && !lowOut && chiefGoods(I) && tick >= (I.chiefBan || 0)){ I.lvl = 3; invalidate(); toast(`${I.name} ist jetzt ein Häuptlingsdorf. In jedem Haus wohnen nun ${CHIEF.cap} Menschen.`, 4600); return; }
  I.lvl = I.pop >= 20 ? 2 : 1;
}
const chiefGoods = I => NEEDS.filter(N => N.lvl === 3).every(N => (I.stock[N.k] || 0) > 0);
/* ---------- feasts: food, pots, pigs and bark cloth for standing */
function feastState(I, F){
  if (!I.buildings.some(b => b.kind === 'halle')) return 'Feste feiert man im Versammlungshaus.';
  const wait = (I.feastAt || -FEAST_PAUSE) + FEAST_PAUSE - tick; if (I.feastAt && wait > 0) return `Das nächste Fest geht in ${Math.ceil(wait * TICK / 1000)} Sekunden.`;
  if (!canPay(I, F.cost)) return `Es fehlt ${lacking(I, F.cost)}.`;
  return '';
}
function holdFeast(I, F){
  const no = feastState(I, F); if (no){ toast(no); return; }
  pay(I, F.cost); mana += F.mana; I.feastAt = tick; I.feastEnd = tick + FEAST_LEN;
  for (const w of walkers) if (w.isl === I.id){ nextLeg(w); w.wait = 0; }
  for (let i = 0; i < 6; i++) heartAt(I);
  updateHUD(); if (sheetKind) renderSheet(); save(); checkQuest();
  toast(`${F.n} auf ${I.name}. Ansehen +${F.mana}.`, 3600);
}
let hearts = [];   // a heart rises over a house when someone moves in
function econ(){
  tick++;
  for (const I of islands){
    if (!I.settled) continue;
    const st = I.stock, cap = storeCap(I), add = (k, n) => { st[k] = Math.min(cap, (st[k] || 0) + n); };
    if (I.type === 'hoch') add('holz', 1);
    // building sites and young plants: sites need builders, plants just grow
    const working = new Set(activeSites(I));
    for (const b of I.buildings){
      if (!b.bt) continue;
      if (KINDS[b.kind].plant || working.has(b)){ b.bt--; if (!b.bt){ delete b.bt; done(I, b); } }
    }
    if (working.size || I.buildings.some(b => b.bt)) invalidate();
    for (const b of I.buildings){
      const K = KINDS[b.kind]; if (!K.prod || b.bt) continue;
      const every = seasonalEvery(I, b, K); if (!every || tick % every) continue;
      b.idle = workState(I, b); if (b.idle) continue;
      if (K.use) pay(I, K.use);
      add(K.prod, 1);
    }
    // use up what people need; fractions carry over so small villages use little
    I.owe = I.owe || {};
    for (const N of NEEDS){
      if (!needActive(I, N)) continue;
      I.owe[N.k] = (I.owe[N.k] || 0) + I.pop * N.rate / PER_MIN;
      const take = Math.floor(I.owe[N.k]); if (take > 0){ st[N.k] = Math.max(0, (st[N.k] || 0) - take); I.owe[N.k] -= take; }
    }
    let nd = needsOf(I);
    updateLevel(I, nd); nd = needsOf(I);
    if (nd.growing){ I.pop = Math.min(nd.cap, I.pop + (I.joyUntil > tick ? 2 : 1)); heartAt(I); }
    else if (I.pop > nd.cap) I.pop--;   // when houses shrink back, people move away one by one
    // without food people leave, slowly, but a few always stay
    I.hunger = nd.missing.some(n => n.k === 'nahrung') ? (I.hunger || 0) + 1 : 0;
    if (I.hunger >= 15 && I.pop > 3){ I.pop--; I.hunger = 0; }
  }
  if (tick % MANA_FADE === 0) mana = Math.max(0, mana - 1);
  // a beautiful village adds to the clan's standing, every half minute, as far as its people can enjoy it
  if (tick % 15 === 0) for (const I of islands) if (I.settled) mana += Math.floor(Math.min(beautyOf(I), I.pop / 2) / 6);
  answerGifts(); stepYards(); feedCrews(); calendarTick();
  // a cord to a clan slackens when no gift has gone along it for a long time
  for (const r of routes){ const c = isl(r.a).clan || isl(r.b).clan; if (c && r.knots > 0 && tick - (r.lastGift || 0) > 90){ r.knots--; r.lastGift = tick; invalidate(); } }
  if (tick % 8 === 0) invalidate();   // roofs age
  if (tick % 5 === 0) syncWalkers();
  requestDraw(); updateHUD(); if (placing) ghostRender(); checkQuest();
  if (sheetKind && sheetSig() !== lastSig) renderSheet();
  if (tick % 3 === 0) save();
}
function done(I, b){
  const K = KINDS[b.kind];
  if (!K.plant && !K.path && I.id === active) toast(`${K.n} ist fertig.`, 1600);
  syncWalkers(); checkQuest();
}
function heartAt(I){
  if (lod === 'far' || !boxIn(I.box, view(60))) return;
  const hs = I.buildings.filter(b => b.kind === 'haus' || b.kind === 'pfahl' || b.kind === 'halle'); if (!hs.length) return;
  const b = hs[Math.floor(Math.random() * hs.length)];
  hearts.push({x:b.x + (Math.random() - .5) * 8, y:b.y - KINDS[b.kind].hy - 10, t0:performance.now() + Math.random() * 600});
}

/* ---------- hit tests and input */
function hitBuilding(p){
  if (lod === 'far') return null; let best = null, bd = Infinity;
  for (const I of islands){ if (!I.settled) continue; for (const b of I.buildings){ const K = KINDS[b.kind]; const d = Math.hypot(p.x - b.x, p.y - (b.y - K.hy * .6)); const lim = Math.max(K.r + 3, 14 / cam.z); if (d < lim && d < bd){ bd = d; best = b; } } }
  return best;
}
function hitCord(p){ const lim = Math.max(9, 16 / cam.z); for (let i = 0; i < routes.length; i++){ for (const q of routeCurve(routes[i]).pts) if (Math.hypot(p.x - q.x, p.y - q.y) < lim) return i; } return -1; }
function hitIsland(p){ return islands.find(I => I.discovered && onIsland(I, p)) || null; }
function onTap(p){
  if (mode === 'place' || mode === 'move'){ placing.x = p.x; placing.y = p.y; ghostRender(); return; }
  const sh = hitShip(p); if (sh){ if (sh === selShip){ closeSheet(); return; } closeSheet(); selectShip(sh); return; }
  if (mode === 'steer'){ steerTap(p); return; }
  const b = hitBuilding(p); if (b){ select(b); return; }
  const ri = hitCord(p); if (ri >= 0){ openRoute(ri); return; }
  const I = hitIsland(p);
  if (I && I.clan){ closeSheet(); openSheet('clan', {id:I.id}); return; }
  if (I && !I.settled){ toast(`${I.name} ist noch unbewohnt. Bring ${SETTLE.people} Siedler mit einem Kanu her.`, 3600); return; }
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
  else if (e.key === 'Escape'){ if (placing) endPlace(); else closeSheet(); return; }
  else return;
  e.preventDefault(); clampCam(); applyCam();
});
function zoomBtn(f){ const vc = visCenter(); const w = toWorld(vc.sx, vc.sy), z = clampZ(cam.z * f); flyTo(w.x, w.y, z); }
$('zIn').addEventListener('click', () => zoomBtn(1.6));
$('zOut').addEventListener('click', () => zoomBtn(1 / 1.6));
$('zAll').addEventListener('click', overview);
$('menuBtn').addEventListener('click', () => openSheet('menu', {}));
$('popBtn').addEventListener('click', () => openSheet('needs'));
$('storeBtn').addEventListener('click', () => openSheet('store'));
$('manaBtn').addEventListener('click', () => openSheet('mana'));
$('buildList').addEventListener('click', e => { const b = e.target.closest('.bbtn'); if (!b) return; newKinds.delete(b.dataset.kind); b.classList.remove('new', 'hint'); startPlace(b.dataset.kind); });
$('tradeBtn').addEventListener('click', () => openSheet('fleet'));
$('seasonBtn').addEventListener('click', () => openSheet('calendar'));
$('placeOk').addEventListener('click', confirmPlace);
$('placeDone').addEventListener('click', endPlace);
window.addEventListener('resize', () => { measure(); applyCam(); });
if (document.fonts) document.fonts.ready.then(() => invalidate());

/* ---------- loop and start */
function renderAll(){ invalidate(true); spawnWalkers(); renderBuildBar(); }
let last = performance.now(), lastDraw = 0;
function frame(now){
  const dt = Math.min(64, now - last); last = now;
  stepCam(now); if (ships.length) stepShips(now, dt); if (cam.z > PEOPLE_Z) stepWalkers(dt);
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
