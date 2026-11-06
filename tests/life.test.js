// The life of the first seafarers: a garden bears only after it has grown; the yam year (planted in the storms, dug up as
// the lean time begins, kept on a rack and fed into the store); at night people sleep in their houses and go back to work
// in the morning, the fishers go out with torches; the wild gives more when the turtles lay; all of it survives a save.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => { window.save = () => {}; const out = [], bad = [];
    newGame(11); landHome(isl('heimat')); closeSheet(); skipTutorial(true); nextEvent = 1e9; opts.night = true;
    const I = isl('heimat'), put = (kind, site) => { const q = findSpot(I, kind, startSpot(I, KINDS[kind])); const x = addB(I, kind, q, variant(kind), tick); if (site){ x.bt = KINDS[kind].bt; x.got = 0; } I.staff = null; return x; };
    for (let i = 0; i < 6; i++) I.people.push(Object.assign(person(I, 25), {h:famsOf(I)[0].id})); I.pop = I.people.length; syncPeople(I);   // the spring by the stream takes one more
    const fi = put('fisch'); delete fi.boat; put('ernte'); const y = put('yams'), t = put('taro', true); stats.peakPop = 25; I.stock.nahrung = 4;
    const run = n => { for (let k = 0; k < n; k++){ for (let s = 0; s < 40; s++) stepWalkers(50); walkAt = performance.now(); econ(); if (sheetKind) closeSheet(); } };
    // the taro field: built, then growing, nobody needed, nothing made
    for (let k = 0; k < 40 && t.bt; k++) run(1);
    if (t.bt) bad.push('taro field not built'); else { out.push(`taro growing ${t.grow} ticks`); if (!(t.grow > 0)) bad.push('a new field bears at once'); if (placesOf(I).includes(t)) bad.push('a growing field takes workers'); }
    // a year: the yam field is planted in the storms and harvested in the lean time; sleep at night
    let slept = 0, woke = 0, torch = 0, seasons = new Set(), sea = {};
    for (let k = 0; k < 1100 && !(stats.yams > 0 && k > 400); k++){ run(1); seasons.add(seasonOf().id); sea[seasonOf().id] = wildSeason(I);
      const a = walkers.filter(w => w.asleep).length; if (a) slept = Math.max(slept, a); if (!sleepTime() && slept && walkers.some(w => w.job && w.on && w.leg === 'work')) woke++;
      if (sleepTime() && walkers.some(w => w.boat && w.job && w.job.type === 'fish')) torch++; }
    out.push(`yams harvested ${stats.yams || 0}, kept ${y.kept || 0}; taro ${t.grow > 0 ? 'still growing' : 'bearing'}; slept up to ${slept}, morning work ${woke > 0}, torch fishing ${torch > 0}; wild by season ${JSON.stringify(sea)}`);
    if (!stats.yams) bad.push('no yam harvest in two years');
    if (t.grow > 0) bad.push('taro never grew up');
    if (!slept) bad.push('nobody slept at night');
    if (!woke) bad.push('nobody went back to work in the morning');
    if (!(sea.sturm > sea.passat && sea.mager < sea.passat)) bad.push('wild does not follow the seasons');
    // saved and loaded
    y.ys = 2; y.sown = .7; y.kept = 5; t.grow = 40; const raw = serialize(); restore(raw); const J = isl('heimat'), y2 = J.buildings.find(q => q.kind === 'yams'), t2 = J.buildings.find(q => q.kind === 'taro');
    if (!(y2.ys === 2 && y2.sown === .7 && y2.kept === 5 && t2.grow === 40)) bad.push('yam field or growing field not saved: ' + JSON.stringify({ys:y2.ys, sown:y2.sown, kept:y2.kept, grow:t2.grow}));
    return {out, bad};
  });
  console.log(r.out.join('\n')); console.log('BAD: ' + (r.bad.concat(errs).join('; ') || 'none')); await b.close();
})();
