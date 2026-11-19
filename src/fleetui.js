'use strict';
/* Sheets for the fleet, trade chains, the canoe house, the calendar and the feast of the Pleiades */

const icon = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>`;
const shipIcon = kind => kind === 'oc' ? '<svg class="ic ship" viewBox="-13 -10 26 14" aria-hidden="true"><use href="#oc"/></svg>' : '<svg class="ic ship" viewBox="-24 -28 46 36" aria-hidden="true"><use href="#dc"/></svg>';
const stepper = (act, k, n, canMinus, canPlus, label) => `<span class="step"><button type="button" data-act="${act}-" data-k="${k}" aria-label="${label} weniger" ${canMinus ? '' : 'disabled'}>−</button><output aria-live="polite">${n}</output><button type="button" data-act="${act}+" data-k="${k}" aria-label="${label} mehr" ${canPlus ? '' : 'disabled'}>+</button></span>`;
/* a slider for amounts: drag to load or unload; the number beside it is what really went aboard */
const slider = (act, k, n, max, label) => `<span class="slide"><input type="range" min="0" max="${Math.max(max, n, 1)}" step="1" value="${n}" data-act="${act}" data-k="${k}" data-v="${n}" aria-label="${label}"${max > 0 || n > 0 ? '' : ' disabled'}><output>${n}</output></span>`;
function shipStatus(s){
  const r = s.route != null ? routes[s.route] : null;
  if (s.auto) return s.state === 'sail' && s.dest && s.dest.isl ? `Erkundet von selbst, holt Proviant auf ${isl(s.dest.isl).name}.` : 'Erkundet von selbst.';
  if (r && s.noWay) return `In der Handelskette ${isl(r.a).name} – ${isl(r.b).name}. Findet keinen Weg, versucht es weiter.`;
  if (r) return `In der Handelskette ${isl(r.a).name} – ${isl(r.b).name}.${s.full ? ` An Bord: ${giftText(s.cargo)}. Lager auf ${s.fullAt} voll.` : ''}`;
  if (s.state === 'sail') return s.dest && s.dest.isl ? `Unterwegs nach ${isl(s.dest.isl).name}.` : 'Unterwegs auf See.';
  if (s.state === 'sea') return 'Liegt auf offener See vor Anker.';
  const P = isl(s.port); return P.clan ? `Liegt ${clanBeim(P.clan)} auf ${P.name}.` : P.settled ? `Liegt im Hafen von ${P.name}.` : `Liegt vor ${P.name}, das noch unbewohnt ist.${giftOf(P) ? ` Gabe: ${GIFTS[giftOf(P)].n}. ${GIFTS[giftOf(P)].does}` : ''}`;
}
/* The canoe sheet: what it carries, loading in a port of ours, and what it can do where it is */
function shipMarkup(s){
  const S = SHIPS[s.kind], P = s.port && s.state !== 'sail' ? isl(s.port) : null, load = roomUsed(s), life = s.life || [];
  // under way the sheet stays small, so the sea is free to tap; "Mehr" opens all of it
  const mini = sheetData.mini ?? (s.state === 'sail' || s.state === 'sea' || s.route != null);
  if (mini){ const home = islands.some(I => I.settled) && !(P && P.settled);
    return head(s.name, shipStatus(s)) + `<div class="rowx"><span class="sub">Tippe aufs Meer oder eine Insel.</span><span class="chips">${s.state === 'sail' ? '<button class="chip" type="button" data-act="halt">Halt</button>' : ''}${home ? '<button class="chip" type="button" data-act="homeship">Heim</button>' : ''}${s.route != null ? '<button class="chip" type="button" data-act="unassign">Aus der Kette</button>' : ''}<button class="chip" type="button" data-act="shipmore">Mehr</button></span></div>`; }
  let h = head(s.name, shipStatus(s));
  // loading in our own port: only the hold and the store, as in Anno
  if (P && P.settled && s.route == null && sheetData.load){ h += holdMarkup(s, P);
    const here = routes.map((r, i) => [r, i]).filter(([r]) => r.a === P.id || r.b === P.id);
    if (here.length) h += `<div class="rowx"><span class="sub">In eine Handelskette:</span><span class="chips">${here.map(([r, i]) => `<button class="chip" type="button" data-act="assign" data-r="${i}">${isl(r.a === P.id ? r.b : r.a).name}</button>`).join('')}</span></div>`;
    return h; }
  { const sw = sailWord(s); if (sw) h += `<p class="sub">${icon('wind')}<b>${sw}.</b></p>`; }
  h += `<p class="sub"><b>Besatzung:</b> ${S.crew} ${S.crewN}${s.kind !== 'oc' ? ', darunter ein Navigator, der nach Sternen und Wellen steuert' : ''}.${s.people ? ` Dazu ${s.people} Siedler.` : ''}${seaCrew(s) ? ` Seefahrerfamilien: ${Math.round((seaF(s) - 1) * 100)} % schneller, weniger Böen.` : ''}</p>`;
  h += `<div class="rowx"><span class="sub">Tippe auf das Meer oder eine Insel, dann fährt es dorthin.${S.fog ? '' : ' Ins Unbekannte fährt es nicht.'}</span><button class="chip" type="button" data-act="shipless">Weniger</button></div>`;
  if (S.fog && s.route == null) h += `<div class="rowx"><span class="sub">${s.auto ? 'Es fährt an den Rand des Bekannten, kehrt rechtzeitig um, holt im nächsten eigenen Hafen Proviant und fährt wieder los.' : 'Von selbst erkunden: an den Rand des Bekannten und rechtzeitig zurück, mit Proviant aus dem eigenen Lager.'}</span><button class="btn${s.auto ? '' : ' primary'}" type="button" data-act="auto">${s.auto ? 'Anhalten' : 'Erkunden lassen'}</button></div>`;
  if (S.fog) h += provisionNote(s, P);
  // a treasure island: what the crew can gather here
  if (P && P.treasure){ const T = P.treasure; h += `<div class="stat">${icon(T.k)}<span>${GN[T.k]}: ${T.left} bereit</span><span class="sub">${s.auto ? '' : 'Solange das Kanu hier liegt, sammelt die Mannschaft.'}</span></div>`; }
  if (s.hungry) h += `<p><b>Kein Proviant mehr.</b> Die Mannschaft fährt langsam heim.</p>`;
  if (s.full && cargoLoad(s) && s.route == null && !(P && P.settled)) h += `<p class="sub">An Bord: ${giftText(s.cargo)}. Lager auf ${s.fullAt || 'dem Hafen'} voll.</p>`;   // on a chain the status says it
  h += shipDiveMarkup(s);
  const aboard = `An Bord: ${[s.people ? `${s.people} Siedler` : '', cargoLoad(s) ? giftText(s.cargo) : '', life.length ? andList(life.map(id => LIFE[id].s)) : ''].filter(Boolean).join(', ') || 'nichts'}.`;
  // the loading list is folded away by default, so the map stays free for steering
  // the hold at a glance, as in Anno: its places and what fills them; in our own port a tap on Beladen opens the store
  h += holdView(s) + (P && P.settled && s.route == null ? `<div class="rowx"><span class="sub">${aboard}</span><button class="btn primary" type="button" data-act="load">Beladen</button></div>` : cargoLoad(s) && s.route == null && !(P && P.clan) ? `<div class="rowx"><span class="sub">${aboard}</span>${dumpBtn()}</div>` : '');
  if (s.route != null) h += `<div class="rowx"><span></span><button class="btn" type="button" data-act="unassign">Aus der Kette nehmen</button></div>`;
  if (P && !P.settled && !P.clan){ const hl = hutLack(s, P), hut = !Object.keys(hl).length, ok = s.people >= SETTLE.people && mana >= manaNeeded() && hut;
    h += `<div class="rowx"><span class="sub">${s.people < SETTLE.people ? `Für ein Dorf braucht es ${SETTLE.people} Siedler an Bord.` : !hut ? `Für das erste Haus fehlen an Bord ${giftText(hl)}.` : mana >= manaNeeded() ? 'Hier kann ein Dorf entstehen.' : `Es braucht Ansehen ${manaNeeded()}, jetzt ${Math.floor(mana)}.`}</span><button class="btn primary" type="button" data-act="settle" ${ok ? '' : 'disabled'}>Dorf gründen</button></div>`; }
  if (P && P.clan) h += `<div class="rowx"><span class="sub">${load ? `Diese Gabe bringt später etwa ${giftGuess(P.clan, giftWorth(P, s.cargo) * returnRate((routes[routeIndex(s.last, P.id)] || {knots:0}).knots))} zurück.` : 'Lade in einem eigenen Hafen etwas ein, das sie schätzen.'}</span><button class="btn primary" type="button" data-act="gift" ${load ? '' : 'disabled'}>Gabe übergeben</button></div>`;
  return h;
}
/* Loading as in Anno: the canoe's hold as a row of places, one per load, each coloured by what lies in it; the settlers'
   seats beside it; below, the store of the island as pictures. A tap on a picture loads a handful (1, 5 or all that fits),
   a tap on a place in the hold puts that good back. Held, every picture says what it is. */
const LIFE_IC = {yams:'nahrung', taro:'nahrung', brot:'proviant', maulbeer:'tapa', kava:'kava', banane:'nahrung', kurkuma:'kurkuma', huhn:'eier', schwein:'schweine'};
const holdHue = k => `hsl(${(GOODS.indexOf(k) * 47) % 360} 42% 78%)`;   // each good its own soft colour in the hold
/* plants and animals for new land, as green pictures among the goods: each takes two places; held, it says what it is */
function lifeTiles(s, P, load){
  const S = SHIPS[s.kind], life = s.life || [], have = lifeOf(P);
  return LIFE_IDS.filter(id => have.includes(id) && !life.includes(id)).map(id => { const L = LIFE[id], short = load + LIFE_LOAD > S.cap || Object.entries(L.take || {}).some(([g, v]) => (P.stock[g] || 0) < v);
    return `<button class="lt life" type="button" data-act="life" data-k="${id}" data-tip="${esc(`<b>${L.n}</b> fürs neue Land, 2 Plätze. ${L.text} Was nicht im Kanu war, wächst dort nicht.`)}" aria-label="${L.n} mitnehmen" ${short ? 'disabled' : ''}>${icon(LIFE_IC[id] || 'nahrung')}<small>${L.n.slice(0, 6)}</small></button>`; }).join('');
}
/* the hold to look at only: places coloured by their goods, the number on the first of each */
function holdView(s){
  const S = SHIPS[s.kind], cells = [];
  for (const k of GOODS) for (let n = 0; n < (s.cargo[k] || 0); n++) cells.push(`<span class="hc${n ? '' : ' first'}" style="--hc:${holdHue(k)}" role="img" aria-label="${n ? '' : GN[k] + ' ' + s.cargo[k]}">${n ? '' : icon(k) + `<b>${s.cargo[k]}</b>`}</span>`);
  for (const id of s.life || []) for (let n = 0; n < LIFE_LOAD; n++) cells.push(`<span class="hc lifec" role="img" aria-label="${n ? '' : LIFE[id].n}">${n ? '' : icon(LIFE_IC[id] || 'nahrung')}</span>`);
  while (cells.length < S.cap) cells.push('<span class="hc free" aria-hidden="true"></span>');
  return `<div class="hold mini${S.cap > 12 ? ' big' : ''}" role="group" aria-label="Laderaum ${roomUsed(s)} von ${S.cap}${s.people ? `, ${s.people} Siedler` : ''}">${cells.join('')}</div>`;
}
/* throwing the load overboard, as in Anno: a first tap asks, a second throws the goods (not the settlers) into the sea */
const dumpBtn = () => `<button class="btn small dump" type="button" data-act="dump">${sheetData.dumpAsk ? 'Wirklich über Bord?' : 'Über Bord werfen'}</button>`;
function holdMarkup(s, P){
  const S = SHIPS[s.kind], load = roomUsed(s), life = s.life || [], step = sheetData.step || 5, free = S.cap - load, stuck = GOODS.some(k => s.cargo[k] > 0 && (P.stock[k] || 0) >= storeCap(P));   // a good the full store cannot take back
  const cells = [];
  for (const k of GOODS) for (let n = 0; n < (s.cargo[k] || 0); n++) cells.push({k, first:n === 0, n:s.cargo[k]});
  for (const id of life) for (let n = 0; n < LIFE_LOAD; n++) cells.push({life:id, first:n === 0});
  while (cells.length < S.cap) cells.push(null);
  const cell = c => !c ? '<span class="hc free" aria-hidden="true"></span>' : c.life
    ? `<button class="hc lifec${c.first ? ' first' : ''}" type="button" data-act="life" data-k="${c.life}" data-tip="${esc(`<b>${LIFE[c.life].n}</b>: ${LIFE[c.life].text} Tippen nimmt es heraus.`)}" aria-label="${LIFE[c.life].n} an Bord, herausnehmen">${c.first ? icon(LIFE_IC[c.life] || 'nahrung') : ''}</button>`
    : `<button class="hc${c.first ? ' first' : ''}" style="--hc:${holdHue(c.k)}" type="button" data-act="cgo" data-k="${c.k}" data-tip="${esc(`<b>${GN[c.k]}</b> ${c.n} an Bord. Tippen lädt ${step === 99 ? 'alles' : Math.min(step, c.n)} aus.`)}" aria-label="${GN[c.k]} ${c.n} an Bord, ausladen">${c.first ? icon(c.k) + `<b>${c.n}</b>` : ''}</button>`;
  const seats = Array.from({length:S.people}, (_, i) => i < s.people
    ? `<button class="seat on" type="button" data-act="pp-" data-k="pop" aria-label="Siedler aussteigen lassen" data-tip="${esc('<b>Siedler</b> an Bord. Tippen lässt eine Person aussteigen.')}">${icon('pop')}</button>`
    : `<button class="seat" type="button" data-act="pp+" data-k="pop" aria-label="Siedler einsteigen lassen" data-tip="${esc(`<b>Platz für Siedler</b>. Tippen lässt eine Person einsteigen. Auf ${P.name} wohnen ${P.pop}.`)}" ${P.pop > SETTLE.keep ? '' : 'disabled'}>${icon('pop')}</button>`).join('');
  const goods = GOODS.filter(k => (P.stock[k] || 0) > 0).sort((a, b) => S.fog ? (b === 'proviant') - (a === 'proviant') : 0);   // provisions first on the double canoe
  const tiles = goods.map(k => `<button class="lt" type="button" data-act="cgn" data-k="${k}" data-tip="${esc(`<b>${GN[k]}</b> ${P.stock[k]} im Lager. Tippen lädt ${step === 99 ? 'so viel ein, wie passt' : Math.min(step, P.stock[k]) + ' ein'}.`)}" aria-label="${GN[k]} einladen, ${P.stock[k]} im Lager" ${free > 0 ? '' : 'disabled'}>${icon(k)}<small>${P.stock[k]}</small></button>`).join('');
  const steps = [1, 5, 99].map(v => `<button class="chip${step === v ? ' on' : ''}" type="button" data-act="cstep" data-v="${v}" aria-pressed="${step === v}">${v === 99 ? 'alle' : v}</button>`).join('');
  return `<div class="hold${S.cap > 12 ? ' big' : ''}" role="group" aria-label="Laderaum ${load} von ${S.cap}">${cells.map(cell).join('')}</div>` +
    `<div class="holdbar"><span class="seats" role="group" aria-label="Siedler ${s.people} von ${S.people}">${seats}</span><span class="sub"><b>${load}</b>/${S.cap}</span><span class="chips steps" role="group" aria-label="Wie viel je Tippen">${steps}</span></div>` +
    `<p class="sec">Lager ${P.name}</p><div class="ltiles">${tiles || '<span class="sub">Nichts im Lager.</span>'}${lifeTiles(s, P, load)}</div>` +
    `${s.people ? `<p class="sub">Siedler an Bord: Nimm Holz und Nahrung mit, damit sie gleich bauen und essen können.</p>` : ''}` +
    `<div class="rowx"><span>${stuck ? dumpBtn() : ''}</span><span class="chips"><button class="btn" type="button" data-act="unload" ${load || s.people ? '' : 'disabled'}>Alles ausladen</button><button class="btn primary" type="button" data-act="fold">Fertig</button></span></div>`;
}
/* Life for new land: the canoe plants and a pair of pigs, each taking two places. Whatever grows on this island can go. */
function lifeMarkup(s, P, load){
  const S = SHIPS[s.kind], life = s.life || [], have = lifeOf(P);
  const chips = LIFE_IDS.filter(id => have.includes(id) || life.includes(id)).map(id => {
    const on = life.includes(id), L = LIFE[id], short = !on && (load + LIFE_LOAD > S.cap || Object.entries(L.take || {}).some(([g, v]) => (P.stock[g] || 0) < v));
    return `<button class="chip" type="button" data-act="life" data-k="${id}" aria-pressed="${on}" ${short ? 'disabled' : ''} title="${L.text}">${L.n}</button>`; }).join('');
  if (!chips) return '';
  return `<p class="sec">Leben fürs neue Land</p><div class="chips">${chips}</div><p class="sub">Je 2 Plätze. Was nicht im Kanu war, wächst auf der neuen Insel nicht.</p>`;
}
function toggleLife(s, P, id){
  const life = s.life || (s.life = []), L = LIFE[id], i = life.indexOf(id);
  if (i >= 0){ life.splice(i, 1); for (const [g, v] of Object.entries(L.take || {})) P.stock[g] = Math.min(storeCap(P), (P.stock[g] || 0) + v); return; }
  if (!lifeOf(P).includes(id) || roomUsed(s) + LIFE_LOAD > SHIPS[s.kind].cap || !canPay(P, L.take || {})) return;
  pay(P, L.take || {}); life.push(id);
}
/* Provisions, plainly: where they come from, how long they last, and whether the canoe is ready for the unknown */
function provisionNote(s, P){
  const pv = s.cargo.proviant || 0, other = s.people || (s.life && s.life.length) || GOODS.some(k => k !== 'proviant' && s.cargo[k] > 0), secs = voyageDay() * TICK / 1000;
  const ready = pv > 0 && !other ? '<span class="state ok">bereit zum Erkunden</span>' : pv > 0 ? '<span class="state low">nur Proviant mitnehmen</span>' : '<span class="state out">kein Proviant</span>';
  const pits = P && P.settled ? P.buildings.some(b => b.kind === 'gaergrube' && !b.bt) : true;
  return `<div class="stat">${ready}${pv ? `<span>${icon('proviant')}${pv}, reicht etwa ${secsText(pv * secs)} auf See</span>` : ''}</div>` +
    `<p class="sub"><b>Proviant</b> kommt aus der Gärgrube, gegorene Brotfrucht, die monatelang hält. Ins Unbekannte fährt man nur damit, ohne Siedler und Waren; alle ${secs} s isst die Mannschaft 1.${pits ? '' : ' Hier gibt es noch keine Gärgrube (sie braucht 2 Brotfruchtbäume daneben).'}</p>`;
}
/* A trade chain, compact as in Anno: the canoes on it as small chips, then the two ends side by side. Each end lists what it
   loads (icon: keep amount, − number +); everything the other end loaded is unloaded here by itself. Words are in the bubbles. */
function routeMarkup(ri){
  const r = routes[ri], A = isl(r.a), B = isl(r.b), on = ships.filter(s => s.own && s.route === ri);
  const C = A.clan || B.clan, mineEnd = A.clan ? B : A;
  let h = head(C ? `Schnur ${clanZum(C)}` : `${A.name} – ${B.name}`, `${r.knots} Knoten`);
  const all = routes.map((q, i) => [q, i]).filter(([q]) => q.a === active || q.b === active);
  if (all.length > 1) h += `<div class="chips" role="group" aria-label="Kette">${all.map(([q, i]) => `<button class="chip" type="button" data-act="route" data-r="${i}" aria-pressed="${i === ri}">${isl(q.a === active ? q.b : q.a).name}</button>`).join('')}</div>`;
  const word = s => s.noWay ? 'findet keinen Weg' : s.full ? `Lager auf ${s.fullAt} voll` : s.state === 'sail' ? 'fährt' : 'wartet im Hafen';
  const free = ships.filter(s => s.own && s.route == null && s.state !== 'sail' && (s.port === r.a || s.port === r.b));
  h += `<div class="rboats" role="group" aria-label="Kanus der Kette">` +
    on.map(s => `<button class="rc rboat${s.noWay || s.full ? ' warn' : ''}" type="button" data-act="unassign" data-s="${s.id}" data-tip="${esc(`<b>${s.name}</b> ${word(s)}.${cargoLoad(s) ? ` An Bord: ${giftText(s.cargo)}.` : ''} Tippen zieht es von der Kette ab.`)}" aria-label="${s.name}, ${word(s)}, abziehen">${shipIcon(s.kind)}<small>${s.name}</small><i class="dot ${s.state === 'sail' ? 'go' : ''}"></i></button>`).join('') +
    free.map(s => `<button class="rc rboat free" type="button" data-act="assignS" data-s="${s.id}" data-tip="${esc(`<b>${s.name}</b> liegt im Hafen. Tippen setzt es auf diese Kette.`)}" aria-label="${s.name} einsetzen">${shipIcon(s.kind)}<small>+ ${s.name}</small></button>`).join('') +
    (on.length || free.length ? '' : `<span class="rc rnone sub" data-tip="${esc(`Bau im Kanuhaus ein Auslegerkanu und bring es nach ${mineEnd.name}, dann kannst du es hier einsetzen.`)}">Kein Kanu${icon('einbaum')}</span>`) +
    `<span class="rc rhelp" role="img" aria-label="Hilfe" data-tip="${esc(C ? `Sie antworten später mit ${clanMakes(C).map(k => GN[k]).join(' und ')}. Was sie schätzen: ${clanWants(C).map(k => GN[k]).join(', ')}. ${kin(A.clan ? A : B) ? 'Sie stempeln euer Muster: Eure Gaben zählen mehr.' : 'Töpfe in der Gabe bringen ihnen euer Muster, dann zählen eure Gaben mehr.'}` : 'Jede Fahrt knüpft einen Knoten dazu, dann geht es schneller. Was das andere Ende lädt, wird hier ausgeladen. Ist ein Lager voll, bleibt der Rest an Bord und das Kanu fährt weiter. Es wartet nie.')}">?</span></div>`;
  const cap = on.length ? Math.max(...on.map(s => SHIPS[s.kind].cap)) : 24;
  const side = (from, to, key) => {
    const plan = r.plan[key] || (r.plan[key] = {}), goods = GOODS.filter(k => (from.stock[k] || 0) > 0 || plan[k]), sum = Object.values(plan).reduce((a, b) => a + b, 0);
    const set = goods.filter(k => plan[k]), add = goods.filter(k => !plan[k]);
    const row = k => { const kp = routeKeep(r, key, k), n = plan[k];
      return `<li class="rrow"><button class="rc rk${kp ? ' on' : ''}" type="button" ${from.clan ? 'disabled' : `data-act="kp" data-k="${key}:${k}"`} data-tip="${esc(`<b>${GN[k]}</b>, ${from.stock[k] || 0} im Lager. ${from.clan ? '' : `Tippen: ${kp ? `${kp} bleiben im Lager` : 'nimmt alles'}; weiter tippen ändert es.`}`)}" aria-label="${GN[k]}, Lager ${from.stock[k] || 0}, ${kp ? `lässt ${kp}` : 'nimmt alles'}">${icon(k)}${kp ? `<b>${kp}</b>` : ''}</button>` +
        `<span class="rn"><button class="rc rm" type="button" data-act="pl-" data-k="${key}:${k}" aria-label="${GN[k]} weniger">−</button><button class="rc rv" type="button" data-act="pl5" data-k="${key}:${k}" data-tip="${esc(`<b>${n} ${GN[k]}</b> je Fahrt. Tippen: 5 mehr.`)}" aria-label="${GN[k]} ${n}, fünf mehr">${n}</button><button class="rc rm" type="button" data-act="pl+" data-k="${key}:${k}" aria-label="${GN[k]} mehr" ${sum >= cap ? 'disabled' : ''}>+</button></span></li>`; };
    return `<section class="rend" aria-label="${from.name}"><p class="rname"><b>${from.name}</b><span class="sub" data-tip="${esc(`Lädt hier: ${to.clan ? 'als Gabe' : `${sum} von ${cap} Plätzen`}`)}">${to.clan ? 'Gabe' : `${sum}/${cap}`}</span></p>` +
      (set.length ? `<ul class="rlist">${set.map(row).join('')}</ul>` : `<p class="sub rempty">${from.stock && goods.length ? 'Ware wählen' : 'Lager leer'}</p>`) +
      (add.length ? (set.length && sheetData.pick !== key ? `<button class="rc rplus" type="button" data-act="plopen" data-k="${key}" data-tip="${esc('<b>Ware dazunehmen</b>. Tippen zeigt, was im Lager liegt.')}" aria-label="Ware dazunehmen"${sum >= cap ? ' disabled' : ''}>+ Ware</button>` : `<div class="radd" role="group" aria-label="Ware dazunehmen">${add.map(k => `<button class="rc padd" type="button" data-act="pladd" data-k="${key}:${k}" data-tip="${esc(`<b>${GN[k]}</b> ${from.stock[k] || 0} im Lager. Tippen nimmt es in die Ladung.`)}" aria-label="${GN[k]} dazunehmen, im Lager ${from.stock[k] || 0}"${sum >= cap ? ' disabled' : ''}>${icon(k)}<small>${from.stock[k] || 0}</small></button>`).join('')}</div>`) : '') + `</section>`;
  };
  const ends = [A.settled ? side(A, B, 'a') : '', B.settled ? side(B, A, 'b') : ''].filter(Boolean);
  h += `<div class="rends${ends.length === 1 ? ' one' : ''}">${ends.join('<span class="rmid" aria-hidden="true">⇄</span>')}</div>`;
  if (C) h += `<p class="sub rwant">${icon('schnur')}Sie schätzen: ${clanWants(C).map(k => `<span class="rc" role="img" aria-label="${GN[k]}" data-tip="${GN[k]}">${icon(k)}</span>`).join('')}</p>`;
  return h;
}
function openRoute(ri){ const r = routes[ri]; if (isl(r.a).settled && r.a !== active && r.b !== active) setActive(r.a); selectedId = null; invalidate(); openSheet('route', {r:ri}); }
/* All canoes and trade chains at a glance */
function fleetMarkup(){
  const mine = own();
  let h = head('Flotte', mine.length ? 'Tippe auf Steuern, dann auf das Meer oder eine Insel.' : 'Kanus entstehen im Kanuhaus.');
  h += mine.length ? `<ul class="list needs">${mine.map(s => `<li>${shipIcon(s.kind)}<span class="nm">${s.name}<small>${SHIPS[s.kind].crew} ${SHIPS[s.kind].crewN}${s.people ? `, ${s.people} Siedler` : ''}${cargoLoad(s) ? `, ${giftText(s.cargo)}` : ''}. ${shipStatus(s)}${s.hungry ? ' Kein Proviant.' : ''}</small></span><button class="btn small" type="button" data-act="steer" data-s="${s.id}">Steuern</button></li>`).join('')}</ul>` : '';
  if (routes.length) h += `<p><b>Handelsketten</b></p><ul class="list needs">${routes.map((r, i) => { const A = isl(r.a), B = isl(r.b), n = ships.filter(s => s.own && s.route === i).length;
    return `<li>${icon('schnur')}<span class="nm">${A.name} – ${B.name}<small>${r.knots} Knoten, ${n ? `${n} ${n === 1 ? 'Kanu' : 'Kanus'}` : 'kein Kanu'}</small></span><button class="btn small" type="button" data-act="chain" data-r="${i}">Ansehen</button></li>`; }).join('')}</ul>`;
  return h;
}
function steerShip(s){ closeSheet(); selectShip(s); flyTo(s.x, s.y, Math.max(cam.z, 1)); }

/* The canoe house: one canoe at a time, it takes a while */
/* The canoe house in one glance: which of the six steps, how far, and the wood; the choice of canoes when it is free */
function yardMarkup(I){
  if (I.yard){
    const S = SHIPS[I.yard.kind], f = 1 - I.yard.left / S.bt, w = staffOf(I).yard, here = presentAt(I).get(I.buildings.find(b => b.kind === 'werft')) || 0, k = yardStep(I.yard), [n, t] = k ? YARD_STEPS[I.yard.kind][k - 1] : YARD_WOOD, secs = here ? I.yard.left * YARD_CREW / here * TICK / 1000 : 0;
    const carving = I.buildings.some(b => b.kind === 'werft' && b.boat > 0), state = carving ? '<span class="state low">erst wird der Einbaum geschnitzt</span>' : !w ? '<span class="state out">ruht, keine Leute</span>' : !here ? '<span class="state low">Bauleute kommen</span>' : '';
    return `<div class="stat"><b>${S.n} · Schritt ${k + 1}/6 · ${n}</b>${state}</div><span class="mbar big"><i style="width:${f * 100}%"></i></span>` +
      `<div class="stat"><span class="sub">${t}</span>${here ? `<span>noch ${secsText(secs)}</span>` : ''}</div>` + `<div class="rtiles"><span class="rtile ${(I.yard.got || 0) >= S.cost.holz ? 'ok' : 'out'}" role="img" aria-label="Holz am Platz: ${I.yard.got || 0} von ${S.cost.holz}">${icon('holz')}<small>Holz am Platz</small><b>${I.yard.got || 0}/${S.cost.holz}</b></span></div>`;
  }
  // each canoe: what it can do, and what it takes as tiles with names, green when it lies in store, red when it is missing
  return Object.entries(SHIPS).filter(([k]) => k === 'oc' || unlocked(k)).map(([k, S]) => `<div class="shiprow"><div class="rowx"><span><b>${S.n}</b><br><span class="sub">etwa ${String(Math.round(S.bt * TICK / 60000 * 2) / 2).replace('.', ',')} min · ${S.cap} Waren, ${S.people} Menschen${k === 'vaka' ? ' · fährt über die Leere See' : ''}${k === 'dc' ? ' · fährt ins Unbekannte' : ''}</span></span><button class="btn${canPay(I, S.cost) ? ' primary' : ''}" type="button" data-act="yard" data-k="${k}" ${canPay(I, S.cost) ? '' : 'disabled'}>Bauen</button></div>${costTiles(I, S.cost)}</div>`).join('') +
    `<p class="sub">Im Hafen: ${shipAt(I.id).map(s => s.name).join(', ') || 'kein Kanu'}.</p>`;
}
/* The calendar: the seasons, the palolo night, the rāhui and the next feast */
function calendarMarkup(){
  const S = seasonOf(), I = isl(active), m = moonOf();
  let h = head(`${S.n}, ${m + 1}. Mond`, '');
  // the year as twelve moons in a ring of seasons; this moon marked
  h += `<div class="moons" role="img" aria-label="${S.n}, ${m + 1}. von 12 Monden">${Array.from({length:12}, (_, i) => { const Q = SEASONS.find(q => i >= q.from && i < q.to); return `<i class="moon-d ${Q.id}${i === m ? ' now' : ''}${i === Q.from ? ' start' : ''}"></i>`; }).join('')}</div>`;
  h += `<div class="seasons">${SEASONS.map(Q => `<span class="season-t ${Q.id}${Q === S ? ' now' : ''}" aria-label="${Q.n}: ${Q.text}">${icon(Q.id)}<small>${Q.n.replace('Zeit der ', '').replace('zeit', '')}</small></span>`).join('')}</div>`;
  h += `<p class="sub">${S.text}</p>`;
  h += `<div class="sfx">${SEASON_FX[S.id].map(([k, d, t]) => `<span class="sfx-i ${d > 0 ? 'up' : 'down'}" role="img" aria-label="${t}">${icon(k)}<b>${d > 0 ? '▲' : '▼'}</b><small>${t}</small></span>`).join('')}</div>`;
  h += `<div class="rowx"><span class="fest">${icon('plejaden')}${festivalTime() ? '<b>Festzeit</b>' : `Fest in ${minutes(untilFestival())} min`}</span></div>`;
  if (S.id === 'mager' && I.buildings.some(b => SEA_KINDS.has(b.kind))) h += I.rahui ? `<p class="sub">Auf ${I.name} gilt Rāhui. Fischfang und Riff ruhen bis zum Fest.</p>` : `<div class="rowx"><span class="sub">Rāhui auf ${I.name}: Fischfang und Riff bis zum Fest sperren, dann dreifacher Fang und Ansehen +3.</span><button class="btn" type="button" data-act="rahui">Rāhui ausrufen</button></div>`;
  return h;
}
/* The feast of the first fruits, in the meeting house when the Pleiades rise */
function festivalMarkup(I){
  const no = festivalState(I);
  let h = `<p><b>Fest der Plejaden</b> <span class="sub">Erste Früchte: ${costText(FESTIVAL.offering)}, Ansehen +${FESTIVAL.mana}</span></p>`;
  if (no) return h + `<p class="sub">${no}</p>`;
  const parts = festivalParts(I), chosen = sheetData.fest || (sheetData.fest = parts.filter(p => p.ok).map(p => p.P.id));
  h += `<ul class="list needs">${parts.map(p => `<li class="${p.ok ? (chosen.includes(p.P.id) ? 'okk' : '') : 'need'}"><span class="nm">${p.P.n}<small>${p.ok ? p.P.text : p.why}</small></span>${p.ok ? `<button class="chip" type="button" data-act="part" data-p="${p.P.id}" aria-pressed="${chosen.includes(p.P.id)}">+${p.gain}</button>` : ''}</li>`).join('')}</ul>`;
  const guests = guestsFor();
  h += `<p class="sub">Schönheit des Dorfes: +${Math.min(8, Math.floor(beautyOf(I) / 3))}.${ancestorsHonour(I) ? ` Die Ahnen: +${ancestorsHonour(I)}.` : ''}${guests.length ? ` Als Gäste kommen ${guests.map(T => T.clan.name).join(', ')}, mit Gaben.` : ' Clans mit mindestens 2 Knoten kommen als Gäste.'}</p>`;
  h += `<div class="rowx"><span>Ansehen +${festivalGain(I, chosen)}</span><button class="btn primary" type="button" data-act="festival">Fest feiern</button></div>`;
  return h;
}
/* Settlers go as families: first the rest of the family already aboard, then a family whose grown-ups are free, grown-ups
   first; the chief's family stays. Whoever goes takes their line along. */
function nextSettler(P, s){
  const last = (s.folk || []).slice(-1)[0], cf = chiefFam(P), busy = new Set(P.people.filter(p => p.job).map(p => p.h));
  const pool = P.people.filter(p => !(cf && p.h === cf.id));
  const same = last && pool.filter(p => p.h === last.h);
  const list = same && same.length ? same : pool.filter(p => !busy.has(p.h)).length ? pool.filter(p => !busy.has(p.h)) : pool;
  return list.slice().sort((a, b) => (stageOf(a) === 'adult' ? 0 : 1) - (stageOf(b) === 'adult' ? 0 : 1) || a.h - b.h || b.b - a.b)[0] || null;
}
/* What a slider stands for right now */
function slideValue(act, k){
  if (sheetKind === 'ship'){ const s = ships.find(q => q.id === sheetData.id); if (!s) return 0; return act === 'pp' ? s.people : s.cargo[k] || 0; }
  if (sheetKind === 'route'){ const r = routes[sheetData.r], [key, g] = k.split(':'), plan = r && r.plan[key]; return plan && plan[g] || 0; }
  return 0;
}
/* Dragging a slider loads or unloads one at a time, as the buttons did, until it gets there or nothing more fits */
function slideTo(el){
  const act = el.dataset.act, k = el.dataset.k, want = +el.value, fake = {dataset:{k}};
  for (let n = slideValue(act, k), guard = 0; n !== want && guard < 200; guard++){
    fleetAct(act + (want > n ? '+' : '-'), fake, true); const m = slideValue(act, k); if (m === n) break; n = m;
  }
  const v = slideValue(act, k); el.value = v; el.dataset.v = v; const o = el.nextElementSibling; if (o) o.textContent = v;
}
/* Buttons in these sheets. Returns true when it handled the tap. */
function fleetAct(act, btn, quiet = false){
  if (sheetKind === 'ship'){
    const s = ships.find(q => q.id === sheetData.id); if (!s) return false;
    const P = s.port ? isl(s.port) : null, k = btn.dataset.k;
    if (act === 'auto'){ setAuto(s, !s.auto); return true; }
    if (act === 'halt'){ haltShip(s); toast(`${s.name} hält an.`, 1800, false); renderSheet(); return true; }
    if (act === 'homeship'){ homeShip(s); renderSheet(); return true; }
    if (act === 'dive'){ startDive(s); renderSheet(); return true; }
    if (act === 'undive'){ stopDive(s, 'Die Mannschaft hört auf.'); renderSheet(); return true; }
    if (act === 'pp+' && P && P.pop > SETTLE.keep && s.people < SHIPS[s.kind].people){ syncPeople(P); const q = nextSettler(P, s); if (q){ P.people.splice(P.people.indexOf(q), 1); (s.folk = s.folk || []).push(q); } s.people++; P.pop--; P.staff = null; syncWalkers(); }
    else if (act === 'pp-' && P && s.people > 0){ const q = (s.folk || []).pop(); if (q){ syncPeople(P); P.people.push(q); } s.people--; P.pop++; P.staff = null; syncWalkers(); }
    else if (act === 'life' && P && P.settled) toggleLife(s, P, k);
    else if (act === 'cg+' && P && (P.stock[k] || 0) > 0 && roomUsed(s) < SHIPS[s.kind].cap){ s.cargo[k] = (s.cargo[k] || 0) + 1; P.stock[k]--; }
    else if (act === 'cg-' && P && s.cargo[k] > 0 && (P.stock[k] || 0) < storeCap(P)){ s.cargo[k]--; if (!s.cargo[k]) delete s.cargo[k]; P.stock[k] = Math.min(storeCap(P), (P.stock[k] || 0) + 1); }
    else if (act === 'cgo' && P && P.settled && k && (P.stock[k] || 0) >= storeCap(P)){ toast(`Lager auf ${P.name} voll: ${GN[k]} passt nicht zurück. Unten: Über Bord werfen.`, 3000, false); return true; }
    else if (act === 'cgn' || act === 'cgo'){ const n = sheetData.step || 5; for (let i = 0; i < n; i++){ const before = s.cargo[k] || 0; fleetAct(act === 'cgn' ? 'cg+' : 'cg-', btn, true); if ((s.cargo[k] || 0) === before) break; } }   // a handful at a time, as in Anno
    else if (act === 'dump'){ if (!sheetData.dumpAsk){ sheetData = {...sheetData, dumpAsk:true}; renderSheet(); return true; }
      const was = giftText(s.cargo); s.cargo = {}; s.full = false; sheetData = {...sheetData, dumpAsk:false}; toast(`${was} über Bord geworfen.`, 2400, false); }
    else if (act === 'cstep'){ sheetData = {...sheetData, step:+btn.dataset.v}; renderSheet(); return true; }
    else if (act === 'unload') unloadAll(s);
    else if (act === 'shipmore' || act === 'shipless'){ sheetData = {...sheetData, mini:act === 'shipless'}; renderSheet(); measure(); return true; }
    else if (act === 'load' || act === 'fold'){ sheetData.load = act === 'load'; renderSheet(); measure(); return true; }
    else if (act === 'assign'){ assignRoute(s, +btn.dataset.r); }
    else if (act === 'unassign') unassign(s);
    else if (act === 'settle'){ settleFrom(s); closeSheet(); return true; }
    else if (act === 'gift') giveGift(s);
    else return false;
    if (!quiet){ updateHUD(); renderSheet(); save(); } return true;
  }
  if (sheetKind === 'route'){
    const r = routes[sheetData.r];
    if (act === 'route'){ sheetData = {...sheetData, r:+btn.dataset.r, pick:null}; }
    else if (act === 'assignS'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) assignRoute(s, sheetData.r); }
    else if (act === 'unassign'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) unassign(s); }
    else if (act === 'kp'){ const [key, k] = btn.dataset.k.split(':'), kp = (r.keep || (r.keep = {a:{}, b:{}}))[key] || (r.keep[key] = {}), cap = storeCap(isl(key === 'a' ? r.a : r.b)), n = ((kp[k] | 0) + 5) % (cap + 5 > 25 ? 25 : cap + 5); if (n) kp[k] = n; else delete kp[k]; }   // 0, 5, 10, 15, 20, then back to nothing
    else if (act === 'plopen'){ sheetData = {...sheetData, pick:btn.dataset.k}; }
    else if (act === 'pladd'){ sheetData = {...sheetData, pick:null};  const [key, k] = btn.dataset.k.split(':'), plan = r.plan[key] || (r.plan[key] = {}), on = ships.filter(q => q.own && q.route === sheetData.r), cap = on.length ? Math.max(...on.map(q => SHIPS[q.kind].cap)) : 24, left = cap - Object.values(plan).reduce((x, y) => x + y, 0); if (left > 0) plan[k] = Math.min(5, left); }
    else if (act === 'pl+' || act === 'pl-' || act === 'pl5'){ const [key, k] = btn.dataset.k.split(':'), plan = r.plan[key] || (r.plan[key] = {}), on = ships.filter(q => q.own && q.route === sheetData.r), cap = on.length ? Math.max(...on.map(q => SHIPS[q.kind].cap)) : 24, left = cap - Object.values(plan).reduce((x, y) => x + y, 0);
      const n = plan[k] || 0; plan[k] = act === 'pl-' ? Math.max(0, n - 1) : act === 'pl+' ? n + Math.min(1, Math.max(0, left)) : left <= 0 ? 0 : n + Math.min(5, left);   // + and − by one, a tap on the number by five (at the top it starts over)
      if (!plan[k]) delete plan[k]; }
    else return false;
    if (!quiet){ renderSheet(); save(); } return true;
  }
  if (sheetKind === 'fleet'){
    if (act === 'steer'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) steerShip(s); return true; }
    if (act === 'chain'){ openRoute(+btn.dataset.r); return true; }
    return false;
  }
  if (sheetKind === 'calendar' && act === 'rahui'){ declareRahui(isl(active)); renderSheet(); return true; }
  if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b) return false; const I = islOfB(b.id);
    if (act === 'yard'){ startYard(I, btn.dataset.k); renderSheet(); return true; }
    if (act === 'part'){ const id = btn.dataset.p, c = sheetData.fest; const i = c.indexOf(id); if (i >= 0) c.splice(i, 1); else c.push(id); renderSheet(); return true; }
    if (act === 'festival'){ holdFestival(I, sheetData.fest || []); return true; }
  }
  return false;
}
