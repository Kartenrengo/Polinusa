// Whole-game check: a bot that only follows the elders' advice (and the task card) from the landing on, for several seeds.
// It builds where the game proposes, keeps errors and broken invariants, and reports how far each village gets.
const {chromium}=require('playwright');
const {PAGE} = require('./lib');
const args = process.argv.slice(2), MIN = +((args.find(a => a.startsWith('--min=')) || '--min=60').slice(6)), seeds = args.map(Number).filter(Boolean); if (!seeds.length) seeds.push(101, 202, 303);
(async()=>{const b=await chromium.launch();
for (const SEED of seeds){
const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
await p.goto(PAGE);await p.waitForTimeout(1500);
const r = await p.evaluate(async ([SEED, MIN])=>{
  window.save = () => {}; const log = [], bad = [];
  newGame(SEED); landHome(isl(SEED % 2 ? 'wahl' : 'heimat')); closeSheet(); renderAll();
  const Hm = () => isl('heimat');
  // a household craft is taken up in a house that can do it; where none can, a hut goes up by the clay or the pandanus
  const tryCraft = kind => { const I = isl(active); if (I.buildings.filter(b => b.kind === kind).length >= 2) return 'enough'; const hs = homesOf(I).sort((a, b) => !famOfHome(I, a) - !famOfHome(I, b)), h = hs.find(q => !craftOf(I, q) && !craftWhy(I, q, kind));
    if (h){ setCraft(I, h, kind); return 'craft'; } if (!placeWhy(I, kind) || I.buildings.some(b => b.kind === 'haus' && b.bt)) return 'nohouse'; const at = craftPlace(I, kind); if (!at || !canPay(I, costOf('haus', I))) return 'poor';
    startPlace('haus'); if (!placing) return 'refused'; const q = findSpot(I, 'haus', at); if (q){ placing.x = q.x; placing.y = q.y; ghostRender(); } const ok = placing.ok; if (ok) confirmPlace(); if (placing) endPlace(); return ok ? 'hut' : 'nospot'; };
  const tryBuild = kind => { if (kind && KINDS[kind] && KINDS[kind].craft && unlocked(kind)) return tryCraft(kind); if (!kind || !KINDS[kind] || !unlocked(kind)) return 'locked'; const I = isl(active); if (I.buildings.some(b => b.kind === kind && b.bt)) return 'site'; if (kind !== 'haus' && I.buildings.filter(b => b.kind === kind).length >= 3) return 'enough'; const c = costOf(kind, I); if (!canPay(I, c)) return 'poor'; startPlace(kind); if (!placing) return 'refused'; if (!placing.ok){ const q = findSpot(I, kind, placing); if (q){ placing.x = q.x; placing.y = q.y; ghostRender(); } } const ok = placing && placing.ok; if (ok) confirmPlace(); if (placing) endPlace(); return ok ? 'ok' : 'nospot'; };
  let crowd = new Set(), now = new Set();
  const check = tag => { crowd = now; now = new Set(); for (const I of islands.filter(J => J.settled)){
      if (I.pop !== (I.people || []).length) bad.push(`${tag} ${I.name} pop ${I.pop} people ${(I.people || []).length}`);
      for (const k of GOODS){ const v = I.stock[k] || 0; if (!(v >= 0) || v > storeCap(I)) bad.push(`${tag} ${I.name} ${k}=${v}`); }
      for (const q of I.people || []) if (!famOf(I, q.h)) bad.push(`${tag} ${q.n} without family`);
      // a house may be too full for a moment when needs drop (one moves out every half minute); not for five minutes on end
      for (const f of famsOf(I)) if (f.home){ const h = findB(f.home); if (!h) bad.push(`${tag} family ${f.n} without its house`); else if (membersOf(I, f).length > homeCap(I, h) + 1){ if (crowd.has(f.id)) bad.push(`${tag} family ${f.n} crowded for 5 min`); now.add(f.id); } }
    } };
  const answer = () => { if (eventNow){ const {E, o} = eventNow, I = E.place ? E.place(o) : o; const i = E.choices.findIndex(ch => { const c = ch.ask ? E.cost(o) : ch.cost; return !c || canPay(I, c); }); try { eventAct('choice', {dataset:{i:String(Math.max(0, i))}}); } catch (e){} if (sheetKind === 'event') closeSheet(); } };
  const tried = {}, stuck = []; let lastAdvice = '', same = 0;
  // watchers for what a player would see go wrong: a site that does not move although people are there, a crew that keeps
  // changing, a place left empty while people are free, a figure that cannot get where it is going
  const W = {site:new Map(), stuck:new Set(), waitLong:new Set(), empty:new Map(), fig:new Map(), figStuck:new Set(), ms:{}};
  const mark = (k, m) => { if (W.ms[k] == null) W.ms[k] = m; };
  const watch = minute => {
    const I = Hm(), sf = staffOf(I);
    for (const s of I.buildings){
      if (!s.bt || KINDS[s.kind].plant) continue;
      const o = W.site.get(s.id) || {bt:s.bt, at:tick, born:tick, crew:'', changes:0}; W.site.set(s.id, o);
      if (s.bt < o.bt - .01 || !crewAt(I, s) || sleepTime()){ o.bt = s.bt; o.at = tick; }   // the clock runs only while it has builders, and not at night
      const c = (sf.crewP.get(s) || []).join(); if (c && o.crew && c !== o.crew) o.changes++; if (c) o.crew = c;
      if (crewAt(I, s) && tick - o.at > 90 && !W.stuck.has(s.id)){ W.stuck.add(s.id); bad.push(`min ${minute}: ${s.kind}#${s.id} has builders but has not moved for 3 min (` + walkers.filter(w => w.job && w.job.b === s).map(w => w.leg + (w.on ? '' : '/off')).join(',') + ')'); }
      if (!crewAt(I, s) && tick - o.born > 450 && !W.waitLong.has(s.id)){ W.waitLong.add(s.id); log.push(`  note min ${minute}: ${s.kind}#${s.id} waits in line for 15 min`); }
    }
    for (const [id, o] of W.site) if (!findB(id) || !findB(id).bt){ if (o.changes > 3) bad.push(`${(findB(id) || {}).kind}#${id}: builders changed ${o.changes} times`); W.site.delete(id); }
    if (autoWork(I) && sf.free > 0) for (const b of placesOf(I)){ if (crewAt(I, b) || b.idle && ['use', 'near', 'trees', 'dep', 'full', 'storm', 'rahui', 'fallow'].includes(b.idle.why)) { W.empty.delete(b.id); continue; } const t0 = W.empty.get(b.id) ?? tick; W.empty.set(b.id, t0); if (tick - t0 === 60) log.push(`  note min ${minute}: ${b.kind} empty for 2 min while ${sf.free} free (${b.idle ? b.idle.why : 'no reason'})`); if (tick - t0 === 300) bad.push(`min ${minute}: ${b.kind} empty for 10 min while ${sf.free} are free`); }
    // someone at work who does not count as there: the place would make less than it shows
    for (const w of walkers) if (w.isl === I.id && w.job && !w.on && w.busy && Math.hypot(w.x - w.busy.x, w.y - w.busy.y) < 3 && !W.figStuck.has('on' + w.name)){ W.figStuck.add('on' + w.name); bad.push(`min ${minute}: ${w.name} works at ${KINDS[w.job.b.kind].n} (${w.job.type}, leg ${w.leg}, fx ${w.fx}${w.play ? ', play ' + w.play.k : ''}) but does not count as there`); }
    for (const w of walkers){ if (w.isl !== I.id || !w.job || w.on || w.boat || w.asleep || w.toBed || sleepTime()) { W.fig.delete(w); continue; }
      const o = W.fig.get(w) || {x:w.x, y:w.y, at:tick}; W.fig.set(w, o); if (Math.hypot(w.x - o.x, w.y - o.y) > 3){ o.x = w.x; o.y = w.y; o.at = tick; }
      else if (tick - o.at > 45 && !W.figStuck.has(w)){ W.figStuck.add(w); bad.push(`min ${minute}: ${w.name} on the way to ${KINDS[w.job.b.kind].n} has not moved for 90 s (leg ${w.leg}, at ${w.x | 0},${w.y | 0} to ${w.tx | 0},${w.ty | 0})`); } }
    if (homesOf(I).some(b => tierOf(b) >= 2)) mark('Familienhaus', minute); if (homesOf(I).some(b => tierOf(b) >= 3)) mark('Meisterhaus', minute);
    if (famsOf(I).length > 1) mark('erste Familie aus der Ferne', minute); if (ships.some(q => q.own)) mark('erstes eigenes Kanu', minute);
    if (I.pop >= 20) mark('20 Menschen', minute); if (I.pop >= 30) mark('30 Menschen', minute); if (islands.filter(J => J.settled).length > 1) mark('zweites Dorf', minute);
  };
  for (let minute = 0; minute < MIN; minute++){
    for (let t = 0; t < 30; t++){
      for (let k = 0; k < 40; k++){ stepWalkers(50); stepShips(performance.now(), 50); } walkAt = performance.now(); econ(); answer(); watch(minute); for (const s of ships.slice()) if (s.immig && s.state === 'moored') immigAnswer(s, true);
      if (sheetKind && sheetKind !== 'event') closeSheet();
    }
    for (const hb of readyHomes(Hm())) upgradeHouse(Hm(), hb);   // the player lets the houses rise
    // follow the advice, else the task's build, else build a house
    const A = adviceOf(Hm(), !!QUESTS[quest]) || adviceOf(Hm()) || {}, Q = QUESTS[quest], qb = Q && Q.show && Q.show.build, want = (A.urgent && A.build) || (qb && unlocked(qb) ? qb : null) || A.build || 'haus';
    const res = tryBuild(want); tried[want + '/' + res] = (tried[want + '/' + res] || 0) + 1;
    if (A.needs && !Hm().handWork) {} // automatic families
    if (A.rain) rainDance(Hm());   // the elders advise the rain dance: the bot dances
    if (A.build && A.build !== want) tryBuild(A.build); if (A.goto){ const gb = findB(A.goto); if (gb && gb.idle && gb.idle.why !== 'use'){ const q = startSpot(Hm(), KINDS[gb.kind]); const s2 = findSpot(Hm(), gb.kind, q); if (s2){ gb.x = s2.x; gb.y = s2.y; } } }
    if (Hm().stock.holz < 4) tryBuild('faeller');
    // like a player, it sets the Erntehaus on fronds when the elders say so, and lets it choose again once there are enough
    { const e = Hm().buildings.find(b => b.kind === 'ernte' && !b.bt), d = Hm().stock.dach || 0; if (e && A.t === 'Palmwedel holen' && A.goto) e.v = {...e.v, pick:'dach'}; else if (e && e.v && e.v.pick === 'dach' && d >= 8){ const v = {...e.v}; delete v.pick; e.v = v; } }
    const key = A.t || Q && Q.t; if (key === lastAdvice) same++; else { same = 0; lastAdvice = key; }
    if (same === 8) stuck.push(`min ${minute}: "${key}" (${want}: ${res})`);
    if (minute % 5 === 4){ check('min ' + (minute + 1)); log.push(`min ${minute + 1}: pop ${Hm().pop} fams ${famsOf(Hm()).length} roofless ${roofless(Hm())} stage ${STAGES[stageNow()].n} quest ${QUESTS[quest] ? QUESTS[quest].id : 'done'} advice "${A.t || '-'}" t2 ${tier2Pop(Hm())} lines ${linesOf(Hm()).length} kin ${kinState(Hm())} work ${staffOf(Hm()).total - staffOf(Hm()).free} free ${staffOf(Hm()).free} houses ${homesOf(Hm()).map(tierOf).join('')} stock ${['nahrung','wasser','holz','dach','faser','schnur'].map(k => k[0] + (Hm().stock[k] || 0)).join(' ')}`); }
  }
  log.push('places: ' + placesOf(Hm()).map(b => KINDS[b.kind].s + (famsOf(Hm()).find(f => f.job === b.id) ? '+' : '-') + (b.idle ? '(' + b.idle.why + (b.idle.k ? ':' + b.idle.k : '') + ')' : '')).join(' ') + ' fiber ' + (Hm().stock.faser || 0) + ' kokos ' + (Hm().stock.kokos || 0));
  if (Hm().pop < 8) bad.push(`village collapsed: ${Hm().pop} people after an hour`);
  log.push('milestones: ' + (Object.entries(W.ms).map(([k, m]) => `${k} min ${m}`).join(', ') || 'none'));   // a calm builder game must not empty out
  const sv = serialize(); if (!restore(sv)) bad.push('restore'); renderAll();
  return {log, bad:bad.slice(0, 12), stuck, built:Object.entries(tried).map(([k, v]) => k + ':' + v).join(' ')};
}, [SEED, MIN]);
console.log(`== seed ${SEED}\n${r.log.join('\n')}\nstuck: ${r.stuck.join(' | ') || 'none'}\nbuilt tries: ${r.built}\nBAD: ${r.bad.join('; ') || 'none'}\nerrors ${JSON.stringify(errs.slice(0, 5))}`);
await p.close();
}
await b.close();})();
