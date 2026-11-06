// Rules: work by person, builders called from work, pairs, picks, families by canoe, births, kin, plaza, save and load.
const {chromium}=require('playwright');
const {PAGE} = require('./lib');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n').slice(1,4).join(' ')));
await p.goto(PAGE);await p.waitForTimeout(1800);
const r = await p.evaluate(()=>{
  try {
  window.save = () => {}; const out = [], bad = [], want = (c, m) => { if (!c) bad.push(m); };
  newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9;
  const I = isl('heimat'), done = b => { delete b.bt; b.got = 0; done0(I, b); }, done0 = (I, b) => { if (KINDS[b.kind].canoe) b.boat = 0; };
  const put = kind => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); const b = addB(I, kind, q, variant(kind), tick); I.staff = null; syncWalkers(); return b; };
  const run = (n, ships = true) => { for (let t = 0; t < n; t++){ for (let k = 0; k < 40; k++){ stepWalkers(50); if (ships) stepShips(performance.now(), 50); } walkAt = performance.now(); econ(); if (sheetKind) closeSheet(); } };
  // the start
  want(I.pop === 4 && famsOf(I).length === 1 && I.people.every(isAdult), 'start: one family of four, all work');
  want(I.buildings.some(b => b.kind === 'platz') && I.buildings.filter(b => b.kind === 'haus').length === 1, 'start: a hut and its plaza');
  want(!I.deco.some(d => d.t === 'garden' || d.t === 'plaza'), 'no taro deco');
  const pz = I.buildings.find(b => b.kind === 'platz'), h0 = I.buildings.find(b => b.kind === 'haus'); out.push(`plaza ${Math.round(Math.hypot(pz.x - h0.x, pz.y - h0.y))} from the hut`); want(Math.hypot(pz.x - h0.x, pz.y - h0.y) < 45, 'plaza next to the hut');
  setBar('build'); want(!document.querySelector('#buildList [data-kind=platz]'), 'plaza not in the build bar'); want(!!document.querySelector('#buildList [data-kind=ernte]'), 'Erntehaus in the build bar'); setBar(null);
  want(!document.querySelector('#buildList [data-kind=regen]') && !KINDS.regen && !KINDS.riff && !KINDS.kletterer && !KINDS.deckerin, 'old kinds gone');
  // work by person: the old bug, free people that could not be sent anywhere
  I.handWork = true; const e = put('ernte'), f = put('faeller'); for (const q of I.people) q.job = 0; I.staff = null;
  let sent = 0; for (let i = 0; i < 6; i++){ const x = workAdd(I, i % 2 ? f : e); if (x) sent++; }
  const sf = staffOf(I); out.push(`sent ${sent}, free ${sf.free}, crews ${crewAt(I, e)}/${crewAt(I, f)}`); want(sent === 4 && sf.free === 0, 'every free person can be sent');
  want(!workAdd(I, e), 'full place refuses'); workDel(I, f); want(staffOf(I).free === 1, 'one called off is free'); workAdd(I, f);
  // teams
  out.push(`team: fell alone ${teamF(KINDS.faeller, 1)}, pot alone ${teamF(KINDS.toepfer, 1)}, grind alone ${teamF(KINDS.beil, 1)}`); want(teamF(KINDS.faeller, 1) < .35 && teamF(KINDS.beil, 1) === .5, 'team factors');
  // a building site when nobody is free: two leave their work
  const site = addB(I, 'haus', findSpot(I, 'haus', {x:h0.x + 40, y:h0.y}), variant('haus'), tick); site.bt = KINDS.haus.bt; site.got = 0; I.staff = null;
  const s2 = staffOf(I), pl = [...s2.pulled.keys()]; out.push(`site crew ${crewAt(I, site)}, pulled ${pl.map(b => b.kind).join(',')}`); want(crewAt(I, site) === 2 && pl.length === 1, 'site takes two from a job');
  e.idle = workState(I, pl[0]); want(workState(I, pl[0]) && workState(I, pl[0]).why === 'bau', 'pulled place says why');
  run(60); out.push(`after 60 ticks: site ${site.bt ? Math.round(site.bt) : 'done'} wood ${I.stock.holz} fronds ${I.stock.dach}`);
  // picks: the Erntehaus goes for water when there is none
  delete site.bt; I.staff = null; syncWalkers(); I.stock.wasser = 0; I.stock.nahrung = 20; I.stock.kokos = 15; choosePick(I, e); out.push(`pick with no water: ${choiceOf(e)}`); want(choiceOf(e) === 'wasser', 'water first');
  I.stock.wasser = 18; I.stock.dach = 0; e.want = null; choosePick(I, e); out.push(`pick with no fronds: ${choiceOf(e)}`);
  e.v.pick = 'dach'; want(choiceOf(e) === 'dach' && prodOf(e) === 'dach', 'pinned pick'); delete e.v.pick;
  // families by canoe: the new hut stands empty
  Object.assign(I.stock, {nahrung:20, wasser:20}); I.immigAt = 0; run(3);
  const sh = immigFor(I); out.push(`canoe: ${sh ? sh.immig.from + ' ' + sh.immig.people.length + ' ' + sh.state : 'none'}`); want(!!sh, 'a canoe comes for the empty hut');
  for (let i = 0; i < 80 && sh && sh.state !== 'moored'; i++) run(1);
  out.push(`canoe state ${sh && sh.state}`); want(sh && sh.state === 'moored', 'canoe lands');
  openSheet('immig', {ship:sh.id}); want(/Aufnehmen/.test($('sheetBody').textContent), 'request sheet'); await0 = null;
  const pop0 = I.pop; immigAnswer(sh, true); out.push(`pop ${pop0} -> ${I.pop}, lines ${linesOf(I).length}, kin ${kinState(I)} ${kinDiv(I).toFixed(2)}`); want(I.pop > pop0 && linesOf(I).length === 2, 'family moves in with a new line');
  want(famsOf(I).every(f => f.home), 'everyone has a roof');
  // births: none in huts, then a family house
  const nd0 = needsOf(I); want(!growTarget(I, nd0.list), 'no births in huts');
  Object.assign(I.stock, {holz:6, faser:6, schnur:6}); const home = homesOf(I).find(b => famOfHome(I, b) && membersOf(I, famOfHome(I, b)).some(p => p.s === 'f' && ageOf(p) > 18)); want(canUpgrade(I, home), 'can upgrade'); upgradeHouse(I, home);
  out.push(`house tier ${tierOf(home)} room ${homeCap(I, home)}`); want(tierOf(home) === 2, 'family house');
  I.stock.speisen = 10; const g = growTarget(I, needsOf(I).list); want(!!g, 'birth target in family house');
  I.birthAcc = BIRTH_EVERY; const popB = I.pop; birthTick(I); const kid = I.people[I.people.length - 1];
  const mom = membersOf(I, famOfHome(I, g)).find(p => p.s === 'f' && isAdult(p)); out.push(`birth: pop ${popB} -> ${I.pop}, child ${kid.n} line ${kid.ln} mother line ${mom && mom.ln}, weak ${!!kid.wk}`); want(I.pop === popB + 1 && kid.ln === mom.ln && ageOf(kid) < .1, 'child of the mother line');
  // kin
  const T = {people:[1,1,1,1,2,2,2,2,3,3,3,3].map(l => ({ln:l}))}; out.push(`3 equal lines: ${kinDiv(T).toFixed(2)} ${kinState(T)}; one line: ${kinState({people:[{ln:1},{ln:1}]})}`); want(kinState(T) === 'ok' && kinState({people:[{ln:1}]}) === 'out', 'kin states');
  // the overview and sheets
  openSheet('needs'); const txt = $('sheetBody').textContent; want(/Verwandtschaft/.test(txt) && /Zuzug und Kinder/.test(txt) && /Arbeit/.test(txt), 'overview sections'); out.push('overview ok: ' + /Menschen sind frei|Alle haben Arbeit|Mensch ist frei/.test(txt));
  select(e); want(/Von selbst/.test($('sheetBody').textContent) && /Grüne Nüsse/.test($('sheetBody').textContent), 'pick chips'); closeSheet();
  select(home); want(/Linie/.test($('sheetBody').textContent), 'line shown on house'); closeSheet();
  // the meeting house belongs at the plaza
  out.push('halle far: ' + check('halle', I, I.center.x + 120, I.center.y + 60) + ' | near: ' + (check('halle', I, pz.x + 30, pz.y + 4) || 'ok'));
  // fishers in pairs
  const fi = put('fisch'); delete fi.boat; I.handWork = false; I.staff = null; for (const q of I.people) if (q.job === f.id) q.job = 0; I.staff = null; syncWalkers();
  let pair = 0; for (let t = 0; t < 120 && !pair; t++){ run(1, false); if (walkers.some(w => w.mate && w.boat && w.job && w.job.b === fi)) pair = tick; }
  out.push(`fishers out together: ${pair ? 'yes' : 'no'} crew ${crewAt(I, fi)} pick ${choiceOf(fi)}`); want(pair, 'two in one canoe');
  // save and load
  const raw = serialize(); restore(raw); const J = isl('heimat');
  out.push(`after load: pop ${J.pop} jobs ${J.people.filter(q => q.job).length} lines ${linesOf(J).length} plaza ${!!J.buildings.find(b => b.kind === 'platz')} names ${Object.keys(LINES).length}`); want(J.people.some(q => q.job) && linesOf(J).length >= 2, 'save keeps work and lines');
  // household crafts: not in the build bar; a house takes one up, it saves, it goes with its house
  { stats.peakPop = Math.max(stats.peakPop || 0, 25); stageTick(); const H = isl('heimat'), hh = homesOf(H)[0]; renderBuildBar();
    want(!CRAFT_KINDS.some(k => $('buildList').querySelector(`[data-kind="${k}"]`)), 'craft: a workshop still in the build bar');
    setCraft(H, hh, 'schnur'); const c = craftOf(H, hh); want(c && c.kind === 'schnur' && placesOf(H).includes(c), 'craft: not taken up (' + craftWhy(H, hh, 'schnur') + ')');
    if (c) select(c); want(sheetKind === 'info' && findB(sheetData.id) === hh && /data-act="craft"/.test($('sheetBody').innerHTML), 'craft: the sheet of a craft is not its house'); closeSheet();
    restore(serialize()); const H2 = isl('heimat'), h2 = findB(hh.id); want(craftOf(H2, h2) && craftOf(H2, h2).kind === 'schnur', 'craft: lost on load');
    H2.buildings = H2.buildings.filter(b => b !== h2); cleanCrafts(H2); want(!H2.buildings.some(b => b.at === hh.id), 'craft: stays without its house');
    out.push(`craft: ${CRAFT_KINDS.length} household crafts, ${craftsHere(H2).length} here`); }
  // the craft comes first, either or: its family leaves the other work; an old workshop becomes a craft; nobody stands about
  { const H = isl('heimat'); H.handWork = false; H.zeal = 1; const hh = homesOf(H).find(h => famOfHome(H, h) && famAdults(H, famOfHome(H, h)).length);
    if (hh){ for (const p of famAdults(H, famOfHome(H, hh))) if (!p.job){ const pl = placesOf(H).find(b => !b.at && !b.prio); if (pl) p.job = pl.id; } H.staff = null; staffOf(H);
      setCraft(H, hh, 'schnur'); const c = craftOf(H, hh), sf = staffOf(H), ids = sf.crewP.get(c) || [], who = ids.map(id => H.people.find(p => p.id === id));
      want(c && ids.length === crewOf(c) && who.every(p => p && p.h === famOfHome(H, hh).id), 'craft first: not worked by its own family');
      want(who.every(p => p && [...sf.crewP].filter(([b, l]) => l.includes(p.id)).length === 1), 'craft first: someone works at two places');
      setCraft(H, hh, null); }
    const hf = homesOf(H).find(h => !craftOf(H, h)), old = addB(H, 'flecht', {x:hf.x + 30, y:hf.y}, {}, tick); H.staff = null; oldShops(H);
    want(!H.buildings.includes(old) && H.buildings.some(b => b.kind === 'flecht' && b.at), 'old workshop not turned into a craft');
    for (const b of H.buildings.filter(b => b.kind === 'flecht' && b.at)) setCraft(H, findB(b.at), null);
    // more people than places: they help where something is short, or rest when the island has much free time
    const extra = []; for (let i = 0; i < 8; i++){ const q = {...H.people.find(isAdult)}; q.id = 900000 + i; q.job = 0; q.n = 'Helfer' + i; extra.push(q); H.people.push(q); }
    H.staff = null; const sf = staffOf(H), nh = [...sf.help.values()].reduce((t, n) => t + n, 0);
    out.push(`helpers: ${nh}, still free ${sf.free}, team with one helper ${teamF(KINDS.faeller, KINDS.faeller.crew + 1).toFixed(2)}`);
    want(nh > 0 && [...sf.help].every(([b, n]) => n <= crewOf(b) && (sf.crew.get(b) || 0) <= 2 * crewOf(b)), 'helpers: none, or too many at one place');
    want(teamF(KINDS.faeller, KINDS.faeller.crew + 1) > 1 && teamF(KINDS.faeller, 9 * KINDS.faeller.crew) <= 1.5, 'helpers: team factor');
    H.zeal = 0; H.staff = null; const sr = staffOf(H); updateHUD(); want(!sr.help.size && sr.rest && $('idleNum').textContent === '0', 'free time: the free are shown as jobless');
    H.zeal = 1; H.people = H.people.filter(p => !extra.includes(p)); H.staff = null; }
  // the year: canoes fast in the trade wind, pots slow in the rain, feasts count more after the yam harvest
  { const H = isl('heimat'), t0 = tick, tp = {kind:'toepfer'}, at = id => { while (seasonOf().id !== id) tick++; }, F = FEASTS.find(q => q.id === 'gross');
    at('sturm'); const wet = [seasonOf().sea, seasonalEvery(H, tp, KINDS.toepfer)]; at('passat'); const dry = [seasonOf().sea, seasonalEvery(H, tp, KINDS.toepfer)];
    want(dry[0] > 1 && wet[0] < 1 && wet[1] > KINDS.toepfer.every && dry[1] < KINDS.toepfer.every, `year: seasons do not steer canoes and pots (${wet} ${dry})`);
    const y0 = H.yamAt; H.yamAt = tick; want(feastMana(H, F) > F.mana, 'year: no bonus for a feast after the yam harvest'); H.yamAt = y0; tick = t0;
    out.push(`year: canoes ${wet[0]}/${dry[0]}, pots every ${wet[1]}/${dry[1]} in storm/trade wind`); }
  // shell hooks: the fishers catch more and wear them out; wooden bowls stand in for pots only from Hawaiki on
  { const H = isl('heimat'), fb = H.buildings.find(b => b.kind === 'fisch') || addB(H, 'fisch', findSpot(H, 'fisch', startSpot(H, KINDS.fisch)), variant('fisch'), tick);
    delete fb.boat; fb.idle = null; const sum = n => { let g = 0; for (let i = 0; i < 40; i++){ H.stock.fisch = 0; g += landCatch(H, fb, 2, 'fisch'); } return g; };
    const fr = H.reefLife; H.stock.schnur = 0; H.stock.haken = 0; const plain = sum(); H.reefLife = fr; H.stock.haken = 30; const hooked = sum(); H.reefLife = fr;
    want(hooked > plain * 1.2 && H.stock.haken < 30, `hooks: no more fish or no wear (${plain} → ${hooked}, ${H.stock.haken} hooks left)`);
    out.push(`hooks: 40 trips ${plain} fish, with hooks ${hooked}, ${30 - H.stock.haken} hooks used`);
    const pots = () => haveOf(H, 'toepfe'); H.stock.toepfe = 0; H.stock.kumete = 5; const h0 = stats.hawaiki;
    stats.hawaiki = 0; const before = pots(), carve0 = !craftIsle(H, 'schnitzer'); stats.hawaiki = 1; const after = pots();
    want(before === 0 && after === 5 && !carve0, `bowls: before Hawaiki ${before}, after ${after}, carving early ${carve0}`); stats.hawaiki = h0; H.stock.kumete = 0; }
  // tatau: the young who have come of age get their pattern at a feast in the meeting house; it stays with them
  { const H = isl('heimat'); if (!H.buildings.some(b => b.kind === 'halle')) addB(H, 'halle', findSpot(H, 'halle', startSpot(H, KINDS.halle)) || {x:H.center.x, y:H.center.y}, {}, tick);
    const T = FEASTS.find(q => q.id === 'tatau'), young = youthsOf(H); Object.assign(H.stock, {nahrung:20, speisen:10, klingen:2}); H.feastAt = 0; const m0 = mana, gain = feastMana(H, T);
    holdFeast(H, T); want(young.length && young.every(p => p.tt) && mana - m0 === gain && gain >= T.mana + T.per, `tatau: ${young.length} young, gain ${mana - m0} of ${gain}`);
    restore(serialize()); const H2 = isl('heimat'); want(young.every(p => H2.people.find(q => q.id === p.id && q.tt)), 'tatau: pattern lost on load');
    out.push(`tatau: ${young.length} young, Ansehen +${gain}`); }
  // rats: they eat from the field crops in store, a storehouse on posts halves it, two keep them off
  { const H = isl('heimat'), keep = H.buildings.slice(), g0 = H.grace; H.grace = 0; H.buildings = H.buildings.filter(b => b.kind !== 'speicher');
    const eat = () => { H.stock.nahrung = 40; H.ratAcc = 0; for (let i = 0; i < 4; i++){ tick += 30 - tick % 30; ratTick(H); H.stock.nahrung = 40; } return H.ratAte; };
    H.ratAte = 0; const none = eat(); const sp = addB(H, 'speicher', {x:H.center.x, y:H.center.y}, {}, tick); H.ratAte = 0; const one = eat(); addB(H, 'speicher', {x:H.center.x + 20, y:H.center.y}, {}, tick); H.ratAte = 0; const two = eat();
    want(none > one && one > two && two === 0, `rats: no storehouse ${none}, one ${one}, two ${two}`); out.push(`rats in 4 minutes with 40 crops in store: ${none}, with one storehouse ${one}, with two ${two}`);
    H.buildings = keep; H.grace = g0; }
  // the canarium nut tree: grows long, then gives field crops and now and then provisions
  { const H = isl('heimat'), nb = addB(H, 'nussbaum', findSpot(H, 'nussbaum', startSpot(H, KINDS.nussbaum)) || {x:H.center.x, y:H.center.y}, {}, tick); nb.bt = KINDS.nussbaum.bt;
    const p0 = H.stock.proviant || 0; let grew = -1; for (let t = 1; t < KINDS.nussbaum.bt + 200; t++){ econ(); if (!nb.bt && grew < 0) grew = t; }
    want(grew >= KINDS.nussbaum.bt * .9 && (H.stock.proviant || 0) > p0, `nut tree: grown after ${grew}, provisions ${p0} → ${H.stock.proviant || 0}`); out.push(`nut tree: bears after ${grew} ticks, provisions ${p0} → ${H.stock.proviant || 0}`); }
  // squalls: in the storm months a double canoe at sea can lose provisions, never in the trade wind months
  { const t0 = tick, r0 = Math.random, sh = {name:'Test', cargo:{proviant:5}}; Math.random = () => 0;
    while (seasonOf().id !== 'passat') tick++; const calm = squall(sh); while (seasonOf().id !== 'sturm') tick++; const rough = squall(sh);
    Math.random = r0; tick = t0; want(calm === 0 && rough === 2 && sh.cargo.proviant === 3, `squall: passat ${calm}, sturm ${rough}`); out.push(`squall: storm months cost ${rough} provisions, trade wind ${calm}`); }
  // finding land: birds show hidden land near the known sea even without a navigator, a tap on them says so
  { rollAhead(); hintCache = null; const hs = navHints(), h = hs[0]; want(hs.length && /liegt Land/.test(signAt({x:h.I.center.x, y:h.I.center.y})), 'signs: no birds over hidden land without a navigator');
    out.push(`signs: ${hs.length} hidden islands shown by birds`); }
  // Hawaiki: kava, fine mats, painted tapa, scented oil and the chief's house only after the great voyage
  { const late = ['kavagarten', 'weberin', 'malerin', 'duftoel', 'fale'], H = isl('heimat'), M = isl('tochter'), x0 = M.center.x, s0 = M.settled;
    stats.peakPop = 60; stageTick(); want(!late.some(unlocked) && unlocked('trommel'), 'Hawaiki: late things open before the great voyage');
    want(!clanMakes(CLANS.hain).includes('kava') && !festivalParts(H).some(q => q.P.id === 'kava') && !lifeOf(H).includes('kava'), 'Hawaiki: kava before the great voyage');
    M.center.x = FAR_X + 10; M.settled = true; stageTick(); M.center.x = x0; M.settled = s0;
    want(late.every(unlocked) && hawaiki() && lifeOf(H).includes('kava') && clanMakes(CLANS.hain).includes('kava'), 'Hawaiki: not open after a village on the far islands');
    out.push(`Hawaiki: stage ${STAGES[stageNow()].n}, chief quest after ${QUESTS[QUESTS.findIndex(Q => Q.id === 'chief') - 1].id}`);
    want(QUESTS.findIndex(Q => Q.id === 'chief') > QUESTS.findIndex(Q => Q.id === 'fern'), 'Hawaiki: chief quest before the far village'); }
  // the long pause and the second voyage: the Leere See is empty, the morning islands have no clans, only the voyaging canoe
  // crosses, and it can be built once a navigator in Hawaiki knows the star path
  { let empty = 0, morn = 0, clans = 0;
    for (let cx = EMPTY_X / CELL; cx < W / CELL; cx++) for (let cy = 0; cy < H / CELL; cy++){ const J = genCell(seed, cx, cy, home0, new Set()); if (!J) continue; if (cx * CELL < MORN_X) empty++; else { morn++; if (J.clan) clans++; } }
    const H0 = isl('heimat'), dc = makeShip('dc', H0), vk = makeShip('vaka', H0), far = {x:EMPTY_X + 400, y:H0.center.y};
    want(!empty && morn > 5 && !clans, `pause: Leere See ${empty} islands, morning ${morn}, clans ${clans}`);
    want(!sailTo(dc, far, true) && sailTo(vk, far, true), 'pause: a double canoe crosses the Leere See, or the voyaging canoe does not');
    ships = ships.filter(q => q !== dc && q !== vk);
    stats.peakPop = 60; const h0 = stats.hawaiki, p0 = stats.pause; stats.hawaiki = 1; stats.pause = 0; loreCache = null; stageTick(); const before = unlocked('vaka');
    const pp = H0.people.find(isAdult), nv = pp.nv; pp.nv = 3.2; loreCache = null; stageTick(); const after = unlocked('vaka') && stats.pause;
    pp.nv = nv; loreCache = null; want(!before && after && unlocked('vaka'), `pause: vaka before ${before}, after ${after}, after the navigator ${unlocked('vaka')}`);
    stats.hawaiki = h0; out.push(`pause: ${morn} morning islands, no clans there; the voyaging canoe opens with the star path`); }
  out.push('BAD: ' + (bad.join('; ') || 'none'));
  return out.join('\n');
  } catch (e){ return 'ERR ' + e.message + ' ' + e.stack; }
});
console.log(r);
console.log('errors', errs); await b.close();})();
