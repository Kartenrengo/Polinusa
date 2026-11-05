'use strict';
/* Guided start: one task at a time, shown above the build bar. Each finished task unlocks new buildings,
   so the build bar starts with just the house and grows with the village. */

// only what is finished counts; building sites and young plants do not
const count = (id, kind) => isl(id).buildings.filter(b => b.kind === kind && !b.bt).length;
const newLand = () => islands.filter(I => I.discovered && !I.start).length;   // the islands of the start waters do not count
const stockOf = (id, k) => isl(id).stock[k] || 0;
const fleetOf = kind => own().filter(s => s.kind === kind).length;
/* n() counts progress towards of. show says where "Zeig es mir" leads: a build button, a building's sheet, a canoe, a trade chain or the calendar. */
const working = I => { const sf = staffOf(I); return sf.total - sf.free; };
const QUESTS = [
  {id:'ernte', t:'Die Palmen nutzen', d:'Baue ein Erntehaus bei den Kokospalmen.', why:'Die Kokospalme gibt fast alles: Nüsse zum Essen, grüne Nüsse zum Trinken, Wedel für die Dächer, Fasern für Schnur. Zwei arbeiten dort: einer klettert, einer schält die Nüsse.',
    n:() => count('heimat', 'ernte'), of:1, show:{build:'ernte'}, unlock:[], gift:{dach:2}},
  {id:'holz', t:'Holz schlagen', d:'Baue einen Holzfäller am Waldrand.', why:'Jedes Gebäude braucht Holz und Palmwedel. Zu zweit fällt es sich dreimal so schnell: Einer schlägt, der andere zieht den Stamm am Seil zur Seite.',
    n:() => count('heimat', 'faeller'), of:1, show:{build:'faeller'}, unlock:[], gift:{holz:2}},
  {id:'trinken', t:'Wasser holen', d:() => isl('heimat').river ? 'Baue eine Quelle am Bach.' : 'Lagere 8 Wasser: grüne Nüsse vom Erntehaus.', why:'Jeder Mensch braucht Wasser. Ohne Wasser kommt niemand dazu, und bald ziehen Leute fort. Wo kein Bach fließt, trinkt man das Wasser der grünen Kokosnüsse.',
    n:() => isl('heimat').river ? count('heimat', 'quelle') : (stockOf('heimat', 'wasser') >= 8 ? 1 : 0), of:1, get show(){ return isl('heimat') && isl('heimat').river ? {build:'quelle'} : {sheet:'ernte'}; }, unlock:[], gift:{wasser:6}},
  {id:'fang', t:'Fischer am Strand', d:'Baue eine Fischerhütte am Strand.', why:'Zwei fahren zusammen im Kanu hinaus und holen, was gebraucht wird: Fisch, Meeresfrüchte, Muscheln, Kochsteine. Erst schnitzen sie ihr Kanu.',
    n:() => count('heimat', 'fisch'), of:1, show:{build:'fisch'}, unlock:[], gift:{holz:2}},
  {id:'huette', t:'Eine Hütte für Gäste', d:'Baue eine zweite Hütte.', why:'Steht eine Hütte leer, kommt bald ein Kanu von weit her mit einer Familie, die bleiben möchte. Gebaut wird zu zweit; ist niemand frei, legen zwei für die Bauzeit ihre Arbeit nieder.',
    n:() => count('heimat', 'haus'), of:2, show:{build:'haus'}, unlock:[], gift:{dach:2}},
  {id:'zuzug', t:'Neue Familien', d:'Nimm eine Familie auf, die per Kanu kommt.', why:'Jeder Erwachsene ist eine Arbeitskraft. Familien von weit her bringen eine neue Linie mit: Ihre Kinder machen das Dorf gesünder. Tippe das fremde Kanu an, wenn es anlegt.',
    n:() => stats.zuzug ? 1 : 0, of:1, show:{needs:true}, unlock:[], gift:{nahrung:4}},
  {id:'arbeit', t:'Arbeit verteilen', d:'Lass 6 Menschen arbeiten.', why:'Tippe einen Arbeitsplatz an: Mit + schickst du jemanden hin, mit − rufst du ihn ab. Oben in der Übersicht siehst du, wer frei ist. Wer keine Arbeit hat, sammelt im Wald und am Strand.',
    n:() => Math.min(6, working(isl('heimat'))), of:6, show:{needs:true}, unlock:[], gift:{holz:2}},
  {id:'essen', t:'Gärten anlegen', d:'Lege 2 Tarofelder an.', why:'Bei 8 Menschen kommen die Gärten. Die Familie hat Taro als Setzlinge im Kanu mitgebracht. Taro, Fisch, Kokos und Brotfrucht zählen alle als Nahrung.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:[], gift:{nahrung:4}},
  {id:'wachsen', t:'Zwölf Menschen', d:'Erreiche 12 Bewohner.', why:'Bei 12 Menschen kommen Seilerei und Erdofen. Baut Hütten, dann kommen Familien. Tippe oben auf die Bewohnerzahl: Dort steht, was fehlt.',
    n:() => isl('heimat').pop, of:12, show:{build:'haus'}, unlock:[], gift:{holz:4}},
  {id:'blut', t:'Frisches Blut', d:'Sorge für Familien aus 3 Linien auf Panua.', why:'Eine kleine Insel wird schnell eine einzige Verwandtschaft. Familien von weit her, Leute von euren anderen Inseln oder eine Hochzeit mit einem Clan bringen neue Linien. Sind alle zu nah verwandt, kommen kaum Kinder.',
    n:() => Math.min(3, linesWith(isl('heimat'))), of:3, show:{needs:true}, unlock:[], gift:{}},
  {id:'sennit', t:'Sennit drehen', d:'Baue eine Seilerei.', why:'Aus den Fasern der Kokosnüsse wird Sennit gedreht. Damit werden Hütten neu gebunden, Netze geknüpft und Kanus gebaut. Die Fasern bringt das Erntehaus mit den reifen Nüssen.',
    n:() => count('heimat', 'schnur'), of:1, show:{build:'schnur'}, unlock:[], gift:{faser:3}},
  {id:'ausbau', t:'Ein Familienhaus', d:'Binde eine Hütte mit Fasern und Sennit neu.', get why(){ return `Ein Familienhaus hat Platz für Kinder: Erst dort kommt Nachwuchs. Es braucht ${costText(TIERS[2].cost)}; liegt genug im Lager, bindet eine Familie ihre Hütte von selbst neu, oder du tippst auf der Hütte auf „Ausbauen“. Dann will die Familie Gekochtes.`; },
    n:() => homesOf(isl('heimat')).filter(b => tierOf(b) >= 2).length, of:1, show:{needs:true}, unlock:[], gift:{}},
  {id:'umu', t:'Der Erdofen', d:'Baue einen Erdofen.', why:'Heiße Steine, Blätter und Erde: so kochte man im ganzen Pazifik. Gekochtes wollen die Familienhäuser. Kochsteine holen die Fischer vom Riff.',
    n:() => count('heimat', 'umu'), of:1, show:{build:'umu'}, unlock:[], gift:{steine:3}},
  {id:'wald', t:'Der Wald wächst nach', d:'Baue einen Baumpflanzer am Wald.', why:'Der Pflanzer setzt junge Bäume auf die Stümpfe. Wo zu viel Wald fällt, spült der Regen die Erde ins Meer.',
    n:() => count('heimat', 'pflanzer'), of:1, show:{build:'pflanzer'}, unlock:[], gift:{}},
  {id:'mehr', t:'Zwanzig Menschen', d:'Erreiche 20 Bewohner.', why:'Bei 20 Menschen kommen Töpferei, Beile und das Leben auf dem Wasser. Familienhäuser bekommen Kinder, leere Hütten ziehen Familien an.',
    n:() => isl('heimat').pop, of:20, show:{build:'haus'}, unlock:[], gift:{dach:2}},
  {id:'ton', t:'Ton und Feuer', d:'Baue eine Töpferei am Ton.', why:'Ab 20 Bewohnern braucht jede Familie Töpfe. Jede Töpferei stempelt ihr eigenes Muster.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:[], gift:{}},
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
  {id:'motu', t:'Hinüber nach Motu', d:'Fahre 4 Siedler nach Motu und gründe ein Dorf.', why:'Siedler gehen als Familie. Tippe das Kanu an, lade Siedler, Holz, Wasser, Palmwedel und Taro-Setzlinge. Dann tippe auf Motu. Wer übers Meer geht, nimmt seine Linie mit.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{ship:'oc'}, unlock:['pulaka', 'pansammler', 'flecht', 'pandanus', 'halle'], gift:{}},
  {id:'segel', t:'Segel und Schnur', d:'Baue auf Motu eine Flechthütte und eine Seilerei.', why:'Die Flechthütte braucht Pandanus, die Seilerei Kokospalmen in der Nähe. Holz kommt von Panua.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, get show(){ return {island:'tochter', build:count('tochter', 'flecht') ? 'schnur' : 'flecht'}; }, unlock:[], gift:{holz:2}, giftTo:'tochter'},
  {id:'tausch', t:'Eine Handelskette', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln. Setz ein Kanu in die Kette und wähle die Ladung. Jede Fahrt knüpft einen Knoten.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{route:'tochter'}, unlock:['gaergrube', 'oelhuette'], gift:{}},
  {id:'dorf', t:'Ein Dorf', d:`Erreiche ${VILLAGE_POP} Bewohner und eine Meisterfamilie.`, why:'Mit Töpfen, Matten und Kokosöl im Lager baut eine Familie im Familienhaus weiter aus: ein Meisterhaus. Mehr Platz, mehr Bedürfnisse.',
    n:() => Math.min(1, isl('heimat').pop >= VILLAGE_POP ? 1 : 0) + Math.min(1, tier3Pop(isl('heimat')) ? 1 : 0), of:2, show:{needs:true}, unlock:[], gift:{}},
  {id:'proviant', t:'Vorrat für die Reise', d:'Lagere 6 Proviant auf Panua.', why:'Proviant entsteht in der Gärgrube. Ins Unbekannte nimmt das Doppelkanu nur Proviant mit.',
    n:() => stockOf('heimat', 'proviant'), of:6, show:{build:'gaergrube'}, unlock:['dc', 'pfosten'], gift:{}},
  {id:'kanu', t:'Das große Kanu', d:'Baue im Kanuhaus ein Doppelkanu.', why:'Nur das Doppelkanu fährt über das offene Meer. Der Bau dauert etwa fünf Minuten. Neu: das Haus der Navigatoren.',
    n:() => fleetOf('dc') || newLand() ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:['sternhaus'], gift:{}},
  {id:'land', t:'Neues Land', d:'Fahre mit dem Doppelkanu in den Nebel und finde eine neue Insel.', why:'Lade Proviant, tippe das Kanu an und dann auf den Nebel. Neues Land hat noch keinen Taro und keine Schweine.',
    n:() => newLand(), of:1, show:{ship:'dc'}, unlock:['garten', 'klopf', 'pferch', 'klingen', 'schmuck', 'kavagarten', 'trommel', 'tanzplatz', 'weberin', 'malerin', 'duftoel'], gift:{}},
  {id:'heirat', t:'Eine Hochzeit', d:'Verheirate jemanden mit einem Clan oder einem anderen Volk.', why:'Mit Brautgaben aus feinen Matten und einem Schwein geht jemand von euch eine Ehe ein, und der Partner zieht zu euch: eine neue Linie, und die Schnur zu ihnen löst sich nicht mehr. Dazu braucht es 3 Knoten Vertrauen.',
    n:() => stats.heirat ? 1 : 0, of:1, show:{fleet:true}, unlock:[], gift:{}},
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

/* ---------- stages, as in Anno: what can be built comes with the people. The first family has huts, the Erntehaus, wood,
   water and the fishers; at 8 people the gardens open, at 12 sennit and the earth oven, at 20 pots and tools, at 30 the
   village with oil and canoes, at 40 the goods of the feasts, at 50 the chief's house. One chain at a time. */
const STAGES = [
  {pop:0, n:'Ankunft', kinds:['haus', 'ernte', 'faeller', 'quelle', 'brunnen', 'fisch', 'pansammler', 'baum', 'palme']},
  {pop:8, n:'Gärten', kinds:['taro', 'pulaka', 'pflanzer', 'speicher', 'huehnerhof', 'pandanus']},
  {pop:12, n:'Sennit und Erdofen', kinds:['schnur', 'umu', 'kalkbrenner', 'kurkumagarten', 'harzer']},
  {pop:20, n:'Töpfe und Werkzeug', kinds:['toepfer', 'beil', 'steg', 'pfahl', 'gaergrube', 'flecht', 'hibiskus', 'blumen', 'fackel']},
  {pop:30, n:'Ein Dorf', kinds:['oelhuette', 'werft', 'oc', 'dc', 'sternhaus', 'taucher', 'halle', 'pfosten']},
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
const producerOf = (I, k) => ORDER.find(q => KINDS[q] && (KINDS[q].prod === k || (KINDS[q].picks && KINDS[q].picks[k])) && KINDS[q].on.includes(I.type) && unlocked(q) && hasLife(I, q) && !(KINDS[q].spring && !I.river) && (!SPEC_OF_KIND[q] || specOf(I) === SPEC_OF_KIND[q]));
/* where a good can be made that cannot be made here: the islands with the right ground */
const specIslesFor = k => { const kind = ORDER.find(q => KINDS[q] && KINDS[q].prod === k && SPEC_OF_KIND[q]); if (!kind) return []; return islands.filter(J => J.discovered && specOf(J) === SPEC_OF_KIND[kind]); };
function adviceOf(I, urgentOnly = false){
  if (!I || !I.settled) return null;
  const nd = needsOf(I), out = k => nd.list.some(n => n.k === k && n.state === 'out'), low = k => nd.list.some(n => n.k === k && n.state !== 'ok');
  const sites = I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind)), has = k => I.buildings.some(b => b.kind === k), done = k => I.buildings.some(b => b.kind === k && !b.bt);
  const wsrc = I.atoll ? 'brunnen' : I.river ? 'quelle' : 'ernte';
  if (nd.roofless && !sites) return {t:'Hütten bauen', d:`${nd.roofless} ${nd.roofless === 1 ? 'Mensch schläft' : 'Menschen schlafen'} ohne Dach. Eine Hütte braucht Holz und Palmwedel.`, build:'haus', urgent:true};
  if ((I.stock.wasser || 0) < 8 && low('wasser')) return {t:has(wsrc) || has('ernte') ? 'Mehr Wasser' : 'Wasser holen', d:I.river ? 'Eine Quelle am Bach, oder grüne Nüsse vom Erntehaus.' : I.atoll ? 'Ein Brunnen in der Mitte des Motus, oder grüne Nüsse vom Erntehaus.' : 'Hier fließt kein Bach: Das Erntehaus holt grüne Nüsse zum Trinken.', build:has(wsrc) && wsrc !== 'ernte' ? 'ernte' : wsrc, urgent:true};
  if (out('essen') || haveOf(I, 'essen') < 6 && low('essen')) return {t:'Mehr Essen', d:'Die Nahrung geht aus. Erntehaus, Fischerhütte und Gärten helfen, wer frei ist, sammelt.', build:!has('ernte') ? 'ernte' : !has('fisch') ? 'fisch' : producerOf(I, 'nahrung') || 'fisch', urgent:true};
  { const s = immigFor(I); if (s && s.state === 'moored' && s.immig) return {t:'Ein Kanu fragt', d:`Familie ${s.immig.n} ${s.immig.from} möchte auf ${I.name} bleiben.`, immig:s.id, urgent:true}; }
  if (urgentOnly) return null;
  // a workplace whose good is short stands still for a reason the player can fix
  const stillB = placesOf(I).find(b => b.idle && ['near', 'dep', 'trees', 'use'].includes(b.idle.why) && prodOfB(b) && (I.stock[prodOfB(b)] || 0) < 5);
  if (stillB) return {t:`${KINDS[stillB.kind].n} steht still`, d:stillB.idle.text + (stillB.idle.why === 'near' || stillB.idle.why === 'trees' ? ' Versetze den Platz dorthin.' : ''), goto:stillB.id};
  const sf = staffOf(I), open = placesOf(I).filter(b => (crewAt(I, b) || 0) < KINDS[b.kind].crew && !sf.pulled.has(b));
  if (open.length && sf.free && !autoWork(I)) return {t:'Arbeit verteilen', d:`${sf.free} ${sf.free === 1 ? 'Mensch ist' : 'Menschen sind'} frei, ${open.length} ${open.length === 1 ? 'Platz hat' : 'Plätze haben'} noch Raum. Tippe einen an und dann auf +.`, needs:true};
  // what every building needs: wood and palm fronds
  if ((I.stock.dach || 0) < 3){ const e = I.buildings.find(b => b.kind === 'ernte'); if (!e) return {t:'Palmwedel holen', d:'Jedes Gebäude braucht Palmwedel fürs Dach. Das Erntehaus holt sie von den Palmen.', build:'ernte'}; if (!(e.v && e.v.pick === 'dach') && choiceOf(e) !== 'dach') return {t:'Palmwedel holen', d:'Im Erntehaus kannst du die Leute auf Wedel stellen, bis genug da ist.', goto:e.id}; }
  if ((I.stock.holz || 0) < 3 && I.type === 'hoch' && !has('faeller')) return {t:'Holz schlagen', d:'Jedes Gebäude braucht Holz. Ein Holzfäller am Waldrand, zu zweit.', build:'faeller'};
  // fibre and sennit, link by link: the ripe nuts bring the fibre, the rope works turn it into sennit
  if (unlocked('schnur') && (I.stock.schnur || 0) < 2){
    if (!has('ernte')) return {t:'Kokosfasern holen', d:'Sennit wird aus Kokosfasern gedreht. Das Erntehaus bringt sie mit den reifen Nüssen.', build:'ernte'};
    if (!has('schnur')) return {t:'Schnur drehen', d:'Die Seilerei dreht aus Kokosfasern Sennit für Häuser, Netze und Kanus.', build:'schnur'};
  }
  if (unlocked('schnur') && done('schnur') && !homesOf(I).some(b => tierOf(b) >= 2) && homesOf(I).some(b => famOfHome(I, b))) return {t:'Ein Familienhaus', d:`Erst im Familienhaus kommen Kinder. Es braucht ${costText(TIERS[2].cost)}${canPay(I, TIERS[2].cost) ? '. Es liegt bereit: Tippe auf eine Hütte, dann auf „Ausbauen“.' : `, es fehlt ${lacking(I, TIERS[2].cost)}.`}`, goto:(homesOf(I).find(b => famOfHome(I, b) && tierOf(b) === 1) || {}).id};
  if (homesOf(I).some(b => tierOf(b) >= 2) && unlocked('umu') && !has('umu')) return {t:'Gekochtes', d:'Die Familienhäuser wollen Gekochtes aus dem Erdofen.', build:'umu'};
  if (nd.full && !nd.atMax && !emptyHome(I)) return {t:'Mehr Hütten', d:'Alle Hütten sind belegt. Eine leere Hütte zieht eine Familie von weit her an.', build:'haus'};
  if (I.pop >= 8 && kinState(I) !== 'ok') return {t:'Neues Blut', d:kinText(I).help, needs:true};
  const nextS = STAGES[stageNow() + 1]; if (nextS && I.pop < nextS.pop) return {t:`Auf ${nextS.pop} Menschen wachsen`, d:`Dann kommt: ${nextS.n}. Baut Hütten für Familien von weit her und Familienhäuser für Kinder.`, build:'haus'};
  const miss = MASTER_GOODS.find(k => !(I.stock[k] > 0)); if (miss && I.pop >= VILLAGE_POP){ const p = producerOf(I, miss); return {t:`${GN[miss]} für die Meisterfamilien`, d:p ? `Baue ${KINDS[p].n}.` : `${GN[miss]} kommt per Kanu von einer anderen Insel.`, build:p, fleet:!p}; }
  // the fine goods of the chief's family: some grow only on islands with the right ground
  if (chiefFam(I)){ const k = CHIEF_GOODS.find(q => !(I.stock[q] > 0)); if (k){ const p = producerOf(I, k), isles = specIslesFor(k) || [];
    const sp = ORDER.find(q => KINDS[q] && KINDS[q].prod === k && SPEC_OF_KIND[q]);
    return {t:`${GN[k]} für die Häuptlingsfamilie`, d:p ? `Baue ${KINDS[p].n}.` : sp ? `${KINDS[sp].n} geht nur auf Inseln mit ${SPECS[SPEC_OF_KIND[sp]].n}${isles.length ? `, etwa ${isles[0].name}` : ''}. Besiedle sie oder handle.` : `${GN[k]} kommt per Kanu von anderswo.`, build:p, fleet:!p}; } }
  const step = I.type === 'hoch' && islandMax(I) >= CHIEF.isle ? chiefSteps(I, nd).find(s => !s.ok) : null; if (step) return {t:'Weg zum Häuptlingsdorf', d:`Nächster Schritt: ${step.t} (${step.now}).`, needs:true};
  if (nd.atMax) return {t:'Neues Land besiedeln', d:'Die Insel ist voll. Schicke Familien im Kanu aus.', fleet:true};
  if (korCanThrow()) return {t:'Knöchelwurf', d:'Heute ist noch nicht geworfen.', koruru:true};
  return {t:'Erkunden und handeln', d:'Fahre mit dem Doppelkanu in den Nebel oder bring Gaben zu den Clans.', fleet:true};
}
let curAdvice = null;
function followAdvice(A){
  if (!A) return; closeSheet();
  if (A.koruru){ if (!kor || kor.state === 'done') korNew(); openSheet('koruru', {}); return; }
  if (A.immig){ const s = ships.find(q => q.id === A.immig); if (s){ flyTo(s.x, s.y, Math.max(cam.z, 2)); openSheet('immig', {ship:s.id}); } return; }
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
