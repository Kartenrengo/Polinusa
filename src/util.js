'use strict';
/* Helpers used by every file. All files are plain scripts that share one global scope,
   so the game also runs straight from disk (file://) without a build step. */

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fx = v => Math.round(v * 10) / 10;

/* Seeded random numbers (mulberry32): the same seed always gives the same world */
function rng(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(r, arr){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- geometry */
function smooth(pts){
  const n = pts.length, m = [];
  for (let i = 0; i < n; i++){ const a = pts[i], b = pts[(i + 1) % n]; m.push({x:(a.x + b.x) / 2, y:(a.y + b.y) / 2}); }
  let d = `M${fx(m[n-1].x)} ${fx(m[n-1].y)}`; const poly = []; let prev = m[n-1];
  for (let i = 0; i < n; i++){
    const c = pts[i], e = m[i];
    d += `Q${fx(c.x)} ${fx(c.y)} ${fx(e.x)} ${fx(e.y)}`;
    for (let k = 1; k <= 6; k++){ const t = k / 6, u = 1 - t; poly.push({x:u*u*prev.x + 2*u*t*c.x + t*t*e.x, y:u*u*prev.y + 2*u*t*c.y + t*t*e.y}); }
    prev = e;
  }
  return {d: d + 'Z', poly};
}
/* A Catmull-Rom curve through pts, sampled; the first and last point only steer the ends */
function spline(pts, k = 6){
  const out = [];
  for (let i = 1; i < pts.length - 2; i++){
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    for (let j = 0; j < k; j++){
      const t = j / k, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push({x:f(p0.x, p1.x, p2.x, p3.x), y:f(p0.y, p1.y, p2.y, p3.y)});
    }
  }
  out.push({...pts[pts.length - 2]}); return out;
}
function smoothOpen(pts){
  const n = pts.length; let d = `M${fx(pts[0].x)} ${fx(pts[0].y)}`;
  if (n === 2) return d + `L${fx(pts[1].x)} ${fx(pts[1].y)}`;
  for (let i = 1; i < n - 1; i++){
    const c = pts[i], e = i === n - 2 ? pts[n - 1] : {x:(c.x + pts[i + 1].x) / 2, y:(c.y + pts[i + 1].y) / 2};
    d += `Q${fx(c.x)} ${fx(c.y)} ${fx(e.x)} ${fx(e.y)}`;
  }
  return d;
}
function scallop(pts, sweep, k){
  let d = `M${fx(pts[0].x)} ${fx(pts[0].y)}`;
  for (let i = 1; i <= pts.length; i++){ const a = pts[i-1], b = pts[i % pts.length]; const r = Math.hypot(b.x - a.x, b.y - a.y) * k; d += `A${fx(r)} ${fx(r)} 0 0 ${sweep} ${fx(b.x)} ${fx(b.y)}`; }
  return d + 'Z';
}
function ring(cx, cy, rx, ry, n, seed, jitter){
  const r = rng(seed), p = [];
  for (let i = 0; i < n; i++){ const a = i / n * TAU, j = 1 + (r() - .5) * jitter; p.push({x:cx + Math.cos(a) * rx * j, y:cy + Math.sin(a) * ry * j}); }
  return p;
}
function inPoly(p, poly){ let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) ins = !ins; } return ins; }
function segDist(p, a, b){ const dx = b.x - a.x, dy = b.y - a.y, l = dx*dx + dy*dy; const t = l ? clamp(((p.x - a.x)*dx + (p.y - a.y)*dy) / l, 0, 1) : 0; return Math.hypot(p.x - a.x - t*dx, p.y - a.y - t*dy); }
function polyDist(p, poly, closed = true){ let m = Infinity; const n = poly.length; for (let i = 0; i < (closed ? n : n - 1); i++) m = Math.min(m, segDist(p, poly[i], poly[(i + 1) % n])); return m; }
function nearestOn(poly, p){ let best = poly[0], bd = Infinity; for (const q of poly){ const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd){ bd = d; best = q; } } return best; }
function polyBox(poly, pad = 0){ const b = {x0:Infinity, y0:Infinity, x1:-Infinity, y1:-Infinity}; for (const p of poly){ b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y); b.x1 = Math.max(b.x1, p.x); b.y1 = Math.max(b.y1, p.y); } b.x0 -= pad; b.y0 -= pad; b.x1 += pad; b.y1 += pad; return b; }

/* A quadratic curve A → B bent through C, sampled so boats can move along it by distance */
function curve(A, C, B, n = 40){
  const pts = [], cum = [0];
  for (let i = 0; i <= n; i++){
    const t = i / n, u = 1 - t; pts.push({x:u*u*A.x + 2*u*t*C.x + t*t*B.x, y:u*u*A.y + 2*u*t*C.y + t*t*B.y});
    if (i) cum.push(cum[i-1] + Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y));
  }
  return {pts, cum, len:cum[n], d:`M${fx(A.x)} ${fx(A.y)}Q${fx(C.x)} ${fx(C.y)} ${fx(B.x)} ${fx(B.y)}`};
}
function curveAt(cv, s){
  const L = clamp(s, 0, 1) * cv.len, c = cv.cum; let lo = 0, hi = c.length - 1;
  while (hi - lo > 1){ const m = (lo + hi) >> 1; if (c[m] < L) lo = m; else hi = m; }
  const a = cv.pts[lo], b = cv.pts[hi], t = c[hi] > c[lo] ? (L - c[lo]) / (c[hi] - c[lo]) : 0;
  return {x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t};
}
