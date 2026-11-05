// Free time and work moments: children, the old and those without work play; workers have the evening off and go back;
// trees fall; every animation draws without an error, close up.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({viewport:{width:390, height:844}})).newPage(), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    window.save = () => {}; newGame(4242); landHome(isl('heimat')); closeSheet(); skipTutorial(true); nextEvent = 1e9; opts.night = false;
    const I = isl('heimat'), put = kind => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); return addB(I, kind, q, variant(kind), tick); }, bad = [];
    put('ernte'); put('faeller'); put('fisch'); put('haus'); put('haus'); stats.peakPop = 14;
    const play = {}, off = {}, fx = {}; let backAtWork = 0;
    for (let t = 0; t < 400; t++){
      for (let k = 0; k < 40; k++){ stepWalkers(50); stepShips(performance.now(), 50);
        for (const w of walkers){ if (w.play) (w.job ? off : play)[w.play.k] = 1; if (w.fx) fx[w.fx] = 1; if (w.job && !w.play && w.leg === 'work' && w.on) backAtWork++; } }
      walkAt = performance.now(); econ(); for (const s of ships.slice()) if (s.immig && s.state === 'moored') immigAnswer(s, true); if (sheetKind) closeSheet();
    }
    if (Object.keys(play).length < 3) bad.push('little free time: ' + Object.keys(play));
    if (!Object.keys(off).length) bad.push('no evening off');
    if (!stats.gefaellt) bad.push('no tree felled');
    // every kind of free time can start, and every work moment draws close up
    const kinds = Object.keys(PLAY).filter(k => k !== 'listen'); let started = 0;
    for (const k of kinds){ const w = walkers.find(q => !q.job && !q.boat && landAt(I, q)) || walkers.find(q => landAt(I, q)); if (!w) break; if (w.play) endPlay(w); if (startPlay(I, w, k)) started++; for (let i = 0; i < 600; i++) stepWalkers(20); }
    if (started < kinds.length - 3) bad.push(`only ${started} of ${kinds.length} kinds started`);
    cam.z = 4; camAnim = null; const v = view(60), c = ctx;
    for (const f of ['raise', 'lash', 'show', 'drink', 'stretch', 'wipe', 'kite', 'toy', 'string', 'hiko', 'garland', 'story', 'drum']){ const w = walkers[0]; w.busy = {x:w.x, y:w.y}; w.fx = f; w.show = 'topf'; w.boutT = 2000; w.wait = 1000; try { c.save(); workFx(c, w, performance.now()); c.restore(); } catch (e){ bad.push(f + ': ' + e.message); } }
    const t0 = I.trees.find(q => q.st === 0); if (t0){ falling(t0.x, t0.y, {tree:{...t0}, isl:I.id}, null); try { drawFalls(ctx, view(1e5), performance.now() + 1000); } catch (e){ bad.push('fall: ' + e.message); } }
    return {play:Object.keys(play), off:Object.keys(off), fx:Object.keys(fx).length, felled:stats.gefaellt, started, bad};
  });
  console.log(JSON.stringify(r)); console.log('BAD: ' + (r.bad.concat(errs).join('; ') || 'none')); await b.close();
})();
