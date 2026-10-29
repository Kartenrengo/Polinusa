'use strict';
/* Guided start: one task at a time, shown above the build bar. Each finished task unlocks new buildings,
   so the build bar starts with just the house and grows with the village. */

const START_KINDS = ['haus'];
const count = (id, kind) => isl(id).buildings.filter(b => b.kind === kind).length;
const newLand = () => islands.filter(I => I.settled && I.id !== 'heimat' && I.id !== 'tochter').length;
const stockOf = (id, k) => isl(id).stock[k] || 0;
/* n() counts progress towards of. show says where "Zeig es mir" leads: a build button, the canoe house or a trade. */
const QUESTS = [
  {t:'Ein Dach für alle', d:'Baue 2 Häuser.', why:'Im Versammlungshaus ist nur Platz für wenige Familien. Jedes Haus gibt 4 Menschen ein Zuhause.',
    n:() => count('heimat', 'haus'), of:2, show:{build:'haus'}, unlock:['taro'], gift:{holz:3}},
  {t:'Essen anbauen', d:'Lege 2 Tarofelder an.', why:'Jeder Mensch isst. Solange Essen im Lager liegt und Platz in den Häusern ist, ziehen neue Leute zu.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:['baum', 'palme'], gift:{nahrung:4}},
  {t:'Das Dorf wächst', d:'Erreiche 15 Bewohner.', why:'Neue Menschen kommen von allein, wenn Häuser frei sind und das Essen reicht. Tippe oben auf die Bewohnerzahl, dann siehst du, was fehlt.',
    n:() => isl('heimat').pop, of:15, show:{build:'haus'}, unlock:['speicher', 'toepfer'], gift:{holz:4}},
  {t:'Ton und Feuer', d:'Baue eine Töpferei.', why:'Ton gibt es nur auf hohen Inseln. Die Siedler auf dem Atoll brauchen Töpfe für jedes Haus.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:['beil', 'pfahl'], gift:{}},
  {t:'Steinbeile', d:'Baue eine Beilwerkstatt.', why:'Ohne Steinbeile lässt sich kein Stamm für ein Kanu aushöhlen.',
    n:() => count('heimat', 'beil'), of:1, show:{build:'beil'}, unlock:['werft'], gift:{holz:4}},
  {t:'Ans Wasser', d:'Baue ein Kanuhaus am Strand.', why:'Im Kanuhaus entstehen die Boote. Es muss direkt am Strand stehen.',
    n:() => count('heimat', 'werft'), of:1, show:{build:'werft'}, unlock:[], gift:{holz:4, nahrung:4}},
  {t:'Hinüber nach Motu', d:'Schick Siedler im Auslegerkanu nach Motu.', why:'Auf dem Atoll wachsen Pandanus und Kokospalmen. Daraus entstehen Matten für die Segel und Schnur für das große Kanu.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{werft:true}, unlock:['fisch', 'flecht', 'schnur', 'halle'], gift:{}},
  {t:'Segel und Schnur', d:'Baue auf Motu eine Flechthütte und eine Seilerei.', why:'Die Flechthütte flicht Matten aus Pandanus, die Seilerei dreht Schnur aus Kokosfasern.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, show:{island:'tochter', build:'flecht'}, unlock:[], gift:{}, giftTo:'tochter'},
  {t:'Waren tauschen', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln und belade ein Kanu. Jede Fahrt knüpft einen Knoten, dann geht die nächste schneller.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{island:'tochter', trade:true}, unlock:[], gift:{}},
  {t:'Das große Kanu', d:'Baue im Kanuhaus ein Doppelkanu.', why:'Nur das Doppelkanu trägt genug Menschen, Pflanzen und Tiere über das offene Meer.',
    n:() => isl('heimat').canoe || boats.some(b => b.exp) || newLand() ? 1 : 0, of:1, show:{werft:true}, unlock:[], gift:{}},
  {t:'Neues Land', d:'Finde mit dem Doppelkanu eine neue Insel.', why:'Wo Vögel über einer Wolke kreisen, liegt Land darunter.',
    n:() => newLand(), of:1, show:{werft:true}, unlock:[], gift:{}}
];
let quest = 0;               // index of the current task; QUESTS.length means all are done
const newKinds = new Set();  // unlocked but not yet tapped, they get a dot in the build bar

function unlocked(kind){
  if (quest >= QUESTS.length || START_KINDS.includes(kind)) return true;
  for (let i = 0; i < quest; i++) if (QUESTS[i].unlock.includes(kind)) return true;
  return false;
}
const giftText = g => Object.entries(g).map(([k, v]) => `${v} ${v === 1 ? G1[k] : GN[k]}`).join(' und ');
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
  if (s.werft){ const b = isl('heimat').buildings.find(x => x.kind === 'werft'); if (b){ flyTo(b.x, b.y, Math.max(cam.z, 1.8)); select(b); return; } }
  if (s.trade){ const i = routes.findIndex(r => r.a === id || r.b === id); if (i >= 0){ setActive(id); openTrade(i, {matten:Math.min(3, stockOf(id, 'matten')), schnur:Math.min(3, stockOf(id, 'schnur'))}); return; } }
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
