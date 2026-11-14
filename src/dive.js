'use strict';
/* ---------- driftwood and diving. Logs, coconuts and pieces of wrecked canoes drift on the open sea with the wind; a
   canoe that sails past picks them up. Under a wreck there is often something on the bottom: a diving place, marked by
   circling birds. There the crew of an anchored canoe dives, one dive after the other: mostly shells and sea food, now and
   then pearl shell, rarely a whale tooth or an old ornament. Too many dives in a row and a diver gets taravana.
   Close to the shore of your own village things float as well: a tap, and somebody paddles out for them. Very seldom it
   is a lump of resin from the kauri trees (Agathis) of the big islands; the matriarch cuts a talisman from it, which keeps one
   storm off the roofs (a game idea). */
let drift = [], diveSpots = [], nextDrift = 1;
const DRIFT = {
  stamm:{n:'ein Treibstamm', get:{holz:3}},
  kokos:{n:'treibende Kokosnüsse', get:{kokos:2}},
  wrack:{n:'ein Wrackteil', get:{holz:2, schnur:1}},
  kauri:{n:'ein Klumpen Kauri-Harz', get:{kauri:1}},
  blaetter:{n:'ein Bündel Pandanusblätter', get:{dach:3}},
  muscheln:{n:'ein Büschel Tang mit Muscheln', get:{muschel:2}}
};
const BEACH = {every:10, max:3, life:240, resin:.06};   // drift by the own shore: how often, how many at once, how long it floats
const DIVE_LOOT = [['perlmutt', .04, true], ['tabua', .015, true], ['schmuck', .03, false], ['meeres', .35, false], ['muschel', .33, false]];
const openWater = (p, m = 20) => revealed(p) && !islands.some(I => boxIn(I.box, {x0:p.x - m, y0:p.y - m, x1:p.x + m, y1:p.y + m}));
/* a point on the water not far off the shore of an island */
function shorePoint(I){
  const b = I.box, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, rx = (b.x1 - b.x0) / 2, ry = (b.y1 - b.y0) / 2;
  for (let k = 0; k < 30; k++){ const a = Math.random() * TAU, d = 26 + Math.random() * 70, p = {x:cx + Math.cos(a) * (rx + d), y:cy + Math.sin(a) * (ry + d * .7)}; if (openWater(p)) return p; }
  return null;
}
function seaPoint(near){
  for (let k = 0; k < 30; k++){
    const h = near ? null : fogHoles[Math.floor(Math.random() * fogHoles.length)]; if (!near && !h) return null;
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()), p = near ? {x:near.x + Math.cos(a) * (40 + d * 120), y:near.y + Math.sin(a) * (30 + d * 80)} : {x:h.cx + Math.cos(a) * h.rx * d * .9, y:h.cy + Math.sin(a) * h.ry * d * .9};
    if (openWater(p)) return p;
  }
  return null;
}
/* every tick: new driftwood now and then, the old drifts with the wind and sinks after a while; a reef place now and then */
function driftTick(){
  if (landing) return;
  const W = wind();
  for (const d of drift){ const f = d.shore ? .3 : 1.1; d.x += W.tx * f; d.y += W.ty * f; }
  driftFx = driftFx.filter(q => performance.now() - q.t0 < (q.dur || 1200));
  drift = drift.filter(d => {
    if (!(tick - d.t0 < (d.shore ? BEACH.life : 420) && revealed(d))) return false;
    if (d.shore && !openWater(d, 4)){ if (lod !== 'far') driftFx.push({x:d.x, y:d.y, t0:performance.now(), dur:2400, ashore:d.id}); return false; }   // what reaches the beach is gone, with a line of foam
    return true;
  });
  // by the shore of the village you look at: a log, nuts, a piece of a wreck, very seldom a lump of kauri resin
  const A = isl(active);
  if (A && A.settled && tick % BEACH.every === 0 && drift.filter(d => d.shore === A.id).length < BEACH.max && Math.random() < .5){
    const p = shorePoint(A); if (p){ const r = Math.random(), k = r < BEACH.resin ? 'kauri' : r < .42 ? 'stamm' : r < .7 ? 'kokos' : r < .82 ? 'blaetter' : r < .92 ? 'muscheln' : 'wrack'; drift.push({id:nextDrift++, k, x:fx(p.x), y:fx(p.y), t0:tick, shore:A.id}); }
  }
  if (tick % 25 === 0 && drift.length < 6 && Math.random() < .6){
    const p = seaPoint(); if (p){ const r = Math.random(), k = r < .38 ? 'stamm' : r < .62 ? 'kokos' : r < .74 ? 'blaetter' : r < .84 ? 'muscheln' : 'wrack'; drift.push({id:nextDrift++, k, x:fx(p.x), y:fx(p.y), t0:tick}); }
  }
  if (tick % 300 === 0 && diveSpots.length < 2){ const I = islands.find(J => J.settled && Math.random() < .5) || islands.find(J => J.settled); const p = I && seaPoint(I.harbor); if (p) addSpot(p, 1, 'Vögel'); }
  diveTick();
}
function addSpot(p, rich, via){ const s = {id:nextDrift++, x:fx(p.x), y:fx(p.y), rich, left:4 + rich * 3, via}; diveSpots.push(s); return s; }
/* a canoe under way touches driftwood: what fits goes aboard */
function driftTouch(){
  for (const s of ships){
    if (!s.own || s.state !== 'sail') continue;
    for (const d of drift.slice()){
      if (Math.hypot(d.x - s.x, d.y - s.y) > 16) continue;
      const D = DRIFT[d.k], got = {};
      for (const [k, v] of Object.entries(D.get)){ const n = Math.min(v, SHIPS[s.kind].cap - roomUsed(s)); if (n > 0){ s.cargo[k] = (s.cargo[k] || 0) + n; got[k] = n; } }
      drift.splice(drift.indexOf(d), 1); stats.treibgut = (stats.treibgut || 0) + 1;
      let msg = `${s.name} fischt ${D.n} auf: ${giftText(got) || 'kein Platz mehr an Bord'}.`;
      if (d.k === 'wrack' && Math.random() < .45){ addSpot(d, 2, 'Wrack'); msg += ' Darunter liegt etwas am Grund: Vögel kreisen über einem Tauchplatz.'; }
      if (!awayQuiet) note(msg); if (!awayQuiet && s === selShip) toast(msg, 3200, false);
    }
  }
}
/* a tap on something floating: somebody paddles out and brings it to the store of the village */
let driftFx = [];
const hitDrift = p => lod === 'far' ? null : drift.filter(d => Math.hypot(p.x - d.x, p.y - d.y) < Math.max(11, 18 / cam.z)).sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0] || null;
function collectDrift(d){
  const A = isl(active), I = A && A.settled ? A : islands.filter(J => J.settled).sort((a, b) => Math.hypot(a.center.x - d.x, a.center.y - d.y) - Math.hypot(b.center.x - d.x, b.center.y - d.y))[0];
  if (!I || !drift.includes(d)) return null;
  const D = DRIFT[d.k], got = {}, cap = storeCap(I);
  for (const [k, v] of Object.entries(D.get)){ const n = Math.min(v, Math.max(0, cap - (I.stock[k] || 0))); if (n > 0){ I.stock[k] = (I.stock[k] || 0) + n; got[k] = n; } }
  drift.splice(drift.indexOf(d), 1); stats.treibgut = (stats.treibgut || 0) + 1; if (d.k === 'kauri') stats.kauri = (stats.kauri || 0) + 1;
  driftFx.push({x:d.x, y:d.y, t0:performance.now(), k:Object.keys(got)[0] || Object.keys(D.get)[0], resin:d.k === 'kauri'});
  const m = matriarchOf(I);
  if (d.k === 'kauri'){ sfx('rise'); toast(`Kauri-Harz! Ganz selten treibt ein Klumpen an, vom Kauri-Baum der großen Inseln. Am Dorfzentrum schnitzt ${m ? m.n : 'die Matriarchin'} daraus einen Talisman gegen den Sturm.`, 5200); }
  else { sfx('splash'); toast(`${D.n[0].toUpperCase() + D.n.slice(1)}: ${giftText(got) || 'das Lager ist voll'}.`, 2200, false); }
  updateHUD(); requestDraw(); save(); return got;
}
/* the matriarch: the eldest woman of the family at the village centre, else the eldest woman of the village */
function matriarchOf(I){
  const cz = centerOf(I), f = cz && famOfHome(I, cz), m = f && eldest(I, f, 'f'); if (m) return m;
  return (I.people || []).filter(p => p.s === 'f' && stageOf(p) !== 'kid').sort((a, b) => a.b - b.b)[0] || null;
}
/* the talisman: kauri resin and a cord of sennit; the matriarch cuts it, and it is worth standing */
const TALISMAN = {cost:{kauri:1, schnur:1}, mana:3};
function talismanState(I){
  if (!centerOf(I)) return 'Geschnitzt wird am Dorfzentrum.';
  if (!matriarchOf(I)) return 'Keine Frau im Dorf, die ihn schnitzen kann.';
  if (!(I.stock.kauri > 0)) return 'Es fehlt Kauri-Harz. Tippe auf Treibgut im Meer: Ganz selten ist es ein Klumpen Harz.';
  if (!canPay(I, TALISMAN.cost)) return `Fehlt: ${lacking(I, TALISMAN.cost)}.`;
  return '';
}
function cutTalisman(I){
  const no = talismanState(I); if (no){ toast(no, 3000, false); return false; }
  const m = matriarchOf(I); pay(I, TALISMAN.cost); I.stock.talisman = (I.stock.talisman || 0) + 1; mana += TALISMAN.mana; stats.talisman = (stats.talisman || 0) + 1;
  sfx('rise'); toast(`${m.n} schnitzt einen Talisman aus Kauri-Harz. Er hält einen Sturm von den Dächern. Ansehen +${TALISMAN.mana}.`, 4600);
  updateHUD(); save(); return true;
}
const spotNear = s => diveSpots.filter(q => Math.hypot(q.x - s.x, q.y - s.y) < 45).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0] || null;
function startDive(s){
  const q = spotNear(s); if (!q || s.state === 'sail' || s.route != null) return;
  s.auto = false; s.diving = {spot:q.id, n:0, strain:0, found:{}}; s.state = s.port ? s.state : 'sea';
  toast(`Die Mannschaft der ${s.name} taucht. Ein Stein zieht hinab, der Partner im Kanu hält die Schnur.`, 3200, false);
}
function stopDive(s, why){ if (!s.diving) return; const f = s.diving.found; s.diving = null; if (why && !awayQuiet) note(`${s.name}: ${why}${Object.keys(f).length ? ` Gefunden: ${giftText(f)}.` : ''}`); }
function diveTick(){
  for (const s of ships){
    const D = s.diving; if (!D) continue;
    const q = diveSpots.find(x => x.id === D.spot);
    if (!q || s.state === 'sail'){ stopDive(s, 'Das Tauchen ist vorbei.'); continue; }
    if (tick % 3) continue;
    if (roomUsed(s) >= SHIPS[s.kind].cap){ stopDive(s, 'Das Kanu ist voll.'); continue; }
    D.n++; D.strain++; q.left--;
    const r = Math.random(); let acc = 0, got = null;
    for (const [k, p, rich] of DIVE_LOOT){ acc += rich ? p * q.rich : p; if (r < acc){ got = k; break; } }
    if (got){ stats.tauchfund = (stats.tauchfund || 0) + 1; s.cargo[got] = (s.cargo[got] || 0) + 1; D.found[got] = (D.found[got] || 0) + 1; if (TREASURE_GOODS.includes(got) && !awayQuiet) toast(`${s.name}: Ein Taucher bringt ${G1[got]} herauf!`, 3600); }
    if (D.strain > 6 && Math.random() < (D.strain - 6) * .15){ stats.taravana = (stats.taravana || 0) + 1; stopDive(s, 'Ein Taucher hat die Taucherkrankheit: Schwindel, die Glieder lahm. Die Mannschaft hört auf und rudert ihn in Ruhe.'); continue; }
    if (q.left <= 0){ diveSpots.splice(diveSpots.indexOf(q), 1); stopDive(s, 'Der Grund hier ist leer getaucht.'); }
  }
}
/* the sheet of a canoe: dive here, or what the divers found so far */
function shipDiveMarkup(s){
  if (s.diving){ const f = s.diving.found, q = diveSpots.find(x => x.id === s.diving.spot);
    return `<div class="rowx"><span class="sub">Taucht: ${s.diving.n} Tauchgänge${q ? `, noch etwa ${q.left}` : ''}. ${Object.keys(f).length ? `Gefunden: ${giftText(f)}.` : 'Noch nichts gefunden.'}${s.diving.strain > 5 ? ' Die Taucher sind müde.' : ''}</span><button class="btn" type="button" data-act="undive">Aufhören</button></div>`; }
  const q = spotNear(s); if (!q || s.route != null) return '';
  return `<div class="rowx"><span class="sub">Hier kreisen Vögel über einem Tauchplatz (${q.via}${q.rich > 1 ? ', reich' : ''}). Meist Muscheln, manchmal Perlmutt, selten ein Walzahn.</span><button class="btn primary" type="button" data-act="dive"${s.state === 'sail' ? ' disabled' : ''}>Tauchen lassen</button></div>`;
}
/* ---------- drawn on the sea: driftwood bobbing, the birds over a diving place and the bubbles of the divers */
/* what floats is drawn by hand, each kind with its own look. The picture is seeded by the id of the piece, so no two logs are
   alike. The fine strokes (bark, barnacles, seaweed, a resting bird, the wake) come only close up and with a good frame rate. */
const DRIFT_INK = '#2B1D14';
const driftLeaf = (c, x, y, a, s, fill) => {   // a small leaf with a midrib
  c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = fill; c.lineWidth = .3; c.strokeStyle = DRIFT_INK;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * .5, -s * .5, s, 0); c.quadraticCurveTo(s * .5, s * .5, 0, 0); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,255,230,.45)'; c.lineWidth = .2; c.beginPath(); c.moveTo(s * .1, 0); c.lineTo(s * .85, 0); c.stroke(); c.restore();
};
/* a strand of seaweed that trails behind and sways in the swell */
function driftWeed(c, x0, y0, len, dir, t, id, fine){
  c.lineCap = 'round'; const n = 7, pts = [];
  for (let i = 0; i <= n; i++){ const f = i / n; pts.push([x0 + dir * f * len, y0 + Math.sin(f * 5 + (fine ? t * 1.7 : 0) + id) * (.5 + f * .9) + f * .8]); }
  for (const [col, w] of [[DRIFT_INK, 1.05], ['#5F7A3A', .62]]){ c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
  c.fillStyle = '#7E9A4A'; for (let i = 2; i < n; i += 2){ c.beginPath(); c.arc(pts[i][0], pts[i][1] - .5, .32, 0, TAU); c.fill(); }   // air bladders
}
function driftBird(c, x, y, t, id){   // a gull or tern resting on the log, now and then it turns its head
  const turn = Math.sin(t * .5 + id) > .8 ? -1 : 1; c.save(); c.translate(x, y); c.scale(turn, 1); c.lineWidth = .35; c.strokeStyle = DRIFT_INK;
  c.fillStyle = '#F2EFE6'; c.beginPath(); c.moveTo(-2.4, -.2); c.quadraticCurveTo(-1.8, -2.4, .6, -2.1); c.quadraticCurveTo(2, -1.9, 1.9, -.2); c.quadraticCurveTo(0, .5, -2.4, -.2); c.fill(); c.stroke();   // body
  c.fillStyle = '#8F9AA0'; c.beginPath(); c.moveTo(-1.8, -1.2); c.quadraticCurveTo(-.4, -2.4, 1, -1.5); c.quadraticCurveTo(-.2, -.7, -1.8, -1.2); c.fill(); c.stroke();   // folded wing
  c.fillStyle = '#F2EFE6'; c.beginPath(); c.arc(1.7, -2.4, .85, 0, TAU); c.fill(); c.stroke();   // head
  c.fillStyle = '#E8A23A'; c.beginPath(); c.moveTo(2.4, -2.5); c.lineTo(3.5, -2.2); c.lineTo(2.4, -2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = DRIFT_INK; c.beginPath(); c.arc(1.9, -2.6, .2, 0, TAU); c.fill(); c.restore();
}
function driftSpark(c, x, y, p, s){   // a four-pointed twinkle
  c.strokeStyle = `rgba(255,250,225,${(.9 * p).toFixed(2)})`; c.lineWidth = .4; c.lineCap = 'round'; const a = s * p;
  c.beginPath(); c.moveTo(x, y - a); c.lineTo(x, y + a); c.moveTo(x - a, y); c.lineTo(x + a, y); c.stroke();
  c.lineWidth = .25; c.beginPath(); c.moveTo(x - a * .5, y - a * .5); c.lineTo(x + a * .5, y + a * .5); c.moveTo(x + a * .5, y - a * .5); c.lineTo(x - a * .5, y + a * .5); c.stroke();
}
function drawDriftPiece(c, d, t, fine){
  const h = hsh(d.id, 7), h2 = hsh(d.id, 19), h3 = hsh(d.id, 31); c.lineWidth = .5; c.strokeStyle = DRIFT_INK; c.lineJoin = 'round';
  if (d.k === 'stamm' && h < .35){   // a broken branch with a few leaves
    c.rotate(.2 + h2 * .5);
    c.lineCap = 'round'; for (const [col, w] of [[DRIFT_INK, 1.9], ['#7A5434', 1.15]]){ c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(-6, .6); c.quadraticCurveTo(0, -1.4, 6, -.2); c.moveTo(-.5, -.5); c.quadraticCurveTo(1.5, -2.6, 3.2, -3.1); c.moveTo(-3.2, -.2); c.lineTo(-4.4, -2); c.stroke(); }
    c.strokeStyle = '#B58A5A'; c.lineWidth = .3; c.beginPath(); c.moveTo(-5, .1); c.quadraticCurveTo(0, -1.9, 5, -.7); c.stroke();
    const n = fine ? 6 : 3, spots = [[6, -.2, -.3], [3.2, -3.1, -.8], [4, -1.4, .3], [-4.4, -2, -1.2], [1.4, -1.7, -1.2], [-1.4, -.6, .2]];
    for (let i = 0; i < n; i++){ const [x, y, a] = spots[i], dry = (h3 * 7 + i) % 5 < 1.3; driftLeaf(c, x, y, a - 0.2 + (i % 2) * .5, 2.4 + (i % 3) * .5, dry ? '#A8793F' : i % 2 ? '#6E9A48' : '#8DB45A'); }
    c.fillStyle = '#D2A66E'; c.beginPath(); c.ellipse(-6, .6, .55, .8, 0, 0, TAU); c.fill(); c.lineWidth = .3; c.strokeStyle = DRIFT_INK; c.stroke();
  }
  else if (d.k === 'stamm'){   // a log with bark, broken stubs and barnacles
    c.rotate(.25 + (h2 - .5) * .5); c.lineWidth = .5;
    c.fillStyle = '#8C6440'; c.beginPath(); c.moveTo(-6.4, .1); c.quadraticCurveTo(-6.3, -1.45, -3, -1.4); c.lineTo(3, -1.3); c.quadraticCurveTo(6.4, -1.3, 6.5, .1); c.quadraticCurveTo(6.3, 1.4, 3, 1.5); c.lineTo(-3, 1.5); c.quadraticCurveTo(-6.3, 1.5, -6.4, .1); c.fill(); c.stroke();
    c.strokeStyle = '#B58A5A'; c.lineWidth = .35; c.lineCap = 'round'; c.beginPath(); c.moveTo(-5, -.8); c.lineTo(4.6, -.85); c.stroke();   // light on the top
    c.fillStyle = 'rgba(40,24,12,.28)'; c.beginPath(); c.moveTo(-5.6, .6); c.quadraticCurveTo(0, 1.8, 5.6, .6); c.lineTo(5.4, 1.2); c.quadraticCurveTo(0, 2, -5.4, 1.2); c.fill();   // the shaded belly
    c.fillStyle = '#D2A66E'; c.beginPath(); c.ellipse(6.35, .05, .75, 1.3, 0, 0, TAU); c.fill(); c.lineWidth = .35; c.strokeStyle = DRIFT_INK; c.stroke();   // the cut end with its rings
    c.strokeStyle = '#8C5F3E'; c.lineWidth = .22; c.beginPath(); c.ellipse(6.35, .05, .38, .72, 0, 0, TAU); c.stroke();
    if (fine){
      c.strokeStyle = '#4A2F1C'; c.lineWidth = .3; c.beginPath();   // furrows of the bark
      for (let i = 0; i < 5; i++){ const x = -5 + i * 2.3 + h2 * 1.2, y = (i % 2 ? .4 : -.45); c.moveTo(x, y); c.quadraticCurveTo(x + .8, y - .25, x + 1.7, y + .05); }
      c.stroke();
      if (h3 < .6){ c.strokeStyle = DRIFT_INK; c.lineWidth = .45; c.beginPath(); c.moveTo(-1.6, -1.35); c.lineTo(-2, -2.6); c.stroke(); c.strokeStyle = '#8C6440'; c.lineWidth = .25; c.beginPath(); c.moveTo(-1.6, -1.35); c.lineTo(-2, -2.5); c.stroke(); }   // a stub of a branch
      if (h2 < .55){ c.fillStyle = '#EFE8D6'; c.strokeStyle = DRIFT_INK; c.lineWidth = .18; for (let i = 0; i < 6; i++){ c.beginPath(); c.arc(-4 + i * .75 + (i % 2) * .2, 1.1 - (i % 3) * .12, .3, 0, TAU); c.fill(); c.stroke(); } }   // barnacles
      if (h3 > .35) driftWeed(c, -6.2, .5, 4.4 + h2 * 2, -1, t, d.id, fine);
    }
    if (fine && hsh(d.id, 11) < .3 && quality) driftBird(c, -1 + h * 2, -1.1, t, d.id);
  }
  else if (d.k === 'kokos'){   // nuts in their husk, torn fibres, one has sprouted
    const nuts = [[-2.2, .1, 1.5, .3], [1.8, .5, 1.4, -.4], [-.2, -1.3, 1.3, .1]], sp = (d.id % 3);
    nuts.forEach(([x, y, r, a], i) => {
      c.save(); c.translate(x, y); c.rotate(a); c.lineWidth = .4; c.strokeStyle = DRIFT_INK;
      c.fillStyle = '#9A7040'; c.beginPath(); c.moveTo(-r, .1); c.quadraticCurveTo(-r * 1.05, -r * .9, 0, -r * 1.15); c.quadraticCurveTo(r * 1.05, -r * .9, r, .1); c.quadraticCurveTo(r * .9, r * 1.05, 0, r * 1.05); c.quadraticCurveTo(-r * .9, r * 1.05, -r, .1); c.fill(); c.stroke();
      c.fillStyle = 'rgba(250,225,170,.45)'; c.beginPath(); c.ellipse(-r * .3, -r * .45, r * .35, r * .22, -.4, 0, TAU); c.fill();
      if (fine){ c.strokeStyle = '#C9A06A'; c.lineWidth = .22; c.beginPath(); c.moveTo(-.5, -r * 1.05); c.lineTo(-.6, r * .5); c.moveTo(.3, -r * 1.1); c.lineTo(.5, r * .6); c.moveTo(-r * .8, -.1); c.quadraticCurveTo(-r * .8, r * .6, -.3, r * .9); c.moveTo(r * .8, -.1); c.quadraticCurveTo(r * .8, r * .6, .3, r * .9); c.stroke();
        c.strokeStyle = '#B08A58'; c.lineWidth = .2; c.beginPath(); c.moveTo(r, .1); c.quadraticCurveTo(r * 1.5, -.1, r * 1.8, .5); c.moveTo(-r, .2); c.quadraticCurveTo(-r * 1.5, .1, -r * 1.7, .8); c.stroke(); }   // loose fibres
      if (i === sp){ c.lineCap = 'round'; c.strokeStyle = DRIFT_INK; c.lineWidth = .9; c.beginPath(); c.moveTo(0, -r * 1.1); c.quadraticCurveTo(.5, -r - 1.2, .2, -r - 2.3); c.stroke(); c.strokeStyle = '#B9D277'; c.lineWidth = .5; c.stroke();
        c.restore(); c.save(); c.translate(x, y); c.rotate(a); driftLeaf(c, .2, -r - 2.3, -2.1, 1.7, '#7FAE4E'); driftLeaf(c, .2, -r - 2.3, -.9, 1.5, '#97C25E'); }
      c.restore();
    });
  }
  else if (d.k === 'kauri'){   // a lump of resin with a soft glow and a glint
    const g = reduced ? .7 : .5 + .5 * Math.sin(t * 3 + d.id);
    c.fillStyle = `rgba(247,210,122,${(.18 + g * .22).toFixed(2)})`; c.beginPath(); c.ellipse(0, 0, 5.4, 3.6, 0, 0, TAU); c.fill();
    c.fillStyle = '#D99A3C'; c.beginPath(); for (let i = 0; i < 9; i++){ const a = i / 9 * TAU, r = 2.3 + hsh(d.id, i) * .9, x = Math.cos(a) * r * 1.2, y = Math.sin(a) * r * .8; i ? c.quadraticCurveTo(Math.cos(a - .35) * (r + .5) * 1.2, Math.sin(a - .35) * (r + .5) * .8, x, y) : c.moveTo(x, y); } c.closePath(); c.fill(); c.lineWidth = .5; c.strokeStyle = DRIFT_INK; c.stroke();
    c.fillStyle = '#F0C468'; c.beginPath(); c.ellipse(-.5, -.4, 1.5, 1, .3, 0, TAU); c.fill();   // the clear amber inside
    c.strokeStyle = '#B9873A'; c.lineWidth = .35; c.beginPath(); c.ellipse(.3, .5, 1.9, 1, .3, .3, 2.7); c.stroke();   // the weathered crust
    if (fine){ c.fillStyle = 'rgba(120,70,20,.5)'; for (const [x, y] of [[1.6, -.6], [-1.8, .9], [.6, 1.1]]){ c.beginPath(); c.arc(x, y, .22, 0, TAU); c.fill(); } }
    c.fillStyle = `rgba(255,248,215,${(.55 + g * .45).toFixed(2)})`; c.beginPath(); c.arc(-1, -.8, .55, 0, TAU); c.fill();
    c.strokeStyle = `rgba(255,248,220,${g.toFixed(2)})`; c.lineWidth = .45; c.beginPath(); c.moveTo(3, -4.2); c.lineTo(3, -1.8); c.moveTo(1.8, -3); c.lineTo(4.2, -3); c.stroke();
  }
  else if (d.k === 'blaetter'){   // a bundle of pandanus leaves, tied with a cord
    c.rotate(-.15 + h2 * .4); c.lineCap = 'round';
    const cols = ['#8DAA52', '#A3BD64', '#7A9944', '#B7B56A', '#98B25A'];
    for (let i = 0; i < 5; i++){ const o = (i - 2) * .55, tip = 6.2 - (i % 2) * .8; c.fillStyle = cols[(i + (h > .5 ? 1 : 0)) % 5]; c.lineWidth = .35; c.strokeStyle = DRIFT_INK;
      c.beginPath(); c.moveTo(-5.4, o * .4); c.quadraticCurveTo(0, -.9 + o, tip, o * 1.4 - .25 * (i - 2)); c.quadraticCurveTo(0, .5 + o, -5.4, o * .4); c.fill(); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,220,.4)'; c.lineWidth = .2; c.beginPath(); c.moveTo(-4.6, 0); c.quadraticCurveTo(0, -.9, 5.2, -.1); c.stroke();
    if (fine){ c.strokeStyle = '#5E7436'; c.lineWidth = .18; c.setLineDash([.25, .45]); c.beginPath(); c.moveTo(-3.6, -1.1); c.quadraticCurveTo(0, -1.9, 4.6, -1); c.stroke(); c.setLineDash([]); }   // the prickly edge
    c.strokeStyle = DRIFT_INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-.6, -1.5); c.lineTo(-.6, 1.5); c.stroke(); c.strokeStyle = '#E9DCC0'; c.lineWidth = .8; c.stroke();   // the cord
    c.strokeStyle = '#B79F6A'; c.lineWidth = .25; c.beginPath(); c.moveTo(-.9, -1.4); c.lineTo(-.3, 1.4); c.moveTo(-.4, -1.4); c.lineTo(.2, 1.4); c.stroke();
  }
  else if (d.k === 'muscheln'){   // a little raft of weed with shells on it
    c.fillStyle = '#6F7F3F'; c.beginPath(); c.moveTo(-4.4, .3); c.quadraticCurveTo(-4, -1.4, -1, -1.5); c.quadraticCurveTo(2, -2, 4.2, -.6); c.quadraticCurveTo(5, .8, 2.6, 1.6); c.quadraticCurveTo(-1, 2.2, -4.4, .3); c.fill(); c.lineWidth = .4; c.stroke();
    c.strokeStyle = '#97A85A'; c.lineWidth = .3; c.beginPath(); c.moveTo(-3, .2); c.quadraticCurveTo(-1, -.8, 1.5, -.4); c.moveTo(-1, 1.2); c.quadraticCurveTo(1.5, .8, 3.4, .4); c.stroke();
    c.lineWidth = .35; c.strokeStyle = DRIFT_INK;
    c.save(); c.translate(-1.9, -.4); c.rotate(-.3); c.fillStyle = '#F3D9A0'; c.beginPath(); c.moveTo(0, 1); c.quadraticCurveTo(-2, 0, -1.6, -1.4); c.quadraticCurveTo(0, -2, 1.6, -1.4); c.quadraticCurveTo(2, 0, 0, 1); c.fill(); c.stroke();
    c.strokeStyle = '#B08048'; c.lineWidth = .2; c.beginPath(); c.moveTo(0, .8); c.lineTo(0, -1.6); c.moveTo(0, .8); c.lineTo(-1, -1.3); c.moveTo(0, .8); c.lineTo(1, -1.3); c.stroke(); c.restore();   // a scallop
    c.fillStyle = '#EAD9B8'; c.beginPath(); c.ellipse(1.4, .2, 1.4, .85, .5, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = '#8C6440'; c.lineWidth = .2; c.beginPath(); c.moveTo(.4, .7); c.lineTo(2.4, -.3); c.stroke();   // a cowrie
    c.fillStyle = '#E6B89A'; c.beginPath(); c.arc(3, 1, .7, 0, TAU); c.fill(); c.lineWidth = .3; c.strokeStyle = DRIFT_INK; c.stroke(); c.strokeStyle = '#B57A5A'; c.beginPath(); c.arc(3, 1, .35, 0, 4.5); c.stroke();   // a snail
  }
  else {   // a piece of a wreck: a plank, lashed, with a splintered end
    c.rotate(-.2 + (h2 - .5) * .4);
    c.fillStyle = '#B08048'; c.beginPath(); c.moveTo(-5, -1); c.lineTo(5, -1); c.lineTo(5.3, -.1); c.lineTo(4.8, .5); c.lineTo(5.4, 1); c.lineTo(-5, 1); c.closePath(); c.fill(); c.lineWidth = .5; c.stroke();
    c.strokeStyle = '#E9DCC0'; c.lineWidth = .3; c.beginPath(); c.moveTo(-1, -1); c.lineTo(1.6, 1); c.stroke();
    c.strokeStyle = '#7A5434'; c.lineWidth = .25; c.beginPath(); c.moveTo(-4.6, -.3); c.lineTo(3.4, -.3); c.moveTo(-3.8, .4); c.lineTo(2.2, .4); c.stroke();   // the grain
    c.fillStyle = DRIFT_INK; c.beginPath(); c.ellipse(-3.8, 0, .35, .3, 0, 0, TAU); c.fill();   // a lashing hole
    for (const x of [-2.6, 2.8]){ c.strokeStyle = DRIFT_INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, -1.2); c.lineTo(x, 1.2); c.stroke(); c.strokeStyle = '#D8C79A'; c.lineWidth = .6; c.stroke(); if (fine){ c.strokeStyle = '#8C7440'; c.lineWidth = .2; c.beginPath(); c.moveTo(x - .3, -1); c.lineTo(x + .3, -.4); c.moveTo(x - .3, -.2); c.lineTo(x + .3, .4); c.moveTo(x - .3, .6); c.lineTo(x + .3, 1.1); c.stroke(); } }   // the cord of sennit wound round it
    if (fine){ c.strokeStyle = '#D8C79A'; c.lineWidth = .35; c.beginPath(); c.moveTo(2.8, 1.1); c.quadraticCurveTo(3.4, 2.4, 2.2, 3.2); c.stroke();   // a loose end of cord
      c.fillStyle = '#EFE8D6'; c.strokeStyle = DRIFT_INK; c.lineWidth = .18; for (let i = 0; i < 4; i++){ c.beginPath(); c.arc(-3.6 + i * .7, .85, .26, 0, TAU); c.fill(); c.stroke(); } }
  }
}
function drawDrift(c, v, now){
  const t = now / 1000, k = clamp(.9 / cam.z, 1, 2), fine = lod === 'near' && quality > 0;
  for (const d of drift){
    if (!ptIn(d.x, d.y, v)) continue;
    const bob = reduced ? 0 : Math.sin(t * 1.6 + d.id) * .6, roll = reduced ? 0 : Math.sin(t * 1.15 + d.id * 1.7) * .045;
    const kd = d.shore ? k * 1.4 : k;   // by the shore a little larger, so a finger finds it
    // the water round it: a pale patch, and a small ring of a wake that widens and fades
    c.save(); c.translate(d.x, d.y); c.scale(kd, kd); c.setLineDash([]);
    c.fillStyle = 'rgba(234,245,240,.5)'; c.beginPath(); c.ellipse(0, 1.4, 6, 1.6, 0, 0, TAU); c.fill();
    if (fine && !reduced){ const f = (t * .32 + d.id * .29) % 1; c.strokeStyle = `rgba(244,251,250,${((1 - f) * .55).toFixed(2)})`; c.lineWidth = .35; c.beginPath(); c.ellipse(0, 1.5, 6.2 + f * 3.2, 1.7 + f * .9, 0, 0, TAU); c.stroke(); }
    c.translate(0, bob); c.rotate(roll);
    drawDriftPiece(c, d, t, fine);
    c.restore();
    // it can be tapped: from time to time a twinkle flickers over it (the kauri has its own glint)
    if (fine && !reduced && d.k !== 'kauri'){ const p = (t * .22 + hsh(d.id, 5)) % 1; if (p < .22){ const s = Math.sin(p / .22 * Math.PI); driftSpark(c, d.x + 3.2 * kd, d.y - 3.4 * kd + bob, s, 1.7 * kd); } }
    // by the shore a slow ring goes out from it
    if (d.shore){ const f = reduced ? .5 : (t * .45 + d.id * .37) % 1; stroke(c, ellipse(d.x, d.y + 1.4, (7 + f * 6) * kd, (2.6 + f * 2.2) * kd), d.k === 'kauri' ? '#F7D27A' : '#F4FBFA', .7, [.4, 1.4], 'round', (1 - f) * .8); }
  }
  // what was brought in: a splash, and the good rising out of it
  driftFx = driftFx.filter(q => now - q.t0 < (q.dur || 1200));
  for (const q of driftFx){
    if (q.ashore){ drawAshoreFoam(c, q, (now - q.t0) / q.dur, k); continue; }
    const f = (now - q.t0) / 1200;
    stroke(c, ellipse(q.x, q.y + 1.4, (4 + f * 14) * k, (1.6 + f * 5) * k), '#F4FBFA', 1, null, 'round', 1 - f);
    put(c, q.x, q.y - 6 - f * 16, k * (q.resin ? 1.3 : 1), 1, 0, 'gain|' + q.k, `<use href="#ic-${q.k}" transform="translate(-4.6 -4.6) scale(.46)"/>`, f < .7 ? 1 : (1 - f) / .3); }
  for (const q of diveSpots){
    if (!ptIn(q.x, q.y, v)) continue;
    for (let i = 0; i < 3; i++){ const a = t * (.6 + i * .15) + i * 2.1 + q.id, x = q.x + Math.cos(a) * 12 * k, y = q.y - 10 * k + Math.sin(a) * 5 * k;
      c.save(); c.translate(x, y); c.scale(.8 * k, .8 * k); stroke(c, Math.sin(t * 4 + i * 2) > -.3 ? BIRD1 : BIRD2, '#2B1D14', 1.3, null, 'round', .85); c.restore(); }
    stroke(c, ellipse(q.x, q.y, 7 * k, 2.6 * k), '#F4FBFA', .8, [.4, 1.6], 'round', .7);
  }
  for (const s of ships){
    if (!s.diving || !ptIn(s.x, s.y, v)) continue;
    for (let i = 0; i < 4; i++){ const f = (t * .8 + i / 4) % 1, x = s.x + 10 + Math.sin(i * 2 + t) * 2, y = s.y + 4 - f * 6;
      stroke(c, ellipse(x, y, .9 + f, .9 + f), '#F4FBFA', .6, null, 'round', 1 - f); }
  }
}

/* what drifts onto the beach: a little line of foam runs up the sand and melts away */
function drawAshoreFoam(c, q, f, k){
  const a = (f < .2 ? f / .2 : 1 - (f - .2) / .8) * .9, run = Math.min(1, f * 2.2);
  c.save(); c.translate(q.x, q.y + 1); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [w, col, al] of [[2.2, '#F4FBFA', .55], [.9, '#FFFFFF', .95]]){ c.strokeStyle = col; c.globalAlpha = a * al; c.lineWidth = w; c.setLineDash([]); c.beginPath();
    for (let i = 0; i <= 10; i++){ const u = i / 10 - .5, x = u * (12 + run * 6), y = -Math.cos(u * 3) * 1.6 - run * 2.2 + Math.sin(u * 14 + q.ashore) * .45; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.fillStyle = '#FFFFFF'; c.globalAlpha = a * .8; for (let i = 0; i < 6; i++){ const u = hsh(q.ashore, i) - .5; c.beginPath(); c.arc(u * 15, -1.2 - run * 2.4 + hsh(q.ashore, i + 9) * 1.4, .35 + hsh(q.ashore, i + 3) * .3, 0, TAU); c.fill(); }
  c.restore();
}
