'use strict';
/* The fleet: canoes you can see, steer and set to work.
   - Each canoe is built in a canoe house and takes time. Free canoes go where you tap.
   - Only the double canoe sails into the fog, and out there it eats provisions.
   - A canoe set on a trade chain shuttles between two islands on its own and carries what the chain says.
   - Wherever a canoe sails it lifts the fog; unseen sea is rolled into islands the moment it is first seen. */

let ships = [], nextShip = 1, selShip = null;   // selShip: the canoe being steered

/* ---------- a sea grid to find a way around land. A cell is shut as soon as land comes near any part of it,
   so a canoe on open cells always keeps clear of the beach. Leaving and reaching a harbour is checked against the coast itself. */
const G = 20, GW = Math.ceil(W / G), GH = Math.ceil(H / G), SHORE = G * .75 + 3;
let blocked = new Uint8Array(GW * GH);
function resetGrid(){ blocked = new Uint8Array(GW * GH); }
const cellOf = p => clamp(Math.floor(p.y / G), 0, GH - 1) * GW + clamp(Math.floor(p.x / G), 0, GW - 1);
const cellPt = i => ({x:(i % GW + .5) * G, y:(Math.floor(i / GW) + .5) * G});
function markLand(I){
  const b = I.box;
  for (let gy = Math.max(0, Math.floor(b.y0 / G)); gy <= Math.min(GH - 1, Math.floor(b.y1 / G)); gy++)
    for (let gx = Math.max(0, Math.floor(b.x0 / G)); gx <= Math.min(GW - 1, Math.floor(b.x1 / G)); gx++){
      const p = {x:(gx + .5) * G, y:(gy + .5) * G};
      if (I.lands.some(L => inPoly(p, L.poly) || polyDist(p, L.poly) < SHORE)) blocked[gy * GW + gx] = 1;
    }
}
/* Does the straight line p → q touch land? Exact, against the coast of every island near it. */
function overLand(p, q, m = 3){
  const x0 = Math.min(p.x, q.x) - m, x1 = Math.max(p.x, q.x) + m, y0 = Math.min(p.y, q.y) - m, y1 = Math.max(p.y, q.y) + m;
  for (const I of islands){
    const b = I.box; if (b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1) continue;
    for (const L of I.lands){
      const P = L.poly, n = P.length;
      if (inPoly(p, P) || inPoly(q, P)) return true;
      for (let i = 0; i < n; i++){ const a = P[i], c = P[(i + 1) % n]; if (segsCross(p, q, a, c) || segDist(a, p, q) < m) return true; }
    }
  }
  return false;
}
function segsCross(a, b, c, d){
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
/* The open cell nearest to p that p can reach in a straight line over water */
function freeNear(p){
  const i0 = cellOf(p); if (!blocked[i0]) return i0;
  const x0 = i0 % GW, y0 = Math.floor(i0 / GW);
  for (let r = 1; r < 24; r++){
    const ring = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= GW || y >= GH || blocked[y * GW + x]) continue;
      ring.push(y * GW + x);
    }
    ring.sort((a, b) => { const A = cellPt(a), B = cellPt(b); return Math.hypot(A.x - p.x, A.y - p.y) - Math.hypot(B.x - p.x, B.y - p.y); });
    for (const c of ring) if (!overLand(p, cellPt(c))) return c;
  }
  return -1;
}
function clearLine(p, q){
  const d = Math.hypot(q.x - p.x, q.y - p.y), n = Math.ceil(d / (G / 4));
  for (let k = 1; k < n; k++){ const t = k / n; if (blocked[cellOf({x:p.x + (q.x - p.x) * t, y:p.y + (q.y - p.y) * t})]) return false; }
  return true;
}
/* A* over the grid, then the path is pulled straight wherever the sea is open */
function findPath(a, b){
  if (!overLand(a, b)) return [{x:b.x, y:b.y}];
  const s = freeNear(a), g = freeNear(b); if (s < 0 || g < 0) return null;
  const N = GW * GH, cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = [], hf = [];
  const push = (i, f) => { heap.push(i); hf.push(f); let c = heap.length - 1; while (c > 0){ const p = (c - 1) >> 1; if (hf[p] <= hf[c]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; [hf[p], hf[c]] = [hf[c], hf[p]]; c = p; } };
  const pop = () => { const top = heap[0], li = heap.pop(), lf = hf.pop(); if (heap.length){ heap[0] = li; hf[0] = lf; let c = 0; for (;;){ const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; [hf[m], hf[c]] = [hf[c], hf[m]]; c = m; } } return top; };
  const gx = g % GW, gy = Math.floor(g / GW), hcost = i => { const dx = Math.abs(i % GW - gx), dy = Math.abs(Math.floor(i / GW) - gy); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
  cost[s] = 0; push(s, hcost(s));
  let best = s;   // if the goal is shut in by land, the canoe goes as close as it can
  while (heap.length){
    const i = pop(); if (done[i]) continue; done[i] = 1; if (i === g) break;
    if (hcost(i) < hcost(best)) best = i;
    const x = i % GW, y = Math.floor(i / GW);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = ny * GW + nx; if (blocked[j] || done[j]) continue;
      if (dx && dy && (blocked[y * GW + nx] || blocked[ny * GW + x])) continue;   // no squeezing past corners
      const c = cost[i] + (dx && dy ? 1.414 : 1); if (c < cost[j]){ cost[j] = c; from[j] = i; push(j, c + hcost(j)); }
    }
  }
  let goal = g;
  if (from[g] < 0 && g !== s){ if (hcost(best) > 12) return null; goal = best; }
  const way = []; for (let i = goal; i >= 0; i = from[i]){ way.push(cellPt(i)); if (i === s) break; } way.reverse();
  // the last step into the harbour only if it is open water, otherwise the canoe stops at the last open cell
  const pts = goal === g ? [...way, {x:b.x, y:b.y}] : way, out = [];
  let cur = {x:a.x, y:a.y}, k = 0, first = true;
  while (k < pts.length){
    let far = k;
    for (let j = pts.length - 1; j > k; j--){
      const end = j === pts.length - 1 && goal === g, ok = first || end ? !overLand(cur, pts[j]) : clearLine(cur, pts[j]);
      if (ok){ far = j; break; }
    }
    cur = pts[far]; out.push(cur); k = far + 1; first = false;
  }
  return out;
}

/* Nobody steers a canoe along a ruler: the course swings out in gentle bends, one leg to this side, the next to the
   other, and is then rounded, as long as no land is in the way */
function curvePath(a, pts){
  const out = [{x:a.x, y:a.y}], ok = (p, q) => !overLand(p, q, 1.5);
  let side = (Math.round(a.x * 7 + a.y) & 1) ? 1 : -1;
  for (const q of pts){
    const p = out[out.length - 1], d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d > 90){
      const nx = -(q.y - p.y) / d, ny = (q.x - p.x) / d, bend = Math.min(38, d * .11) * side;
      const m = [.33, .67].map(f => ({x:p.x + (q.x - p.x) * f + nx * bend, y:p.y + (q.y - p.y) * f + ny * bend}));
      if (ok(p, m[0]) && ok(m[0], m[1]) && ok(m[1], q)) out.push(...m);
      side = -side;
    }
    out.push({x:q.x, y:q.y});
  }
  const sm = spline([out[0], ...out, out[out.length - 1]], 5);
  for (let i = 1; i < sm.length; i++) if (!ok(sm[i - 1], sm[i])) return out.slice(1);
  return sm.slice(1);
}

/* ---------- fog and the unseen sea */
const revealed = p => fogHoles.some(h => ((p.x - h.cx) / (h.rx * .92)) ** 2 + ((p.y - h.cy) / (h.ry * .92)) ** 2 < 1);
function exploreAt(x, y, r){
  for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++) for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) ensureCell(cx, cy, true);
  // a new clearing only where the old ones do not already reach, so their number stays small
  if (!fogHoles.some(h => Math.hypot(h.cx - x, h.cy - y) < Math.min(h.rx, r) * .7)) fogHoles.push({cx:Math.round(x), cy:Math.round(y), rx:r, ry:Math.round(r * .85), seed:(x * 7 + y) & 1023});
  for (const I of islands){
    if (I.discovered) continue;
    const b = I.box, nx = clamp(x, b.x0, b.x1), ny = clamp(y, b.y0, b.y1);
    if (Math.hypot(nx - x, ny - y) < r * .9) discover(I);
  }
  invalidate(true);
}
function discover(I){
  I.discovered = true; syncWalkers(); save(); checkQuest();
  const kind = I.volcano ? 'ein Vulkan' : I.type === 'atoll' ? 'ein Atoll' : 'eine hohe Insel';
  toast(I.clan ? `Land in Sicht: ${I.name}. Dort lebt der ${I.clan.name}.` : `Land in Sicht: ${I.name}, ${kind}.`, 4200);
}

/* ---------- canoes */
const own = () => ships.filter(s => s.own);
const shipAt = id => ships.filter(s => s.own && s.port === id && s.state !== 'sail');
function moorSpot(I, s){
  const n = ships.filter(o => o !== s && o.port === I.id).length, h = I.harbor, c = I.center, dx = h.x - c.x, dy = h.y - c.y, l = Math.hypot(dx, dy) || 1;
  const k = (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 13;
  return {x:h.x - dy / l * k + dx / l * 6, y:h.y + dx / l * k + dy / l * 6};
}
function windFactor(hy){ return hy < -.35 ? .65 : hy > .35 ? 1.2 : 1; }   // the wind blows from the north
function speedOf(s){
  const r = s.route != null ? routes[s.route] : null;
  return SHIPS[s.kind].speed * seasonOf().sea * windFactor(s.hy || 0) * (r ? 1 + .03 * r.knots : 1) * (s.hungry ? .6 : 1);
}
function makeShip(kind, I, o = {}){
  const s = {id:nextShip++, kind, own:true, name:'', port:I.id, last:I.id, cargo:{}, people:0, path:[], pi:0, state:'moored', route:null, x:I.harbor.x, y:I.harbor.y, hx:1, hy:0, dist:0, ...o};
  const m = moorSpot(I, s); s.x = m.x; s.y = m.y; ships.push(s); return s;
}
function sailTo(s, dest){
  const goal = dest.isl ? moorSpot(isl(dest.isl), s) : {x:dest.x, y:dest.y};
  const path = findPath(s, goal);
  if (!path){ if (s.own) toast('Dorthin findet das Kanu keinen Weg.', 2600, false); return false; }
  s.path = curvePath(s, path); s.pi = 0; s.dest = dest; s.state = 'sail'; s.port = null; s.lastReveal = s.lastReveal || {x:s.x, y:s.y};
  requestDraw(); return true;
}
function stepShips(now, dt){
  for (let i = ships.length - 1; i >= 0; i--){
    const s = ships[i];
    if (s.race){ stepRace(s, now); continue; }
    if (s.state === 'wait'){ s.wait -= dt; if (s.wait <= 0) routeDepart(s); continue; }
    if (s.state !== 'sail') continue;
    let step = speedOf(s) * dt / 1000;
    while (step > 0 && s.pi < s.path.length){
      const t = s.path[s.pi], dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy);
      if (d > .01){ s.hx = dx / d; s.hy = dy / d; }
      if (d <= step){ s.x = t.x; s.y = t.y; s.pi++; step -= d; s.dist += d; }
      else { s.x += dx / d * step; s.y += dy / d * step; s.dist += step; step = 0; }
    }
    if (s.own){ const lr = s.lastReveal || (s.lastReveal = {x:s.x, y:s.y}); if (Math.hypot(s.x - lr.x, s.y - lr.y) > 70){ s.lastReveal = {x:s.x, y:s.y}; exploreAt(s.x, s.y, SHIPS[s.kind].vision); } }
    if (s.pi >= s.path.length) arriveShip(s);
  }
}
function arriveShip(s){
  const d = s.dest; s.path = []; s.dest = null;
  if (!s.own){
    // a clan canoe hands over its return gift and goes home again out of sight
    const T = isl(s.to), C = isl(s.clan).clan;
    for (const [k, v] of Object.entries(s.cargo)) T.stock[k] = Math.min(storeCap(T), (T.stock[k] || 0) + v);
    ships.splice(ships.indexOf(s), 1); updateHUD(); save(); checkQuest(); sfx('shells');
    toast(`${s.guest ? 'Gäste' : 'Gegengabe'} vom ${C.name}: ${giftText(s.cargo)}.`, 4200); return;
  }
  if (!d || !d.isl){ s.state = 'sea'; if (sheetKind === 'ship') renderSheet(); save(); return; }
  const T = isl(d.isl), from = s.last && isl(s.last);
  s.state = 'moored'; s.port = T.id; const m = moorSpot(T, s); s.x = m.x; s.y = m.y;
  exploreAt(s.x, s.y, SHIPS[s.kind].vision);
  // a cord grows between where it came from and here, if here is ours or a clan
  if (from && from !== T && (T.settled || T.clan) && routeIndex(from.id, T.id) < 0){
    routes.push({a:from.id, b:T.id, knots:T.clan ? 0 : 1, lastGift:tick, plan:{a:{}, b:{}}}); invalidate();
    if (T.clan){ const C = T.clan; toast(`Erster Besuch beim ${C.name}. Sie machen ${C.makes.map(k => GN[k]).join(' und ')} und schätzen ${C.wants.map(k => GN[k]).join(', ')}. Übergib eine Gabe.`, 6000); }
  }
  if (T.settled){ s.last = T.id; s.hungry = false; }
  if (s.route != null){ routeArrive(s); return; }
  if (T.clan) toast(`${s.name} liegt beim ${T.clan.name}.`);
  else if (!T.settled) toast(`${s.name} liegt vor ${T.name}. ${s.people >= SETTLE.people ? 'Tippe das Kanu an und gründe hier ein Dorf.' : `Mit ${SETTLE.people} Siedlern an Bord kann hier ein Dorf entstehen.`}`, 4200);
  else toast(`${s.name} ist in ${T.name}.`);
  if (sheetKind === 'ship') renderSheet(); save(); checkQuest();
}
const cargoLoad = s => Object.values(s.cargo).reduce((a, b) => a + b, 0);
function unloadAll(s){
  const I = isl(s.port); if (!I || !I.settled) return;
  for (const [k, v] of Object.entries(s.cargo)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + v);
  I.pop += s.people; s.cargo = {}; s.people = 0; updateHUD(); save();
}
function giveGift(s){
  const T = isl(s.port), ri = routeIndex(s.last, T.id); if (!T.clan || ri < 0 || !cargoLoad(s)) return;
  receiveGift(T, s.cargo, s.last, routes[ri]); s.cargo = {}; save();
}
function settleFrom(s){
  const T = isl(s.port);
  if (!T || T.settled || T.clan) return;
  if (s.people < SETTLE.people){ toast(`Es braucht ${SETTLE.people} Siedler an Bord.`, 2600, false); return; }
  if (mana < manaNeeded()){ toast(`Für eine weitere Siedlung braucht es Ansehen ${manaNeeded()}, jetzt sind es ${Math.floor(mana)}. Feiert ein Fest.`, 4200, false); return; }
  const from = isl(s.last);
  settle(T, from, {pop:s.people, stock:s.cargo}); s.people = 0; s.cargo = {}; s.last = T.id;
}

/* ---------- trade chains: a canoe on a chain unloads, loads what the chain says, waits a moment and sails on */
function assignRoute(s, ri){
  const r = routes[ri]; s.route = ri; s.tripFrom = null;
  if (s.port === r.a || s.port === r.b) routeArrive(s); else sailTo(s, {isl:r.a});
  save();
}
function unassign(s){ s.route = null; if (s.state === 'wait') s.state = 'moored'; save(); }
function routeArrive(s){
  const r = routes[s.route], here = isl(s.port);
  if (s.tripFrom && s.tripFrom !== here.id && !here.clan){ r.knots = Math.min(12, r.knots + 1); invalidate(); }
  if (here.clan){ if (cargoLoad(s)) receiveGift(here, s.cargo, s.tripFrom || s.last, r); s.cargo = {}; }
  else { for (const [k, v] of Object.entries(s.cargo)) here.stock[k] = Math.min(storeCap(here), (here.stock[k] || 0) + v); s.cargo = {}; }
  if (here.settled){
    const plan = r.plan[here.id === r.a ? 'a' : 'b'] || {}; let room = SHIPS[s.kind].cap;
    for (const [k, v] of Object.entries(plan)){ const q = Math.min(v, here.stock[k] || 0, room); if (q > 0){ s.cargo[k] = q; here.stock[k] -= q; room -= q; } }
  }
  s.state = 'wait'; s.wait = 1500; s.tripFrom = here.id;
  updateHUD(); if (sheetKind) renderSheet(); checkQuest();
}
function routeDepart(s){
  const r = routes[s.route]; if (!r){ s.state = 'moored'; s.route = null; return; }
  sailTo(s, {isl:s.port === r.a ? r.b : r.a});
}

/* ---------- canoe houses build one canoe at a time */
function startYard(I, kind){
  const S = SHIPS[kind]; if (I.yard) return;
  if (!canPay(I, S.cost)){ toast(`Zu wenig ${lacking(I, S.cost)}.`, 2600, false); return; }
  pay(I, S.cost); I.yard = {kind, left:S.bt, got:0, st:0}; invalidate(); updateHUD(); syncWalkers(); save();
  toast(`Kanubau beginnt: ${S.n}. ${YARD_CREW} Bauleute holen Holz, dann bauen sie, etwa ${String(Math.round(S.bt * TICK / 30000) / 2).replace('.', ',')} Minuten.`, 3600);
}
/* Building a canoe goes in five steps that can be watched at the canoe house; three builders make full speed */
const YARD_STEPS = {
  oc:[['Der Stamm', 'Ein Stamm vom Brotfruchtbaum liegt auf Böcken.'], ['Aushöhlen', 'Mit Steinbeilen und Glut wird der Rumpf ausgehöhlt.'], ['Bordplanken', 'Planken werden mit Kokosschnur an den Rumpf genäht.'], ['Ausleger', 'Der Schwimmer wird mit zwei Bäumen am Rumpf festgebunden.'], ['Paddel', 'Die Fugen werden mit Brotfruchtharz gedichtet, die Paddel geschnitzt.']],
  dc:[['Die Stämme', 'Zwei große Stämme liegen auf Böcken.'], ['Aushöhlen', 'Mit Steinbeilen und Glut werden beide Rümpfe ausgehöhlt.'], ['Bordplanken', 'Hohe Planken werden mit Kokosschnur angenäht.'], ['Zweiter Rumpf', 'Querbäume verbinden die Rümpfe, darauf kommt eine Plattform.'], ['Mast und Segel', 'Der Mast wird gesetzt, das Segel aus Pandanusmatten genäht.']]
};
const yardStage = y => Math.min(4, Math.floor((1 - y.left / SHIPS[y.kind].bt) * 5));
function stepYards(){
  for (const I of islands){
    // the builders at the canoe house move the work on (see buildBit); here each new step is shown
    if (!I.settled || !I.yard) continue;
    const st = yardStage(I.yard);
    if (I.yard.left > .001){ if (st !== I.yard.st){ const first = I.yard.st == null; I.yard.st = st; invalidate(); if (!first && I.id === active){ const [n, t] = YARD_STEPS[I.yard.kind][st]; toast(`Kanuhaus: ${n}. ${t}`, 3200); sfx('knock'); } } continue; }
    const kind = I.yard.kind; I.yard = null; sfx('splash'); invalidate();
    const s = makeShip(kind, I); s.name = `${SHIPS[kind].n} ${own().filter(o => o.kind === kind).length}`;
    toast(`${s.name} ist fertig. Tippe es im Hafen an, um es zu beladen und zu steuern.`, 4200); checkQuest(); save();
  }
}
/* On a free voyage a double canoe eats provisions; without them the crew turns home, slowly. On a trade chain they eat in port. */
function feedCrews(){
  if (tick % VOYAGE_DAY) return;
  for (const s of ships){
    if (!s.own || s.kind !== 'dc' || s.route != null || s.state === 'moored' && (isl(s.port).settled || isl(s.port).clan)) continue;
    if ((s.cargo.proviant || 0) > 0){ s.cargo.proviant--; continue; }
    if (s.hungry) continue;
    s.hungry = true;
    const home = islands.filter(I => I.settled).reduce((m, I) => Math.hypot(I.harbor.x - s.x, I.harbor.y - s.y) < Math.hypot(m.harbor.x - s.x, m.harbor.y - s.y) ? I : m);
    if (s.route != null) unassign(s);
    sailTo(s, {isl:home.id}); toast(`${s.name} hat keinen Proviant mehr. Die Mannschaft kehrt hungrig nach ${home.name} zurück.`, 4200);
  }
}
/* A clan canoe: a return gift, or guests for the feast */
function clanShip(T, toId, cargo, guest){
  const s = {id:nextShip++, kind:'oc', own:false, clan:T.id, to:toId, guest:!!guest, cargo, people:0, path:[], pi:0, state:'moored', x:T.harbor.x, y:T.harbor.y, hx:1, hy:0, dist:0};
  ships.push(s); if (!sailTo(s, {isl:toId})) ships.splice(ships.indexOf(s), 1);
}

/* ---------- steering: tap a canoe, then tap the sea or an island */
function selectShip(s){ selShip = s; mode = 'steer'; openSheet('ship', {id:s.id}); requestDraw(); }
function hitShip(p){ const lim = Math.max(12, 18 / cam.z); let best = null, bd = lim; for (const s of ships){ if (!s.own && !revealed(s)) continue; const d = Math.hypot(p.x - s.x, p.y - (s.y - 6)); if (d < bd){ bd = d; best = s; } } return best; }
function steerTap(p){
  const s = selShip; if (!s) return;
  const I = islands.find(J => J.discovered && onIsland(J, p));
  if (s.race) return;
  if (I){ if (s.route != null) unassign(s); if (sailTo(s, {isl:I.id})) toast(`${s.name} fährt nach ${I.name}.`, 2600, false); renderSheet(); save(); return; }
  const open = revealed(p);
  if (!open && !SHIPS[s.kind].fog){ toast('Ins Unbekannte fährt nur das Doppelkanu.', 2600, false); return; }
  if (!open && !(s.cargo.proviant > 0)){ toast('Ohne Proviant an Bord fährt die Mannschaft nicht ins Unbekannte. Lade Proviant ein.', 3600, false); return; }
  if (s.route != null) unassign(s);
  if (sailTo(s, {x:p.x, y:p.y})) toast(open ? `${s.name} fährt los.` : `${s.name} fährt ins Unbekannte.`, 2600, false);
  renderSheet(); save();
}

/* ---------- the canoe race at the feast of the Pleiades: once round the lagoon */
function racePath(I){
  if (I.atoll) { const a = I.atoll, pts = []; for (let i = 0; i < 40; i++){ const t = i / 40 * TAU; pts.push({x:a.cx + Math.cos(t) * a.rx * .6, y:a.cy + Math.sin(t) * a.ry * .6}); } return pts; }
  return I.reef.poly.filter((_, i) => i % 3 === 0).map(p => ({x:p.x + (I.center.x - p.x) * .1, y:p.y + (I.center.y - p.y) * .1}));
}
function startRace(I, list){
  const pts = racePath(I), cv = {pts, cum:[0]};
  for (let i = 1; i <= pts.length; i++) cv.cum.push(cv.cum[i - 1] + Math.hypot(pts[i % pts.length].x - pts[i - 1].x, pts[i % pts.length].y - pts[i - 1].y));
  const now = performance.now();
  list.forEach((s, i) => { s.race = {cv, t0:now, speed:40 + Math.random() * 14, off:i * 14, until:now + 14000, isl:I.id}; });
}
function stepRace(s, now){
  const R = s.race, len = R.cv.cum[R.cv.cum.length - 1], d = ((now - R.t0) / 1000 * R.speed + R.off) % len;
  let j = 1; while (R.cv.cum[j] < d) j++;
  const a = R.cv.pts[j - 1], b = R.cv.pts[j % R.cv.pts.length], t = (d - R.cv.cum[j - 1]) / (R.cv.cum[j] - R.cv.cum[j - 1] || 1);
  s.x = a.x + (b.x - a.x) * t; s.y = a.y + (b.y - a.y) * t; const l = Math.hypot(b.x - a.x, b.y - a.y) || 1; s.hx = (b.x - a.x) / l; s.hy = (b.y - a.y) / l;
  if (now > R.until){ s.race = null; const m = moorSpot(isl(R.isl), s); s.x = m.x; s.y = m.y; }
}
