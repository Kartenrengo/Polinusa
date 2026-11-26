// The yard (Version 121): free hands tend the yard of their own house in three steps. The slider decides how fast
// (Viel Freizeit faster, Dringend Arbeit not at all, the yard then stays); a craft family is faster. Yards count for
// beauty and, from "bepflanzt", for the contentment of the family. They are saved. What is drawn never lies on another
// building, a tree or in the water; houses in a group show less and may share a plaza.
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
      let I = isl('heimat'); const h = I.buildings.find(q => HOF_KINDS.has(q.kind) && famOfHome(I, q));
      want(h && hofStep(h) === 0, 'start: the first house already has a yard');
      // the rate follows the slider
      const rate = z => { I.zeal = z; for (const q of I.people) delete q.zeal; return hofRate(I, h); };
      const r0 = rate(0), r1 = rate(1), r2 = rate(2);
      out.push(`rate per day: ${r0.toFixed(3)} / ${r1.toFixed(3)} / ${r2.toFixed(3)}`);
      want(r0 > r1 * 1.4 && r1 > 0 && r2 === 0, 'rate: Viel Freizeit not faster, or Dringend Arbeit still tends');
      // one person with their own setting changes only their own share
      I.zeal = 1; const pa = I.people.find(q => stageOf(q) === 'adult' && q.h === famOfHome(I, h).id); pa.zeal = 0; const r1b = hofRate(I, h); delete pa.zeal;
      want(r1b > r1 && r1b < r0, 'rate: an own setting of one person does not count, or counts for all');
      // a craft family tends a quarter faster
      I.zeal = 1; const c = craftOf(I, h); if (!c){ const keep = I.buildings.slice(); I.buildings.push({id:999999, kind:'flecht', x:h.x + 6, y:h.y + 4, at:h.id, v:{}}); want(Math.abs(hofRate(I, h) / r1 - 1.25) < .01, 'craft: not a quarter faster'); I.buildings = keep; }
      // a balanced village sweeps in about two days and is splendid in about a week
      h.care = 0; let t = 0; while (hofStep(h) < 1 && t < 20 * DAY_TICKS){ hofTick(I, 10); t += 10; } const d1 = t / DAY_TICKS;
      while (hofStep(h) < 3 && t < 40 * DAY_TICKS){ hofTick(I, 10); t += 10; } const d3 = t / DAY_TICKS;
      out.push(`steps: gefegt after ${d1.toFixed(1)} days, prächtig after ${d3.toFixed(1)} days (family of ${membersOf(I, famOfHome(I, h)).length})`);
      want(d1 > .8 && d1 < 5 && d3 > 4 && d3 < 16, 'steps: too fast or too slow');
      // Dringend Arbeit: the yard stays as it is
      I.zeal = 2; const keepC = h.care; for (let i = 0; i < 300; i++) hofTick(I, 10); want(h.care === keepC, 'X1: the yard changes under Dringend Arbeit');
      I.zeal = 1;
      // beauty and contentment
      want(hofBeauty(I) === Math.min(8, Math.floor(I.buildings.reduce((s, q) => s + (HOF_KINDS.has(q.kind) && !q.bt ? hofStep(q) : 0), 0) / 3)), 'beauty: the yards are not counted');
      const m = membersOf(I, famOfHome(I, h))[0]; h.care = 2.4; const s3 = satOf(I, m).why.find(w => w.k === 'hof'); h.care = .7; const s1 = satOf(I, m).why.find(w => w.k === 'hof');
      want(s3 && s3.d === SAT.hof && SAT.hof <= 3 && !s1, 'contentment: the yard does not count from bepflanzt, or too much');
      // saved and loaded
      h.care = 1.77; const id = h.id; want(restore(serialize()), 'save: does not load'); I = isl('heimat');
      want(Math.abs(I.buildings.find(q => q.id === id).care - 1.77) < .01, 'save: the care is lost');
      // a village of houses: what is drawn lies free; groups show less per house
      const spots = [[48, 82], [74, 84], [58, 106], [84, 108], [-40, 44], [118, 56]], a = I.anchor || I.center, made = [];
      for (const [dx, dy] of spots){ const s = findSpot(I, 'haus', {x:a.x + dx, y:a.y + dy}); if (s){ const q = addB(I, 'haus', s, variant('haus'), tick - YEAR); made.push(q); } }
      for (const q of I.buildings) if (HOF_KINDS.has(q.kind)) q.care = 2.4;
      I._yp = null; const P = hofPlan(I);
      out.push(`plan: ${P.items.length} plants, ${P.sand.length} sand, ${P.sand.filter(s => s.plaza).length} plaza`);
      want(P.items.length > 4 && P.sand.length >= 2, 'plan: nothing drawn');
      const hit = [];
      for (const q of P.items){
        if (!landAt(I, q)) hit.push('water ' + q.k);
        for (const B of I.buildings){ if (B.kind === 'anleger') continue; const K = KINDS[B.kind], w = (K.r || 6) * ((B.v && B.v.scale) || 1) * (K.roof ? 1.75 : 1), dx = q.x - B.x, dy = q.y - B.y;
          if (Math.abs(dx) < w + q.r && dy > -(K.hy || w) - q.r && dy < (FLAT.has(B.kind) || K.soil ? w * .6 : 4) + q.r - 1 && !(HOF_KINDS.has(B.kind) && dy > 4)) hit.push(q.k + ' on ' + B.kind); }
        for (const T of I.trees || []) if (Math.abs(q.x - T.x) < q.r + 4 && q.y - T.y > -q.r - 12 && q.y - T.y < q.r + 2) hit.push(q.k + ' on a tree');
      }
      for (let i = 0; i < P.items.length; i++) for (let j = i + 1; j < P.items.length; j++){ const A = P.items[i], B = P.items[j]; if (Math.hypot(A.x - B.x, A.y - B.y) < A.r + B.r) hit.push('plants overlap'); }
      want(!hit.length, 'overlap: ' + [...new Set(hit)].slice(0, 4).join(', '));
      // per house: in a group never more than two things of its own, alone up to the full set
      const own = new Map(); for (const q of P.items){ const H = I.buildings.filter(B => HOF_KINDS.has(B.kind)).sort((x, y) => Math.hypot(x.x - q.x, x.y - q.y) - Math.hypot(y.x - q.x, y.y - q.y))[0]; own.set(H, (own.get(H) || 0) + 1); }
      out.push('per house: ' + [...own.values()].join(' '));
      // it draws without trouble at every distance
      const keepL = lod; for (const L of ['far', 'mid', 'near']){ lod = L; ctx.save(); try { drawYards(ctx, I); } catch (e){ bad.push('draw ' + L + ': ' + e.message); } ctx.restore(); } lod = keepL;
      // free time: someone goes to tend the yard
      I.zeal = 1; syncWalkers(); const w = walkers.find(q => q.isl === I.id && !q.child && !q.old && personOf(q)); let went = false;
      if (w){ for (let k = 0; k < 60 && !went; k++){ endPlay(w); if (startPlay(I, w, 'hof')) went = w.play && w.play.k === 'hof'; } }
      want(went, 'free time: nobody goes to tend the yard');
      // the house sheet shows the yard and its way; the slider shows who follows the village
      select(I.buildings.find(q => q.id === id)); if (sheetData) sheetData.tab = 'haus'; renderSheet(); const sb = $('sheetBody').innerHTML; want(/hofmini/.test(sb) && /Hof /.test(sb), 'sheet: the yard is not shown'); closeSheet();
      I.people[0].zeal = 0; openSheet('sat', {id:I.id}); const zs = $('sheetBody').innerHTML; want(/class="zc own"/.test(zs) && /zfx/.test(zs), 'sat: the slider does not show own settings'); closeSheet();
      out.push('BAD: ' + (bad.join('; ') || 'none')); return out.join('\n');
    } catch (e){ return 'ERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' '); }
  });
  console.log(r); console.log('errors', errs); await b.close();
})();
