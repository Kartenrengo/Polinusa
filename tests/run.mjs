// Runs the tests one after the other and says OK or FEHLER for each. node tests/run.mjs [--long]
// --long lets the bot play three villages for an hour each instead of one (takes a few minutes).
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url)), long = process.argv.includes('--long');
const tests = [['data'], ['smoke'], ['rules'], ['build'], ['life'], ['play'], ['music'], ['soak'], ['save'], ['phone'], ['fuzz'], ['bot', ...(long ? ['--min=90'] : ['101'])]];
let failed = 0;
// first: does every script parse? A broken line stops the whole game, long before any test could say why
{ const src = path.join(dir, '..', 'src'), fs = await import('node:fs'), bad = [];
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.js'))){ const r = spawnSync(process.execPath, ['--check', path.join(src, f)], {encoding:'utf8'}); if (r.status !== 0) bad.push(f + ': ' + (r.stderr || '').split('\n').slice(0, 4).join(' ')); }
  // the stylesheet: a brace too many makes the browser drop the next rule, one too few swallows all that follows
  { const css = fs.readFileSync(path.join(dir, '..', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')); let d = 0, line = 1;
    for (const ch of css){ if (ch === '\n') line++; else if (ch === '{') d++; else if (ch === '}' && --d < 0){ bad.push(`style.css: } too many in line ${line}`); d = 0; } }
    if (d) bad.push(`style.css: ${d} { not closed`); }
  // the scripts share one global scope: a function declared twice is silently replaced by the later one
  // (the same for a const or let at the top: a second one stops the whole file with "has already been declared")
  { const seen = new Map(); for (const f of fs.readdirSync(src).filter(f => f.endsWith('.js'))) for (const m of fs.readFileSync(path.join(src, f), 'utf8').matchAll(/^(?:async )?function (\w+)\s*\(|^(?:const|let|class) (\w+)\b/gm)){ const n = m[1] || m[2]; if (seen.has(n)) bad.push(`${n} declared twice: ${seen.get(n)} and ${f}`); else seen.set(n, f); } }
  console.log(`${bad.length ? 'FEHLER' : 'OK    '} syntax`); if (bad.length){ console.log(bad.join('\n')); process.exit(1); } }
for (const [name, ...args] of tests){
  const t0 = Date.now(), r = spawnSync(process.execPath, [path.join(dir, name + '.test.js'), ...args], {encoding:'utf8', timeout:15 * 60 * 1000});
  const out = (r.stdout || '') + (r.stderr || '');
  const why = r.status !== 0 ? 'Abbruch' : /(^|[\['" ])PAGE /m.test(out) ? 'Seitenfehler' : /BAD: (?!none)/.test(out) ? 'Regel verletzt' : /^ERR /m.test(out) ? 'Fehler im Test' : /errors [1-9]/.test(out) ? 'Seitenfehler' : '';
  console.log(`${why ? 'FEHLER' : 'OK    '} ${name.padEnd(6)} ${Math.round((Date.now() - t0) / 1000)} s${why ? ' · ' + why : ''}`);
  if (why){ failed++; console.log(out.split('\n').filter(l => /BAD|PAGE|ERR|errors|Error/.test(l)).slice(0, 12).join('\n')); }
}
process.exit(failed ? 1 : 0);
