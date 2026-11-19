// Fleet: a canoe that explores lasts long, goes to new places and gets home; a trade chain never stops for a full store;
// no canoe stays stuck (no way, lying at sea on a chain, rocking in the wind); old saves still load.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({viewport:{width:390, height:844}})).newPage(), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    try {
      window.save = () => {}; const out = [], bad = [], want = (c, m) => { if (!c) bad.push(m); };
      const fresh = seed => { newGame(seed); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9; toast = () => {}; };
      const steps = n => { for (let i = 0; i < n; i++){ stepShips(performance.now(), 50); if (i % 20 === 0) tick++; } };
      // ---------- exploring: 24 provisions last long, new sea each trip, home again before the provisions are gone
      { const seeds = [4242, 77, 913], all = [];
        for (const sd of seeds){
          fresh(sd); const H = isl('heimat'); H.stock.proviant = 500; const s = makeShip('dc', H); s.cargo = {}; setAuto(s, true);
          const trips = [], seen = []; let cur = {t0:0, hungry:false, cells:new Set(), b0:stats.boeen || 0}, wasM = false;
          for (let t = 0; t < 1500 && trips.length < 3; t++){
            let home = false; for (let k = 0; k < 20; k++){ stepShips(performance.now(), 100); if (s.state === 'moored') home = true; }
            tick++; feedCrews();
            if (s.state === 'sail') cur.cells.add(Math.floor(s.x / 160) + ',' + Math.floor(s.y / 160));
            if (s.hungry) cur.hungry = true;
            const m = home || s.state === 'moored';
            if (m && !wasM){ trips.push({ticks:t - cur.t0, hungry:cur.hungry && (stats.boeen || 0) === cur.b0, cells:cur.cells}); cur = {t0:t, hungry:false, cells:new Set(), b0:stats.boeen || 0}; }
            wasM = m; if (!s.auto) break;
          }
          want(trips.length === 3, `explore seed ${sd}: only ${trips.length} trips`);
          want(trips.every(x => !x.hungry), `explore seed ${sd}: the crew ran out of provisions at sea`);
          const un = new Set(trips.flatMap(x => [...x.cells])), avg = trips.reduce((a, x) => a + x.ticks, 0) / (trips.length || 1);
          want(avg >= 200, `explore seed ${sd}: a trip lasts only ${Math.round(avg)} ticks`);
          if (trips[0] && trips[1]){ const o = [...trips[1].cells].filter(c => trips[0].cells.has(c)).length / trips[1].cells.size; want(o < .75, `explore seed ${sd}: the second trip goes ${Math.round(o * 100)} % the same way`); }
          want(un.size >= 80, `explore seed ${sd}: only ${un.size} places visited`);
          all.push(`${sd}: ${trips.map(x => x.ticks + 't/' + x.cells.size + 'c').join(' ')}`);
          want((s.vis || []).length > 0 && s.vis.length <= VIS_MAX, 'explore: no memory of places');
        }
        out.push('explore ' + all.join(' | ')); }
      // ---------- the memory of places is saved, and a save without it still loads
      { fresh(4242); const H = isl('heimat'); const s = makeShip('dc', H); s.vis = [{x:500, y:600}, {x:900, y:700}]; s.auto = true;
        const raw = serialize(); const o = JSON.parse(raw); delete o.ships[0].vs; const old = JSON.stringify(o);
        want(restore(raw) && ships[0].vis.length === 2 && ships[0].vis[1].x === 900, 'save: places lost');
        want(restore(old) && Array.isArray(ships[0].vis) && !ships[0].vis.length, 'save: old save without places does not load');
        const o2 = JSON.parse(raw); delete o2.routes; delete o2.ships[0].vs; want(restore(JSON.stringify(o2)), 'save: save without chains does not load'); }
      // ---------- trade chains
      fresh(4242);
      const H = isl('heimat'), T = islands.find(J => !J.settled && !J.clan && J.type !== 'atoll');
      if (!T) out.push('no island for trade');
      else {
        discover(T); exploreAt(T.center.x, T.center.y, 400); settle(T, H, {pop:6, stock:{matten:12, nahrung:10, wasser:10}, folk:[], life:[]});
        const ri = routes.length; routes.push({a:H.id, b:T.id, knots:1, lastGift:tick, plan:{a:{holz:6}, b:{matten:6}}, keep:{a:{}, b:{}}});
        const real = sailTo, sum = (ship) => GOODS.reduce((n, k) => n + (H.stock[k] || 0) + (T.stock[k] || 0) + (ship.cargo[k] || 0), 0);
        // both stores full: the canoe keeps going to and fro, loses nothing
        for (const k of GOODS){ H.stock[k] = storeCap(H); T.stock[k] = storeCap(T); }
        let s = makeShip('dc', H); assignRoute(s, ri); const t0 = sum(s); let trips = 0, last = s.port, idle = 0;
        for (let i = 0; i < 12000; i++){ steps(1); if (s.port && s.port !== last){ trips++; last = s.port; } }
        want(trips >= 10, `chain: both stores full, only ${trips} trips`); want(sum(s) === t0, 'chain: goods lost with both stores full');
        // only one good is full at the far end: the rest still goes there, the full good stays aboard or at home
        ships.length = 0; for (const k of GOODS){ H.stock[k] = 15; T.stock[k] = 0; } T.stock.holz = storeCap(T); H.stock.matten = 0; T.stock.matten = 12;
        routes[ri].plan = {a:{holz:6, fisch:4}, b:{matten:6}}; H.stock.fisch = 15; s = makeShip('dc', H); assignRoute(s, ri); const t1 = sum(s);
        for (let i = 0; i < 6000; i++) steps(1);
        want(sum(s) === t1, 'chain: goods lost with one full good'); want(H.stock.matten > 0, 'chain: mats do not come home when holz is full at the far end'); want(T.stock.fisch > 0, 'chain: fish do not arrive when holz is full');
        // a keep amount stays in the store
        ships.length = 0; for (const k of GOODS){ H.stock[k] = 0; T.stock[k] = 0; } H.stock.holz = 8; routes[ri].plan = {a:{holz:6}, b:{}}; routes[ri].keep = {a:{holz:5}, b:{}};
        s = makeShip('dc', H); assignRoute(s, ri); want(s.cargo.holz === 3 && H.stock.holz === 5, `chain: keep amount not kept (${s.cargo.holz} aboard, ${H.stock.holz} left)`);
        out.push(`chain: both full ${trips} trips, keep ok`);
        // a canoe that finds no way leaves the chain instead of waiting for ever
        ships.length = 0; routes[ri].keep = {a:{}, b:{}}; routes[ri].plan = {a:{holz:6}, b:{matten:6}}; s = makeShip('dc', H); assignRoute(s, ri); steps(50);
        sailTo = () => false; steps(3000); want(s.route == null && s.state === 'moored', `stuck: no way, but ${s.state} on chain ${s.route}`);
        // assigned where it cannot sail: it does not sit there as if on a chain
        ships.length = 0; s = makeShip('dc', H); const U = islands.find(J => J !== H && J !== T && J.discovered && !J.settled);
        if (U){ s.port = U.id; s.state = 'moored'; assignRoute(s, ri); steps(500); want(s.route == null, 'stuck: assigned with no way, still on the chain'); }
        sailTo = real;
        // lying at sea on a chain (e.g. after loading a game): it takes up its loop again
        ships.length = 0; s = makeShip('dc', H); assignRoute(s, ri); steps(30); s.state = 'sea'; s.port = null; s.dest = null; s.path = []; s.cargo = {};
        let moved = false; for (let i = 0; i < 4000 && !moved; i++){ steps(1); moved = s.state === 'sail' || !!s.port; } want(moved && s.route === ri, 'stuck: lying at sea on a chain for ever');
        // a canoe on a chain is saved with its chain; a lost chain does not shift the others
        ships.length = 0; s = makeShip('dc', H); assignRoute(s, ri); routes[ri].keep = {a:{holz:3}, b:{}}; const raw = serialize();
        want(restore(raw) && ships[0].route === ri && routes[ri].keep.a.holz === 3, 'save: chain or keep amount lost');
        const o = JSON.parse(raw); o.routes.unshift({a:'nirgends', b:H.id, knots:1, lg:0}); o.ships[0].route = ri + 1; want(restore(JSON.stringify(o)) && ships[0].route === ri, 'save: chain index shifted when a chain is dropped');
        out.push('stuck cases ok');
        // a long trip in the wind: no zigzag, the heading changes smoothly and never flips back
        ships.length = 0; s = makeShip('dc', H); let px = s.x, py = s.y, pa = null, maxTurn = 0, rev = 0;
        sailTo(s, {isl:T.id}, true); for (let i = 0; i < 4000 && s.state === 'sail'; i++){ stepShips(performance.now(), 100); if (Math.hypot(s.x - px, s.y - py) > .01){ const a2 = Math.atan2(s.y - py, s.x - px); if (pa != null){ const d = Math.abs(Math.atan2(Math.sin(a2 - pa), Math.cos(a2 - pa))) * 180 / Math.PI; maxTurn = Math.max(maxTurn, d); if (d > 120) rev++; } pa = a2; px = s.x; py = s.y; } }
        want(s.state !== 'sail', 'sail: did not arrive'); want(maxTurn < 20 && !rev, `sail: heading jumped ${maxTurn.toFixed(1)} degrees in one step, ${rev} reversals`);
      }
      out.push('BAD: ' + (bad.join('; ') || 'none'));
      return out.join('\n');
    } catch (e){ return 'ERR ' + e.message + ' ' + e.stack; }
  });
  console.log(r); console.log('errors', errs); await b.close();
})();
