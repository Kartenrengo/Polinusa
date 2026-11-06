// Runs the tests one after the other and says OK or FEHLER for each. node tests/run.mjs [--long]
// --long lets the bot play three villages for an hour each instead of one (takes a few minutes).
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url)), long = process.argv.includes('--long');
const tests = [['data'], ['smoke'], ['rules'], ['build'], ['life'], ['play'], ['save'], ['phone'], ['fuzz'], ['bot', ...(long ? ['--min=90'] : ['101'])]];
let failed = 0;
// first: does every script parse? A broken line stops the whole game, long before any test could say why
{ const src = path.join(dir, '..', 'src'), fs = await import('node:fs'), bad = [];
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.js'))){ const r = spawnSync(process.execPath, ['--check', path.join(src, f)], {encoding:'utf8'}); if (r.status !== 0) bad.push(f + ': ' + (r.stderr || '').split('\n').slice(0, 4).join(' ')); }
  console.log(`${bad.length ? 'FEHLER' : 'OK    '} syntax`); if (bad.length){ console.log(bad.join('\n')); process.exit(1); } }
for (const [name, ...args] of tests){
  const t0 = Date.now(), r = spawnSync(process.execPath, [path.join(dir, name + '.test.js'), ...args], {encoding:'utf8', timeout:15 * 60 * 1000});
  const out = (r.stdout || '') + (r.stderr || '');
  const why = r.status !== 0 ? 'Abbruch' : /(^|[\['" ])PAGE /m.test(out) ? 'Seitenfehler' : /BAD: (?!none)/.test(out) ? 'Regel verletzt' : /^ERR /m.test(out) ? 'Fehler im Test' : /errors [1-9]/.test(out) ? 'Seitenfehler' : '';
  console.log(`${why ? 'FEHLER' : 'OK    '} ${name.padEnd(6)} ${Math.round((Date.now() - t0) / 1000)} s${why ? ' · ' + why : ''}`);
  if (why){ failed++; console.log(out.split('\n').filter(l => /BAD|PAGE|ERR|errors|Error/.test(l)).slice(0, 12).join('\n')); }
}
process.exit(failed ? 1 : 0);
