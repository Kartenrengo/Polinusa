'use strict';
/* The five knucklebones of Kōruru, as the Māori of Aotearoa later called the game; small bones or stones were played with
   across the Pacific. For now only the mat and the bones are kept here: they come back as the daily throw (see the plan). */
const BONE = new Path2D('M-9-4.6Q-6-7.4-2.4-5.4Q0-4.4 2.4-5.4Q6-7.4 9-4.6Q11 0 9 4.6Q6 7.4 2.4 5.4Q0 4.4-2.4 5.4Q-6 7.4-9 4.6Q-11 0-9-4.6Z');
/* a knucklebone: ivory, shaded like a small rounded thing in the sun, the two knobs at the ends */
function koruruBone(c, x, y, rot, s, alpha = 1){
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = alpha;
  const g = c.createRadialGradient(-3, -3, 1, 0, 0, 11); g.addColorStop(0, '#FBF5E6'); g.addColorStop(.6, '#EADFC4'); g.addColorStop(1, '#C9B48A');
  c.fillStyle = g; c.fill(BONE); c.strokeStyle = '#2B1D14'; c.lineWidth = 1.1; c.stroke(BONE);
  c.beginPath(); c.ellipse(-6.4, 0, 1.4, 2.6, 0, 0, Math.PI * 2); c.ellipse(6.4, 0, 1.4, 2.6, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(160,130,90,.35)'; c.fill();
  c.restore();
}
/* the mat: plaited pandanus strips, light and dark in turn, with a border of red-brown and the zigzag of Lapita pots */
function koruruMat(x){
  x.save(); x.beginPath(); x.rect(8, 8, 324, 214); x.clip();
  x.fillStyle = '#D9C28C'; x.fillRect(8, 8, 324, 214);
  for (let a = 0; a < 340; a += 14) for (let b = 0; b < 230; b += 14){ if (((a + b) / 14) % 2){ x.fillStyle = 'rgba(150,115,60,.18)'; x.fillRect(8 + a, 8 + b, 14, 14); } }
  x.strokeStyle = 'rgba(110,80,40,.28)'; x.lineWidth = 1; x.beginPath(); for (let a = 8; a < 340; a += 14){ x.moveTo(a, 8); x.lineTo(a, 222); } for (let b = 8; b < 230; b += 14){ x.moveTo(8, b); x.lineTo(332, b); } x.stroke();
  x.restore();
  x.lineWidth = 9; x.strokeStyle = '#8C4A2C'; x.strokeRect(12.5, 12.5, 315, 205);
  x.strokeStyle = '#F4ECD8'; x.lineWidth = 1.4; x.beginPath();
  for (let a = 18; a < 324; a += 8){ x.moveTo(a, 15); x.lineTo(a + 4, 10); x.lineTo(a + 8, 15); x.moveTo(a, 220); x.lineTo(a + 4, 215); x.lineTo(a + 8, 220); }
  for (let b = 18; b < 214; b += 8){ x.moveTo(15, b); x.lineTo(10, b + 4); x.lineTo(15, b + 8); x.moveTo(325, b); x.lineTo(330, b + 4); x.lineTo(325, b + 8); }
  x.stroke(); x.strokeStyle = '#2B1D14'; x.lineWidth = 1.2; x.strokeRect(8, 8, 324, 214); x.strokeRect(17, 17, 306, 196);
}
/* ---------- the daily throw. Once a day (the day of your device) the five bones are thrown like dice; each falls with one
   of four marks up: dot, cross, ring or lines. Once you may throw again the bones you choose. What lies there decides the
   gift: five alike brings a treasure and a diving chart, four alike standing, a full hand cooked food, three alike food,
   two pairs cord, a pair coconuts, and when nothing matches the ancestors stay silent. The gifts grow with the village. */
const KOR_SIDES = ['Punkt', 'Kreuz', 'Ring', 'Striche'];
const KOR_TABLE = [['Fünf gleich', '1 Perlmutt und eine Tauchkarte'], ['Vier gleich', 'Ansehen +3'], ['Volle Hand (3 + 2)', 'Gekochtes'], ['Drei gleich', 'Feldfrüchte'], ['Zwei Paare', 'Schnur'], ['Ein Paar', 'Kokosnüsse'], ['Nichts', '1 Kokosnuss']];
let kor = null;
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const korCanThrow = () => stats.korDay !== todayKey();
function korNew(){ kor = {bones:[0, 1, 2, 3, 4].map(i => ({side:i % 4, x:62 + i * 54, y:118, r:(i - 2) * .3, pick:false, t0:0, sx:170, sy:250})), rolls:0, state:'start', t0:performance.now(), msg:''}; }
function korRoll(only){
  const now = performance.now(); let k = 0;
  for (const b of kor.bones) if (!only || b.pick){
    b.sx = b.x; b.sy = only ? b.y : 250; b.side = Math.floor(Math.random() * 4); b.x = 50 + Math.random() * 240; b.y = 48 + Math.random() * 124; b.r = Math.random() * 6; b.pick = false; b.t0 = now + k++ * 70;
  }
  // keep them from lying on top of each other
  for (let n = 0; n < 24; n++) for (const a of kor.bones) for (const b of kor.bones) if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 46){ b.x = clamp(b.x + (b.x - a.x) * .35 + 5, 44, 296); b.y = clamp(b.y + (b.y - a.y) * .35 + 4, 44, 180); }
  kor.rolls++; kor.state = 'rolled'; kor.t0 = now; sfx('knock');
}
function korScore(){
  const n = [0, 0, 0, 0]; for (const b of kor.bones) n[b.side]++; const c = n.filter(x => x).sort((a, b) => b - a);
  const I = isl(active), m = Math.max(1, I ? I.lvl || 1 : 1);
  // which bones make the picture: the biggest group, and the second when it counts
  const order = [0, 1, 2, 3].sort((a, b) => n[b] - n[a]), best = new Set([order[0], ...(n[order[1]] >= 2 && n[order[0]] < 4 ? [order[1]] : [])]);
  const hit = kor.bones.map(b => n[b.side] >= 2 && best.has(b.side));
  if (c[0] === 5) return {t:'Fünf gleich!', get:{perlmutt:1}, chart:true, hit};
  if (c[0] === 4) return {t:'Vier gleich', mana:3, hit};
  if (c[0] === 3 && c[1] === 2) return {t:'Volle Hand', get:{speisen:m}, hit};
  if (c[0] === 3) return {t:'Drei gleich', get:{nahrung:2 * m}, hit};
  if (c[0] === 2 && c[1] === 2) return {t:'Zwei Paare', get:{schnur:3 * m}, hit};
  if (c[0] === 2) return {t:'Ein Paar', get:{kokos:m}, hit};
  return {t:'Nichts passt', get:{kokos:1}, hit};
}
const korGain = S => [S.get ? giftText(S.get) : '', S.mana ? `Ansehen +${S.mana}` : '', S.chart ? 'eine Tauchkarte' : ''].filter(Boolean).join(', ');
function korTake(){
  const I = isl(active), S = korScore(); if (!I || !I.settled) return;
  stats.korDay = todayKey(); stats.koruru = (stats.koruru || 0) + 1; kor.state = 'done'; for (const b of kor.bones) b.pick = false;
  const parts = [];
  if (S.get){ for (const [k, v] of Object.entries(S.get)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + v); parts.push(giftText(S.get)); }
  if (S.mana){ mana += S.mana; parts.push(`Ansehen +${S.mana}`); }
  if (S.chart){ const p = seaPoint(I.harbor); if (p){ addSpot(p, 3, 'Tauchkarte'); parts.push('eine Tauchkarte: Vor der Küste liegt ein reicher Tauchplatz'); } }
  kor.msg = `${S.t}${S.t === 'Nichts passt' ? '. Die Ahnen schweigen' : ''}: ${parts.join(', ')}.`; sfx('chronik'); updateHUD(); save();
}
function koruruMarkup(){
  if (!kor) korNew();
  const can = korCanThrow(), S = kor.state === 'rolled' ? korScore() : null, picks = kor.bones.filter(b => b.pick).length;
  const step = kor.state === 'start' ? 1 : kor.state === 'rolled' ? (kor.rolls < 2 ? 2 : 3) : 4;
  let h = head('Knöchelwurf', 'Fünf Knöchelchen, einmal am Tag.');
  h += `<ol class="kor-steps">${['Werfen', 'Antippen, neu werfen', 'Nehmen'].map((t, i) => `<li class="${step === i + 1 ? 'now' : step > i + 1 ? 'done' : ''}">${t}</li>`).join('')}</ol>`;
  h += `<canvas id="korC" class="kor" width="340" height="230" aria-label="Die Matte mit den Knochen"></canvas>`;
  if (!can && kor.state !== 'done') h += `<p class="sub">Heute ist schon geworfen. Morgen wieder.</p>`;
  else if (kor.state === 'start') h += `<div class="rowx"><span class="sub">Vier Zeichen: Punkt, Kreuz, Ring, Striche. Gleiche zählen.</span><button class="btn primary big" type="button" data-act="kthrow">Werfen</button></div>`;
  else if (kor.state === 'rolled') h += `<div class="kor-result"><b>${S.t}</b><span>bringt ${korGain(S)}</span></div><div class="rowx"><span class="sub">${kor.rolls < 2 ? (picks ? `${picks} markiert. Die werden neu geworfen.` : 'Tippe auf Knochen, die du neu werfen willst. Gold umrandet: die zählen gerade.') : 'Das war dein zweiter Wurf.'}</span><span class="chips">${kor.rolls < 2 ? `<button class="btn" type="button" data-act="kre"${picks ? '' : ' disabled'}>Neu werfen</button>` : ''}<button class="btn primary" type="button" data-act="ktake">Nehmen</button></span></div>`;
  else h += `<div class="kor-result"><b>${kor.msg}</b><span>Morgen wieder.</span></div>`;
  h += `<details class="more"><summary>Was bringt was?</summary><ul class="kor-table">${KOR_TABLE.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul><p class="sub">Die Gaben wachsen mit dem Dorf. Solche Spiele kannte der ganze Pazifik; die Māori nannten es viel später Kōruru.</p></details>`;
  return h;
}
function koruruMount(){
  const c = $('korC'); if (!c || !kor) return;
  const D = Math.min(window.devicePixelRatio || 1, 2); c.width = 340 * D; c.height = 230 * D;
  c.addEventListener('pointerdown', e => { if (kor.state !== 'rolled' || kor.rolls >= 2) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) * 340 / r.width, y = (e.clientY - r.top) * 230 / r.height;
    const b = kor.bones.reduce((m, q) => !m || Math.hypot(x - q.x, y - q.y) < Math.hypot(x - m.x, y - m.y) ? q : m, null); if (b && Math.hypot(x - b.x, y - b.y) < 32){ b.pick = !b.pick; sfx('knock'); renderSheet(); } });
  const id = kor.loop = (kor.loop || 0) + 1, loop = now => { if (sheetKind !== 'koruru' || !$('korC') || kor.loop !== id) return; korDraw($('korC'), D, now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
/* the mark on the upper side of a bone */
function korMark(x, side){
  x.strokeStyle = '#7A2E1C'; x.fillStyle = '#7A2E1C'; x.lineWidth = 1.6; x.lineCap = 'round'; x.beginPath();
  if (side === 0){ x.arc(0, 0, 2.2, 0, Math.PI * 2); x.fill(); return; }
  if (side === 1){ x.moveTo(-2.6, -2.6); x.lineTo(2.6, 2.6); x.moveTo(2.6, -2.6); x.lineTo(-2.6, 2.6); }
  else if (side === 2) x.arc(0, 0, 2.8, 0, Math.PI * 2);
  else { x.moveTo(-3.4, -1.8); x.lineTo(3.4, -1.8); x.moveTo(-3.4, 0); x.lineTo(3.4, 0); x.moveTo(-3.4, 1.8); x.lineTo(3.4, 1.8); }
  x.stroke();
}
function korDraw(cv, D, now){
  const x = cv.getContext('2d'); x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, 340, 230); koruruMat(x);
  const S = kor.state === 'rolled' ? korScore() : null, still = kor.state !== 'rolled' || kor.bones.every(b => now - b.t0 > 650);
  kor.bones.forEach((b, i) => {
    const f = kor.state === 'start' ? 1 : clamp((now - b.t0) / 600, 0, 1), e = 1 - (1 - f) * (1 - f), hop = Math.sin(f * Math.PI) * 46 + (f > .8 ? Math.sin((f - .8) * 5 * Math.PI) * 3 : 0);
    const px = b.sx + (b.x - b.sx) * e, py = b.sy + (b.y - b.sy) * e - hop, lift = b.pick ? 6 : 0;
    x.fillStyle = `rgba(31,20,13,${.25 - hop / 400})`; x.beginPath(); x.ellipse(b.sx + (b.x - b.sx) * e + 2, b.sy + (b.y - b.sy) * e + 8, 14 - hop / 8, 4.5, 0, 0, Math.PI * 2); x.fill();
    if (f >= 1 && S && S.hit[i] && still){ x.save(); x.shadowColor = '#F3C14A'; x.shadowBlur = 14; x.strokeStyle = '#E0A63A'; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py - lift, 24, 15, b.r * .2, 0, Math.PI * 2); x.stroke(); x.restore(); }
    koruruBone(x, px, py - lift, b.r + (1 - f) * 9, 2.3);
    if (f >= 1 || kor.state === 'start'){ x.save(); x.translate(px, py - lift); x.scale(1.3, 1.3); korMark(x, b.side); x.restore(); }
    if (b.pick){ x.strokeStyle = '#A84A2C'; x.setLineDash([4, 3]); x.lineWidth = 2.4; x.beginPath(); x.ellipse(px, py - lift, 26, 17, 0, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
  });
  if (kor.state === 'done'){ x.fillStyle = 'rgba(43,29,20,.55)'; x.fillRect(17, 92, 306, 46); x.fillStyle = '#F4ECD8'; x.font = '800 20px Alegreya, Georgia, serif'; x.textAlign = 'center'; x.fillText(korScore().t, 170, 122); }
}
