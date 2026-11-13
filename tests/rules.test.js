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
    if (c) select(c); want(sheetKind === 'info' && findB(sheetData.id) === hh && /data-act="craft/.test($('sheetBody').innerHTML), 'craft: the sheet of a craft is not its house'); closeSheet();
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
    H.zeal = 0; H.staff = null; const sr = staffOf(H); updateHUD(); want(!sr.help.size && sr.rest && /^\d+$/.test($('satNum').textContent), 'free time: no contentment shown');
    // contentment: the top bar shows the average; a tap shows the least content person; more free time raises everyone's value
    { const adult = H.people.find(isAdult); H._sat = null; const a0 = satTick(H).by.get(adult.id); H.zeal = 2; H._sat = null; const a2 = satTick(H).by.get(adult.id);
      want(a2 < a0, `contentment: much work does not lower it: ${a0} → ${a2}`);
      adult.meal = 2; H._sat = null; const S = satTick(H); want(S.all[0][0] === adult || S.all[0][1].v <= S.by.get(adult.id), 'contentment: the thirsty one is not among the least content');
      want(S.all.every(([, t], i, A) => !i || A[i - 1][1].v <= t.v), 'contentment: the list is not sorted'); adult.meal = 0;
      updateHUD(); $('satBtn').click(); want(sheetKind === 'sat' && /Am wenigsten/.test($('sheetBody').textContent) && $('sheetBody').querySelector('.satbar').getBoundingClientRect().height > 4, 'contentment: the sheet does not show the least content and the band');
      want(!!$('sheetBody').querySelector('input[type=range]'), 'contentment: no free-time slider on the sheet'); closeSheet(); H._sat = null; }
    H.zeal = 1; H.people = H.people.filter(p => !extra.includes(p)); H.staff = null; }
  // the village centre: the house by the plaza; its sheet shows the village, the store and the family; the rain dance
  { const H = isl('heimat'), cz = centerOf(H), pz = H.buildings.find(b => b.kind === 'platz');
    want(cz && pz && homesOf(H).every(h => Math.hypot(h.x - pz.x, h.y - pz.y) >= Math.hypot(cz.x - pz.x, cz.y - pz.y)), 'centre: not the house by the plaza');
    select(cz); const body = () => $('sheetBody').innerHTML;
    want(/Dorfzentrum/.test(body()) && /data-act="rain"/.test(body()) && /data-act="koruru"/.test(body()), 'centre: the village tab lacks the rain dance or the knucklebones');
    sheetData = {...sheetData, tab:'lager'}; renderSheet(); want(/class="nm"/.test(body()), 'centre: the store has no names');
    sheetData = {...sheetData, tab:'haus'}; renderSheet(); want(/needtiles/.test(body()) && !/class="cord"/.test(body()), 'house: still the knot cord');
    closeSheet();
    // feasts at the centre, without a meeting house
    const halls = H.buildings.filter(b => b.kind === 'halle'); H.buildings = H.buildings.filter(b => b.kind !== 'halle');
    want(!/Versammlungshaus|Dorfzentrum/.test(feastState(H, FEASTS[0])), 'feasts: still need the meeting house'); H.buildings.push(...halls);
    // the rain dance: fed dancers, the drought ends, water while it rains, once a moon
    const keepS = {...H.stock}, t0 = tick; while (seasonOf().id === 'sturm') tick++;
    Object.assign(H.stock, {nahrung:20, wasser:0}); H.drought = tick + 99; H.rainAt = 0; H.rainUntil = 0;
    want(!rainState(H), 'rain: cannot dance (' + rainState(H) + ')'); rainDance(H);
    want(H.drought === 0 && (H.stock.nahrung || 0) === 20 - RAIN.cost.roh && /tanzt/.test(rainState(H)), 'rain: dance does not pay or end the drought');
    for (let i = 0; i < RAIN.dance + 4; i++) econ();
    out.push(`rain dance: water after ${RAIN.dance + 4} ticks ${H.stock.wasser}, state "${rainState(H)}"`); want(raining(H) && H.stock.wasser > 0, 'rain: no water from the rain');
    tick = H.rainUntil + 1; want(/Wieder in/.test(rainState(H)), 'rain: can dance again at once');
    tick = t0; H.rainAt = 0; H.rainUntil = 0; H.drought = 0; Object.assign(H.stock, keepS); }
  // a workplace always shows its fixed places; helpers get marks of their own after them
  { const H = isl('heimat'); H.handWork = false; H.zeal = 1; const extra = []; for (let i = 0; i < 6; i++){ const q = {...H.people.find(isAdult)}; q.id = 910000 + i; q.job = 0; q.loan = 0; q.n = 'Gast' + i; extra.push(q); H.people.push(q); }
    H.staff = null; const sf = staffOf(H), on = presentAt(H); let checked = 0;
    for (const [b, n] of sf.help){ const sl = slotsOf(H, b, sf, on); checked++;
      want(sl.filter(k => k.startsWith('aid')).length >= n && sl.length >= KINDS[b.kind].crew, `helpers: marks of ${b.kind} do not show them: ${sl}`); }
    want(checked > 0, 'helpers: none to check');
    // the own place is kept: a borrowed worker comes back, and the place keeps a mark for them
    const pl = placesOf(H).find(b => !b.at && (sf.home.get(b) || []).length), pid = pl && sf.home.get(pl)[0], who = pid && H.people.find(p => p.id === pid);
    if (who){ who.loan = 0; const s = H.buildings.find(b => b.bt) || (() => { const q = findSpot(H, 'haus', startSpot(H, KINDS.haus)); const nb = addB(H, 'haus', q, variant('haus'), tick); nb.bt = KINDS.haus.bt; return nb; })();
      H.siteCrew = {[s.id]:[pid]}; H.staff = null; const s2 = staffOf(H);
      want(who.job === pl.id, 'Stammplatz: lost while building');
      if (s2.loan.get(pid) === s.id) want(slotsOf(H, pl, s2, presentAt(H)).includes('away'), 'Stammplatz: no mark for the one away');
      H.buildings = H.buildings.filter(b => b !== s); H.siteCrew = {}; H.staff = null; const s3 = staffOf(H);
      want(who.job === pl.id && (s3.crewP.get(pl) || []).includes(pid), 'Stammplatz: not back after building'); }
    H.people = H.people.filter(p => !extra.includes(p)); H.staff = null; }
  // the old sit at the household craft at half strength; children come seldom without a surplus; the elders say why none come
  { const H = isl('heimat'); H.handWork = false; const hh = homesOf(H).find(h => famOfHome(H, h)), f = famOfHome(H, hh);
    const o = Object.assign(person(H, 47), {h:f.id, l:Math.round(80 * YEAR)}); H.people.push(o); H.pop++; setCraft(H, hh, 'schnur'); const c = craftOf(H, hh); H.staff = null;
    const sf = staffOf(H); want(c && (sf.crewP.get(c) || []).includes(o.id) && sf.oldAt.get(c) === 1, 'old: not at the craft of their house');
    want(c && workSpeed(H, c, 1) < workSpeed(H, {...c, at:0}, 1) * .6, 'old: not at half strength');
    syncWalkers(); const w = walkers.find(q => q.pid === o.id); want(w && w.old && w.job && w.job.b === c, 'old: figure does not walk to the craft');
    want(/Hauswerk|Sennit/.test(personWork(H, o)) || personWork(H, o).startsWith('alt,'), 'old: work not named');
    setCraft(H, hh, null); H.people = H.people.filter(p => p !== o); H.pop--; H.staff = null;
    const nd = needsOf(H); out.push(`births: surplus ${surplus(H, nd.list)} lean target ${!!growTarget(H, nd.list, true)} why "${birthWhy(H, nd.list)}"`);
    want(LEAN_BIRTH > 0 && LEAN_BIRTH < 1, 'births: no lean rate');
    H.lastBirth = tick - 4 * YEAR; const A = adviceOf(H); out.push(`advice after 4 years without a child: ${A && A.t}`);
    const am = ageMix(H); want(am.kid + am.adult + am.old === H.people.length, 'age mix does not add up');
    H.lastBirth = tick;
    // the masters: their grown-ups leave the fields, the sea and the forest; a craft of theirs works a quarter faster
    const mh = homesOf(H).find(h => famOfHome(H, h) && famAdults(H, famOfHome(H, h)).length), mf = famOfHome(H, mh), t0 = mh.t; mh.t = 3; H.staff = null;
    const sm = staffOf(H), low = [...sm.crewP].filter(([b, ids]) => !b.bt && !b.at && rankOf(b) < 3 && ids.some(id => famAdults(H, mf).some(p => p.id === id)));
    want(!low.length || (F => F.food < F.n || F.water < F.n)(mealFore(H)), 'master: still in the fields');   // only when the morning meal falls short do all go out
    setCraft(H, mh, 'schnur'); const mc = craftOf(H, mh); want(mc && masterF(mc) === 1.25, 'master: craft not faster');
    setCraft(H, mh, null); mh.t = t0; H.staff = null;
    // ratios and the chain
    const fe = H.buildings.find(b => b.kind === 'ernte' && !b.bt); want(!fe || fullRate(H, fe) > 0, 'ratio: no full rate');
    const ch = chainMarkup(H, 'schnur'); want(/Kokosfasern/.test(ch) && /Familienhaus|Ausleger|Fischer|→/.test(ch), 'chain: sennit chain incomplete ' + ch.replace(/<[^>]+>/g, ''));
    out.push('chain: ' + ch.replace(/<svg.*?<\/svg>/g, '').replace(/<[^>]+>/g, '')); }
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
    if (!youthsOf(H).length){ const q = H.people.find(isAdult); if (q){ q.b = tick - 17 * YEAR; q.tt = false; } }   // someone just come of age, whatever the dice said
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
  // roofs wear and the family covers them anew with palm fronds (a family house with wood as well); without fronds they leak
  { const H = isl('heimat'), hh = homesOf(H).find(h => famOfHome(H, h)), keepS = {...H.stock}, t1 = hh.t;
    // while you are away it simply happens
    awayQuiet = true; hh.t = 1; hh.rw = ROOF.mend + .01; H.stock.dach = 10; H.stock.holz = 10; roofTick(H);
    want(hh.rw < .01 && H.stock.dach === 8 && H.stock.holz === 10, `roof: hut not covered anew while away: ${hh.rw.toFixed(2)}, fronds ${H.stock.dach}`);
    hh.t = 2; hh.rw = ROOF.mend + .01; roofTick(H); want(hh.rw < .01 && H.stock.dach === 6 && H.stock.holz === 9, 'roof: a family house takes fronds and wood');
    hh.rw = ROOF.mend + .01; H.stock.dach = 3; roofTick(H); want(hh.rw > ROOF.mend, 'roof: a tight roof waits while fronds are few'); awayQuiet = false;
    // in the game someone of the family goes up and covers it, a few moments, and goes back to work
    { H.stock.dach = 10; H.stock.holz = 10; hh.rw = ROOF.mend + .01; hh.rp = 0; H.staff = null; const f = famOfHome(H, hh), sf = staffOf(H), who = [...sf.loan].find(([, id]) => id === hh.id);
      want(!!who && H.people.find(q => q.id === who[0]).h === f.id, 'roof: nobody of the family goes up to the roof');
      for (let i = 0; i < 40 && hh.rw >= ROOF.mend; i++) run(1, false);
      want(hh.rw < .05 && H.stock.dach <= 8, `roof: not covered anew in the game: ${hh.rw.toFixed(2)}, fronds ${H.stock.dach}`);
      H.staff = null; want(![...staffOf(H).loan.values()].includes(hh.id), 'roof: the roofer does not go back'); }
    hh.rw = ROOF.leak + .01; H.stock.dach = 0; roofTick(H); want(roofState(hh) === 'low', 'roof: no leak without fronds');
    select(hh); sheetData = {...sheetData, tab:'haus'}; renderSheet();
    want(/undicht/.test($('sheetBody').textContent), 'roof: the house does not say its roof leaks'); closeSheet();
    const cap0 = (hh.rw = 0, homeCap(H, hh)); hh.rw = ROOF.broken + .01; want(roofState(hh) === 'out' && homeCap(H, hh) === cap0 - 1, 'roof: a broken roof keeps its room');
    want(/kaputt/.test(roofText(H, hh)), 'roof: no word for a broken roof'); hh.rw = 0;
    // the hearth fire of a family house burns shells or wood
    H.staff = null; want(needsOf(H).list.some(n => n.k === 'brenn'), 'fire: a family house needs no fire');
    // the night fire: at dusk every family house burns one fuel, shells first; a house without fuel stays cold and its people work slower next day
    { const fh = fireHomes(H), nH = fh.length; want(nH > 0, 'fire: no house wants a night fire');
      Object.assign(H.stock, {schalen:100, reisig:0, holz:0}); fireTick(H); want(H.stock.schalen === 100 - nH && fh.every(b => b.fire) && H.fire.cold === 0, `fire: shells not burned at dusk: ${H.stock.schalen}`);
      want(!H.people.some(p => p.cold), 'fire: someone is cold though every house burned');
      Object.assign(H.stock, {schalen:0, reisig:0, holz:0}); fireTick(H); want(H.fire.cold > 0 && fh.every(b => b.fire === false), 'fire: no fuel but no cold house');
      const cp = H.people.find(p => p.cold && isAdult(p)); want(!!cp, 'fire: nobody is cold without fuel');
      if (cp){ H._sat = null; want(mealOf(H, cp.id) < 1, 'fire: a cold night does not slow work');
        want(satOf(H, cp).why.some(w => w.k === 'feuer'), 'fire: a cold night is no reason for discontent'); }
      const F0 = fireFore(H); want(F0 && F0.n === nH, `fire: forecast counts ${F0 && F0.n} houses, not ${nH}`);
      Object.assign(H.stock, {schalen:20}); fireTick(H); want(!H.people.some(p => p.cold), 'fire: still cold after a fire'); H._sat = null; }
    select(hh); sheetData = {...sheetData, tab:'haus'}; renderSheet(); want(/Feuer/.test($('sheetBody').textContent), 'fire: no tile for the fire'); closeSheet();
    // a cyclone: announced, the elders say so, a cord bubble over each loose roof; then people go to the roofs and tie them
    Object.assign(H.stock, {schnur:20, faser:20, dach:20, holz:20}); stormWarn(H, false); const S = H.storm;
    want(S && S.at === tick + STORM.warn, 'storm: no warning');
    const A = adviceOf(H); want(A && A.urgent && A.tie && /Sturm/.test(A.t), `storm: no urgent advice: ${A && A.t}`);
    cam.x = hh.x; cam.y = hh.y; cam.z = 2.4; applyCam(); draw(performance.now());
    const bub = bubbleHits.find(q => Math.hypot(q.x - hh.x, q.y - hh.y) < 60); want(!!bub, 'storm: no cord bubble over a loose roof');
    if (bub) bub.go(); want(H.storm.tie, 'storm: a tap on the bubble does not send people to the roofs');
    H.staff = null; const sf = staffOf(H), roofers = [...sf.loan.values()].filter(id => { const b = findB(id); return b && HOME_KINDS.has(b.kind); });
    want(roofers.length > 0, 'storm: nobody goes to the roofs');
    for (let i = 0; i < STORM.warn + 2 && H.storm; i++) run(1, false);
    const tied = S.tied.length, homes = homesOf(H).filter(h => !h.bt);
    out.push(`storm: ${tied} of ${homes.length} roofs tied, ${homes.filter(h => roofState(h) === 'low').length} leak after it`);
    want(!H.storm && tied > 0, 'storm: no roof tied before it came');
    want(homesOf(H).every(h => h.bt || !S.tied.includes(h.id) || roofState(h) === 'ok'), 'storm: a tied roof tore');
    want(homesOf(H).every(h => h.bt || S.tied.includes(h.id) || roofState(h) !== 'ok' || h.rw === 0), 'storm: a loose roof held');
    for (const h of H.buildings) if (HOME_KINDS.has(h.kind)){ h.rw = 0; delete h.bt; } hh.t = t1; Object.assign(H.stock, keepS); H.staff = null; syncWalkers(); }
  // drift by the shore: a tap brings it in; kauri resin is cut into a talisman at the centre, and it keeps one storm off the roofs
  { const H = isl('heimat'), keepS = {...H.stock}; setActive(H.id); drift = drift.filter(d => !d.shore);
    for (let i = 0; i < 150 && !drift.some(d => d.shore === H.id); i++){ tick++; driftTick(); } want(drift.some(d => d.shore === H.id), "drift: nothing floats by the shore");
    const pt = shorePoint(H); drift.push({id:nextDrift++, k:'kauri', x:pt.x, y:pt.y, t0:tick, shore:H.id}); H.stock.kauri = 0;
    cam.z = 2.4; applyCam(); const d = hitDrift(pt); want(d && d.k === 'kauri', 'drift: a tap does not find the resin');
    if (d) collectDrift(d); want(H.stock.kauri === 1 && !drift.includes(d), 'drift: the resin is not in the store');
    const wm = matriarchOf(H) ? null : Object.assign(person(H, 44), {s:'f', h:famsOf(H)[0].id}); if (wm){ H.people.push(wm); H.pop++; }   // a woman to cut it
    H.stock.schnur = 2; want(!talismanState(H), `talisman: ${talismanState(H)}`); const m0 = mana; cutTalisman(H);
    want(H.stock.talisman === 1 && H.stock.kauri === 0 && mana === m0 + TALISMAN.mana, 'talisman: not cut');
    select(centerOf(H)); sheetData = {...sheetData, tab:'dorf'}; renderSheet(); want(/Talisman der Matriarchin/.test($('sheetBody').textContent), 'talisman: no row at the centre'); closeSheet();
    for (const h of homesOf(H)) h.rw = 0; stormWarn(H, false); tick = H.storm.at; stormTick(H);
    want(!H.stock.talisman && homesOf(H).every(h => roofState(h) === 'ok'), 'talisman: the roofs tore all the same');
    out.push(`drift: ${drift.filter(q => q.shore).length} by the shore, resin taken, talisman cut and used in the storm`);
    if (wm){ H.people = H.people.filter(q => q !== wm); H.pop--; }
    Object.assign(H.stock, keepS); for (const h of H.buildings) delete h.bt; H.staff = null; syncWalkers(); }
  // a new Stammplatz chosen on the person's sheet: a full place swaps; the overview shows tiles; children and the old gather firewood
  { const H = isl('heimat'); H.staff = null; staffOf(H);
    const ps = jobPlaces(H, H.people.find(isAdult)).filter(b => !b.at), full = ps.find(b => H.people.filter(q => q.job === b.id).length >= crewOf(b));
    const a = full && H.people.find(q => isAdult(q) && q.job && q.job !== full.id && fitOf(H)(q, full));
    if (a){ const old = a.job, r = chooseJob(H, a, full); want(r && a.job === full.id && H.people.filter(q => q.job === full.id).length <= crewOf(full), 'Stammplatz: a full place does not swap');
      want(!r.swap || r.swap.job === old || r.swap.job === 0, 'Stammplatz: the one swapped out did not get the old place');
      openSheet('person', {id:H.id, p:a.id}); want(/Stammplatz: /.test($('sheetBody').textContent), 'Stammplatz: the person sheet does not name it'); closeSheet(); }
    else out.push('Stammplatz: no full place to swap');
    openSheet('needs', {tab:'leute'}); want(/class="tier[^"]*"><div class="tier-head">[\s\S]*?needtiles/.test($('sheetBody').innerHTML), 'overview: the steps still show the cord'); closeSheet();
    want(burnFirst('brenn', {schalen:0, reisig:5, holz:5}) === 'reisig' && burnFirst('brenn', {schalen:1, reisig:5, holz:5}) === 'schalen', 'fire: shells, then firewood, then wood');
    const hh = homesOf(H).find(h => famOfHome(H, h)), t0 = hh.t, kid = Object.assign(person(H, 4), {h:famOfHome(H, hh).id}); hh.t = 2; H.people.push(kid); H.pop++;
    const r0 = H.stock.reisig || 0; H._gg = 0; want(gatherers(H) >= 1, 'firewood: a child of four does not gather'); gatherTick(H, 30 * 10);
    want((H.stock.reisig || 0) > r0, `firewood: nothing gathered in ten minutes: ${H.stock.reisig}`);
    out.push(`firewood: ${gatherers(H)} gather, +${perMin(gatherRate(H))} a minute`);
    H.people = H.people.filter(q => q !== kid); H.pop--; hh.t = t0; H.staff = null; syncWalkers(); }
  // the stories of people: births, work, tatau, storms are written down, shown on the sheet and saved
  { const H = isl('heimat'), a = H.people.find(isAdult); a.ev = []; lifeEvent(a, 'kam', 'der Ahnen'); lifeEvent(a, 'arb', 'Erntehaus'); lifeEvent(a, 'tat'); lifeEvent(a, 'tat');
    for (let i = 0; i < 20; i++) lifeEvent(a, 'sturm', 'übersteht einen Sturm ' + i);
    want(a.ev.length <= STORY_MAX && a.ev[0][1] === 'kam', 'story: too long, or the first line lost'); want(a.ev.filter(e => e[1] === 'sturm').length === 2 && a.ev.filter(e => e[1] === 'tat').length === 1, 'story: a storm twice at most, a tatau once');
    openSheet('person', {id:H.id, p:a.id}); want(/Lebensgeschichte/.test($('sheetBody').textContent) && /bekommt das Tatau/.test($('sheetBody').textContent), 'story: not on the sheet'); closeSheet();
    const back = unpackP(packP(a)); want(back.ev && back.ev.length === a.ev.length, 'story: lost in saving');
    const hh = homesOf(H).find(h => famOfHome(H, h)), t0 = hh.t; hh.t = 2; H.stock.nahrung = 30; H.stock.wasser = 30; const kids = H.people.length; let mother = null;
    for (const q of H.people) if (q.s === 'f' && isAdult(q) && q.h === famOfHome(H, hh).id) mother = q;
    if (mother){ H._growTo = hh.id; H._birth = true; const c = newcomer(H); H._growTo = 0; H._birth = false; want(c.ev && c.ev[0][1] === 'geb' && H.people.some(m => m.h === famOfHome(H, hh).id && (m.ev || []).some(e => e[1] === 'kind' && e[2] === c.n)), 'story: a birth is not written down'); }   // whichever woman of the house is the mother (the game takes the youngest)
    hh.t = t0; H.people = H.people.slice(0, kids); stormWarn(H, false); tick = H.storm.at; stormTick(H); want(H.people.some(q => isAdult(q) && (q.ev || []).some(e => e[1] === 'sturm')), 'story: the storm is not written down'); }
  // the middle game: a strength speeds up its kind of work; a trade chain with another village brings what is missing
  { const H = isl('heimat'); H.str = null; const e = H.buildings.find(q => q.kind === 'ernte') || (() => { const q = findSpot(H, 'ernte', startSpot(H, KINDS.ernte)); return addB(H, 'ernte', q, variant('ernte'), tick); })();
    const w0 = workSpeed(H, e, 2); H.str = 'pflanzer'; H.strAt = tick; want(Math.abs(workSpeed(H, e, 2) / w0 - STRENGTH_BONUS) < 1e-6, 'strength: the planters are not faster at the Erntehaus');
    H.str = 'toepfer'; want(workSpeed(H, e, 2) === w0, 'strength: potters speed up the Erntehaus'); want(!setStrength(H, 'fischer'), 'strength: changed again at once'); H.strAt = tick - STRENGTH_PAUSE - 1; want(setStrength(H, 'fischer') && H.str === 'fischer', 'strength: no change after the pause');
    { const cz = centerOf(H); if (cz){ openSheet('info', {id:cz.id}); sheetData = {...sheetData, tab:'staerke'}; renderSheet(); want(/Stärke des Dorfes/.test($('sheetBody').textContent), 'strength: not offered at the centre'); closeSheet(); } } H.str = null;
    { const A = islands.find(J => !J.settled && !J.clan && J.type === 'atoll'), saved = H.buildings.slice();
      if (A){ discover(A); exploreAt(A.center.x, A.center.y, 400); H.buildings = H.buildings.filter(q => q.kind !== 'steg');
        const cn = makeShip('oc', H), fd = makeShip('dc', H, {founder:true});
        want(!atollReady() && !sailTo(cn, {isl:A.id}, true) && cn.state !== 'sail', 'atoll: a canoe sails in without a Kanusteg');
        want(!sailTo(cn, {x:A.atoll.cx, y:A.atoll.cy}, true), 'atoll: a canoe sails into the lagoon without a Kanusteg');
        want(sailTo(fd, {isl:A.id}, true), 'atoll: the founding canoe is blocked'); fd.state = 'moored';
        const st = {kind:'steg', x:H.harbor.x, y:H.harbor.y, bt:5, boat:3}; H.buildings.push(st);
        want(!atollReady() && !sailTo(cn, {isl:A.id}, true), 'atoll: an unfinished Kanusteg opens it'); st.bt = 0;
        want(!atollReady(), 'atoll: a Steg without its Einbaum opens it'); st.boat = 0;
        want(atollReady() && sailTo(cn, {isl:A.id}, true) && cn.state === 'sail', 'atoll: a finished Kanusteg with Einbaum does not open it');
        for (const q of [cn, fd]) ships.splice(ships.indexOf(q), 1); H.buildings = saved; } }
    const T = islands.find(J => !J.settled && !J.clan && J.type === 'atoll') || islands.find(J => !J.settled && !J.clan);
    if (T){ discover(T); exploreAt(T.center.x, T.center.y, 400); settle(T, H, {pop:6, stock:{matten:12, nahrung:10, wasser:10}, folk:[], life:[]});
      const s = makeShip('dc', H); H.stock.holz = 30; H.stock.schnur = 20; H.stock.matten = 0;
      want(tradeIdea(H, 'matten') === T && tradeShip(H, T) === s, 'trade: the other village is not found'); want(startTrade(H, 'matten', T), 'trade: not started');
      const ri = routeIndex(H.id, T.id); want(ri >= 0 && s.route === ri && routes[ri].plan[routes[ri].a === T.id ? 'a' : 'b'].matten > 0, 'trade: no chain with mats on it');
      let n = 0; for (let i = 0; i < 20000 && !(H.stock.matten > 0); i++){ stepShips(performance.now(), 50); if (i % 20 === 0) tick++; n++; }
      want(H.stock.matten > 0, `trade: no mats arrived after ${n} steps`); out.push(`trade: mats at home after ${n} steps`);
      want(followAdvice === undefined || typeof followAdvice === 'function', 'trade: no advice handler'); }
    else out.push('trade: no island to trade with'); }
  // a full store keeps the cargo aboard; goods the port sends on are not unloaded there
  { const H = isl('heimat'), B = islands.find(J => J.settled && J !== H);
    if (B){ const s = makeShip('dc', H), ri0 = routes.length; routes.push({a:H.id, b:B.id, knots:1, lastGift:tick, plan:{a:{}, b:{}}}); const r = routes[ri0], cap = storeCap(B);
      s.route = ri0; s.port = B.id; s.state = 'moored'; s.tripFrom = H.id; B.stock.holz = cap; s.cargo = {holz:5};
      routeArrive(s); want(B.stock.holz === cap && s.cargo.holz === 5 && !!s.full, `full: goods lost or not kept aboard (${B.stock.holz}/${cap}, ${s.cargo.holz})`);
      s.state = 'moored'; routeArrive(s); want(B.stock.holz === cap && s.cargo.holz === 5, 'full: second arrival changed things');
      B.stock.holz = cap - 3; s.state = 'moored'; routeArrive(s); want(B.stock.holz === cap && s.cargo.holz === 2 && !!s.full, 'full: partial unload wrong');
      B.stock.holz = 0; s.state = 'moored'; routeArrive(s); want(B.stock.holz === 2 && !s.cargo.holz && !s.full, 'full: not unloaded when there is room');
      r.plan[B.id === r.a ? 'a' : 'b'] = {holz:6}; B.stock.holz = 0; s.cargo = {holz:4}; s.state = 'moored'; routeArrive(s);
      want(s.cargo.holz === 4 && B.stock.holz === 0, 'full: an outbound good is unloaded at its own port');
      B.stock.holz = 10; s.state = 'moored'; routeArrive(s); want(s.cargo.holz === 6 && B.stock.holz === 8, `full: load up to the plan wrong (${s.cargo.holz}, ${B.stock.holz})`);
      routes.splice(ri0, 1); ships.splice(ships.indexOf(s), 1); out.push('full store: cargo stays aboard'); } }
  // palms bear only so many nuts; one bar with the day running round it; a picture that fails does not stop the game
  { const H = isl('heimat'), e = H.buildings.find(q => q.kind === 'ernte' && !q.bt);
    if (e){ const pk = e.v && e.v.pick; e.v = {...e.v, pick:'kokos'}; e.nuts = 0; const w = workState(H, e); want(w && w.why === 'nuts', 'nuts: a grove picked clean still gives');
      nutTick(H, NUTS.every * 3); want(e.nuts > 0 && e.nuts <= nutPalms(H, e) * NUTS.keep + 1e-6, `nuts: do not ripen again: ${e.nuts}`); want(nutRate(H, e) > 0 && makeRate(H, 'kokos') <= H.buildings.filter(q => q.kind === 'ernte').reduce((t, q) => t + nutRate(H, q), 0) + 1e-6, 'nuts: more promised than the palms bear');
      e.v = {...e.v}; if (pk) e.v.pick = pk; else delete e.v.pick; }
    want($('hudbar') && $('hudbar').contains($('compass')) && $('hudbar').contains($('menuBtn')) && $('hudbar').contains($('newsBtn')), 'bar: wind, news and menu are not one');
    // the rim is light (the day) and dark (the night), no time is written; a sun walks the light part and a moon the dark part
    opts.night = true; dayRing(); { const bg = getComputedStyle($('hudbar')).backgroundImage, H = $('hudbar');
      want(!document.getElementById('dayTxt') && !/\d:\d\d/.test(H.getAttribute('aria-label')) && /conic-gradient/.test(bg) && !H.style.background && /^(Tag|Nacht)\./.test(H.getAttribute('aria-label')), 'bar: it shows a time, or the rim has no light and dark part'); }
    { const t0 = tick, at = k => { tick = Math.floor(tick / DAY_TICKS) * DAY_TICKS + k; dayRing(); const M = $('dayMark'); return {pos:M.style.left + '|' + M.style.top, cls:M.className, m:+M.style.getPropertyValue('--m'), lab:$('hudbar').getAttribute('aria-label')}; };
      const a = at(5), b = at(40), d = at(120); tick = t0; dayRing();
      want(a.pos !== b.pos && b.pos !== d.pos && a.cls === 'sun' && b.cls === 'sun' && d.cls === 'moon' && a.m === 0 && d.m === 1 && /^Tag/.test(a.lab) && /^Nacht/.test(d.lab), `bar: the sun does not move on, or is no moon by night (${a.cls} ${b.cls} ${d.cls})`);
      const dusk = at(Math.round(DAY_END * DAY_TICKS) - 30); want(dusk.m > 0 && dusk.m < 1, 'bar: sun and moon do not blend at dusk'); tick = t0; dayRing();
      opts.night = false; dayRing(); want($('dayMark').hidden, 'bar: a mark rides on a plain rim'); opts.night = true; dayRing(); }
    { const keep = news.slice(); news.length = 0; newsAdd('Probe: ein Kanu kommt.'); newsAdd('Probe: ein Kanu kommt.'); news.length = 0; loadNews();
      want(news[0] && news[0].msg === 'Probe: ein Kanu kommt.' && news[0].n === 2 && news[0].y >= 1, 'conch: a message is not kept, or a repeat is not counted');
      news.length = 0; news.push(...keep); }
    // the morning meal: at dawn everyone eats one portion and drinks one, and nothing during the day; who gets nothing works slower
    { const H = isl('heimat'), keepSt = {...H.stock}, keepH = H.hunger, t0 = tick; syncPeople(H); const n = H.people.length;
      for (const k of FOODS) H.stock[k] = 0; Object.assign(H.stock, {nahrung:n + 3, wasser:n + 2});
      tick = Math.floor(tick / DAY_TICKS) * DAY_TICKS + DAY_TICKS + 40; const f0 = haveOf(H, 'essen'), w0 = H.stock.wasser;
      mealTick(H);
      want(haveOf(H, 'essen') === f0 - n && H.stock.wasser === w0 - n && H.meal.hungry === 0 && H.meal.thirsty === 0 && H.people.every(p => !p.meal), 'meal: everyone does not eat and drink one portion');
      Object.assign(H.stock, {nahrung:0, wasser:Math.max(0, n - 2)}); for (const k of FOODS) H.stock[k] = 0; mealTick(H);
      const hung = H.people.filter(p => p.meal & 1).length, dry = H.people.filter(p => p.meal & 2).length;
      want(hung === n && dry === Math.min(2, n) && H.meal.hungry === n && H.hunger >= 1, 'meal: shortage not counted per person');
      const kid = H.people.find(p => stageOf(p) === 'kid'), adult = H.people.filter(isAdult).sort((a, b) => (b.h || 0) - (a.h || 0))[0];
      want(!kid || !(kid.meal & 2) || H.people.filter(isAdult).every(p => p.meal & 2), 'meal: the children are not served first');
      const b = H.buildings.find(q => !q.bt && KINDS[q.kind].crew && (staffOf(H).crewP.get(q) || []).length), sp = b && workSpeed(H, b, crewAt(H, b) || 1);
      for (const p of H.people) p.meal = 0; H._mf = null; const sf = b && workSpeed(H, b, crewAt(H, b) || 1);
      want(!b || sp < sf, 'meal: the hungry do not work slower');
      want(NEEDS.find(N => N.k === 'essen').rate === 1 / 6 && dailyPace('fisch') === DAILY.food && dailyPace('holz') === 1, 'meal: production not at the pace of days');
      H.stock = keepSt; H.hunger = keepH; tick = t0; for (const p of H.people) p.meal = 0; H._mf = null; H.meal = null; H._fore = null; }
    // a new village builds its first house from what the canoe brought: without wood and fronds on board, no village
    { const T = islands.find(J => !J.settled && !J.clan), H = isl('heimat'); if (T){ const s = makeShip('oc', H), m0 = mana; s.port = T.id; s.people = SETTLE.people; s.cargo = {}; mana = 999;
      settleFrom(s); const refused = !T.settled; s.cargo = {...costOf('haus', T)}; const lack = Object.keys(hutLack(s, T)).length;
      mana = m0; ships.splice(ships.indexOf(s), 1);
      want(refused && lack === 0, 'settle: a village is founded without wood for its first house'); } }
    // the elders of a daughter village help only in need: without water they begin the harvest house; the mother helps with wood and
    // fronds, and it sends what it has plenty of to the mother; the player can take the lead back
    { const T = islands.find(J => !J.settled && !J.clan && !J.treasure), H = isl('heimat'); if (T){ const s = makeShip('oc', H), m0 = mana; s.port = T.id; s.people = SETTLE.people; s.cargo = {...costOf('haus', T), nahrung:6}; mana = 999;
      settleFrom(s); mana = m0; ships.splice(ships.indexOf(s), 1);
      want(T.settled && eldersOn(T) && !eldersOn(H), `elders: a daughter village is not led by its elders (${T.settled})`);
      if (T.settled){ T.stock.holz = 0; T.stock.dach = 0; const keepH = {...H.stock}; Object.assign(H.stock, {holz:30, dach:30, schnur:2});
        const g = helpOf(H, T); want(g.holz > 0 && g.dach > 0, `elders: the mother sends no wood and fronds to a young village: ${JSON.stringify(g)}`);
        packGive(H, T, g, true); want(T.stock.holz > 0 && T.helps === 1, 'elders: the help does not arrive');
        Object.assign(T.stock, {holz:10, dach:10, wasser:0}); T.staff = null; T._fore = null; eldersTick(T, true);
        want(T.buildings.some(b => b.kind === 'ernte' && b.bt), `elders: no harvest house begun: ${T.buildings.filter(b => b.bt).map(b => b.kind)}`);
        T.stock.schnur = storeCap(T); const P = packOf(T, H); want(P.schnur > 0, `elders: a daughter with a full store sends nothing: ${JSON.stringify(P)}`);
        const n0 = H.stock.schnur; packGive(T, H, P); want(H.stock.schnur > n0 && H.packs >= 1, 'elders: the package does not reach the mother');
        openSheet('needs', {tab:'netz'}); active = T.id; renderSheet(); want(/Rat in der Not/.test($('sheetBody').textContent), 'elders: the overview does not say the elders help');
        $('sheetBody').querySelector('[data-act=rat]').click(); want(!eldersOn(T) && T.rat === false, 'elders: the elders cannot be turned off');
        { const n = T.buildings.length; T.rat = true; Object.assign(T.stock, {wasser:20, nahrung:20}); T._fore = null; eldersTick(T, true); want(T.buildings.length === n, 'elders: the elders build though nothing is wanting'); }
        active = 'heimat'; closeSheet(); H.stock = keepH; T.rat = undefined;
        // the gifts: every island but the first has one; a village of its own gives it to the clan
        want(!giftOf(H) && islands.filter(J => !J.clan && !J.treasure && J.id !== 'heimat').every(J => GIFTS[giftOf(J)]), 'gifts: an island without a gift, or the home island with one');
        giftMemo.t = -1; want(hasGift(giftOf(T)), `gifts: the village on ${T.name} does not give ${giftOf(T)}`);
        { const keep = giftMemo, sh = ships.find(q => q.own) || makeShip('oc', H); giftMemo = {t:tick, set:new Set()}; const v0 = speedOf(sh), f0 = feastMana(H, FEASTS[0]);
          giftMemo = {t:tick, set:new Set(['feinpandanus', 'kurkuma'])}; want(speedOf(sh) > v0 * 1.15, 'gifts: fine pandanus sails do not make canoes faster');
          want(feastMana(H, FEASTS[0]) >= f0, 'gifts: red earth makes feasts poorer'); giftMemo = keep; giftMemo.t = -1; }
        openSheet('needs', {tab:'netz'}); want(/Gaben des Clans/.test($('sheetBody').textContent), 'gifts: the overview does not list the gifts'); closeSheet();
        // the founders become ancestors; fine things from a daughter make the mother glad; every canoe adds standing
        want(T.people.some(p => (p.ev || []).some(e => e[1] === 'gru')), 'founders: nobody of the new village has its founding in the story');
        { const k = GOODS.find(q => !canMakeOn(H, q) && !TREASURE_GOODS.includes(q)), m0 = mana; T.stock[k] = 5; H.stock[k] = 0; H.fernAt = null; packGive(T, H, {[k]:3});
          // what other peoples teach stays: half the soil lost with the garden lore; the invented light whale can be seen once
          // a palm tapped twice quickly drops one thing; right after, nothing more
          { const P = H.buildings.find(b => b.kind === 'palme' && !b.bt && !(b.grow > 0)); if (P){ const pt = {x:P.x, y:P.y - KINDS.palme.hy * .6}, sum = () => PALM_SHAKE.drops.reduce((t, [k]) => t + (H.stock[k] || 0), 0);
            for (const [k] of PALM_SHAKE.drops) H.stock[k] = 0; palmTap = null; palmShakeAt = 0; P.shookAt = null; const n0 = palmDrops.length;
            palmDouble(pt); palmDouble(pt); const one = sum(); palmTap = null; palmDouble(pt); palmDouble(pt);
            want(one === 1 && sum() === 1 && palmDrops.length === n0 + 1, `palm: a double tap drops ${one}, a second one ${sum() - one}`); palmDrops.length = 0; } }
          { const t0 = stats.teach; stats.teach = ['garten', 'wetter']; want(taught('garten') && taught('wetter') && !taught('x'), 'teach: lessons not remembered'); stats.teach = t0; }
          { const m1 = mana, I0 = isl(active); lightWhale = {x:I0.center.x + 400, y:I0.center.y, hx:1, hy:0, t0:performance.now(), isl:I0.id, seen:false};
            const q = whalePos(lightWhale, performance.now()); want(hitWhale(q), 'whale: cannot be tapped'); seeWhale(); want(mana === m1 + WHALE.mana && lightWhale.seen && !hitWhale(q), 'whale: seeing it gives no standing or can be seen twice'); lightWhale = null; mana = m1; }
          const ad = H.people.find(isAdult); want(H.fernAt === tick && satOf(H, ad).why.some(w => w.k === 'fern') && mana > m0, `network: ${k} from afar does not gladden the mother or add standing`); mana = m0; H.fernAt = null; } } } }
    // what a storm wrecked is built anew only with wood and fronds from the store
    { const H = isl('heimat'), keepSt = {...H.stock}, h = homesOf(H).find(q => !q.bt); if (h){ H.stock.holz = 0; H.stock.dach = 0;
      h.bt = 5; rebuildCost(H, h); H.staff = null; const waits = !!h.unpaid && !staffOf(H).sites.includes(h);
      Object.assign(H.stock, {holz:10, dach:10}); payRebuilds(H); const paid = !h.unpaid && H.stock.holz < 10;
      delete h.bt; delete h.unpaid; H.stock = keepSt; H.staff = null;
      want(waits && paid, 'storm: a wrecked house is built anew without wood'); } }
    const d0 = draw, n0 = errN; let rafs = 0; const r0 = window.requestAnimationFrame; window.requestAnimationFrame = () => { rafs++; return 0; };
    draw = () => { throw new Error('probe'); }; needDraw = true; frame(performance.now()); draw = d0; window.requestAnimationFrame = r0;
    want(errN === n0 + 1 && rafs === 1 && /probe/.test(lastErr), `frame: an error stops the game (${errN - n0} errors, ${rafs} frames asked)`); errN = n0; lastErr = ''; try { localStorage.removeItem('polinusa-err'); } catch (x){}
    cam.x = NaN; camGuard(); want(cam.x === cam.x, 'camera: lost for good'); errN = n0; lastErr = ''; try { localStorage.removeItem('polinusa-err'); } catch (x){} }
  out.push('BAD: ' + (bad.join('; ') || 'none'));
  return out.join('\n');
  } catch (e){ return 'ERR ' + e.message + ' ' + e.stack; }
});
console.log(r);
console.log('errors', errs); await b.close();})();
