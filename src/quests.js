'use strict';
/* Guided start: one task at a time, shown above the build bar. Each finished task unlocks new buildings,
   so the build bar starts with just the house and grows with the village. */

const START_KINDS = ['haus', 'faeller'];
// only what is finished counts; building sites and young plants do not
const count = (id, kind) => isl(id).buildings.filter(b => b.kind === kind && !b.bt).length;
const newLand = () => islands.filter(I => I.discovered && I.id !== 'heimat' && I.id !== 'tochter').length;
const stockOf = (id, k) => isl(id).stock[k] || 0;
const fleetOf = kind => own().filter(s => s.kind === kind).length;
/* n() counts progress towards of. show says where "Zeig es mir" leads: a build button, a building's sheet, a canoe, a trade chain or the calendar. */
const QUESTS = [
  {id:'holz', t:'Holz schlagen', d:'Baue einen Holzfäller am Waldrand.', why:'Alles wird aus Holz gebaut. Der Holzfäller fällt die Bäume in seiner Nähe, einen nach dem anderen. Jeder Baum gibt 3 Holz, dann bleibt ein Stumpf, der erst nach langer Zeit wieder austreibt.',
    n:() => count('heimat', 'faeller'), of:1, show:{build:'faeller'}, unlock:[], gift:{holz:2}},
  {id:'dach', t:'Ein Dach für alle', d:'Baue 2 Häuser.', why:'Im Versammlungshaus ist nur Platz für wenige Familien. Jedes Haus gibt 4 Menschen ein Zuhause. An jeder Baustelle arbeiten 2 Leute. Erst holen sie das Holz aus dem Lager, dann bauen sie. Solange fehlen sie anderswo.',
    n:() => count('heimat', 'haus'), of:2, show:{build:'haus'}, unlock:['taro'], gift:{holz:3}},
  {id:'essen', t:'Essen anbauen', d:'Lege 2 Tarofelder an.', why:'Jeder Mensch isst. Taro, Brotfrucht und Fisch zählen alle als Nahrung. Solange Nahrung im Lager liegt und Platz in den Häusern ist, ziehen neue Leute zu.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:['baum', 'palme', 'fisch'], gift:{nahrung:4}},
  {id:'fang', t:'Fisch aus der Lagune', d:'Baue ein Fischgestell am Strand.', why:'Zu jeder Mahlzeit gehört etwas aus dem Meer, auf Fidschi sagt man dazu i coi. Ab 10 Bewohnern wollen die Familien Fisch zu Taro und Brotfrucht. Ohne Kanu kein Fischfang: Ist das Gestell fertig, schnitzt der Fischer zuerst seinen Einbaum.',
    n:() => count('heimat', 'fisch'), of:1, show:{build:'fisch'}, unlock:[], gift:{holz:2}},
  {id:'wachsen', t:'Das Dorf wächst', d:'Erreiche 15 Bewohner.', why:'Neue Menschen kommen von allein, wenn Häuser frei sind und die Nahrung reicht. Tippe oben auf die Bewohnerzahl, dann siehst du, was fehlt. Je 10 Bewohner kann an einer Baustelle mehr gearbeitet werden.',
    n:() => isl('heimat').pop, of:15, show:{build:'haus'}, unlock:['speicher', 'toepfer', 'pflanzer'], gift:{holz:4}},
  {id:'wald', t:'Der Wald wächst nach', d:'Baue einen Baumpflanzer am Wald.', why:'Gefällte Bäume treiben von selbst erst nach acht Minuten wieder aus. Der Pflanzer setzt sofort junge Bäume auf die Stümpfe und an den Waldrand. Aber bedenke: Wo Bäume stehen, kann nichts gebaut werden.',
    n:() => count('heimat', 'pflanzer'), of:1, show:{build:'pflanzer'}, unlock:[], gift:{}},
  {id:'ton', t:'Ton und Feuer', d:'Baue eine Töpferei am Ton.', why:'Ton liegt am Bach. Die Töpferei formt ihn zu Töpfen und brennt sie mit Holz. Ab 20 Bewohnern braucht jede Familie Töpfe.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:['beil', 'riff', 'pfahl', 'steg'], gift:{}},
  {id:'riff', t:'Schätze vom Riff', d:'Baue einen Riffsammler am Strand.', why:'Bei Ebbe sammeln sie am Riff Muscheln, Krebse, Seeigel und Tintenfisch. Ab 25 Bewohnern gehören Meeresfrüchte auf den Tisch.',
    n:() => count('heimat', 'riff'), of:1, show:{build:'riff'}, unlock:[], gift:{}},
  {id:'lagune', t:'Leben auf dem Wasser', d:'Baue einen Kanusteg und ein Pfahlhaus.', why:'Pfahlhäuser stehen in der Lagune und brauchen kein Land, das Wald und Felder brauchen. Ein Einbaum vom Kanusteg bringt die Leute hin und her, sobald er geschnitzt ist. Jeder Steg reicht für 4 Pfahlhäuser.',
    n:() => Math.min(1, count('heimat', 'steg')) + Math.min(1, isl('heimat').buildings.filter(b => b.kind === 'pfahl' && !b.bt && !unserved(isl('heimat'), b)).length), of:2, show:{build:'steg'}, unlock:['taucher'], gift:{holz:3}},
  {id:'beile', t:'Steinbeile', d:'Baue eine Beilwerkstatt am Felsen.', why:'Aus dem grauen Basalt entstehen Steinbeile. Ohne sie lässt sich kein Stamm für ein Kanu aushöhlen.',
    n:() => count('heimat', 'beil'), of:1, show:{build:'beil'}, unlock:['werft'], gift:{holz:4}},
  {id:'wasser', t:'Ans Wasser', d:'Baue ein Kanuhaus am Strand.', why:'Im Kanuhaus entstehen die Boote. Es muss direkt am Strand stehen.',
    n:() => count('heimat', 'werft'), of:1, show:{build:'werft'}, unlock:['hibiskus', 'blumen', 'fackel'], gift:{holz:4, nahrung:4}},
  {id:'ausleger', t:'Ein Auslegerkanu', d:'Baue im Kanuhaus ein Auslegerkanu.', why:'Ein Kanu braucht seine Zeit: Drei Bauleute holen das Holz und bauen dann etwa zweieinhalb Minuten. Tippe das Kanuhaus an und sieh zu, wie aus dem Stamm ein Kanu wird. Solange kannst du das Dorf mit Blumen, Muschelwegen und Fackeln schmücken.',
    n:() => fleetOf('oc') || isl('tochter').settled ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'motu', t:'Hinüber nach Motu', d:'Fahre 4 Siedler nach Motu und gründe ein Dorf.', why:'Tippe das Kanu im Hafen an. Lade 4 Siedler, Holz und Nahrung ein. Dann tippe auf Motu, und das Kanu fährt hinüber. Auf dem Atoll wachsen Pandanus und Kokospalmen für Segel und Schnur.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{ship:'oc'}, unlock:['pulaka', 'flecht', 'schnur', 'pandanus', 'halle'], gift:{}},
  {id:'segel', t:'Segel und Schnur', d:'Baue auf Motu eine Flechthütte und eine Seilerei.', why:'Die Flechthütte braucht Pandanus in der Nähe, die Seilerei Kokospalmen. Beim Bauen siehst du, ob genug da sind. Holz kommt von Panua. Pulakagruben in der Mitte des Motus und ein Fischgestell geben Nahrung.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, show:{island:'tochter', build:'flecht'}, unlock:[], gift:{holz:2}, giftTo:'tochter'},
  {id:'tausch', t:'Eine Handelskette', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln. Setze ein Kanu in die Kette und stell ein, was es in jede Richtung mitnimmt. Dann fährt es von allein hin und her. Jede Fahrt knüpft einen Knoten.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{route:'tochter'}, unlock:['gaergrube'], gift:{}},
  {id:'proviant', t:'Vorrat für die Reise', d:'Lagere 6 Proviant auf Panua.', why:'Proviant entsteht in der Gärgrube: Brotfrucht gärt unter Bananenblättern und hält monatelang. Ins Unbekannte nimmt das Doppelkanu nur Proviant mit, die Mannschaft isst jeden Reisetag 1.',
    n:() => stockOf('heimat', 'proviant'), of:6, show:{build:'gaergrube'}, unlock:['dc', 'pfosten'], gift:{}},
  {id:'kanu', t:'Das große Kanu', d:'Baue im Kanuhaus ein Doppelkanu.', why:'Nur das Doppelkanu trägt genug Menschen, Pflanzen und Tiere über das offene Meer. Der Bau dauert etwa fünf Minuten, in fünf Schritten bis zum Mattensegel. Richte in der Zeit die Handelskette ein oder schmücke das Dorf.',
    n:() => fleetOf('dc') || newLand() ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'land', t:'Neues Land', d:'Fahre mit dem Doppelkanu in den Nebel und finde eine neue Insel.', why:'Niemand weiß, was im Nebel liegt. Lade Proviant ein, tippe das Kanu an und dann auf den Nebel. Wo das Kanu fährt, lichtet sich der Nebel.',
    n:() => newLand(), of:1, show:{ship:'dc'}, unlock:['garten', 'klopf', 'pferch', 'klingen', 'schmuck', 'kavagarten', 'trommel', 'tanzplatz'], gift:{}},
  {id:'fest', t:'Ein Fest', d:'Feiere ein Fest im Versammlungshaus.', why:'Feste bringen Ansehen. Mit Ansehen folgen dir Siedler auf weitere Fahrten, und ein Dorf kann Häuptlingsdorf werden.',
    n:() => islands.some(I => I.feastAt > 0) ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:['ahnenhaus'], gift:{}},
  {id:'plejaden', t:'Das Fest der Plejaden', d:() => festivalTime() ? 'Jetzt ist Festzeit. Feiere das Fest der ersten Früchte.' : `Feiere das Fest der ersten Früchte. Die Plejaden erscheinen in etwa ${minutes(untilFestival())} Minuten.`,
    why:'Wenn die Plejaden nach Sonnenuntergang aufgehen, beginnt das neue Jahr. Die ersten Früchte gehören den Ahnen. Mit Kava, Tanz zur Schlitztrommel und einem Kanurennen wird das Fest größer, und befreundete Clans kommen zu Besuch.',
    n:() => islands.some(I => I.festYear != null) ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}},
  {id:'chief', t:'Ein Häuptlingsdorf', d:'Mach ein Dorf zum Häuptlingsdorf.', why:`Dafür braucht es ${CHIEF.pop} Bewohner, Ansehen ${CHIEF.mana}, Schönheit ${CHIEF.beauty}, genug Töpfe, Matten und Meeresfrüchte und dazu Tapa, Schweine, Kava und Muschelschmuck im Lager. Dann wohnen 6 Menschen in jedem Haus.`,
    n:() => islands.some(I => I.settled && I.lvl === 3) ? 1 : 0, of:1, show:{needs:true}, unlock:[], gift:{}},
  {id:'netz', t:'Das Lapita-Netz', d:'Verbinde 4 eigene Dörfer und 2 Clans mit mindestens 4 Knoten.', why:'So breitete sich die Lapita-Kultur aus: Dörfer auf vielen Inseln, verbunden durch Fahrten, Gaben und Feste. Ist das Netz geknüpft, ruft die Ferne: Im Osten, jenseits der Weiten See, liegen neue Inseln.',
    n:() => Math.min(4, islands.filter(I => I.settled).length) + Math.min(2, routes.filter(r => (isl(r.a).clan || isl(r.b).clan) && r.knots >= 4).length), of:6, show:{fleet:true}, unlock:[], gift:{}},
  // the great voyage: across the Weite See to the Ferne Inseln, their treasures, and the greatest feast
  {id:'weite', t:'Die Weite See', d:'Finde mit dem Doppelkanu Land jenseits der Weiten See im Osten.', why:'Östlich der Heimat liegen Tage offener See. So fuhren die Lapita vor dreitausend Jahren bis Fidschi, Tonga und Samoa. Nur das Doppelkanu schafft es, mit reichlich Proviant: hinüber etwa 12. Mitten in der Weiten See liegt Tifa mit seinen Perlmuscheln, ein Halt auf halbem Weg. „Erkunden lassen“ schickt das Kanu von selbst los, so weit der Proviant hin und zurück reicht; über die ganze Weite See steuerst du es selbst.',
    n:() => islands.some(I => I.discovered && I.center.x > FAR_X) ? 1 : 0, of:1, show:{ship:'dc'}, unlock:[], gift:{proviant:6}},
  {id:'schatz', t:'Schätze der Ferne', d:'Bring Perlmutt, rote Federn und einen Walzahn in ein eigenes Dorf.', why:'Die Schatzinseln Tifa, Kula und Tabua geben, was es nirgends sonst gibt. Leg mit einem Kanu dort an, dann sammelt die Mannschaft, ein wenig nach dem anderen; die Insel bringt es langsam wieder hervor. Schätze sind die besten Gaben für einen Clan.',
    n:() => TREASURE_GOODS.filter(k => islands.some(I => I.settled && (I.stock[k] || 0) > 0)).length, of:3, show:{fleet:true}, unlock:[], gift:{}},
  {id:'fern', t:'Ein Dorf in der Ferne', d:'Gründe ein Dorf auf den Fernen Inseln.', why:'Ins Unbekannte darf nur Proviant mit, also erst erkunden, dann siedeln: Siedler, Holz, Nahrung und Proviant für die Überfahrt aufs Doppelkanu, dann die gefundene Insel antippen.',
    n:() => islands.some(I => I.settled && I.center.x > FAR_X) ? 1 : 0, of:1, show:{ship:'dc'}, unlock:[], gift:{}},
  {id:'ahnen', t:'Das Fest der Schätze', d:'Feiere im Versammlungshaus das Fest der Schätze.', why:'Perlmutt, rote Federn, ein Walzahn und zwei Schweine: das größte Fest, das ein Clan geben kann. Die Ahnen sehen zu, und das Dorf wächst eine Weile doppelt so schnell.',
    n:() => stats.schatzfest ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}}
];
const dOf = Q => typeof Q.d === 'function' ? Q.d() : Q.d;
const unlockName = k => (KINDS[k] || SHIPS[k]).n;
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
    const kinds = done.unlock.map(unlockName), parts = [`Geschafft: ${done.t}.`];
    if (kinds.length) parts.push(`Neu zum Bauen: ${kinds.join(', ')}.`);
    if (Object.keys(done.gift).length) parts.push(`Dazu ${giftText(done.gift)}.`);
    if (quest >= QUESTS.length) parts.push('Jetzt steht dir alles offen.');
    if (done.id === 'ahnen') setTimeout(() => openSheet('finale'), 2600);
    toast(parts.join(' '), 4600); renderBuildBar(); save();
    const el = $('quest'); el.classList.remove('done'); void el.offsetWidth; el.classList.add('done'); sfx('quest');
  }
  renderQuest();
}
function renderQuest(){
  const el = $('quest'), show = quest < QUESTS.length && !sheetKind && mode !== 'place' && mode !== 'move';
  el.hidden = !show; if (!show) return;
  const Q = QUESTS[quest], n = clamp(Q.n(), 0, Q.of);
  el.querySelector('.q-n').textContent = `Aufgabe ${quest + 1} von ${QUESTS.length}`;
  el.querySelector('.q-t').textContent = Q.t;
  el.querySelector('.q-d').textContent = dOf(Q);
  el.querySelector('.q-p').textContent = `${n} von ${Q.of}`;
  el.querySelector('.q-bar i').style.width = (n / Q.of * 100) + '%';
  el.setAttribute('aria-label', `Aufgabe: ${Q.t}. ${dOf(Q)} ${n} von ${Q.of}.`);
}
function questSheet(){
  const Q = QUESTS[quest]; if (!Q) return '';
  const n = clamp(Q.n(), 0, Q.of);
  return head(Q.t, `Aufgabe ${quest + 1} von ${QUESTS.length}`) +
    `<p><b>${dOf(Q)}</b> Bisher ${n} von ${Q.of}.</p><p class="sub">${Q.why}</p>` +
    (Q.unlock.length ? `<p class="sub">Danach neu zum Bauen: ${Q.unlock.map(unlockName).join(', ')}.</p>` : '') +
    `<div class="rowx"><span></span><span class="chips"><button class="btn" type="button" data-act="close">Später</button><button class="btn primary" type="button" data-act="showq">Zeig es mir</button></span></div>`;
}
/* "Zeig es mir": go to the right island and point at the button or building that does the job */
function showQuest(){
  const Q = QUESTS[quest]; if (!Q) return;
  const s = Q.show, id = s.island || 'heimat', I = isl(id);
  closeSheet();
  if (s.ship){ const sh = own().find(q => q.kind === s.ship) || own()[0]; if (sh){ steerShip(sh); return; } }
  if (s.sheet || s.ship){ const b = isl('heimat').buildings.find(x => x.kind === (s.sheet || 'werft')); if (b){ flyTo(b.x, b.y, Math.max(cam.z, 1.8)); select(b); return; } }
  if (s.needs){ openSheet('needs'); return; }
  if (s.fleet){ openSheet('fleet'); return; }
  if (s.route){ const i = routes.findIndex(r => r.a === s.route || r.b === s.route); if (i >= 0){ const I2 = isl(s.route); flyTo(I2.harbor.x, I2.harbor.y, Math.min(cam.z, 1)); openRoute(i); return; } }
  if (I.settled) setActive(id);
  if (lod === 'far' || !boxIn(I.box, view())) fitBox(I.box, 1.6);
  if (s.build) hintBuild(s.build);
}
function hintBuild(kind){
  if (DECO.includes(kind) !== (buildTab === 'deco')){ buildTab = DECO.includes(kind) ? 'deco' : 'bau'; renderBuildBar(); }
  const b = $('buildList').querySelector(`[data-kind="${kind}"]`); if (!b) return;
  b.classList.remove('hint'); void b.offsetWidth; b.classList.add('hint');
  b.scrollIntoView({inline:'center', block:'nearest', behavior:reduced ? 'auto' : 'smooth'});
  setTimeout(() => b.classList.remove('hint'), 4200);
}
$('quest').addEventListener('click', () => openSheet('quest'));
