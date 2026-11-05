// Whole-game check: a bot that only follows the elders' advice (and the task card) from the landing on, for several seeds.
// It builds where the game proposes, keeps errors and broken invariants, and reports how far each village gets.
const {chromium}=require('playwright');
const {PAGE} = require('./lib');
const seeds = process.argv.slice(2).map(Number).filter(Boolean); if (!seeds.length) seeds.push(101, 202, 303);
(async()=>{const b=await chromium.launch();
for (const SEED of seeds){
const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
await p.goto(PAGE);await p.waitForTimeout(1500);
const r = await p.evaluate(async (SEED)=>{
  window.save = () => {}; const log = [], bad = [];
  newGame(SEED); landHome(isl(SEED % 2 ? 'wahl' : 'heimat')); closeSheet(); renderAll();
  const Hm = () => isl('heimat');
  const tryBuild = kind => { if (!kind || !KINDS[kind] || !unlocked(kind)) return 'locked'; const I = isl(active); if (I.buildings.some(b => b.kind === kind && b.bt)) return 'site'; if (kind !== 'haus' && I.buildings.filter(b => b.kind === kind).length >= 3) return 'enough'; const c = costOf(kind, I); if (!canPay(I, c)) return 'poor'; startPlace(kind); if (!placing) return 'refused'; if (!placing.ok){ const q = findSpot(I, kind, placing); if (q){ placing.x = q.x; placing.y = q.y; ghostRender(); } } const ok = placing && placing.ok; if (ok) confirmPlace(); if (placing) endPlace(); return ok ? 'ok' : 'nospot'; };
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
  for (let minute = 0; minute < 60; minute++){
    for (let t = 0; t < 30; t++){
      for (let k = 0; k < 40; k++){ stepWalkers(50); stepShips(performance.now(), 50); } walkAt = performance.now(); econ(); answer(); for (const s of ships.slice()) if (s.immig && s.state === 'moored') immigAnswer(s, true);
      if (sheetKind && sheetKind !== 'event') closeSheet();
    }
    for (const hb of readyHomes(Hm())) upgradeHouse(Hm(), hb);   // the player lets the houses rise
    // follow the advice, else the task's build, else build a house
    const A = adviceOf(Hm(), !!QUESTS[quest]) || adviceOf(Hm()) || {}, Q = QUESTS[quest], qb = Q && Q.show && Q.show.build, want = (A.urgent && A.build) || (qb && unlocked(qb) ? qb : null) || A.build || 'haus';
    const res = tryBuild(want); tried[want + '/' + res] = (tried[want + '/' + res] || 0) + 1;
    if (A.needs && !Hm().handWork) {} // automatic families
    if (A.build && A.build !== want) tryBuild(A.build); if (A.goto){ const gb = findB(A.goto); if (gb && gb.idle && gb.idle.why !== 'use'){ const q = startSpot(Hm(), KINDS[gb.kind]); const s2 = findSpot(Hm(), gb.kind, q); if (s2){ gb.x = s2.x; gb.y = s2.y; } } }
    if (Hm().stock.holz < 4) tryBuild('faeller');
    const key = A.t || Q && Q.t; if (key === lastAdvice) same++; else { same = 0; lastAdvice = key; }
    if (same === 8) stuck.push(`min ${minute}: "${key}" (${want}: ${res})`);
    if (minute % 5 === 4){ check('min ' + (minute + 1)); log.push(`min ${minute + 1}: pop ${Hm().pop} fams ${famsOf(Hm()).length} roofless ${roofless(Hm())} stage ${STAGES[stageNow()].n} quest ${QUESTS[quest] ? QUESTS[quest].id : 'done'} advice "${A.t || '-'}" t2 ${tier2Pop(Hm())} lines ${linesOf(Hm()).length} kin ${kinState(Hm())} work ${staffOf(Hm()).total - staffOf(Hm()).free} free ${staffOf(Hm()).free} houses ${homesOf(Hm()).map(tierOf).join('')} stock ${['nahrung','wasser','holz','dach','faser','schnur'].map(k => k[0] + (Hm().stock[k] || 0)).join(' ')}`); }
  }
  log.push('places: ' + placesOf(Hm()).map(b => KINDS[b.kind].s + (famsOf(Hm()).find(f => f.job === b.id) ? '+' : '-') + (b.idle ? '(' + b.idle.why + (b.idle.k ? ':' + b.idle.k : '') + ')' : '')).join(' ') + ' fiber ' + (Hm().stock.faser || 0) + ' kokos ' + (Hm().stock.kokos || 0));
  if (Hm().pop < 8) bad.push(`village collapsed: ${Hm().pop} people after an hour`);   // a calm builder game must not empty out
  const sv = serialize(); if (!restore(sv)) bad.push('restore'); renderAll();
  return {log, bad:bad.slice(0, 12), stuck, built:Object.entries(tried).map(([k, v]) => k + ':' + v).join(' ')};
}, SEED);
console.log(`== seed ${SEED}\n${r.log.join('\n')}\nstuck: ${r.stuck.join(' | ') || 'none'}\nbuilt tries: ${r.built}\nBAD: ${r.bad.join('; ') || 'none'}\nerrors ${JSON.stringify(errs.slice(0, 5))}`);
await p.close();
}
await b.close();})();
