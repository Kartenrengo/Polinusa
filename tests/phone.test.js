// Like a phone: a slow CPU (four times slower, as a mid-range phone), the screen of a small and a big phone. Measures the
// frame time close up over the village and the forest, and looks for things that stick out of the screen or are too
// small to tap.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), bad = [], log = [];
  for (const [w, h, dpr] of [[320, 568, 2], [390, 844, 3]]){
    const ctx = await b.newContext({viewport:{width:w, height:h}, deviceScaleFactor:dpr, isMobile:true, hasTouch:true}), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push('PAGE ' + e.message));
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
    await p.goto(PAGE); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.save = () => {}; newGame(4242); landHome(isl('heimat')); closeSheet(); skipTutorial(true); nextEvent = 1e9;
      const I = isl('heimat'), put = kind => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); return addB(I, kind, q, variant(kind), tick); };
      for (const k of ['ernte', 'faeller', 'fisch', 'haus', 'haus', 'taro', 'quelle']) put(k); stats.peakPop = 20;
      for (let t = 0; t < 20; t++){ for (let k = 0; k < 40; k++) stepWalkers(50); econ(); if (sheetKind) closeSheet(); }
      camAnim = null; cam.x = I.anchor.x; cam.y = I.anchor.y + 20; cam.z = 2.6; applyCam(); });
    await p.waitForTimeout(9000);   // time for the frame governor to settle
    const fr = await p.evaluate(() => new Promise(res => { const ts = []; const f = t => { ts.push(t); if (ts.length < 120) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
    const d = fr.slice(1).map((t, i) => t - fr[i]).sort((x, y) => x - y), avg = d.reduce((s, x) => s + x, 0) / d.length, p95 = d[Math.floor(d.length * .95)];
    const q = await p.evaluate(() => typeof quality !== 'undefined' ? quality : 'n/a');
    log.push(`${w}x${h} slow cpu: ${avg.toFixed(1)} ms per frame on average, 95% under ${p95.toFixed(1)} ms, quality ${q}`);
    // every sheet: nothing wider than the screen, tap targets at least 28 px
    const ui = await p.evaluate(() => {
      const out = [], I = isl('heimat'), sheets = [['needs'], ['store'], ['calendar'], ['menu'], ['finale'], ['info', {id:I.buildings.find(q => q.kind === 'ernte').id}], ['info', {id:homesOf(I)[0].id}]];
      for (const [k, d] of sheets){ closeSheet(); openSheet(k, d);
        const body = $('sheetBody'); if (body.scrollWidth > body.clientWidth + 2) out.push(`${k}: ${body.scrollWidth - body.clientWidth}px too wide`);
        for (const el of body.querySelectorAll('button')){ const r = el.getBoundingClientRect(); if (r.width && (r.width < 28 || r.height < 26)) out.push(`${k}: small button "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}" ${r.width | 0}x${r.height | 0}`); }
      }
      closeSheet(); const top = $('top').getBoundingClientRect(); if ($('top').scrollWidth > innerWidth + 2) out.push('top band too wide');
      return out;
    });
    if (ui.length) log.push('  ' + ui.slice(0, 12).join('\n  '));
    bad.push(...errs, ...ui.filter(x => /too wide/.test(x)));
    // the headless browser draws without a graphics card, and how fast it is depends on the machine: only a picture that
    // nearly stands still counts as a failure
    if (avg > 160) bad.push(`${w}x${h}: frames too slow (${avg.toFixed(0)} ms on average)`);
    await ctx.close();
  }
  console.log(log.join('\n')); console.log('BAD: ' + (bad.join('; ') || 'none')); await b.close();
})();
