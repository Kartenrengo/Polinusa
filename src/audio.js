'use strict';
/* Sound, made in the browser without any sound files:
   - the surf, a slow swell of filtered noise, louder close to the coast
   - birds by day, crickets at night
   - slit drums while a village feasts on screen
   - a conch horn when something happens, soft wooden notes for tasks and the chronicle,
     a knock when a building is finished, a splash when a canoe is launched, rattling shells for a clan's gift
   Sound starts with the first tap (browsers want that) and can be switched off in the menu. */

let opts = loadOpts(), actx = null, out = null, seaVol = null, nextBird = 0, nextCricket = 0, drumAt = 0, drumStep = 0, lastAudio = 0;
function loadOpts(){ try { return {sound:true, night:true, ...JSON.parse(localStorage.getItem('polinusa-opts') || '{}')}; } catch (e){ return {sound:true, night:true}; } }
function saveOpts(){ try { localStorage.setItem('polinusa-opts', JSON.stringify(opts)); } catch (e){} }

function audioStart(){
  if (!opts.sound) return;
  if (actx){ if (actx.state === 'suspended' && !document.hidden) actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { actx = new AC(); } catch (e){ actx = null; return; }
  out = actx.createGain(); out.gain.value = .6; out.connect(actx.destination);
  // the surf: brown noise through a low filter, swelling and ebbing every eleven seconds
  const n = actx.sampleRate * 3, buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  let b = 0; for (let i = 0; i < n; i++){ b = b * .98 + (Math.random() * 2 - 1) * .1; d[i] = b * 1.6; }
  for (let i = 0; i < 2000; i++){ const f = i / 2000; d[i] *= f; d[n - 1 - i] *= f; }   // no click where the loop meets
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
  const swell = actx.createGain(); swell.gain.value = .5;
  const lfo = actx.createOscillator(), depth = actx.createGain(); lfo.frequency.value = .09; depth.gain.value = .38; lfo.connect(depth); depth.connect(swell.gain);
  seaVol = actx.createGain(); seaVol.gain.value = 0;
  src.connect(lp); lp.connect(swell); swell.connect(seaVol); seaVol.connect(out); src.start(); lfo.start();
}
addEventListener('pointerdown', audioStart); addEventListener('keydown', audioStart);
document.addEventListener('visibilitychange', () => { if (!actx) return; if (document.hidden) actx.suspend(); else if (opts.sound) actx.resume(); });
function setSound(on){ opts.sound = on; saveOpts(); if (on) audioStart(); else if (actx) actx.suspend(); }

/* ---------- small instruments */
const now0 = () => actx.currentTime;
function env(g, t, a, peak, dec){ g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
function tone(f, t, peak, dec, type = 'sine', to){
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dec * .6);
  env(g, t, .005, peak, dec); o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + .1);
}
function noise(t, dur, peak, type, freq, q = 1){
  const n = Math.ceil(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  env(g, t, .004, peak, dur); s.connect(f); f.connect(g); g.connect(out); s.start(t);
  return f;
}
/* wooden notes like a marimba: a sine and a quickly fading overtone */
const wood = (f, t, peak = .12) => { tone(f, t, peak, .9); tone(f * 4, t, peak * .25, .12); };
function sfx(name){
  if (!actx || !opts.sound || actx.state !== 'running') return;
  const t = now0() + .02;
  if (name === 'quest') [523, 659, 784].forEach((f, i) => wood(f, t + i * .12));
  else if (name === 'chronik') [392, 523, 659, 880].forEach((f, i) => wood(f, t + i * .14, .1));
  else if (name === 'knock'){ noise(t, .06, .12, 'bandpass', 900, 2); tone(320, t, .08, .15); }
  else if (name === 'splash'){ const f = noise(t, .5, .1, 'highpass', 2400); f.frequency.exponentialRampToValueAtTime(500, t + .5); }
  else if (name === 'shells') for (let i = 0; i < 7; i++) noise(t + i * .05 + Math.random() * .03, .03, .07, 'bandpass', 3200 + Math.random() * 1500, 6);
  else if (name === 'horn'){
    // the conch shell trumpet: a raw tone through a soft filter, rising into pitch
    const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain(), vib = actx.createOscillator(), vg = actx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(176, t); o.frequency.linearRampToValueAtTime(196, t + .25);
    vib.frequency.value = 5; vg.gain.value = 2.5; vib.connect(vg); vg.connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 820; f.Q.value = 1.2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.1, t + .3); g.gain.setValueAtTime(.1, t + 1.1); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); vib.start(t); o.stop(t + 1.7); vib.stop(t + 1.7);
  }
}
function bird(t){ const n = 2 + Math.floor(Math.random() * 3), f = 2400 + Math.random() * 900; for (let i = 0; i < n; i++) tone(f, t + i * .11, .035, .08, 'sine', f * 1.35); }
function cricket(t){ for (let i = 0; i < 3; i++) noise(t + i * .045, .025, .018, 'bandpass', 4300, 12); }
/* one beat of the slit drums: a deep hollow log and a higher one */
const DRUM = [1, 0, .5, 1, 0, .5, .7, 0];
function drum(t, k){ if (!k) return; tone(k > .8 ? 120 : 190, t, .22 * k, .28, 'sine', k > .8 ? 85 : 150); noise(t, .03, .05 * k, 'bandpass', 1400, 3); }

/* called with every frame: the surf follows the zoom, birds and crickets come and go, drums play during a feast */
function audioTick(now){
  if (!actx || !opts.sound || actx.state !== 'running' || now - lastAudio < 200) return;
  lastAudio = now;
  const t = now0(), dark = nightLevel() > .5, v = view(60);
  seaVol.gain.setTargetAtTime(lod === 'near' ? .5 : lod === 'mid' ? .34 : .16, t, .8);
  if (lod !== 'far' && now > nextBird){ nextBird = now + 5000 + Math.random() * 11000; if (!dark) bird(t + .05); }
  if (dark && lod !== 'far' && now > nextCricket){ nextCricket = now + 700 + Math.random() * 900; cricket(t + .05); }
  const feast = islands.some(I => I.feastEnd > tick && boxIn(I.box, v));
  if (feast){ if (drumAt < t) drumAt = t + .05; while (drumAt < t + .45){ drum(drumAt, DRUM[drumStep++ % DRUM.length]); drumAt += .21; } }
}
