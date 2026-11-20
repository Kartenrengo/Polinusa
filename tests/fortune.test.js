// Spannung und Belohnung (fortune.js): a voyage asks for a choice, a crisis is announced with its stores and passes, a dream
// begins and comes true, a sight can be tapped, gifts to a clan bring a treasure, and every find lands in the basket.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({viewport:{width:390, height:844}})).newPage(), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const bad = [], want = (c, m) => { if (!c) bad.push(m); };
    try {
      window.save = () => {}; newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9; stats.peakPop = 25; quest = QUESTS.length;
      const H = isl('heimat'); H.pop = 16; syncPeople(H); Object.assign(H.stock, {wasser:40, nahrung:40, holz:20, dach:20, proviant:10});
      // the basket
      const m0 = mana; gainFind('wal', 'Test'); want(foundOf().wal != null && mana > m0, 'find: not in the basket or no standing');
      want(!$('reward').hidden && /Buckelwal/.test($('reward').textContent), 'find: no reward card'); hideReward();
      for (const F of FINDS.filter(q => q.c === 'meer')) foundOf()[F.id] = 1; delete foundOf().perle; const m1 = mana; gainFind('perle'); want(mana - m1 >= 4 + 5, 'find: a full row brings no bonus'); hideReward();
      openSheet('finds'); want(/Fundkorb/.test($('sheet').textContent) && $('sheet').querySelectorAll('.fslot').length === FINDS.length, 'basket: sheet wrong'); closeSheet();
      // a voyage
      const s = makeShip('dc', H); s.name = 'Lele'; s.state = 'sail'; s.auto = true; s.x = H.center.x + 500; s.y = H.center.y; s.cargo = {proviant:8}; stats.voyAt = 0; voyageTick();
      want(eventNow && eventNow.E.id === 'fahrt' && sheetKind === 'event', 'voyage: no sign on the sea');
      { const btn = document.querySelector('[data-act="choose"][data-i="1"]'); if (btn) btn.click(); want(!eventNow && !sheetKind, 'voyage: the choice did not close'); }
      // a crisis, prepared
      stats.crisisAt = 0; stats.crisis = null; crisisTick(); const C = stats.crisis; want(!!C && C.at > tick && Object.keys(C.need).length, 'crisis: not announced');
      want($('crisis') && !$('crisis').hidden, 'crisis: no card');
      if (C){ for (const [g, n] of Object.entries(C.need)) H.stock[g] = Math.max(H.stock[g] || 0, n); const k0 = stats.krisen || 0; tick = C.at; crisisTick(); want(!stats.crisis && (stats.krisen || 0) === k0 + 1, 'crisis: prepared but not overcome'); hideReward(); }
      // a dream, made true
      stats.dreamAt = 0; stats.dreams = []; dreamTick(); const d = stats.dreams[0]; want(!!d, 'dream: none begins');
      if (d){ const P = H.people.find(q => q.id === d.pid); if (d.k === 'tatau') P.tt = 1; else if (d.k === 'navigator') P.nv = 1; else if (d.k === 'fest') H.feastAt = tick + 1; else d.ok = 1;
        if (d.k === 'tatau' || d.k === 'navigator' || d.k === 'fest'){ dreamTick(); want(d.done > 0, 'dream: true but not noticed'); } hideReward(); }
      // a sight
      stats.sightAt = 0; cam.z = 2; applyCam(); sights = []; sightTick(); want(sights.length === 1, 'sight: none shows'); const n0 = foundN(); if (sights[0]) claimSight(sights[0]); want(!sights.length, 'sight: not taken'); hideReward();
      // a clan
      const T = islands.find(I => I.clan); if (T){ for (let i = 0; i < 3; i++) clanFavor(T); want(stats.favor[T.clan.id] === 3, 'clan: favour not counted'); }
      // nothing of this while catching up
      catching = true; const v0 = stats.voyAt; stats.voyAt = 0; fortuneTick(); want(!eventNow, 'catch-up: an event opened'); catching = false; stats.voyAt = v0;
    } catch (e){ bad.push('ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    return 'BAD: ' + (bad.join('; ') || 'none'); });
  await p.waitForTimeout(2500);
  console.log(r); console.log('errors', errs.length, errs.slice(0, 3)); await b.close();
})();
