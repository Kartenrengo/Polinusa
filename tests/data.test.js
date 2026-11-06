// Static checks of the game's data: every picture that is referenced exists, every task and stage names buildings that
// exist, every kind of work has a drawing, every sheet opens. Finds the mistakes that do not throw but show nothing.
const {chromium} = require('playwright');
const {PAGE} = require('./lib');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({viewport:{width:390, height:844}}), errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    const bad = [], seen = new Set(), has = id => !!document.getElementById(id);
    const refs = (html, where) => { for (const m of String(html).matchAll(/href="#([\w-]+)"/g)) if (!has(m[1]) && !seen.has(m[1] + where)){ seen.add(m[1] + where); bad.push(`missing picture #${m[1]} in ${where}`); } };
    // pictures: buildings in every look, loads, tools, goods, needs, picks, seasons
    for (const k of Object.keys(KINDS)) for (const o of [{}, {t2:true}, {t2:true, t3:true}, {chief:true}, {soil:'f'}, {dry:true}]) { try { refs(artOf(k, o), 'building ' + k); } catch (e){ bad.push(`art ${k}: ${e.message}`); } }
    for (const [k, a] of Object.entries(LOADS)) refs(a, 'load ' + k);
    for (const [k, a] of Object.entries(TOOLS)) refs(a, 'tool ' + k);
    for (const k of [...GOODS, ...Object.keys(GN)]) if (!has('ic-' + k) && !GROUPS[k]) bad.push(`no picture for good ${k}`);
    for (const t of Object.values(TIERS)) for (const k of t.needs) if (!has('ic-' + needIcon(k))) bad.push(`no picture for need ${k}`);
    for (const K of Object.values(KINDS)) for (const k of Object.keys(K.picks || {})) if (!has('ic-' + k)) bad.push(`no picture for pick ${k}`);
    for (const S of SEASONS) if (!has('ic-' + S.id)) bad.push(`no picture for season ${S.id}`);
    for (const k of [...EPOCH_IC, 'horn', 'knot', 'kind', 'insel', 'einbaum', 'crew']) if (!has('ic-' + k)) bad.push(`no picture ic-${k}`);
    for (const k of ['kn-ok', 'kn-low', 'kn-out', 'kn-next']) if (!has(k)) bad.push(`no knot ${k}`);
    // tasks, stages, the build order
    for (const Q of QUESTS){ if (!Q.t || !Q.d) bad.push(`task ${Q.id} without words`); const sb = Q.show && Q.show.build; if (sb && !KINDS[sb]) bad.push(`task ${Q.id} shows unknown ${sb}`);
      for (const k of Q.unlock || []) if (!KINDS[k] && !SHIPS[k]) bad.push(`task ${Q.id} unlocks unknown ${k}`); }
    for (const S of STAGES) for (const k of S.kinds) if (!KINDS[k] && !SHIPS[k]) bad.push(`stage ${S.n}: unknown ${k}`);
    for (const k of ORDER) if (!KINDS[k]) bad.push(`build order: unknown ${k}`);
    // every kind of work, rest and play has a drawing
    const src = workFx.toString(), cases = new Set([...src.matchAll(/case '([\w]+)'/g)].map(m => m[1]));
    const fx = new Set([...Object.values(WORK_FX), ...SITE_FX, ...REST_FX, ...Object.values(PLAY_FX), 'dig', 'plant', 'chop', 'pull', 'climb', 'scoop', 'net', 'spear', 'hang', 'show']);
    for (const f of fx) if (!cases.has(f)) bad.push(`work look "${f}" has no drawing`);
    // a fresh game: every task can be counted, every sheet opens and its pictures exist
    window.save = () => {}; newGame(4242); landHome(isl('heimat')); closeSheet(); nextEvent = 1e9;
    for (const Q of QUESTS){ try { Q.n(); } catch (e){ bad.push(`task ${Q.id} cannot be counted: ${e.message}`); } }
    const I = isl('heimat'); for (const k of ['ernte', 'faeller', 'fisch', 'quelle', 'taro']){ const q = findSpot(I, k, startSpot(I, KINDS[k])); if (q) addB(I, k, q, variant(k), tick); }
    for (let t = 0; t < 10; t++) econ();
    const sheets = [['needs'], ['needs', {tab:'arbeit'}], ['needs', {tab:'insel'}], ['store'], ['calendar'], ['menu'], ['intro'], ['intro', {first:true}], ['chronik'], ['finale'], ['folk', {id:'heimat'}], ['ware', {id:'heimat', k:'holz'}], ...I.buildings.map(x => ['info', {id:x.id}])];
    for (const [k, d] of sheets){ try { closeSheet(); openSheet(k, d); refs($('sheetBody').innerHTML, 'sheet ' + k); } catch (e){ bad.push(`sheet ${k}: ${e.message}`); } }
    closeSheet(); refs(document.getElementById('top').innerHTML, 'top band'); refs(document.getElementById('bottom').innerHTML, 'build bar');
    return bad;
  });
  console.log(r.length ? r.join('\n') : 'all pictures, tasks, stages and work looks found');
  console.log('BAD: ' + (r.concat(errs).join('; ') || 'none')); await b.close();
})();
