'use strict';
/* ---------- fine detail on the ground (Version 99). Every island gets little things that nobody asked for and everybody
   sees: a wrack line of seaweed and a lace of foam along the shore, pebbles, shells, crab holes in the sand; coconuts and
   husks under the palms, leaves and fruit under the breadfruit trees, footprints to the canoes.
   All of it is drawn into the cached base layer from a few Path2D per island, so it costs nothing per frame. The
   coast part is built once per island and seeded by the island; the part that depends on what stands there (palms,
   trees, canoes) is built again when that changes. Only zoomed in (not 'far'); the finest things only with a good quality.
   Nothing is spread evenly: most of the beach stays bare, so the eye has a place to rest. */
const GD_INK = '#2B1D14';
const gdHash = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233 + 4.17) * 43758.5453; return h - Math.floor(h); };

/* the part along the coast: seeded by the island, built once */
function coastDetail(I){
  if (I._gc) return I._gc;
  const r = rng((Math.round(I.center.x * 7 + I.center.y * 13) ^ 0x7ac3) >>> 0);
  const P = {wrack:new Path2D(), wrackDots:new Path2D(), pebbles:new Path2D(), shells:new Path2D(), shellLines:new Path2D(), holes:new Path2D(), rims:new Path2D(), pellets:new Path2D(), lace:new Path2D(), laceDots:new Path2D(), weedDark:new Path2D()};
  for (const Ld of I.lands){
    const L = Ld.poly, n = L.length; if (n < 5) continue;
    // which side of the line is the land: the majority of a few samples decides
    let vote = 0; for (let k = 0; k < 7; k++){ const j = Math.floor(k * n / 7), a = L[j], b = L[(j + 1) % n], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, m = {x:(a.x + b.x) / 2 - ty / l * 2, y:(a.y + b.y) / 2 + tx / l * 2}; vote += inPoly(m, L) ? 1 : -1; }
    const sg = vote >= 0 ? 1 : -1;
    for (let j = 0; j < n; j++){
      const a = L[j], b = L[(j + 1) % n], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty); if (l < .5 || l > 14) continue;
      const ux = tx / l, uy = ty / l, nx = -uy * sg, ny = ux * sg, h1 = r(), h2 = r(), h3 = r(), h4 = r(), h5 = r();
      const at = (u, off) => ({x:a.x + tx * u + nx * off, y:a.y + ty * u + ny * off});   // a point along the segment, off inland (negative: into the water)
      // the wrack line: seaweed and little twigs the last high tide left, in broken stretches
      if (h1 < .42){ const o = 1.8 + h2 * 1.5, p0 = at(.05, o), p1 = at(.95, o + (h3 - .5) * .8), m = at(.5, o + (h4 - .5) * 1.4); P.wrack.moveTo(p0.x, p0.y); P.wrack.quadraticCurveTo(m.x, m.y, p1.x, p1.y);
        if (h5 < .6){ const q = at(.3 + h3 * .4, o - .5); P.wrackDots.moveTo(q.x + .7, q.y); P.wrackDots.ellipse(q.x, q.y, .7, .4, ux, 0, TAU); }
        if (h4 < .3){ const q = at(.5, o + .9); P.weedDark.moveTo(q.x, q.y); P.weedDark.lineTo(q.x + ux * 1.6 + nx * .4, q.y + uy * 1.6 + ny * .4); } }
      // pebbles in little groups
      if (h2 < .07){ const o = 3 + h3 * 3, c0 = at(h4, o); for (let i = 0; i < 2 + Math.floor(h5 * 3); i++){ const x = c0.x + (gdHash(j, i) - .5) * 3, y = c0.y + (gdHash(i, j) - .5) * 1.6, rr = .35 + gdHash(j + i, 3) * .4; P.pebbles.moveTo(x + rr, y); P.pebbles.ellipse(x, y, rr, rr * .7, 0, 0, TAU); } }
      // a shell or two, lying just above the wet sand
      if (h3 < .07){ const q = at(h4, 1 + h5 * 3), rot = h1 * 3; P.shells.moveTo(q.x + .9, q.y); P.shells.ellipse(q.x, q.y, .9, .6, rot, 0, TAU); P.shellLines.moveTo(q.x - Math.cos(rot) * .7, q.y - Math.sin(rot) * .7); P.shellLines.lineTo(q.x + Math.cos(rot) * .7, q.y + Math.sin(rot) * .7); }
      // a crab hole with a little heap of sand kicked out beside it
      if (h4 < .055){ const q = at(h5, 4 + h1 * 2.5); P.rims.moveTo(q.x + 1.3, q.y); P.rims.ellipse(q.x, q.y, 1.3, .8, 0, 0, TAU); P.holes.moveTo(q.x + .7, q.y + .1); P.holes.ellipse(q.x, q.y + .1, .7, .4, 0, 0, TAU);
        for (let i = 0; i < 3; i++){ const x = q.x + (gdHash(j, i + 5) - .5) * 3.4, y = q.y + .9 + gdHash(i, j + 5) * .8; P.pellets.moveTo(x + .3, y); P.pellets.arc(x, y, .3, 0, TAU); } }
      // foam lace where the waves run out: a scalloped line just off the beach, with a few bubbles, in broken stretches
      if (h5 < .62){ const o = -(1.3 + h1 * 1.1), p0 = at(.02, o), p1 = at(.98, o), m = at(.5, o - 1.5 - h2 * .8); P.lace.moveTo(p0.x, p0.y); P.lace.quadraticCurveTo(m.x, m.y, p1.x, p1.y);
        if (h3 < .5){ const q = at(.25 + h4 * .5, o - .9 - h2 * .8); P.laceDots.moveTo(q.x + .35, q.y); P.laceDots.arc(q.x, q.y, .35, 0, TAU); } }
    }
  }
  return I._gc = P;
}
function drawCoastDetail(c, I, fine){
  const P = coastDetail(I); c.save(); c.setLineDash([]); c.lineCap = 'round'; c.lineJoin = 'round';
  if (fine){ c.strokeStyle = '#F7FBF6'; c.globalAlpha = .55; c.lineWidth = .55; c.stroke(P.lace); c.fillStyle = '#FFFFFF'; c.globalAlpha = .7; c.fill(P.laceDots); }
  c.globalAlpha = .6; c.strokeStyle = '#6B5A34'; c.lineWidth = 1; c.stroke(P.wrack); c.strokeStyle = '#4C5A2C'; c.lineWidth = .5; c.globalAlpha = .7; c.stroke(P.weedDark);
  c.fillStyle = '#5A6A32'; c.globalAlpha = .6; c.fill(P.wrackDots);
  if (fine){
    c.globalAlpha = 1; c.fillStyle = '#EBD8A8'; c.fill(P.rims); c.fillStyle = '#3A2A1C'; c.fill(P.holes); c.fillStyle = '#D2BA84'; c.fill(P.pellets);
    c.fillStyle = '#8E8576'; c.strokeStyle = GD_INK; c.lineWidth = .2; c.fill(P.pebbles); c.stroke(P.pebbles);
    c.fillStyle = '#F3E3C4'; c.strokeStyle = '#7A5434'; c.lineWidth = .25; c.fill(P.shells); c.stroke(P.shells); c.strokeStyle = '#B08048'; c.lineWidth = .18; c.stroke(P.shellLines);
  }
  c.restore();
}

/* the part that depends on what stands on the island: palms, trees, canoes */
function lifeDetail(I){
  const sig = I.buildings.length + ':' + (I.trees ? I.trees.length : 0) + ':' + I.buildings.reduce((t, b) => t + (b.bt ? 1 : 0), 0);
  if (I._gl && I._gl.sig === sig) return I._gl;
  const P = {sig, nuts:new Path2D(), nutShine:new Path2D(), husks:new Path2D(), huskLines:new Path2D(), leaves:new Path2D(), dry:new Path2D(), fruit:new Path2D(), foot:new Path2D()};
  const leaf = (path, x, y, a, s) => { const dx = Math.cos(a) * s, dy = Math.sin(a) * s, px = -Math.sin(a) * s * .32, py = Math.cos(a) * s * .32; path.moveTo(x, y); path.quadraticCurveTo(x + dx * .5 + px, y + dy * .5 + py, x + dx, y + dy); path.quadraticCurveTo(x + dx * .5 - px, y + dy * .5 - py, x, y); };
  for (const b of I.buildings){
    if (b.bt || b.at) continue;
    const id = b.id || Math.round(b.x * 3 + b.y);
    if (b.kind === 'palme'){
      // nuts that fell, and a husk or two torn open; some palms have nothing at their foot
      const h0 = gdHash(id, 1), n = h0 < .25 ? 0 : 1 + Math.floor((h0 - .25) * 4); if (n <= 0) continue;
      for (let i = 0; i < n; i++){ const a = gdHash(id, i + 2) * TAU, d = 3.5 + gdHash(i, id) * 4, x = b.x + Math.cos(a) * d, y = b.y + 1 + Math.sin(a) * d * .45;
        if (i === 2){ P.husks.moveTo(x + 1.6, y); P.husks.ellipse(x, y, 1.6, .9, a, 0, TAU); P.huskLines.moveTo(x - 1, y); P.huskLines.lineTo(x + 1, y + .1); P.huskLines.moveTo(x - .8, y - .4); P.huskLines.lineTo(x + .8, y - .3); }
        else { P.nuts.moveTo(x + 1, y); P.nuts.ellipse(x, y, 1, .85, 0, 0, TAU); P.nutShine.moveTo(x - .2, y - .45); P.nutShine.lineTo(x + .15, y - .5); } }
    } else if (b.kind === 'baum' || b.kind === 'nussbaum'){
      // fallen leaves, and breadfruit that dropped (dry leaves from the lean season on)
      const nl = 3 + Math.floor(gdHash(id, 8) * 4);
      for (let i = 0; i < nl; i++){ const a = gdHash(id, i + 20) * TAU, d = 4 + gdHash(i + 3, id) * 6; leaf(gdHash(id + i, 4) < .45 ? P.dry : P.leaves, b.x + Math.cos(a) * d, b.y + 1 + Math.sin(a) * d * .45, gdHash(id, i + 40) * TAU, 1.6 + gdHash(id, i + 60)); }
      if (b.kind === 'baum' && gdHash(id, 9) < .6) for (let i = 0; i < 1 + Math.floor(gdHash(id, 10) * 2.4); i++){ const a = gdHash(id, i + 70) * TAU, d = 3 + gdHash(i, id + 5) * 4, x = b.x + Math.cos(a) * d, y = b.y + 1.5 + Math.sin(a) * d * .45; P.fruit.moveTo(x + 1.3, y); P.fruit.ellipse(x, y, 1.3, 1.15, 0, 0, TAU); }
    } else if (b.kind === 'steg' || b.kind === 'fisch' || b.kind === 'werft' || b.kind === 'taucher'){
      // the way down to the canoes: footprints in the sand, left and right, from the hut to the water's edge
      let best = null, bd = 1e9; for (const Ld of I.lands) for (let k = 0; k < Ld.poly.length; k += 2){ const q = Ld.poly[k], dd = Math.hypot(q.x - b.x, q.y - b.y); if (dd < bd){ bd = dd; best = q; } }
      if (!best || bd < 6 || bd > 30) continue;
      const dx = (best.x - b.x) / bd, dy = (best.y - b.y) / bd, len = Math.min(bd - 1.5, 13); let side = 1;
      for (let s = 3; s < len; s += 1.9){ const x = best.x - dx * s - dy * side * .9, y = best.y - dy * s + dx * side * .9; side = -side;
        if (gdHash(id, s * 3) < .2) continue; P.foot.moveTo(x + .55, y); P.foot.ellipse(x, y, .55, .32, Math.atan2(dy, dx), 0, TAU); }
    }
  }
  // wild trees: a few leaves lie below some of them
  if (I.trees) for (const t of I.trees){ if (t.st !== 0 || gdHash(t.x, t.y) > .18) continue; for (let i = 0; i < 2; i++) leaf(gdHash(t.x, i) < .4 ? P.dry : P.leaves, t.x + (gdHash(t.y, i + 3) - .5) * 14, t.y + 1 + gdHash(t.x, i + 7) * 3, gdHash(i, t.y) * TAU, 1.5); }
  return I._gl = P;
}
function drawLifeDetail(c, I, fine){
  const P = lifeDetail(I); c.save(); c.setLineDash([]); c.lineCap = 'round'; c.lineJoin = 'round';
  c.globalAlpha = .55; c.fillStyle = '#8A6E48'; c.fill(P.foot);   // darker, damp sand
  c.globalAlpha = .85; c.fillStyle = '#7FA04A'; c.strokeStyle = '#3F5A2A'; c.lineWidth = .2; c.fill(P.leaves); c.stroke(P.leaves);
  c.fillStyle = '#C9A24A'; c.strokeStyle = '#7A5A2A'; c.fill(P.dry); c.stroke(P.dry);
  c.globalAlpha = 1;
  if (fine){
    c.fillStyle = '#9DBA5A'; c.strokeStyle = GD_INK; c.lineWidth = .3; c.fill(P.fruit); c.stroke(P.fruit);
    c.fillStyle = '#7A5434'; c.lineWidth = .3; c.fill(P.nuts); c.stroke(P.nuts); c.strokeStyle = '#D9B27A'; c.lineWidth = .25; c.stroke(P.nutShine);
    c.fillStyle = '#B08A58'; c.strokeStyle = GD_INK; c.lineWidth = .3; c.fill(P.husks); c.stroke(P.husks); c.strokeStyle = '#6B4A28'; c.lineWidth = .2; c.stroke(P.huskLines);
  }
  c.restore();
}
function drawGroundDetail(c, I){
  if (lod === 'far') return;
  const fine = lod === 'near' && quality > 0;
  drawCoastDetail(c, I, fine);
  if (lod === 'near' && (I.discovered || I.settled)) drawLifeDetail(c, I, fine);
}

/* a few leaves float on the lagoon, turning slowly; they drift along the shore with the swell, each its own way and speed */
function drawLagoonLeaves(c, I, lp, t){
  const n = 2 + (Math.abs(Math.round(I.center.x)) % 3);
  for (let k = 0; k < n; k++){
    const q = alongLoop(lp, ((t * (.5 + gdHash(k, 3) * .5) + gdHash(k, I.center.x) * lp.len) % lp.len + lp.len) % lp.len), off = (gdHash(k, 7) - .5) * 9;
    const x = q.x + Math.sin(q.a) * off, y = q.y - Math.cos(q.a) * off + Math.sin(t * 1.3 + k * 2) * .35, a = Math.sin(t * .4 + k) * .9 + k * 1.3, dry = gdHash(k, I.center.y) < .4;
    c.save(); c.translate(x, y); c.rotate(a); c.lineWidth = .3; c.strokeStyle = GD_INK; c.fillStyle = dry ? '#C9A24A' : '#7FA04A';
    c.beginPath(); c.moveTo(-1.8, 0); c.quadraticCurveTo(0, -1.3, 1.8, 0); c.quadraticCurveTo(0, 1.1, -1.8, 0); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,230,.5)'; c.lineWidth = .18; c.beginPath(); c.moveTo(-1.4, 0); c.lineTo(1.4, 0); c.stroke();
    c.strokeStyle = 'rgba(244,251,250,.55)'; c.lineWidth = .25; c.beginPath(); c.ellipse(0, .5, 2.6, 1.2, 0, 0, TAU); c.stroke(); c.restore();
  }
}
