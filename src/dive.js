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
  kauri:{n:'ein Klumpen Kauri-Harz', get:{kauri:1}}
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
  drift = drift.filter(d => tick - d.t0 < (d.shore ? BEACH.life : 420) && revealed(d) && !(d.shore && !openWater(d, 4)));   // what reaches the beach is gone
  // by the shore of the village you look at: a log, nuts, a piece of a wreck, very seldom a lump of kauri resin
  const A = isl(active);
  if (A && A.settled && tick % BEACH.every === 0 && drift.filter(d => d.shore === A.id).length < BEACH.max && Math.random() < .5){
    const p = shorePoint(A); if (p){ const r = Math.random(), k = r < BEACH.resin ? 'kauri' : r < .5 ? 'stamm' : r < .85 ? 'kokos' : 'wrack'; drift.push({id:nextDrift++, k, x:fx(p.x), y:fx(p.y), t0:tick, shore:A.id}); }
  }
  if (tick % 25 === 0 && drift.length < 6 && Math.random() < .6){
    const p = seaPoint(); if (p){ const r = Math.random(), k = r < .45 ? 'stamm' : r < .8 ? 'kokos' : 'wrack'; drift.push({id:nextDrift++, k, x:fx(p.x), y:fx(p.y), t0:tick}); }
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
function drawDrift(c, v, now){
  const t = now / 1000, k = clamp(.9 / cam.z, 1, 2);
  for (const d of drift){
    if (!ptIn(d.x, d.y, v)) continue;
    const bob = reduced ? 0 : Math.sin(t * 1.6 + d.id) * .6;
    const kd = d.shore ? k * 1.4 : k;   // by the shore a little larger, so a finger finds it
    c.save(); c.translate(d.x, d.y + bob); c.scale(kd, kd); c.setLineDash([]);
    c.fillStyle = 'rgba(234,245,240,.5)'; c.beginPath(); c.ellipse(0, 1.4, 6, 1.6, 0, 0, TAU); c.fill();
    c.lineWidth = .5; c.strokeStyle = '#2B1D14';
    if (d.k === 'stamm'){ c.rotate(.3); c.fillStyle = '#8C6440'; c.beginPath(); c.ellipse(0, 0, 6.4, 1.3, 0, 0, TAU); c.fill(); c.stroke(); }
    else if (d.k === 'kokos'){ for (const [x, y] of [[-2, 0], [1.6, .4], [-.2, -1.2]]){ c.fillStyle = '#7A5434'; c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); c.stroke(); } }
    else if (d.k === 'kauri'){ const g = reduced ? .7 : .5 + .5 * Math.sin(t * 3 + d.id);
      c.fillStyle = `rgba(247,210,122,${(.18 + g * .22).toFixed(2)})`; c.beginPath(); c.ellipse(0, 0, 5.4, 3.6, 0, 0, TAU); c.fill();   // a warm glow on the water
      c.fillStyle = '#E3B04E'; c.beginPath(); c.ellipse(0, 0, 2.4, 1.7, .3, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#B9873A'; c.lineWidth = .4; c.beginPath(); c.ellipse(0, .2, 1.8, 1.1, .3, .2, 2.6); c.stroke();   // the weathered crust
      c.fillStyle = `rgba(251,231,176,${(.5 + g * .5).toFixed(2)})`; c.beginPath(); c.arc(-.7, -.5, .7, 0, TAU); c.fill();
      c.strokeStyle = `rgba(255,248,220,${g.toFixed(2)})`; c.lineWidth = .45; c.beginPath(); c.moveTo(3, -4.2); c.lineTo(3, -1.8); c.moveTo(1.8, -3); c.lineTo(4.2, -3); c.stroke(); }
    else { c.rotate(-.2); c.fillStyle = '#B08048'; c.fillRect(-5, -1, 10, 2); c.strokeRect(-5, -1, 10, 2); c.strokeStyle = '#E9DCC0'; c.beginPath(); c.moveTo(-1, -1); c.lineTo(1.6, 1); c.stroke(); }
    c.restore();
    // by the shore it can be tapped: a slow ring goes out from it
    if (d.shore){ const f = reduced ? .5 : (t * .45 + d.id * .37) % 1; stroke(c, ellipse(d.x, d.y + 1.4, (7 + f * 6) * kd, (2.6 + f * 2.2) * kd), d.k === 'kauri' ? '#F7D27A' : '#F4FBFA', .7, [.4, 1.4], 'round', (1 - f) * .8); }
  }
  // what was brought in: a splash, and the good rising out of it
  driftFx = driftFx.filter(q => now - q.t0 < 1200);
  for (const q of driftFx){ const f = (now - q.t0) / 1200;
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
