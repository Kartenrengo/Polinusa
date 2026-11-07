// The soundtrack: the notes of a bar come from a pure function, so they can be checked without sound; then the real
// Web Audio nodes are scheduled for a few minutes of game time to see that nothing throws.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({viewport:{width:390, height:844}}), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const bad = [], out = [], want = (c, m) => { if (!c) bad.push(m); };
    try {
      window.save = () => {}; newGame(4242); landHome(isl('heimat')); closeSheet(); opts.sound = true;
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const S0 = {phase:.35, night:true, season:'passat', feast:false, rainDance:false, storm:false, voyage:false, pop:12, hawaiki:false};
      const KINDS_OK = new Set(['drum', 'tube', 'rattle', 'hum', 'mel', 'flute', 'drone']);
      const run = S => { const M = musicMood(S), st = {deg:5}; let ev = []; for (let bar = 0; bar < 40; bar++) ev = ev.concat(musicBar(M, bar, rnd, st).map(e => ({...e, bar}))); return {M, ev}; };
      // every note is sane, in every state
      for (const season of ['plejaden', 'sturm', 'passat', 'mager']) for (const phase of [.1, .35, .55, .8]) for (const extra of [{}, {feast:true}, {rainDance:true}, {storm:true}, {voyage:true}, {hawaiki:true}, {pop:60}]){
        const {M, ev} = run({...S0, season, phase, ...extra});
        for (const e of ev){ if (!KINDS_OK.has(e.k) || !(e.f > 25 && e.f < 8000) || !(e.v > 0 && e.v < .35) || !(e.at >= 0 && e.at < 4) || !(e.d > 0)){ bad.push(`bad note ${JSON.stringify(e)} in ${season} ${phase} ${JSON.stringify(extra)}`); break; } }
        want(M.bpm >= 30 && M.bpm <= 130, `tempo ${M.bpm}`);
      }
      // the mood follows the life of the village
      const n = S => run(S).ev.length;
      const night = n({...S0, phase:.8}), day = n(S0), feast = n({...S0, feast:true});
      out.push(`notes in 40 bars: night ${night}, day ${day}, feast ${feast}`);
      want(night < day && day < feast, 'music: night is not quieter than day, or a feast not busier');
      want(musicMood({...S0, storm:true}).drone === 1 && run({...S0, storm:true}).ev.some(e => e.k === 'drone') && !run({...S0, storm:true}).ev.some(e => e.k === 'rattle'), 'music: the storm has no drone, or a rattle');
      want(musicMood({...S0, voyage:true}).scale === 'lydian', 'music: a voyage is not in the wide scale');
      want(!run(S0).ev.some(e => e.k === 'flute') && run({...S0, hawaiki:true}).ev.some(e => e.k === 'flute'), 'music: the nose flute comes only in Hawaiki');
      want(musicMood({...S0, pop:60}).hum > musicMood({...S0, pop:5}).hum, 'music: a bigger village has no more voices');
      want(musicMood({...S0, season:'sturm'}).scale === 'minor' && musicMood({...S0, season:'passat'}).scale === 'major', 'music: the year does not change the key');
      want(run({...S0, rainDance:true}).M.mode === 'rain' && musicMood({...S0, feast:true, rainDance:true}).mode === 'feast', 'music: the modes are mixed up');
      // the state read from the game
      const S = musicState(); want(typeof S.phase === 'number' && typeof S.season === 'string', 'music: no state'); out.push(`state ${JSON.stringify(S)}`);
      // the real thing: schedule five minutes of bars in every mood, then switch the music off
      audioStart(); want(!!actx, 'audio: no context'); 
      if (actx){
        let t = actx.currentTime, total = 0;
        for (const extra of [{}, {feast:true}, {storm:true}, {voyage:true, hawaiki:true}, {rainDance:true}]){ musicAt = 0; for (let k = 0; k < 40; k++){ total += musicSchedule(t, {...S0, ...extra}, rnd); t += 1.2; } }
        out.push(`scheduled ${total} notes, context ${actx.state}`); want(total > 400, `audio: only ${total} notes scheduled`);
        setMusic(false); want(musicSchedule(t, S0, rnd) === 0, 'audio: music off still schedules'); setMusic(true);
        cycleMusicVol(); cycleMusicVol(); cycleMusicVol(); want((opts.mvol ?? 1) === 1, 'audio: the volume does not come round');
        openSheet('menu'); want(/Musik/.test($('sheetBody').textContent), 'menu: no music switch'); closeSheet();
      }
    } catch (e){ bad.push('ERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' ')); }
    out.push('BAD: ' + (bad.join('; ') || 'none')); return out.join('\n');
  });
  console.log(r); console.log('errors', errs); await b.close();
})();
