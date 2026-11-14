/* ======================================================================================================================
   Hingucker: what beauty brings into the village (blooms, wreaths, butterflies, fireflies, guests, the petal burst of a
   new step; see beauty.js) and a few rare, calm sights that make you look twice (dolphins at the reef, fish that leap, a
   heron at the shore, a gecko on a house post, a rainbow after the rain dance, a shooting star). All animals are native to
   the islands. Same flat, ink-outlined style as the rest. Everything here is fine detail: drawn only where it can be seen
   (not at 'far' zoom), the moving things only with a good frame rate (quality) and never with reduced motion, where the
   still ones (blooms, wreaths, the rainbow) stay. Nothing here changes the game state; a tap on a sight gives a word.
   Called from render.js: drawBeautyGround and drawEyes (over the ground), drawBeautyTop (over the roofs), drawNightEyes.
   ====================================================================================================================== */
const PETAL_COL = ['#F4B6C2', '#F6F1E6', '#E8543A', '#F3D35A', '#E88AA8'], BLOOM_COL = ['#E8543A', '#F6F1E6', '#F3D35A', '#E88AA8', '#E0803A'];
let petals = [], eyes = [];   // petals in the air; what can be tapped this frame
const eyeSaid = {};

/* ---------- a tap on a sight gives a word (cheap: only what was drawn in the last frame can be hit) */
const eyeAdd = (kind, x, y, r, say) => { eyes.push({kind, x, y, r, say}); };
function hitEye(p){
  for (const e of eyes){
    if (Math.hypot(p.x - e.x, (p.y - e.y) * 1.2) > Math.max(e.r, 16 / cam.z)) continue;
    const n = performance.now(); if (eyeSaid[e.kind] === undefined || n - eyeSaid[e.kind] > 9000){ eyeSaid[e.kind] = n; toast(e.say, 2600, false); }
    return true;
  }
  return false;
}

/* ---------- the burst of petals over the plaza when a step of beauty is reached */
function petalBurst(I){
  const b = I.buildings.find(q => q.kind === 'platz') || I.buildings.find(q => q.kind === 'halle') || {x:I.center.x, y:I.center.y}, t0 = performance.now();
  for (let i = 0; i < 28; i++) petals.push({x:b.x + (Math.random() - .5) * 14, y:b.y - 4 - Math.random() * 6, vx:(Math.random() - .5) * 60, h:14 + Math.random() * 22, ph:Math.random() * 6.3, col:PETAL_COL[i % PETAL_COL.length], t0:t0 + Math.random() * 260, life:2600 + Math.random() * 1200});
  requestDraw();
}
function drawPetals(c, now){
  if (!petals.length) return;
  petals = petals.filter(p => now - p.t0 < p.life); fxLive = true;
  for (const p of petals){
    const a = (now - p.t0) / 1000; if (a < 0) continue;
    const up = Math.min(a, .7) / .7, x = p.x + p.vx * (1 - Math.exp(-a * 1.6)) / 1.6 + Math.sin(a * 3.2 + p.ph) * 1.6 * a, y = p.y - p.h * Math.sin(up * Math.PI / 2) + Math.max(0, a - .7) * 7.5;
    c.save(); c.translate(x, y); c.rotate(a * 2.4 + p.ph); c.globalAlpha = Math.min(1, (p.life / 1000 - a) / .8) * .95; c.fillStyle = p.col; c.beginPath(); c.ellipse(0, 0, 1.25, .7, 0, 0, TAU); c.fill();
    c.lineWidth = .22; c.strokeStyle = INKC; c.stroke(); c.restore();
  }
}

/* ---------- where blooms grow: along the worn paths and in front of the houses; found once, kept for a few ticks */
function bloomPts(I){
  const C = I._bl; if (C && tick - C.at < 12 && C.n === I.buildings.length) return C.pts;
  const pts = [], g = I._wg, near = (x, y) => I.buildings.some(b => !b.at && Math.hypot(b.x - x, (b.y - y) * 1.3) < KINDS[b.kind].r * .95);
  const add = (x, y, i) => { if (!landAt(I, {x, y}) || near(x, y)) return; pts.push({x, y, k:Math.floor(hsh(i, 7) * BLOOM_COL.length), s:.8 + hsh(i, 8) * .5}); };
  for (const b of I.buildings){
    if (b.bt || b.at || !(HOME_KINDS.has(b.kind) || b.kind === 'halle' || b.kind === 'ahnenhaus')) continue;
    const K = KINDS[b.kind], sc = (b.v && b.v.scale) || 1;
    for (let k = 0; k < 3; k++) pts.push({x:b.x + (k - 1) * K.r * .9 * sc + (hsh(b.id, k) - .5) * 3, y:b.y + K.r * .55 * sc + 1 + hsh(b.id, k + 4) * 2, k:Math.floor(hsh(b.id, k + 9) * BLOOM_COL.length), s:.9 + hsh(b.id, k + 2) * .4});
  }
  if (g){
    for (let i = 0; i < g.lv.length && pts.length < 110; i++){
      if (g.lv[i] < 2 && !g.road[i]) continue; if (hsh(i, 5) > .26) continue;
      const cx = g.x0 + (i % g.w + .5) * WEAR_CELL, cy = g.y0 + (Math.floor(i / g.w) + .5) * WEAR_CELL, a = hsh(i, 6) * TAU;   // a little to the side of the path
      add(cx + Math.cos(a) * 5.5, cy + Math.sin(a) * 4, i);
    }
  }
  I._bl = {at:tick, n:I.buildings.length, pts}; return pts;
}
const BUT_COL = ['#E8913A', '#F3D35A', '#F6F1E6', '#7FB6C8'];
function butterflyAt(c, x0, y0, t, sd){
  const f = .3 + (sd % 7) * .03, x = x0 + Math.cos(t * f * 2.1 + sd) * 9 + Math.sin(t * f * 3.3 + sd) * 2.5, y = y0 - 5 + Math.sin(t * f * 2.9 + sd) * 4 - Math.abs(Math.sin(t * 1.7 + sd)) * 2, flap = .2 + .8 * Math.abs(Math.sin(t * 17 + sd));
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * f * 2.1 + sd) * .4); c.fillStyle = BUT_COL[sd % BUT_COL.length]; c.strokeStyle = INKC; c.lineWidth = .22;
  for (const d of [-1, 1]){ c.save(); c.scale(d * flap, 1); c.beginPath(); c.ellipse(.75, -.35, .8, .55, -.5, 0, TAU); c.ellipse(.6, .45, .55, .4, .4, 0, TAU); c.fill(); c.stroke(); c.restore(); }
  c.fillStyle = INKC; c.fillRect(-.12, -.7, .24, 1.4); c.restore();
}
/* the ground: the blooms, the extra butterflies, the guests' canoes */
function drawBeautyGround(c, v, now){
  if (lod === 'far') return;
  const t = reduced ? 0 : now / 1000, day = nightLevel() < .2;
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v)) continue;
    const F = beautyFx(I); if (!F.blooms) continue;
    const pts = bloomPts(I), grow = !I._bsAt || reduced ? 1 : clamp((now - I._bsAt) / 3500, 0, 1);
    for (let k = 0; k < BLOOM_COL.length; k++){
      const stems = new Path2D(), heads = new Path2D(), cores = new Path2D(); let n = 0;
      for (const p of pts){
        if (p.k !== k || !ptIn(p.x, p.y, v)) continue; n++;
        const s = p.s * 1.2 * (.35 + .65 * grow), sw = Math.sin(t * 1.3 + p.x * .7) * .3 * (.4 + wind().str), x = p.x + sw, y = p.y - 1.7 * s;
        stems.moveTo(p.x, p.y); stems.lineTo(x, y);
        for (let j = 0; j < 5; j++){ const a = j / 5 * TAU + p.x; heads.moveTo(x + Math.cos(a) * .8 * s + .75 * s, y + Math.sin(a) * .8 * s); heads.arc(x + Math.cos(a) * .8 * s, y + Math.sin(a) * .8 * s, .75 * s, 0, TAU); }
        cores.moveTo(x + .5 * s, y); cores.arc(x, y, .5 * s, 0, TAU);
      }
      if (!n) continue;
      stroke(c, stems, '#4F7A3A', .5, null, 'round'); c.fillStyle = BLOOM_COL[k]; c.fill(heads); stroke(c, heads, INKC, .2, null, 'round', .75); c.fillStyle = '#F3D35A'; c.fill(cores);
    }
    // more butterflies over the blooms by day
    if (!reduced && quality && lod === 'near' && day && F.butterflies && pts.length)
      for (let k = 0; k < F.butterflies; k++){ const p = pts[(k * 11 + I.buildings.length) % pts.length]; if (ptIn(p.x, p.y, v)) butterflyAt(c, p.x, p.y, t, (k * 5 + (I.center.x | 0)) % 17 + 3); }
    // the guests' canoes lie off the reef and look
    if (F.guests) drawGuests(c, I, v, now, F.guests);
  }
}
function guestSpots(I, n){
  if (I._gs && I._gs.n === n) return I._gs.list;
  const lp = shoreLoop(I), list = []; if (lp.len){
    for (let k = 0; k < n; k++) for (let tryN = 0; tryN < 12 && list.length <= k; tryN++){
      const q = alongLoop(lp, (hsh(k + 3, I.center.x | 0) + tryN * .077 + k * .5) * lp.len), a = Math.atan2(q.y - I.center.y, q.x - I.center.x);
      for (let d = 9; d < 26; d += 3){ const x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d * .8; if (!landAt(I, {x, y}) && I.lands.every(L => polyDist({x, y}, L.poly) > 6)){ list.push({x, y, left:Math.cos(a) < 0, id:k + 40 + (I.center.x | 0)}); break; } }
    }
  }
  I._gs = {n, list}; return list;
}
function drawGuests(c, I, v, now, n){
  for (const g of guestSpots(I, n)){
    if (!ptIn(g.x, g.y, v)) continue;
    const t = reduced ? 0 : now / 1000, bob = Math.sin(t * 1.1 + g.id) * .5;
    if (!reduced && quality) stroke(c, ellipse(g.x - (g.left ? -1 : 1) * 4, g.y + 2.4, 7 + Math.sin(t * .8 + g.id) * .8, 1.6), '#F4FBFA', .5, null, null, .55);
    drawDugout(c, g.x, g.y + bob, g.left, reduced ? 0 : Math.sin(t * .9 + g.id) * .03, figureLook(g.id * 13 + 5), false, now, g.id, false);
    eyeAdd('gast', g.x, g.y - 3, 10, 'Gäste im Kanu. Sie sind gekommen, um das Dorf zu sehen.');
  }
}

/* ---------- wreaths and ribbons on the houses (over the roofs). Each house hangs a swag of blossoms under the eave and a
   tapa ribbon at the ridge that streams with the wind. */
function drawBeautyTop(c, v, now){
  drawPetals(c, now);
  if (lod === 'far') return;
  if (!reduced && quality && lod === 'near' && nightLevel() < .2) for (const I of islands) if (lived(I) && boxIn(I.box, v)) drawGecko(c, I, v, now);   // on the roofs: after the houses are drawn
  const t = reduced ? 0 : now / 1000, W = wind(), dir = W.tx >= 0 ? 1 : -1;
  for (const I of islands){
    if (!I.settled || !boxIn(I.box, v) || !beautyFx(I).bunting) continue;
    const grow = !I._bsAt || reduced ? 1 : clamp((now - I._bsAt) / 3500, 0, 1);
    for (const b of I.buildings){
      if (b.bt || b.at || !(HOME_KINDS.has(b.kind) || b.kind === 'halle' || b.kind === 'ahnenhaus') || !ptIn(b.x, b.y, v)) continue;
      const K = KINDS[b.kind], sc = (b.v && b.v.scale) || 1, hw = K.r * .62 * sc, y0 = b.y - K.hy * sc * .34, sag = 2.6 * grow, n = 7;
      // the swag: a cord with blossoms and leaves hanging from it, each swinging a little
      const S = new Path2D(); S.moveTo(b.x - hw, y0);
      for (let i = 1; i <= 12; i++){ const f = i / 12; S.lineTo(b.x - hw + hw * 2 * f, y0 + Math.sin(f * Math.PI) * sag); }
      stroke(c, S, INKC, .45, null, 'round', .85);
      for (let i = 0; i <= n; i++){
        const f = i / n, x = b.x - hw + hw * 2 * f, y = y0 + Math.sin(f * Math.PI) * sag + .5 + Math.sin(t * 2 + i + b.id) * .12 * W.str;
        c.fillStyle = i % 2 ? '#E8543A' : (i % 4 === 0 ? '#F3D35A' : '#F6F1E6'); c.beginPath(); c.arc(x, y + .6, .95 * (.4 + .6 * grow), 0, TAU); c.fill(); c.lineWidth = .22; c.strokeStyle = INKC; c.stroke();
      }
      // the ribbon at the ridge: a thin pole, a streaming strip of tapa
      if (b.kind !== 'halle'){
        const px = b.x + (b.id % 2 ? 1 : -1) * K.r * .2 * sc, py = b.y - K.hy * sc - .5;
        stroke(c, new Path2D(`M${px} ${py + 2.4}V${py - 2.2}`), INKC, .55, null, 'round'); flagCloth(c, px, py - 2, dir, now, b.id, 4.6 * grow, 2.1);
      }
    }
  }
}

/* ---------- eyes: rare, calm things that make you look twice */
function drawEyes(c, v, now){
  eyes.length = 0;
  if (lod === 'far') return;
  const night = nightLevel();
  for (const I of islands){
    if (!seen(I) || !boxIn(I.box, v)) continue;
    drawRainbow(c, I, v, now, night);
    if (reduced || !quality || lod !== 'near' || !lived(I)) continue;
    const lp = lagoonLoop(I);
    drawReefDolphins(c, I, lp, v, now);
    drawFishLeaps(c, I, lp, v, now);
    if (night < .2) drawHeron(c, I, v, now);
  }
}
const slotOf = (now, per, off) => { const u = (now / 1000 + off) / per, n = Math.floor(u); return {n, f:(u - n) * per}; };   // which window of `per` seconds, and how many seconds into it
const ringAt = (c, x, y, age, big) => { if (age < 0 || age > 1) return; stroke(c, ellipse(x, y, .8 + age * big, (.8 + age * big) * .36), '#F4FBFA', .5, null, null, (1 - age) * .8); if (age > .2) stroke(c, ellipse(x, y, .5 + age * big * .55, (.5 + age * big * .55) * .36), '#F4FBFA', .4, null, null, (1 - age) * .55); };

/* a pod leaps off the reef, one after the other, now and then (not every minute) */
function drawReefDolphins(c, I, lp, v, now){
  const sd = hsh(I.center.x | 0, I.center.y | 0), S = slotOf(now, 58 + sd * 24, sd * 90); if (S.f > 5 || hsh(S.n, sd * 9 + 3) > .55) return;
  const base = alongLoop(lp, hsh(S.n, sd * 5 + 1) * lp.len), a = Math.atan2(base.y - I.center.y, base.x - I.center.x), dir = Math.cos(base.a) < 0 ? -1 : 1;
  const ox = base.x + Math.cos(a) * 12, oy = base.y + Math.sin(a) * 9; if (!ptIn(ox, oy, v) || landAt(I, {x:ox, y:oy})) return;
  for (let i = 0; i < 3; i++){
    const T = S.f - i * .7; if (T < 0 || T > 3) continue;
    const f = clamp(T / 1.25, 0, 1), x = ox + dir * (i * 15 + f * 20), y = oy + i * 5 - Math.sin(f * Math.PI) * 9;
    if (T < 1.25) put(c, x, y, 1.15, dir, (f - .5) * 1.25 * dir, 'dolphin', '<use href="#dolphin"/>');
    if (T < .3) ringAt(c, ox + dir * i * 15, oy + i * 5 + 1.5, T / .3, 6);
    const lx = ox + dir * (i * 15 + 20), ly = oy + i * 5 + 1.5, landT = T - 1.25;
    if (landT > -.08 && landT < .35){ const q = clamp(landT / .35, 0, 1); c.fillStyle = '#F4FBFA'; for (let k = 0; k < 4; k++){ c.globalAlpha = (1 - q) * .9; c.beginPath(); c.arc(lx + (k - 1.5) * 1.3, ly - Math.sin(q * Math.PI) * (2 + k % 2 * 1.6), .42, 0, TAU); c.fill(); } c.globalAlpha = 1; }
    if (landT > 0) ringAt(c, lx, ly, landT / 1.6, 8);
    if (T > .2 && T < 1.1) eyeAdd('delfin', x, y, 12, 'Delfine springen vor dem Riff. Sie bringen den Fischern Glück.');
  }
}

/* a school flees something under water: silver fish flash out of the lagoon in a row and fall back with rings */
function drawFishLeaps(c, I, lp, v, now){
  const sd = hsh(I.center.y | 0, I.center.x | 0), S = slotOf(now, 9 + sd * 4, sd * 40); if (S.f > 1.6 || hsh(S.n, sd * 7 + 2) > .4) return;
  const q = alongLoop(lp, hsh(S.n, sd * 3 + 5) * lp.len), off = 5 + hsh(S.n, 4) * 6, px = q.x + Math.sin(q.a) * off, py = q.y - Math.cos(q.a) * off, dir = hsh(S.n, 8) < .5 ? -1 : 1;
  if (!ptIn(px, py, v) || landAt(I, {x:px, y:py})) return;
  for (let i = 0; i < 5; i++){
    const T = S.f - i * .09; if (T < 0) continue; const f = T / .75, x0 = px + dir * (i * 2.6 - 4), y0 = py + (i % 2) * 2 - 1;
    if (f < 1){
      const x = x0 + dir * f * 7, y = y0 - Math.sin(f * Math.PI) * (3.6 + i % 3 * .7), rot = (f - .5) * 1.5 * dir;
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(dir, 1); c.fillStyle = '#E8F2F4';
      c.beginPath(); c.ellipse(0, 0, 1.6, .55, 0, 0, TAU); c.moveTo(-1.4, 0); c.lineTo(-2.4, -.6); c.lineTo(-2.4, .6); c.closePath(); c.fill(); c.lineWidth = .22; c.strokeStyle = INKC; c.stroke(); c.restore();
      if (i % 2 === 0 && f > .1 && f < .85) stroke(c, glint(x, y - 1, 1), '#FFFFFF', .5, null, 'round', .7 * Math.sin(f * Math.PI));
    }
    if (f > .85) ringAt(c, x0 + dir * 7, y0 + .8, (f - .85) / 1.4, 3.6);
    if (i === 2 && f > .1 && f < .9) eyeAdd('fische', x0 + dir * f * 7, y0, 9, 'Ein Fischschwarm springt aus dem Wasser. Etwas Großes jagt ihn.');
  }
}

/* a reef heron (slate grey, the kind that fishes the reef flats of these islands): stands still, steps, strikes,
   swallows. One at the shore of a village, for a while, then gone. */
function drawHeron(c, I, v, now){
  const lp = shoreLoop(I); if (!lp.len) return;
  const sd = hsh(I.center.x | 0, (I.center.y | 0) + 5), S = slotOf(now, 110, sd * 200); if (hsh(S.n, sd * 11 + 1) > .6 || S.f > 90) return;
  const q = alongLoop(lp, (.2 + sd * .6 + hsh(S.n, 2) * .2) * lp.len), a = Math.atan2(I.center.y - q.y, I.center.x - q.x), x = q.x - Math.cos(a) * 1.2, y = q.y - Math.sin(a) * 1.2;
  if (!ptIn(x, y, v)) return;
  const face = Math.cos(a) > 0 ? -1 : 1, T = S.f % 24, al = Math.min(1, S.f / 1.2, (90 - S.f) / 1.2);   // looks out to the water
  // the cycle: stands, a slow step, strike, lifts the catch, swallows, stands
  const strike = T > 13 && T < 14.4 ? Math.sin((T - 13) / 1.4 * Math.PI) : 0, catchUp = T > 14 && T < 17.5 ? 1 : 0, step = T > 9 && T < 11 ? Math.sin((T - 9) / 2 * Math.PI) : 0;
  const look = Math.sin(now / 1900 + sd * 9) * .5 + (T > 4 && T < 6 ? .8 : 0);
  c.save(); c.translate(x + face * step * 1.4, y); c.scale(face * .74, .74); c.globalAlpha = al;
  c.fillStyle = 'rgba(31,20,13,.18)'; c.beginPath(); c.ellipse(0, .4, 3, .8, 0, 0, TAU); c.fill();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const leg = (dx, lift) => { critLine(c, dx, -3.4 - lift * .5, dx + (lift ? .6 : 0), .2 - lift, INKC, .75); critLine(c, dx, -3.4 - lift * .5, dx + (lift ? .6 : 0), .2 - lift, '#C9A83A', .32); };
  leg(-.4, step > .3 && step < .8 ? .9 : 0); leg(.9, step > .5 ? 0 : .5 * step);
  // body, tail
  const B = new Path2D(); B.moveTo(-3.2, -4.4); B.quadraticCurveTo(-1.6, -6.4, 1.4, -5.6); B.quadraticCurveTo(2.2, -4.2, .4, -3.4); B.quadraticCurveTo(-1.4, -3.2, -3.2, -4.4);
  c.fillStyle = '#5B6B78'; c.fill(B); c.lineWidth = .4; c.strokeStyle = INKC; c.stroke(B);
  stroke(c, new Path2D('M-2.6-4.6Q-1-5.6 .6-5'), '#8C9CA8', .5, null, 'round');
  // the neck: from the shoulder up in an S, or stretched down for the strike
  const hx = 2.2 + strike * 3.6 + look * .3, hy = -9.6 + strike * 8.4 + Math.sin(now / 2300 + sd) * .15, N = new Path2D(); N.moveTo(1.1, -5.4); N.bezierCurveTo(-.3 + strike * 1.5, -7, 3 - strike, -7.6 + strike * 4, hx, hy);
  stroke(c, N, INKC, 1.25, null, 'round'); stroke(c, N, '#6E7E8A', .65, null, 'round');
  c.fillStyle = '#5B6B78'; c.beginPath(); c.arc(hx, hy, .8, 0, TAU); c.fill(); c.lineWidth = .3; c.stroke();
  const bt = new Path2D(); bt.moveTo(hx + .5, hy - .25); bt.lineTo(hx + 3.1, hy + .2 + strike * .4); bt.lineTo(hx + .5, hy + .45); bt.closePath(); c.fillStyle = '#D9A441'; c.fill(bt); c.lineWidth = .25; c.stroke(bt);
  c.fillStyle = INKC; c.beginPath(); c.arc(hx + .2, hy - .2, .17, 0, TAU); c.fill();
  if (catchUp){ const f = (T - 14) / 3.5; c.globalAlpha = al * (1 - f * f); c.fillStyle = '#E8F2F4'; c.save(); c.translate(hx + 3.1, hy + .4 - f * .6); c.rotate(.7 - f * 1.4); c.beginPath(); c.ellipse(0, 0, 1.3, .4, 0, 0, TAU); c.fill(); c.lineWidth = .2; c.stroke(); c.restore(); }
  c.restore();
  stroke(c, ellipse(x, y + .6, 2.4, .7), '#F4FBFA', .4, null, null, .55 * al);   // the shallows round its legs
  if (T > 13 && T < 15) ringAt(c, x + face * 4, y + 1, (T - 13) / 2, 4);
  eyeAdd('reiher', x, y - 5, 8, 'Ein Riffreiher. Er steht ganz still und wartet auf einen Fisch.');
}

/* a gecko clings to the post of a house: still, a head bob, a quick run up or down, still again. Some houses have one. */
function drawGecko(c, I, v, now){
  for (const b of I.buildings){
    if (b.bt || b.at || (b.kind !== 'pfahl' && b.kind !== 'haus') || b.id % 4 !== 1 || !ptIn(b.x, b.y, v)) continue;
    const K = KINDS[b.kind], sc = (b.v && b.v.scale) || 1, S = slotOf(now, 16, b.id * 3.7), T = S.f, run = T > 9 && T < 9.7 ? (T - 9) / .7 : T > 12.2 && T < 12.8 ? 1 - (T - 12.2) / .6 : T >= 9.7 && T <= 12.2 ? 1 : 0;
    const x = b.x - K.r * .86 * sc * (b.v && b.v.mirror ? -1 : 1), y = b.y - K.hy * sc * (.5 + .22 * run), moving = (T > 9 && T < 9.7) || (T > 12.2 && T < 12.8), bob = !moving && T > 3 && T < 5 ? Math.sin(T * 9) * .25 : 0;
    c.save(); c.translate(x, y); c.scale(1.15, 1.15); c.rotate(moving ? 0 : bob * .1); c.lineCap = 'round'; c.lineJoin = 'round';
    // a slim body, a rounder head with big eyes, thin bent legs with round toe pads, a tapering tail that curls
    const body = new Path2D(); body.moveTo(0, -1.1); body.bezierCurveTo(.85, -.7, .8, .6, .3, 1.5); body.lineTo(-.3, 1.5); body.bezierCurveTo(-.8, .6, -.85, -.7, 0, -1.1);
    const head = new Path2D(); head.ellipse(0, -1.85, .85, .95, 0, 0, TAU);
    const lg = new Path2D(), toes = new Path2D(); for (const [yy, sg] of [[-.8, -1], [-.8, 1], [.7, -1], [.7, 1]]){ const w = moving ? Math.sin(now / 50 + yy + sg) * .3 : 0; lg.moveTo(sg * .5, yy); lg.lineTo(sg * 1.35, yy - .5 + w); lg.lineTo(sg * 1.75, yy + .15 + w); toes.moveTo(sg * 1.75 + .32, yy + .15 + w); toes.arc(sg * 1.75, yy + .15 + w, .32, 0, TAU); }
    const tl = new Path2D(); tl.moveTo(0, 1.4); tl.bezierCurveTo(.1, 2.6, -.9 + Math.sin(now / 700 + b.id) * .25, 3.2, -1.2, 4); tl.bezierCurveTo(-1.4, 4.4, -.9, 4.6, -.7, 4.2);
    stroke(c, tl, INKC, 1.05, null, 'round'); stroke(c, tl, '#8DA05A', .5, null, 'round'); stroke(c, lg, INKC, .75, null, 'round'); stroke(c, lg, '#8DA05A', .32, null, 'round');
    c.fillStyle = '#9DB066'; c.fill(toes); c.lineWidth = .22; c.strokeStyle = INKC; c.stroke(toes);
    c.fillStyle = '#9DB066'; c.fill(body); c.lineWidth = .32; c.stroke(body); c.fill(head); c.stroke(head);
    c.fillStyle = '#B9C98A'; c.beginPath(); c.arc(0, -.1, .22, 0, TAU); c.arc(.0, .55, .18, 0, TAU); c.fill();   // pale spots on the back
    c.fillStyle = '#F3D35A'; c.beginPath(); c.arc(-.45, -2.1, .3, 0, TAU); c.arc(.45, -2.1, .3, 0, TAU); c.fill(); c.lineWidth = .15; c.stroke();
    c.fillStyle = INKC; c.beginPath(); c.arc(-.45, -2.1, .13, 0, TAU); c.arc(.45, -2.1, .13, 0, TAU); c.fill();
    if (T > 5.5 && T < 6.2){ stroke(c, new Path2D('M0-2.7V-3.4'), '#C8402C', .3, null, 'round'); }   // a flick of the tongue
    c.restore();
    eyeAdd('gecko', x, y, 6, 'Ein Gecko am Dach. Er fängt die Mücken.');
  }
}

/* a rainbow over the island after the rain dance: it rises, stands a while, fades. Day only. */
const RAINBOW = ['#C8402C', '#E0803A', '#F3D35A', '#6E9A3A', '#2F7A8C', '#7C5A9A'], RAINBOW_LEN = 20;
function drawRainbow(c, I, v, now, night){
  if (!I.rainUntil || night > .25) return;
  const u = (tick - I.rainUntil) / RAINBOW_LEN; if (u < 0 || u > 1) return;
  const R = Math.max(60, (I.box.x1 - I.box.x0) * .38), cx = I.center.x + 8, cy = I.center.y + R * .25, k = .62, a = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), .6) * .55;
  if (!boxIn({x0:cx - R - 8, y0:cy - R * k - 8, x1:cx + R + 8, y1:cy}, v)) return;
  const shim = reduced ? 0 : Math.sin(now / 1800) * .04;
  c.save(); c.lineCap = 'butt';
  for (let i = 0; i < RAINBOW.length; i++){ const r = R - i * 2.3, P = new Path2D(); P.ellipse(cx, cy, r, r * k, 0, Math.PI, TAU); stroke(c, P, RAINBOW[i], 2.4, null, 'butt', a + shim); }
  const O = new Path2D(); O.ellipse(cx, cy, R + 1.6, (R + 1.6) * k, 0, Math.PI, TAU); stroke(c, O, INKC, .5, [3, 2.4], 'round', a * .45);   // a quick ink line on the outside, drawn by hand
  const Q = new Path2D(); Q.ellipse(cx, cy, R - 14.2, (R - 14.2) * k, 0, Math.PI, TAU); stroke(c, Q, INKC, .4, [2.4, 3], 'round', a * .35);
  c.restore();
  eyeAdd('regenbogen', cx, cy - R * k, Math.max(24, R * .25), 'Ein Regenbogen. Nach dem Regen kommt das Licht zurück.');
}

/* ---------- at night (drawn over the dark, so it glows): fireflies in the beautiful villages, now and then a shooting star */
function drawNightEyes(now){
  if (reduced || !quality || lod === 'far' || !opts.night) return;
  const lv = nightLevel(); if (lv < .25) return;
  const c = ctx, v = view(30); camXform(c);
  c.globalCompositeOperation = 'lighter';
  const t = now / 1000;
  if (lod === 'near') for (const I of islands){
    if (!I.settled || !boxIn(I.box, v) || !beautyFx(I).fireflies) continue;
    const pts = bloomPts(I); if (!pts.length) continue;
    const n = quality > 1 ? 14 : 8;
    for (let k = 0; k < n; k++){
      const p = pts[(k * 13 + (I.center.x | 0)) % pts.length], sd = k * 1.9 + p.x, x = p.x + Math.sin(t * .35 + sd) * 8 + Math.cos(t * .21 + sd * 1.3) * 4, y = p.y - 6 + Math.sin(t * .29 + sd * 2) * 4 - 3;
      if (!ptIn(x, y, v)) continue;
      const g = Math.pow(.5 + .5 * Math.sin(t * (.9 + (k % 3) * .25) + sd * 3), 3) * (lv / .55);   // a slow glow, up and down
      if (g < .03) continue;
      c.fillStyle = `rgba(190,235,90,${.12 * g})`; c.beginPath(); c.arc(x, y, 3.8, 0, TAU); c.fill();
      c.fillStyle = `rgba(210,245,110,${.24 * g})`; c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill();
      c.fillStyle = `rgba(250,255,170,${.98 * g})`; c.beginPath(); c.arc(x, y, .8, 0, TAU); c.fill();
    }
  }
  // a shooting star: a short bright streak across the sky, once in a long while
  const S = slotOf(now, 24, 0), age = S.f - hsh(S.n, 5) * 20;
  if (age >= 0 && age < 1.1 && hsh(S.n, 2) < .6){
    const sx = v.x0 + (v.x1 - v.x0) * (.15 + .6 * hsh(S.n, 3)), sy = v.y0 + (v.y1 - v.y0) * (.06 + .28 * hsh(S.n, 4)), dir = hsh(S.n, 6) < .5 ? -1 : 1, d = 120 / cam.z, f = age / 1.1;
    const hx = sx + dir * d * f, hy = sy + d * .5 * f, tx = hx - dir * 76 / cam.z * Math.min(1, f * 4), ty = hy - 38 / cam.z * Math.min(1, f * 4), g = c.createLinearGradient(tx, ty, hx, hy), al = Math.sin(Math.PI * f);
    g.addColorStop(0, 'rgba(255,248,210,0)'); g.addColorStop(1, `rgba(255,248,210,${.9 * al})`);
    c.strokeStyle = g; c.lineWidth = 2 / cam.z; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
    c.fillStyle = `rgba(255,240,190,${.3 * al})`; c.beginPath(); c.arc(hx, hy, 4 / cam.z, 0, TAU); c.fill();
    c.fillStyle = `rgba(255,252,230,${al})`; c.beginPath(); c.arc(hx, hy, 1.8 / cam.z, 0, TAU); c.fill();
    eyes.push({kind:'stern', x:hx, y:hy, r:26 / cam.z, say:'Eine Sternschnuppe! Wünsche dir etwas.'}); fxLive = true;
  }
  c.globalCompositeOperation = 'source-over';
}
