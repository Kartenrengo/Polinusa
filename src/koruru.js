'use strict';
/* The five knucklebones of Kōruru, as the Māori of Aotearoa later called the game; small bones or stones were played with
   across the Pacific. For now only the mat and the bones are kept here: they come back as the daily throw (see the plan). */
const BONE = new Path2D('M-9-4.6Q-6-7.4-2.4-5.4Q0-4.4 2.4-5.4Q6-7.4 9-4.6Q11 0 9 4.6Q6 7.4 2.4 5.4Q0 4.4-2.4 5.4Q-6 7.4-9 4.6Q-11 0-9-4.6Z');
function koruruBone(c, x, y, rot, s, alpha = 1){
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = alpha;
  c.fillStyle = '#EADFC4'; c.fill(BONE); c.strokeStyle = '#2B1D14'; c.lineWidth = 1.2; c.stroke(BONE);
  c.beginPath(); c.ellipse(-3.6, 0, 1.6, 2.4, 0, 0, Math.PI * 2); c.ellipse(3.6, 0, 1.6, 2.4, 0, 0, Math.PI * 2); c.fillStyle = '#C9B48A'; c.fill();
  c.restore();
}
/* the mat of plaited pandanus, 340 × 230 */
function koruruMat(x){
  // the mat of plaited pandanus
  x.fillStyle = '#D8C08A'; x.fillRect(8, 8, 324, 214); x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 1;
  x.beginPath(); for (let i = -230; i < 340; i += 12){ x.moveTo(8 + i, 8); x.lineTo(8 + i + 214, 222); x.moveTo(8 + i + 214, 8); x.lineTo(8 + i, 222); } x.save(); x.beginPath(); x.rect(8, 8, 324, 214); x.clip();
  x.beginPath(); for (let i = -230; i < 340; i += 12){ x.moveTo(8 + i, 8); x.lineTo(8 + i + 214, 222); x.moveTo(8 + i + 214, 8); x.lineTo(8 + i, 222); } x.stroke(); x.restore();
  x.strokeStyle = '#6B5030'; x.lineWidth = 2; x.strokeRect(8, 8, 324, 214);
}
/* ---------- the daily throw. Once a day (the day of your device) the five bones are thrown like dice; each falls on one
   of its four sides. Once you may throw again the bones you choose. What lies there decides the gift: five alike brings a
   treasure and a diving chart, four alike standing, a full hand cooked food, three alike food, two pairs cord, a pair
   coconuts, and when nothing matches the ancestors stay silent. The gifts grow with the village, but stay small. */
const KOR_SIDES = ['Rücken', 'Bauch', 'Kante', 'Mulde'];
let kor = null;
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const korCanThrow = () => stats.korDay !== todayKey();
function korNew(){ kor = {bones:[0, 1, 2, 3, 0].map((s, i) => ({side:Math.floor(Math.random() * 4), x:60 + i * 55, y:110, r:Math.random() * 3, pick:false})), rolls:0, state:'start', t0:performance.now(), msg:''}; }
function korRoll(only){
  for (const b of kor.bones) if (!only || b.pick){ b.side = Math.floor(Math.random() * 4); b.x = 44 + Math.random() * 252; b.y = 46 + Math.random() * 120; b.r = Math.random() * 6; b.pick = false; }
  // keep them from lying on top of each other
  for (let k = 0; k < 20; k++) for (const a of kor.bones) for (const b of kor.bones) if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 40){ b.x = clamp(b.x + (b.x - a.x) * .3 + 6, 36, 304); b.y = clamp(b.y + (b.y - a.y) * .3 + 4, 40, 176); }
  kor.rolls++; kor.state = 'rolled'; kor.t0 = performance.now(); sfx('knock');
}
function korScore(){
  const n = [0, 0, 0, 0]; for (const b of kor.bones) n[b.side]++; const c = n.filter(x => x).sort((a, b) => b - a);
  const I = isl(active), m = Math.max(1, I ? I.lvl || 1 : 1);
  if (c[0] === 5) return {t:'Fünf gleich!', get:{perlmutt:1}, chart:true};
  if (c[0] === 4) return {t:'Vier gleich', mana:3};
  if (c[0] === 3 && c[1] === 2) return {t:'Volle Hand', get:{speisen:3 * m}};
  if (c[0] === 3) return {t:'Drei gleich', get:{nahrung:5 * m}};
  if (c[0] === 2 && c[1] === 2) return {t:'Zwei Paare', get:{schnur:3 * m}};
  if (c[0] === 2) return {t:'Ein Paar', get:{kokos:3 * m}};
  return {t:'Nichts passt. Die Ahnen schweigen', get:{kokos:1}};
}
function korTake(){
  const I = isl(active), S = korScore(); if (!I || !I.settled) return;
  stats.korDay = todayKey(); stats.koruru = (stats.koruru || 0) + 1; kor.state = 'done';
  const parts = [];
  if (S.get){ for (const [k, v] of Object.entries(S.get)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + v); parts.push(giftText(S.get)); }
  if (S.mana){ mana += S.mana; parts.push(`Ansehen +${S.mana}`); }
  if (S.chart){ const p = seaPoint(I.harbor); if (p){ addSpot(p, 3, 'Tauchkarte'); parts.push('eine Tauchkarte: Vor der Küste liegt ein reicher Tauchplatz'); } }
  kor.msg = `${S.t}: ${parts.join(', ')}.`; sfx('chronik'); updateHUD(); save();
}
function koruruMarkup(){
  if (!kor) korNew();
  const can = korCanThrow(), S = kor.state === 'rolled' ? korScore() : null, picks = kor.bones.filter(b => b.pick).length;
  let h = head('Kōruru-Wurf', 'Fünf Knöchelchen, einmal am Tag');
  h += `<canvas id="korC" class="kor" width="340" height="230" aria-label="Die Matte mit den Knochen"></canvas>`;
  if (!can && kor.state !== 'done') h += `<p class="sub">Heute ist schon geworfen. Morgen wieder.</p>`;
  else if (kor.state === 'start') h += `<div class="rowx"><span class="sub">Wirf die fünf Knochen. Gleiche Seiten bringen Gaben.</span><button class="btn primary" type="button" data-act="kthrow">Werfen</button></div>`;
  else if (kor.state === 'rolled') h += `<p class="sub"><b>${S.t}.</b> ${kor.rolls < 2 ? 'Tippe Knochen an, die du neu werfen willst.' : ''}</p><div class="rowx"><span></span><span class="chips">${kor.rolls < 2 ? `<button class="btn" type="button" data-act="kre"${picks ? '' : ' disabled'}>Neu werfen (${picks})</button>` : ''}<button class="btn primary" type="button" data-act="ktake">Nehmen</button></span></div>`;
  else h += `<p class="sub"><b>${kor.msg}</b> Morgen wieder.</p>`;
  return h;
}
function koruruMount(){
  const c = $('korC'); if (!c || !kor) return;
  const D = Math.min(window.devicePixelRatio || 1, 2); c.width = 340 * D; c.height = 230 * D;
  c.addEventListener('pointerdown', e => { if (kor.state !== 'rolled' || kor.rolls >= 2) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) * 340 / r.width, y = (e.clientY - r.top) * 230 / r.height;
    const b = kor.bones.reduce((m, q) => !m || Math.hypot(x - q.x, y - q.y) < Math.hypot(x - m.x, y - m.y) ? q : m, null); if (b && Math.hypot(x - b.x, y - b.y) < 30){ b.pick = !b.pick; renderSheet(); } });
  const id = kor.loop = (kor.loop || 0) + 1, loop = now => { if (sheetKind !== 'koruru' || !$('korC') || kor.loop !== id) return; korDraw($('korC'), D, now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function korDraw(cv, D, now){
  const x = cv.getContext('2d'); x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, 340, 230); koruruMat(x);
  const f = Math.min(1, (now - kor.t0) / 500);
  for (const b of kor.bones){
    const fly = kor.state === 'start' ? 0 : 1 - f, px = b.x + (170 - b.x) * fly, py = b.y + (215 - b.y) * fly - Math.sin(f * Math.PI) * 30 * (kor.state === 'start' ? 0 : 1);
    x.fillStyle = 'rgba(31,20,13,.22)'; x.beginPath(); x.ellipse(px + 2, py + 7, 12, 4, 0, 0, Math.PI * 2); x.fill();
    koruruBone(x, px, py, b.r + fly * 6, 1.6);
    // the side it lies on, as dots: one to four
    if (kor.state !== 'start' && f >= 1){ x.fillStyle = '#2B1D14'; for (let i = 0; i <= b.side; i++){ x.beginPath(); x.arc(px - 7.5 + i * 5, py + 15, 1.8, 0, Math.PI * 2); x.fill(); } }
    if (b.pick){ x.strokeStyle = '#A84A2C'; x.lineWidth = 2.6; x.beginPath(); x.arc(px, py, 20, 0, Math.PI * 2); x.stroke(); }
  }
}
