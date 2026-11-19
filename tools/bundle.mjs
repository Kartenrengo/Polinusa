// Packs index.html, style.css and src/*.js into one file: dist/polinusa.html
// Run: node tools/bundle.mjs   (--full keeps the comments; by default they are taken out, see tools/strip.mjs)
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {strip} from './strip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, f), 'utf8'), full = process.argv.includes('--full');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="(style\.css)">/, (_, f) => `<style>\n${full ? read(f) : read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s+/g, '\n')}</style>`);
html = html.replace(/<script src="(src\/[\w.]+)"><\/script>/g, (_, f) => {
  const js = full ? read(f) : strip(read(f));
  if (js.includes('</script')) throw new Error(`${f} contains </script`);
  return `<script>\n${js}</script>`;
});
if (/<script src=|href="style\.css"/.test(html)) throw new Error('something was not inlined');

mkdirSync(join(root, 'dist'), {recursive:true});
writeFileSync(join(root, 'dist/polinusa.html'), html);
console.log(`dist/polinusa.html  ${(html.length / 1024).toFixed(0)} KB`);
