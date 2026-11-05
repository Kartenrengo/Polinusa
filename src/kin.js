'use strict';
/* ---------- kin and newcomers. The Lapita colonists were small groups, often one canoe's people. What kept them alive was
   the net they stayed bound to: canoes went back and forth between the villages and the old islands in the west, with
   obsidian, pots and people, a lifeline as the archaeologist Patrick Kirch called it. Islands within sailing reach married
   into each other for generations, and newcomers from elsewhere were taken in. So here every person belongs to a line
   (p.ln), the line of the mother. A family that comes by canoe from far away brings a new line, so does someone who
   marries in from a clan. Children are born more seldom where all are close kin, and some are weak. */
let nextLine = 1, LINES = {};   // LINES: the name a line is known by and where it came from
const newLine = (n, from) => { const id = nextLine++; if (n) LINES[id] = {n, from}; return id; };
const lineName = id => typeof id === 'string' && id[0] === 'c' ? (isl(id.slice(1)) && isl(id.slice(1)).clan ? isl(id.slice(1)).clan.name : 'ein Clan') : LINES[id] ? LINES[id].n : 'die Ahnen';
const lineFrom = id => typeof id === 'string' && id[0] === 'c' ? (isl(id.slice(1)) ? isl(id.slice(1)).name : '') : LINES[id] ? LINES[id].from || '' : '';
/* the lines on an island, the biggest first */
function linesOf(I){
  const m = new Map(); for (const p of I.people || []){ const k = p.ln || 0; m.set(k, (m.get(k) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]);
}
/* how many lines there are in effect: four lines of the same size count 4, one big line and two tiny ones a little over 1 */
function kinDiv(I){ const P = I.people || []; if (!P.length) return 0; let s = 0; for (const [, n] of linesOf(I)) s += (n / P.length) ** 2; return 1 / s; }
const KIN_OK = 3, KIN_LOW = 2;
const kinState = I => { const d = kinDiv(I); return d >= KIN_OK - .05 ? 'ok' : d >= KIN_LOW - .05 ? 'low' : 'out'; };
const kinFactor = I => ({ok:1, low:.6, out:.25})[kinState(I)];
const kinWord = I => ({ok:'gesund', low:'eng verwandt', out:'zu nah verwandt'})[kinState(I)];
const linesWith = (I, n = 2) => linesOf(I).filter(([, c]) => c >= n).length;
/* a child of close kin is born weak: it lives, but not long */
function weakBirth(I, p){
  if (kinState(I) !== 'out' || Math.random() > .3) return;
  p.wk = 1; p.l = Math.round((22 + Math.random() * 12) * YEAR); stats.schwach = (stats.schwach || 0) + 1;
  if (!awayQuiet && I.id === active) note(`Das Kind ${p.n} ist schwach. Auf ${I.name} sind alle zu nah verwandt: Es braucht Familien aus anderen Linien.`);
}

/* ---------- newcomers by canoe. When a hut stands empty, the word goes along the cords: after a while a canoe comes from
   far away with a family that asks to stay. They bring food for the first days, sometimes cord or a pot, and now and
   then plants the village does not have yet. You take them in or send them on; whoever is not answered stays, as the
   custom of hospitality wants it. */
const ORIGINS = ['aus Mussau', 'von Emirau', 'aus Eloaua', 'von Watom', 'von den Inseln im Westen', 'von der Küste am Feuerberg', 'von einem Riff im Süden', 'aus dem Dorf eurer Ahnen'];
const IMMIG_GAP = 40, IMMIG_WAIT = 75;   // ticks at least between two canoes for one island; ticks a family waits for an answer
const emptyHome = I => homesOf(I).find(b => !famOfHome(I, b) && b.kind !== 'fale') || null;
function wantsSettlers(I){
  if (!I.settled || !I.people || I.pop >= islandMax(I) || roofless(I) || !emptyHome(I)) return false;
  const nd = needsOf(I); return !nd.missing.some(n => n.k === 'essen' || n.k === 'wasser');
}
const immigFor = I => ships.find(s => s.immig && s.to === I.id) || null;
function newImmig(I){
  const from = ORIGINS[Math.floor(Math.random() * ORIGINS.length)], fam = nextFam++;
  const w = person(I, 18 + Math.random() * 12, null, 'f'), P = [w];
  if (Math.random() < .9) P.push(person(I, 20 + Math.random() * 12, null, 'm'));
  const kids = Math.random() < .3 ? 0 : Math.random() < .6 ? 1 : 2;
  for (let i = 0; i < kids && P.length < 4; i++) P.push(person(I, Math.random() < .5 ? 1 + Math.random() * 4 : 7 + Math.random() * 6));
  const ln = newLine(w.n, from); for (const p of P){ p.h = fam; p.ln = ln; }
  const gift = {nahrung:2 + Math.floor(Math.random() * 4)}; if (Math.random() < .3) gift.schnur = 2; if (I.type === 'atoll' && Math.random() < .3) gift.toepfe = 1;
  const miss = LIFE_BASE.filter(id => lifeFits(I, id) && !lifeOf(I).includes(id)), life = miss.length && Math.random() < .5 ? [miss[Math.floor(Math.random() * miss.length)]] : [];
  return {from, people:P, gift, life, n:w.n};
}
/* where they come from: the far edge of the known sea, to the west, where the old islands lie */
function immigStart(I){
  const h = fogHoles.find(q => ((I.center.x - q.cx) / q.rx) ** 2 + ((I.center.y - q.cy) / q.ry) ** 2 < 1.2) || fogHoles[0];
  for (let k = 0; k < 24; k++){
    const a = Math.PI + (Math.random() - .5) * (1 + k * .15), p = {x:h.cx + Math.cos(a) * h.rx * .86, y:h.cy + Math.sin(a) * h.ry * .86};
    if (revealed(p) && !islands.some(J => J.box && p.x > J.box.x0 - 24 && p.x < J.box.x1 + 24 && p.y > J.box.y0 - 24 && p.y < J.box.y1 + 24) && !overLand(p, p, 8)) return p;
  }
  return {x:I.harbor.x - 260, y:I.harbor.y};
}
function immigTick(I){
  const s = immigFor(I);
  // a family that is not answered stays, by custom
  if (s){ if (s.state === 'moored' && s.askAt && tick - s.askAt > IMMIG_WAIT) immigAnswer(s, true, true); return; }
  if (tick < (I.immigAt || 0) || !wantsSettlers(I)) return;
  I.immigAt = tick + IMMIG_GAP;
  const F = newImmig(I);
  if (awayQuiet){ immigLand(I, F); return; }   // while you were away they came and stayed
  const from = immigStart(I), sh = {id:nextShip++, kind:'oc', own:false, immig:F, to:I.id, cargo:{}, life:[], people:F.people.length, folk:F.people, path:[], pi:0, state:'moored', x:from.x, y:from.y, hx:1, hy:0, dist:0, home:from};
  ships.push(sh);
  if (!sailTo(sh, {isl:I.id}, true)){ ships.splice(ships.indexOf(sh), 1); immigLand(I, F); return; }
  if (I.id === active) note(`Ein Kanu ${F.from} hält auf ${I.name} zu. Eine Familie sucht ein Zuhause.`);
}
function immigArrive(s){
  const I = isl(s.to); if (!I){ ships.splice(ships.indexOf(s), 1); return; }
  s.state = 'moored'; s.port = I.id; const m = moorSpot(I, s); s.x = m.x; s.y = m.y; s.askAt = tick;
  if (!wantsSettlers(I)){ immigLeave(s); if (I.id === active && !awayQuiet) note(`Die Familie ${s.immig ? s.immig.from : ''} fand keinen Platz mehr auf ${I.name} und fährt weiter.`); return; }
  const F = s.immig, msg = `Ein Kanu ${F.from} legt an: Familie ${F.n}, ${F.people.length} Menschen, fragt, ob sie auf ${I.name} bleiben darf.`;
  note(msg); requestDraw();
  if (!awayQuiet){ sfx('shells'); if (!sheetKind && I.id === active) openSheet('immig', {ship:s.id}); else toast(msg + ' Tippe das Kanu an.', 5200); }
}
function immigAnswer(s, yes, custom = false){
  const I = isl(s.to), F = s.immig; if (!I || !F) return;
  if (yes) immigLand(I, F, custom); else { I.immigAt = tick + IMMIG_GAP * 2; if (!awayQuiet) toast(`Familie ${F.n} fährt weiter. Ein anderes Mal kommt wieder jemand.`, 3200, false); }
  immigLeave(s);
  if (sheetKind === 'immig') closeSheet();
}
function immigLand(I, F, custom = false){
  syncPeople(I); I.people.push(...F.people); I.pop += F.people.length;
  for (const [k, v] of Object.entries(F.gift)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + v);
  const fresh = F.life.length ? landLife(I, {life:F.life.slice()}, true) : [];
  stats.zuzug = (stats.zuzug || 0) + 1; if (lifeLog) lifeLog.came += F.people.length;
  syncPeople(I); I.staff = null; I.immigAt = tick + IMMIG_GAP; syncWalkers(); invalidate();
  const f = famsOf(I).find(q => F.people.some(p => p.h === q.id)), home = f && f.home && findB(f.home);
  if (!awayQuiet){ for (let i = 0; i < 4; i++) heartAt(I, home || undefined);
    if (I.id === active) toast(`${custom ? 'Nach dem Brauch der Gastfreundschaft bleibt' : 'Willkommen:'} Familie ${F.n} ${F.from}${custom ? '' : ' zieht ein'}. Sie bringen ${giftText(F.gift)}${fresh.length ? ` und ${andList(fresh.map(id => LIFE[id].s))}` : ''}. Eine neue Linie für ${I.name}.`, 5600);
    save(); checkQuest(); }
}
function immigLeave(s){
  s.immig = null; s.folk = []; s.people = 0; s.leaving = true; s.askAt = 0;
  if (!s.home || !sailTo(s, {x:s.home.x, y:s.home.y}, true)){ const i = ships.indexOf(s); if (i >= 0) ships.splice(i, 1); }
  requestDraw();
}
/* the sheet of a canoe that asks */
function immigMarkup(s){
  const F = s && s.immig, I = s && isl(s.to); if (!F || !I) return head('Fremdes Kanu', '') + '<p class="sub">Das Kanu ist weitergefahren.</p>';
  const nd = needsOf(I), fn = nd.list.find(n => n.k === 'essen'), left = Math.max(0, IMMIG_WAIT - (tick - (s.askAt || tick)));
  let h = head(`Familie ${F.n}`, `Ein Kanu ${F.from}`);
  h += `<p>${F.people.length} Menschen fragen, ob sie auf ${I.name} bleiben dürfen. Eine Hütte steht leer.</p>`;
  h += `<div class="folk">${F.people.map(p => `<span class="who chip">${p.s === 'm' ? '♂' : '♀'} ${p.n}<small>${Math.floor(ageOf(p))}${stageOf(p) === 'kid' ? ', Kind' : ''}</small></span>`).join('')}</div>`;
  h += `<p class="sub">Sie bringen ${giftText(F.gift)}${F.life.length ? ` und ${andList(F.life.map(id => LIFE[id].s))}` : ''}. Jeder Erwachsene ist eine Arbeitskraft, und sie sind von einer anderen Linie: Ihre Kinder machen das Dorf gesünder.${fn && fn.make < fn.use + fn.work ? ' Bedenke: Schon jetzt wird mehr gegessen, als ihr erntet.' : ''}</p>`;
  h += `<p class="sub">Antwortet ihr nicht, bleiben sie nach dem Brauch der Gastfreundschaft, in etwa ${Math.ceil(left * TICK / 1000)} Sekunden.</p>`;
  return h + `<div class="rowx"><span></span><span class="chips"><button class="btn" type="button" data-act="immig" data-v="no">Weiterschicken</button><button class="btn primary" type="button" data-act="immig" data-v="yes">Aufnehmen</button></span></div>`;
}
/* the lines of an island in a few words, for the overview */
function kinText(I){
  const L = linesOf(I), d = kinDiv(I), st = kinState(I);
  const names = L.slice(0, 4).map(([id, n]) => { const f = lineFrom(id); return `${lineName(id)}${f ? ` ${/^(aus|von|vom) /.test(f) ? f : 'aus ' + f}` : ''} (${n})`; }).join(', ');
  const kids = homesOf(I).some(b => tierOf(b) >= 2);
  return {d, st, line:`${L.length} ${L.length === 1 ? 'Linie' : 'Linien'}: ${names}${L.length > 4 ? ' …' : ''}`,
    soft:!kids && st !== 'ok', help:st === 'ok' ? 'Genug Linien: Die Kinder kommen gesund zur Welt.' : !kids ? 'Für gesunde Kinder braucht es später Familien aus anderen Linien. Leere Hütten ziehen sie an.' : st === 'low' ? 'Eng verwandt: Kinder kommen seltener. Familien von weit her (eine leere Hütte zieht sie an) oder eine Hochzeit mit einem Clan bringen neues Blut.' : 'Zu nah verwandt: Kaum Kinder, und manche sind schwach. Baut Hütten für Familien von weit her, holt Leute von euren anderen Inseln oder verheiratet jemanden mit einem Clan.'};
}
