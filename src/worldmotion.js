/* ======================================================================================================================
   World motion: canoes, animals, smoke, rain and the feast. The same flat, ink-outlined style as the rest, only moving.
   Everything here is fine detail: it is drawn only where it can be seen (not at 'far' zoom), mostly only with a good
   frame rate (quality), and with reduced motion the old still pictures stay. Called from render.js (drawTop, drawAnim,
   drawWeather, drawRainCall, drawCritter, drawLagoonLife, drawHearths); nothing here changes the game state except
   little pose helpers kept on the objects (_s).
   ====================================================================================================================== */
let worldNow = 0;   // the time of the frame being drawn (set in draw), for pieces that have no `now` of their own
const INKC = '#2B1D14';

/* ---------- the swell under a canoe: long waves that run with the wind. h: how high the water stands here (-1..1),
   sl: how steep it is (the bow tips up or down) */
function swellAt(x, y, now){
  const W = wind(), t = now / 1000, k = .45 + .55 * W.str, a = t * 1.3 - (x * W.tx + y * W.ty) / 30;
  return {h:(Math.sin(a) * .75 + Math.sin(t * .7 + x * .04) * .25) * k, sl:Math.cos(a) * k};
}
/* a canoe pitches (the bow rises and falls with the swell), heaves and rolls a little; inside the canoe's save, origin at the hull */
function canoeSwell(c, s, now){
  const S = swellAt(s.x, s.y, now), sail = s.state === 'sail', amp = sail ? 1.3 : 1;
  c.translate(0, -S.h * .85 * amp); c.rotate(S.sl * .04 * amp);
  c.scale(1, 1 + Math.sin(now / 1150 + s.id * 1.9 + S.h * 2) * .022 * amp);   // the roll, seen from the side as a breathing of the hull
}

/* ---------- a moored canoe tugs at its line: pushed off by the wind and the swell it swings out, the line comes taut, then
   slack again. Returns where the canoe has drifted to and draws the line from a stake ashore. null where nothing moves. */
function mooringOf(s, now){
  if (s.state !== 'moored' || reduced || lod === 'far' || !s.port || s.race) return null;
  const I = isl(s.port); if (!I) return null;
  const dx = I.center.x - s.x, dy = I.center.y - s.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, W = wind(), t = now / 1000;
  const gust = .5 + .5 * Math.sin(t * .85 + s.id * 1.3) * Math.sin(t * .31 + s.id), pull = clamp((.25 + .75 * gust) * (.35 + W.str), 0, 1), swing = Math.sin(t * .6 + s.id * 2.1);
  const ox = -ux * pull * 2.1 - uy * swing * 1.1, oy = -uy * pull * 1.3 + ux * swing * .7;
  return {ox, oy, ax:s.x + ux * 15, ay:s.y + uy * 9 + 2, ux, pull};
}
function drawMoorLine(c, s, m, ks){
  const bx = s.x + m.ox + Math.sign(m.ux || 1) * 7 * ks, by = s.y + m.oy + .6, sag = (1 - m.pull) * 3.2 + .4;
  const P = new Path2D(); P.moveTo(m.ax, m.ay - 2.2); P.quadraticCurveTo((bx + m.ax) / 2, (by + m.ay - 2.2) / 2 + sag, bx, by);
  stroke(c, P, INKC, 1.1, null, 'round', .85); stroke(c, P, '#C9A86E', .55, null, 'round');
  stroke(c, new Path2D(`M${m.ax} ${m.ay}V${m.ay - 3.6}`), INKC, 1.6, null, 'round'); stroke(c, new Path2D(`M${m.ax} ${m.ay}V${m.ay - 3.6}`), '#8C5C36', .8, null, 'round');
  if (m.pull > .55){ const f = (m.pull - .55) / .45; stroke(c, ellipse(bx + Math.sign(m.ux || 1) * 1.5, s.y + 1.6, 3.2, 1, 0), '#F4FBFA', .5, null, null, f * .6); }   // the water breaks at a taut line
}

/* ---------- the mat sail (crab claw) of the double and voyaging canoes. Drawn live inside the sail's own frame (origin at its
   foot, the same frame the old picture had). It fills when the wind comes from astern and abeam, and luffs, the free edge
   rippling, when the canoe points into the wind or lies still. At the top a pennant streams with the wind.
   outer: -1 when the canoe is drawn mirrored; mx: -1 for the canoe that goes down the screen (see drawTop) */
const SAIL_SEAM = [.3, .56];
const q2 = (a, b, c2, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c2;
const q3 = (a, b, c2, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c2 + t * t * t * d; };
function drawSailLive(c, s, outer, mx, lift, now){
  const W = wind(), t = now / 1000 + s.id * 1.7, moving = s.state === 'sail', dot = (s.hx || 0) * W.tx + (s.hy || 0) * W.ty;
  const full = moving ? clamp(.5 + .3 * W.str + .5 * dot, .12, 1) : .35, gust = .5 + .5 * Math.sin(t * .8) * Math.sin(t * .37 + 1);
  const luff = clamp((1.05 - full) * (.6 + .6 * gust) + (moving ? 0 : .3), 0, 1), fa = .3 + 1.7 * luff;   // fa: how much the free edge flaps
  const Bx = 8 + Math.sin(t * 6.7) * fa * 1.2 + (1 - luff) * 1.6, By = -22 + Math.cos(t * 5.9) * fa * .8, Tx = -2 + (1 - luff) * 1.4, Ty = -16 - full * 3 + Math.sin(t * 5.3) * luff * 1.8;
  const c1x = 6 + Math.sin(t * 8.3) * fa * 1.4 + full * 2, c2x = 3.5 + Math.sin(t * 8.3 - 1.5) * fa * 1.5 + full * 1.4;
  const Ax = -10 + Math.sin(t * 4) * luff * .5, Ay = -24;
  const P = new Path2D(); P.moveTo(0, 0); P.quadraticCurveTo(-6 - full * .8, -10, Ax, Ay); P.quadraticCurveTo(Tx, Ty, Bx, By); P.bezierCurveTo(c1x, -16, c2x, -8, 0, 0); P.closePath();
  c.fillStyle = '#A84A2C'; c.fill(P); c.lineJoin = 'round'; stroke(c, P, INKC, 1, null, 'round');
  // the seams, following the cloth
  c.save(); c.strokeStyle = '#F2E6CB'; c.lineWidth = 1.2; c.setLineDash([.1, 2]); c.lineCap = 'round'; c.beginPath();
  for (const u of SAIL_SEAM){ const lx = q2(0, -6 - full * .8, Ax, u), ly = q2(0, -10, Ay, u), rx = q3(0, c2x, c1x, Bx, u * .95), ry = q3(0, -8, -16, By, u * .95); c.moveTo(lx + .8, ly); c.lineTo(rx - .8, ry); }
  c.stroke(); c.restore();
  // the pennant at the masthead: it streams downwind, droops in a calm
  if (lift > .35){
    const sg = (W.tx >= 0 ? 1 : -1) * outer * mx, droop = (1 - W.str) * .9 + .1, len = 7 + W.str * 4, amp = .5 + (1 - W.str * .5) * .7, ang = droop * .5;
    c.save(); c.globalAlpha = clamp((lift - .35) / .4, 0, 1); c.translate(Ax, Ay);
    const top = new Path2D(), bot = []; top.moveTo(0, -.2);
    for (let i = 1; i <= 5; i++){ const f = i / 5, x = sg * Math.cos(ang) * len * f, y = Math.sin(ang) * len * f * .8 + Math.sin(t * 10 - i * 1.4) * amp * f - (1 - f) * .3; top.lineTo(x, y - (1 - f) * 1.2); bot.push([sg * Math.cos(ang) * len * (1 - f * .0), 0]); }
    const tipx = sg * Math.cos(ang) * len, tipy = Math.sin(ang) * len * .8 + Math.sin(t * 10 - 7) * amp;
    for (let i = 4; i >= 0; i--){ const f = i / 5, x = sg * Math.cos(ang) * len * f, y = Math.sin(ang) * len * f * .8 + Math.sin(t * 10 - i * 1.4) * amp * f; top.lineTo(x, y + (1 - f) * 1.4); }
    top.closePath(); c.fillStyle = '#F3D9A0'; c.fill(top); stroke(c, top, INKC, .5, null, 'round');
    stroke(c, new Path2D(`M${sg * len * .15} .2L${tipx * .8} ${tipy * .8}`), '#A84A2C', .5, null, 'round'); c.restore();
  }
}

/* ---------- turtles in the lagoon: they come up to breathe, the head lifts, rings spread, then they dive and only a shadow
   goes on. In the nesting months (the storm season) more of them come, and oftener. */
function drawLagoonTurtle(c, I, lp, now){
  const t = now / 1000, nest = seasonOf().id === 'sturm', cx = I.center.x | 0, many = nest ? 2 : ((cx % 2 === 0) ? 1 : 0);
  for (let k = 0; k < many; k++){
    const per = (nest ? 13 : 18) + hsh(cx, k + 3) * 5, ph = ((t / per + hsh(cx, k + 9)) % 1 + 1) % 1;
    const up = ph > .72 ? 1 : ph > .6 ? (ph - .6) / .12 : ph < .1 ? 1 - ph / .1 : 0;
    const q = alongLoop(lp, -t * 2.4 + lp.len * (.25 + k * .5)), x = q.x + Math.sin(q.a) * 6, y = q.y - Math.cos(q.a) * 6;
    const rock = reduced ? 0 : Math.sin(t * 2 + k) * .06 * up;
    // under water: a dim, dark shape
    c.save(); c.translate(x, y); c.rotate(q.a + Math.PI + rock); c.scale(.9 + .1 * up, (.9 + .1 * up) * (1 + Math.sin(t * 2.6 + k) * .04));
    c.globalAlpha = .18 + .82 * up; if (up < .99){ c.fillStyle = 'rgba(30,74,90,.5)'; c.beginPath(); c.ellipse(0, 0, 4.4, 3.2, 0, 0, TAU); c.fill(); }
    blit(c, 'turtle', '<use href="#turtle"/>'); c.restore(); c.globalAlpha = 1;
    // rings where it breaks the surface and where it goes down
    const ringAt = (age, X, Y) => { if (age < 0 || age > 1) return; stroke(c, ellipse(X, Y + 1, 1 + age * 7, .4 + age * 2.6, 0), '#F4FBFA', .5, null, null, (1 - age) * .75); if (age > .15) stroke(c, ellipse(X, Y + 1, .6 + age * 4.5, .25 + age * 1.5, 0), '#F4FBFA', .4, null, null, (1 - age) * .5); };
    ringAt((ph - .6) / .22, x, y); ringAt(ph / .2, x, y);
    // a breath: the head up, a puff and a few drops
    if (ph > .76 && ph < .86){ const f = (ph - .76) / .1; c.fillStyle = '#F4FBFA'; for (let i = 0; i < 3; i++){ c.globalAlpha = (1 - f) * .85; c.beginPath(); c.arc(x - Math.cos(q.a) * 4 + (i - 1) * 1.1, y - 2.2 - f * (2 + i * .8), .5 - f * .2, 0, TAU); c.fill(); } c.globalAlpha = 1; }
  }
}

/* ---------- crabs on the beach: a few round the shore of each settled island. They stand still, then dart sideways along the
   waterline in a burst, legs a blur. */
const CRAB_BODY = new Path2D('M-1.5 .1Q-1.7-1.3 0-1.4Q1.7-1.3 1.5 .1Q0 .8-1.5 .1Z');
function shoreLoop(I){
  if (I._sl) return I._sl; const L = I.lands && I.lands[0]; if (!L || !L.poly || L.poly.length < 4) return I._sl = {len:0};
  const pts = L.poly, cum = [0]; for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length].x - pts[i - 1].x, pts[i % pts.length].y - pts[i - 1].y));
  return I._sl = {pts, cum, len:cum[cum.length - 1]};
}
function drawBeachCrabs(c, v, now){
  const t = now / 1000, night = nightLevel();
  for (const I of islands){
    if (!I.discovered || !lived(I) || !boxIn(I.box, v)) continue;
    const lp = shoreLoop(I); if (!lp.len) continue;
    const n = 2 + ((I.center.x | 0) % 3);
    for (let k = 0; k < n; k++){
      const sd = hsh(k + 1, I.center.y | 0), per = 4.2 + sd * 4, run = dartAt(t, sd * 6, per) * (k % 2 ? -1 : 1) * .55, d = sd * lp.len + run + k * lp.len / n;
      const q = alongLoop(lp, d), a = Math.atan2(I.center.y - q.y, I.center.x - q.x), x = q.x + Math.cos(a) * 3.4, y = q.y + Math.sin(a) * 3.4;
      if (!ptIn(x, y, v) || !landAt(I, {x, y})) continue;
      const f = (t / per + sd * 6) % 1, mv = f > .6 && f < .86, face = Math.cos(q.a) * (k % 2 ? -1 : 1) >= 0 ? 1 : -1;
      c.save(); c.translate(x, y); c.globalAlpha = 1 - night * .4;
      c.fillStyle = 'rgba(31,20,13,.18)'; c.beginPath(); c.ellipse(0, .9, 2, .6, 0, 0, TAU); c.fill();
      // legs: three a side, scuttling
      const w = mv ? t * 38 + k : 0; c.strokeStyle = INKC; c.lineWidth = .4; c.lineCap = 'round'; c.beginPath();
      for (let i = 0; i < 3; i++) for (const sg of [-1, 1]){ const sw = Math.sin(w + i * 2 + (sg > 0 ? 0 : 3.1)) * (mv ? .5 : .06); c.moveTo(sg * 1, -.1 + i * .2); c.lineTo(sg * (2.1 + sw), .6 + i * .2 - Math.abs(sw) * .2); }
      c.stroke();
      c.fillStyle = '#C9553A'; c.fill(CRAB_BODY); stroke(c, CRAB_BODY, INKC, .4, null, 'round');
      // claws up, eyes on stalks
      const cl = mv ? Math.sin(t * 20 + k) * .25 : Math.sin(t * 1.4 + k * 2) * .12;
      c.beginPath(); c.moveTo(-1.3, -.9); c.lineTo(-2.3, -2 + cl); c.moveTo(1.3, -.9); c.lineTo(2.3, -2 - cl); c.stroke();
      c.fillStyle = '#E37A55'; for (const sg of [-1, 1]){ c.beginPath(); c.arc(sg * 2.4, -2.2 + cl * sg * -1, .55, 0, TAU); c.fill(); c.lineWidth = .3; c.stroke(); }
      c.fillStyle = INKC; c.fillRect(-.6, -1.8, .3, .5); c.fillRect(.3, -1.8, .3, .5);
      c.restore();
    }
  }
}

/* ---------- smoke: soft puffs that rise in a lazy curl, widen and thin out. A strong wind lays the column over and drags it
   off faster, a calm lets it stand and curl; gusts bend it for a moment. (x0, y0: the mouth; lit 0..1; k: size) */
function drawPlume(c, x0, y0, id, lit, now, k = 1, dark = 0){
  const W = wind(), t = now / 1000, gust = .75 + .5 * (.5 + .5 * Math.sin(t * .9 + x0 * .03)), str = W.str, N = 5;
  for (let i = 0; i < N; i++){
    const q = (now / (2900 - 500 * str) + id * .37 + i / N) % 1, r = (1 + q * 3.4) * k, rise = q * (19 - 7 * str) * k;
    const drift = q * q * (10 + 26 * str) * gust * k, curl = Math.sin(q * 6.5 + id * 1.9 + t * .5) * (.4 + q * 2.1) * (1.15 - str * .6) * k;
    const a = Math.min(1, lit * 1.25) * Math.pow(1 - q, 1.2) * (.9 - str * .22) * Math.min(1, q * 7);
    c.globalAlpha = a; c.fillStyle = dark ? (i % 2 ? '#B9B4A8' : '#9E998E') : (i % 2 ? '#F6F1E6' : '#E9E2D3');
    const px = x0 + W.tx * drift + curl, py = y0 - rise + W.ty * drift * .4;
    c.beginPath(); c.ellipse(px, py, r, r * .78, curl * .12, 0, TAU); c.fill();
    c.globalAlpha = a * .6; c.strokeStyle = INKC; c.lineWidth = .4; c.stroke();
  }
  c.globalAlpha = 1;
}

/* ---------- rain: streaks that fall at their own speeds and slant with the wind (more in a gale, in gusts), and where they
   land rings spread on water and little splashes jump on land. (x, y0: top centre; wd, ht: width and height of the shower) */
function overLandPt(x, y){ for (const I of islands){ const b = I.box; if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue; if (landAt(I, {x, y})) return true; } return false; }
function drawRainFall(c, x, y0, wd, ht, n, a, now, seed = 0, rings = 5, ringY = null){
  const W = wind(), t = now / 1000, gust = .6 + .5 * Math.sin(t * .8 + x * .02), sl = W.tx * (2.2 + 5 * W.str) * gust, thin = new Path2D(), thick = new Path2D();
  for (let i = 0; i < n; i++){
    const h1 = hsh(i, seed + 1), h2 = hsh(i, seed + 2), sp = .85 + h1 * .9, f = (t * 1.25 * sp + h2) % 1, len = 4 + h1 * 4;
    const qx = x + (hsh(i, seed + 3) - .5) * wd + sl * f * ht * .12, qy = y0 + f * ht, P = i % 3 ? thin : thick;
    P.moveTo(qx, qy); P.lineTo(qx + sl * len * .22, qy + len);
  }
  c.save(); c.strokeStyle = INKC; c.lineCap = 'round'; c.globalAlpha = a * .4; c.lineWidth = .5; c.stroke(thin); c.globalAlpha = a * .55; c.lineWidth = .8; c.stroke(thick); c.restore();
  if (rings && lod === 'near' && !reduced){
    const gy = ringY == null ? y0 + ht : ringY;
    for (let i = 0; i < rings; i++){
      const f2 = (t * .9 + i / rings + hsh(i, seed + 5)) % 1, rx = x + (hsh(i, seed + 6) - .5) * wd * .9 + W.tx * 4, ry = gy + (hsh(i, seed + 7) - .5) * 9, water = !overLandPt(rx, ry);
      if (water){ c.globalAlpha = (1 - f2) * .65 * a; c.strokeStyle = '#F4ECD8'; c.lineWidth = .5; c.beginPath(); c.ellipse(rx, ry, .6 + f2 * 3.4, (.6 + f2 * 3.4) * .4, 0, 0, TAU); c.stroke();
        if (f2 > .2){ c.globalAlpha *= .6; c.beginPath(); c.ellipse(rx, ry, .3 + f2 * 1.9, (.3 + f2 * 1.9) * .4, 0, 0, TAU); c.stroke(); } }
      else if (f2 < .4){ const u = f2 / .4; c.globalAlpha = (1 - u) * .7 * a; c.strokeStyle = INKC; c.lineWidth = .4; c.beginPath();
        c.moveTo(rx - 1.6 * u - .3, ry); c.lineTo(rx - 2.4 * u - .5, ry - 1.6 * Math.sin(u * 3)); c.moveTo(rx, ry); c.lineTo(rx, ry - 2.4 * Math.sin(u * 3)); c.moveTo(rx + 1.6 * u + .3, ry); c.lineTo(rx + 2.4 * u + .5, ry - 1.6 * Math.sin(u * 3)); c.stroke(); }
    }
    c.globalAlpha = 1;
  }
}
/* A rain cloud churns: darker billows roll through it, left to right with the wind. (inside the cloud's frame, 100 wide) */
function cloudChurn(c, P, now, seed, a){
  const t = now / 1000, W = wind(), dir = W.tx >= 0 ? 1 : -1; c.save(); c.clip(P); c.fillStyle = '#8F9696'; c.globalAlpha = a * .38;
  for (let j = 0; j < 4; j++){ const sp = 5 + j * 2.2 + W.str * 7, ex = ((t * sp * dir + hsh(j, seed) * 140) % 150 + 150) % 150 - 75, ey = -7 - (j % 3) * 4 - Math.sin(t * .6 + j) * 1.2;
    c.beginPath(); c.ellipse(ex, ey, 14 + j * 2, 5.4 + (j % 2) * 2, 0, 0, TAU); c.fill(); }
  c.restore();
}
/* The shadow of a cloud on the ground, soft: dark in the middle, fading out */
function cloudShadow(c, x, y, R, a){
  c.save(); c.translate(x, y); c.scale(1, .32); const g = c.createRadialGradient(0, 0, R * .08, 0, 0, R);
  g.addColorStop(0, `rgba(31,20,13,${a * 1.3})`); g.addColorStop(.55, `rgba(31,20,13,${a})`); g.addColorStop(1, 'rgba(31,20,13,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.restore();
}

/* ---------- the village house: flags at the poles flutter, and while a feast goes on, bunting hangs between the poles and the
   fire in the middle flares up now and then, throws sparks and smokes. (The poles are in the picture, the cloth is not.) */
const BUNT_COL = ['#E0803A', '#F3D9A0', '#2F7A8C', '#A84A2C', '#D9A441'];
function flagCloth(c, x, y, dir, now, id, len, h){
  const W = wind(), t = now / 1000, amp = .5 + (1.2 - W.str * .7), ln = len * (.78 + W.str * .35), droop = (1 - W.str) * .7;
  const P = new Path2D(); P.moveTo(x, y);
  for (let i = 1; i <= 5; i++){ const f = i / 5; P.lineTo(x + dir * ln * f, y + droop * f * 2.2 + Math.sin(t * 9 - i * 1.3 + id) * amp * f - (1 - f) * .2); }
  for (let i = 4; i >= 0; i--){ const f = i / 5; P.lineTo(x + dir * ln * f, y + h * (1 - f * .35) + droop * f * 2.2 + Math.sin(t * 9 - i * 1.3 + id) * amp * f); }
  P.closePath(); c.fillStyle = '#E9DCC0'; c.fill(P); c.lineJoin = 'round'; stroke(c, P, INKC, .45, null, 'round');
  const Z = new Path2D(); Z.moveTo(x + dir * 1, y + h * .45); for (let i = 1; i <= 4; i++){ const f = i / 5; Z.lineTo(x + dir * ln * f * .85, y + h * (i % 2 ? .25 : .62) * (1 - f * .3) + droop * f * 2 + Math.sin(t * 9 - i * 1.3 + id) * amp * f); }
  stroke(c, Z, '#A84A2C', .5, null, 'round');
}
function drawHouseFlags(c, v, now){
  if (lod === 'far' || reduced) return;
  const W = wind(), dir = W.tx >= 0 ? 1 : -1, t = now / 1000;
  for (const I of islands){
    if (!seen(I) || !boxIn(I.box, grow(v, 40))) continue;
    for (const b of I.buildings){
      const hall = b.kind === 'halle' && I.lvl >= 2, fale = b.kind === 'fale';
      if (b.bt || !(hall || fale || (b.kind === 'halle' && I.feastEnd > tick)) || !ptIn(b.x, b.y, v)) continue;
      const feast = b.kind === 'halle' && I.feastEnd > tick, poles = hall || fale;
      if (feast && !poles){ for (const sg of [-1, 1]){ stroke(c, new Path2D(`M${b.x + sg * 20} ${b.y + 3}V${b.y - 27}`), INKC, 1.5, null, 'round'); stroke(c, new Path2D(`M${b.x + sg * 20} ${b.y + 3}V${b.y - 27}`), '#8C5F3E', .7, null, 'round'); } }
      for (const sg of [-1, 1]) flagCloth(c, b.x + sg * 20, b.y - 26.4, dir, now, b.id + sg, 8.4, 5.2);
      if (feast){
        // a string of little flags between the poles, sagging, each swinging on its own
        const x0 = b.x - 20, x1 = b.x + 20, y = b.y - 26.6, sag = 4.5 + Math.sin(t * 1.1 + b.id) * .4 * W.str, S = new Path2D(); S.moveTo(x0, y);
        for (let i = 1; i <= 16; i++){ const f = i / 16; S.lineTo(x0 + (x1 - x0) * f, y + Math.sin(f * Math.PI) * sag); }
        stroke(c, S, INKC, .5, null, 'round', .9);
        for (let i = 1; i < 11; i++){
          const f = i / 11, fx = x0 + (x1 - x0) * f, fy = y + Math.sin(f * Math.PI) * sag, sw = Math.sin(t * 5 + i * 1.7 + b.id) * .9 * (.4 + W.str) + W.tx * 1.1 * W.str;
          const F = new Path2D(`M${fx - 1.1} ${fy}L${fx + 1.1} ${fy}L${fx + sw} ${fy + 3.3}Z`); c.fillStyle = BUNT_COL[i % BUNT_COL.length]; c.fill(F); stroke(c, F, INKC, .3, null, 'round');
        }
      }
    }
  }
}
/* the feast fire in front of the house: a fire that flares in turns, higher tongues, sparks that fly off with the wind, a plume of smoke */
function drawFeastFire(c, h, now){
  const W = wind(), t = now / 1000, id = h.id, fx = h.x, fy = h.y + 24;
  const flare = reduced ? 0 : Math.pow(Math.max(0, Math.sin(t * .55 + id * 2.3)), 4) * .35;   // a calm fire: it breathes slowly, now and then a little higher
  const fl = reduced ? 1 : 1.05 + flare + Math.sin(now / 420) * .06 + Math.sin(now / 260) * .04;
  if (!reduced && lod !== 'far') drawPlume(c, fx + 1, fy - 6 - flare * 3, id + 5, .55, now, 1.25, 1);
  c.save(); c.translate(fx, fy);
  if (!reduced && lod !== 'far'){   // the glow on the ground
    const R = 11 + flare * 8; c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -1, 0, 0, -1, R); g.addColorStop(0, `rgba(255,170,70,${.28 + flare * .25})`); g.addColorStop(1, 'rgba(255,120,50,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, -1, R, R * .75, 0, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
  }
  const tongues = [[0, 1.05, 1, '#E0803A'], [-2.2, .75, .85, '#D0612E'], [2.3, .7, .8, '#EC9A44'], [-1, .9, .7, '#EC9A44'], [1.2, .85, .7, '#D0612E']];
  tongues.forEach(([dx, hs, ws, col], i) => {
    const hh = reduced ? hs : hs * (.85 + .3 * flick(t * 2.6 + i * 3.1, id * 3 + i)) * fl, lean = reduced ? 0 : (flick(t * 1.6 + i * 7, id + 40 + i) - .5) * .3 + W.tx * .1 * W.str;
    c.save(); c.translate(dx, 0); c.rotate(lean); c.scale(ws * 1.05, hh * 1.05); c.fillStyle = col; c.fill(FLAME); c.lineWidth = .5 / Math.max(.5, ws); c.strokeStyle = INKC; c.lineJoin = 'round'; c.stroke(FLAME);
    if (i === 0){ c.scale(.55, .6); c.fillStyle = '#F3D9A0'; c.fill(FLAME); } c.restore();
  });
  if (!reduced && lod === 'near'){   // sparks fly up, wavering, and are carried off
    c.fillStyle = '#FFD27A';
    for (let i = 0; i < 4; i++){ const per = 3.2 + hsh(i, id) * 2, q = ((t + hsh(i, id + 3) * 4) / per) % 1, sx = Math.sin(q * 7 + i * 2) * 1.8 + (hsh(i, id + 8) - .5) * 4 * q + W.tx * q * q * 14 * (.4 + W.str), sy = -5 - q * (13 + flare * 9 + hsh(i, id + 9) * 5);
      c.globalAlpha = (1 - q) * (.55 + flare * .45); c.beginPath(); c.arc(sx, sy, .55 * (1 - q * .5), 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  }
  c.restore();
}
function drawFeastLife(c, v, now){
  for (const I of islands){
    if (!(I.feastEnd > tick) || !boxIn(I.box, v) || lod === 'far') continue;
    const h = I.buildings.find(b => b.kind === 'halle'); if (h) drawFeastFire(c, h, now);
  }
}

/* ---------- the animals: now they move with what they do. A dog trots, sits, scratches and sniffs; a pig trots and roots; a
   hen pecks, looks about, runs with its head nodding and hops with a flap. Each has its own rhythm (_s). The poses are in a
   frame facing right, origin at the feet; drawCritter (render.js) turns it round. */
const DOG_P = {body:new Path2D('M-3-1.6Q-3.2-3-1.4-3.1H1.8Q2.8-3 3-2Q3.2-.9 2-.8H-2Q-3-.8-3-1.6Z'), head:new Path2D('M2.4-2.8Q2.6-4.6 4.2-4.4Q5.4-4 5-3.1Q4.4-2.4 3-2.4Z'), ear:new Path2D('M3-4.3L3.3-5.4L3.9-4.3L3.6-3.8Z'), tail:new Path2D('M0 0Q-1.5-1.2-.9-2.4')};
const CHICK_P = {body:new Path2D('M-2.2-2.2Q-2.4-3.8-.6-3.9Q1-4 1.6-3Q2-1.4.6-1Q-1.6-.8-2.2-2.2Z'), tail:new Path2D('M-2-2.6Q-3.6-3.8-3.2-5.2Q-2.2-4.2-1.4-3.6'), comb:new Path2D('M-.3-.9Q0-1.6.4-.9'), beak:new Path2D('M.8-.1L1.5.1L.8.3Z')};
const critLine = (c, x0, y0, x1, y1, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
function critterLive(c, a, now){
  if (a._s === undefined) a._s = Math.random() * 97;
  const s = a._s, mv = a.moving, slot = Math.floor(now / (3300 + ((s | 0) % 5) * 650) + s), hh = hsh(slot, s);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (a.kind === 'dog') dogLive(c, now, s, mv, hh); else if (a.kind === 'pig') pigLive(c, now, s, mv, hh); else chickenLive(c, now, s, mv, hh, a);
}
function dogLive(c, now, s, mv, hh){
  // a village dog: long body, longer snout, a floppy ear, a low curved tail. Sitting it rests on its haunches, the front
  // legs straight down from the chest, so nothing floats; scratching, a hind paw goes up to the ear.
  const t = now / 1000, TAN = '#B08048', DK = '#7E5A38', pose = mv ? 'trot' : hh < .3 ? 'sit' : hh < .44 ? 'scratch' : hh < .74 ? 'sniff' : 'stand', sit = pose === 'sit' || pose === 'scratch';
  const g = t * 11 + s, bob = pose === 'trot' ? -Math.abs(Math.sin(g)) * .45 : 0, wag = Math.sin(t * (pose === 'trot' ? 14 : pose === 'stand' ? 3 : 7) + s);
  const ink = (path, w) => { c.lineWidth = w; c.strokeStyle = INKC; c.stroke(path); };
  c.fillStyle = 'rgba(31,20,13,.2)'; c.beginPath(); c.ellipse(.4, .4, sit ? 2.8 : 3.8, .9, 0, 0, TAU); c.fill();
  const leg = (x0, y0, x1, y1, col) => { critLine(c, x0, y0, x1, y1, INKC, 1); critLine(c, x0, y0, x1, y1, col, .5); };
  const trotLeg = (x, ph, col) => { const sw = pose === 'trot' ? Math.sin(g + ph) * 1.1 : 0, lf = pose === 'trot' ? Math.max(0, Math.cos(g + ph)) * .6 : 0; leg(x, -1.6 + bob, x + sw, .5 - lf, col); };
  if (!sit){ trotLeg(-2.3, Math.PI, DK); trotLeg(2.1, 0, DK); }
  // body
  const B = new Path2D(); if (sit) B.ellipse(-.4, -2.4, 2.6, 1.5, -.55, 0, TAU); else B.ellipse(0, -2.3 + bob, 3.4, 1.35, 0, 0, TAU);
  // tail, low and curved, wagging
  { const tx = sit ? -2.4 : -3.2, ty = sit ? -.8 : -2.5 + bob, T = new Path2D(); T.moveTo(tx, ty); T.quadraticCurveTo(tx - 1.3, ty - .6 - wag * .5, tx - 1.9, ty - 1.6 - wag * .9);
    c.lineCap = 'round'; ink(T, 1); c.lineWidth = .5; c.strokeStyle = TAN; c.stroke(T); }
  if (sit){ c.fillStyle = TAN; c.beginPath(); c.ellipse(-1.9, -1, 1.6, 1.1, 0, 0, TAU); c.fill(); c.lineWidth = .4; c.strokeStyle = INKC; c.stroke(); }   // the haunch
  c.fillStyle = TAN; c.fill(B); ink(B, .45);
  if (sit){ leg(.9, -2.9, 1, .5, TAN); leg(1.7, -3, 1.8, .5, DK); }   // front legs from the chest to the ground
  else { trotLeg(-1.3, 0, TAN); trotLeg(2.9, Math.PI, TAN); }
  // head: lower when sniffing, up when sitting, a tilt while scratching
  const hx = sit ? 1.9 : 3.1, hy = sit ? -4.6 : -3.2 + bob, tilt = pose === 'sniff' ? .5 + Math.sin(t * 6 + s) * .1 : pose === 'scratch' ? -.25 + Math.sin(t * 20) * .05 : pose === 'trot' ? Math.sin(g * 2) * .05 : Math.sin(t * 1.3 + s) * .07;
  c.save(); c.translate(hx, hy); c.rotate(tilt);
  const H = new Path2D(); H.ellipse(0, 0, 1.35, 1.15, 0, 0, TAU); const N = new Path2D(); N.moveTo(.6, -.6); N.lineTo(2.3, -.25); N.quadraticCurveTo(2.7, .3, 2.2, .55); N.lineTo(.6, .7); N.closePath();
  c.fillStyle = TAN; c.fill(N); ink(N, .4); c.fill(H); ink(H, .45);
  c.fillStyle = INKC; c.beginPath(); c.arc(2.45, .1, .32, 0, TAU); c.fill(); c.beginPath(); c.arc(.55, -.35, .24, 0, TAU); c.fill();   // nose, eye
  const flop = pose === 'trot' ? Math.sin(g * 2 + 1) * .3 : pose === 'scratch' ? Math.sin(t * 20) * .25 : Math.sin(t * 2.1 + s) * .08;
  c.save(); c.translate(-.4, -.8); c.rotate(.25 + flop); const E = new Path2D(); E.moveTo(0, 0); E.quadraticCurveTo(-1.1, .6, -.7, 2); E.quadraticCurveTo(-.1, 1.6, .5, .3); E.closePath(); c.fillStyle = DK; c.fill(E); ink(E, .35); c.restore();   // the floppy ear
  c.restore();
  if (pose === 'scratch'){ const k = Math.sin(t * 22); leg(-1.6, -1.2, .4 + k * .25, -3.6 + k * .3, TAN); }   // a hind paw at the ear
  else if (sit) leg(-1.2, -.4, -.2, .5, DK);   // the hind paw on the ground
}
function pigLive(c, now, s, mv, hh){
  const t = now / 1000, BODY = '#4A3428', SNOUT = '#8C5F6E', pose = mv ? 'trot' : hh < .55 ? 'root' : hh < .8 ? 'stand' : 'ear', g = t * 8 + s;
  const bob = pose === 'trot' ? -Math.abs(Math.sin(g)) * .3 : 0, roll = pose === 'trot' ? Math.sin(g) * .035 : 0;
  c.fillStyle = 'rgba(31,20,13,.2)'; c.beginPath(); c.ellipse(.5, .4, 4, 1, 0, 0, TAU); c.fill();
  const leg = (x, ph) => { const sw = pose === 'trot' ? Math.sin(g + ph) * 1 : 0, lf = pose === 'trot' ? Math.max(0, Math.cos(g + ph)) * .5 : 0; critLine(c, x, -1.2 + bob, x + sw, .5 - lf, INKC, .95); };
  leg(-3.2, Math.PI); leg(2.8, 0); leg(-1.6, 0); leg(1.4, Math.PI);
  c.save(); c.translate(0, bob); c.rotate(roll);
  c.fillStyle = BODY; c.beginPath(); c.ellipse(0, -2.2, 4, 2.4, 0, 0, TAU); c.fill(); c.lineWidth = .55; c.strokeStyle = INKC; c.stroke();
  // the curly tail
  c.save(); c.translate(-3.9, -2.6); c.rotate(Math.sin(t * (pose === 'trot' ? 10 : 3) + s) * .35); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-1.1, -.6, -.6, -1.4); c.quadraticCurveTo(-.2, -1.8, -.8, -1.2); c.lineWidth = .5; c.stroke(); c.restore();
  // head: down at the ground while rooting, the snout working
  const hd = pose === 'root' ? .62 + Math.sin(t * 9 + s) * .08 : pose === 'trot' ? .12 + Math.sin(g * 2) * .05 : Math.sin(t * 1.1 + s) * .06;
  c.save(); c.translate(2.9, -2.5); c.rotate(hd); c.translate(-2.9, 2.5);
  c.fillStyle = BODY; c.beginPath(); c.ellipse(3.4, -2.5, 1.9, 1.55, 0, 0, TAU); c.fill(); c.lineWidth = .45; c.stroke();
  c.fillStyle = SNOUT; c.beginPath(); c.ellipse(4.9 + (pose === 'root' ? Math.sin(t * 14) * .15 : 0), -2.4, 1, .85, 0, 0, TAU); c.fill(); c.lineWidth = .4; c.stroke();
  c.save(); c.translate(3.1, -3.8); c.rotate(pose === 'ear' ? Math.sin(t * 18) * .35 : Math.sin(t * 1.7 + s) * .05); c.translate(-3.1, 3.8);
  c.fillStyle = BODY; c.beginPath(); c.moveTo(2.2, -3.8); c.lineTo(3.2, -5.4); c.lineTo(3.7, -3.6); c.closePath(); c.fill(); c.lineWidth = .4; c.stroke(); c.restore();
  c.fillStyle = '#F1EBD9'; c.beginPath(); c.arc(4, -3, .22, 0, TAU); c.fill();
  c.restore(); c.restore();
  if (pose === 'root'){   // earth flies up from the snout
    const nx = 7 * Math.cos(.35) + 0, base = 5.6; c.fillStyle = '#7A5A38';
    for (let i = 0; i < 4; i++){ const f = (t * 2.6 + i * .27 + s) % 1; c.globalAlpha = (1 - f) * .85; c.beginPath(); c.arc(base + f * 2.3 * (i % 2 ? 1 : .6), .2 - Math.sin(f * Math.PI) * (1.7 + i * .4), .4, 0, TAU); c.fill(); }
    c.globalAlpha = 1; c.fillStyle = 'rgba(122,90,56,.5)'; c.beginPath(); c.ellipse(base + .4, .4, 1.8, .45, 0, 0, TAU); c.fill();
  }
}
function chickenLive(c, now, s, mv, hh, a){
  const t = now / 1000, RED = '#A84A2C', LEG = '#D9A441', g = t * 15 + s, hop = !mv && hh > .84, cyc = (t * .95 + s) % 2.6, peck = !mv && !hop && hh < .66 && cyc < 1;
  const pk = peck ? Math.pow(Math.sin(((cyc / .3) % 1) * Math.PI), 1.3) : 0;   // 0..1: the head down for the grain
  let jy = 0, flap = 0; if (hop){ const f = (t * .7 + s) % 1; if (f < .22){ const u = f / .22; jy = -Math.sin(u * Math.PI) * 3.2; flap = Math.sin(u * Math.PI) } }
  else if (mv) jy = -Math.abs(Math.sin(g * .5)) * .5;
  c.fillStyle = 'rgba(31,20,13,.2)'; c.beginPath(); c.ellipse(.2, .3, 2 - (jy < 0 ? -jy * .15 : 0), .6, 0, 0, TAU); c.fill();
  const lg = ph => { const sw = mv ? Math.sin(g + ph) * 1 : 0, lf = mv ? Math.max(0, Math.cos(g + ph)) * .5 : 0; return [sw, lf]; };
  for (const [x, ph] of [[-.6, 0], [.6, Math.PI]]){ const [sw, lf] = lg(ph); critLine(c, x, -1 + jy, x + sw, .3 - lf + jy * .75, LEG, .5); }
  c.save(); c.translate(0, jy); c.translate(.2, -1.4); c.rotate(.1 + pk * .45 + (mv ? .1 : 0)); c.translate(-.2, 1.4);
  c.fillStyle = '#2F5A3E'; c.beginPath(); c.moveTo(-2, -2.6); c.quadraticCurveTo(-3.6 + Math.sin(t * 3 + s) * .2, -3.8 + flap * -.8, -3.2, -5.2); c.quadraticCurveTo(-2.2, -4.2, -1.4, -3.6); c.fill(); c.lineWidth = .35; c.strokeStyle = INKC; c.stroke();
  c.fillStyle = RED; c.fill(CHICK_P.body); stroke(c, CHICK_P.body, INKC, .4, null, 'round');
  // the wing
  c.save(); c.translate(-.5, -2.5); c.rotate(-flap * 1.2); c.fillStyle = '#8C3A22'; c.beginPath(); c.ellipse(.3, 0, 1.3 + flap * .7, .75, flap * .6, 0, TAU); c.fill(); c.lineWidth = .25; c.stroke(); c.restore();
  // head on its neck: nods forward and back when it runs, dips to peck, turns to look
  const nod = mv ? Math.sin(g * .5 + .8) * .55 : 0, look = !mv && !peck ? Math.sin(t * 1.6 + s * 3) * .2 : 0, hx = 1 + nod + look, hy = -4.2 + pk * 2.9;
  c.strokeStyle = RED; c.lineWidth = 1.2; c.beginPath(); c.moveTo(.6, -3); c.lineTo(hx - .2, hy + .6); c.stroke();
  c.fillStyle = RED; c.beginPath(); c.arc(hx + .5, hy, .9, 0, TAU); c.fill(); c.lineWidth = .35; c.strokeStyle = INKC; c.stroke();
  c.save(); c.translate(hx + .5, hy); c.fillStyle = '#C8402C'; c.fill(CHICK_P.comb); c.lineWidth = .25; c.stroke(CHICK_P.comb); c.rotate(pk * .5); c.fillStyle = LEG; c.translate(.9, -.1); c.beginPath(); c.moveTo(0, -.2); c.lineTo(.75, 0); c.lineTo(0, .2); c.closePath(); c.fill(); c.restore();
  c.fillStyle = INKC; c.beginPath(); c.arc(hx + .7, hy - .1, .18, 0, TAU); c.fill();
  c.restore();
}
