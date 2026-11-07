// A soak test of the newer systems: storms, tying roofs, strengths, new Stammplatz, trade chains, saving and loading, the
// soundtrack, all mixed at random for 1500 ticks; stocks, people, roofs and stories must stay sane and nothing may throw.
const {chromium}=require('playwright');
const {PAGE} = require('./lib');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
await p.goto(PAGE);await p.waitForTimeout(1500);
console.log(await p.evaluate(async()=>{ window.save=()=>{}; const bad=[], out=[];
  let seed=31; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647, pick=a=>a[Math.floor(rnd()*a.length)];
  newGame(777); landHome(isl('heimat')); closeSheet(); nextEvent=1e9; skipTutorial(true);
  const H=isl('heimat'); const put=k=>{ const q=findSpot(H,k,startSpot(H,KINDS[k])); return q?addB(H,k,q,variant(k),tick):null; };
  Object.assign(H.stock,{nahrung:20,wasser:20,holz:20,dach:20,schnur:10,faser:10,schalen:10}); for (const k of ['ernte','faeller','fisch','taro','umu']) put(k);
  for (let i=0;i<10;i++){ const q=Object.assign(person(H,14+rnd()*20),{h:famsOf(H)[0].id}); H.people.push(q); H.pop++; } homesOf(H).forEach(h=>h.t=2);
  const T=islands.find(J=>!J.settled&&!J.clan&&J.type==='atoll'); discover(T); exploreAt(T.center.x,T.center.y,400); settle(T,H,{pop:6,stock:{matten:12,nahrung:10,wasser:10},folk:[],life:[]}); makeShip('dc',H);
  const run1=()=>{ for(let k=0;k<40;k++){ stepWalkers(50); stepShips(performance.now(),50);} walkAt=performance.now(); econ(); if(sheetKind) closeSheet(); };
  const inv=tag=>{ for(const I of islands.filter(J=>J.settled)){
      if(I.pop!==(I.people||[]).length) bad.push(`${tag} ${I.name} pop ${I.pop} people ${(I.people||[]).length}`);
      for(const k of Object.keys(I.stock)){ const v=I.stock[k]; if(!(v>=0)||v>storeCap(I)+.001) bad.push(`${tag} ${I.name} ${k}=${v}`); }
      for(const q of I.people||[]){ if(q.job && !findB(q.job) && isAdult(q)) {} if(q.ev && q.ev.length>STORY_MAX) bad.push(tag+' story long'); if(q.ev && q.ev.some(e=>!Array.isArray(e)||e.length<2)) bad.push(tag+' story bad'); }
      for(const b of I.buildings) if(HOME_KINDS.has(b.kind) && b.rw!==undefined && !(b.rw>=0 && b.rw<10)) bad.push(`${tag} roof wear ${b.rw}`); } };
  for (let step=0; step<1500; step++){
    run1();
    const r=rnd(); const I=pick(islands.filter(J=>J.settled));
    if (r<.02) stormWarn(I, rnd()<.6);
    else if (r<.04) tieRoofs(I);
    else if (r<.07) setStrength(I, pick(Object.keys(STRENGTHS)));
    else if (r<.12){ const p=pick((I.people||[]).filter(isAdult)); const ps=p?jobPlaces(I,p):[]; if(p&&ps.length) chooseJob(I,p,pick(ps)); }
    else if (r<.15){ const k=pick(['matten','holz','kokos','schnur']); const J=tradeIdea(I,k); if(J) startTrade(I,k,J); }
    else if (r<.17){ const raw=serialize(); if(!restore(raw)) bad.push('restore failed at '+step); }
    else if (r<.19){ for(const b of homesOf(I)) b.rw=(b.rw||0)+rnd()*.6; }
    else if (r<.2){ const p=pick(I.people||[]); if(p) openSheet('person',{id:I.id,p:p.id}); }
    else if (r<.21){ musicSchedule(0,musicState()); }
    if (step%50===0) inv('step '+step); if (false) out.push('step '+step+' pop '+islands.filter(J=>J.settled).map(J=>J.pop).join('/')+' food '+Math.round(haveOf(H,'essen'))+' wasser '+(H.stock.wasser|0)+' roofs '+homesOf(H).map(h=>roofState(h)[0]).join(''));
    if (bad.length>6) break;
  }
  inv('end'); out.push('ticks '+tick+' pop '+islands.filter(J=>J.settled).map(J=>J.name+':'+J.pop).join(' ')+' chains '+(stats.handelskette||0)+' storms '+(stats.stuerme||0));
  return out.join('\n')+'\nBAD: '+(bad.slice(0,8).join('; ')||'none'); }));
console.log('errors', errs); await b.close();})();
