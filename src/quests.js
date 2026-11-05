'use strict';
/* Guided start: one task at a time, shown above the build bar. Each finished task unlocks new buildings,
   so the build bar starts with just the house and grows with the village. */

const START_KINDS = ['haus', 'faeller', 'quelle', 'brunnen', 'regen', 'kletterer', 'deckerin', 'schnur'];   // roof, water and cord from the first day
// only what is finished counts; building sites and young plants do not
const count = (id, kind) => isl(id).buildings.filter(b => b.kind === kind && !b.bt).length;
const newLand = () => islands.filter(I => I.discovered && !I.start).length;   // the islands of the start waters do not count
const stockOf = (id, k) => isl(id).stock[k] || 0;
const fleetOf = kind => own().filter(s => s.kind === kind).length;
/* n() counts progress towards of. show says where "Zeig es mir" leads: a build button, a building's sheet, a canoe, a trade chain or the calendar. */
const QUESTS = [
  {id:'holz', t:'Holz schlagen', d:'Baue einen Holzfäller am Waldrand.', why:'Alles wird aus Holz gebaut. Jeder Baum gibt 3 Holz. Der Stumpf treibt erst spät wieder aus.',
    n:() => count('heimat', 'faeller'), of:1, show:{build:'faeller'}, unlock:[], gift:{holz:2}},
  {id:'dach', t:'Ein Dach für alle', d:'Baue 2 Häuser.', why:'Jedes Haus ist das Zuhause einer Familie. Wer kein Dach hat, schläft beim Versammlungshaus. An jeder Baustelle arbeiten 2 Leute.',
    n:() => count('heimat', 'haus'), of:2, show:{build:'haus'}, unlock:['taro'], gift:{holz:3}},
  {id:'essen', t:'Essen anbauen', d:'Lege 2 Tarofelder an.', why:'Taro, Brotfrucht, Fisch und Kokos zählen alle als Nahrung. Mit Nahrung und freien Häusern ziehen Leute zu.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:['baum', 'palme', 'fisch', 'kurkumagarten', 'huehnerhof'], gift:{nahrung:4}},
  {id:'trinken', t:'Wasser holen', d:'Baue eine Quelle am Bach oder einen Regenfang.', why:'Jeder Mensch braucht Wasser. Ohne Wasser wächst niemand zu, und bald ziehen Leute fort.',
    n:() => count('heimat', 'quelle') + count('heimat', 'regen') + count('heimat', 'brunnen'), of:1, get show(){ return {build:isl('heimat') && isl('heimat').river ? 'quelle' : 'regen'}; }, unlock:[], gift:{wasser:6}},
  {id:'familien', t:'Familien verteilen', d:'Lass 3 Familien an Arbeitsplätzen arbeiten.', why:'Eine Familie arbeitet an einem Ort. Tippe oben auf die Bewohnerzahl: Dort steht, wo jede Familie arbeitet. Auf jedem Arbeitsplatz schickst du mit + eine Familie hin.',
    n:() => Math.min(3, famsOf(isl('heimat')).filter(f => f.job).length), of:3, show:{needs:true}, unlock:[], gift:{nahrung:4}},
  {id:'sennit', t:'Dach und Schnur', d:'Baue Palmenkletterer, Dachflechterin und Seilerei.', why:'Häuser werden ohne Nägel gebaut: Dachdeckung aus Wedeln, gebunden mit Sennit aus Kokosfasern. Der Kletterer bringt die Fasern.',
    n:() => Math.min(1, count('heimat', 'kletterer')) + Math.min(1, count('heimat', 'deckerin')) + Math.min(1, count('heimat', 'schnur')), of:3, show:{build:'kletterer'}, unlock:[], gift:{dach:2, schnur:2}},
  {id:'fang', t:'Fisch aus der Lagune', d:'Baue ein Fischgestell am Strand.', why:'Ab 10 Bewohnern wollen die Familien Fisch. Der Fischer schnitzt zuerst seinen Einbaum.',
    n:() => count('heimat', 'fisch'), of:1, show:{build:'fisch'}, unlock:['kletterer'], gift:{holz:2}},
  {id:'wachsen', t:'Das Dorf wächst', d:'Erreiche 25 Bewohner.', why:'Leute kommen, wenn Häuser frei sind und die Nahrung reicht. Tippe oben auf die Bewohnerzahl: Dort steht, was fehlt.',
    n:() => isl('heimat').pop, of:25, show:{build:'haus'}, unlock:['speicher', 'toepfer', 'pflanzer'], gift:{holz:4}},
  {id:'wald', t:'Der Wald wächst nach', d:'Baue einen Baumpflanzer am Wald.', why:'Der Pflanzer setzt junge Bäume auf die Stümpfe. Wo Bäume stehen, kann nichts gebaut werden.',
    n:() => count('heimat', 'pflanzer'), of:1, show:{build:'pflanzer'}, unlock:[], gift:{}},
  {id:'ton', t:'Ton und Feuer', d:'Baue eine Töpferei am Ton.', why:'Ab 20 Bewohnern braucht jede Familie Töpfe. Jede Töpferei stempelt ihr eigenes Muster.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:['beil', 'riff', 'pfahl', 'steg', 'umu', 'kalkbrenner'], gift:{}},
  {id:'umu', t:'Der Erdofen', d:'Baue einen Erdofen.', why:'Heiße Steine, Blätter und Erde: so kochte man im ganzen Pazifik. Gekochtes brauchen die Familien der Tufunga.',
    n:() => count('heimat', 'umu'), of:1, show:{build:'umu'}, unlock:[], gift:{steine:3}},
  {id:'riff', t:'Schätze vom Riff', d:'Baue einen Riffsammler am Strand.', why:'Ab 25 Bewohnern gehören Meeresfrüchte auf den Tisch.',
    n:() => count('heimat', 'riff'), of:1, show:{build:'riff'}, unlock:[], gift:{}},
  {id:'lagune', t:'Leben auf dem Wasser', d:'Baue einen Kanusteg und ein Pfahlhaus.', why:'Pfahlhäuser brauchen kein Land. Ein Steg mit Einbaum reicht für 4 Pfahlhäuser.',
    n:() => Math.min(1, count('heimat', 'steg')) + Math.min(1, isl('heimat').buildings.filter(b => b.kind === 'pfahl' && !b.bt && !unserved(isl('heimat'), b)).length), of:2, show:{build:'steg'}, unlock:['taucher'], gift:{holz:3}},
  {id:'beile', t:'Steinbeile', d:'Baue eine Beilwerkstatt am Felsen.', why:'Ohne Steinbeile lässt sich kein Stamm für ein Kanu aushöhlen.',
    n:() => count('heimat', 'beil'), of:1, show:{build:'beil'}, unlock:['werft', 'harzer'], gift:{holz:4}},
  {id:'wasser', t:'Ans Wasser', d:'Baue ein Kanuhaus am Strand.', why:'Im Kanuhaus entstehen die Boote. Es steht am Strand.',
    n:() => count('heimat', 'werft'), of:1, show:{build:'werft'}, unlock:['hibiskus', 'blumen', 'fackel'], gift:{holz:4, nahrung:4}},
  {id:'ausleger', t:'Ein Auslegerkanu', d:'Baue im Kanuhaus ein Auslegerkanu.', why:'Drei Bauleute brauchen etwa zweieinhalb Minuten. Schmücke solange das Dorf.',
    n:() => fleetOf('oc') || isl('tochter').settled ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'motu', t:'Hinüber nach Motu', d:'Fahre 4 Siedler nach Motu und gründe ein Dorf.', why:'Siedler gehen als Familie. Tippe das Kanu an, lade Siedler, Holz, Wasser, Dachdeckung, Schnur und Taro-Setzlinge. Dann tippe auf Motu.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{ship:'oc'}, unlock:['pulaka', 'pansammler', 'flecht', 'pandanus', 'halle'], gift:{}},
  {id:'segel', t:'Segel und Schnur', d:'Baue auf Motu eine Flechthütte und eine Seilerei.', why:'Die Flechthütte braucht Pandanus, die Seilerei Kokospalmen in der Nähe. Holz kommt von Panua.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, show:{island:'tochter', build:'flecht'}, unlock:[], gift:{holz:2}, giftTo:'tochter'},
  {id:'tausch', t:'Eine Handelskette', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln. Setz ein Kanu in die Kette und wähle die Ladung. Jede Fahrt knüpft einen Knoten.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{route:'tochter'}, unlock:['gaergrube', 'oelhuette'], gift:{}},
  {id:'dorf', t:'Ein Dorf', d:`Erreiche ${VILLAGE_POP} Bewohner und eine Familie der Tufunga.`, why:'Mit Töpfen, Matten, Kokosöl und Gekochtem im Lager baut eine Familie ihr Haus aus. Mehr Platz, mehr Bedürfnisse.',
    n:() => Math.min(1, isl('heimat').pop >= VILLAGE_POP ? 1 : 0) + Math.min(1, tier2Pop(isl('heimat')) ? 1 : 0), of:2, show:{needs:true}, unlock:[], gift:{}},
  {id:'proviant', t:'Vorrat für die Reise', d:'Lagere 6 Proviant auf Panua.', why:'Proviant entsteht in der Gärgrube. Ins Unbekannte nimmt das Doppelkanu nur Proviant mit.',
    n:() => stockOf('heimat', 'proviant'), of:6, show:{build:'gaergrube'}, unlock:['dc', 'pfosten'], gift:{}},
  {id:'kanu', t:'Das große Kanu', d:'Baue im Kanuhaus ein Doppelkanu.', why:'Nur das Doppelkanu fährt über das offene Meer. Der Bau dauert etwa fünf Minuten. Neu: das Haus der Navigatoren.',
    n:() => fleetOf('dc') || newLand() ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:['sternhaus'], gift:{}},
  {id:'land', t:'Neues Land', d:'Fahre mit dem Doppelkanu in den Nebel und finde eine neue Insel.', why:'Lade Proviant, tippe das Kanu an und dann auf den Nebel. Neues Land hat noch keinen Taro und keine Schweine.',
    n:() => newLand(), of:1, show:{ship:'dc'}, unlock:['garten', 'klopf', 'pferch', 'klingen', 'schmuck', 'kavagarten', 'trommel', 'tanzplatz', 'weberin', 'malerin', 'duftoel'], gift:{}},
  {id:'fest', t:'Ein Fest', d:'Feiere ein Fest im Versammlungshaus.', why:'Feste bringen Ansehen. Ansehen holt Siedler und macht Häuptlingsdörfer.',
    n:() => islands.some(I => I.feastAt > 0) ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:['ahnenhaus', 'fale'], gift:{}},
  {id:'plejaden', t:'Das Fest der Plejaden', d:() => festivalTime() ? 'Jetzt ist Festzeit. Feiere das Fest der ersten Früchte.' : `Feiere das Fest der ersten Früchte. Die Plejaden erscheinen in etwa ${minutes(untilFestival())} Minuten.`,
    why:'Mit den Plejaden beginnt das Jahr. Kava, Tanz, Salbung und Kanurennen machen das Fest größer.',
    n:() => islands.some(I => I.festYear != null) ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}},
  {id:'chief', t:'Ein Häuptlingsdorf', d:'Mach ein Dorf zum Häuptlingsdorf.', why:`Baue ein Häuptlingshaus. Die Familie der Matriarchin zieht ein und will das Feinste. Die Übersicht zeigt jeden Schritt.`,
    n:() => islands.some(I => I.settled && I.lvl === 3) ? 1 : 0, of:1, show:{needs:true}, unlock:[], gift:{}},
  {id:'tauchen', t:'Tauchen', d:'Lass von einem Kanu aus tauchen und finde etwas.', why:'Wo Vögel über dem Meer kreisen, liegt etwas am Grund, oft unter Treibgut. Kanu hinfahren, „Tauchen lassen“. Zu viele Tauchgänge bringen Taravana.',
    n:() => stats.tauchfund ? 1 : 0, of:1, show:{fleet:true}, unlock:[], gift:{}},
  {id:'netz', t:'Das Lapita-Netz', d:'Verbinde 4 eigene Dörfer und 2 Clans mit mindestens 4 Knoten.', why:'Dörfer auf vielen Inseln, verbunden durch Fahrten und Gaben. Dann ruft der Osten.',
    n:() => Math.min(4, islands.filter(I => I.settled).length) + Math.min(2, routes.filter(r => (isl(r.a).clan || isl(r.b).clan) && r.knots >= 4).length), of:6, show:{fleet:true}, unlock:[], gift:{}},
  // the great voyage: across the Weite See to the Ferne Inseln, their treasures, and the greatest feast
  {id:'weite', t:'Die Weite See', d:'Finde mit dem Doppelkanu Land jenseits der Weiten See im Osten.', why:'Hinüber braucht das Doppelkanu etwa 12 Proviant. Tifa liegt auf halbem Weg. Navigatoren sparen Proviant.',
    n:() => islands.some(I => I.discovered && I.center.x > FAR_X) ? 1 : 0, of:1, show:{ship:'dc'}, unlock:[], gift:{proviant:6}},
  {id:'schatz', t:'Schätze der Ferne', d:'Bring Perlmutt, rote Federn und einen Walzahn in ein eigenes Dorf.', why:'Tifa, Kula und Tabua haben Schätze, die es sonst nirgends gibt. Leg dort an, die Mannschaft sammelt.',
    n:() => TREASURE_GOODS.filter(k => islands.some(I => I.settled && (I.stock[k] || 0) > 0)).length, of:3, show:{fleet:true}, unlock:[], gift:{}},
  {id:'fern', t:'Ein Dorf in der Ferne', d:'Gründe ein Dorf auf den Fernen Inseln.', why:'Erst erkunden, dann siedeln: Siedler, Holz, Nahrung und Proviant aufs Doppelkanu, dann die Insel antippen.',
    n:() => islands.some(I => I.settled && I.center.x > FAR_X) ? 1 : 0, of:1, show:{ship:'dc'}, unlock:[], gift:{}},
  {id:'ahnen', t:'Das Fest der Schätze', d:'Feiere im Versammlungshaus das Fest der Schätze.', why:'Das größte Fest. Danach wächst das Dorf eine Weile doppelt so schnell.',
    n:() => stats.schatzfest ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}},
  // at the edges of the sea: people who do not descend from your ancestors
  {id:'kultur', t:'Andere Menschen', d:'Findet ein Volk einer anderen Kultur und bringt ihm eine Gabe.', why:'Im Westen das Große Land, im Norden die Seefahrer. Bringt ihnen eine Gabe.',
    n:() => !cultureIsles(true).length ? 2 : Math.min(1, cultureIsles().length) + (cultureIsles().some(I => routes.some(r => (r.a === I.id || r.b === I.id) && (r.knots >= 1 || I.debt > 0))) ? 1 : 0), of:2, show:{ship:'dc'}, unlock:[], gift:{}}
];
/* the islands of other peoples: those found, or (all) those this world has at all */
const cultureIsles = all => all ? (home0 && home0.cultures || []) : islands.filter(I => I.clan && I.clan.culture && I.discovered);
/* the tasks name the home island and the first atoll as they are called now: chosen at the landing, or renamed */
const qn = t => t.replace(/\bPanua\b/g, isl('heimat').name).replace(/\bMotu\b/g, isl('tochter').name);
const dOf = Q => qn(typeof Q.d === 'function' ? Q.d() : Q.d);
const unlockName = k => (KINDS[k] || SHIPS[k]).n;
const feastsOpen = () => quest >= QUESTS.findIndex(Q => Q.id === 'fest');
let quest = 0;               // index of the current task; QUESTS.length means all are done
const newKinds = new Set();  // unlocked but not yet tapped, they get a dot in the build bar

function unlocked(kind){
  if (KINDS[kind] && KINDS[kind].life && LIFE[KINDS[kind].life].from) return lifeKnown(KINDS[kind].life);   // bananas come with another people, not with a task
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
    const kinds = done.unlock.map(unlockName), parts = [`Geschafft: ${qn(done.t)}.`];
    if (kinds.length) parts.push(`Neu zum Bauen: ${kinds.join(', ')}.`);
    if (Object.keys(done.gift).length) parts.push(`Dazu ${giftText(done.gift)}.`);
    if (quest >= QUESTS.length) parts.push('Jetzt steht dir alles offen.');
    if (quest >= QUESTS.length && cultureIsles(true).length) setTimeout(() => { if (quest >= QUESTS.length && !landing && !sheetKind) openSheet('finale'); }, 2600);   // the last task done: the story so far (unless another game began meanwhile)
    toast(parts.join(' '), 4600); renderBuildBar(); save();
    const el = $('quest'); el.classList.remove('done'); void el.offsetWidth; el.classList.add('done'); sfx('quest');
  }
  renderQuest();
}
function renderQuest(){
  const el = $('quest'), show = quest < QUESTS.length && !sheetKind && mode !== 'place' && mode !== 'move';
  el.hidden = !show; if (!show) return;
  const Q = QUESTS[quest], n = clamp(Q.n(), 0, Q.of);
  el.querySelector('.q-n').textContent = `${quest + 1}/${QUESTS.length}`;
  el.querySelector('.q-t').textContent = qn(Q.t);
  el.querySelector('.q-d').textContent = dOf(Q);
  el.querySelector('.q-p').textContent = `${n} von ${Q.of}`;
  el.querySelector('.q-bar i').style.width = (n / Q.of * 100) + '%';
  el.setAttribute('aria-label', `Aufgabe: ${qn(Q.t)}. ${dOf(Q)} ${n} von ${Q.of}.`);
}
function questSheet(){
  const Q = QUESTS[quest]; if (!Q) return '';
  const n = clamp(Q.n(), 0, Q.of);
  return head(qn(Q.t), `Aufgabe ${quest + 1} von ${QUESTS.length}`) +
    `<p><b>${dOf(Q)}</b> Bisher ${n} von ${Q.of}.</p><p class="sub">${qn(Q.why)}</p>` +
    (Q.unlock.length ? `<p class="sub">Danach neu zum Bauen: ${Q.unlock.map(unlockName).join(', ')}.</p>` : '') +
    `<div class="rowx"><span></span><span class="chips"><button class="btn" type="button" data-act="close">Später</button><button class="btn primary" type="button" data-act="showq">Zeig es mir</button></span></div>` +
    `<div class="rowx"><span class="sub">Kennst du das Spiel schon? Ohne Einführung ist gleich alles frei.</span><button class="btn" type="button" data-act="skipq">Ohne Einführung</button></div>`;
}
/* Without the introduction: every building free at once, no task card; the chronicle and everything else stay */
function skipTutorial(quiet){
  if (quest >= QUESTS.length) return;
  quest = QUESTS.length; stats.ohneEinfuehrung = 1; newKinds.clear();
  renderBuildBar(); renderQuest(); measure(); save();
  if (!quiet) toast('Ohne Einführung: Alle Gebäude sind frei, die Aufgaben stehen nicht mehr über der Bauleiste.', 4200);
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
  setBuildOpen(true);
  if (DECO.includes(kind) !== (buildTab === 'deco')){ buildTab = DECO.includes(kind) ? 'deco' : 'bau'; renderBuildBar(); }
  const b = $('buildList').querySelector(`[data-kind="${kind}"]`); if (!b) return;
  b.classList.remove('hint'); void b.offsetWidth; b.classList.add('hint');
  b.scrollIntoView({inline:'center', block:'nearest', behavior:reduced ? 'auto' : 'smooth'});
  setTimeout(() => b.classList.remove('hint'), 4200);
}
$('quest').addEventListener('click', () => openSheet('quest'));
