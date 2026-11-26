/* ======================================================================================================================
   Der Hof (Version 121). Wer frei hat, pflegt in der freien Zeit auch den Hof der eigenen Familie: erst wird gefegt, dann
   kommen Ti-Pflanzen und bunte Sträucher, zuletzt eine Hecke. Es kostet keine Arbeit und keine Waren, nur freie Zeit, und die
   schafft der Regler „Arbeit und Freizeit“: Viel Freizeit pflegt anderthalbmal so schnell, Dringend Arbeit gar nicht, der
   Hof bleibt dann, wie er ist. Ein Hof zählt zur Schönheit des Dorfes; ab „bepflanzt“ macht er die Familie zufriedener.
   Wer ein Hauswerk hat, ist nach Feierabend schon zu Hause und pflegt ein Viertel schneller.
   Gezeichnet wird alles flach auf dem Boden, vor den Häusern. Drei Häuser und mehr nah beieinander teilen sich einen
   gefegten Platz in der Mitte und zeigen einzeln weniger; ein Haus für sich zeigt mehr. Nichts wird auf ein anderes
   Gebäude, einen Baum oder ins Wasser gezeichnet.
   ====================================================================================================================== */
const HOF_AT = [0, .6, 1.3, 2.2], HOF_MAX = 2.4;   // Pflege in „Tagen freier Hände“: gefegt, bepflanzt, prächtig
const HOF_N = ['kahl', 'gefegt', 'bepflanzt', 'prächtig'];
const HOF_KINDS = new Set(['haus', 'fale']);   // ein Pfahlhaus steht im Wasser und hat keinen Hof
const hofStep = b => { const c = (b && b.care) || 0; return c >= HOF_AT[3] ? 3 : c >= HOF_AT[2] ? 2 : c >= HOF_AT[1] ? 1 : 0; };
/* how much one person adds in a day: their share of free time by the setting (the village's for children), the old half,
   children a quarter (they only sweep) */
function hofHands(I, p){
  const a = stageOf(p), Z = a === 'kid' ? zealOf(I) : zealP(I, p), free = .14 * Z.off[0] + .07 * Z.off[1];
  return free * (a === 'kid' ? .25 : a === 'old' ? .5 : 1);
}
/* the care a house gets per day */
function hofRate(I, h){
  const f = famOfHome(I, h); if (!f) return 0;
  let r = 0; for (const p of membersOf(I, f)) r += hofHands(I, p);
  return r * (craftOf(I, h) ? 1.25 : 1);
}
/* every few ticks: the yards grow with the free hands; a new step is drawn at once */
function hofTick(I, dt){
  if (!I.settled) return;
  for (const h of I.buildings){
    if (!HOF_KINDS.has(h.kind) || h.bt) continue;
    const s0 = hofStep(h), r = hofRate(I, h); if (!r) continue;
    h.care = Math.min(HOF_MAX, (h.care || 0) + r * dt / DAY_TICKS);
    if (hofStep(h) !== s0){ I._yp = null; invalidate(); }
  }
}
/* the beauty of the yards: a point for each three steps, at most eight */
const hofBeauty = I => Math.min(8, Math.floor(I.buildings.reduce((t, b) => t + (HOF_KINDS.has(b.kind) && !b.bt ? hofStep(b) : 0), 0) / 3));
/* the way to the door: 2 a shell path reaches it, 1 a trodden path, 0 grass */
function hofPath(I, h){
  const g = I._wg; if (!g) return 0; let best = 0;
  for (const [dx, dy] of [[0, 9], [-6, 9], [6, 9], [0, 15], [-11, 4], [11, 4]]){ const i = wearAt(g, h.x + dx, h.y + dy); if (i < 0) continue; if (g.road[i]) return 2; if (g.lv[i] >= 2) best = 1; }
  return best;
}
/* the yard in the house sheet: a plant, three pips for the steps, the way to the door; a tap tells the rest */
function hofMini(I, h){
  if (!HOF_KINDS.has(h.kind) || h.bt) return '';
  const st = hofStep(h), r = hofRate(I, h), w = hofPath(I, h), left = st < 3 && r > 0 ? (HOF_AT[st + 1] - (h.care || 0)) / r * DAY_TICKS * TICK / 1000 : 0;
  const tip = `<b>Hof: ${HOF_N[st]}</b> ${st >= 3 ? 'Ganz gepflegt.' : r > 0 ? `Wächst in freier Zeit. Nächste Stufe in etwa ${secsText(Math.max(5, left))}.` : 'Wächst gerade nicht: keine freie Zeit.'}${st >= 2 ? ' Die Familie ist zufriedener.' : ''}`
    + (w === 2 ? ' Ein Muschelweg führt bis zur Tür.' : w === 1 ? ' Ein Trampelpfad führt zur Tür. Wird er lange viel gelaufen, streut man Muschelkalk: ein Muschelweg.' : '');
  return `<span class="hofmini${r > 0 || st >= 3 ? '' : ' still'}" role="img" aria-label="Hof ${HOF_N[st]}, ${st} von 3${w === 2 ? ', Muschelweg' : w === 1 ? ', Trampelpfad' : ''}" data-tip="${esc(tip)}">${icon('hof')}${[1, 2, 3].map(i => `<i class="${st >= i ? 'on' : ''}"></i>`).join('')}${w ? `<span class="hw${w === 2 ? ' on' : ''}">${icon('pfad')}</span>` : ''}</span>`;
}

/* ---------- where things may go. A point is free when it lies on land, off the beach, and outside the picture of every
   building (its width, its height above the ground, a little below) and away from the trees. */
function hofFree(I, x, y, rad, own, ground, skip){
  const L = landAt(I, {x, y}); if (!L || polyDist({x, y}, L.poly) < rad + 2) return false;
  for (const b of I.buildings){
    if (b.kind === 'anleger' || ground && own && (b === own || b.at === own.id) || skip && (skip.includes(b) || skip.some(q => b.at === q.id))) continue;   // the swept sand lies under its own house and craft
    const K = KINDS[b.kind], dx = x - b.x, dy = y - b.y, w = (K.r || 6) * ((b.v && b.v.scale) || 1) * (K.roof ? 1.75 : 1);   // a house is wider than its ground: eaves and the porch
    if (b === own){ if (Math.abs(dx) < w + rad && dy > -(K.hy || w) - rad - 2 && dy < 4 + rad) return false; continue; }
    if (FLAT.has(b.kind) || K.soil){ if (Math.hypot(dx, dy * 1.6) < w + rad + 1) return false; continue; }
    if (Math.abs(dx) < w + rad + 1 && dy > -(K.hy || w) - rad - 2 && dy < w * .5 + rad + 1) return false;
  }
  for (const t of I.trees || []) if (Math.abs(x - t.x) < rad + 5 && y - t.y > -rad - 14 && y - t.y < rad + 3) return false;
  return true;
}
const hofEllFree = (I, x, y, rx, ry, own) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]].every(([a, b]) => hofFree(I, x + a * rx, y + b * ry, 1, own, true));
/* the plants of a family: by its line, Ti red, croton yellow or hibiscus */
const HOF_PLANTS = [['ti', 'ti', 'kroton'], ['kroton', 'ti', 'kroton'], ['hibiskus', 'ti', 'hibiskus']];

/* ---------- the plan of the yards of an island, made again only when a house, a step or a tree changes */
/* which buildings join their neighbours, and how: houses with stepping stones and a line, fields with an earth bank,
   workplaces with a strip of crushed shell, the places at the shore with planks. Decorations, trees, palms, plazas and
   what stands in the water do not join. */
function linkFam(b){
  const K = KINDS[b.kind]; if (!K || b.bt || b.at) return '';
  if (HOF_KINDS.has(b.kind)) return 'haus';
  if (K.soil || b.kind === 'garten' || b.kind === 'bananen') return 'feld';
  if (b.kind === 'fisch' || b.kind === 'taucher' || b.kind === 'werft' || b.kind === 'steg') return 'see';
  if (K.plant || K.water || b.kind === 'anleger' || FLAT.has(b.kind) || (K.beauty && !K.prod)) return '';
  return 'werk';
}
function hofSig(I){ let s = I.buildings.length + '|' + (I.trees || []).length; for (const b of I.buildings){ const f = linkFam(b); if (f) s += `|${b.id}:${b.x | 0}:${b.y | 0}:${f === 'haus' ? hofStep(b) : ''}`; } return s; }
function hofPlan(I){
  const sig = hofSig(I); if (I._yp && I._yp.sig === sig) return I._yp;
  const hs = I.buildings.filter(b => HOF_KINDS.has(b.kind) && !b.bt), items = [], sand = [];
  // groups: houses that stand close together, joined from neighbour to neighbour
  const grp = new Map(hs.map(h => [h, [h]]));
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++){
    const a = hs[i], b = hs[j]; if (Math.hypot(a.x - b.x, (a.y - b.y) * 1.2) > 40 || grp.get(a) === grp.get(b)) continue;
    const A = grp.get(a), B = grp.get(b); A.push(...B); for (const q of B) grp.set(q, A);
  }
  const groups = [...new Set(grp.values())].filter(g => g.length >= 3);
  const inGroup = new Map(); for (const g of groups){ const G = {cx:g.reduce((t, h) => t + h.x, 0) / g.length, cy:g.reduce((t, h) => t + h.y, 0) / g.length, g}; for (const h of g) inGroup.set(h, G); }
  // a group whose houses are mostly swept shares a plaza in the middle (unless the village plaza is right there)
  for (const g of groups){
    const {cx, cy} = inGroup.get(g[0]); if (g.filter(h => hofStep(h) >= 1).length < 2) continue;
    if (I.buildings.some(b => (b.kind === 'platz' || b.kind === 'tanzplatz') && Math.hypot(b.x - cx, b.y - cy) < 34)) continue;
    // in the middle if there is room, else in front of the group, where the doors look out
    const maxY = Math.max(...g.map(h => h.y));
    out: for (const y of [cy + 2, maxY + 14, maxY + 20]) for (let rx = 18; rx >= 9; rx -= 3) if (hofEllFree(I, cx, y, rx, rx * .48, null)){ sand.push({x:cx, y, rx, ry:rx * .48, plaza:true}); inGroup.get(g[0]).plaza = true; break out; }
  }
  for (const h of hs){
    const st = hofStep(h); if (!st) continue;
    const G = inGroup.get(h), f = famOfHome(I, h), pal = HOF_PLANTS[((f && f.id) || h.id) % 3];
    const place = (x, y, k, r) => { if (hofFree(I, x, y, r, h) && !items.some(q => Math.hypot(q.x - x, q.y - y) < q.r + r + .6)){ items.push({x, y, k, r, s:h.id + items.length}); return true; } return false; };
    // the swept sand before the door: big for a house on its own, small in a group, none when the group has its plaza
    if (!(G && G.plaza)) for (const rx of G ? [9, 7] : [14, 11, 8]) if (hofEllFree(I, h.x, h.y + 8, rx, rx * .42, h)){ sand.push({x:h.x, y:h.y + 8, rx, ry:rx * .42}); break; }
    if (st < 2) continue;
    // plants at the corners: on its own up to three, in a group one on the side away from the others
    if (G){ const sx = h.x >= G.cx ? 1 : -1; place(h.x + sx * 14, h.y + 2, pal[0], 2.6) || place(h.x + sx * 12, h.y + 12, pal[0], 2.6); }
    else { let n = 0; for (const [dx, dy, i] of [[-14, 2, 0], [14, 2, 1], [12, 13, 2], [-12, 13, 1]]) if (n < 3 && place(h.x + dx, h.y + dy, pal[i], 2.6)) n++; }
    if (st < 3) continue;
    // the hedge: on its own two low arcs that leave the door open, and a banana plant behind; in a group one short arc outward
    if (G){ const dx = h.x - G.cx, dy = h.y - G.cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      for (const k of [-1, 0, 1]) place(h.x + ux * 17 - uy * k * 5, h.y + 6 + uy * 9 + ux * k * 5, 'hecke', 2.4); }
    else { for (const s of [-1, 1]) for (const [dx, dy] of [[18, 5], [17, 10], [14, 15]]) place(h.x + s * dx, h.y + dy, 'hecke', 2.4);
      place(h.x + 20, h.y - 4, 'banane', 4) || place(h.x - 20, h.y - 4, 'banane', 4); }
  }
  // neighbours: two buildings of the same kind close together are joined, each with at most two, the nearest first.
  // Houses: stepping stones from door to door, and where they stand side by side a line of sennit, tied to a peg in each
  // wall, with tapa and blossoms on it. Fields: an earth bank between them. Workplaces: a strip of crushed shell. At the
  // shore: planks. Only for the eye: each family keeps its house, its people and its craft; each place its work.
  const links = [], deg = new Map(), pairs = [], lk = I.buildings.filter(b => linkFam(b)), fam = new Map(lk.map(b => [b, linkFam(b)])), rOf = b => KINDS[b.kind].r * ((b.v && b.v.scale) || 1);
  for (let i = 0; i < lk.length; i++) for (let j = i + 1; j < lk.length; j++){
    const a = lk[i], b = lk[j], f = fam.get(a); if (f !== fam.get(b)) continue;
    const d = Math.hypot(a.x - b.x, (a.y - b.y) * 1.2), e = d - rOf(a) - rOf(b);
    if (f === 'haus' ? d >= 18 && d <= 44 : e >= -3 && e <= 20) pairs.push([d, a, b, f]);
  }
  pairs.sort((p, q) => p[0] - q[0]);
  const STEP = {haus:6, feld:2.3, werk:3.4, see:3};
  for (const [, a0, b0, f] of pairs){
    if ((deg.get(a0) || 0) >= 2 || (deg.get(b0) || 0) >= 2) continue;
    const [a, b] = a0.x <= b0.x ? [a0, b0] : [b0, a0], skip = [a, b], stones = [], wa = rOf(a), wb = rOf(b);
    // the way: houses from door to door on a gentle curve; the others from edge to edge, straight
    let ax, ay, bx, by; if (f === 'haus'){ ax = a.x; ay = a.y + 8; bx = b.x; by = b.y + 8; }
    else { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, k = f === 'feld' ? .92 : .75, oy = f === 'feld' ? 0 : 4;
      ax = a.x + ux * wa * k; ay = a.y + uy * wa * k * .6 + oy; bx = b.x - ux * wb * k; by = b.y - uy * wb * k * .6 + oy; }
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / STEP[f])), bend = f === 'haus' ? 2.5 : 0, ang = Math.atan2(by - ay, bx - ax);
    for (let k = f === 'feld' ? 0 : 1; k < (f === 'feld' ? n + 1 : n); k++){ const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t + Math.sin(t * Math.PI) * bend; if (hofFree(I, x, y, f === 'feld' ? .9 : 1.6, null, false, skip)) stones.push({x, y, t, ang}); }
    // the line, only between houses side by side: from a peg in one wall to a peg in the other, not over a third building
    let line = null;
    if (f === 'haus'){ const L = {x1:a.x + wa * .8 + 1.6, y1:a.y - 5, x2:b.x - wb * .8 - 1.6, y2:b.y - 5, w1:{x:a.x + wa * .8, y:a.y - 5}, w2:{x:b.x - wb * .8, y:b.y - 5}};
      if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y) * 1.1 && L.x2 - L.x1 > 4 && [.3, .5, .7].every(t => hofFree(I, L.x1 + (L.x2 - L.x1) * t, L.y1 + (L.y2 - L.y1) * t + 9, 1, null, false, skip))) line = L; }
    if (stones.length < (f === 'feld' ? 3 : 1) && !line) continue;
    deg.set(a0, (deg.get(a0) || 0) + 1); deg.set(b0, (deg.get(b0) || 0) + 1);
    links.push({key:a.id + '-' + b.id, a, b, fam:f, stones, line, seed:(a.id * 7 + b.id * 13) % 97});
  }
  // a link that is new while the game runs grows in; the ones there at the start are simply there
  const seen = I._lkSeen || (I._lkSeen = new Map()), first = !I._lkInit; I._lkInit = true;
  for (const L of links) if (!seen.has(L.key)) seen.set(L.key, first ? -1e9 : performance.now());
  return I._yp = {sig, items, sand, links};
}

/* ---------- drawing, on the ground under the houses (base layer) */
function drawHofPlant(c, q){
  const {x, y, k} = q, j = (q.s * 7.3) % 1;
  c.save(); c.translate(x, y); c.scale(1.3, 1.3); c.translate(-x, -y); drawHofPlant0(c, q, x, y, k, j); c.restore();
}
function drawHofPlant0(c, q, x, y, k, j){
  c.lineWidth = .4; c.strokeStyle = '#2B1D14';
  if (k === 'hecke'){ c.fillStyle = '#3E6A2E'; c.beginPath(); c.ellipse(x, y, 2.8, 2, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#6E9A48'; c.beginPath(); c.arc(x - .8, y - .7, .9, 0, TAU); c.fill(); return; }
  if (k === 'banane'){ c.strokeStyle = '#2B1D14'; c.lineWidth = .5;
    for (let i = 0; i < 5; i++){ const a = -Math.PI / 2 + (i - 2) * .62 + j * .3, ex = x + Math.cos(a) * 5.5, ey = y - 2 + Math.sin(a) * 4.6;
      c.fillStyle = i % 2 ? '#5E8F3A' : '#7FAE4E'; c.beginPath(); c.moveTo(x, y - 1.6); c.quadraticCurveTo(x + Math.cos(a - .5) * 3.4, y - 1.6 + Math.sin(a - .5) * 3, ex, ey); c.quadraticCurveTo(x + Math.cos(a + .5) * 3.4, y - 1.6 + Math.sin(a + .5) * 3, x, y - 1.6); c.fill(); c.stroke(); }
    c.fillStyle = '#6B4A2E'; c.fillRect(x - .5, y - 1.8, 1, 2); return; }
  // a rosette of narrow leaves: Ti red, croton yellow and green; hibiscus a green bush with red flowers
  const col = k === 'ti' ? ['#A8324A', '#C8506A'] : k === 'kroton' ? ['#C9962E', '#7E9A3A'] : ['#4E7A3A', '#6E9A48'];
  for (let i = 0; i < 6; i++){ const a = -Math.PI / 2 + (i - 2.5) * .55 + (j - .5) * .3, len = 2.8 + (i % 2) * .6, ex = x + Math.cos(a) * len, ey = y - .6 + Math.sin(a) * len * .9;
    c.fillStyle = col[i % 2]; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a - .6) * len * .55, y + Math.sin(a - .6) * len * .55, ex, ey); c.quadraticCurveTo(x + Math.cos(a + .6) * len * .55, y + Math.sin(a + .6) * len * .55, x, y); c.fill(); c.stroke(); }
  if (k === 'hibiskus') for (const [dx, dy] of [[-1.2, -2], [1.4, -1.2]]){ c.fillStyle = '#D8402C'; c.beginPath(); c.arc(x + dx, y + dy, .85, 0, TAU); c.fill(); c.lineWidth = .25; c.stroke(); }
}
function drawYards(c, I){
  if (!I.settled) return;
  const P = hofPlan(I);
  for (const s of P.sand){   // swept sand: a soft edge, then the pale ground with the marks of the broom
    c.fillStyle = 'rgba(232,214,168,.45)'; c.beginPath(); c.ellipse(s.x, s.y, s.rx + 1.6, s.ry + 1, 0, 0, TAU); c.fill();
    c.fillStyle = s.plaza ? '#E6D3A3' : '#E9D9AE'; c.beginPath(); c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(176,150,100,.55)'; c.lineWidth = .35; c.beginPath();
    for (let i = -2; i <= 2; i++){ const yy = s.y + i * s.ry * .36, w = s.rx * Math.sqrt(Math.max(0, 1 - (i * .36) ** 2)) * .7; c.moveTo(s.x - w, yy); c.quadraticCurveTo(s.x, yy + .8, s.x + w, yy); } c.stroke();
  }
  for (const L of P.links) if (hofGrow(I, L) >= 1) for (const s of L.stones) drawHofStone(c, s, L.seed, 1, 1, 1, L.fam);
  for (const q of [...P.items].sort((a, b) => a.y - b.y)) drawHofPlant(c, q);
}
/* The joining is meant to be watched, like a small toy: soft, springy, with a sound for each step.
   0 – .38  the stones (clods, shell, planks) drop in one after the other, squash on landing, spring back, a puff of dust,
            a "plop" each, a little higher
   .34 – .45 houses: a peg pops out of each wall; the line is knotted to the first, carried across, knotted to the second
   .56      pulled taut: it twangs and swings out
   .62 – .92 the cloths and the blossoms drop onto it one by one and bounce on their strings, a soft tick each
   .95      a last bright note */
const HOF_GROW = 3600;
const hofGrow = (I, L) => { const t0 = I._lkSeen && I._lkSeen.get(L.key); return t0 == null ? 1 : clamp((performance.now() - t0) / HOF_GROW, 0, 1); };
const springy = f => f >= 1 ? 1 : 1 - Math.cos(f * Math.PI * 3) * Math.exp(-f * 5.2);   // overshoots, settles
const hofPhase = (g, i, n, from, to) => clamp(((g - from) / (to - from)) * n - i, 0, 1);   // the share of step i of n in a span
function drawHofStone(c, s, seed, k = 1, sx = 1, sy = 1, fam = 'haus'){
  const j = ((s.t * 31 + seed) % 7) / 7;
  if (fam === 'feld'){   // a clod of the earth bank: brown, round, a tuft of grass on some
    const r = 1.25 * k; c.fillStyle = 'rgba(43,29,20,.18)'; c.beginPath(); c.ellipse(s.x + .3, s.y + .45, r * 1.2 * sx, r * .55, 0, 0, TAU); c.fill();
    c.fillStyle = j < .5 ? '#7A5434' : '#8A6440'; c.strokeStyle = '#3B2618'; c.lineWidth = .3; c.beginPath(); c.ellipse(s.x, s.y - (sy - 1) * r * .5, r * 1.15 * sx, r * .7 * sy, 0, 0, TAU); c.fill(); c.stroke();
    if (j > .6 && k === 1){ c.strokeStyle = '#6E9A48'; c.lineWidth = .35; c.beginPath(); c.moveTo(s.x - .3, s.y - .4); c.lineTo(s.x - .6, s.y - 1.4); c.moveTo(s.x + .2, s.y - .4); c.lineTo(s.x + .5, s.y - 1.3); c.stroke(); }
    return; }
  if (fam === 'werk'){   // a handful of crushed shell, white
    const r = 1.1 * k; for (let q = 0; q < 3; q++){ const ox = (q - 1) * 1.1 * sx, oy = ((q * 7 + seed) % 3 - 1) * .45; c.fillStyle = q % 2 ? '#F1EADA' : '#E2D8C2'; c.strokeStyle = 'rgba(90,74,56,.55)'; c.lineWidth = .25; c.beginPath(); c.ellipse(s.x + ox, s.y + oy - (sy - 1) * r * .4, r * .62 * sx, r * .42 * sy, j, 0, TAU); c.fill(); c.stroke(); }
    return; }
  if (fam === 'see'){   // a plank laid across the way
    const r = 1.6 * k; c.save(); c.translate(s.x, s.y); c.rotate((s.ang || 0) + Math.PI / 2); c.scale(sx, sy);
    c.fillStyle = 'rgba(43,29,20,.18)'; c.fillRect(-r * 1.4 + .3, -r * .38 + .4, r * 2.8, r * .76);
    c.fillStyle = j < .5 ? '#B08048' : '#A0723E'; c.strokeStyle = '#2B1D14'; c.lineWidth = .3; c.beginPath(); c.rect(-r * 1.4, -r * .38, r * 2.8, r * .76); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(43,29,20,.4)'; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); c.restore(); return; }
  const r = 1.7 * k;
  c.fillStyle = 'rgba(43,29,20,.16)'; c.beginPath(); c.ellipse(s.x + .4, s.y + .5, r * 1.15 * sx, r * .62, 0, 0, TAU); c.fill();
  c.fillStyle = j < .5 ? '#C9C0AA' : '#B8AE98'; c.strokeStyle = '#5A4A38'; c.lineWidth = .35; c.beginPath(); c.ellipse(s.x, s.y - (sy - 1) * r * .5, r * (1 + j * .25) * sx, r * .55 * sy, j - .5, 0, TAU); c.fill(); c.stroke();
  if (k === 1 && sx === 1){ c.fillStyle = 'rgba(255,250,235,.45)'; c.beginPath(); c.ellipse(s.x - r * .3, s.y - r * .2, r * .45, r * .18, j - .5, 0, TAU); c.fill(); }   // a glint of wet stone
}
/* a sound for a step, only when the link is on screen and close enough to see; each sound once */
function hofSound(I, L, k, name, step){
  const S = I._lkSnd || (I._lkSnd = new Map()), done = S.get(L.key) || new Set(); if (done.has(k)) return; done.add(k); S.set(L.key, done);
  if (cam.z > PEOPLE_Z * .8 && typeof sfx === 'function') sfx(name, step);
}
/* the top layer, every frame: what is still growing, and the line between the eaves swaying in the wind */
function drawHofLinks(c, v, now){
  if (lod === 'far' || cam.z < .9) return;
  const W = wind(), str = reduced ? 0 : W.str, dir = W.tx < 0 ? -1 : 1;
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v)) continue;
    const P = hofPlan(I);
    for (const L of P.links){
      const g = hofGrow(I, L); if (!ptIn((L.a.x + L.b.x) / 2, L.a.y, v)) continue;
      if (g < 1){
        const n = L.stones.length;
        L.stones.forEach((s, i) => { const f = hofPhase(g, i, n, 0, .38); if (f <= 0) return;
          if (f >= 1){ drawHofStone(c, s, L.seed, 1, 1, 1, L.fam); return; }
          // drops from a little above, lands at 40 %, squashes flat, springs up round, settles
          if (f < .4){ const q = f / .4, y = -7 * (1 - q * q); c.save(); c.translate(0, y); c.globalAlpha = .4 + .6 * q; drawHofStone(c, s, L.seed, .9, .85, 1.25, L.fam); c.restore(); return; }
          hofSound(I, L, 's' + i, 'pop', L.fam === 'feld' ? Math.floor(i / 2) - 3 : L.fam === 'see' ? i - 1 : i);
          const q = (f - .4) / .6, e = springy(q), sq = (1 - e) * .55;
          drawHofStone(c, s, L.seed, 1, 1 + sq, 1 - sq * .8, L.fam);
          // a puff of dust running out from under it
          c.save(); c.globalAlpha = (1 - q) * .55; c.strokeStyle = '#E8DCC0'; c.lineWidth = .5; c.beginPath(); c.ellipse(s.x, s.y + .3, 2 + q * 4.5, .9 + q * 1.8, 0, 0, TAU); c.stroke();
          for (let k = 0; k < 3; k++){ const a = (k / 3) * TAU + L.seed; c.fillStyle = '#E8DCC0'; c.beginPath(); c.arc(s.x + Math.cos(a) * (2 + q * 5), s.y - q * 2 + Math.sin(a) * (1 + q * 2), .45 * (1 - q), 0, TAU); c.fill(); }
          c.restore(); });
        if (g >= .95) hofSound(I, L, 'end', 'pling', 0);
      }
      if (g >= 1 && I._lkSeen.get(L.key) > 0){ I._lkSeen.set(L.key, -1e9); invalidate(); }   // done: the stones go down into the ground layer
      const Q = L.line; if (!Q) continue;
      // the anchors: a wooden peg pushed out of each wall, bound round with sennit; each pops out in turn
      const peg = (W, f, side) => { if (f <= 0) return; const e = f >= 1 ? 1 : springy(f), len = 1.9 * e;
        c.save(); c.translate(W.x, W.y); c.scale(side, 1); c.lineCap = 'round';
        c.strokeStyle = '#2B1D14'; c.lineWidth = 1.15; c.beginPath(); c.moveTo(-.4, 0); c.lineTo(len, 0); c.stroke();
        c.strokeStyle = '#9C6A40'; c.lineWidth = .6; c.beginPath(); c.moveTo(-.2, 0); c.lineTo(len, 0); c.stroke();
        c.strokeStyle = '#D9B87A'; c.lineWidth = .3; c.beginPath(); for (let k = 0; k < 3; k++){ const x = -.1 + k * .42; c.moveTo(x, -.55); c.lineTo(x + .3, .55); } c.stroke();   // the binding
        c.restore(); };
      const pf1 = g >= 1 ? 1 : clamp((g - .34) / .07, 0, 1), pf2 = g >= 1 ? 1 : clamp((g - .38) / .07, 0, 1);
      if (pf1 > .3) hofSound(I, L, 'p1', 'tick', -4); if (pf2 > .3) hofSound(I, L, 'p2', 'tick', -2);
      peg(Q.w1, pf1, 1); peg(Q.w2, pf2, -1);
      const lf = clamp((g - .42) / .14, 0, 1); if (lf <= 0) continue;   // the line: carried across from one peg to the other
      // pulled taut at the end: it twangs, sags deep and swings out, smaller and smaller
      const tq = clamp((g - .56) / .25, 0, 1), twang = g >= .56 && g < 1 ? Math.cos(tq * Math.PI * 5) * Math.exp(-tq * 4.5) * 2.6 : 0;
      if (g >= .56) hofSound(I, L, 'line', 'twang', 0);
      const sag = 3.2 + str * 1.2 + twang + (lf < 1 ? 2 * (1 - lf) : 0), sw = Math.sin(now / 900 + L.seed) * str * 1.2, pt = t => ({x:Q.x1 + (Q.x2 - Q.x1) * t + sw * Math.sin(t * Math.PI) * .5, y:Q.y1 + (Q.y2 - Q.y1) * t + Math.sin(t * Math.PI) * sag});
      c.save(); c.lineCap = 'round';
      const p = new Path2D(); const e = pt(0); p.moveTo(e.x, e.y); for (let t = .08; t <= lf + 1e-6; t += .08){ const q = pt(Math.min(t, lf)); p.lineTo(q.x, q.y); } { const q = pt(lf); p.lineTo(q.x, q.y); }
      stroke(c, p, '#2B1D14', .9); stroke(c, p, '#C9A46A', .45);
      if (lf < 1){ const q = pt(lf); c.fillStyle = '#C9A46A'; c.strokeStyle = '#2B1D14'; c.lineWidth = .35; c.beginPath(); c.arc(q.x, q.y, .9, 0, TAU); c.fill(); c.stroke(); }   // the end of the line in a hand, travelling across
      // the knots: tied at the first peg as the line sets off, at the second when it arrives; each pulls tight with a pop
      const knot = (q, f) => { if (f <= 0) return; const e = f >= 1 ? 1 : springy(f), r = .95 * e * (1 + (1 - e) * .6); c.fillStyle = '#B08048'; c.strokeStyle = '#2B1D14'; c.lineWidth = .35; c.beginPath(); c.ellipse(q.x, q.y, r * 1.15, r, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.moveTo(q.x - r * .5, q.y - r * .3); c.lineTo(q.x + r * .5, q.y + r * .3); c.stroke(); };
      const k1 = g >= 1 ? 1 : clamp((g - .42) / .06, 0, 1), k2 = g >= 1 ? 1 : clamp((g - .56) / .06, 0, 1);
      if (k1 > .3) hofSound(I, L, 'k1', 'tick', 0); if (k2 > .3) hofSound(I, L, 'k2', 'tick', 2);
      knot(pt(0), k1); if (lf >= 1) knot(pt(1), k2);
      // what hangs on it: tapa cloths and a string of blossoms, each dropping onto the line in turn and bouncing on its string
      const span = Math.hypot(Q.x2 - Q.x1, Q.y2 - Q.y1), things = span < 14 ? [.5] : span < 22 ? [.33, .67] : span < 30 ? [.25, .5, .75] : [.25, .45, .62, .8];
      things.forEach((t, i) => { const f = hofPhase(g, i, things.length, .62, .92); if (f <= 0 || t > lf) return;
        if (f > .3) hofSound(I, L, 'h' + i, 'tick', i);
        const q = pt(t), land = f < .3 ? f / .3 : 1, drop = f < .3 ? -6 * (1 - land * land) : 0, e = f < .3 ? 0 : springy((f - .3) / .7), bounce = f < .3 ? 0 : (1 - e) * 2.2;
        const a = (reduced ? 0 : Math.sin(now / (520 + i * 70) + L.seed + i) * .22 * (.3 + str)) + dir * str * .18 + (f < 1 ? Math.sin(f * 14) * (1 - f) * .5 : 0);
        c.save(); c.translate(q.x, q.y + drop + bounce); c.rotate(a); c.scale(1 - bounce * .06, 1 + bounce * .1);
        if ((i + L.seed) % 3 === 2){ for (let k = 0; k < 4; k++){ c.fillStyle = k % 2 ? '#E9B23A' : '#D8402C'; c.beginPath(); c.arc(0, .9 + k * 1.05 * (1 + bounce * .08), .62, 0, TAU); c.fill(); } }   // a garland of blossoms
        else { c.fillStyle = '#EDE0C2'; c.strokeStyle = '#2B1D14'; c.lineWidth = .3; c.beginPath(); c.rect(-1.5, .2, 3, 3.6); c.fill(); c.stroke();   // a tapa cloth with its pattern
          c.strokeStyle = '#7A3A22'; c.lineWidth = .3; c.beginPath(); c.moveTo(-1.5, 1.4); c.lineTo(1.5, 1.4); c.moveTo(-1.5, 2.6); c.lineTo(1.5, 2.6); c.moveTo(0, .2); c.lineTo(0, 3.8); c.stroke(); }
        c.restore(); });
      c.restore();
    }
  }
}

