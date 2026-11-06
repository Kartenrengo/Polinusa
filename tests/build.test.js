// Building: six sites at once all get finished, with the same builders to the end; a site or a workplace called with the
// conch gets people at once; the call is saved and ends by itself; fields are dug, not hammered.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => { window.save = () => {}; const out = [], bad = [];
    const setup = seed => { newGame(seed); landHome(isl('heimat')); closeSheet(); skipTutorial(true); nextEvent = 1e9; const I = isl('heimat');
      const put = (kind, site = true) => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); if (!q) return null; const x = addB(I, kind, q, variant(kind), tick); if (site && !KINDS[kind].plant){ x.bt = KINDS[kind].bt; x.got = 0; } I.staff = null; return x; };
      put('ernte', false); const fi = put('fisch', false); delete fi.boat; put('quelle', false); stats.peakPop = 25; return {I, put}; };
    const run = n => { for (let t = 0; t < n; t++){ for (let k = 0; k < 40; k++){ stepWalkers(50); stepShips(performance.now(), 50); } walkAt = performance.now(); econ(); for (const s of ships.slice()) if (s.immig && s.state === 'moored') immigAnswer(s, true); if (sheetKind) closeSheet(); } };
    // 1. six sites at once
    for (const seed of [11, 13]){
      const {I, put} = setup(seed); run(30); const sites = ['haus', 'taro', 'faeller', 'speicher', 'fisch', 'haus'].map(k => put(k)).filter(Boolean); Object.assign(I.stock, {holz:20, dach:20});
      let swaps = 0, crews = new Map(), fx = new Set();
      for (let t = 0; t < 600 && sites.some(s => s.bt); t++){ run(1);   // 20 minutes: the builders sleep at night, one night falls in it
        for (const s of sites){ const c = (staffOf(I).crewP.get(s) || []).join(); if (c && crews.has(s.id) && crews.get(s.id) && crews.get(s.id) !== c) swaps++; if (c) crews.set(s.id, c); }
        for (const w of walkers) if (w.job && w.job.type === 'site' && w.fx && w.job.b.kind === 'taro') fx.add(w.fx); }
      const left = sites.filter(s => s.bt).map(s => s.kind);
      out.push(`seed ${seed}: ${sites.length} sites, left after 20 min: ${sites.filter(s => s.bt).map(s => s.kind + ' ' + Math.round(s.bt) + '/' + KINDS[s.kind].bt).join(',') || 'none'}, crew changes ${swaps}, field work ${[...fx]}`);
      if (left.length) bad.push(`seed ${seed}: not finished ${left}`);
      if ([...fx].some(f => !['dig', 'plant'].includes(f))) bad.push('field built with ' + [...fx]);
    }
    // 2. the conch
    { const {I, put} = setup(11); run(20); const a = put('haus'), c = put('speicher'); Object.assign(I.stock, {holz:20, dach:20}); run(2);
      if (crewAt(I, c)) bad.push('second site had builders before the call');
      setPrio(I, c, true); run(1); out.push(`called site: crew ${crewAt(I, c)}, the other ${crewAt(I, a)}`); if (!crewAt(I, c)) bad.push('called site got nobody'); if (!crewAt(I, a)) bad.push('the call stopped the other site');
      restore(serialize()); const J = isl('heimat'), cc = J.buildings.find(q => q.kind === 'speicher'); if (!cc.prio) bad.push('call not saved');
      for (let m = 0; m < 30 && cc.bt; m++) run(15); if (cc.bt) bad.push('called site not built'); if (cc.prio) bad.push('call stays after building');
      const e = J.buildings.find(q => q.kind === 'ernte'); J.handWork = true; for (const q of J.people) if (q.job === e.id) q.job = 0; J.staff = null;
      setPrio(J, e, true); out.push(`called workplace: ${crewAt(J, e)} of ${KINDS.ernte.crew}`); if (crewAt(J, e) < KINDS.ernte.crew) bad.push('called workplace not filled');
      // the called place keeps its people: no flipping between places from one count to the next
      J.handWork = false; J.staff = null; run(1);
      { const ids0 = (staffOf(J).crewP.get(e) || []).join(); let flips = 0; for (let t = 0; t < 30; t++){ run(1); if ((staffOf(J).crewP.get(e) || []).join() !== ids0) flips++; } if (flips) bad.push(`called workplace changed its people ${flips} times`); }
      setPrio(J, J.buildings.find(q => q.kind === 'fisch'), true); setPrio(J, J.buildings.find(q => q.kind === 'quelle'), true); if (J.buildings.filter(q => q.prio).length > 2) bad.push('more than two calls');
      select(J.buildings.find(q => q.kind === 'quelle')); if (!/data-act="prio"/.test($('sheetBody').innerHTML)) bad.push('no conch button'); closeSheet(); }
    // 3. a jetty's dugout gets a carver (a jetty has no crew of its own) and is finished
    { const {I, put} = setup(202); for (let i = 0; i < 6; i++) I.people.push(Object.assign(person(I, 25), {h:famsOf(I)[0].id})); I.pop = I.people.length; syncPeople(I);
      const st = put('steg', false); if (st){ st.boat = KINDS.steg.canoe; I.staff = null; syncWalkers(); run(60); out.push(`jetty dugout left ${st.boat || 0}`); if (st.boat > 0) bad.push('the dugout of the jetty is never carved'); } }
    return {out, bad};
  });
  console.log(r.out.join('\n')); console.log('BAD: ' + (r.bad.concat(errs).join('; ') || 'none')); await b.close();
})();
