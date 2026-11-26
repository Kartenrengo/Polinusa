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
function hofFree(I, x, y, rad, own, ground){
  const L = landAt(I, {x, y}); if (!L || polyDist({x, y}, L.poly) < rad + 2) return false;
  for (const b of I.buildings){
    if (b.kind === 'anleger' || ground && own && (b === own || b.at === own.id)) continue;   // the swept sand lies under its own house and craft
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
function hofSig(I){ let s = I.buildings.length + '|' + (I.trees || []).length; for (const b of I.buildings) if (HOF_KINDS.has(b.kind) && !b.bt) s += `|${b.id}:${b.x | 0}:${b.y | 0}:${hofStep(b)}`; return s; }
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
  return I._yp = {sig, items, sand};
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
  for (const q of [...P.items].sort((a, b) => a.y - b.y)) drawHofPlant(c, q);
}
