/* ======================================================================================================================
   Sea motion: how canoes sit on the water (heel, bow spray, stern foam, wash at the float, moored ripples, dugouts that
   pitch) and what lives in the sea (splashes, leaping dolphins, skipping flying fish, paddling turtles, schools that
   turn together, whales that blow and dive). Same flat, ink-outlined style, only moving. Called from render.js
   (drawTop, drawDugout, drawWhales, drawSeaLife, drawLagoonLife), worldmotion.js and hingucker.js. Pure drawing: no state
   except what the callers hand in. Fine detail is drawn only where it can be seen (lod, quality), with no allocations in
   the loops beyond a small Path2D here and there.
   ====================================================================================================================== */
const FOAMC = '#F4FBFA';
const ease01 = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);

/* ---------- water that is thrown up: drops on arcs and a crown ring (x, y at the water, q: 0..1 through the splash, k: size) */
function splashAt(c, x, y, q, k, n = 5){
  if (q <= 0 || q >= 1) return;
  const g = c.globalAlpha; c.globalAlpha = g * (1 - q) * .9; c.fillStyle = FOAMC; c.beginPath();
  for (let i = 0; i < n; i++){
    const a = (n > 1 ? i / (n - 1) - .5 : 0) * 1.8, px = x + Math.sin(a) * 5.2 * q * k, py = y + (-Math.cos(a) * (6 + i % 2 * 2) * q + 13 * q * q) * k, r = .5 * k * (1 - q * .4);
    c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU);
  }
  c.fill(); c.globalAlpha = g;
  stroke(c, ellipse(x, y + .6 * k, (.8 + q * 4.6) * k, (.3 + q * 1.5) * k), FOAMC, .5 * k, null, null, (1 - q) * .8);
}

/* ---------- a leap: the nose follows the arc (up, over, down), the drops run off the tail. Water point (ox, oy), the leap
   runs L to the side and A high, f 0..1 */
const leapAng = (f, L, A, dir) => Math.atan2(-A * Math.PI * Math.cos(f * Math.PI), L) * dir;
function dolphinLeap(c, ox, oy, dir, f, L, A, k, dy = 0){
  const x = ox + dir * f * L, y = oy + f * dy - Math.sin(f * Math.PI) * A, ang = leapAng(f, L, A, dir);
  put(c, x, y, k, dir, ang, 'dolphin', '<use href="#dolphin"/>');
  if (lod === 'near' && f > .12 && f < .92){   // drops fall from the belly and the tail
    const g = c.globalAlpha; c.fillStyle = FOAMC; c.globalAlpha = g * .8; c.beginPath();
    for (let i = 0; i < 3; i++){ const d = (f * 3 + i / 3) % 1, px = x - dir * (3.4 + d * 2.2) * k, py = y + (.8 + d * d * 6) * k; c.moveTo(px + .36 * k, py); c.arc(px, py, .36 * k * (1 - d * .5), 0, TAU); }
    c.fill(); c.globalAlpha = g;
  }
}

/* ---------- canoes ---------- */
/* the heel the wind gives a canoe under way: most when it blows across the course, none from astern; leans to the lee */
function windHeel(s, now){
  if (s.state !== 'sail' || reduced) return 0;
  const W = wind(); if (W.str < .12) return 0;
  const dot = (s.hx || 0) * W.tx + (s.hy || 0) * W.ty, side = Math.sqrt(Math.max(0, 1 - dot * dot)), gust = .75 + .25 * Math.sin(now / 1700 + s.id * 2.3);
  return (W.tx >= 0 ? 1 : -1) * W.str * side * gust * (s.kind === 'oc' ? .035 : .055);
}
/* where the bow of a canoe is and which way the hull points on screen (the hulls are drawn along fixed slants, see drawTop):
   o.x, o.y the offset of the bow from the canoe's middle, o.dx, o.dy the unit vector of the hull towards the bow */
const BOWO = {x:0, y:0, dx:1, dy:0};
function bowOf(s){
  const face = s.face || (s.hx < 0 ? -1 : 1), o = BOWO;
  if (s.kind === 'oc'){ o.dx = face; o.dy = 0; o.x = face * 15; o.y = -.4; return o; }
  const up = s.up ?? s.hy < 0, flip = up ? face < 0 : face >= 0, a = (up ? -24 : 156) * Math.PI / 180, L = s.kind === 'vaka' ? 25 : 20;
  o.dx = flip ? -Math.cos(a) : Math.cos(a); o.dy = Math.sin(a); o.x = o.dx * L; o.y = o.dy * L; return o;
}
/* spray at the bow: a foam crescent and drops thrown up and over to both sides, more when the swell tips the bow down */
function bowSpray(c, s, ks, now){
  const B = bowOf(s), hx = B.dx, hy = B.dy, sx = hx < 0 ? -1 : 1, str = wind().str, S = swellAt(s.x, s.y, now);
  const plunge = clamp(.4 + S.sl * sx * .8, 0, 1) * (.5 + str * .7), bx = s.x + B.x * ks, by = s.y + B.y * ks + 1.4;
  if (plunge > .15){ const P = new Path2D(); P.moveTo(bx - hy * 3 * ks - hx * 2 * ks, by + hx * 1.8 * ks - hy * 1.2 * ks); P.quadraticCurveTo(bx + hx * 1.8 * ks, by - .3 * ks, bx + hy * 3 * ks - hx * 2 * ks, by - hx * 1.8 * ks - hy * 1.2 * ks);
    stroke(c, P, FOAMC, (1 + plunge) * ks * .8, null, 'round', plunge * .8); }
  const g = c.globalAlpha; c.fillStyle = FOAMC;
  for (let i = 0; i < 6; i++){
    const f = (now / 450 + i / 6 + s.id * .37) % 1, side = i % 2 ? 1 : -1, h = (2 + plunge * 5 + (i % 3)) * ks;
    const x = bx - hx * f * 5 * ks - hy * side * (1.5 + f * 4.5) * ks, y = by - hy * f * 3 * ks + hx * side * (.8 + f * 2) * ks - (Math.sin(f * Math.PI) * h) + f * f * 2 * ks;
    c.globalAlpha = g * (1 - f) * (.45 + plunge * .5); c.beginPath(); c.arc(x, y, (.45 + (i % 2) * .2) * ks * (1 - f * .4), 0, TAU); c.fill();
  }
  c.globalAlpha = g;
}
/* turbulence at the stern: small foam patches that grow and fade where the hull has passed */
function sternFoam(c, s, ks, now){
  const B = bowOf(s), hx = B.dx, hy = B.dy, g = c.globalAlpha, sp = .5 + wind().str * .5, len = Math.hypot(B.x, B.y) * .8; c.fillStyle = FOAMC;
  for (let i = 0; i < 5; i++){
    const f = (now / 1100 + i / 5 + s.id * .21) % 1, side = (i * 2 % 3 - 1) * .8, x = s.x - hx * (len + f * 13 * sp) * ks - hy * side * (1 + f * 2.5) * ks, y = s.y - hy * (len + f * 13 * sp) * ks + hx * side * (1 + f * 1.4) * ks + 2.2 * ks;
    c.globalAlpha = g * (1 - f) * .55; c.beginPath(); c.ellipse(x, y, (1.1 + f * 2.2) * ks, (.5 + f * .8) * ks, 0, 0, TAU); c.fill();
  }
  c.globalAlpha = g;
}
/* the sail leans to the lee with the wind (the lean the hull shows in windHeel, seen from the sail's own frame) */
function sailLean(s, outer, mx){
  if (s.state !== 'sail') return 0;
  const W = wind(), dot = (s.hx || 0) * W.tx + (s.hy || 0) * W.ty;
  return -(W.tx >= 0 ? 1 : -1) * W.str * Math.sqrt(Math.max(0, 1 - dot * dot)) * .1 * mx * outer;
}
/* the outrigger float and the hull wash: foam streams along the float and kicks up at its bow (in the oc's own frame) */
function floatWash(c, s, now){
  const t = now / 1000, S = swellAt(s.x, s.y, now), a = .5 + .5 * Math.sin(t * 5.2 + s.id), g = c.globalAlpha;
  stroke(c, FLOAT_WASH, FOAMC, .7, [1, 1.7], 'round', .75);
  c.lineDashOffset = -now / 90; stroke(c, FLOAT_WASH, FOAMC, .5, [.6, 2.4], 'round', .6); c.lineDashOffset = 0;
  c.fillStyle = FOAMC; c.globalAlpha = g * .8; c.beginPath();
  for (let i = 0; i < 3; i++){ const f = (t * 1.8 + i / 3 + s.id * .3) % 1; c.moveTo(7.6 + f * 1.8 + .35, -7.2 - Math.sin(f * Math.PI) * (1 + a * 1.4)); c.arc(7.6 + f * 1.8, -7.2 - Math.sin(f * Math.PI) * (1 + a * 1.4), .38 * (1 - f * .5), 0, TAU); }
  c.fill(); c.globalAlpha = g * (.4 + S.sl * .2); stroke(c, new Path2D('M-2.4-6.4Q0-6 2.8-6.4'), FOAMC, .5, null, 'round', 1); c.globalAlpha = g;
}
const FLOAT_WASH = new Path2D('M-6.4-6.7Q0-6.1 7.4-6.8');
/* a moored canoe: rings go out over the water round the hull, alternately (x, y: the hull) */
function mooringRipples(c, s, x, y, ks, now){
  const R = (s.kind === 'oc' ? 15 : s.kind === 'vaka' ? 26 : 21) * ks;
  for (let i = 0; i < 2; i++){ const f = (now / 2600 + i * .5 + s.id * .31) % 1; stroke(c, ellipse(x, y + 1.9 * ks, R * (.8 + f * .45), R * (.8 + f * .45) * .24), FOAMC, .6, [1.6, 1.6], 'round', (1 - f) * .6); }
}
/* a dugout lifts and settles on the water, rocks fore and aft a little; in the dugout's frame, before the hull is drawn */
function dugoutHeave(c, now, ph, moving){
  const t = now / 1000 + ph * 1.3; c.translate(0, Math.sin(t * 1.9) * (moving ? .28 : .22)); c.rotate(Math.sin(t * 1.9 - .8) * (moving ? .032 : .02));
}
/* the bow wave and the swirl at the stern of a dugout that is paddled (len: 1 for one person, 1.5 for the long one) */
function dugoutFoam(c, now, ph, len){
  const t = now / 1000 + ph, f = (t * 1.1) % 1, L = len * 7.6;
  stroke(c, new Path2D(`M${L - .4} .5Q${L + 1.6} .7 ${L + 2.8 + f} 1.9M${L - .4} .9Q${L + 1.2} 1.5 ${L + 2 + f * .8} 2.9`), FOAMC, .5, null, 'round', .8);
  for (let i = 0; i < 2; i++){ const g = (t * .8 + i * .5) % 1; stroke(c, ellipse(-L - 1 - g * 3.5, 1.6, .8 + g * 1.6, .3 + g * .5), FOAMC, .4, null, null, (1 - g) * .7); }
}

/* ---------- life in the sea ---------- */
/* a flying fish over its whole run (f 0..1): it taxis on the tail, leaves in a few skips that grow lower, the wings
   flutter, the tail dips and throws a drop at each touch. x, y: where it is on the water. */
function flyingFishRun(c, x, y, dir, f, k){
  const u = f * 3, hop = Math.floor(u), r = u - hop, A = 4.4 - hop * 1.2, h = Math.sin(r * Math.PI) * A, fy = y - h, ang = -Math.atan(Math.cos(r * Math.PI) * Math.PI * A / 20) * dir;
  c.save(); c.translate(x, fy); c.rotate(ang); c.scale(dir * k * .8, k * .8);
  c.fillStyle = '#EAF3F5'; c.lineWidth = .3; c.strokeStyle = INKC; c.lineJoin = 'round';
  c.fill(FLYFISH_BODY); c.stroke(FLYFISH_BODY);
  c.save(); c.translate(.6, -.2); c.scale(1, h < .3 ? .45 : 1 + Math.sin(f * 420) * .22); c.translate(-.6, .2); c.globalAlpha *= .85; c.fill(FLYFISH_WING); c.stroke(FLYFISH_WING); c.restore();   // the wing beats fast, folds on the water
  c.restore();
  if (lod === 'near'){
    if (r < .22 || r > .9){ const q = r < .22 ? r / .22 : 0, sx = x - dir * r * 20; if (hop || f < .3) splashAt(c, sx, y + .8, q, k * .5, 3); stroke(c, new Path2D(`M${x - dir * 2.2 * k} ${y + .6}h${-dir * 3 * k}`), FOAMC, .5, null, 'round', .6); }   // the tail ploughs a short furrow
    else { const g = c.globalAlpha; c.globalAlpha = g * .7; c.fillStyle = FOAMC; c.beginPath(); c.arc(x - dir * 2.4 * k, fy + (r - .2) * 2.5, .3 * k, 0, TAU); c.fill(); c.globalAlpha = g; }   // a drop falls from the tail
  }
}

const drawFlyingFish = flyingFishRun;   // the one fish at a point of its run (the name the tests know)

/* a turtle, from above and a little aside, facing +x: the front flippers row, the hind ones trail, the head bobs. t in
   seconds, seed 0..: its own beat; up 0..1: head raised to breathe */
const TURTLE_FL = new Path2D('M-.3-.4Q1.5-2.8 3.3-2.2Q2.5-.8 .3.4Z'), TURTLE_HL = new Path2D('M.1-.2Q-1.5-1.8-2.3-1Q-1.5.2-.1.8Z');
const TURTLE_SHELL = new Path2D('M-1.8-2.3L-.5 0L-1.8 2.3M1.3-2.5L.5 0L1.3 2.5M-3.5 0H3.5'), TURTLE_HIGH = new Path2D('M-2.6-1.8Q0-3 2.4-1.8');
function turtleLive(c, t, seed, up){
  const stroke_ = Math.sin(t * 3 + seed), glide = .45 + .55 * Math.max(0, Math.sin(t * .6 + seed * 2.3)), a = stroke_ * (.25 + .3 * glide), lag = Math.sin(t * 3 + seed - 1.1) * .3;
  c.save(); c.scale(.72, .72); c.globalAlpha *= .92; c.lineJoin = 'round'; c.lineWidth = .4; c.strokeStyle = INKC; c.fillStyle = '#6F8E4A';
  for (const s of [-1, 1]){
    c.save(); c.translate(2.9, s * 1.6); c.scale(1, s); c.rotate(a - .15); c.fill(TURTLE_FL); c.stroke(TURTLE_FL); c.restore();
    c.save(); c.translate(-2.9, s * 1.6); c.scale(1, s); c.rotate(lag * .6 + .1); c.fill(TURTLE_HL); c.stroke(TURTLE_HL); c.restore();
  }
  const hb = Math.sin(t * 1.5 + seed) * .25 - up * .5; c.fillStyle = '#6F8E4A'; c.beginPath(); c.ellipse(4.6 + hb * .5, 0, 1.5 + up * .3, 1.1, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#7A5A33'; c.lineWidth = .5; c.beginPath(); c.ellipse(0, 0, 3.8, 2.9 + stroke_ * .08, 0, 0, TAU); c.fill(); c.stroke();
  c.lineWidth = .35; c.strokeStyle = '#4A3420'; c.stroke(TURTLE_SHELL); c.lineWidth = .4; c.strokeStyle = '#A98857'; c.lineCap = 'round'; c.stroke(TURTLE_HIGH);
  c.fillStyle = INKC; c.beginPath(); c.arc(5.2 + hb * .5, -.35, .22, 0, TAU); c.fill();
  c.restore();
}

/* a school of small fish that swims as one: it weaves, each fish a little off the others, the tails beat; now and then
   one flashes silver. (x, y: the leader, a: the heading, seed: which school) */
const SCHOOL = [[0, 0], [-4, -2.4], [-4.4, 2.2], [-8, -.4], [-8.6, 3.4], [-11.6, 1.2]];
function fishSchool(c, x, y, a, t, seed){
  const ca = Math.cos(a), sa = Math.sin(a), tight = 1 + Math.sin(t * .9 + seed) * .22, flash = Math.floor(t * 1.7 + seed * 3) % 6;
  c.fillStyle = 'rgba(36,90,102,.55)'; c.beginPath();
  for (let i = 0; i < SCHOOL.length; i++){
    const fa = a + Math.sin(t * 1.3 + i * 1.7 + seed) * .22, cf = Math.cos(fa), sf = Math.sin(fa), bx = SCHOOL[i][0] * tight + Math.sin(t * 1.7 + i * 2.1) * .8, by = SCHOOL[i][1] * tight + Math.cos(t * 1.3 + i) * .7;
    const px = x + bx * ca - by * sa, py = y + bx * sa + by * ca, wg = Math.sin(t * 14 + i * 2.3) * .65;
    c.moveTo(px + cf * 1.6, py + sf * 1.6); c.quadraticCurveTo(px - sf * 1.1, py + cf * 1.1, px - cf * 1.6, py - sf * 1.6);
    c.lineTo(px - cf * 2.6 - sf * (.9 + wg), py - sf * 2.6 + cf * (.9 + wg)); c.lineTo(px - cf * 2.6 + sf * (.9 - wg), py - sf * 2.6 - cf * (.9 - wg)); c.lineTo(px - cf * 1.6, py - sf * 1.6);
    c.quadraticCurveTo(px + sf * 1.1, py - cf * 1.1, px + cf * 1.6, py + sf * 1.6);
    if (i === flash){ const q = (t * 1.7 + seed * 3) % 1; if (q < .35) stroke(c, glint(px, py, 1.1 + Math.sin(q / .35 * Math.PI) * .8), '#FFFFFF', .5, null, 'round', Math.sin(q / .35 * Math.PI) * .9); }
  }
  c.fill();
}

/* ---------- a whale: it rises, blows twice, arches over and dives, the fluke the last of it. Drawn in the whale's own
   frame (origin on the water at its middle, facing +x, scaled by the caller); t: seconds since it showed, 0..8 */
const SPOUT_DROP = [[-1.5, 1.05], [-1, 1.2], [-.5, 1.1], [0, 1.3], [.5, 1.15], [1, 1.25], [1.5, 1.1]];
function whaleLive(c, t, k){
  const rise = ease01(t / 1.1), dive = ease01((t - 4.8) / 2.4), sink = (1 - rise) * 6.5 + dive * 15, th = Math.min(.62, Math.max(0, t - 4.7) * .5) + Math.sin(t * 1.4) * .025 * (1 - dive) - (1 - rise) * .1;
  // a dark shape under the water where it rises and where it sinks away
  const sh = t < 1.4 ? (1.4 - t) / 1.4 * .3 : t > 5.2 ? Math.min(.3, (8 - t) / 2) : 0;
  if (sh > .01){ c.fillStyle = `rgba(30,74,90,${sh.toFixed(2)})`; c.beginPath(); c.ellipse(-1, 2.2 + dive * 2, 11.5, 2.6, 0, 0, TAU); c.fill(); }
  c.save(); c.beginPath(); c.rect(-40, -40, 80, 41.6); c.clip();   // only what is above the water line
  c.translate(0, sink); c.rotate(th); blit(c, 'whale', '<use href="#whale"/>');
  if (th > .18){   // the tail comes up as the nose goes down: the fluke
    c.save(); c.translate(-11.5, .5); c.rotate(-th * 1.35); blit(c, 'fluke', '<use href="#fluke"/>');
    if (lod === 'near'){ const g = c.globalAlpha; c.fillStyle = FOAMC; c.globalAlpha = g * .85; c.beginPath(); for (let i = 0; i < 4; i++){ const d = (t * 1.4 + i / 4) % 1, px = (i - 1.5) * 2.1, py = -5 + d * d * 9; c.moveTo(px + .4, py); c.arc(px, py, .4 * (1 - d * .4), 0, TAU); } c.fill(); c.globalAlpha = g; }   // water runs off it
    c.restore();
  }
  c.restore();
  // the blow: a fan of fine jets from the blowhole that rise, open and fall, a puff of mist on top
  for (const b of [1.5, 3.7]){
    const q = (t - b) / 1.35; if (q <= 0 || q >= 1) continue;
    const g = c.globalAlpha, up = Math.sin(Math.min(1, q * 1.5) * Math.PI / 2), fall = Math.max(0, q - .35) / .65;
    c.lineCap = 'round'; c.globalAlpha = g * (1 - fall * fall) * .95; c.strokeStyle = '#F1F6EC'; c.lineWidth = .9; c.beginPath();
    for (let i = 0; i < SPOUT_DROP.length; i++){ const [vx, vy] = SPOUT_DROP[i], x1 = 6.4 + vx * (1 + 2.4 * up), y1 = -3.2 - vy * 9 * up + 11 * fall * fall; c.moveTo(6.4 + vx * .4 * up, -3.2 - up * 1.2); c.quadraticCurveTo(6.4 + vx * (.4 + 1.4 * up), -3.2 - vy * 6 * up, x1, y1); }
    c.stroke();
    c.fillStyle = '#F1F6EC'; c.beginPath();
    for (let i = 0; i < SPOUT_DROP.length; i++){ const [vx, vy] = SPOUT_DROP[i], px = 6.4 + vx * (1.4 + 2.8 * up) + vx * fall * 1.6, py = -3.2 - vy * 9.6 * up + 12 * fall * fall; c.moveTo(px + .7, py); c.arc(px, py, .7, 0, TAU); }
    c.fill();
    c.globalAlpha = g * (1 - q) * .95; c.strokeStyle = '#9FB7C0'; c.lineWidth = .3; c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(6.4, -3.6 - 9.6 * up, 1.8 + q * 3.8, 1.1 + q * 1.7, 0, 0, TAU); c.moveTo(8.6 + q * 2, -4.8 - 8 * up); c.arc(7.6 + q * 2, -4.8 - 8 * up, 1.1 + q * 1.4, 0, TAU); c.fill(); c.stroke(); c.globalAlpha = g;
  }
}
/* the rings the whale leaves on the water: where it rose, along its way, and the splash and wide rings where it sank (world frame) */
function whaleRings(c, w, t, k){
  const at = s => w.x + w.dir * s * 3 * k, y = w.y + 1.4 * k;
  for (const s of [.2, .9, 1.6, 2.4]){ const age = (t - s) / 2.6; if (age > 0 && age < 1 && s < 4.6) stroke(c, ellipse(at(s), y, (2 + age * 13) * k, (.6 + age * 4) * k), FOAMC, .7, null, null, (1 - age) * .7); }
  const sx = at(5.6) - w.dir * 10 * k;
  if (t > 5.6){ for (let i = 0; i < 3; i++){ const age = (t - 5.6 - i * .35) / 2.2; if (age > 0 && age < 1) stroke(c, ellipse(sx, y, (2 + age * 16) * k, (.6 + age * 5) * k), FOAMC, .7, null, null, (1 - age) * .75); }
    splashAt(c, sx, y, (t - 5.6) / 1.1, k * 1.5, 7); }
}
