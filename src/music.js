'use strict';
/* ---------- the soundtrack. Made in the browser, no sound files, like the rest of the sound. It follows the life of the
   village: calm in the morning, a working rhythm by day, slow in the evening, almost silent at night; quick drums at a
   feast, stamping for the rain dance, a deep drone before a storm, a wide open sound on a voyage. The year changes the
   key, the size of the village the number of voices. Only after the great voyage, in Hawaiki, a nose flute joins in.
   What it is made of: a hollow log drum, bamboo tubes stamped on the ground, rattles of seed pods, humming voices.
   Music of the Lapita time has not come down to us; these instruments are known from Melanesia and Polynesia, much later.
   The notes of a bar come from a pure function (musicBar), so they can be tested without sound. */

const SCALES = {major:[0, 2, 4, 7, 9], minor:[0, 3, 5, 7, 10], lydian:[0, 2, 4, 6, 7, 9, 11]};
const SEASON_KEY = {plejaden:{root:62, scale:'major'}, sturm:{root:59, scale:'minor'}, passat:{root:64, scale:'major'}, mager:{root:57, scale:'minor'}};
const freqOf = m => 440 * Math.pow(2, (m - 69) / 12);
/* a note of a scale by degree, counted up and down over the octaves */
const noteOf = (root, scale, deg) => { const S = SCALES[scale], n = S.length, o = Math.floor(deg / n); return root + o * 12 + S[((deg % n) + n) % n]; };
const MUSIC_BEATS = 4;   // a bar is four beats, eight slots of an eighth

/* what the music plays now, from the state of the game */
function musicMood(S){
  const dark = S.night && (S.phase > .66 || S.phase < .03);
  const part = dark ? 'night' : S.phase < .25 ? 'morning' : S.phase < .5 ? 'day' : 'evening';
  const base = {
    // the life of every day is the surf: waves that come in, break and run back, and under them a few soft voices and now
    // and then one wooden note. No drums: they are kept for the feast and the rain dance.
    night:{bpm:36, pulse:0, tubes:0, rattle:0, hum:0, mel:0, level:.5, surf:.8},
    morning:{bpm:40, pulse:0, tubes:0, rattle:0, hum:1, mel:.08, level:.55, surf:1},
    day:{bpm:44, pulse:0, tubes:0, rattle:0, hum:1, mel:.14, level:.6, surf:1},
    evening:{bpm:40, pulse:0, tubes:0, rattle:0, hum:1, mel:.1, level:.55, surf:1}
  }[part];
  const key = SEASON_KEY[S.season] || SEASON_KEY.passat;
  const M = {part, ...base, root:key.root, scale:key.scale, drone:0, flute:false, mode:'life'};
  if (S.season === 'mager'){ M.mel *= .6; M.tubes *= .7; }
  if (S.season === 'sturm') M.surf *= 1.25;   // a heavier sea in the storm months
  if (M.hum) M.hum = clamp(M.hum + (S.pop >= 30 ? 1 : 0) + (S.pop >= 50 ? 1 : 0), 1, 3);
  if (S.hawaiki && part !== 'night') M.flute = true;
  if (S.voyage){ Object.assign(M, {mode:'voyage', scale:'lydian', bpm:44, pulse:0, tubes:0, rattle:0, mel:.12, hum:2, level:.55, surf:.7, flute:S.hawaiki}); }
  if (S.rainDance){ Object.assign(M, {mode:'rain', scale:'minor', bpm:92, pulse:.7, tubes:.9, rattle:.5, mel:.1, hum:1, level:.75, surf:.6, flute:false}); }
  if (S.feast){ Object.assign(M, {mode:'feast', scale:'major', bpm:104, pulse:.9, tubes:.7, rattle:.7, mel:.5, hum:2, level:.8, surf:.5, flute:false}); }
  if (S.storm){ Object.assign(M, {mode:'storm', scale:'minor', bpm:40, pulse:0, tubes:0, rattle:0, mel:0, hum:0, drone:1, level:.8, surf:1.7, flute:false}); }
  return M;
}
const DRUMPAT = {
  base:[1, 0, 0, .6, 0, 0, .5, 0],
  feast:[1, 0, .5, 1, 0, .5, .7, 0],
  storm:[1, 0, 0, 0, .8, 0, 0, 0],
  voyage:[.8, 0, 0, 0, 0, 0, 0, 0]
};
const TUBEPAT = [1, 0, 0, 0, .8, 0, 0, .5];
const CHORDS = [0, 3, 1, 2];   // the chords of the humming voices, as degrees of the scale, two bars each
/* the notes of one bar: [{at (in beats), k (the instrument), f (Hz), v (loudness), d (length in beats)}]. rnd is a random
   function (so tests can fix it), st the memory of the melody between bars. */
function musicBar(M, bar, rnd, st){
  const ev = [], slot = i => i * .5, V = M.level, sc = M.scale, R = M.root;
  const hit = (p) => rnd() < p;
  // the log drum
  if (M.pulse > .05){ const pat = M.mode === 'feast' || M.mode === 'rain' ? DRUMPAT.feast : M.mode === 'storm' ? DRUMPAT.storm : M.mode === 'voyage' ? DRUMPAT.voyage : DRUMPAT.base;
    pat.forEach((a, i) => { if (a && (a > .9 || hit(M.pulse + .2))) ev.push({at:slot(i), k:'drum', f:a > .8 ? 118 : 178, v:.2 * a * M.pulse * V, d:.4}); }); }
  // bamboo tubes stamped on the ground, low notes of the scale
  if (M.tubes > .05) TUBEPAT.forEach((a, i) => { if (a && hit(M.tubes)){ ev.push({at:slot(i), k:'tube', f:freqOf(noteOf(R, sc, i % 3 === 0 ? 0 : -2)), v:.2 * a * V, d:.3}); } });
  // rattles of seed pods on the off-beats, at a feast on every slot
  if (M.rattle > .05) for (let i = 0; i < 8; i++){ if ((i % 2 || M.mode === 'feast') && hit(M.rattle * (M.mode === 'feast' ? .85 : .6))) ev.push({at:slot(i), k:'rattle', f:5200, v:.045 * V, d:.06}); }
  // the humming voices: a chord for two bars, a voice more for each step the village has grown
  if (M.hum > 0 && bar % 2 === 0){ const deg = CHORDS[(bar / 2 | 0) % CHORDS.length];
    for (let j = 0; j < M.hum; j++) ev.push({at:0, k:'hum', f:freqOf(noteOf(R + 12, sc, deg + [0, 2, 4, 7][j]) - (j > 2 ? 12 : 0)), v:.05 * V / Math.sqrt(M.hum), d:MUSIC_BEATS * 2}); }
  // the drone before a storm
  if (M.drone && bar % 2 === 0) ev.push({at:0, k:'drone', f:freqOf(R - 24), v:.16 * V, d:MUSIC_BEATS * 2});
  // a melody that wanders over the scale: few notes, mostly steps
  if (M.mel > .03){ const n = Math.round(M.mel * 5 * (.6 + rnd() * .8)), used = new Set();
    for (let k = 0; k < n; k++){ let i = Math.floor(rnd() * 8); if (used.has(i)) continue; used.add(i);
      st.deg = clamp(st.deg + (rnd() < .5 ? -1 : 1) * (rnd() < .3 ? 2 : 1), 2, 11);
      ev.push({at:slot(i), k:M.mode === 'voyage' ? 'hum' : 'mel', f:freqOf(noteOf(R + 12, sc, st.deg)), v:.09 * V, d:M.mode === 'voyage' ? 3 : 1.4}); } }
  // the nose flute of the later time: one long, soft note now and then
  if (M.flute && hit(.55)){ st.deg = clamp(st.deg + (rnd() < .5 ? -2 : 1), 3, 10); ev.push({at:slot(Math.floor(rnd() * 4)), k:'flute', f:freqOf(noteOf(R + 12, sc, st.deg)), v:.1 * V, d:3}); }
  return ev.sort((a, b) => a.at - b.at);
}

/* ---------- playing it */
let mout = null, musicAt = 0, musicBarNo = 0, musicSt = {deg:5}, musicBuf = null, lastMood = null;
const MUSVOL = [.5, 1, 1.5];
function musicInit(){
  if (mout || !actx) return;
  // a soft limiter keeps the loud setting from clipping when a feast and a voyage swell
  const lim = actx.createDynamicsCompressor(); lim.threshold.value = -16; lim.knee.value = 12; lim.ratio.value = 6; lim.attack.value = .01; lim.release.value = .25; lim.connect(out);
  mout = actx.createGain(); mout.gain.value = 0; mout.connect(lim);
  const n = actx.sampleRate, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; musicBuf = b;
}
const musicLevel = () => opts.music === false ? 0 : 1.1 * MUSVOL[clamp(opts.mvol == null ? 1 : opts.mvol, 0, 2)];
function setMusic(on){ opts.music = on; saveOpts(); if (on) audioStart(); if (mout) mout.gain.setTargetAtTime(musicLevel(), actx.currentTime, .4); }
function cycleMusicVol(){ opts.mvol = ((opts.mvol == null ? 1 : opts.mvol) + 1) % 3; saveOpts(); if (mout) mout.gain.setTargetAtTime(musicLevel(), actx.currentTime, .2); }
const MVOL_WORD = ['leise', 'mittel', 'laut'];
function mt(f, t, peak, dec, type = 'sine', to, atk = .005){
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dec * .6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.exponentialRampToValueAtTime(.0001, t + atk + dec); o.connect(g); g.connect(mout); o.start(t); o.stop(t + atk + dec + .1);
}
function mn(t, dur, peak, type, freq, q = 1, atk = .004){
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = musicBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.exponentialRampToValueAtTime(.0001, t + atk + dur); s.connect(f); f.connect(g); g.connect(mout); s.start(t, Math.random() * .5); s.stop(t + atk + dur + .05);
}
/* a pad of voices: two slightly detuned sines through a soft filter, slow in and slow out */
function mpad(f, t, peak, dur, type = 'sine', cut = 800){
  const lp = actx.createBiquadFilter(), g = actx.createGain(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.connect(g); g.connect(mout);
  const a = Math.min(1.4, dur * .3);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + dur - a); g.gain.linearRampToValueAtTime(0, t + dur);
  for (const c of [-5, 5]){ const o = actx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + dur + .1); }
  return lp;
}
function musicPlay(e, t, beat){
  const d = e.d * beat;
  switch (e.k){
    case 'drum': mt(e.f, t, e.v, .3, 'sine', e.f * .7); mn(t, .04, e.v * .6, 'bandpass', 900, 2); mt(e.f * 2.1, t, e.v * .25, .12); break;   // a hollow log struck
    case 'tube': mt(e.f, t, e.v, .24, 'sine', e.f * .97); mt(e.f * 2.76, t, e.v * .3, .08); mn(t, .05, e.v * .3, 'bandpass', e.f * 3, 4); break;   // bamboo stamped on the ground
    case 'rattle': mn(t, .05, e.v, 'highpass', e.f, 1); mn(t + .045, .04, e.v * .7, 'highpass', e.f * 1.1, 1); break;
    case 'hum': { const lp = mpad(e.f, t, e.v, d, 'sine', 700); const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = e.f * 2; const g = actx.createGain(); g.gain.value = .35; o.connect(g); g.connect(lp); o.start(t); o.stop(t + d + .1); break; }
    case 'mel': mt(e.f, t, e.v, .9); mt(e.f * 4, t, e.v * .22, .1); break;   // a wooden note like a marimba
    case 'flute': mpad(e.f, t, e.v, d, 'sine', 2400); mn(t, d, e.v * .12, 'bandpass', e.f * 2, 2, .15); break;   // breath on a soft tone
    case 'drone': { const lp = mpad(e.f, t, e.v, d, 'sawtooth', 320); mpad(e.f * 2, t, e.v * .5, d, 'sine', 600); mn(t, d, e.v * .5, 'lowpass', 110, 1, 1); break; }
  }
}
/* the state of the game, for the music */
function musicState(){
  const I = isl(active), v = view(60);
  return {phase:dayPhase(), night:!!opts.night, season:seasonOf().id,
    feast:islands.some(J => J.settled && J.feastEnd > tick && boxIn(J.box, v)),
    rainDance:!!I && !!I.rainAt && tick >= I.rainAt && tick < I.rainAt + RAIN.dance,
    storm:!!I && (stormNear(I) || (!!cyclone && cyclone.isl === I.id)),
    voyage:!!selShip && ships.includes(selShip) && selShip.state === 'sail',
    pop:I ? I.pop : 4, hawaiki:hawaiki()};
}
/* ---------- the surf. One wave: the water draws in (a low rush that swells for a few seconds), breaks (a short bright
   hiss), and runs back up the sand (a long thinning wash). Each wave is a little different, and they come seven to twelve
   seconds apart, as a calm sea does. waveOf is pure, so the test can read it. */
let waveAt = 0;
function waveOf(M, rnd){
  const big = (.6 + rnd() * .6) * M.surf;
  return {gap:(7 + rnd() * 5) / Math.sqrt(Math.max(.5, M.surf)), rise:2.2 + rnd() * 1.6, wash:4 + rnd() * 3, v:.2 * big, hiss:.1 * big * (.6 + rnd() * .8), tone:380 + rnd() * 260};
}
function wavePlay(W, t){
  const src = actx.createBufferSource(), lp = actx.createBiquadFilter(), g = actx.createGain(), end = t + W.rise + W.wash;
  src.buffer = musicBuf; src.loop = true; lp.type = 'lowpass'; lp.Q.value = .4;
  lp.frequency.setValueAtTime(W.tone * .5, t); lp.frequency.linearRampToValueAtTime(W.tone * 2.2, t + W.rise); lp.frequency.exponentialRampToValueAtTime(W.tone * .6, end);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(W.v, t + W.rise); g.gain.exponentialRampToValueAtTime(.0001, end);
  src.connect(lp); lp.connect(g); g.connect(mout); src.start(t, Math.random()); src.stop(end + .1);
  // the break and the foam running up the sand
  const s2 = actx.createBufferSource(), hp = actx.createBiquadFilter(), g2 = actx.createGain(), b = t + W.rise - .25;
  s2.buffer = musicBuf; s2.loop = true; hp.type = 'bandpass'; hp.Q.value = .5; hp.frequency.setValueAtTime(2400, b); hp.frequency.exponentialRampToValueAtTime(5200, b + W.wash * .8);
  g2.gain.setValueAtTime(.0001, b); g2.gain.exponentialRampToValueAtTime(W.hiss, b + .5); g2.gain.exponentialRampToValueAtTime(.0001, b + W.wash * .85);
  s2.connect(hp); hp.connect(g2); g2.connect(mout); s2.start(b, Math.random()); s2.stop(b + W.wash + .1);
}
/* schedule the bars that fall in the next second or so; called from audioTick */
function musicSchedule(t, S = musicState(), rnd = Math.random){
  if (!actx || !out) return 0; musicInit(); if (!mout || opts.music === false) return 0;
  mout.gain.setTargetAtTime(musicLevel(), t, .6);
  if (musicAt < t) musicAt = t + .1;
  let n = 0;
  if (waveAt < t - 20) waveAt = t + .2;
  while (waveAt < t + 1.2){ const W = waveOf(musicMood(S), rnd); if (W.v > .001) wavePlay(W, Math.max(t, waveAt)); waveAt += W.gap; n++; }
  while (musicAt < t + 1.2){
    const M = musicMood(S), beat = 60 / M.bpm; lastMood = M;
    for (const e of musicBar(M, musicBarNo++, rnd, musicSt)){ musicPlay(e, musicAt + e.at * beat, beat); n++; }
    musicAt += MUSIC_BEATS * beat;
  }
  return n;
}
