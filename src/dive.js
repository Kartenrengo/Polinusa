'use strict';
/* ---------- driftwood and diving. Logs, coconuts and pieces of wrecked canoes drift on the open sea with the wind; a
   canoe that sails past picks them up. Under a wreck there is often something on the bottom: a diving place, marked by
   circling birds. There the crew of an anchored canoe dives, one dive after the other: mostly shells and sea food, now and
   then pearl shell, rarely a whale tooth or an old ornament. Too many dives in a row and a diver gets taravana. */
let drift = [], diveSpots = [], nextDrift = 1;
const DRIFT = {
  stamm:{n:'ein Treibstamm', get:{holz:3}},
  kokos:{n:'treibende Kokosnüsse', get:{kokos:4}},
  wrack:{n:'ein Wrackteil', get:{holz:2, schnur:1}}
};
const DIVE_LOOT = [['perlmutt', .04, true], ['tabua', .015, true], ['schmuck', .03, false], ['meeres', .35, false], ['muschel', .33, false]];
const openWater = p => revealed(p) && !islands.some(I => boxIn(I.box, {x0:p.x - 20, y0:p.y - 20, x1:p.x + 20, y1:p.y + 20}));
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
  for (const d of drift){ d.x += W.tx * 1.1; d.y += W.ty * 1.1; }
  drift = drift.filter(d => tick - d.t0 < 420 && revealed(d));
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
    c.save(); c.translate(d.x, d.y + bob); c.scale(k, k);
    c.fillStyle = 'rgba(234,245,240,.5)'; c.beginPath(); c.ellipse(0, 1.4, 6, 1.6, 0, 0, TAU); c.fill();
    c.lineWidth = .5; c.strokeStyle = '#2B1D14';
    if (d.k === 'stamm'){ c.rotate(.3); c.fillStyle = '#8C6440'; c.beginPath(); c.ellipse(0, 0, 6.4, 1.3, 0, 0, TAU); c.fill(); c.stroke(); }
    else if (d.k === 'kokos'){ for (const [x, y] of [[-2, 0], [1.6, .4], [-.2, -1.2]]){ c.fillStyle = '#7A5434'; c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); c.stroke(); } }
    else { c.rotate(-.2); c.fillStyle = '#B08048'; c.fillRect(-5, -1, 10, 2); c.strokeRect(-5, -1, 10, 2); c.strokeStyle = '#E9DCC0'; c.beginPath(); c.moveTo(-1, -1); c.lineTo(1.6, 1); c.stroke(); }
    c.restore();
  }
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
