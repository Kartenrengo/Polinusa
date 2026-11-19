// Takes the comments and the indentation out of a script, nothing else: names stay, so the scripts still share their globals.
// Strings, template literals and regular expressions are read as such, so a // inside them stays.
export function strip(src){
  let out = '', i = 0, last = '';   // last: the last character that is not blank, to tell a regex from a division
  const n = src.length, word = () => { const m = /[\w$]+$/.exec(out); return m ? m[0] : ''; };
  const regexOk = () => !last || '(,=:[!&|?{};+-*%<>~^'.includes(last) || ['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', 'else', 'do'].includes(word());
  const stack = [];   // open template literals: depth of ${ } inside each
  while (i < n){
    const c = src[i], d = src[i + 1];
    if (stack.length && c === '}' && stack[stack.length - 1] === 0){ stack.pop(); out += c; i++; i = tpl(i); continue; }
    if (c === '/' && d === '/'){ while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*'){ const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; if (/\w$/.test(out) && /^\w/.test(src[i] || '')) out += ' '; continue; }
    if (c === '"' || c === "'"){ let j = i + 1; while (j < n && src[j] !== c){ if (src[j] === '\\') j++; j++; } out += src.slice(i, j + 1); i = j + 1; last = c; continue; }
    if (c === '`'){ out += c; i = tpl(i + 1); continue; }
    if (c === '/' && regexOk()){ let j = i + 1, cls = false; while (j < n){ const q = src[j]; if (q === '\\'){ j += 2; continue; } if (q === '[') cls = true; else if (q === ']') cls = false; else if (q === '/' && !cls) break; else if (q === '\n') break; j++; } j++; while (/[a-z]/.test(src[j] || '')) j++; out += src.slice(i, j); i = j; last = '/'; continue; }
    if (c === '\n'){ out = out.replace(/[ \t]+$/, ''); if (!out.endsWith('\n')) out += '\n'; i++; while (src[i] === ' ' || src[i] === '\t') i++; continue; }
    if (stack.length){ if (c === '{') stack[stack.length - 1]++; else if (c === '}') stack[stack.length - 1]--; }
    out += c; if (c !== ' ' && c !== '\t') last = c; i++;
  }
  return out;
  // inside a template literal: copy up to its end or to the next ${, which opens code again
  function tpl(j){
    while (j < n){ const q = src[j]; if (q === '\\'){ out += src.slice(j, j + 2); j += 2; continue; } if (q === '`'){ out += q; last = '`'; return j + 1; } if (q === '$' && src[j + 1] === '{'){ out += '${'; stack.push(0); last = '{'; return j + 2; } out += q; j++; }
    return j;
  }
}
