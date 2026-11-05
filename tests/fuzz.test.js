// Click fuzz: every sheet in several game states, every button in it, plus random taps on the map. Reports page errors.
const {chromium}=require('playwright');
const {PAGE} = require('./lib');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|Failed to load resource/.test(m.text())) errs.push('CON ' + m.text()); });
await p.goto(PAGE);await p.waitForTimeout(2000);
const res = await p.evaluate(async ()=>{
  window.save = () => {}; const log = []; let clicks = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pressAll = async (tag, skip = /reset|askreset/) => {
    // press each button of the open sheet once, re-opening the sheet as it was after each press
    const kind = sheetKind, data = sheetData && JSON.parse(JSON.stringify(sheetData, (k, v) => k === 'R' ? undefined : v));
    if (!kind) return;
    const n = document.querySelectorAll('#sheetBody button').length;
    for (let i = 0; i < n; i++){
      if (!sheetKind) { try { openSheet(kind, data && kind !== 'away' ? JSON.parse(JSON.stringify(data)) : data); } catch (e){ log.push(`${tag} reopen ${kind}: ${e.message}`); return; } }
      const bs = [...document.querySelectorAll('#sheetBody button')], btn = bs[i]; if (!btn) break;
      if (skip.test(btn.dataset.act || '')) continue;
      try { btn.click(); clicks++; } catch (e){ log.push(`${tag} ${kind} ${btn.dataset.act}: ${e.message}`); }
      if (mode === 'place' || mode === 'move'){ try { endPlace(); } catch (e){} }
      if (mode === 'road' || mode === 'unroad'){ try { endPlace(); } catch (e){} }
      await sleep(5);
    }
  };
  const tapRandom = n => { for (let i = 0; i < n; i++){ const I = islands[Math.floor(Math.random() * islands.length)]; const pt = {x:I.center.x + (Math.random() - .5) * 400, y:I.center.y + (Math.random() - .5) * 400}; try { onTap(pt); } catch (e){ log.push('tap: ' + e.message); } } };
  const sheets = () => {
    const Hm = isl('heimat'), list = [['needs'], ['store'], ['mana'], ['calendar'], ['fleet'], ['quest'], ['intro'], ['menu'], ['chronik'], ['finale'], ['folk', {id:'heimat'}], ['rename', {id:'heimat'}]];
    for (const b of islands.filter(I => I.settled).flatMap(I => I.buildings)) list.push(['info', {id:b.id}]);
    for (const s of ships.filter(s => s.own)) list.push(['ship', {id:s.id}], ['ship', {id:s.id, load:true}]);
    routes.forEach((r, i) => list.push(['route', {r:i}]));
    for (const C of islands.filter(I => I.clan && I.discovered)) list.push(['clan', {id:C.id}]);
    return list;
  };
  const sweep = async tag => {
    for (const [k, d] of sheets()){ try { closeSheet(); openSheet(k, d); } catch (e){ log.push(`${tag} open ${k}: ${e.message}`); continue; } await pressAll(tag); closeSheet(); }
    tapRandom(40); closeSheet();
  };
  // 1. at sea
  tapRandom(30); try { openSheet('landing', {}); } catch (e){ log.push('landing ' + e.message); } await pressAll('landing', /found|reset|askreset/); closeSheet();
  // 2. landed, early
  landHome(isl('wahl')); closeSheet(); for (let i = 0; i < 20; i++) econ(); await sweep('early');
  // 3. a grown game: many buildings, canoes, routes, a clan, a culture, an event
  const Hm = isl('heimat'), T = isl('tochter'); Object.assign(Hm.stock, {holz:200, nahrung:50, beile:20, matten:20, schnur:20, toepfe:20, proviant:20, kava:5, schweine:6, tapa:5, schmuck:4, perlmutt:3, federn:3, tabua:2}); Hm.pop = 40; syncPeople(Hm);
  quest = QUESTS.length; for (const k of ['faeller','haus','haus','taro','fisch','riff','taucher','toepfer','beil','werft','speicher','sternhaus','ahnenhaus','halle','gaergrube','pflanzer','garten','klopf','pferch','kavagarten','trommel','tanzplatz','blumen','fackel','pfosten','hibiskus','baum','palme']){ setActive('heimat'); try { startPlace(k); if (placing && placing.ok) confirmPlace(); if (placing) endPlace(); } catch (e){ log.push('build ' + k + ': ' + e.message); } }
  for (const x of Hm.buildings) if (x.bt) x.bt = 1e-4; for (let i = 0; i < 10; i++) econ();
  const oc = makeShip('oc', Hm), dc = makeShip('dc', Hm); oc.people = 4; oc.folk = Hm.people.filter(isAdult).slice(0, 4); Hm.people = Hm.people.filter(q => !oc.folk.includes(q)); Hm.pop -= 4; oc.life = ['taro']; oc.x = T.harbor.x; oc.y = T.harbor.y; oc.port = T.id; oc.state = 'moored'; oc.last = 'heimat'; mana = 60; settleFrom(oc);
  for (const c of home0.cultures) ensureCell(c.cx, c.cy, true); for (let cx = 0; cx < 5; cx++) for (let cy = 2; cy < 8; cy++) ensureCell(cx, cy, true);
  for (const C of islands.filter(I => I.clan)) C.discovered = true;
  const C = islands.find(I => I.clan && !I.clan.culture) || islands.find(I => I.clan); if (C){ routes.push({a:'heimat', b:C.id, knots:3, lastGift:tick, plan:{a:{toepfe:2}, b:{}}}); }
  { const g = wearGrid(Hm); for (let i = 0; i < 40; i++){ const k = wearAt(g, Hm.anchor.x + i * 3, Hm.anchor.y + 10); if (k >= 0){ g.v[k] = 50; g.lv[k] = 3; g.road[k] = 1; g.age[k] = 255; } } Hm._wp = null; }
  startYard(Hm, 'oc'); for (let i = 0; i < 60; i++) econ();
  nextEvent = tick; for (let i = 0; i < 5 && !eventNow; i++) econ();
  if (eventNow){ await pressAll('event'); closeSheet(); }
  await sweep('grown');
  // 4. after being away
  const R = catchUp(2 * 3600 * 1000); if (R){ try { welcomeBack(R); } catch (e){ log.push('away: ' + e.message); } await pressAll('away'); closeSheet(); }
  await sweep('after away');
  // 5. save, load, sweep once more
  const sv = serialize(); if (!restore(sv)) log.push('restore failed'); renderAll(); await sweep('loaded');
  // 6. a new game from the menu, then sweep in the landing state again
  openSheet('menu'); const rb = [...document.querySelectorAll('#sheetBody button')].find(b => b.dataset.act === 'askreset'); if (rb){ rb.click(); const r2 = [...document.querySelectorAll('#sheetBody button')].find(b => b.dataset.act === 'reset'); if (r2) r2.click(); }
  log.push('after reset landing ' + !!landing + ' sheet ' + sheetKind);
  tapRandom(20); await pressAll('landing2', /found|reset|askreset/);
  return {log, clicks};
});
await p.waitForTimeout(3000);
console.log(JSON.stringify(res, null, 1).slice(0, 3000));
console.log('errors', errs.length, JSON.stringify(errs.slice(0, 12), null, 1)); await b.close();})();
