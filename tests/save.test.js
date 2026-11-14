// Saving: the game survives a reload; a broken save falls back to the newest copy; a game saved as text loads again;
// two slots keep two games apart, each can be begun anew.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
const GAME_V_T = +require('fs').readFileSync(__dirname + '/../src/state.js', 'utf8').match(/GAME_V = (\d+)/)[1];
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
  // two slots: the second begins with the landing, the first stays as it was; each comes back; "Neu" begins one anew
  const r4 = await p.evaluate(() => {
    const seed1 = seed; switchSlot(2); const fresh2 = !!landing && curSlot === 2; landHome(isl('heimat')); closeSheet(); isl('heimat').stock.holz = 5; save(); const seed2 = seed;
    switchSlot(1); const back1 = !landing && seed === seed1 && isl('heimat').stock.holz === 17;
    openSheet('menu'); const rows = $('sheetBody').querySelectorAll('.slots li').length, says = /Spielstand 2/.test($('sheetBody').textContent); closeSheet();
    switchSlot(2); const back2 = seed === seed2 && isl('heimat').stock.holz === 5;
    switchSlot(2, true); const anew = !!landing && seed !== seed2; switchSlot(1); const still1 = seed === seed1;
    return {fresh2, back1, rows, says, back2, anew, still1, slot:curSlot};
  });
  if (!r4.fresh2 || !r4.back1 || r4.rows !== 2 || !r4.says || !r4.back2 || !r4.anew || !r4.still1) bad.push('two slots: ' + JSON.stringify(r4));
  // the slot in play is kept over a reload
  await p.evaluate(() => switchSlot(2)); await p.reload(); await p.waitForTimeout(2500);
  const r5 = await p.evaluate(() => ({slot:curSlot}));
  if (r5.slot !== 2) bad.push('slot not kept over a reload: ' + JSON.stringify(r5));
  // a new version keeps every slot as it was ("vor dem Update"); a save that cannot be read is put aside, never written over,
  // and the new game goes to an empty slot
  const r6 = await p.evaluate(() => { switchSlot(1); save(); localStorage.setItem('polinusa-ver', '1'); for (let n = 1; n <= SLOTS; n++) localStorage.removeItem(preKey(n));
    localStorage.removeItem(slotKey(2)); for (let i = 0; i < BACKUPS; i++) localStorage.removeItem(`${slotKey(1)}-b${i}`);
    window.save = () => {}; localStorage.setItem(slotKey(1), '{"v":5,"seed":7,"kaputt":1}'); localStorage.setItem('polinusa-slot', '1'); return true; });
  await p.reload(); await p.waitForTimeout(2500);
  const r7 = await p.evaluate(() => { const k = keptOf(keepKey(1)), v = keptOf(preKey(1)); openSheet('menu'); const menu = /Aufbewahrt/.test($('sheetBody').textContent); closeSheet();
    return {slot:curSlot, kept:!!k && /kaputt/.test(k.raw), pre:!!v && /kaputt/.test(v.raw), still:localStorage.getItem(slotKey(1)), ver:localStorage.getItem('polinusa-ver'), menu}; });
  if (!r6 || r7.slot !== 2 || !r7.kept || !r7.pre || !/kaputt/.test(r7.still || '') || r7.ver !== String(GAME_V_T) || !r7.menu) bad.push('unread save or update copy: ' + JSON.stringify(r7));
  console.log(JSON.stringify({a, r1, r2, r3, r4, r5})); console.log('BAD: ' + (bad.concat(errs).join('; ') || 'none')); await b.close();
})();
