// Smoke: the game loads, the clan lands by tapping as a player would, the first village stands. Run on the page as it is
// developed, and on the shipped single file when it has been bundled (node tools/bundle.mjs).
const {chromium} = require('playwright'), fs = require('fs'), path = require('path');
const {PAGE, BUNDLE, ROOT} = require('./lib');
(async () => {
  const b = await chromium.launch(), bad = [];
  for (const url of [PAGE, ...(fs.existsSync(path.join(ROOT, 'dist', 'polinusa.html')) ? [BUNDLE] : [])]){
    const p = await (await b.newContext({viewport:{width:390, height:844}})).newPage(), errs = [];
    p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CON ' + m.text()); });
    await p.goto(url); await p.waitForTimeout(2500);
    const a = await p.evaluate(() => ({landing:!!landing, sheet:sheetKind}));
    if (!a.landing) bad.push('no landing at the start');
    await p.click('[data-act=found]'); for (let i = 0; i < 40; i++){ await p.waitForTimeout(1000); if (await p.evaluate(() => landing && landing.found)) break; }
    await p.click('#placeOk'); await p.waitForTimeout(500);
    const c = await p.evaluate(() => { const I = isl('heimat'); return {landing:!!landing, pop:I.pop, huts:I.buildings.filter(q => q.kind === 'haus').length, plaza:I.buildings.some(q => q.kind === 'platz'), quest:QUESTS[quest] && QUESTS[quest].id}; });
    if (c.landing || c.pop !== 4 || c.huts !== 1 || !c.plaza) bad.push('landing: ' + JSON.stringify(c));
    if (await p.$('[data-act=close]')) await p.click('[data-act=close]');
    await p.waitForTimeout(3000);
    console.log(url.endsWith('index.html') ? 'page' : 'bundle', JSON.stringify(c), errs.length ? errs : '');
    bad.push(...errs); await p.close();
  }
  console.log('BAD: ' + (bad.join('; ') || 'none')); await b.close();
})();
