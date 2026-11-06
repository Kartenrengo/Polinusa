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
  // Hawaiki: kava, fine mats, painted tapa, scented oil and the chief's house only after the great voyage
  { const late = ['kavagarten', 'weberin', 'malerin', 'duftoel', 'fale'], H = isl('heimat'), M = isl('tochter'), x0 = M.center.x, s0 = M.settled;
    stats.peakPop = 60; stageTick(); want(!late.some(unlocked) && unlocked('trommel'), 'Hawaiki: late things open before the great voyage');
    want(!clanMakes(CLANS.hain).includes('kava') && !festivalParts(H).some(q => q.P.id === 'kava') && !lifeOf(H).includes('kava'), 'Hawaiki: kava before the great voyage');
    M.center.x = FAR_X + 10; M.settled = true; stageTick(); M.center.x = x0; M.settled = s0;
    want(late.every(unlocked) && hawaiki() && lifeOf(H).includes('kava') && clanMakes(CLANS.hain).includes('kava'), 'Hawaiki: not open after a village on the far islands');
    out.push(`Hawaiki: stage ${STAGES[stageNow()].n}, chief quest after ${QUESTS[QUESTS.findIndex(Q => Q.id === 'chief') - 1].id}`);
    want(QUESTS.findIndex(Q => Q.id === 'chief') > QUESTS.findIndex(Q => Q.id === 'fern'), 'Hawaiki: chief quest before the far village'); }
  out.push('BAD: ' + (bad.join('; ') || 'none'));
  return out.join('\n');
  } catch (e){ return 'ERR ' + e.message + ' ' + e.stack; }
});
console.log(r);
console.log('errors', errs); await b.close();})();
