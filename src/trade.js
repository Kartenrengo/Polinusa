'use strict';
/* ---------- the middle game: villages with a face, and trade between them. Each village chooses a strength (the potters, the
   fishers, the planters, the weavers or the navigators): its workplaces of that kind work a quarter faster, and the others
   want what it makes. When a village lacks something another village of yours makes (the mats of the master's house come
   from the atolls), the elders propose a trade chain, and a tap sets it up: a canoe in the harbour sails there, and goes
   to and fro by itself with the goods one village wants and the other gives. */
const STRENGTHS = {
  toepfer:{n:'Töpfer', ic:'toepfe', kinds:['toepfer', 'beil', 'klingen', 'kalkbrenner'], text:'Töpferei, Beilwerkstatt, Klingenschläger und Kalkbrenner arbeiten ein Viertel schneller.'},
  fischer:{n:'Fischer', ic:'fisch', kinds:['fisch', 'taucher', 'hakenmacher'], text:'Fischerhütten, Tauchplätze und Hakenschleifer arbeiten ein Viertel schneller.'},
  pflanzer:{n:'Pflanzer', ic:'nahrung', kinds:['ernte', 'taro', 'yams', 'pulaka', 'bananen', 'pansammler', 'pflanzer', 'harzer'], text:'Erntehaus und Felder arbeiten ein Viertel schneller.'},
  weberin:{n:'Weberinnen', ic:'matten', kinds:['flecht', 'schnur', 'weberin', 'malerin', 'klopf'], text:'Flechthütte, Seilerei, Weberei und Klopfhütte arbeiten ein Viertel schneller.'},
  navigator:{n:'Navigatoren', ic:'plejaden', kinds:['sternhaus'], text:'Wer im Haus der Navigatoren lernt, lernt anderthalbmal so schnell.'}
};
const STRENGTH_PAUSE = 2 * YEAR, STRENGTH_BONUS = 1.25;   // a village may change its strength every two years
const strengthF = (I, b) => I.str && STRENGTHS[I.str] && STRENGTHS[I.str].kinds.includes(b.kind) && b.kind !== 'sternhaus' ? STRENGTH_BONUS : 1;
const strengthWait = I => Math.max(0, (I.strAt || 0) + STRENGTH_PAUSE - tick);
function setStrength(I, k){
  if (!I || !STRENGTHS[k] || I.str === k) return false;
  if (I.str && strengthWait(I) > 0){ toast(`${I.name}: Die Stärke ändert sich frühestens in ${Math.ceil(strengthWait(I) / MOON)} Monden.`, 3200, false); return false; }
  I.str = k; I.strAt = tick; I.staff = null; stats.staerke = (stats.staerke || 0) + 1; mana += 1;
  toast(`${I.name} setzt auf ${STRENGTHS[k].n}. ${STRENGTHS[k].text}`, 4200); updateHUD(); save(); return true;
}
/* the choice, as chips with the words under them */
function strengthMarkup(I){
  const cur = I.str && STRENGTHS[I.str], wait = strengthWait(I);
  return `<p class="sec">Stärke des Dorfes</p><div class="strength" role="group" aria-label="Stärke wählen">${Object.entries(STRENGTHS).map(([k, S]) => `<button class="chip str${I.str === k ? ' on' : ''}" type="button" data-act="strength" data-k="${k}" aria-pressed="${I.str === k}">${icon(S.ic)}<small>${S.n}</small></button>`).join('')}</div>` +
    `<p class="sub">${cur ? `${cur.text}${wait > 0 ? ` Wechseln geht in ${Math.ceil(wait / MOON)} Monden wieder.` : ''}` : 'Jedes Dorf wird in etwas besonders gut. Wählt eine Stärke: Das Dorf wird dafür bekannt, und andere Dörfer wollen, was es macht.'}</p>`;
}

/* ---------- trade chains on a tap */
const goodsMadeOn = (J, k) => (J.stock[k] || 0) >= 3 || canMakeOn(J, k);
/* another village of yours that has or makes this good */
function tradeIdea(I, k){
  const J = islands.filter(q => q.settled && q.id !== I.id && goodsMadeOn(q, k)).sort((a, b) => (b.stock[k] || 0) - (a.stock[k] || 0) || Math.hypot(a.center.x - I.center.x, a.center.y - I.center.y) - Math.hypot(b.center.x - I.center.x, b.center.y - I.center.y))[0];
  return J || null;
}
const GIFT_GOODS = ['holz', 'dach', 'schnur', 'faser', 'toepfe', 'beile', 'klingen', 'kalk', 'tapa', 'oel', 'muschel', 'nahrung', 'fisch'];
/* what the village gives in return: a good it has in plenty and the other has not */
function tradeGive(I, J, k){
  const cap = storeCap(I);
  return Object.fromEntries(GIFT_GOODS.filter(g => g !== k && (I.stock[g] || 0) >= Math.max(10, cap * .5) && (J.stock[g] || 0) < Math.max(8, storeCap(J) * .4)).sort((a, b) => (I.stock[b] || 0) - (I.stock[a] || 0)).slice(0, 2).map(g => [g, 4]));
}
const tradeShip = (I, J) => ships.filter(s => s.own && s.state !== 'sail' && (s.port === I.id || s.port === J.id) && s.route == null && !s.diving && !s.immig).sort((a, b) => SHIPS[b.kind].cap - SHIPS[a.kind].cap)[0] || null;
/* the chain between two of your villages: what is loaded where */
function setTradePlan(I, J, k, ri){
  const r = routes[ri], iSide = r.a === I.id ? 'a' : 'b', jSide = iSide === 'a' ? 'b' : 'a', ship = tradeShip(I, J), cap = ship ? SHIPS[ship.kind].cap : 12, give = tradeGive(I, J, k);
  r.plan[jSide] = {...r.plan[jSide], [k]:Math.max(4, Math.min(10, cap - 4))}; r.plan[iSide] = {...r.plan[iSide], ...give};   // the plan of a side is what is loaded there; what the player set before stays
  return give;
}
function startTrade(I, k, J){
  J = J || tradeIdea(I, k); if (!J){ toast(`${GN[k]}: Kein anderes Dorf macht es.`, 2800, false); return false; }
  const s = tradeShip(I, J); if (!s){ toast(`Für den Handel mit ${J.name} braucht es ein Kanu im Hafen. Baut eines im Kanuhaus.`, 3800, false); setBar('fleet'); return false; }
  const ri = routeIndex(I.id, J.id);
  if (ri < 0){   // the first voyage makes the cord; then the chain is set up by itself (see tradeArrive)
    if (s.port !== I.id) { toast(`${s.name} liegt in ${isl(s.port).name}. Es muss erst nach ${I.name}.`, 3200, false); return false; }
    s.last = I.id; s.tradeWant = {k, I:I.id, J:J.id};
    if (!sailTo(s, {isl:J.id})){ s.tradeWant = null; return false; }
    toast(`${s.name} fährt nach ${J.name}, um ${GN[k]} zu holen. Danach fährt es von selbst hin und her.`, 4200); return true;
  }
  const give = setTradePlan(I, J, k, ri); assignRoute(s, ri); stats.handelskette = (stats.handelskette || 0) + 1;
  toast(`${s.name} fährt zwischen ${I.name} und ${J.name}: bringt ${GN[k]}${Object.keys(give).length ? `, nimmt ${giftText(give)} mit` : ''}.`, 4800); updateHUD(); save(); return true;
}
/* the first voyage is over and the cord is there: set up the chain */
function tradeArrive(s){
  const w = s.tradeWant; s.tradeWant = null; const I = isl(w.I), J = isl(w.J); if (!I || !J) return false;
  const ri = routeIndex(I.id, J.id); if (ri < 0 || s.port !== J.id) return false;
  const give = setTradePlan(I, J, w.k, ri); assignRoute(s, ri); stats.handelskette = (stats.handelskette || 0) + 1;
  toast(`${s.name} fährt jetzt zwischen ${I.name} und ${J.name}: bringt ${GN[w.k]}${Object.keys(give).length ? `, nimmt ${giftText(give)} mit` : ''}.`, 4800); return true;
}
