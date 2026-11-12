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
  {id:'trinken', t:'Wasser holen', d:() => isl('heimat').river ? 'Lagere 8 Wasser von der Quelle am Bach.' : 'Lagere 8 Wasser: grüne Nüsse vom Erntehaus.', why:'Jeder Mensch braucht Wasser. Ohne Wasser kommt niemand dazu, und bald ziehen Leute fort. Jede Insel mit einem Bach hat eine Quelle; wo kein Bach fließt, trinkt man das Wasser der grünen Kokosnüsse.',
    n:() => stockOf('heimat', 'wasser') >= 8 ? 1 : 0, of:1, get show(){ return isl('heimat') && isl('heimat').river ? {sheet:'quelle'} : {sheet:'ernte'}; }, unlock:[], gift:{wasser:6}},
  {id:'fang', t:'Fischer am Strand', d:'Baue eine Fischerhütte am Strand.', why:'Zwei fahren zusammen im Kanu hinaus und holen, was gebraucht wird: Fisch, Meeresfrüchte, Muscheln, Kochsteine. Erst schnitzen sie ihr Kanu.',
    n:() => count('heimat', 'fisch'), of:1, show:{build:'fisch'}, unlock:[], gift:{holz:2}},
  {id:'huette', t:'Eine Hütte für Gäste', d:'Baue eine zweite Hütte.', why:'Steht eine Hütte leer, kommt bald ein Kanu von weit her mit einer Familie, die bleiben möchte. Gebaut wird zu zweit; ist niemand frei, legen zwei für die Bauzeit ihre Arbeit nieder.',
    n:() => count('heimat', 'haus'), of:2, show:{build:'haus'}, unlock:[], gift:{dach:2}},
  {id:'zuzug', t:'Neue Familien', d:'Nimm eine Familie auf, die per Kanu kommt.', why:'Jeder Erwachsene ist eine Arbeitskraft. Familien von weit her bringen eine neue Linie mit: Ihre Kinder machen das Dorf gesünder. Tippe das fremde Kanu an, wenn es anlegt.',
    n:() => stats.zuzug ? 1 : 0, of:1, show:{needs:true}, unlock:[], gift:{nahrung:4}},
  {id:'arbeit', t:'Arbeit verteilen', d:'Lass 6 Menschen arbeiten.', why:'Tippe einen Arbeitsplatz an: Mit + schickst du jemanden hin, mit − rufst du ihn ab. Oben in der Übersicht siehst du, wer frei ist. Wer keine Arbeit hat, sammelt im Wald und am Strand.',
    n:() => Math.min(6, working(isl('heimat'))), of:6, show:{needs:true}, unlock:[], gift:{holz:2}},
  {id:'acht', t:'Acht Menschen', d:'Erreiche 8 Bewohner.', why:'Bei 8 Menschen kommen die Gärten: Taro, Yams, der Nussbaum. Leere Hütten holen Familien von weit her.',
    n:() => isl('heimat').pop, of:8, show:{build:'haus'}, unlock:[], gift:{holz:2}},
  {id:'essen', t:'Gärten anlegen', d:'Lege 2 Tarofelder an.', why:'Bei 8 Menschen kommen die Gärten. Die Familie hat Taro als Setzlinge im Kanu mitgebracht. Taro, Fisch, Kokos und Brotfrucht zählen alle als Nahrung.',
    n:() => count('heimat', 'taro'), of:2, show:{build:'taro'}, unlock:[], gift:{nahrung:4}},
  {id:'wachsen', t:'Zwölf Menschen', d:'Erreiche 12 Bewohner.', why:'Bei 12 Menschen kommen Sennit und Erdofen. Baut Hütten, dann kommen Familien. Tippe oben auf die Bewohnerzahl: Dort steht, was fehlt.',
    n:() => isl('heimat').pop, of:12, show:{build:'haus'}, unlock:[], gift:{holz:4}},
  {id:'blut', t:'Frisches Blut', d:'Sorge für Familien aus 3 Linien auf Panua.', why:'Eine kleine Insel wird schnell eine einzige Verwandtschaft. Familien von weit her, Leute von euren anderen Inseln oder eine Hochzeit mit einem Clan bringen neue Linien. Sind alle zu nah verwandt, kommen kaum Kinder.',
    n:() => Math.min(3, linesWith(isl('heimat'))), of:3, show:{needs:true}, unlock:[], gift:{}},
  {id:'sennit', t:'Sennit drehen', d:'Lass eine Familie Sennit drehen.', why:'Tippe auf ein Haus und wähle unter Hauswerk die Schnur. Sennit wird zu Hause gedreht, auf dem Oberschenkel gerollt. Damit werden Hütten neu gebunden, Netze geknüpft und Kanus gebaut. Die Fasern bringt das Erntehaus mit den reifen Nüssen.',
    n:() => count('heimat', 'schnur'), of:1, show:{build:'schnur'}, unlock:[], gift:{faser:3}},
  {id:'ausbau', t:'Ein Familienhaus', d:'Baue eine Hütte aus.', get why(){ return `Tippe auf eine Hütte. Dort steht, wer wohnt, die Schnur der Familie mit einem Knoten für jedes Bedürfnis und was zum Ausbau fehlt: alle Knoten fest und ${costText(TIERS[2].cost)}. Ist alles da, schwebt ein Knoten mit Blüte über der Hütte: Ausbauen. Im Familienhaus kommen Kinder, und die Familie will Gekochtes.`; },
    n:() => homesOf(isl('heimat')).filter(b => tierOf(b) >= 2).length, of:1, show:{needs:true}, unlock:[], gift:{}},
  {id:'umu', t:'Der Erdofen', d:'Baue einen Erdofen.', why:'Heiße Steine, Blätter und Erde: so kochte man im ganzen Pazifik. Gekochtes wollen die Familienhäuser. Kochsteine holen die Fischer vom Riff.',
    n:() => count('heimat', 'umu'), of:1, show:{build:'umu'}, unlock:[], gift:{steine:3}},
  {id:'wald', t:'Der Wald wächst nach', d:'Baue einen Baumpflanzer am Wald.', why:'Der Pflanzer setzt junge Bäume auf die Stümpfe. Wo zu viel Wald fällt, spült der Regen die Erde ins Meer.',
    n:() => count('heimat', 'pflanzer'), of:1, show:{build:'pflanzer'}, unlock:[], gift:{}},
  {id:'mehr', t:'Zwanzig Menschen', d:'Erreiche 20 Bewohner.', why:'Bei 20 Menschen kommen Töpfe, Beile und das Leben auf dem Wasser. Familienhäuser bekommen Kinder, leere Hütten ziehen Familien an.',
    n:() => isl('heimat').pop, of:20, show:{build:'haus'}, unlock:[], gift:{dach:2}},
  {id:'ton', t:'Ton und Feuer', d:'Lass eine Familie am Ton töpfern.', why:'Ab 20 Bewohnern braucht jede Familie Töpfe. Getöpfert wird zu Hause, aber nur nah am Ton: Steht dort kein Haus, baue eine Hütte am Ton und wähle Töpfern. Mit den ersten Töpfen findet das Dorf sein eigenes Muster.',
    n:() => count('heimat', 'toepfer'), of:1, show:{build:'toepfer'}, unlock:[], gift:{}},
  {id:'lagune', t:'Leben auf dem Wasser', d:'Baue einen Kanusteg und ein Pfahlhaus.', why:'Pfahlhäuser brauchen kein Land. Ein Steg mit Einbaum reicht für 4 Pfahlhäuser.',
    n:() => Math.min(1, count('heimat', 'steg')) + Math.min(1, isl('heimat').buildings.filter(b => b.kind === 'pfahl' && !b.bt && !unserved(isl('heimat'), b)).length), of:2, get show(){ return {build:count('heimat', 'steg') ? 'pfahl' : 'steg'}; }, unlock:['taucher'], gift:{holz:3}},
  {id:'beile', t:'Steinbeile', d:'Baue eine Beilwerkstatt am Felsen.', why:'Ohne Steinbeile lässt sich kein Stamm für ein Kanu aushöhlen.',
    n:() => count('heimat', 'beil'), of:1, show:{build:'beil'}, unlock:['werft', 'harzer'], gift:{holz:4}},
  {id:'dreissig', t:'Auf dem Weg zum Dorf', d:'Erreiche 30 Bewohner.', why:'Bei 30 Menschen ist es ein Dorf: Öl, Doppelkanu, Sternhaus, Taucher und Versammlungshaus kommen dazu.',
    n:() => isl('heimat').pop, of:30, show:{build:'haus'}, unlock:[], gift:{holz:4}},
  {id:'wasser', t:'Ans Wasser', d:'Baue ein Kanuhaus am Strand.', why:'Im Kanuhaus entstehen die Boote. Es steht am Strand.',
    n:() => count('heimat', 'werft'), of:1, show:{build:'werft'}, unlock:['hibiskus', 'blumen', 'fackel'], gift:{holz:4, nahrung:4}},
  {id:'ausleger', t:'Ein Auslegerkanu', d:'Baue im Kanuhaus ein Auslegerkanu.', why:'Drei Bauleute brauchen etwa zweieinhalb Minuten. Schmücke solange das Dorf.',
    n:() => fleetOf('oc') || isl('tochter').settled ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'motu', t:'Hinüber nach Motu', d:'Fahre 4 Siedler nach Motu und gründe ein Dorf.', why:'Siedler gehen als Familie. Tippe das Kanu an, lade Siedler, Holz, Wasser, Palmwedel und Taro-Setzlinge. Dann tippe auf Motu. Wer übers Meer geht, nimmt seine Linie mit.',
    n:() => isl('tochter').settled ? 1 : 0, of:1, show:{ship:'oc'}, unlock:['pulaka', 'pansammler', 'flecht', 'pandanus', 'halle'], gift:{}},
  {id:'segel', t:'Segel und Schnur', d:'Lass auf Motu Matten flechten und Sennit drehen.', why:'Beides machen die Familien zu Hause. Matten flechten geht in einem Haus mit 2 Pandanus in der Nähe. Holz kommt von Panua.',
    n:() => Math.min(1, count('tochter', 'flecht')) + Math.min(1, count('tochter', 'schnur')), of:2, get show(){ return {island:'tochter', build:count('tochter', 'flecht') ? 'schnur' : 'flecht'}; }, unlock:[], gift:{holz:2}, giftTo:'tochter'},
  {id:'tausch', t:'Eine Handelskette', d:'Bring 3 Matten und 3 Schnüre nach Panua.', why:'Tippe auf die Schnur zwischen den Inseln. Setz ein Kanu in die Kette und wähle die Ladung. Jede Fahrt knüpft einen Knoten.',
    n:() => Math.min(3, stockOf('heimat', 'matten')) + Math.min(3, stockOf('heimat', 'schnur')), of:6, show:{route:'tochter'}, unlock:['gaergrube', 'oelhuette'], gift:{}},
  {id:'dorf', t:'Ein Dorf', d:`Erreiche ${VILLAGE_POP} Bewohner und eine Meisterfamilie.`, why:'Mit Töpfen, Matten und Kokosöl im Lager baut eine Familie im Familienhaus weiter aus: ein Meisterhaus. Mehr Platz, mehr Bedürfnisse.',
    n:() => Math.min(1, isl('heimat').pop >= VILLAGE_POP ? 1 : 0) + Math.min(1, tier3Pop(isl('heimat')) ? 1 : 0), of:2, show:{needs:true}, unlock:[], gift:{}},
  {id:'proviant', t:'Vorrat für die Reise', d:'Lagere 6 Proviant auf Panua.', why:'Proviant entsteht in der Gärgrube; auch getrocknete Kanarinüsse halten auf See. Ins Unbekannte nimmt das Doppelkanu nur Proviant mit.',
    n:() => stockOf('heimat', 'proviant'), of:6, show:{build:'gaergrube'}, unlock:['dc', 'pfosten'], gift:{}},
  {id:'kanu', t:'Das große Kanu', d:'Baue im Kanuhaus ein Doppelkanu.', why:'Nur das Doppelkanu fährt über das offene Meer. Der Bau dauert etwa fünf Minuten. Neu: das Haus der Navigatoren.',
    n:() => fleetOf('dc') || newLand() ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:['sternhaus'], gift:{}},
  {id:'land', t:'Neues Land', d:'Fahre mit dem Doppelkanu in den Nebel und finde eine neue Insel.', why:'Lade Proviant, tippe das Kanu an und dann auf den Nebel. Neues Land hat noch keinen Taro und keine Schweine.',
    n:() => newLand(), of:1, show:{ship:'dc'}, unlock:['garten', 'klopf', 'pferch', 'klingen', 'schmuck', 'trommel', 'tanzplatz'], gift:{}},
  {id:'heirat', t:'Eine Hochzeit', d:'Verheirate jemanden mit einem Clan oder einem anderen Volk.', why:'Mit Brautgaben aus Matten und einem Schwein geht jemand von euch eine Ehe ein, und der Partner zieht zu euch: eine neue Linie, und die Schnur zu ihnen löst sich nicht mehr. Dazu braucht es 3 Knoten Vertrauen.',
    n:() => stats.heirat ? 1 : 0, of:1, show:{fleet:true}, unlock:[], gift:{}},
  {id:'fest', t:'Ein Fest', d:'Feiere ein Fest am Dorfzentrum.', why:'Feste bringen Ansehen. Ansehen holt Siedler. Das Dorfzentrum ist das erste Haus am Dorfplatz, mit der Fahne.',
    n:() => islands.some(I => I.feastAt > 0) ? 1 : 0, of:1, show:{center:true}, unlock:['ahnenhaus'], gift:{}},
  {id:'plejaden', t:'Das Fest der Plejaden', d:() => festivalTime() ? 'Jetzt ist Festzeit. Feiere das Fest der ersten Früchte.' : `Feiere das Fest der ersten Früchte. Die Plejaden erscheinen in etwa ${minutes(untilFestival())} Minuten.`,
    why:'Mit den Plejaden beginnt das Jahr. Tanz, Salbung mit Öl und Kanurennen machen das Fest größer.',
    n:() => islands.some(I => I.festYear != null) ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}},
  {id:'tauchen', t:'Tauchen', d:'Lass von einem Kanu aus tauchen und finde etwas.', why:'Wo Vögel über dem Meer kreisen, liegt etwas am Grund, oft unter Treibgut. Kanu hinfahren, „Tauchen lassen“. Zu viele Tauchgänge machen krank.',
    n:() => stats.tauchfund ? 1 : 0, of:1, show:{fleet:true}, unlock:[], gift:{}},
  {id:'netz', t:'Das Lapita-Netz', d:'Verbinde 4 eigene Dörfer und 2 Clans mit mindestens 4 Knoten.', why:'Dörfer auf vielen Inseln, verbunden durch Fahrten und Gaben. Dann ruft der Osten.',
    n:() => Math.min(4, islands.filter(I => I.settled).length) + Math.min(2, routes.filter(r => (isl(r.a).clan || isl(r.b).clan) && r.knots >= 4).length), of:6, show:{fleet:true}, unlock:[], gift:{}},
  // the great voyage: across the Weite See to the Ferne Inseln, their treasures, and the greatest feast
  {id:'weite', t:'Die Weite See', d:'Finde mit dem Doppelkanu Land jenseits der Weiten See im Osten.', why:'Nach Osten geht es gegen den Passat. In der Sturmzeit schiebt der Westwind das Kanu nach Osten, doch es drohen Stürme. Hinüber braucht das Doppelkanu etwa 12 Proviant. Tifa liegt auf halbem Weg. Navigatoren sparen Proviant.',
    n:() => islands.some(I => I.discovered && I.center.x > FAR_X) ? 1 : 0, of:1, show:{ship:'dc'}, unlock:[], gift:{proviant:6}},
  {id:'schatz', t:'Schätze der Ferne', d:'Bring Perlmutt, rote Federn und einen Walzahn in ein eigenes Dorf.', why:'Tifa, Kula und Tabua haben Schätze, die es sonst nirgends gibt. Leg dort an, die Mannschaft sammelt.',
    n:() => TREASURE_GOODS.filter(k => islands.some(I => I.settled && (I.stock[k] || 0) > 0)).length, of:3, show:{fleet:true}, unlock:[], gift:{}},
  {id:'fern', t:'Ein Dorf in der Ferne', d:'Gründe ein Dorf auf den Fernen Inseln.', why:'Erst erkunden, dann siedeln: Siedler, Holz, Nahrung und Proviant aufs Doppelkanu, dann die Insel antippen. Mit dem ersten Dorf dort beginnt eine neue Zeit.',
    n:() => islands.some(I => I.settled && I.center.x > FAR_X) ? 1 : 0, of:1, show:{ship:'dc'}, unlock:['kavagarten', 'weberin', 'malerin', 'duftoel', 'schnitzer', 'fale'], gift:{}},
  {id:'ahnen', t:'Das Fest der Schätze', d:'Feiere im Versammlungshaus das Fest der Schätze.', why:'Das größte Fest. Danach wächst das Dorf eine Weile doppelt so schnell.',
    n:() => stats.schatzfest ? 1 : 0, of:1, show:{sheet:'halle'}, unlock:[], gift:{}},
  // Hawaiki: in the new homeland out east the descendants of Lapita become the Polynesians of later times
  {id:'chief', t:'Hawaiki', d:'Mach ein Dorf zum Häuptlingsdorf.', why:'Mit dem Dorf auf den Fernen Inseln beginnt eine neue Zeit: Hawaiki. Dort entstand, was man erst aus späterer Zeit kennt: Kava, feine Matten, bemalte Tapa, Duftöl und das Haus des Häuptlings. Baue ein Häuptlingshaus; die Familie der Matriarchin zieht ein und will das Feinste. Die Übersicht zeigt jeden Schritt.',
    n:() => islands.some(I => I.settled && I.lvl === 3) ? 1 : 0, of:1, show:{needs:true}, unlock:[], gift:{}},
  // the long pause, and the second great voyage across the Leere See to the Inseln des Morgens
  {id:'sterne', t:'Die lange Pause', d:'Ein Navigator lernt den Sternenpfad.', why:'Nach Tonga und Samoa vergingen etwa 1500 Jahre, bis die Kanus weiter nach Osten fuhren. Es brauchte mehr Wissen über die Sterne und größere Kanus. Im Haus der Navigatoren lernt man den Sternenpfad, die Stufe 3. Dann lässt sich das Reisekanu bauen.',
    n:() => pauseOver() ? 1 : 0, of:1, show:{sheet:'sternhaus'}, unlock:['vaka'], gift:{}},
  {id:'vaka', t:'Das Reisekanu', d:'Baue im Kanuhaus ein Reisekanu.', why:'Größer und schneller als das Doppelkanu, mit einem Segel wie eine Krebsschere aus feinen Matten. Nur damit fährt man über die Leere See.',
    n:() => fleetOf('vaka') || morningSeen() ? 1 : 0, of:1, show:{sheet:'werft'}, unlock:[], gift:{}},
  {id:'morgen', t:'Die Inseln des Morgens', d:'Fahre mit dem Reisekanu über die Leere See nach Osten.', why:'Hinter den Fernen Inseln liegt die Leere See, viele Tage ohne Land. Lade viel Proviant. Nach Osten geht es gegen den Passat; in der Sturmzeit schiebt der Westwind, doch es drohen Böen.',
    n:() => morningSeen() ? 1 : 0, of:1, show:{ship:'vaka'}, unlock:[], gift:{proviant:6}},
  {id:'morgendorf', t:'Ein Dorf am Morgen', d:'Gründe ein Dorf auf den Inseln des Morgens.', why:'Auf den Inseln des Morgens lebt noch niemand. So kamen die Polynesier um 1000 n. Chr. nach Tahiti und zu den Marquesas, später nach Hawaiʻi, Rapa Nui und Aotearoa.',
    n:() => morningVillage() ? 1 : 0, of:1, show:{ship:'vaka'}, unlock:[], gift:{}},
  // at the edges of the sea: people who do not descend from your ancestors
  {id:'kultur', t:'Andere Menschen', d:'Findet ein Volk einer anderen Kultur und bringt ihm eine Gabe.', why:'Im Westen das Große Land, im Norden die Seefahrer. Bringt ihnen eine Gabe.',
    n:() => !cultureIsles(true).length ? 2 : Math.min(1, cultureIsles().length) + (cultureIsles().some(I => routes.some(r => (r.a === I.id || r.b === I.id) && (r.knots >= 1 || I.debt > 0))) ? 1 : 0), of:2, show:{ship:'dc'}, unlock:[], gift:{}}
];
/* the islands of other peoples: those found, or (all) those this world has at all */
const cultureIsles = all => all ? (home0 && home0.cultures || []) : islands.filter(I => I.clan && I.clan.culture && I.discovered);
/* the tasks name the home island and the first atoll as they are called now: chosen at the landing, or renamed */
const qn = t => t.replace(/\bPanua\b/g, isl('heimat').name).replace(/\bMotu\b/g, isl('tochter').name);
const questLock = Q => { const k = Q && Q.show && Q.show.build; if (!k || !KINDS[k] || unlocked(k)) return ''; const st = STAGES[stageOfKind(k)];
  return st && !st.gate ? `${KINDS[k].craft || KINDS[k].n} gibt es erst ab ${st.pop} Menschen. Baut bis dahin Hütten: Leere Hütten holen Familien.` : ''; };
const dOf = Q => questLock(Q) || qn(typeof Q.d === 'function' ? Q.d() : Q.d);
const unlockName = k => KINDS[k] && KINDS[k].craft ? `${KINDS[k].craft} im Haus` : (KINDS[k] || SHIPS[k]).n;
const feastsOpen = () => quest >= QUESTS.findIndex(Q => Q.id === 'fest');
let quest = 0;               // index of the current task; QUESTS.length means all are done
const newKinds = new Set();  // unlocked but not yet tapped, they get a dot in the build bar

/* ---------- stages, as in Anno: what can be built comes with the people. The first family has huts, the Erntehaus, wood,
   water and the fishers; at 8 people the gardens open, at 12 sennit and the earth oven, at 20 pots and tools, at 30 the
   village with oil and canoes, at 40 the goods of the feasts. After the great voyage comes Hawaiki (above). One chain at a time. */
const STAGES = [
  {pop:0, n:'Ankunft', kinds:['haus', 'ernte', 'faeller', 'quelle', 'brunnen', 'fisch', 'pansammler', 'baum', 'palme']},
  {pop:8, n:'Gärten', kinds:['taro', 'yams', 'nussbaum', 'pulaka', 'pflanzer', 'speicher', 'huehnerhof', 'pandanus']},
  {pop:12, n:'Sennit und Erdofen', kinds:['schnur', 'umu', 'kalkbrenner', 'kurkumagarten', 'harzer']},
  {pop:20, n:'Töpfe und Werkzeug', kinds:['toepfer', 'hakenmacher', 'beil', 'steg', 'pfahl', 'gaergrube', 'flecht', 'hibiskus', 'blumen', 'fackel', 'werft', 'oc']},   // the canoe house comes when the master's houses want mats from the atolls
  {pop:30, n:'Ein Dorf', kinds:['oelhuette', 'dc', 'sternhaus', 'taucher', 'halle', 'pfosten']},
  {pop:40, n:'Zeit der Feste', kinds:['garten', 'klopf', 'pferch', 'trommel', 'tanzplatz', 'ahnenhaus', 'klingen', 'schmuck', 'bananen']},
  {pop:40, n:'Hawaiki', gate:() => hawaiki(), kinds:['kavagarten', 'weberin', 'malerin', 'duftoel', 'schnitzer', 'fale']},   // after the great voyage
  {pop:40, n:'Die lange Pause', gate:() => pauseOver(), kinds:['vaka']}   // in Hawaiki, until the star path is known
];
const peakPop = () => Math.max(stats.peakPop || 0, ...islands.filter(I => I.settled).map(I => I.pop));
const stageOk = S => peakPop() >= S.pop && (!S.gate || S.gate());
const stageNow = () => { let i = 0; while (i + 1 < STAGES.length && stageOk(STAGES[i + 1])) i++; return i; };
/* Hawaiki. When the first village stands on the Ferne Inseln a new time begins: out there, far from the old islands, the
   descendants of the Lapita people became the Polynesians of later times. Kava, fine mats, painted tapa, scented oil and
   the chief's house are known only from these later times, so they come with it, on every island of the clan; until then
   no clan offers or asks for them either. */
const LATE_GOODS = ['kava', 'feinmatten', 'bemtapa', 'duftoel'];
const hawaiki = () => !!stats.hawaiki || islands.some(I => I.settled && I.center.x > FAR_X);
/* The long pause: from Tonga and Samoa the canoes went no further east for some 1500 years. Here it lasts until a navigator
   in Hawaiki knows the star path (level 3); then the voyaging canoe can be built, the only one that crosses the Leere See. */
const pauseOver = () => !!stats.pause || (hawaiki() && navLore().lvl >= 3);
const morningSeen = () => islands.some(I => I.discovered && I.center.x > MORN_X), morningVillage = () => islands.some(I => I.settled && I.center.x > MORN_X);
const early = ks => hawaiki() ? ks : ks.filter(k => !LATE_GOODS.includes(k));
const clanMakes = C => early(C.makes), clanWants = C => early(C.wants);
const stageOfKind = k => STAGES.findIndex(S => S.kinds.includes(k));
function unlocked(kind){
  if (KINDS[kind] && KINDS[kind].life && LIFE[KINDS[kind].life].from) return lifeKnown(KINDS[kind].life);   // bananas come with another people, not with a stage
  const st = stageOfKind(kind); return st < 0 || st <= stageNow();
}
/* a new stage reached: a card says what is new, and the new buildings get their dot */
function stageTick(){
  const p = peakPop(); if (p > (stats.peakPop || 0)) stats.peakPop = p;
  if (!stats.pause && stats.hawaiki && pauseOver()) stats.pause = 1;   // once the star path was known, the long pause is over for good
  if (!stats.hawaiki && hawaiki()){ stats.hawaiki = 1; note('In Hawaiki treten Holzschalen an die Stelle der Töpfe, wie in Tonga und Samoa.');   // once begun, the new time stays; every village has kava cuttings from then on
    for (const I of islands) if (I.settled && !lifeOf(I).includes('kava')) I.life = [...lifeOf(I), 'kava']; }
  const now = stageNow(), before = stats.stage ?? now; stats.stage = now;   // a game saved before this counts from here
  if (now <= before) return;
  for (let k = before + 1; k <= now; k++){
    const S = STAGES[k], ks = S.kinds.filter(q => KINDS[q] || SHIPS[q]);
    for (const q of ks) newKinds.add(q);
    mana += 2; for (const I of islands) if (I.settled && I.id === active) for (let h = 0; h < 5; h++) heartAt(I);   // the village celebrates
    if (!awayQuiet) toast(`Ansehen +2. ${S.gate ? `Eine neue Zeit beginnt: ${S.n}.` : `Neu bei ${S.pop} Menschen: ${S.n}.`} ${andList(ks.slice(0, 5).map(unlockName))}${ks.length > 5 ? ' und mehr' : ''}.`, 6000);
    note(`${S.gate ? 'Neue Zeit' : 'Neue Stufe'}: ${S.n}. Jetzt zu bauen: ${andList(ks.map(unlockName))}.`);
  }
  renderBuildBar();
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
const producerOf = (I, k) => ORDER.find(q => KINDS[q] && !KINDS[q].fixed && (KINDS[q].prod === k || (KINDS[q].picks && KINDS[q].picks[k])) && KINDS[q].on.includes(I.type) && unlocked(q) && hasLife(I, q) && !(KINDS[q].spring && !I.river) && (!SPEC_OF_KIND[q] || specOf(I) === SPEC_OF_KIND[q]));
/* where a good can be made that cannot be made here: the islands with the right ground */
const specIslesFor = k => { const kind = ORDER.find(q => KINDS[q] && KINDS[q].prod === k && SPEC_OF_KIND[q]); if (!kind) return []; return islands.filter(J => J.discovered && specOf(J) === SPEC_OF_KIND[kind]); };
/* grown-ups without work while no place has room: more people do not help, only more places */
/* what makes more food here, the way the elders would say it */
const foodBuild = I => { const h = I.buildings, has = k => h.some(b => b.kind === k); return !has('ernte') ? 'ernte' : !has('fisch') ? 'fisch' : I.type === 'hoch' && unlocked('taro') ? 'taro' : I.type === 'atoll' && unlocked('pulaka') ? 'pulaka' : 'fisch'; };
const freeHands = I => { const sf = staffOf(I); return sf.free > 0 && !placesOf(I).some(b => (crewAt(I, b) || 0) < crewOf(b) && !sf.pulled.has(b)) ? sf.free : 0; };
function adviceOf(I, urgentOnly = false){
  if (!I || !I.settled) return null;
  const nd = needsOf(I), out = k => nd.list.some(n => n.k === k && n.state === 'out'), low = k => nd.list.some(n => n.k === k && n.state !== 'ok');
  const sites = I.buildings.some(b => b.bt && HOME_KINDS.has(b.kind)), has = k => I.buildings.some(b => b.kind === k), done = k => I.buildings.some(b => b.kind === k && !b.bt);
  const wsrc = 'ernte';   // the spring is there by itself where a stream flows; more water comes only from green nuts
  // a cyclone on the way comes before everything: about a minute to tie the roofs down
  { const S = I.storm; if (S && tick < S.at){ const hs = homesOf(I).filter(h => !h.bt), n = hs.filter(h => S.tied.includes(h.id)).length, secs = Math.ceil((S.at - tick) * TICK / 1000);
    const t = `Sturm in ${secs} s!`;
    if (!S.tie && n < hs.length) return {t, key:'sturm', d:`${hs.length - n} ${hs.length - n === 1 ? 'Dach ist' : 'Dächer sind'} lose. Alle an die Dächer: je Dach eine Schnur oder zwei Kokosfasern.`, tie:true, go:'Festbinden ›', urgent:true};
    if (n < hs.length && !tieCost(I)) return {t, key:'sturm', d:`${n} von ${hs.length} Dächern fest. Es fehlt Schnur oder Kokosfasern.`, ware:'schnur', urgent:true};
    if (n < hs.length) return {t, key:'sturm', d:`${n} von ${hs.length} Dächern fest. Die Leute binden.`, goto:(hs.find(h => !S.tied.includes(h.id)) || hs[0]).id, urgent:true};
  } }
  if (nd.roofless && !sites) return {t:'Hütten bauen', d:`${nd.roofless} ${nd.roofless === 1 ? 'Mensch schläft' : 'Menschen schlafen'} ohne Dach. Eine Hütte braucht Holz und Palmwedel.`, build:'haus', urgent:true};
  const goes = (I.hunger || 0) >= 10 && leaverOf(I) && famsOf(I).length > 1 ? ` Sonst fährt ${famName(leaverOf(I))} fort.` : '';
  { const cz = centerOf(I); if (cz && (I.stock.wasser || 0) < 4 && low('wasser') && !rainState(I)) return {t:'Regentanz', d:'Das Wasser geht aus. Am Dorfzentrum tanzt das Dorf und ruft den Regen: eine Weile Wasser für alle.', goto:cz.id, rain:true, urgent:true}; }
  if ((I.stock.wasser || 0) < 8 && low('wasser')) return {t:has(wsrc) || has('ernte') ? 'Mehr Wasser' : 'Wasser holen', d:goes + (freeHands(I) ? `${freeHands(I)} ${freeHands(I) === 1 ? 'ist' : 'sind'} frei, doch jeder Platz ist besetzt: ` : '') + (I.river ? 'Die Quelle am Bach reicht nicht mehr: Ein Erntehaus mehr holt grüne Nüsse zum Trinken.' : 'Hier fließt kein Bach: Das Erntehaus holt grüne Nüsse zum Trinken. Ein zweites hilft.'), build:'ernte', urgent:true};
  if (out('essen') || haveOf(I, 'essen') < 6 && low('essen')) return {t:'Mehr Essen', d:goes + (freeHands(I) ? `${freeHands(I)} ${freeHands(I) === 1 ? 'ist' : 'sind'} frei, doch jeder Platz für Nahrung ist besetzt: Ein Feld oder eine Fischerhütte mehr gibt Arbeit.` : 'Die Nahrung geht aus. Erntehaus, Fischerhütte und Gärten helfen, wer frei ist, sammelt.'), build:!has('ernte') ? 'ernte' : !has('fisch') ? 'fisch' : producerOf(I, 'nahrung') || 'fisch', urgent:true};
  { const s = immigFor(I); if (s && s.state === 'moored' && s.immig) return {t:'Ein Kanu fragt', d:`Familie ${s.immig.n} ${s.immig.from} möchte auf ${I.name} bleiben.`, immig:s.id, urgent:true}; }
  if (urgentOnly) return null;
  // a workplace whose good is short stands still for a reason the player can fix
  const stillB = placesOf(I).find(b => b.idle && ['near', 'dep', 'trees', 'use', 'nuts'].includes(b.idle.why) && prodOfB(b) && (I.stock[prodOfB(b)] || 0) < 5);
  if (stillB){ const w = stillB.idle.why === 'use' && stillB.idle.k ? needWay(I, stillB.idle.k) : null;   // what it lacks, and the building that makes it
    return {t:`${KINDS[stillB.kind].n} steht still`, d:stillB.idle.text + (stillB.idle.why === 'near' || stillB.idle.why === 'trees' ? ' Versetze den Platz dorthin.' : w && w.text ? ` ${w.text}.` : ''), goto:w && (w.build || w.fleet) ? null : stillB.id, build:w && w.build, fleet:w && w.fleet}; }
  const sf = staffOf(I), open = placesOf(I).filter(b => (crewAt(I, b) || 0) < KINDS[b.kind].crew && !sf.pulled.has(b));
  // a master family with free hands and no craft of its own: it wants its work
  { const M = masterSet(I), idle = sf.freeP.filter(id => M.has(id)), p = idle.length && I.people.find(q => q.id === idle[0]), f = p && famOf(I, p.h), h = f && f.home && findB(f.home);
    if (h && !craftOf(I, h) && !sf.rest) return {t:'Meisterfamilie ohne Werk', d:`${famName(f)} geht nicht mehr aufs Feld. Gib ihrem Haus ein Hauswerk: Meister arbeiten dort ein Viertel schneller.`, goto:h.id}; }
  if (open.length && sf.free && !autoWork(I)) return {t:'Arbeit verteilen', d:`${sf.free} ${sf.free === 1 ? 'Mensch ist' : 'Menschen sind'} frei, ${open.length} ${open.length === 1 ? 'Platz hat' : 'Plätze haben'} noch Raum. Tippe einen an und dann auf +.`, needs:true};
  // houses whose needs are met and whose material lies ready rise, as in Anno, when you say so
  { const r = I.autoUp ? [] : readyHomes(I, nd.list); if (r.length) return {t:'Ausbau', d:`${r.length} ${r.length === 1 ? 'Haus ist' : 'Häuser sind'} bereit: Tippe drauf, dann „Ausbauen“.`, goto:r[0].id}; }
  // leaking roofs: the families need palm fronds to cover them anew
  { const leaky = homesOf(I).filter(h => famOfHome(I, h) && roofState(h) !== 'ok').length, e = I.buildings.find(b => b.kind === 'ernte' && !b.bt);
    if (leaky && (I.stock.dach || 0) < 2) return e ? {t:'Dächer undicht', d:`${leaky} ${leaky === 1 ? 'Dach lässt' : 'Dächer lassen'} Regen durch. Die Familien decken neu mit Palmwedeln: Stell das Erntehaus auf Wedel.`, goto:e.id} : {t:'Dächer undicht', d:'Für neue Dächer braucht es Palmwedel. Das Erntehaus holt sie von den Palmen.', build:'ernte'}; }
  // what every building needs: wood and palm fronds
  if ((I.stock.dach || 0) < 3){ const e = I.buildings.find(b => b.kind === 'ernte'); if (!e) return {t:'Palmwedel holen', d:'Jedes Gebäude braucht Palmwedel fürs Dach. Das Erntehaus holt sie von den Palmen.', build:'ernte'}; if (!(e.v && e.v.pick === 'dach') && choiceOf(e) !== 'dach') return {t:'Palmwedel holen', d:'Im Erntehaus kannst du die Leute auf Wedel stellen, bis genug da ist.', goto:e.id}; }
  if ((I.stock.holz || 0) < 3 && I.type === 'hoch' && !has('faeller')) return {t:'Holz schlagen', d:'Jedes Gebäude braucht Holz. Ein Holzfäller am Waldrand, zu zweit.', build:'faeller'};
  // the next step up, as the houses show it: what the first house that cannot rise yet still lacks
  { const g = homesOf(I).filter(b => famOfHome(I, b) && tierOf(b) < 3).sort((a, b) => tierOf(a) - tierOf(b)).map(b => [b, upgradeSteps(I, b, nd.list)]).find(([, u]) => u && !u.ready);
    if (g && (tierOf(g[0]) > 1 || unlocked('schnur'))){ const [hb, u] = g, q = u.steps.find(x => !x.ok), k = q.k === 'needs' ? q.miss[0] : q.k, w = k ? (q.k === 'needs' ? wantWay(I, k, hb) : needWay(I, k)) : null;
      { const J = w && w.fleet && !w.build && k && k !== 'needs' ? tradeIdea(I, k) : null; if (J && tradeShip(I, J)){ const give = tradeGive(I, J, k); return {t:`Handel: ${GN[k]} aus ${J.name}`, d:`${J.name} hat ${GN[k]}. Ein Kanu fährt von selbst hin und her und bringt es${Object.keys(give).length ? `, ${giftText(give)} fahren dafür mit` : ''}. Tippen richtet die Kette ein.`, trade:{k, J:J.id}, go:'Einrichten ›'}; } }
      if (w && (w.build || w.fleet)) return {t:`Für ${u.T.n}: ${needName(k)}`, d:w.text, build:w.build && w.build !== 'haus' ? w.build : null, fleet:w.fleet, goto:w.build || w.fleet ? null : hb.id}; } }
  // growing needs more than the village eats: houses do not help while food or water only just reach
  { const m = !nd.atMax && I.pop >= 6 ? surplusMiss(I, nd.list) : ''; if (m){ const n = nd.list.find(q => q.k === m), gap = n ? Math.max(0, (n.use + n.work) * 1.15 - n.make) : 0;
      return {t:m === 'essen' ? 'Mehr Essen als gebraucht' : 'Mehr Wasser als gebraucht', d:`Zum Wachsen braucht das Dorf mehr, als es ${m === 'essen' ? 'isst' : 'trinkt'}: noch etwa +${perMin(gap)} pro Minute. Sonst kommen kaum Kinder und keine Familien. Hütten helfen erst danach.`, build:m === 'essen' ? foodBuild(I) : 'ernte'}; } }
  // no child for years: say why, before the grown-ups grow old with nobody after them
  { const y = yearsNoChild(I), why = y >= 3 && I.pop >= 8 ? birthWhy(I, nd.list) : ''; if (why){ const A = ageMix(I);
      return {t:`Seit ${Math.floor(y)} Jahren kein Kind`, d:`${why}${A.soon ? ` ${A.soon} ${A.soon === 1 ? 'wird' : 'werden'} in fünf Jahren alt.` : ''}`, needs:true, tab:'arbeit'}; } }
  if (nd.full && !nd.atMax && !emptyHome(I)) return {t:'Mehr Hütten', d:'Alle Hütten sind belegt. Eine leere Hütte zieht eine Familie von weit her an.', build:'haus'};
  if (I.pop >= 8 && kinState(I) !== 'ok') return {t:'Neues Blut', d:kinText(I).help, needs:true};
  const nextS = STAGES[stageNow() + 1]; if (nextS && !nextS.gate && I.pop < nextS.pop) return {t:`Auf ${nextS.pop} Menschen wachsen`, d:`Dann kommt: ${nextS.n}. Baut Hütten für Familien von weit her und Familienhäuser für Kinder.`, build:nd.full && !emptyHome(I) ? 'haus' : null, needs:!(nd.full && !emptyHome(I))};   // a hut only where all are full
  const miss = MASTER_GOODS.find(k => !(haveOf(I, k) > 0)); if (miss && I.pop >= VILLAGE_POP){ const p = producerOf(I, miss); return {t:`${GN[miss]} für die Meisterfamilien`, d:p ? `${doIt(p)}.` : `${GN[miss]} kommt per Kanu von einer anderen Insel.`, build:p, fleet:!p}; }
  // the fine goods of the chief's family: some grow only on islands with the right ground
  if (chiefFam(I)){ const k = CHIEF_GOODS.find(q => !(I.stock[q] > 0)); if (k){ const p = producerOf(I, k), isles = specIslesFor(k) || [];
    const sp = ORDER.find(q => KINDS[q] && KINDS[q].prod === k && SPEC_OF_KIND[q]);
    return {t:`${GN[k]} für die Häuptlingsfamilie`, d:p ? `${doIt(p)}.` : sp ? `${KINDS[sp].n} geht nur auf Inseln mit ${SPECS[SPEC_OF_KIND[sp]].n}${isles.length ? `, etwa ${isles[0].name}` : ''}. Besiedle sie oder handle.` : `${GN[k]} kommt per Kanu von anderswo.`, build:p, fleet:!p}; } }
  const step = hawaiki() && I.type === 'hoch' && islandMax(I) >= CHIEF.isle ? chiefSteps(I, nd).find(s => !s.ok) : null; if (step) return {t:'Weg zum Häuptlingsdorf', d:`Nächster Schritt: ${step.t} (${step.now}).`, needs:true};
  if (nd.atMax) return {t:'Neues Land besiedeln', d:'Die Insel ist voll. Schicke Familien im Kanu aus.', fleet:true};
  if (ratRate(I) >= .75 && unlocked('speicher') && !I.buildings.some(b => b.kind === 'speicher' && b.bt)) return {t:'Ratten im Vorrat', d:`Sie fressen etwa ${perMin(ratRate(I))} Feldfrüchte pro Minute. Ein Speicher auf Pfosten hält sie fern.`, build:'speicher'};
  { const hl = I.buildings.find(b => b.kind === 'halle' && !b.bt) || centerOf(I), T = FEASTS.find(q => q.id === 'tatau'), yo = youthsOf(I).length;
    if (hl && feastsOpen() && yo >= 3 && !feastState(I, T)) return {t:'Tatau', d:`${yo} junge Leute tragen noch kein Muster. Ansehen +${feastMana(I, T)}.`, goto:hl.id}; }
  { const hl = afterHarvest(I) && (I.buildings.find(b => b.kind === 'halle' && !b.bt) || centerOf(I)), F = hl && FEASTS.find(q => q.id !== 'schatz' && !feastState(I, q)); if (F) return {t:'Fest nach der Yamsernte', d:`${F.n}: jetzt Ansehen +${feastMana(I, F)}.`, goto:hl.id}; }
  { const cz = centerOf(I); if (cz && !I.str && I.pop >= 12) return {t:'Eine Stärke für das Dorf', d:'Jedes Dorf wird in etwas besonders gut: Töpfer, Fischer, Pflanzer, Weberinnen oder Navigatoren. Wählt am Dorfzentrum, im Reiter „Stärke“. Das Dorf arbeitet dann ein Viertel schneller darin.', goto:cz.id, tab:'staerke'}; }
  if (korCanThrow()) return {t:'Knöchelwurf', d:'Heute ist noch nicht geworfen.', koruru:true};
  return {t:'Erkunden und handeln', d:'Fahre mit dem Doppelkanu in den Nebel oder bring Gaben zu den Clans.', fleet:true};
}
let curAdvice = null;
function followAdvice(A){
  if (!A) return; closeSheet();
  if (A.koruru){ if (!kor || kor.state === 'done') korNew(); openSheet('koruru', {}); return; }
  if (A.tie){ tieRoofs(isl(active)); updateHUD(); return; }
  if (A.trade){ startTrade(isl(active), A.trade.k, isl(A.trade.J)); return; }
  if (A.ware){ openSheet('ware', {id:active, k:A.ware}); return; }
  if (A.immig){ const s = ships.find(q => q.id === A.immig); if (s){ flyTo(s.x, s.y, Math.max(cam.z, 2)); openSheet('immig', {ship:s.id}); } return; }
  if (A.needs){ openSheet('needs', A.tab ? {tab:A.tab} : undefined); return; }
  if (A.goto){ const b = findB(A.goto); if (b){ select(b); if (A.tab && sheetKind === 'info'){ sheetData = {...sheetData, tab:A.tab}; renderSheet(); } flyTo(b.x, b.y, Math.max(cam.z, 2.4)); } return; }
  if (A.fleet){ setBar('fleet'); return; }
  if (A.build) hintBuild(A.build);
}
function renderQuest(){
  const el = $('quest'), I = isl(active), A = !landing && I && I.settled ? (quest < QUESTS.length ? adviceOf(I, true) : adviceOf(I)) : null;
  const show = (quest < QUESTS.length || A) && !sheetKind && mode !== 'place' && mode !== 'move' && !landing;
  el.hidden = !show; curAdvice = A; el.classList.toggle('urgent', !!(A && A.urgent)); el.classList.toggle('advice', !!A); if (!show) return;
  // a new task or new advice slides in, so the eye catches that something changed
  { const key = A ? A.key || A.t : 'q' + quest; if (el.dataset.k !== key){ if (el.dataset.k && !reduced){ el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh'); } el.dataset.k = key; } }
  if (A){
    el.querySelector('.q-n').textContent = A.urgent ? 'Jetzt' : 'Die Alten';
    el.querySelector('.q-t').textContent = A.t; el.querySelector('.q-d').textContent = A.d; el.querySelector('.q-p').textContent = A.go || 'Zeigen ›';
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
    `<p><b>${dOf(Q)}</b></p><span class="mbar big"><i style="width:${n / Q.of * 100}%"></i></span><details class="more"><summary>Warum</summary><p class="sub">${qn(Q.why)}</p></details>` +
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
  if (s.ship){ const sh = own().find(q => q.kind === s.ship) || (s.ship === 'vaka' ? null : own()[0]); if (sh){ steerShip(sh); return; } }
  if (s.center){ const b = centerOf(isl('heimat')); if (b){ flyTo(b.x, b.y, Math.max(cam.z, 1.8)); select(b); return; } }
  if (s.sheet || s.ship){ const b = isl('heimat').buildings.find(x => x.kind === (s.sheet || 'werft')) || islands.filter(J => J.settled).flatMap(J => J.buildings).find(x => x.kind === (s.sheet || 'werft')); if (b){ flyTo(b.x, b.y, Math.max(cam.z, 1.8)); select(b); return; } }
  if (s.needs){ openSheet('needs'); return; }
  if (s.fleet){ openSheet('fleet'); return; }
  if (s.route){ const i = routes.findIndex(r => r.a === s.route || r.b === s.route); if (i >= 0){ const I2 = isl(s.route); flyTo(I2.harbor.x, I2.harbor.y, Math.min(cam.z, 1)); openRoute(i); return; } }
  if (I.settled) setActive(id);
  if (lod === 'far' || !boxIn(I.box, view())) fitBox(I.box, 1.6);
  if (s.build) hintBuild(questLock(Q) ? 'haus' : s.build);
}
function hintBuild(kind){
  if (KINDS[kind] && KINDS[kind].craft){ showCraft(kind); return; }
  setBuildOpen(true);
  if (DECO.includes(kind) !== (buildTab === 'deco')){ buildTab = DECO.includes(kind) ? 'deco' : 'bau'; renderBuildBar(); }
  const b = $('buildList').querySelector(`[data-kind="${kind}"]`); if (!b) return;
  b.classList.remove('hint'); void b.offsetWidth; b.classList.add('hint');
  b.scrollIntoView({inline:'center', block:'nearest', behavior:reduced ? 'auto' : 'smooth'});
  setTimeout(() => b.classList.remove('hint'), 4200);
}
/* A household craft is not built: the sheet of a house that can take it up opens. Where none can, because the clay or the
   pandanus are elsewhere, the build bar offers a hut there. */
function showCraft(k){
  const I = isl(active), K = KINDS[k], ok = homesOf(I).filter(h => !craftWhy(I, h, k)).sort((a, b) => !famOfHome(I, a) - !famOfHome(I, b));
  const h = ok.find(q => !craftOf(I, q)) || ok.find(q => craftOf(I, q).kind === k) || ok[0];
  if (h){ closeSheet(); flyTo(h.x, h.y, Math.max(cam.z, 2.2)); select(h); if (sheetKind === 'info'){ sheetData = {...sheetData, tab:'haus', crafts:true}; renderSheet(); } return; }   // the choice of crafts open, also in the village centre
  const why = craftIsle(I, k); if (why){ toast(`${K.craft}: ${why}.`, 3200, false); return; }
  toast(`${K.craft} geht ${K.dep ? `nur nah am ${DEPOSITS[K.dep].n}` : `nur nah bei ${NEAR_PL[K.near.kind]}`}. Baue dort eine Hütte, die Familie macht es dann.`, 4200, false);
  const p = craftPlace(I, k); setBuildOpen(true); if (!p || !canPay(I, costOf('haus', I))){ hintBuild('haus'); return; }
  startPlace('haus'); if (placing){ const s = findSpot(I, 'haus', p); if (s){ placing.x = s.x; placing.y = s.y; ghostRender(); } }
}
/* The finger: in the first tasks it bounces over the button that comes next, the build button, then the building, then
   "Bauen" on the spot. No words needed. */
const FINGER_SVG = '<svg viewBox="0 0 24 30" aria-hidden="true"><path d="M10 2.5Q12 1.5 13 3.5V14L14.5 12.5Q16.5 11.8 17 13.5L18 13Q20 12.6 20.3 14.6L21 14.4Q22.8 14.3 22.6 16.5V21Q22.4 26 18 28.5H11.5Q8 27 6.5 23L3.8 17.4Q3 15.5 4.8 15Q6.2 14.8 7.4 16.5L9 18.8V4Q9.2 2.8 10 2.5Z" fill="#F3D9A0" stroke="#2B1D14" stroke-width="1.3" stroke-linejoin="round"/><path d="M13 14V18M17 13.5V18M20.3 14.6V18.4" stroke="#2B1D14" stroke-width=".9" stroke-linecap="round"/></svg>';
const fingerEl = (() => { const d = document.createElement('div'); d.id = 'finger'; d.innerHTML = FINGER_SVG; d.hidden = true; $('app').appendChild(d); return d; })();
function fingerTarget(){
  const Q = QUESTS[quest], H = isl('heimat'); if (landing || !Q || quest >= 10 || sheetKind || !H) return null;
  if (mode === 'place') return placing && placing.ok && !placing.founding ? $('placeOk') : null;
  const k = Q.show && Q.show.build; if (!k || !unlocked(k) || KINDS[k].craft || Q.n() >= Q.of || H.buildings.some(b => b.kind === k && b.bt)) return null;
  if (!$('bottom').classList.contains('open') || $('bottom').classList.contains('fleet')) return $('buildBtn');
  return $('buildList').querySelector(`[data-kind="${k}"]`);
}
setInterval(() => {
  const t = fingerTarget(); if (!t || t.offsetParent === null){ fingerEl.hidden = true; return; }
  const r = t.getBoundingClientRect(), a = $('app').getBoundingClientRect(); if (r.right < a.left + 8 || r.left > a.right - 8){ fingerEl.hidden = true; return; }
  fingerEl.hidden = false; fingerEl.style.left = (r.left - a.left + r.width / 2 - 14) + 'px'; fingerEl.style.top = (r.top - a.top - 36) + 'px';
}, 300);
$('quest').addEventListener('click', () => { if (curAdvice){ toast(curAdvice.d, 3600, false); followAdvice(curAdvice); return; } openSheet('quest'); });
