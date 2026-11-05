'use strict';
/* Guided start: one task at a time, shown above the build bar. Each finished task unlocks new buildings,
   so the build bar starts with just the house and grows with the village. */

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
  {id:'trinken', t:'Wasser holen', d:'Baue eine Quelle am Bach oder einen Regenfang.', why:'Jeder Mensch braucht Wasser. Ohne Wasser wächst niemand zu, und bald ziehen Leute fort.',
    n:() => count('heimat', 'quelle') + count('heimat', 'regen') + count('heimat', 'brunnen'), of:1, get show(){ return {build:isl('heimat') && isl('heimat').river ? 'quelle' : 'regen'}; }, unlock:[], gift:{wasser:6}},
  {id:'essen', t:'Essen anbauen', d:'Lege 2 Tarofelder an.', why:'Taro, Brotfrucht, Fisch und Kokos zählen alle als Nahrung. Mit Nahrung und freien Häusern ziehen Leute zu.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:['baum', 'palme', 'fisch', 'kurkumagarten', 'huehnerhof'], gift:{nahrung:4}},
  {id:'fang', t:'Fisch aus der Lagune', d:'Baue ein Fischgestell am Strand.', why:'Ab 10 Bewohnern wollen die Familien Fisch. Der Fischer schnitzt zuerst seinen Einbaum.',
    n:() => count('heimat', 'fisch'), of:1, show:{build:'fisch'}, unlock:['kletterer'], gift:{holz:2}},
  {id:'familien', t:'Familien verteilen', d:'Lass 3 Familien an Arbeitsplätzen arbeiten.', why:'Eine Familie arbeitet an einem Ort. Tippe oben auf die Bewohnerzahl: Dort steht, wo jede Familie arbeitet. Auf jedem Arbeitsplatz schickst du mit + eine Familie hin.',
    n:() => Math.min(3, famsOf(isl('heimat')).filter(f => f.job).length), of:3, show:{needs:true}, unlock:[], gift:{nahrung:4}},
  {id:'wachsen', t:'Das Dorf wächst', d:'Erreiche 15 Bewohner.', why:'Bei 15 Menschen kommen Dach und Schnur dazu. Leute kommen, wenn Häuser frei sind und die Nahrung reicht. Tippe oben auf die Bewohnerzahl: Dort steht, was fehlt.',
    n:() => isl('heimat').pop, of:15, show:{build:'haus'}, unlock:['speicher', 'toepfer', 'pflanzer'], gift:{holz:4}},
  {id:'sennit', t:'Dach und Schnur', d:'Baue Palmenkletterer, Dachflechterin und Seilerei.', why:'Häuser werden ohne Nägel gebaut: Dachdeckung aus Wedeln, gebunden mit Sennit aus Kokosfasern. Der Kletterer bringt die Fasern.',
    n:() => Math.min(1, count('heimat', 'kletterer')) + Math.min(1, count('heimat', 'deckerin')) + Math.min(1, count('heimat', 'schnur')), of:3, get show(){ return {build:['kletterer', 'deckerin', 'schnur'].find(k => !count('heimat', k)) || 'schnur'}; }, unlock:[], gift:{dach:2, schnur:2}},
  {id:'wald', t:'Der Wald wächst nach', d:'Baue einen Baumpflanzer am Wald.', why:'Der Pflanzer setzt junge Bäume auf die Stümpfe. Wo Bäume stehen, kann nichts gebaut werden.',
    n:() => count('heimat', 'pflanzer'), of:1, show:{build:'pflanzer'}, unlock:[], gift:{}},
  {id:'riff', t:'Schätze vom Riff', d:'Baue einen Riffsammler am Strand.', why:'Ab 25 Bewohnern gehören Meeresfrüchte auf den Tisch.',
    n:() => count('heimat', 'riff'), of:1, show:{build:'riff'}, unlock:[], gift:{}},
  {id:'mehr', t:'Mehr Familien', d:'Erreiche 25 Bewohner.', why:'Bei 25 Menschen kommen Töpferei und Erdofen. Baue Häuser, dann ziehen Familien zu.',
    n:() => isl('heimat').pop, of:25, show:{build:'haus'}, unlock:[], gift:{dach:2}},
  {id:'ton', t:'Ton und Feuer', d:'Baue eine Töpferei am Ton.', why:'Ab 20 Bewohnern braucht jede Familie Töpfe. Jede Töpferei stempelt ihr eigenes Muster.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:['beil', 'riff', 'pfahl', 'steg', 'umu', 'kalkbrenner'], gift:{}},
  {id:'umu', t:'Der Erdofen', d:'Baue einen Erdofen.', why:'Heiße Steine, Blätter und Erde: so kochte man im ganzen Pazifik. Gekochtes brauchen die Meisterfamilien.',
    n:() => count('heimat', 'umu'), of:1, show:{build:'umu'}, unlock:[], gift:{steine:3}},
  {id:'lagune', t:'Leben auf dem Wasser', d:'Baue einen Kanusteg und ein Pfahlhaus.', why:'Pfahlhäuser brauchen kein Land. Ein Steg mit Einbaum reicht für 4 Pfahlhäuser.',
    n:() => Math.min(1, count('heimat', 'steg')) + Math.min(1, isl('heimat').buildings.filter(b => b.kind === 'pfahl' && !b.bt && !unserved(isl('heimat'), b)).length), of:2, get show(){ return {build:count('heimat', 'steg') ? 'pfahl' : 'steg'}; }, unlock:['taucher'], gift:{holz:3}},
  {id:'beile', t:'Steinbeile', d:'Baue eine Beilwerkstatt am Felsen.', why:'Ohne Steinbeile lässt sich kein Stamm für ein Kanu aushöhlen.',
    n:() => count('heimat', 'beil'), of:1, show:{build:'beil'}, unlock:['werft', 'harzer'], gift:{holz:4}},
  {id:'dreissig', t:'Auf dem Weg zum Dorf', d:'Erreiche 30 Bewohner.', why:'Bei 30 Menschen ist es ein Dorf: Kanuhaus, Matten und Kokosöl kommen dazu.',
    n:() => isl('heimat').pop, of:30, show:{build:'haus'}, unlock:[], gift:{holz:4}},
  {id:'wasser', t:'Ans Wasser', d:'Baue ein Kanuhaus am Strand.', why:'Im Kanuhaus entstehen die Boote. Es steht am Strand.',
    n:() => count('heimat', 'werft'), of:1, show:{build:'werft'}, unlock:['hibiskus', 'blumen', 'fackel'], gift:{holz:4, nahrung:4}},
  {id:'ausleger', t:'Ein Auslegerkanu', d:'Baue im Kanuhaus ein Auslegerkanu.', why:'Drei Bauleute brauchen etwa zweieinhalb Minuten. Schmücke solange das Dorf.',
    n:() => fleetOf('oc') || isl('tochter').settled ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'motu', t:'Hinüber nach Motu', d:'Fahre 4 Siedler nach Motu und gründe ein Dorf.', why:'Siedler gehen als Familie. Tippe das Kanu an, lade Siedler, Holz, Wasser, Dachdeckung, Schnur und Taro-Setzlinge. Dann tippe auf Motu.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{ship:'oc'}, unlock:['pulaka', 'pansammler', 'flecht', 'pandanus', 'halle'], gift:{}},
  {id:'segel', t:'Segel und Schnur', d:'Baue auf Motu eine Flechthütte und eine Seilerei.', why:'Die Flechthütte braucht Pandanus, die Seilerei Kokospalmen in der Nähe. Holz kommt von Panua.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, get show(){ return {island:'tochter', build:count('tochter', 'flecht') ? 'schnur' : 'flecht'}; }, unlock:[], gift:{holz:2}, giftTo:'tochter'},
  {id:'tausch', t:'Eine Handelskette', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln. Setz ein Kanu in die Kette und wähle die Ladung. Jede Fahrt knüpft einen Knoten.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{route:'tochter'}, unlock:['gaergrube', 'oelhuette'], gift:{}},
  {id:'dorf', t:'Ein Dorf', d:`Erreiche ${VILLAGE_POP} Bewohner und eine Meisterfamilie.`, why:'Mit Töpfen, Matten, Kokosöl und Gekochtem im Lager baut eine Familie ihr Haus aus. Mehr Platz, mehr Bedürfnisse.',
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
  {id:'tauchen', t:'Tauchen', d:'Lass von einem Kanu aus tauchen und finde etwas.', why:'Wo Vögel über dem Meer kreisen, liegt etwas am Grund, oft unter Treibgut. Kanu hinfahren, „Tauchen lassen“. Zu viele Tauchgänge machen krank.',
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

/* ---------- stages, as in Anno: what can be built comes with the people. A hamlet has houses, wood, water, fish and
   fields; at 15 people the cord and thatch chain opens, at 25 pots and the earth oven, at 30 the village with mats, oil
   and canoes, at 40 the goods of the feasts, at 50 the chief's house. One chain at a time, each new set announced. */
const STAGES = [
  {pop:0, n:'Weiler', kinds:['haus', 'faeller', 'quelle', 'brunnen', 'regen', 'fisch', 'taro', 'pulaka', 'pansammler', 'baum', 'palme']},
  {pop:15, n:'Dach und Schnur', kinds:['kletterer', 'deckerin', 'schnur', 'speicher', 'pflanzer', 'riff', 'kurkumagarten', 'huehnerhof', 'pandanus']},
  {pop:25, n:'Töpfe und Erdofen', kinds:['toepfer', 'umu', 'kalkbrenner', 'beil', 'steg', 'pfahl', 'gaergrube', 'harzer', 'hibiskus', 'blumen', 'fackel']},
  {pop:30, n:'Ein Dorf', kinds:['flecht', 'oelhuette', 'werft', 'oc', 'dc', 'sternhaus', 'taucher', 'halle', 'pfosten']},
  {pop:40, n:'Zeit der Feste', kinds:['garten', 'klopf', 'pferch', 'kavagarten', 'trommel', 'tanzplatz', 'ahnenhaus', 'weberin', 'malerin', 'duftoel', 'klingen', 'schmuck', 'bananen']},
  {pop:50, n:'Häuptling', kinds:['fale']}
];
const peakPop = () => Math.max(stats.peakPop || 0, ...islands.filter(I => I.settled).map(I => I.pop));
const stageNow = () => STAGES.filter(S => peakPop() >= S.pop).length - 1;
const stageOfKind = k => STAGES.findIndex(S => S.kinds.includes(k));
function unlocked(kind){
  if (KINDS[kind] && KINDS[kind].life && LIFE[KINDS[kind].life].from) return lifeKnown(KINDS[kind].life);   // bananas come with another people, not with a stage
  const st = stageOfKind(kind); return st < 0 || st <= stageNow();
}
/* a new stage reached: a card says what is new, and the new buildings get their dot */
function stageTick(){
  const p = peakPop(); if (p <= (stats.peakPop || 0)) return;
  const before = STAGES.filter(S => (stats.peakPop || 0) >= S.pop).length - 1; stats.peakPop = p; const now = stageNow();
  for (let k = before + 1; k <= now; k++){
    const S = STAGES[k], ks = S.kinds.filter(q => KINDS[q] || SHIPS[q]);
    for (const q of ks) newKinds.add(q);
    mana += 2; for (const I of islands) if (I.settled && I.id === active) for (let h = 0; h < 5; h++) heartAt(I);   // the village celebrates
    if (!awayQuiet) toast(`Ansehen +2. Neu bei ${S.pop} Menschen: ${S.n}. ${andList(ks.slice(0, 5).map(unlockName))}${ks.length > 5 ? ' und mehr' : ''}.`, 6000);
    note(`Neue Stufe: ${S.n}. Jetzt zu bauen: ${andList(ks.map(unlockName))}.`);
  }
  if (now > before) renderBuildBar();
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
/* ---------- the advice of the elders: always one clear next step. When something is urgent (no roof, no water, no food)
   it stands over the task; without tasks it is the card itself. */
const producerOf = (I, k) => ORDER.find(q => KINDS[q] && (KINDS[q].prod === k || KINDS[q].green === k) && KINDS[q].on.includes(I.type) && unlocked(q) && hasLife(I, q) && !(KINDS[q].spring && !I.river));
function adviceOf(I, urgentOnly = false){
  if (!I || !I.settled) return null;
  const nd = needsOf(I), out = k => nd.list.some(n => n.k === k && n.state === 'out'), low = k => nd.list.some(n => n.k === k && n.state !== 'ok');
  const sites = I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind)), has = k => I.buildings.some(b => b.kind === k);
  if (nd.roofless && !sites) return {t:'Häuser bauen', d:`${nd.roofless} Menschen schlafen ohne Dach. Ein Haus braucht Holz, Dachdeckung und Schnur.`, build:'haus', urgent:true};
  if ((I.stock.wasser || 0) < 8 && low('wasser')) return {t:['quelle', 'brunnen', 'regen'].some(has) ? 'Mehr Wasser' : 'Wasser holen', d:'Ohne Wasser wächst niemand zu, bald gehen Leute fort.', build:producerOf(I, 'wasser') || 'regen', urgent:true};
  if (out('essen') || haveOf(I, 'essen') < 6 && low('essen')) return {t:'Essen anbauen', d:'Die Nahrung ist aus. Felder, Fischgestell und Kokos helfen.', build:producerOf(I, 'nahrung') || 'fisch', urgent:true};
  if (urgentOnly) return null;
  // a workplace whose good is short stands still for a reason the player can fix
  const stillB = placesOf(I).find(b => b.idle && ['near', 'dep', 'trees', 'use'].includes(b.idle.why) && prodOfB(b) && (I.stock[prodOfB(b)] || 0) < 5);
  if (stillB) return {t:`${KINDS[stillB.kind].n} steht still`, d:stillB.idle.text + (stillB.idle.why === 'near' || stillB.idle.why === 'trees' ? ' Versetze ihn dorthin.' : ''), goto:stillB.id};
  const sf = staffOf(I), open = placesOf(I).filter(b => !famsOf(I).some(f => f.job === b.id));
  if (open.length && famsOf(I).some(f => !f.job && famAdults(I, f).length) && !autoWork(I)) return {t:'Familien verteilen', d:`${open.length} Arbeitsplätze haben keine Familie. Tippe einen an und dann auf +.`, needs:true};
  // thatch and cord, link by link: the climber brings the fibre, the rope works turn it into sennit
  if ((I.stock.dach || 0) < 2 && unlocked('deckerin') && !has('deckerin')) return {t:'Dachdeckung machen', d:'Jedes neue Haus braucht Dachdeckung. Die Dachflechterin braucht Palmen oder Pandanus in der Nähe.', build:'deckerin'};
  if ((I.stock.schnur || 0) < 2 && unlocked('schnur')){
    if (!has('kletterer')) return {t:'Kokosfasern holen', d:'Sennit wird aus Kokosfasern gedreht. Der Palmenkletterer bringt sie.', build:'kletterer'};
    if (!has('schnur')) return {t:'Schnur drehen', d:'Die Seilerei dreht aus Kokosfasern Sennit für Häuser und Kanus.', build:'schnur'};
  }
  if (nd.full && !nd.atMax) return {t:'Mehr Häuser', d:'Alle Häuser sind voll. Ein leeres Haus zieht eine neue Familie an.', build:'haus'};
  const nextS = STAGES[stageNow() + 1]; if (nextS && I.pop < nextS.pop) return {t:`Auf ${nextS.pop} Menschen wachsen`, d:`Dann kommt: ${nextS.n}. Halte Nahrung und Wasser im Lager und baue Häuser.`, build:'haus'};
  const miss = TIER2_GOODS.find(k => !(I.stock[k] > 0)); if (miss && I.pop >= VILLAGE_POP){ const p = producerOf(I, miss); return {t:`${GN[miss]} für die Meisterfamilien`, d:p ? `Baue ${KINDS[p].n}.` : `${GN[miss]} kommt per Kanu von einer anderen Insel.`, build:p, fleet:!p}; }
  const step = I.type === 'hoch' && islandMax(I) >= CHIEF.isle ? chiefSteps(I, nd).find(s => !s.ok) : null; if (step) return {t:'Weg zum Häuptlingsdorf', d:`Nächster Schritt: ${step.t} (${step.now}).`, needs:true};
  if (nd.atMax) return {t:'Neues Land besiedeln', d:'Die Insel ist voll. Schicke Familien im Kanu aus.', fleet:true};
  if (korCanThrow()) return {t:'Knöchelwurf', d:'Heute ist noch nicht geworfen.', koruru:true};
  return {t:'Erkunden und handeln', d:'Fahre mit dem Doppelkanu in den Nebel oder bring Gaben zu den Clans.', fleet:true};
}
let curAdvice = null;
function followAdvice(A){
  if (!A) return; closeSheet();
  if (A.koruru){ if (!kor || kor.state === 'done') korNew(); openSheet('koruru', {}); return; }
  if (A.needs){ openSheet('needs'); return; }
  if (A.goto){ const b = findB(A.goto); if (b){ select(b); flyTo(b.x, b.y, Math.max(cam.z, 2.4)); } return; }
  if (A.fleet){ setBar('fleet'); return; }
  if (A.build) hintBuild(A.build);
}
function renderQuest(){
  const el = $('quest'), I = isl(active), A = !landing && I && I.settled ? (quest < QUESTS.length ? adviceOf(I, true) : adviceOf(I)) : null;
  const show = (quest < QUESTS.length || A) && !sheetKind && mode !== 'place' && mode !== 'move' && !landing;
  el.hidden = !show; curAdvice = A; el.classList.toggle('urgent', !!(A && A.urgent)); el.classList.toggle('advice', !!A); if (!show) return;
  if (A){
    el.querySelector('.q-n').textContent = A.urgent ? 'Jetzt' : 'Rat';
    el.querySelector('.q-t').textContent = A.t; el.querySelector('.q-d').textContent = A.d; el.querySelector('.q-p').textContent = 'Zeigen ›';
    el.querySelector('.q-bar i').style.width = '0%'; el.setAttribute('aria-label', `Rat der Ältesten: ${A.t}. ${A.d}`); return;
  }
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
  if (!quiet) toast('Ohne Einführung: Die Aufgaben stehen nicht mehr über der Bauleiste. Neue Gebäude kommen wie sonst mit den Menschen.', 4200);
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
$('quest').addEventListener('click', () => { if (curAdvice){ toast(curAdvice.d, 3600, false); followAdvice(curAdvice); return; } openSheet('quest'); });
