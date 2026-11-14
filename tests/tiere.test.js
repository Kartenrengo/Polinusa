// Animals: every animal draws without an error at every distance and quality, by day, at dusk and at night, with and without
// reduced motion; only animals that fit the Lapita time live in the villages; sizes against a person; taps give a word.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const reducedMotion of ['no-preference', 'reduce']){
    const p = await (await b.newContext({viewport:{width:390, height:844}, deviceScaleFactor:1, reducedMotion})).newPage();
    p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
    await p.goto(PAGE); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      try {
        window.save = () => {}; const out = [], bad = [], want = (c, m) => { if (!c) bad.push(m); };
        newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9;
        const I = isl('heimat'), put = kind => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); if (!q) return null; const b = addB(I, kind, q, variant(kind), tick); delete b.bt; delete b.got; return b; };
        for (const k of ['haus', 'haus', 'ernte', 'speicher', 'blumen', 'blumen', 'pferch', 'fisch', 'taro']) put(k);
        I.stock.nahrung = 12; I.settled = true; syncWalkers(); syncCritters();
        // history: what the settlers brought (dog, pig, chicken) and nothing else
        want(Object.keys(CRITTER).sort().join() === 'chicken,dog,pig', 'village animals: only dog, pig and chicken (Lapita)');
        // size against a grown person (11 high, from the feet to the crown): dog < person, hen < pig <= dog
        want(CRIT_SIZE.chicken < CRIT_SIZE.pig && CRIT_SIZE.pig <= CRIT_SIZE.dog && CRIT_SIZE.dog <= 1, 'sizes: hen smaller than pig, pig not bigger than a dog');
        // every draw function, every distance and quality, day, dusk and night
        const keepL = lod, keepQ = quality, keepN = opts.night, keepZ = cam.z, keepT = tick, bugs = [], big = {x0:-1e9, y0:-1e9, x1:1e9, y1:1e9};
        const note = (w, e) => { if (bugs.length < 4) bugs.push(w + ': ' + e.message); };
        let calls = 0;
        for (const q of [0, 1, 2]) for (const L of ['far', 'mid', 'near']) for (const day of [.3, .685, .95]){
          lod = L; quality = q; opts.night = true; cam.x = I.center.x; cam.y = I.center.y; cam.z = L === 'far' ? .4 : L === 'mid' ? .9 : 2.4; tick = Math.floor(tick / DAY_TICKS) * DAY_TICKS + Math.round(DAY_TICKS * day) - 30;
          const v = view(1e4);
          for (let now = 5000; now < 90000; now += 9100){
            worldNow = now; lastEconAt = performance.now();
            const run = (w, f) => { ctx.save(); try { f(); calls++; } catch (e){ note(w + ' ' + L + '/q' + q + '/' + day, e); } ctx.restore(); };
            for (const kind of Object.keys(CRITTER)) for (const mv of [false, true]) run(kind, () => drawCritter(ctx, {kind, x:I.center.x, y:I.center.y, left:mv, moving:mv, phase:now / 90, peck:mv ? 0 : 200, _s:3}));
            run('crab', () => { drawCrabAt(ctx, 0, 0, 1, true, now / 1000, .3); drawCrabAt(ctx, 5, 0, 2, false, now / 1000, 0); });
            run('rat', () => { drawRatAt(ctx, 0, 0, 1, true, now / 1000, 1); drawRatAt(ctx, 5, 0, -1, false, now / 1000, 0); drawRats(ctx, I, big, now); });
            run('birds', () => { for (let k = 0; k < 3; k++){ const B = birdOf(k, now); stroke(ctx, B.p, '#2B1D14', B.w, null, 'round', .85); } });
            run('flyfish', () => drawFlyingFish(ctx, 0, 0, -1, .4, 1.5));
            run('anim', () => drawAnim(ctx, now));
            run('sea life', () => { drawSeaLife(ctx, v, now); drawWhales(ctx, v, now); drawLagoonLife(ctx, v, now); });
            run('lagoon turtle', () => drawLagoonTurtle(ctx, I, lagoonLoop(I), now));
            run('butterflies', () => drawButterflies(ctx, v, now));
            run('hingucker', () => { drawEyes(ctx, v, now); drawReefDolphins(ctx, I, lagoonLoop(I), big, now); drawFishLeaps(ctx, I, lagoonLoop(I), big, now); drawHeron(ctx, I, big, now); drawGecko(ctx, I, big, now); drawFlughunde(ctx, I, big, now); drawBeautyTop(ctx, v, now); drawNightEyes(now); });
            run('light whale', () => { lightWhale = {x:I.center.x, y:I.center.y, hx:1, hy:0, t0:performance.now() - 8000, isl:I.id, seen:false}; drawLightWhale(performance.now()); lightWhale = null; });
          }
        }
        lod = keepL; quality = keepQ; opts.night = keepN; cam.z = keepZ; tick = keepT;
        want(!bugs.length, 'animals draw without errors: ' + bugs.join(' | ')); out.push(`animal draws ${calls}`);
        // a tap on a dog, a rat, a whale gives a word; the critter's tap area is tight (it does not eat taps meant for houses)
        { eyes.length = 0; lod = 'near'; cam.z = 2.4; ctx.save(); const a = {kind:'dog', x:I.center.x + 3, y:I.center.y + 3, left:false, moving:false, phase:0, peck:0, _s:1}; drawCritter(ctx, a); ctx.restore();
          const msgs = [], toast0 = toast; window.toast = m => { msgs.push(m); }; delete eyeSaid.dog;
          want(hitEye({x:a.x, y:a.y - 2}) && msgs.length === 1 && /Hund/.test(msgs[0]), 'a tap on a dog gives a word'); want(!hitEye({x:a.x + 40, y:a.y}), 'the dog\'s tap area is tight'); window.toast = toast0; lod = keepL; cam.z = keepZ; }
        out.push('BAD: ' + (bad.join('; ') || 'none'));
        return out.join('\n');
      } catch (e){ return 'ERR ' + e.message + ' ' + e.stack; }
    });
    console.log(reducedMotion === 'reduce' ? '-- reduced motion' : '-- normal'); console.log(r);
  }
  console.log('errors', errs.length, errs.slice(0, 3)); await b.close();
})();
