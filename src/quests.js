'use strict';
/* Guided start: one task at a time, shown above the build bar. Each finished task unlocks new buildings,
   so the build bar starts with just the house and grows with the village. */

const START_KINDS = ['haus'];
const count = (id, kind) => isl(id).buildings.filter(b => b.kind === kind).length;
const newLand = () => islands.filter(I => I.discovered && I.id !== 'heimat' && I.id !== 'tochter').length;
const stockOf = (id, k) => isl(id).stock[k] || 0;
/* n() counts progress towards of. show says where "Zeig es mir" leads: a build button, a building's sheet or a trade. */
const QUESTS = [
  {id:'dach', t:'Ein Dach für alle', d:'Baue 2 Häuser.', why:'Im Versammlungshaus ist nur Platz für wenige Familien. Jedes Haus gibt 4 Menschen ein Zuhause.',
    n:() => count('heimat', 'haus'), of:2, show:{build:'haus'}, unlock:['taro'], gift:{holz:3}},
  {id:'essen', t:'Essen anbauen', d:'Lege 2 Tarofelder an.', why:'Jeder Mensch isst. Solange Essen im Lager liegt und Platz in den Häusern ist, ziehen neue Leute zu.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:['baum', 'palme'], gift:{nahrung:4}},
  {id:'wachsen', t:'Das Dorf wächst', d:'Erreiche 15 Bewohner.', why:'Neue Menschen kommen von allein, wenn Häuser frei sind und das Essen reicht. Tippe oben auf die Bewohnerzahl, dann siehst du, was fehlt.',
    n:() => isl('heimat').pop, of:15, show:{build:'haus'}, unlock:['speicher', 'toepfer'], gift:{holz:4}},
  {id:'ton', t:'Ton und Feuer', d:'Baue eine Töpferei am Ton.', why:'Ton liegt am Bach. Die Töpferei formt ihn zu Töpfen und brennt sie mit Holz. Ab 20 Bewohnern braucht jede Familie Töpfe.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:['beil', 'pfahl'], gift:{}},
  {id:'beile', t:'Steinbeile', d:'Baue eine Beilwerkstatt am Felsen.', why:'Aus dem grauen Basalt entstehen Steinbeile. Ohne sie lässt sich kein Stamm für ein Kanu aushöhlen.',
    n:() => count('heimat', 'beil'), of:1, show:{build:'beil'}, unlock:['werft'], gift:{holz:4}},
  {id:'wasser', t:'Ans Wasser', d:'Baue ein Kanuhaus am Strand.', why:'Im Kanuhaus entstehen die Boote. Es muss direkt am Strand stehen.',
    n:() => count('heimat', 'werft'), of:1, show:{build:'werft'}, unlock:[], gift:{holz:4, nahrung:4}},
  {id:'motu', t:'Hinüber nach Motu', d:'Schick Siedler im Auslegerkanu nach Motu.', why:'Auf dem Atoll wachsen Pandanus und Kokospalmen. Daraus entstehen Matten für die Segel und Schnur für das große Kanu.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:['fisch', 'flecht', 'schnur', 'pandanus', 'halle'], gift:{}},
  {id:'segel', t:'Segel und Schnur', d:'Baue auf Motu eine Flechthütte und eine Seilerei.', why:'Die Flechthütte braucht Pandanus in der Nähe, die Seilerei Kokospalmen. Beim Bauen siehst du, ob genug da sind.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, show:{island:'tochter', build:'flecht'}, unlock:[], gift:{holz:2}, giftTo:'tochter'},
  {id:'tausch', t:'Waren tauschen', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln und belade ein Kanu. Jede Fahrt knüpft einen Knoten, dann geht die nächste schneller.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{island:'tochter', trade:{matten:3, schnur:3}}, unlock:['gaergrube'], gift:{}},
  {id:'proviant', t:'Vorrat für die Reise', d:'Lagere 6 Proviant auf Panua.', why:'In der Gärgrube hält Brotfrucht monatelang. Auf dem offenen Meer isst die Mannschaft jeden Tag 2 Proviant.',
    n:() => stockOf('heimat', 'proviant'), of:6, show:{build:'gaergrube'}, unlock:[], gift:{}},
  {id:'kanu', t:'Das große Kanu', d:'Baue im Kanuhaus ein Doppelkanu.', why:'Nur das Doppelkanu trägt genug Menschen, Pflanzen und Tiere über das offene Meer.',
    n:() => isl('heimat').canoe || boats.some(b => b.exp) || newLand() ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'land', t:'Neues Land', d:'Finde mit dem Doppelkanu eine neue Insel.', why:'Wo Vögel über einer Wolke kreisen, liegt Land darunter. Vielleicht lebt dort schon jemand.',
    n:() => newLand(), of:1, show:{sheet:'werft'}, unlock:['garten', 'klopf', 'pferch', 'klingen', 'schmuck'], gift:{}},
  {id:'fest', t:'Ein Fest', d:'Feiere ein Fest im Versammlungshaus.', why:'Feste bringen Ansehen. Mit Ansehen folgen dir Siedler auf weitere Fahrten, und ein Dorf kann Häuptlingsdorf werden.',
    n:() => islands.some(I => I.feastAt > 0) ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}},
  {id:'chief', t:'Ein Häuptlingsdorf', d:'Mach ein Dorf zum Häuptlingsdorf.', why:`Dafür braucht es ${CHIEF.pop} Bewohner, Ansehen ${CHIEF.mana}, genug Töpfe und Matten und dazu Tapa, Schweine und Muschelschmuck im Lager. Dann wohnen 6 Menschen in jedem Haus.`,
    n:() => islands.some(I => I.settled && I.lvl === 3) ? 1 : 0, of:1, show:{needs:true}, unlock:[], gift:{}}
];
const feastsOpen = () => quest >= QUESTS.findIndex(Q => Q.id === 'fest');
let quest = 0;               // index of the current task; QUESTS.length means all are done
const newKinds = new Set();  // unlocked but not yet tapped, they get a dot in the build bar

function unlocked(kind){
  if (quest >= QUESTS.length || START_KINDS.includes(kind)) return true;
  for (let i = 0; i < quest; i++) if (QUESTS[i].unlock.includes(kind)) return true;
  return false;
}
const giftText = g => Object.entries(g).map(([k, v]) => amount(k, v)).join(' und ');
function checkQuest(){
  let done = null;
  while (quest < QUESTS.length && QUESTS[quest].n() >= QUESTS[quest].of){
    const Q = QUESTS[quest++], I = isl(Q.giftTo || 'heimat');
    for (const [k, v] of Object.entries(Q.gift)) I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + v);
    for (const k of Q.unlock) newKinds.add(k);
    done = Q;
  }
  if (done){
    const kinds = done.unlock.map(k => KINDS[k].n), parts = [`Geschafft: ${done.t}.`];
    if (kinds.length) parts.push(`Neu zum Bauen: ${kinds.join(', ')}.`);
    if (Object.keys(done.gift).length) parts.push(`Dazu ${giftText(done.gift)}.`);
    if (quest >= QUESTS.length) parts.push('Jetzt steht dir alles offen.');
    toast(parts.join(' '), 4600); renderBuildBar(); save();
    const el = $('quest'); el.classList.remove('done'); void el.offsetWidth; el.classList.add('done');
  }
  renderQuest();
}
function renderQuest(){
  const el = $('quest'), show = quest < QUESTS.length && !sheetKind && mode !== 'place' && mode !== 'move';
  el.hidden = !show; if (!show) return;
  const Q = QUESTS[quest], n = clamp(Q.n(), 0, Q.of);
  el.querySelector('.q-n').textContent = `Aufgabe ${quest + 1} von ${QUESTS.length}`;
  el.querySelector('.q-t').textContent = Q.t;
  el.querySelector('.q-d').textContent = Q.d;
  el.querySelector('.q-p').textContent = `${n} von ${Q.of}`;
  el.querySelector('.q-bar i').style.width = (n / Q.of * 100) + '%';
  el.setAttribute('aria-label', `Aufgabe: ${Q.t}. ${Q.d} ${n} von ${Q.of}.`);
}
function questSheet(){
  const Q = QUESTS[quest]; if (!Q) return '';
  const n = clamp(Q.n(), 0, Q.of);
  return head(Q.t, `Aufgabe ${quest + 1} von ${QUESTS.length}`) +
    `<p><b>${Q.d}</b> Bisher ${n} von ${Q.of}.</p><p class="sub">${Q.why}</p>` +
    (Q.unlock.length ? `<p class="sub">Danach neu zum Bauen: ${Q.unlock.map(k => KINDS[k].n).join(', ')}.</p>` : '') +
    `<div class="rowx"><span></span><span class="chips"><button class="btn" type="button" data-act="close">Später</button><button class="btn primary" type="button" data-act="showq">Zeig es mir</button></span></div>`;
}
/* "Zeig es mir": go to the right island and point at the button or building that does the job */
function showQuest(){
  const Q = QUESTS[quest]; if (!Q) return;
  const s = Q.show, id = s.island || 'heimat', I = isl(id);
  closeSheet();
  if (s.sheet){ const b = isl('heimat').buildings.find(x => x.kind === s.sheet); if (b){ flyTo(b.x, b.y, Math.max(cam.z, 1.8)); select(b); return; } }
  if (s.needs){ openSheet('needs'); return; }
  if (s.trade){ const i = routes.findIndex(r => r.a === id || r.b === id); if (i >= 0){ setActive(id); openTrade(i, Object.fromEntries(Object.entries(s.trade).map(([k, v]) => [k, Math.min(v, stockOf(id, k))]))); return; } }
  if (I.settled) setActive(id);
  if (lod === 'far' || !boxIn(I.box, view())) fitBox(I.box, 1.6);
  if (s.build) hintBuild(s.build);
}
function hintBuild(kind){
  const b = $('buildList').querySelector(`[data-kind="${kind}"]`); if (!b) return;
  b.classList.remove('hint'); void b.offsetWidth; b.classList.add('hint');
  b.scrollIntoView({inline:'center', block:'nearest', behavior:reduced ? 'auto' : 'smooth'});
  setTimeout(() => b.classList.remove('hint'), 4200);
}
$('quest').addEventListener('click', () => openSheet('quest'));
