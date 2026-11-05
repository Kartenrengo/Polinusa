// Saving: the game survives a reload; a broken save falls back to the newest copy; a game saved as text loads again.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({viewport:{width:390, height:844}}), p = await ctx.newPage(), errs = [], bad = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message));
  await p.goto(PAGE); await p.waitForTimeout(2000);
  const a = await p.evaluate(() => { newGame(777); landHome(isl('heimat')); closeSheet(); skipTutorial(true); for (let i = 0; i < 20; i++) econ(); isl('heimat').stock.holz = 17; save(); return {pop:isl('heimat').pop, copies:backups().length, text:serialize().length}; });
  if (!a.copies) bad.push('no copy after the first save');
  // reload: the same game
  await p.reload(); await p.waitForTimeout(2500);
  const r1 = await p.evaluate(() => ({landing:!!landing, name:isl('heimat') && isl('heimat').stock.holz}));
  if (r1.landing || r1.name !== 17) bad.push('reload lost the game: ' + JSON.stringify(r1));
  // a broken save: the copy takes over
  await p.evaluate(() => localStorage.setItem(SAVE_KEY, '{"broken":'));
  await p.reload(); await p.waitForTimeout(2500);
  const r2 = await p.evaluate(() => ({landing:!!landing, name:isl('heimat') && isl('heimat').stock.holz}));
  if (r2.landing || r2.name !== 17) bad.push('broken save not recovered from the copy: ' + JSON.stringify(r2));
  // as text: save, change, load the text again
  const r3 = await p.evaluate(() => { closeSheet(); const raw = serialize(); isl('heimat').stock.holz = 3; loadRaw(raw); const ok = isl('heimat').stock.holz; loadRaw('kein Spiel'); return {ok, after:isl('heimat').stock.holz}; });
  if (r3.ok !== 17 || r3.after !== 17) bad.push('text load: ' + JSON.stringify(r3));
  console.log(JSON.stringify({a, r1, r2, r3})); console.log('BAD: ' + (bad.concat(errs).join('; ') || 'none')); await b.close();
})();
