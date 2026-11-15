// Buildings never stand on top of each other: one placement rule for the player, the elders, the crafts on a house mat,
// moved houses and stumps; and the draw order of things on one line is stable.
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
      const I = isl('heimat'), names = l => l.map(q => `${q[0].kind}#${q[0].id}/${q[1].kind}#${q[1].id}`).join(', ');
      const run = n => { for (let t = 0; t < n; t++){ for (let k = 0; k < 40; k++) stepWalkers(50); walkAt = performance.now(); econ(); if (sheetKind) closeSheet(); } };
      want(overlaps(I).length === 0, 'start: overlaps ' + names(overlaps(I)));
      // 1. a craft on a house mat is part of the village: nothing is placed on it, and it is not placed on anything
      for (const q of I.people) q.job = 0;
      const h = I.buildings.find(q => q.kind === 'haus'), first = craftSpot(h);
      const walls = matSpots(h).map(q => addB(I, 'speicher', q, variant('speicher'), tick)); I.staff = null;   // forced on every place for the mat
      want(craftBlocked(I, h), 'craft: a mat is allowed where buildings stand');
      I.buildings = I.buildings.filter(q => !walls.includes(q));
      const w1 = addB(I, 'speicher', first, variant('speicher'), tick); want(!craftBlocked(I, h) && JSON.stringify(craftSpot(h)) !== JSON.stringify(first), 'craft: the mat does not go to the other side of the house'); I.buildings = I.buildings.filter(q => q !== w1);
      want(!craftBlocked(I, h), 'craft: the spot beside the hut is blocked');
      { const mat = addB(I, 'toepfer', craftSpot(h), {}, tick); mat.at = h.id;   // as setCraft makes it, once a craft is allowed
        want(/Zu eng/.test(check('speicher', I, mat.x + 1, mat.y)), 'craft: a building is placed on a mat');
        want(!check('haus', I, h.x, h.y, h.id), 'craft: a house cannot stay where it stands, its own mat is in the way');
        want(!craftBlocked(I, h), 'craft: the mat of a house blocks itself');
        I.buildings = I.buildings.filter(q => q !== mat); }
      // 2. a stump under a new building is gone, so no tree sprouts through the roof
      { const q = findSpot(I, 'speicher', {x:h.x - 60, y:h.y + 10}); if (q){ I.trees.push({x:q.x + 1, y:q.y + 1, v:0, m:0, s:1, st:1, w:0, g:50}); const n0 = I.trees.length; const bb = addB(I, 'speicher', q, variant('speicher'), tick);
        want(I.trees.length === n0 - 1, 'stump: stays under a new building'); I.buildings = I.buildings.filter(x => x !== bb); } }
      // 3. the ghost was fine when it was put down, but the elders built on that spot before the tap: nothing is built
      { startPlace('speicher'); const q = findSpot(I, 'speicher', {x:h.x - 50, y:h.y + 30}); if (placing && q){ placing.x = q.x; placing.y = q.y; ghostRender(); want(placing.ok, 'confirm: ghost not ok');
          const other = addB(I, 'speicher', q, variant('speicher'), tick), n0 = I.buildings.length; confirmPlace(); want(I.buildings.length === n0, 'confirm: built on top of a building that came in the meantime');
          if (placing) endPlace(); I.buildings = I.buildings.filter(x => x !== other); } else if (placing) endPlace(); }
      // 4. whatever the elders and the player do for a long time: nothing overlaps (placement, crafts, moves, storms)
      const kinds = ORDER.filter(k => KINDS[k] && !KINDS[k].craft && !KINDS[k].fixed && KINDS[k].on.includes('hoch') && !KINDS[k].water && k !== 'pfahl' && k !== 'halle'), seen = {};
      let n = 0, rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 260; i++){
        const k = kinds[Math.floor(rnd() * kinds.length)]; if (KINDS[k].max && I.buildings.some(q => q.kind === k)) continue;
        const from = {x:I.center.x + (rnd() - .5) * 160, y:I.center.y + (rnd() - .5) * 120}, q = findSpot(I, k, from); if (!q) continue;
        const bb = addB(I, k, q, variant(k), tick); n++; seen[k] = 1; if (KINDS[k].bt && rnd() < .5) bb.bt = KINDS[k].bt;
        if (i % 9 === 0){ const hs = homesOf(I).filter(x => !craftOf(I, x)); for (const x of hs.slice(0, 2)){ const ck = CRAFT_KINDS.find(c => !craftWhy(I, x, c)); if (ck) setCraft(I, x, ck); } }
        if (i % 13 === 0){ const mv = I.buildings.filter(x => !x.at && !KINDS[x.kind].fixed)[Math.floor(rnd() * I.buildings.length) % Math.max(1, I.buildings.filter(x => !x.at && !KINDS[x.kind].fixed).length)];
          if (mv){ const t = findSpot(I, mv.kind, {x:mv.x + (rnd() - .5) * 50, y:mv.y + (rnd() - .5) * 40}); if (t && !check(mv.kind, I, t.x, t.y, mv.id)){ mv.x = t.x; mv.y = t.y; moveCraft(I, mv); } } }
        if (overlaps(I).length){ bad.push(`after ${n} buildings (${k}): ${names(overlaps(I))}`); break; }
      }
      out.push(`random buildings ${n}, kinds ${Object.keys(seen).length}`); want(n > 60, 'fuzz: only ' + n + ' buildings placed');
      // 5. the elders build on their own for an hour: no overlap afterwards, and also not after a save and load
      newGame(777); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9;
      { const J = isl('heimat'); J.autoUp = true; Object.assign(J.stock, {holz:900, dach:900, schnur:300, nahrung:200, wasser:200}); for (let i = 0; i < 12; i++){ J.pop = Math.max(J.pop, 24); for (const k of ['haus', 'speicher', 'taro', 'ernte', 'faeller', 'fisch', 'umu', 'pflanzer', 'huehnerhof', 'werft']) try { eldersBuild(J, k); } catch (e){ bad.push('elders: ' + e.message); } for (const q of J.buildings) if (q.bt){ delete q.bt; if (KINDS[q.kind].canoe) q.boat = 0; } J.staff = null; }
        want(overlaps(J).length === 0, 'elders: ' + names(overlaps(J))); out.push(`elders built ${J.buildings.length} things`);
        restore(serialize()); want(overlaps(isl('heimat')).length === 0, 'save: overlaps after loading'); }
      // 6. draw order: flat things lie under the rest, equal lines keep their order
      { const J = isl('heimat'), pz = J.buildings.find(q => q.kind === 'platz'), a = {kind:'haus', x:pz.x, y:pz.y - 5, id:90001}, c = {kind:'speicher', x:pz.x + 3, y:pz.y - 5, id:90002};
        const all = [[c, J], [pz, J], [a, J]]; const flat = o => o.kind && FLAT.has(o.kind) ? 0 : 1; all.sort((x, y) => flat(x[0]) - flat(y[0]) || x[0].y - y[0].y || x[0].x - y[0].x || (x[0].id || 0) - (y[0].id || 0));
        want(all[0][0] === pz && all[1][0] === a && all[2][0] === c, 'draw: the plaza is not drawn first'); }
      out.push('BAD: ' + (bad.join('; ') || 'none')); return out.join('\n');
    } catch (e){ return 'ERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' '); }
  });
  console.log(r); console.log('errors', errs); await b.close();
})();
