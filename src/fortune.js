'use strict';
/* ---------- Fortune: what makes a long game exciting, and what rewards it.
   The brain's reward system answers to things we cannot quite foresee and to progress we can see: a find that might be rare,
   a collection that is nearly complete, a bar that is almost full, a moment that is celebrated. So:
   - The Fundkorb: 24 finds in four sets (sea, land, sky, ancestors), common, rare or precious. A new one is celebrated, with
     standing; a full set brings more. Finds come from the voyages, from crises overcome, from dreams fulfilled, from the
     clans and from rare sights that one taps on the map.
   - Voyages into the unknown ask for a choice when the navigator sees a sign: follow it, hold the course, or turn home.
   - Crises are seen coming: a few minutes ahead the elders say what is needed, a bar shows how far the stores are.
   - Single people have a dream of their life; when it comes true, the village shares in it.
   - The clans remember generous gifts and at times answer with something precious.
   Kept fair on purpose: nothing is lost by staying away, there are no daily chains, nothing is bought. All of it lives in
   stats, so it is saved with the game and older games simply begin with an empty basket. */

const RARITY = {1:{n:'Gewöhnlich', mana:1, cls:'r1'}, 2:{n:'Selten', mana:2, cls:'r2'}, 3:{n:'Kostbar', mana:4, cls:'r3'}};
const FIND_SETS = {meer:{n:'Meer', bonus:'Ansehen +5'}, land:{n:'Land', bonus:'Ansehen +5'}, himmel:{n:'Himmel', bonus:'Ansehen +5'}, ahnen:{n:'Ahnen', bonus:'Ansehen +8'}};
const FINDS = [
  {id:'tritonhorn', c:'meer', r:2, ic:'horn', n:'Tritonhorn', t:'Eine große Schneckenschale. Mit einem Loch wird sie zum Horn.'},
  {id:'perle', c:'meer', r:3, ic:'perlmutt', n:'Perlmuttschale', t:'Die glänzende Schale einer Perlmuschel. Gut für Haken und Schmuck.'},
  {id:'kauri', c:'meer', r:2, ic:'kauri', n:'Goldene Kauri', t:'Eine kleine Schnecke mit goldener Schale. Selten.'},
  {id:'treibstamm', c:'meer', r:1, ic:'holz', n:'Treibstamm', t:'Ein ganzer Baum, vom Meer angespült. Er kommt von weit her.'},
  {id:'schildkroete', c:'meer', r:1, ic:'wild', n:'Schildkröte am Strand', t:'In der Nacht hat eine Schildkröte am Strand ihre Eier gelegt.'},
  {id:'wal', c:'meer', r:2, ic:'meeres', n:'Buckelwal', t:'Vor dem Riff springt ein Buckelwal aus dem Wasser.'},
  {id:'obsidian', c:'land', r:2, ic:'klingen', n:'Obsidian', t:'Schwarzes Gesteinsglas vom Vulkan. Daraus macht man scharfe Klingen.'},
  {id:'federn', c:'land', r:3, ic:'federn', n:'Rote Federn', t:'Rote Federn von einem Waldvogel. Sehr wertvoll.'},
  {id:'kurkuma', c:'land', r:1, ic:'kurkuma', n:'Wilde Kurkuma', t:'Gelbe Wurzeln. Man färbt damit und nimmt sie als Heilmittel.'},
  {id:'brotfrucht', c:'land', r:2, ic:'nahrung', n:'Brotfrucht ohne Kerne', t:'Eine Brotfrucht ohne Kerne. Man pflanzt sie aus Wurzeltrieben.'},
  {id:'scherbe', c:'land', r:2, ic:'toepfe', n:'Alte Scherbe', t:'Eine alte Topfscherbe. Das Muster kennt im Dorf niemand.'},
  {id:'quelle', c:'land', r:1, ic:'wasser', n:'Verborgene Quelle', t:'Zwischen Steinen kommt frisches Wasser aus dem Boden.'},
  {id:'plejaden', c:'himmel', r:1, ic:'plejaden', n:'Die Plejaden', t:'Am Morgen stehen die Plejaden im Osten. Das Jahr beginnt.'},
  {id:'fregatt', c:'himmel', r:1, ic:'passat', n:'Fregattvögel', t:'Fregattvögel fliegen abends zum Land. Seefahrer folgen ihnen.'},
  {id:'regenbogen', c:'himmel', r:2, ic:'wasser', n:'Doppelter Regenbogen', t:'Zwei Regenbogen über der Lagune.'},
  {id:'sternschnuppe', c:'himmel', r:2, ic:'mana', n:'Sternschnuppe', t:'Ein Licht fällt über den Himmel ins Meer.'},
  {id:'mondhof', c:'himmel', r:1, ic:'mager', n:'Hof um den Mond', t:'Ein heller Ring um den Mond. Bald regnet es.'},
  {id:'leuchtsee', c:'himmel', r:3, ic:'meeres', n:'Leuchtendes Meer', t:'Nachts leuchtet das Wasser blau, wenn sich etwas bewegt.'},
  {id:'stabkarte', c:'ahnen', r:3, ic:'plejaden', n:'Stabkarte der Alten', t:'Stäbe und Muscheln, zusammengebunden. Sie zeigen Wellen und Inseln.'},
  {id:'ahnenlied', c:'ahnen', r:1, ic:'mana', n:'Ein Ahnenlied', t:'Ein Lied mit den Namen der Ahnen bis zum ersten Kanu.'},
  {id:'ehrenmatte', c:'ahnen', r:2, ic:'feinmatten', n:'Ehrenmatte', t:'Eine feine Matte. Man schenkt sie bei Hochzeiten und Trauerfeiern.'},
  {id:'tapamuster', c:'ahnen', r:2, ic:'bemtapa', n:'Tapa mit altem Muster', t:'Rindenstoff mit einem sehr alten Muster.'},
  {id:'armring', c:'ahnen', r:2, ic:'schmuck', n:'Armring aus Kegelschnecke', t:'Ein geschliffener Ring aus einer Kegelschnecke.'},
  {id:'talisman', c:'ahnen', r:3, ic:'talisman', n:'Talisman der Ahnen', t:'Ein geschnitzter Anhänger, den die Familie seit Langem weitergibt.'}
];
const FIND_MILE = 5;
/* every five finds a present: useful goods for the village you look at (or the first one), and standing */
function mileGift(){
  const I = isl(active) && isl(active).settled ? isl(active) : villages()[0]; if (!I) return null;
  const got = pickOf([{nahrung:10, wasser:6}, {holz:8, dach:8}, {schnur:4, faser:6}, {proviant:5}, {toepfe:2, matten:2}]);
  for (const [k, n] of Object.entries(got)) addTo(I, k, n); mana += 3; stats.fundGeschenk = (stats.fundGeschenk || 0) + 1; return {I, got};
}
const FIND_BY = Object.fromEntries(FINDS.map(F => [F.id, F]));
const foundOf = () => stats.finds || (stats.finds = {});
const foundN = (c = null) => FINDS.filter(F => (!c || F.c === c) && foundOf()[F.id] != null).length;
/* a find by chance: rarer ones less often; new ones a little more likely than ones already in the basket */
function rollFind(cats, bias = 0){
  const pool = FINDS.filter(F => cats.includes(F.c)), w = F => (F.r === 1 ? 6 : F.r === 2 ? 3 : 1 + bias) * (foundOf()[F.id] == null ? 1.6 : 1);
  let t = pool.reduce((s, F) => s + w(F), 0) * Math.random(); for (const F of pool){ t -= w(F); if (t <= 0) return F.id; } return pool[0] && pool[0].id;
}
/* something found: into the basket, with standing; the first of its kind celebrated, a full set more so */
function gainFind(id, why = ''){
  const F = FIND_BY[id]; if (!F) return;
  const f = foundOf(), fresh = f[id] == null; let set = null, gain = fresh ? RARITY[F.r].mana : 1;
  if (fresh){ f[id] = yearOf() + 1; if (FINDS.filter(q => q.c === F.c).every(q => f[q.id] != null)){ set = F.c; gain += F.c === 'ahnen' ? 8 : 5; } }
  mana += gain; stats.fundN = (stats.fundN || 0) + 1;
  const mile = stats.fundN % FIND_MILE === 0 ? mileGift() : null;   // every five finds the village gets a present
  const msg = `${fresh ? 'Neu im Fundkorb' : 'Noch einmal gefunden'}: ${F.n}. Ansehen +${gain}.`;
  if (awayQuiet || catching){ note(msg); return; }
  rewardPop({ic:F.ic, rare:F.r, title:F.n, text:(why ? why + ' ' : '') + F.t, sub:fresh ? `Neu im Fundkorb · ${foundN()} von ${FINDS.length}` : 'Schon im Fundkorb', bar:foundN() / FINDS.length, gain, set:set && `Reihe ${FIND_SETS[set].n} komplett.`});
  if (mile) setTimeout(() => rewardPop({ic:'mana', rare:2, kicker:`${stats.fundN} Funde`, title:'Geschenk der Alten', text:`Für ${stats.fundN} Funde bekommt ${mile.I.name}: ${costText(mile.got)}.`, sub:`Nächstes Geschenk nach ${FIND_MILE} weiteren Funden`, gain:3}), F.r >= 3 ? 6800 : 5000);
  updateHUD(); save();
}
/* the moment of reward: a card that pops up with the thing, how rare it is, how far the basket is, and a sound */
function rewardPop(o){
  let el = $('reward'); if (!el){ el = document.createElement('div'); el.id = 'reward'; el.setAttribute('role', 'status'); $('app').appendChild(el); el.addEventListener('click', e => { if (e.target.closest('[data-go]')){ hideReward(); openSheet('finds'); return; } hideReward(); }); }
  const R = RARITY[o.rare] || RARITY[1];
  el.className = 'rw ' + R.cls; el.innerHTML = `<div class="rwcard"><span class="rwrays" aria-hidden="true"></span><span class="rwrare">${o.kicker || R.n}</span><span class="rwic">${icon(o.ic)}</span><b class="rwt">${o.title}</b>` +
    `<span class="rwtext">${o.text}</span>${o.set ? `<span class="rwset">${o.set}</span>` : ''}${o.sub ? `<span class="rwsub">${o.sub}</span>` : ''}${o.bar != null ? `<span class="rwbar"><i style="width:${Math.round(o.bar * 100)}%"></i></span>` : ''}` +
    `<span class="rwfoot"><span class="rwgain">${o.gain ? `${icon('mana')}+${o.gain}` : ''}</span><button class="chip" type="button" data-go="1">Fundkorb ›</button></span></div>`;
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  sfx(o.rare >= 3 ? 'horn' : 'chronik'); clearTimeout(el._t); el._t = setTimeout(hideReward, o.rare >= 3 ? 6500 : 4800);
}
function hideReward(){ const el = $('reward'); if (el){ el.hidden = true; clearTimeout(el._t); } }
/* the basket: four rows, the finds still missing as shadows with a hint where they might be met */
function findsMarkup(){
  const f = foundOf(), n = foundN();
  const toGift = FIND_MILE - ((stats.fundN || 0) % FIND_MILE);
  let h = head('Fundkorb', `${n} von ${FINDS.length} gefunden · nächstes Geschenk in ${toGift} ${toGift === 1 ? 'Fund' : 'Funden'}`) + `<span class="mbar big"><i style="width:${n / FINDS.length * 100}%"></i></span>`;
  for (const [c, S] of Object.entries(FIND_SETS)){
    const L = FINDS.filter(F => F.c === c), k = L.filter(F => f[F.id] != null).length;
    h += `<p class="fhead">${S.n} <span class="sub">${k}/${L.length}${k === L.length ? ' · vollständig' : ` · ganz: ${S.bonus}`}</span></p><div class="fkorb">` +
      L.map(F => f[F.id] != null ? `<span class="fslot on ${RARITY[F.r].cls}" role="img" aria-label="${F.n}, ${RARITY[F.r].n}" data-tip="${esc(`<b>${F.n}</b> · ${RARITY[F.r].n}<br>${F.t}`)}">${icon(F.ic)}<small>${F.n}</small></span>`
        : `<span class="fslot" role="img" aria-label="Noch nicht gefunden, ${RARITY[F.r].n}"><b>?</b><small>${RARITY[F.r].n}</small></span>`).join('') + '</div>';
  }
  const D = (stats.dreams || []).filter(d => !d.done);
  if (D.length) h += `<p class="fhead">${icon('mana')}Lebensträume</p><ul class="list needs">${D.map(d => { const I = isl(d.isl), p = I && I.people && I.people.find(q => q.id === d.pid); return p ? `<li>${icon(DREAMS[d.k].ic)}<span class="nm">${p.n} auf ${I.name}<small>${DREAMS[d.k].n}. ${DREAMS[d.k].how}</small></span></li>` : ''; }).join('')}</ul>`;
  return h;
}

/* ---------- 1. voyages: the navigator reads a sign; you choose */
const SIGNS = [
  d => `Am Abend fliegen Seeschwalben nach ${d}. Sie schlafen an Land.`,
  d => `Im ${d} trägt eine Wolke einen grünen Schimmer an ihrer Unterseite: Licht von einer Lagune.`,
  d => `Die Dünung bricht anders. Die Navigatorin spürt es im Rumpf: Im ${d} liegt etwas im Weg.`,
  d => `Grüne Kokosnüsse treiben vorbei, sie kommen aus dem ${d}.`,
  d => `Ein Fregattvogel kreist hoch und zieht dann nach ${d} davon.`
];
const DIR_N = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];
const dirName = (dx, dy) => DIR_N[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
const homeOfShip = s => isl(s.last) && isl(s.last).settled ? isl(s.last) : villages().sort((a, b) => Math.hypot(a.center.x - s.x, a.center.y - s.y) - Math.hypot(b.center.x - s.x, b.center.y - s.y))[0] || isl('heimat');
const VOYAGE = {id:'fahrt', t:'Ein Zeichen auf See', place:() => ({name:'See', stock:{}}),
  text:o => `${o.s.name}: ${o.sign} ${o.lvl ? `Die Navigatorin hat Erfahrung (Stufe ${o.lvl}).` : 'Noch hat niemand an Bord viel Erfahrung.'}`,
  choices:[
    {n:'Dem Zeichen folgen', text:o => `Wagnis: neues Land oder ein Fund, aber auch Sturm und Hunger sind möglich. Mit Erfahrung steht es besser.`, go:o => voyageFollow(o)},
    {n:'Kurs halten', text:'Sicher. Vielleicht treibt etwas vorbei.', go:o => { if (Math.random() < .3){ const id = rollFind(['meer', 'himmel']); setTimeout(() => gainFind(id, `${o.s.name} hielt Kurs, und unterwegs zeigte sich etwas.`), 600); return `${o.s.name} hält Kurs.`; } return `${o.s.name} hält Kurs. Das Meer bleibt still.`; }},
    {n:'Heimkehren', text:'Kein Wagnis, keine Beute.', go:o => { const H = homeOfShip(o.s); o.s.auto = false; sailTo(o.s, {isl:H.id}, true); return `${o.s.name} kehrt nach ${H.name} zurück.`; }}]};
function voyageFollow(o){
  const s = o.s, good = Math.random() < .45 + .12 * o.lvl, T = o.T;
  if (good && T && !T.discovered){ discover(T); exploreAt(T.center.x, T.center.y, 260); s.auto = false; sailTo(s, {isl:T.id}, true); stats.zeichen = (stats.zeichen || 0) + 1;
    setTimeout(() => rewardPop({ic:'insel', rare:2, kicker:'Neues Land', title:T.name, text:`Das Zeichen stimmte. Im ${dirName(T.center.x - s.x, T.center.y - s.y)} liegt ${T.type === 'atoll' ? 'ein Atoll' : 'eine hohe Insel'}. ${s.name} fährt hin.`, gain:3}), 400); mana += 3;
    if (Math.random() < .5) setTimeout(() => gainFind(rollFind(['meer', 'himmel', 'land'], 1), `Auf dem Weg nach ${T.name} gefunden.`), 5600);
    return `Land! ${T.name} liegt vor ${s.name}.`; }
  if (good){ const id = rollFind(['meer', 'himmel'], 1); setTimeout(() => gainFind(id, `${s.name} folgte dem Zeichen.`), 600); return `${s.name} folgt dem Zeichen und findet etwas.`; }
  const roll = Math.random();
  if (roll < .25 + .05 * (3 - o.lvl)){ const H = homeOfShip(s), lost = Object.keys(s.cargo || {}).filter(k => k !== 'proviant' && s.cargo[k] > 0); for (const k of lost) s.cargo[k] = Math.floor(s.cargo[k] / 2); s.auto = false; sailTo(s, {isl:H.id}, true); stats.seenot = (stats.seenot || 0) + 1;
    return `Ein Sturm packt ${s.name}. Die Hälfte der Ladung geht über Bord, das Kanu kämpft sich zurück nach ${H.name}.`; }
  s.cargo = s.cargo || {}; s.cargo.proviant = Math.max(0, (s.cargo.proviant || 0) - 3);
  return `Das Zeichen täuschte. Tage auf leerem Meer: 3 Proviant sind aufgegessen.`;
}
function voyageTick(){
  if (eventNow || sheetKind || placing || tick < (stats.voyAt || 0)) return;
  const s = own().find(q => q.state === 'sail' && (q.auto || (q.dest && !q.dest.isl))); if (!s){ stats.voyAt = tick + 20; return; }
  stats.voyAt = tick + 150 + Math.floor(Math.random() * 120);
  const T = islands.filter(I => !I.discovered).sort((a, b) => Math.hypot(a.center.x - s.x, a.center.y - s.y) - Math.hypot(b.center.x - s.x, b.center.y - s.y))[0];
  const near = T && Math.hypot(T.center.x - s.x, T.center.y - s.y) < 1400 ? T : null, d = near ? dirName(near.center.x - s.x, near.center.y - s.y) : DIR_N[Math.floor(Math.random() * 8)];
  eventNow = {E:VOYAGE, o:{s, T:near, lvl:Math.min(3, navLore().lvl || 0), sign:pickOf(SIGNS)(d)}}; stats.ereignisse++; sfx('horn'); openSheet('event', {});
}

/* ---------- 2. crises one sees coming: the elders warn, a bar shows the stores, then it comes */
const CRISES = {
  duerre:{n:'Dürre', ic:'mager', warn:I => `Die Alten sehen keinen Hof um den Mond, die Frösche schweigen: Auf ${I.name} kommt eine Dürre.`, need:I => ({wasser:Math.round(I.pop * 1.5), nahrung:Math.round(I.pop * 1.2)}), bad:'Die Quellen fallen trocken, das Essen wird knapp.'},
  flut:{n:'Sturmflut', ic:'sturm', warn:I => `Die Dünung kommt lang und schwer aus dem Süden: Auf ${I.name} kommt eine Sturmflut.`, need:I => ({holz:Math.round(4 + I.pop * .5), dach:Math.round(4 + I.pop * .5)}), bad:'Die Flut reißt Dächer ab und spült Vorräte fort.'},
  ratten:{n:'Rattenjahr', ic:'reste', warn:I => `Im Busch rascheln es mehr Ratten als je zuvor: Auf ${I.name} kommt ein Rattenjahr.`, need:I => ({nahrung:Math.round(I.pop * 1.4), proviant:Math.max(2, Math.round(I.pop * .25))}), bad:'Die Ratten fressen sich durch die Vorräte.'}
};
const CRISIS_WARN = 210;   // seven minutes to prepare
const crisisNeed = (I, C) => { const n = CRISES[C.k].need(I), cap = storeCap(I); for (const k in n) n[k] = Math.max(3, Math.min(Math.round(cap * .8), n[k])); return n; };
function crisisTick(){
  const C = stats.crisis;
  if (!C){ if (tick < (stats.crisisAt ?? YEAR * 1.5) || eventNow) return;
    const I = pickOf(villages().filter(q => q.pop >= 10)); if (!I){ stats.crisisAt = tick + 120; return; }
    const k = seasonOf().id === 'sturm' ? 'flut' : seasonOf().id === 'mager' ? 'duerre' : pickOf(Object.keys(CRISES));
    stats.crisis = {k, isl:I.id, at:tick + CRISIS_WARN}; stats.crisis.need = crisisNeed(I, stats.crisis);
    if (!awayQuiet){ sfx('horn'); toast(`${CRISES[k].warn(I)} Legt Vorräte an: ${costText(stats.crisis.need)}.`, 7000); } note(CRISES[k].warn(I)); crisisCard(); kinHelp(I, k); return; }
  const I = isl(C.isl); if (!I || !I.settled){ stats.crisis = null; crisisCard(); return; }
  if (tick % 2 === 0) crisisCard();
  if (tick < C.at) return;
  const K = CRISES[C.k], have = Object.entries(C.need).map(([g, n]) => Math.min(1, (I.stock[g] || 0) / n)), share = have.reduce((a, b) => a + b, 0) / have.length;
  for (const [g, n] of Object.entries(C.need)) I.stock[g] = Math.max(0, (I.stock[g] || 0) - Math.round(n * (share >= 1 ? .5 : .8)));   // the reserves are used up; ready, half of them stay
  stats.crisis = null; stats.crisisAt = tick + 600 + Math.floor(Math.random() * 360); crisisCard();
  if (share >= 1){ stats.krisen = (stats.krisen || 0) + 1; mana += 4;
    if (!awayQuiet) rewardPop({ic:K.ic, rare:2, kicker:'Überstanden', title:`${K.n} überstanden`, text:`${I.name} hatte genug Vorräte. Das Dorf feiert.`, gain:4});
    setTimeout(() => gainFind(rollFind(['ahnen', 'land'], 1), 'Beim Fest geschenkt.'), awayQuiet ? 0 : 5200); }
  else { mana = Math.max(0, mana - 1); toast(`${K.n} auf ${I.name}: ${K.bad} ${share > .5 ? 'Es war vieles bereit, das half.' : 'Es war zu wenig bereit.'}`, 6000); note(`${K.n} auf ${I.name}. ${K.bad}`); }
  updateHUD(); save();
}
/* where the crisis card goes: under the top bar, or under the message line while one shows */
function crisisTop(){
  const app = $('app').getBoundingClientRect(), t = $('toast'), base = (typeof topH === 'number' ? topH : 96) + 10;
  if (t && !t.hidden && t.classList.contains('open')){ const r = t.getBoundingClientRect(); if (r.height) return Math.max(base, r.bottom - app.top + 8); }
  return base;
}
{ const t = document.getElementById('toast'); if (t && window.MutationObserver) new MutationObserver(() => { if (stats && stats.crisis) crisisCard(); }).observe(t, {attributes:true, attributeFilter:['hidden', 'class']}); }
/* the card under the top bar while a crisis comes: what, when, and a bar for each good */
function crisisCard(){
  let el = $('crisis'); const C = stats.crisis, I = C && isl(C.isl);
  if (!C || !I){ if (el) el.hidden = true; return; }
  if (!el){ el = document.createElement('button'); el.id = 'crisis'; el.type = 'button'; $('app').appendChild(el); el.addEventListener('click', () => { const c = stats.crisis; if (c){ setActive(c.isl); openSheet('store', {}); } }); }
  const K = CRISES[C.k], left = Math.max(0, (C.at - tick) * TICK / 1000 / Math.max(.25, gameSpeed || 1));
  el.hidden = !!sheetKind; el.style.top = crisisTop() + 'px'; el.setAttribute('aria-label', `${K.n} auf ${I.name} in ${secsText(left)}. Vorräte: ${Object.entries(C.need).map(([g, n]) => `${Math.min(n, I.stock[g] || 0)} von ${n} ${GN[g]}`).join(', ')}. Tippen öffnet das Lager.`);
  el.innerHTML = `<span class="cr-t">${icon(K.ic)}<b>${K.n}</b> auf ${I.name} in ${secsText(left)}</span>` + Object.entries(C.need).map(([g, n]) => { const h = Math.min(n, I.stock[g] || 0); return `<span class="cr-g${h >= n ? ' ok' : ''}">${icon(g)}<span class="cr-bar"><i style="width:${h / n * 100}%"></i></span><small>${h}/${n}</small></span>`; }).join('');
}

/* ---------- 3. dreams: a person wishes for something in life; when it comes true, it is celebrated */
const DREAMS = {
  navigator:{done:'Sie ist jetzt Navigatorin.', n:'möchte Navigatorin werden', ic:'plejaden', how:'Im Haus der Navigatoren lernen.', ok:p => (p.nv || 0) >= 1},
  meister:{done:'Die Familie wohnt jetzt im Handwerkerhaus.', n:'wünscht sich ein Handwerkerhaus', ic:'toepfe', how:'Das Haus der Familie zum Handwerkerhaus ausbauen.', ok:(p, I) => { const f = famOf(I, p.h), h = f && f.home && findB(f.home); return !!h && tierOf(h) >= 3; }},
  seefahrer:{done:'Die Familie wohnt jetzt im Seefahrerhaus.', n:'träumt vom Leben der Seefahrer', ic:'einbaum', how:'Das Haus der Familie zum Seefahrerhaus ausbauen.', ok:(p, I) => { const f = famOf(I, p.h), h = f && f.home && findB(f.home); return !!h && wayOf(h) === 'see'; }},
  tatau:{done:'Das Tatau ist gestochen.', n:'wartet auf das Tatau', ic:'mana', how:'Ein Tatau-Fest feiern.', ok:p => !!p.tt},
  fest:{done:'Das Fest war groß.', n:'möchte ein großes Fest erleben', ic:'kava', how:'Ein Fest im Dorf feiern.', ok:(p, I, d) => (I.feastAt || 0) > d.at},
  ahnen:{done:'Der Ahnenpfosten steht.', n:'möchte den Ahnen einen Pfosten setzen', ic:'knochen', how:'Einen Ahnenpfosten oder ein Ahnenhaus bauen.', ok:(p, I, d) => I.buildings.filter(b => (b.kind === 'pfosten' || b.kind === 'ahnenhaus') && !b.bt).length > (d.n || 0)}
};
function dreamTick(){
  const L = stats.dreams || (stats.dreams = []);
  for (const d of L){ if (d.done) continue; const I = isl(d.isl), p = I && I.people && I.people.find(q => q.id === d.pid);
    if (!p || tick > d.at + 3600){ d.done = -1; continue; }   // moved away, grown old, or dreamt long enough: it fades, no penalty
    if (DREAMS[d.k].ok(p, I, d)){ d.done = tick; stats.traeume = (stats.traeume || 0) + 1; mana += 3;
      if (!awayQuiet) rewardPop({ic:DREAMS[d.k].ic, rare:2, kicker:'Wunsch erfüllt', title:p.n, text:`${p.n} auf ${I.name}: ${DREAMS[d.k].done}`, gain:3});
      lifeEvent(p, 'wunsch', DREAMS[d.k].n);
      if (Math.random() < .45) setTimeout(() => gainFind(rollFind(['ahnen']), `Geschenk der Familie von ${p.n}.`), awayQuiet ? 0 : 5200); } }
  for (let i = L.length - 1; i >= 0; i--) if (L[i].done && tick - Math.abs(L[i].done) > 600) L.splice(i, 1);
  if (tick < (stats.dreamAt ?? YEAR)) return; stats.dreamAt = tick + 240 + Math.floor(Math.random() * 180);
  const I = pickOf(villages().filter(q => q.people && q.people.length >= 6 && L.filter(d => !d.done && d.isl === q.id).length < 2)); if (!I) return;
  const busy = new Set(L.filter(d => !d.done).map(d => d.pid)), adults = I.people.filter(p => isAdult(p) && !busy.has(p.id)); if (!adults.length) return;
  const p = pickOf(adults), ks = Object.keys(DREAMS).filter(k => !DREAMS[k].ok(p, I, {at:tick, n:I.buildings.filter(b => (b.kind === 'pfosten' || b.kind === 'ahnenhaus') && !b.bt).length}) && (k !== 'tatau' || ageOf(p) < 30));
  if (!ks.length) return; const k = pickOf(ks);
  L.push({pid:p.id, isl:I.id, k, at:tick, n:I.buildings.filter(b => (b.kind === 'pfosten' || b.kind === 'ahnenhaus') && !b.bt).length});
  hush(`${p.n} auf ${I.name} ${DREAMS[k].n}. ${DREAMS[k].how}`);
}
const dreamOf = (I, p) => (stats.dreams || []).find(d => !d.done && d.isl === I.id && d.pid === p.id) || null;

/* ---------- 4. the clans remember: generous gifts, now and then answered with something precious */
const CLAN_TREASURE = {feuer:'obsidian', riff:'armring', hain:'tapamuster', nord:'stabkarte', alte:'ehrenmatte'};
function clanFavor(T){
  const C = T && T.clan; if (!C) return; const F = stats.favor || (stats.favor = {}), n = F[C.id] = (F[C.id] || 0) + 1;
  if (n === 3 || n === 7 || n % 12 === 0){ const id = CLAN_TREASURE[C.id] && foundOf()[CLAN_TREASURE[C.id]] == null ? CLAN_TREASURE[C.id] : rollFind(['ahnen', 'land'], 1);
    setTimeout(() => gainFind(id, `Geschenk vom ${C.name || 'Clan'} für eure Gaben.`), awayQuiet ? 0 : 1500); }
}

/* ---------- 5. rare sights: now and then something to see on the island you look at; tap it before it is gone */
let sights = [];
const SIGHT_POOL = ['wal', 'schildkroete', 'fregatt', 'regenbogen', 'sternschnuppe', 'mondhof', 'leuchtsee', 'plejaden', 'treibstamm', 'kauri', 'quelle', 'kurkuma', 'tritonhorn'];
function sightTick(){
  sights = sights.filter(q => q.until > tick);
  if (awayQuiet || catching || lod === 'far' || sights.length || tick < (stats.sightAt ?? 200)) return;
  const I = isl(active); if (!I || !I.settled || !I.lands || !I.lands.length) return;
  stats.sightAt = tick + 120 + Math.floor(Math.random() * 120);
  const L = pickOf(I.lands).poly, v = pickOf(L), c = I.center, d = Math.hypot(c.x - v.x, c.y - v.y) || 1, off = Math.random() < .5 ? -10 : 14;
  sights.push({isl:I.id, x:v.x + (v.x - c.x) / d * off, y:v.y + (v.y - c.y) / d * off, find:pickOf(SIGHT_POOL), until:tick + 45});
}
function claimSight(q){ sights = sights.filter(s => s !== q); stats.sicht = (stats.sicht || 0) + 1; gainFind(q.find, `Gesehen auf ${isl(q.isl).name}.`); }

/* every tick, from the economy */
function fortuneTick(){
  if (catching) return;
  voyageTick(); crisisTick(); if (tick % 3 === 0) dreamTick(); sightTick();
}
