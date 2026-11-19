// Nobody sits, lies or works on a mat in the sea: a village with houses all along the beach and stilt houses in the lagoon,
// through a whole day and evening. Sitting and sleeping by a stilt house happens on its platform.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
const page = PAGE;
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(page); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { window.save = () => {}; newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9; stats.peakPop = 45; quest = QUESTS.length; opts.night = true;
    const I = isl('heimat'); setActive('heimat'); Object.assign(I.stock, {holz:300, dach:300, schnur:100, faser:100, nahrung:300, wasser:300, kokos:50, muschel:40});
    // houses right on the beach, all round, and stilt houses in the lagoon
    const L = I.lands[0].poly, n = L.length, made = [];
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 14))){ const q = L[i], c = I.center, d = Math.hypot(q.x - c.x, q.y - c.y), sp = {x:q.x + (c.x - q.x) / d * 12, y:q.y + (c.y - q.y) / d * 12}; if (!check('haus', I, sp.x, sp.y)){ const h = addB(I, 'haus', sp, variant('haus'), -500); h.t = 1 + (i % 3); made.push(h); } }
    for (let k = 0; k < 4; k++){ const s = findSpot(I, 'pfahl', startSpot(I, KINDS.pfahl)); if (s){ const h = addB(I, 'pfahl', s, variant('pfahl'), -500); h.t = 2; made.push(h); } }
    for (const h of made) setCraft(I, h, ['schnur', 'umu', 'hakenmacher'][h.id % 3]);
    I.pop = 40; syncPeople(I); I.staff = null; syncWalkers();
    const bad = new Map(); let looks = 0;
    for (let t = 0; t < 400; t++){ for (let k = 0; k < 20; k++) stepWalkers(50); walkAt = performance.now(); econ(); if (sheetKind) closeSheet();
      for (const w of walkers){ if (w.isl !== I.id || w.moving || w.boat || w.swim) continue; const rest = w.sit || w.lie || (w.job && w.job.b.at && Math.hypot(w.x - w.job.x, w.y - w.job.y) < 3); if (!rest) continue; looks++;
        if (landAt(I, w)) continue; const deck = (w.deck && deckLift(w) > 0) || (w.job && w.job.b.at && craftLift(w.job.b) > 0);
        if (!deck){ const why = (w.lie ? 'lie' : w.sit ? 'sit' : 'work') + (w.eve ? ' eve' : '') + (w.asleep ? ' asleep' : '') + (w.fx ? ' ' + w.fx : '') + (w.job ? ' ' + w.job.b.kind : ''); bad.set(why, (bad.get(why) || 0) + 1); } } }
    return {looks, bad:[...bad].slice(0, 12), crafts:I.buildings.filter(q => q.at).length}; });
  const n = r.bad.reduce((t, [, k]) => t + k, 0);   // a moment while somebody gets up is fine, a mat lying in the sea is not
  console.log(n > 10 ? 'BAD: people sit, lie or work in the water: ' + JSON.stringify(r.bad) : 'BAD: none', `(${r.looks} looks, ${r.crafts} crafts)`);
  console.log('errors', errs.length, errs.slice(0, 3)); await b.close();
})();
