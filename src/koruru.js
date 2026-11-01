'use strict';
/* Kōruru, the game of the five knucklebones, as the Māori of Aotearoa later called it; games of five small bones or
   stones were played across the Pacific. The bones fall from the hand onto the mat like dice; then one is thrown up,
   and before it comes down the same hand must pick up bones from the mat and catch it again. Ones, twos, threes, fours:
   each round asks for more at once, and the bone flies a little shorter. Three misses and the game is lost. */
const KOR_AIR = [1750, 1600, 1450, 1300];   // how long the thrown bone is in the air in each round, in ms
const KOR_CATCH = .68;                      // from this share of the flight on it can be caught
let kor = null;

function koruruNew(){
  kor = {round:1, lives:3, state:'scatter', t0:performance.now(), bones:[], picked:[], msg:'Die Knochen fallen auf die Matte.', won:false, raf:0};
  koruruScatter();
}
/* the bones fall from the hand like dice: where they land is luck, how you pick them up is skill */
function koruruScatter(){
  const W = 340, H = 230, out = [];
  for (let i = 0; i < 4; i++){
    for (let k = 0; k < 40; k++){
      const p = {x:40 + Math.random() * (W - 80), y:30 + Math.random() * (H - 110), r:Math.random() * Math.PI, side:Math.floor(Math.random() * 4)};
      if (out.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 42)){ out.push(p); break; }
      if (k === 39) out.push(p);
    }
  }
  kor.bones = out.map(p => ({...p, sx:W / 2, sy:H - 20}));
  kor.picked = []; kor.state = 'scatter'; kor.t0 = performance.now();
}
const koruruNeed = () => Math.min(kor.round, kor.bones.length);
function koruruThrow(){
  if (!kor || kor.state !== 'ready') return;
  kor.state = 'air'; kor.t0 = performance.now(); kor.picked = [];
  kor.msg = `Hebe ${koruruNeed() === 1 ? 'einen Knochen' : `${koruruNeed()} Knochen`} auf, dann fange den Werfer!`;
  koruruText();
}
function koruruFail(why){
  kor.lives--; sfx('knock');
  if (kor.lives <= 0){ kor.state = 'over'; kor.msg = `${why} Das Spiel ist verloren, in Runde ${kor.round}.`; koruruText(); return; }
  kor.msg = `${why} Noch ${kor.lives === 1 ? 'ein Versuch' : `${kor.lives} Versuche`}. Die Knochen werden neu geworfen.`;
  koruruText(); koruruScatter();
}
function koruruCatch(){
  const need = koruruNeed();
  if (kor.picked.length < need){ koruruFail(`Gefangen, aber zu wenig aufgehoben: ${kor.picked.length} von ${need}.`); return; }
  kor.bones = kor.bones.filter(b => !kor.picked.includes(b)); kor.picked = []; sfx('shells');
  if (kor.bones.length){ kor.state = 'ready'; kor.msg = `Gefangen! Noch ${kor.bones.length} auf der Matte.`; koruruText(); return; }
  if (kor.round >= 4){ koruruWin(); return; }
  kor.round++; kor.msg = `Runde ${kor.round}: jetzt ${kor.round === 2 ? 'zwei' : kor.round === 3 ? 'drei' : 'vier'} auf einmal.`; koruruText(); koruruScatter();
}
function koruruWin(){
  kor.state = 'over'; kor.won = true; stats.koruru = (stats.koruru || 0) + 1; sfx('chronik');
  const I = isl(active), moon = yearOf() * 12 + moonOf();
  if (stats.koruruMoon !== moon && I && I.settled){
    stats.koruruMoon = moon; mana += 2; I.joyUntil = Math.max(I.joyUntil || 0, tick + 20);
    kor.msg = `Gewonnen! Alle vier Runden. Das Dorf jubelt: Ansehen +2, und eine Weile ziehen doppelt so viele zu.`;
  } else kor.msg = 'Gewonnen! In diesem Mond bringt es nur noch die Ehre.';
  koruruText(); updateHUD(); save();
}
function koruruTap(x, y){
  if (!kor) return;
  if (kor.state !== 'air') return;
  const f = (performance.now() - kor.t0) / KOR_AIR[kor.round - 1], th = koruruThrown(f);
  // whichever is nearer to the finger: a bone on the mat, or the thrown one (caught only as it comes down into the hand)
  const free = kor.bones.filter(q => !kor.picked.includes(q)), b = free.reduce((m, q) => !m || Math.hypot(x - q.x, y - q.y) < Math.hypot(x - m.x, y - m.y) ? q : m, null);
  const dB = b ? Math.hypot(x - b.x, y - b.y) : Infinity, dT = Math.hypot(x - th.x, y - th.y);
  if (dT < 30 && dT <= dB){ if (f < KOR_CATCH){ koruruFail('Zu früh gegriffen, der Knochen ist dir aus der Hand gesprungen.'); return; } koruruCatch(); return; }
  if (!b || dB > 24) return;
  if (kor.picked.length >= koruruNeed()){ koruruFail('Zu viele auf einmal gegriffen.'); return; }
  kor.picked.push(b); sfx('knock');
}
/* where the thrown bone is: up from the hand and back down */
const koruruThrown = f => ({x:170 + Math.sin(f * Math.PI) * 6, y:212 - Math.sin(Math.min(1, f) * Math.PI) * 170, h:Math.sin(Math.min(1, f) * Math.PI)});

function koruruMarkup(){
  if (!kor) koruruNew();
  return head('Kōruru', 'Fünf Knöchelchen, ein Spiel aus dem ganzen Pazifik') +
    `<p class="sub">Hochwerfen, dann die richtige Zahl Knochen antippen und fangen, wenn der Ring es zeigt. Runde 1 je einen, dann zwei, drei, vier. Drei Fehler beenden das Spiel.</p>` +
    `<canvas id="korC" class="kor" width="340" height="230" aria-label="Die Matte mit den Knochen"></canvas>` +
    `<div class="rowx"><span class="sub" id="korMsg" role="status"></span></div>` +
    `<div class="rowx"><span class="sub" id="korState"></span><span class="chips"><button class="btn" type="button" data-act="knew">Neues Spiel</button><button class="btn primary" type="button" data-act="kthrow" id="korThrow">Hochwerfen</button></span></div>`;
}
function koruruText(){
  const m = $('korMsg'), s = $('korState'), t = $('korThrow'); if (!m || !kor) return;
  m.textContent = kor.msg; s.textContent = `Runde ${kor.round} von 4 · ${'●'.repeat(kor.lives)}${'○'.repeat(3 - kor.lives)}`;
  t.disabled = kor.state !== 'ready';
}
function koruruMount(){
  const c = $('korC'); if (!c) return;
  const D = Math.min(window.devicePixelRatio || 1, 2); c.width = 340 * D; c.height = 230 * D;
  c.addEventListener('pointerdown', e => { const r = c.getBoundingClientRect(); koruruTap((e.clientX - r.left) * 340 / r.width, (e.clientY - r.top) * 230 / r.height); e.preventDefault(); });
  koruruText();
  cancelAnimationFrame(kor.raf);
  const loop = now => { if (sheetKind !== 'koruru' || !$('korC')){ return; } koruruStep(now); koruruDraw(c, D, now); kor.raf = requestAnimationFrame(loop); };
  kor.raf = requestAnimationFrame(loop);
}
function koruruStep(now){
  if (kor.state === 'scatter' && now - kor.t0 > 700){ kor.state = 'ready'; if (!/Gefangen|Runde|verloren|Versuch/.test(kor.msg)) kor.msg = 'Tippe auf „Hochwerfen“.'; koruruText(); }
  if (kor.state === 'air' && now - kor.t0 > KOR_AIR[kor.round - 1]) koruruFail('Der Knochen ist auf die Matte gefallen.');
}
const BONE = new Path2D('M-9-4.6Q-6-7.4-2.4-5.4Q0-4.4 2.4-5.4Q6-7.4 9-4.6Q11 0 9 4.6Q6 7.4 2.4 5.4Q0 4.4-2.4 5.4Q-6 7.4-9 4.6Q-11 0-9-4.6Z');
function koruruBone(c, x, y, rot, s, alpha = 1){
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = alpha;
  c.fillStyle = '#EADFC4'; c.fill(BONE); c.strokeStyle = '#2B1D14'; c.lineWidth = 1.2; c.stroke(BONE);
  c.beginPath(); c.ellipse(-3.6, 0, 1.6, 2.4, 0, 0, Math.PI * 2); c.ellipse(3.6, 0, 1.6, 2.4, 0, 0, Math.PI * 2); c.fillStyle = '#C9B48A'; c.fill();
  c.restore();
}
function koruruDraw(c, D, now){
  const x = c.getContext('2d'); x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, 340, 230);
  // the mat of plaited pandanus
  x.fillStyle = '#D8C08A'; x.fillRect(8, 8, 324, 214); x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 1;
  x.beginPath(); for (let i = -230; i < 340; i += 12){ x.moveTo(8 + i, 8); x.lineTo(8 + i + 214, 222); x.moveTo(8 + i + 214, 8); x.lineTo(8 + i, 222); } x.save(); x.beginPath(); x.rect(8, 8, 324, 214); x.clip();
  x.beginPath(); for (let i = -230; i < 340; i += 12){ x.moveTo(8 + i, 8); x.lineTo(8 + i + 214, 222); x.moveTo(8 + i + 214, 8); x.lineTo(8 + i, 222); } x.stroke(); x.restore();
  x.strokeStyle = '#6B5030'; x.lineWidth = 2; x.strokeRect(8, 8, 324, 214);
  // the bones on the mat; while they fall they fly from the hand
  const sc = kor.state === 'scatter' ? Math.min(1, (now - kor.t0) / 600) : 1;
  for (const b of kor.bones){
    const px = b.sx + (b.x - b.sx) * sc, py = b.sy + (b.y - b.sy) * sc - Math.sin(sc * Math.PI) * 40;
    x.fillStyle = 'rgba(31,20,13,.22)'; x.beginPath(); x.ellipse(px + 2, py + 6, 10, 3.6, 0, 0, Math.PI * 2); x.fill();
    koruruBone(x, px, py, b.r + (1 - sc) * 6, 1.3, kor.picked.includes(b) ? .35 : 1);
    if (kor.picked.includes(b)){ x.strokeStyle = '#3E7A3A'; x.lineWidth = 2.4; x.beginPath(); x.arc(px, py, 17, 0, Math.PI * 2); x.stroke(); }
  }
  // the hand, and the thrown bone above it
  x.fillStyle = '#9B6A45'; x.strokeStyle = '#2B1D14'; x.lineWidth = 1.4;
  x.beginPath(); x.ellipse(170, 222, 26, 12, 0, Math.PI, 0); x.fill(); x.stroke();
  for (let i = -2; i <= 2; i++){ x.beginPath(); x.ellipse(170 + i * 9, 209 + Math.abs(i) * 2, 4, 7, i * .15, 0, Math.PI * 2); x.fill(); x.stroke(); }
  const f = kor.state === 'air' ? (now - kor.t0) / KOR_AIR[kor.round - 1] : 0, th = koruruThrown(f);
  if (kor.state === 'air'){
    x.fillStyle = 'rgba(31,20,13,.2)'; x.beginPath(); x.ellipse(170, 214, 9 - th.h * 4, 3, 0, 0, Math.PI * 2); x.fill();
    if (f >= KOR_CATCH){ x.strokeStyle = '#A84A2C'; x.lineWidth = 3; x.beginPath(); x.arc(th.x, th.y, 22, 0, Math.PI * 2); x.stroke(); }
    koruruBone(x, th.x, th.y, now / 120, 1.4 + th.h * .5);
    const need = koruruNeed(); x.fillStyle = '#2B1D14'; x.font = '800 15px "Alegreya Sans", sans-serif'; x.textAlign = 'right'; x.fillText(`${kor.picked.length} / ${need}`, 322, 30);
  } else if (kor.state !== 'over') koruruBone(x, 170, 204, 0, 1.3);
  if (kor.state === 'over'){ x.fillStyle = 'rgba(43,29,20,.55)'; x.fillRect(8, 80, 324, 60); x.fillStyle = '#F4ECD8'; x.font = '800 22px Alegreya, Georgia, serif'; x.textAlign = 'center'; x.fillText(kor.won ? 'Gewonnen!' : 'Verloren', 170, 118); }
}
