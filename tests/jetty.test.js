// The Kanuhaus has the jetty of the old Kanusteg: its dugout, the stilt houses it serves, the way into the atoll.
// An old save with a Kanusteg loads and works (a finished one becomes a Kanuhaus where none stands).
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({viewport:{width:390, height:844}})).newPage(), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    try {
      window.save = () => {}; const out = [], bad = [], want = (c, m) => { if (!c) bad.push(m); };
      newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9;
      let I = isl('heimat');
      const put = (kind, fin = true) => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); if (!q) return null; const b = addB(I, kind, q, variant(kind), tick); if (fin) delete b.bt; else b.bt = KINDS[kind].bt; I.staff = null; return b; };
      const run = n => { for (let t = 0; t < n; t++){ for (let k = 0; k < 40; k++) stepWalkers(50); walkAt = performance.now(); econ(); if (sheetKind) closeSheet(); } };
      // the build list: no Kanusteg any more, the Kanuhaus has the jetty
      want(!ORDER.includes('steg') && ORDER.includes('werft'), 'order: the Kanusteg is still in the build list');
      want(KINDS.werft.serves >= 4 && KINDS.werft.canoe > 0 && KINDS.werft.on.includes('atoll'), 'data: the Kanuhaus has no dugout and no ferry service');
      want(!QUESTS.some(q => /Kanusteg/.test(String(q.d) + q.why + q.t)), 'quests: still talk of a Kanusteg');
      // a finished Kanuhaus carves its dugout first; then it serves the stilt houses
      const w = put('werft'); w.boat = KINDS.werft.canoe; want(w && typeof w.v.rot === 'number', 'werft: its jetty does not point anywhere');
      const ph = []; for (let i = 0; i < 10; i++){ const q = put('pfahl'); if (q) ph.push(q); }
      out.push(`stilt houses ${ph.length}`); want(ph.length >= 9, 'lagoon: room for only ' + ph.length + ' stilt houses');
      I._lg = null; want(ph.every(q => unserved(I, q)) && !atollReady(), 'werft: serves before its dugout is carved');
      want(workState(I, ph[0]).why === 'boat', 'werft: the stilt house does not say that a dugout is missing');
      I.staff = null; syncWalkers(); run(400);
      out.push(`dugout left ${w.boat || 0}`); want(!(w.boat > 0), 'werft: its dugout is never carved');
      I._lg = null; want(ph.filter(q => !unserved(I, q)).length === KINDS.werft.serves, 'werft: serves ' + ph.filter(q => !unserved(I, q)).length + ' stilt houses, not ' + KINDS.werft.serves);
      want(atollReady(), 'werft: a finished Kanuhaus with its dugout does not open the atoll');
      want(artOf('werft', {rot:40, boat:2}).includes('rotate(40)') && !/undefined|NaN/.test(artOf('werft', {rot:40, boat:2, canoe:'oc1'})), 'art: the Kanuhaus draws no jetty');
      renderAll();
      // the sheet of the Kanuhaus mentions the dugout while it is carved
      w.boat = 20; I.staff = null; select(w); want(/Einbaum/.test($('sheetBody').textContent), 'sheet: nothing about the dugout of the Kanuhaus'); closeSheet(); w.boat = 0;
      // an old save: a finished Kanusteg and its stilt house, on an island without a Kanuhaus
      I.buildings = I.buildings.filter(q => q.kind !== 'werft' && q.kind !== 'pfahl'); I.staff = null; I._lg = null;
      const s0 = put('steg'); s0.boat = 0; const h0 = put('pfahl'); I._lg = null; const id0 = s0.id;
      want(!unserved(I, h0), 'old save: a Kanusteg does not serve');
      const raw = serialize(); want(restore(raw), 'old save: does not load'); I = isl('heimat');
      const wf = I.buildings.filter(q => q.kind === 'werft'), sg = I.buildings.filter(q => q.kind === 'steg');
      out.push(`after load: ${wf.length} Kanuhaus, ${sg.length} Kanusteg`);
      want(wf.length === 1 && !sg.length && wf[0].id === id0 && !wf[0].bt, 'old save: the Kanusteg did not become a Kanuhaus');
      want(!unserved(I, I.buildings.find(q => q.kind === 'pfahl')) && atollReady(), 'old save: the stilt house or the atoll is not served after the change');
      want(overlaps(I).length === 0, 'old save: the new Kanuhaus overlaps ' + overlaps(I).map(q => q[0].kind + '/' + q[1].kind));
      run(20); renderAll();
      // a Kanusteg beside a Kanuhaus stays as it is and serves on
      const s2 = put('steg'); s2.boat = 0; I._lg = null;
      want(lagoonOf(I).cap === KINDS.werft.serves + KINDS.steg.serves, 'old save: the Kanusteg beside the Kanuhaus does not serve');
      restore(serialize()); I = isl('heimat');
      want(I.buildings.some(q => q.kind === 'steg') && I.buildings.filter(q => q.kind === 'werft').length === 1, 'old save: a second jetty was changed');
      // an unfinished old Kanusteg is left alone and finishes as before
      I.buildings = I.buildings.filter(q => q.kind !== 'werft' && q.kind !== 'steg'); put('steg', false); I._lg = null; restore(serialize()); I = isl('heimat');
      want(I.buildings.some(q => q.kind === 'steg' && q.bt) && !I.buildings.some(q => q.kind === 'werft'), 'old save: an unfinished Kanusteg was changed');
      out.push('BAD: ' + (bad.join('; ') || 'none')); return out.join('\n');
    } catch (e){ return 'ERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' '); }
  });
  console.log(r); console.log('errors', errs); await b.close();
})();
