// Schönbau: turn and mirror, fine decorations in lines, their beauty, photo mode, the place bar on small phones.
const {chromium}=require('playwright');
const {PAGE} = require('./lib');
(async()=>{const b=await chromium.launch();const errs=[];
for (const [w,h] of [[390,844],[320,568]]){
const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1})).newPage();
p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n').slice(1,4).join(' ')));
await p.goto(PAGE);await p.waitForTimeout(1500);
const r = await p.evaluate(()=>{
  try {
  window.save = () => {}; const out = [], bad = [], want = (c, m) => { if (!c) bad.push(m); };
  newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9;
  const I = isl('heimat'); I.stock.holz = 99; stats.peakPop = 60;
  const FINE = ['zaun', 'hecke', 'rand', 'pfad', 'gestell'];
  for (const k of FINE){ want(KINDS[k] && DECO.includes(k) && ORDER.includes(k) && KINDS[k].rot && KINDS[k].beauty < 1, k + ' is a fine decoration'); want(artOf(k).includes('#' + k), k + ' has art'); }
  // the Schmuck menu has them, with the photo button, and the bars stay on the screen
  setBar('build'); buildTab = 'deco'; renderBuildBar();
  const have = [...document.querySelectorAll('#buildList .bbtn')].map(q => q.dataset.kind || (q.dataset.photo ? 'photo' : ''));
  want(FINE.every(k => have.includes(k)) && have.includes('photo'), 'Schmuck menu: ' + have.join());
  // a free spot with room for a line of six along the direction (45 degree steps)
  const home = I.buildings.find(q => q.kind === 'platz'), fit = (kind, rot) => { const K = KINDS[kind], r = rot * Math.PI / 180;
    for (let d = 26; d < 120; d += 4) for (let k = 0; k < 30; k++){ const a = k / 30 * TAU, x = home.x + Math.cos(a) * d, y = home.y + Math.sin(a) * d * .8; let ok = true;
      for (let i = 0; i < 6; i++) if (check(kind, I, x + Math.cos(r) * K.len * i, y + Math.sin(r) * K.len * i)){ ok = false; break; } if (ok) return {x, y}; } return null; };
  const at = fit('zaun', 90); want(!!at, 'room for a row');
  if (at){
    startPlace('zaun'); placing.x = at.x; placing.y = at.y; turnPlacing(); turnPlacing();   // two turns: 90
    want(placing.v.rot === 90, 'two turns make 90, got ' + placing.v.rot);
    want(!$('placeTurn').hidden && $('placeRot').textContent === 'Drehen' && !$('placeRow').hidden, 'turn buttons are shown');
    const r = $('place').getBoundingClientRect(), t = $('placeRot').getBoundingClientRect(), o = $('placeRow').getBoundingClientRect();
    want(r.bottom <= innerHeight + 1 && t.left >= 0 && o.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth, 'place bar fits the phone');
    ghostRender(); want(placing.ok, 'ghost fits: ' + placing.msg);
    const holz = I.stock.holz; placeRow();
    const fences = I.buildings.filter(q => q.kind === 'zaun');
    want(fences.length === 6, 'a row of six, got ' + fences.length); want(fences.every(q => q.v.rot === 90 && !q.bt), 'all turned 90, built at once');
    want(I.stock.holz === holz - 6, 'six fences cost six wood');
    out.push(`row ${fences.length}`);
    endPlace();
    // turned pieces: drawn turned, saved and loaded again
    want(Math.abs(xformOf('zaun', {rot:90}).rot - Math.PI / 2) < 1e-6, 'xform turns the fence');
    const raw = serialize(); restore(raw); closeSheet();
    const J = isl('heimat'), f2 = J.buildings.filter(q => q.kind === 'zaun'); want(f2.length === 6 && f2.every(q => q.v.rot === 90), 'rotation survives save and load');
  }
  // beauty: fine pieces count a fraction each, at most 6 in all
  { const J = isl('heimat'), b0 = beautyOf(J); const add = (k, n) => { for (let i = 0; i < n; i++){ const q = addB(J, k, {x:J.center.x + i, y:J.center.y}, variant(k), tick); delete q.bt; } };
    add('rand', 4); const b1 = beautyOf(J); want(b1 >= b0, 'fine pieces do not take beauty away');
    add('pfad', 80); want(fineBeauty(J) - J.buildings.reduce((s, q) => s + ((KINDS[q.kind].beauty || 0) >= 1 && !q.bt ? KINDS[q.kind].beauty : 0), 0) === 6, 'fine beauty is capped at 6');
    out.push(`beauty ${b0} -> ${b1} -> ${beautyOf(J)}`);
    want(KINDS.zaun.beauty * 4 < 1, 'a few fences do not make a step by themselves'); }
  // mirror when moving: free of charge, and the house is not turned before "Hier hin"
  { const J = isl('heimat'), h = J.buildings.find(q => q.kind === 'haus' && !q.bt), m0 = h.v.mirror ? 1 : 0, st = JSON.stringify(J.stock);
    startMove(h); want(!$('placeTurn').hidden && $('placeRot').textContent === 'Spiegeln', 'mirror button for a house'); want($('placeRow').hidden, 'no row for a house');
    turnPlacing(); want((h.v.mirror ? 1 : 0) === m0 && (placing.v.mirror ? 1 : 0) === 1 - m0, 'the copy turns, the house waits');
    ghostRender(); confirmPlace(); want((h.v.mirror ? 1 : 0) === 1 - m0 && JSON.stringify(J.stock) === st, 'moved and mirrored, for nothing'); }
  // photo mode
  { want(!photoIs(), 'photo mode starts off'); photoOn(); want(photoIs() && document.body.classList.contains('photo') && getComputedStyle($('hudbar')).display === 'none' && getComputedStyle($('bottom')).display === 'none', 'photo mode hides the bars');
    onTap({x:0, y:0}); want(!photoIs() && !document.body.classList.contains('photo') && getComputedStyle($('hudbar')).display !== 'none', 'a tap brings them back');
    startPlace('hecke'); photoOn(); want(!placing && photoIs(), 'photo mode ends placing'); photoOff(); }
  return {out, bad};
  } catch (e){ return {out:[], bad:['ERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' ')]}; }
});
console.log(`${w}x${h}`, r.out.join('; ')); console.log('BAD: ' + (r.bad.join(' | ') || 'none'));
}
console.log('errors', errs.length, errs.join('\n'));
await b.close();})();
