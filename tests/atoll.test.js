// Atolls and reefs are plain to play: canoes sail in at any time, people wade from islet to islet, work and building sites on
// an islet without houses get people, stilt houses need no Kanuhaus, and the thin islets take the usual buildings.
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
      const H = isl('heimat'), A = isl('tochter');
      const run = n => { for (let t = 0; t < n; t++){ for (let k = 0; k < 40; k++){ stepWalkers(50); stepShips(performance.now(), 50); } walkAt = performance.now(); econ(); if (sheetKind) closeSheet(); } };
      // 1. a canoe sails into an unsettled atoll without a Kanuhaus (and into its lagoon)
      H.buildings = H.buildings.filter(q => q.kind !== 'werft' && q.kind !== 'steg'); H._lg = null;
      discover(A); exploreAt(A.center.x, A.center.y, 400);
      const cn = makeShip('oc', H);
      want(sailTo(cn, {isl:A.id}, true) && cn.state === 'sail', 'atoll: a canoe does not sail in without a Kanuhaus');
      want(sailTo(cn, {x:A.atoll.cx, y:A.atoll.cy}, true), 'atoll: a canoe does not sail into the lagoon without a Kanuhaus');
      ships.splice(ships.indexOf(cn), 1);
      // 2. a village on the atoll: the houses on one islet, a workplace and a building site on another
      settle(A, H, {pop:12, stock:{holz:60, dach:40, schnur:30, nahrung:60, wasser:60, matten:6}, folk:[], life:[]}); closeSheet();
      const hl = new Set(A.buildings.filter(q => q.kind === 'haus').map(q => landOf(A, q)));
      const areaOf = L => Math.abs(L.poly.reduce((s, q, i) => { const n = L.poly[(i + 1) % L.poly.length]; return s + q.x * n.y - n.x * q.y; }, 0)) / 2;
      const others = A.lands.map((L, i) => i).filter(i => !hl.has(i)).sort((a, c) => areaOf(A.lands[c]) - areaOf(A.lands[a]));
      want(others.length > 0, 'atoll: every islet has a house already');
      const cen = L => { const P = A.lands[L].poly; return {x:P.reduce((s, q) => s + q.x, 0) / P.length, y:P.reduce((s, q) => s + q.y, 0) / P.length}; };
      const L1 = others[0], c1 = cen(L1);
      const q1 = findSpot(A, 'fisch', c1), q2 = findSpot(A, 'ernte', {x:c1.x + 12, y:c1.y});
      want(q1 && landOf(A, q1) === L1, 'atoll: no place for a workplace on the islet without houses'); want(q2 && landOf(A, q2) === L1, 'atoll: no place for a building site there');
      const wk = addB(A, 'fisch', q1, variant('fisch'), tick); delete wk.bt; wk.boat = 0;
      const site = addB(A, 'ernte', q2, variant('ernte'), tick); site.bt = KINDS.ernte.bt; site.got = 0; const bt0 = site.bt;
      const ph = addB(A, 'pfahl', findSpot(A, 'pfahl', {x:A.atoll.cx, y:A.atoll.cy}), variant('pfahl'), tick); delete ph.bt;
      A.staff = null; A._lg = null; syncWalkers();
      want(!workState(A, wk) || workState(A, wk).why !== 'boat', 'atoll: the workplace on the other islet waits for a dugout');
      want(homeOk(A, ph) && !A.buildings.some(q => q.kind === 'werft'), 'atoll: a stilt house needs a Kanuhaus');
      let crew = 0, wading = 0, boats = 0;
      for (let i = 0; i < 60; i++){ run(1); crew = Math.max(crew, crewAt(A, wk) || 0); for (const w of walkers) if (w.isl === A.id){ if (w.wade && !landAt(A, w)) wading++; if (w.paddle && !landAt(A, w)) boats++; } }
      out.push(`crew ${crew}, wading steps ${wading}, paddling ${boats}, site ${bt0} -> ${site.bt || 0}`);
      want(crew > 0, 'atoll: nobody works at the place on the other islet');
      want(!site.bt || site.bt < bt0, 'atoll: nobody builds on the islet without houses');
      want(wading > 0, 'atoll: nobody wades from islet to islet'); want(boats === 0, 'atoll: people paddle across the lagoon instead of wading');
      for (let i = 0; i < 400 && site.bt; i++) run(1);
      want(!site.bt, 'atoll: the building site on the other islet is never finished');
      // 3. wading is slower than walking and a long wet way on a high island is still paddled
      { const w = walkers.find(q => q.isl === A.id && !q.child && !q.old), from = cen(others[others.length - 1]), to = cen(hl.values().next().value);
        w.boat = false; w.x = from.x; w.y = from.y; goTo(A, w, to.x, to.y); want(w.wade && !w.paddle, 'atoll: a way across the lagoon is not waded'); }
      // 4. stilt houses: many, no Kanuhaus, three looks, kept in the save
      H.buildings = H.buildings.filter(q => q.kind !== 'werft'); H._lg = null;
      const hp = []; for (let i = 0; i < 14; i++){ const q = findSpot(H, 'pfahl', startSpot(H, KINDS.pfahl)); if (!q) break; const s = addB(H, 'pfahl', q, variant('pfahl'), tick); delete s.bt; hp.push(s); }
      out.push(`stilt houses on Panua: ${hp.length}`); want(hp.length >= 12, 'stilt: room for only ' + hp.length);
      H._lg = null; want(hp.every(q => homeOk(H, q) && !(workState(H, q) && workState(H, q).why === 'boat')), 'stilt: a stilt house waits for a dugout');
      const shapes = new Set(hp.map(q => q.v.shape)); want(shapes.size === 3 && [...shapes].every(s => STILT_SHAPES.includes(s)), 'stilt: not three looks: ' + [...shapes]);
      for (const s of STILT_SHAPES){ const art = artOf('pfahl', {shape:s, roof:ROOF_NEW, t3:true}); want(art.includes('#' + s) && !/undefined|NaN/.test(art) && SYM[s], 'stilt: no picture for ' + s); }
      want(new Set(STILT_SHAPES.map(s => SYM[s])).size === 3, 'stilt: two looks are the same');
      want(!!check('pfahl', H, H.center.x, H.center.y), 'stilt: stands on dry land');
      delete hp[0].v.shape; renderAll();   // an old save without a look: drawn by its number
      restore(serialize()); const H2 = isl('heimat'); want(H2.buildings.filter(q => q.kind === 'pfahl').length === hp.length, 'stilt: lost in the save');
      // 4b. one house: the build list has only the hut; set in the lagoon it stands on stilts, moved back to land it is a hut
      { const H = isl('heimat'); want(!ORDER.includes('pfahl') && ORDER.includes('haus'), 'one house: the stilt house is still its own entry in the build list');
        stats.peakPop = Math.max(stats.peakPop || 0, 25); setActive('heimat'); Object.assign(H.stock, {holz:200, dach:200, schnur:200});
        const wet = findSpot(H, 'pfahl', startSpot(H, KINDS.pfahl)), dry = findSpot(H, 'haus', H.anchor || H.center);
        startPlace('haus'); placing.x = wet.x; placing.y = wet.y; ghostRender(); want(placing.kind === 'pfahl' && placing.ok, `one house: in the lagoon the ghost is ${placing.kind}, ok ${placing.ok}`);
        placing.x = dry.x; placing.y = dry.y; ghostRender(); want(placing.kind === 'haus' && placing.ok, `one house: on land the ghost is ${placing.kind}`);
        placing.x = wet.x; placing.y = wet.y; ghostRender(); const n0 = H.buildings.filter(q => q.kind === 'pfahl').length; confirmPlace(); if (placing) endPlace();
        want(H.buildings.filter(q => q.kind === 'pfahl').length === n0 + 1, 'one house: setting it in the water did not build a stilt house');
        const st = H.buildings.filter(q => q.kind === 'pfahl').pop(); delete st.bt; select(st); startMove && startMove(st);
        if (placing){ const d2 = findSpot(H, 'haus', H.anchor || H.center); placing.x = d2.x; placing.y = d2.y; ghostRender(); confirmPlace(); if (placing) endPlace(); want(st.kind === 'haus', 'one house: a stilt house moved onto land stays on stilts'); }
        closeSheet(); }
      // 5. thin islets take the usual buildings: how much of an islet is open ground, on thirty atolls
      const kinds = ['haus', 'ernte', 'fisch', 'pansammler', 'schnur', 'umu', 'speicher', 'taucher', 'werft', 'flecht'];
      let ok = 0, all = 0, lands = 0, miss = 0;
      for (let seed = 1; seed <= 30; seed++){
        const r = rng(seed * 977), I = genAtoll({x:3000, y:3000, size:92 + r() * 36, kind:'atoll'}, {x:1, y:0}, r), rr = rng(seed);
        Object.assign(I, {id:'t' + seed, buildings:[], settled:false, clan:null, trees:[], blocked:[], deco:[]});
        for (const L of I.lands){ lands++; const bx = polyBox(L.poly, 0), pts = [];
          for (let i = 0; i < 300; i++){ const q = {x:bx.x0 + rr() * (bx.x1 - bx.x0), y:bx.y0 + rr() * (bx.y1 - bx.y0)}; if (inPoly(q, L.poly)) pts.push(q); }
          for (const k of kinds){ if (!pts.some(q => !check(k, I, q.x, q.y))) miss++; for (const q of pts){ all++; if (!check(k, I, q.x, q.y)) ok++; } } }
      }
      out.push(`open ground on atoll islets: ${Math.round(100 * ok / all)} %, islets without a spot for some kind: ${miss}`);
      want(ok / all > .65, 'placement: only ' + Math.round(100 * ok / all) + ' % of an islet is open ground'); want(miss === 0, 'placement: ' + miss + ' islets take no ' + 'common building');
      out.push('BAD: ' + (bad.join('; ') || 'none')); return out.join('\n');
    } catch (e){ return 'ERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' '); }
  });
  console.log(r); console.log('errors', errs); await b.close();
})();
