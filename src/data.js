'use strict';
/* Goods, buildings, needs and the rules of exchange */

const TICK = 2000, DAY = 3, AGE_FULL = 150, LOAD = 12, SAVE_KEY = 'polinusa-5', OLD_KEYS = ['polinusa-3', 'polinusa-4'];

const GOODS = ['haken','kumete','nahrung','fisch','meeres','wild','kokos','eier','speisen','wasser','holz','dach','schnur','faser','schalen','harz','muschel','blaetter','steine','kalk','kurkuma','hauer','reste','proviant','toepfe','beile','klingen','matten','tapa','oel','feinmatten','bemtapa','duftoel','schweine','kava','schmuck','perlmutt','federn','tabua'];
/* A group stands for any of its goods, the first in the list goes first: fire burns coconut shells before wood */
const GROUPS = {brenn:['schalen', 'holz'], futter:['reste', 'kokos', 'nahrung'], roh:['nahrung', 'fisch', 'meeres', 'wild'], zier:['muschel', 'hauer']};
const TREASURE_GOODS = ['perlmutt', 'federn', 'tabua'];   // found only on the treasure islands
const GN = {haken:'Angelhaken', kumete:'Holzschalen', essen:'Nahrung', eier:'Eier', speisen:'Gekochtes', blaetter:'Blätter', steine:'Kochsteine', kalk:'Korallenkalk', kurkuma:'Kurkuma', hauer:'Eberhauer', reste:'Reste', feinmatten:'Feine Matten', bemtapa:'Bemalte Tapa', duftoel:'Duftöl', futter:'Futter', roh:'Rohe Speisen', zier:'Schalen oder Hauer', nahrung:'Feldfrüchte', fisch:'Fisch', meeres:'Meeresfrüchte', wild:'Wildbeute', kokos:'Kokosnüsse', wasser:'Wasser', holz:'Holz', dach:'Palmwedel', faser:'Kokosfasern', schalen:'Kokosschalen', harz:'Brotfruchtharz', muschel:'Muschelschalen', brenn:'Brennstoff', proviant:'Proviant', toepfe:'Töpfe', beile:'Steinbeile', klingen:'Klingen', matten:'Matten', schnur:'Schnur', tapa:'Tapa', oel:'Kokosöl', schweine:'Schweine', kava:'Kava', schmuck:'Muschelschmuck', perlmutt:'Perlmutt', federn:'Rote Federn', tabua:'Walzähne'};
const G1 = {haken:'Angelhaken', kumete:'Holzschale', essen:'Nahrung', eier:'Ei', speisen:'Gekochtes', blaetter:'Blatt', steine:'Kochstein', kalk:'Korallenkalk', kurkuma:'Kurkuma', hauer:'Eberhauer', reste:'Rest', feinmatten:'Feine Matte', bemtapa:'Bemalte Tapa', duftoel:'Duftöl', futter:'Futter', roh:'Rohe Speise', zier:'Schale oder Hauer', nahrung:'Feldfrucht', fisch:'Fisch', meeres:'Meeresfrüchte', wild:'Wildbeute', kokos:'Kokosnuss', wasser:'Wasser', holz:'Holz', dach:'Palmwedel', faser:'Kokosfaser', schalen:'Kokosschale', harz:'Brotfruchtharz', muschel:'Muschelschale', brenn:'Brennstoff', proviant:'Proviant', toepfe:'Topf', beile:'Steinbeil', klingen:'Klinge', matten:'Matte', schnur:'Schnur', tapa:'Tapa', oel:'Kokosöl', schweine:'Schwein', kava:'Kava', schmuck:'Muschelring', perlmutt:'Perlmutt', federn:'rote Feder', tabua:'Walzahn'};

/* Places on the map where raw material lies. Workshops that need one must stand close by. */
const DEPOSITS = {
  ton:{n:'Ton', where:'Ton liegt am Bach oder in feuchten Senken.'},
  basalt:{n:'Basalt', where:'Basalt findest du an den grauen Felsen.'},
  obsidian:{n:'Obsidian', where:'Obsidian gibt es nur am Hang eines Vulkans.'}
};
/* prod: what it makes, every: ticks per piece with the full crew, use: what each piece uses up, bt: ticks to build with two
   builders (or to grow, for plants), crew: people it needs to work; while they work there they do nothing else,
   team: how the work goes with fewer hands (see TEAM), picks: a place that gets what is needed most (see choiceOf),
   boost: a tool that wears out (k, used up every per pieces); without it the work is slow times slower, water: stands in the
   lagoon, inland: least distance from the beach, dep: deposit within depR, near: at least n of a kind within r (plants or a
   garden), coast: on the beach, beauty: how much it adorns the village. Every building with a roof costs wood and palm
   fronds; sennit comes later, for the second step of a house and for canoes. */
/* Growing (grow): a garden is built in a moment, but what is planted bears only after a while, as in life: taro after
   most of a year, bananas after a year, kava after years. The game counts these in ticks (a year is 360) and shortens
   them, but keeps their order. Trees planted from a seedling (plant) grow for their bt: a breadfruit tree some years, a
   coconut palm longer still. Meanwhile the settlers live from the sea, the wild and the palms already standing. */
const KINDS = {
  faeller:{n:'Holzfäller', s:'Holz', on:['hoch'], crew:2, team:'pair', bt:24, cost:{holz:2, dach:2}, r:11, hy:6, prod:'holz', every:6, trees:{r:80}, boost:{k:'beile', per:20, slow:1.5}, roof:true, info:'Fällt Bäume am Waldrand. Zu zweit: Einer schlägt mit dem Beil, der andere zieht den Stamm am Seil zur Seite, so bricht er viel früher. Allein dauert jeder Baum dreimal so lang. Mit Steinbeilen geht es schneller, ein Beil hält für 20 Holz.', vb:'-18 -17 36 21'},
  pflanzer:{n:'Baumpflanzer', s:'Pflanzer', on:['hoch'], crew:1, team:'solo', bt:16, cost:{holz:1, dach:1}, r:11, hy:6, every:8, plants:{r:70}, roof:true, info:'Setzt junge Bäume auf Stümpfe und an den Waldrand.', vb:'-18 -17 36 21'},
  haus:{n:'Hütte', s:'Hütte', on:['hoch','atoll'], bt:32, cost:{hoch:{holz:4, dach:4}, atoll:{holz:3, dach:5}}, r:10, hy:12, cap:4, roof:true, info:'Pfosten aus Holz, ein Dach aus Palmwedeln: das Zuhause einer Familie, bis 4 Menschen. Steht eine Hütte leer, kommt bald ein Kanu mit einer Familie von weit her und fragt, ob sie bleiben darf. Mit Kokosfasern und Sennit gebunden wird sie zum Familienhaus, mit Platz für Kinder.', vb:'-17 -29 34 33'},
  taro:{n:'Tarofeld', s:'Taro', on:['hoch'], crew:1, team:'solo', soil:true, grow:150, bt:12, cost:{holz:1}, r:10, hy:0, prod:'nahrung', by:{blaetter:.5}, every:8, info:'Taro ist das wichtigste Essen der hohen Inseln. Das Feld wird mit dem Grabstock bestellt.', vb:'-13 -11 26 22'},
  // the yam year: set in mounds in the rains, the vines climb stakes, the whole field is dug up as the lean time begins
  yams:{n:'Yamsgarten', s:'Yams', on:['hoch'], crew:2, team:'pair', soil:true, bt:14, cost:{holz:2}, r:10, hy:7, prod:'nahrung', yam:{plant:'sturm', harvest:'mager', work:22, out:16}, info:'Yams werden in Hügel gelegt, die Ranken klettern an Stangen. Gepflanzt wird in der Regenzeit, geerntet wird alles auf einmal, wenn die magere Zeit beginnt. Yams halten sich monatelang. Für die Lapita-Leute waren Yams, Taro und Bananen die wichtigsten Feldfrüchte.', vb:'-13 -15 26 20'},
  pulaka:{n:'Pulakagrube', s:'Pulaka', on:['atoll'], crew:1, team:'solo', soil:true, grow:210, bt:20, cost:{holz:1}, r:10, hy:3, prod:'nahrung', by:{blaetter:.5}, every:9, inland:9, info:'Eine Grube bis zum Süßwasser im Sand. Darin wächst Sumpftaro. Braucht Platz in der Mitte eines Motus.', vb:'-12 -10 24 16'},
  fisch:{n:'Fischerhütte', s:'Fischer', on:['hoch','atoll'], crew:2, team:'pair', bt:24, cost:{holz:3, dach:2}, r:8, hy:4, prod:'fisch', picks:{fisch:{n:'Fisch', out:2}, meeres:{n:'Meeresfrüchte', out:2}, muschel:{n:'Muscheln', out:2}, steine:{n:'Kochsteine', out:2}}, every:5, trip:true, canoe:30, boost:{k:'schnur', per:10, slow:2}, coast:true, roof:true, info:'Zwei fahren im Auslegerkanu hinaus, immer zu zweit: einer steuert, einer fischt. Sie holen, was gebraucht wird: Fisch mit Angel und Netz am Riffrand, oder sie waten bei Ebbe über das Riffdach und sammeln Muscheln, Kraken, Seeigel und Korallensteine für den Erdofen. Allein fischt einer nur mit dem Speer vom Strand. Mit Netzen aus Sennit fangen sie doppelt so viel. Am Strand.', vb:'-12 -14 26 18'},
  taucher:{n:'Tauchplatz', s:'Taucher', on:['hoch','atoll'], crew:2, team:'pair', bt:30, cost:{holz:2, dach:2}, r:9, hy:5, prod:'meeres', every:4, trip:true, dive:true, canoe:40, coast:true, roof:true, info:'Zwei Taucher holen Riesenmuscheln, Kraken und Seegurken. Auf Atollen werden aus den Schalen Beile, vor Tifa holen sie Perlmuscheln. Am Strand.', vb:'-15 -16 32 20'},
  steg:{n:'Kanusteg', s:'Steg', on:['hoch','atoll'], bt:24, cost:{holz:4}, r:9, hy:3, coast:true, serves:4, canoe:40, info:'Ein Steg mit Einbaum. Bringt Leute zu bis zu 4 Pfahlhäusern oder auf ein anderes Motu.', vb:'-6 -9 36 16'},
  toepfer:{n:'Töpferei', s:'Töpfe', on:['hoch'], crew:2, team:'hand', bt:40, cost:{holz:3, dach:2}, r:11, hy:6, prod:'toepfe', every:10, use:{brenn:1}, boost:{k:'kalk', per:4, slow:1.5}, dep:'ton', depR:60, roof:true, info:'Hand in Hand: Eine formt die Töpfe aus Tonwülsten und stempelt die Muster, der andere hält das Feuer. Gebrannt wird mit Kokosschalen oder Holz. Mit Korallenkalk füllen die Töpfer die gestempelten Muster weiß, wie die Lapita, und es geht schneller. Muss nah am Ton stehen.', vb:'-16 -17 34 21'},
  beil:{n:'Beilwerkstatt', s:'Beile', on:['hoch'], crew:2, team:'solo', bt:40, cost:{holz:3, dach:2}, r:11, hy:6, prod:'beile', by:{steine:1}, every:10, dep:'basalt', depR:60, roof:true, info:'Schleift Steinbeile aus Basalt, auf Sandstein mit Wasser, tagelang. Muss nah am Felsen stehen.', vb:'-18 -17 36 21'},
  klingen:{n:'Klingenschläger', s:'Klingen', on:['hoch'], crew:2, team:'solo', bt:40, cost:{holz:3, dach:2}, r:11, hy:6, prod:'klingen', every:12, dep:'obsidian', depR:60, roof:true, info:'Schlägt scharfe Klingen aus Obsidian. Nur am Vulkan.', vb:'-18 -17 36 21'},
  flecht:{n:'Flechthütte', s:'Matten', on:['atoll'], crew:1, team:'solo', bt:30, cost:{holz:2, dach:2}, r:10, hy:6, prod:'matten', every:10, near:{kind:'pandanus', n:2, r:60}, roof:true, info:'Flicht Matten aus Pandanus. Braucht 2 Pandanus in der Nähe.', vb:'-17 -17 34 21'},
  schnur:{n:'Seilerei', s:'Sennit', on:['hoch','atoll'], crew:1, team:'solo', bt:22, cost:{holz:2, dach:2}, r:10, hy:6, prod:'schnur', every:6, use:{faser:1}, roof:true, info:'Dreht Sennit aus Kokosfasern, auf dem Oberschenkel gerollt: die Schnur, mit der Häuser und Kanus gebunden werden, und die Netze der Fischer. Salzwasser macht ihr nichts.', vb:'-14 -17 30 21'},
  schmuck:{n:'Schmuckschleiferei', s:'Schmuck', on:['atoll'], crew:2, team:'hand', bt:40, cost:{holz:3, dach:2}, r:11, hy:6, prod:'schmuck', every:22, use:{klingen:1, zier:2}, coast:true, roof:true, info:'Schleift Armringe aus Muscheln. Braucht Klingen. Am Strand.', vb:'-17 -17 36 21'},
  ernte:{n:'Erntehaus', s:'Ernte', on:['hoch','atoll'], crew:2, team:'pair', bt:20, cost:{holz:2, dach:2}, r:10, hy:6, prod:'kokos', picks:{kokos:{n:'Reife Nüsse', out:1, by:{faser:1, schalen:.5}}, wasser:{n:'Grüne Nüsse', out:2}, dach:{n:'Palmwedel', out:1}, holz:{n:'Alte Stämme', out:3, slow:4}}, every:4, near:{kind:'palme', n:3, r:90}, roof:true, info:'Die Leute vom Erntehaus nutzen die Kokospalmen ringsum, zu zweit: Einer klettert mit der Fußschlinge aus Kokosfaser hinauf, der andere sammelt unten und schält die Faserhülle am spitzen Pfahl ab. Reife Nüsse geben Nahrung, Fasern und Schalen, grüne Nüsse Wasser, die Wedel decken die Dächer, und eine alte Palme gibt Holz. Sie holen, was am meisten fehlt. Braucht 3 Palmen in der Nähe; je mehr Palmen, desto mehr Ernte.', vb:'-17 -17 34 21'},
  pansammler:{n:'Pandanussammlerin', s:'Frucht', on:['atoll'], crew:1, team:'solo', bt:16, cost:{holz:1}, r:9, hy:3, prod:'nahrung', every:6, near:{kind:'pandanus', n:2, r:60}, info:'Sammelt Pandanusfrüchte. Gekocht oder als getrocknete Paste sind sie auf Atollen ein Grundnahrungsmittel. Braucht 2 Pandanus in der Nähe.', vb:'-12 -11 24 16'},
  harzer:{n:'Harzsammler', s:'Harz', on:['hoch'], crew:1, team:'solo', bt:20, cost:{holz:1}, r:9, hy:4, prod:'harz', every:10, near:{kind:'baum', n:2, r:70}, info:'Ritzt die Rinde der Brotfruchtbäume und fängt den Milchsaft in Schalen. Damit werden die Planken der Kanus abgedichtet. Braucht 2 Brotfruchtbäume in der Nähe.', vb:'-13 -12 26 18'},
  quelle:{n:'Quelle', s:'Quelle', on:['hoch'], crew:1, team:'solo', bt:12, cost:{holz:2, dach:1}, r:7, hy:4, prod:'wasser', every:6, spring:true, info:'Wasser vom Bach, in Kokosschalen und Bambus getragen. Nur am Bach.', vb:'-12 -12 24 17'},
  brunnen:{n:'Brunnen', s:'Brunnen', on:['atoll'], crew:1, team:'solo', bt:20, cost:{holz:2}, r:7, hy:3, prod:'wasser', every:6, inland:9, info:'Ein Loch bis zum Süßwasser, das im Sand über dem Meerwasser schwimmt. Nur in der Mitte eines Motus.', vb:'-12 -11 24 15'},
  oelhuette:{n:'Ölhütte', s:'Öl', on:['hoch','atoll'], crew:1, team:'solo', bt:30, cost:{holz:2, dach:2}, r:10, hy:6, prod:'oel', every:10, use:{kokos:2}, roof:true, info:'Raspelt Kokosfleisch und lässt das Öl in der Sonne austreten, 2 Nüsse je Öl. Öl pflegt Haut und Haar.', vb:'-17 -17 34 21'},
  umu:{n:'Erdofen', s:'Umu', on:['hoch','atoll'], crew:2, team:'hand', bt:18, cost:{holz:1}, r:9, hy:3, prod:'speisen', out:3, by:{reste:1}, every:6, use:{roh:2, brenn:1, blaetter:1}, boost:{k:'steine', per:12, slow:2}, info:'Hand in Hand: Einer heizt die Steine in der Grube, die andere wickelt Taro, Fisch und Brotfrucht in Blätter; dann kommt Erde darüber. 2 rohe Speisen werden 3 Gekochtes. Familienhäuser wollen Gekochtes.', vb:'-12 -10 24 15'},
  kalkbrenner:{n:'Kalkbrenner', s:'Kalk', on:['hoch','atoll'], crew:1, team:'solo', bt:24, cost:{holz:2}, r:9, hy:4, prod:'kalk', every:10, use:{brenn:1}, coast:true, info:'Brennt Korallen vom Riff zu weißem Kalk. Damit werden die Muster der Töpfe gefüllt. Am Strand.', vb:'-12 -12 24 17'},
  kurkumagarten:{n:'Kurkumagarten', s:'Kurkuma', on:['hoch'], crew:1, team:'solo', soil:true, grow:150, bt:16, cost:{holz:1}, r:10, hy:2, prod:'kurkuma', every:12, info:'Aus der Wurzel wird gelbe Farbe für Tapa und Salbe für die Haut.', vb:'-12 -11 24 17'},
  huehnerhof:{n:'Hühnerhof', s:'Hühner', on:['hoch','atoll'], crew:1, team:'solo', bt:18, cost:{holz:2, dach:1}, r:9, hy:4, prod:'eier', every:6, feed:.6, info:'Hühner kamen mit den Lapita. Sie legen Eier, wenn sie Futter haben: Reste, Kokos oder Taro.', vb:'-12 -11 24 16'},
  weberin:{n:'Feinweberin', s:'Feinmatte', on:['hoch','atoll'], crew:1, team:'solo', bt:30, cost:{holz:2, dach:2}, r:10, hy:6, prod:'feinmatten', every:16, use:{matten:2}, roof:true, info:'Flicht aus feinsten Pandanusstreifen die Ehrenmatten, wochenlange Arbeit. Sie sind die größten Gaben bei Hochzeit und Tod.', vb:'-17 -17 34 21'},
  malerin:{n:'Tapamalerin', s:'Malerin', on:['hoch'], crew:1, team:'solo', bt:30, cost:{holz:2, dach:2}, r:10, hy:6, prod:'bemtapa', every:14, use:{tapa:1, kurkuma:1}, roof:true, info:'Bemalt Tapa mit Mustern in Kurkumagelb und Erdbraun.', vb:'-17 -17 34 21'},
  // one-piece fishhooks and trolling lures of shell and pearl shell, ground with coral files: typical Lapita finds
  hakenmacher:{n:'Hakenschleifer', s:'Haken', on:['hoch','atoll'], crew:1, team:'solo', bt:20, cost:{holz:1}, r:9, hy:5, prod:'haken', every:10, use:{muschel:1}, roof:true, info:'Schleift Angelhaken und Schleppköder aus Muschel und Perlmutt, mit Korallenfeilen und Sand. Mit Haken fangen die Fischer mehr Fisch.', vb:'-17 -17 34 21'},
  // wooden bowls: in Tonga and Samoa they took the place of pots, which were no longer made from about 2000 years ago
  schnitzer:{n:'Schalenschnitzer', s:'Schalen', on:['hoch','atoll'], crew:1, team:'solo', bt:20, cost:{holz:1}, r:9, hy:5, prod:'kumete', every:12, use:{holz:1}, roof:true, info:'Schnitzt Schalen aus Holz, mit Beil und Korallenfeile. In Hawaiki treten sie an die Stelle der Töpfe.', vb:'-17 -17 34 21'},
  duftoel:{n:'Duftölhütte', s:'Duftöl', on:['hoch','atoll'], crew:1, team:'solo', bt:30, cost:{holz:2, dach:2}, r:10, hy:6, prod:'duftoel', every:12, use:{oel:1}, near:{kind:['hibiskus', 'blumen'], n:1, r:60}, roof:true, info:'Legt Blüten in Kokosöl, bis es duftet. Braucht Blumen oder Hibiskus in der Nähe.', vb:'-17 -17 34 21'},
  gaergrube:{n:'Gärgrube', s:'Grube', on:['hoch'], crew:1, team:'solo', bt:20, cost:{holz:1}, r:9, hy:2, prod:'proviant', every:6, use:{nahrung:1}, near:{kind:'baum', n:2, r:70}, info:'Brotfrucht gärt hier zu Proviant, 1 Feldfrucht je Proviant. Nur Proviant geht mit ins Unbekannte. Braucht 2 Brotfruchtbäume in der Nähe.', vb:'-12 -9 25 14'},
  garten:{n:'Maulbeergarten', s:'Maulbeer', on:['hoch'], bt:16, cost:{holz:1}, r:10, hy:2, info:'Aus seiner Rinde wird Tapa. Die Klopfhütte muss daneben stehen.', vb:'-12 -10 24 17'},
  klopf:{n:'Klopfhütte', s:'Tapa', on:['hoch'], crew:2, team:'hand', bt:36, cost:{holz:3, dach:2}, r:11, hy:6, prod:'tapa', every:12, near:{kind:'garten', n:1, r:60}, roof:true, info:'Hand in Hand: Eine schält die Rinde ab und weicht sie ein, die andere klopft sie auf dem Holzbalken dünn. Braucht einen Maulbeergarten in der Nähe.', vb:'-17 -17 36 21'},
  pferch:{n:'Schweinepferch', s:'Schweine', on:['hoch'], crew:1, team:'solo', bt:30, cost:{holz:4}, r:12, hy:4, prod:'schweine', by:{hauer:.3}, every:18, use:{nahrung:2}, feed:.25, info:'Schweine fressen Reste, Kokos und Taro, jedes Tier laufend. Ohne Futter werden es weniger. Sie sind das Festessen, ihre Hauer werden Schmuck.', vb:'-14 -12 28 18'},
  sternhaus:{n:'Haus der Navigatoren', s:'Navigator', on:['hoch','atoll'], crew:1, bt:40, cost:{holz:4, dach:3, matten:1}, r:11, hy:7, max:1, roof:true, info:'Hier lernt ein Navigator Sterne, Wellen und Vögel. Stirbt er ohne Schüler, ist das Wissen verloren.', vb:'-18 -17 38 22'},
  werft:{n:'Kanuhaus', s:'Kanuhaus', on:['hoch'], bt:50, cost:{holz:6, dach:4, schnur:2}, r:16, hy:6, max:1, coast:true, roof:true, info:'Hier entstehen die Kanus. Es steht am Strand.', vb:'-21 -19 44 24'},
  pfahl:{n:'Pfahlhaus', s:'Pfahlhaus', on:['hoch','atoll'], bt:44, cost:{holz:5, dach:4, schnur:2}, r:11, hy:18, cap:4, water:true, roof:true, info:'Ein Zuhause in der Lagune, auf Pfosten wie die Häuser der Lapita in Talepakemalai. Ein Einbaum vom Kanusteg bringt die Leute an Land.', vb:'-17 -34 34 37'},
  speicher:{n:'Speicher', s:'Speicher', on:['hoch','atoll'], bt:30, cost:{holz:3, dach:3}, r:8, hy:12, store:10, roof:true, info:'+10 Platz für jede Ware. Er steht auf Pfosten mit Rattenschutz: Ein Speicher halbiert, was die Ratten aus dem Vorrat fressen, zwei halten sie ganz fern.', vb:'-12 -28 24 30'},
  ahnenhaus:{n:'Ahnenhaus', s:'Ahnen', on:['hoch','atoll'], bt:46, cost:{holz:4, dach:3}, r:9, hy:15, max:1, roof:true, beauty:2, info:'Hier ruhen die Schädel der Ahnen, wie bei den Lapita in Teouma. Jeder Tote bringt dem Clan Ansehen.', vb:'-14 -32 28 35'},
  fale:{n:'Häuptlingshaus', s:'Häuptling', on:['hoch'], bt:70, cost:{holz:8, dach:6, schnur:4, feinmatten:1}, r:15, hy:20, max:1, cap:10, roof:true, beauty:2, info:'Das große Haus der Häuptlingsfamilie, auf starken Pfosten wie die Häuser der Lapita an der Lagune. Hier lebt die Matriarchin: Wie in Tonga steht die Schwester des Häuptlings im Rang über ihm. Ihre Familie braucht das Feinste.', vb:'-21 -34 42 37'},
  halle:{n:'Versammlungshaus', s:'Dorfhaus', on:['hoch'], bt:70, cost:{holz:8, dach:6, schnur:3}, r:19, hy:16, max:1, near:{kind:'platz', n:1, r:70}, roof:true, info:'Das Herz des Dorfes, am Dorfplatz. Hier werden Feste gefeiert. Familien ohne Haus schlafen hier unter Matten.', vb:'-21 -34 42 37'},
  platz:{n:'Dorfplatz', s:'Dorfplatz', on:['hoch','atoll'], bt:0, cost:{}, r:20, hy:2, fixed:true, info:'Der Platz vor dem ersten Haus: festgetretene Erde, eine Feuerstelle mit Kochsteinen. Hier sitzt man abends zusammen, hier spielen die Kinder. Das Versammlungshaus gehört an den Dorfplatz.', vb:'-24 -13 48 26'},
  palme:{n:'Kokospalme', s:'Palme', on:['hoch','atoll'], bt:300, cost:{}, r:5, hy:10, beach:true, plant:true, info:'Nüsse, Fasern, Schalen und Wedel, ein Baum für alles. Das Erntehaus erntet sie; eine junge Palme trägt erst nach Jahren.', vb:'-13 -25 26 28'},
  // canarium almonds: tall trees with hard, oily nuts, found at Lapita places; they bear late and keep a long time
  nussbaum:{n:'Kanarinussbaum', s:'Nüsse', on:['hoch'], bt:420, cost:{}, r:7, hy:12, prod:'nahrung', every:10, by:{proviant:.34}, plant:true, info:'Ein hoher Baum mit harten, öligen Nüssen. Er braucht lange, bis er trägt; dann gibt er Feldfrüchte, und jede dritte Nuss wird getrocknet und geht als Proviant mit aufs Meer.', vb:'-10 -25 20 27'},
  baum:{n:'Brotfruchtbaum', s:'Baum', on:['hoch'], bt:240, cost:{}, r:7, hy:9, prod:'nahrung', every:8, plant:true, info:'Trägt Brotfrucht für Essen und Gärgrube, sein Milchsaft dichtet Kanus; gefällt gibt er Holz für Kanus.', vb:'-10 -21 20 23'},
  pandanus:{n:'Pandanus', s:'Pandanus', on:['atoll'], bt:150, cost:{}, r:5, hy:9, beach:true, plant:true, info:'Die Blätter werden zu Matten, Segeln und Dachdeckung.', vb:'-10 -21 20 23'},
  bananen:{n:'Bananenhain', s:'Bananen', on:['hoch'], crew:1, team:'solo', grow:180, bt:20, cost:{holz:1}, r:10, hy:8, prod:'nahrung', by:{blaetter:1}, every:6, info:'Bananen vom Großen Land. Sie tragen das ganze Jahr und zehren nicht am Boden.', vb:'-13 -17 26 22'},
  kavagarten:{n:'Kavagarten', s:'Kava', on:['hoch'], crew:1, team:'solo', soil:true, grow:300, bt:20, cost:{holz:1}, r:10, hy:3, prod:'kava', every:14, info:'Die Wurzel gibt das Getränk der Zeremonien.', vb:'-12 -12 24 19'},
  // things that only make the village beautiful
  hibiskus:{n:'Hibiskus', s:'Hibiskus', on:['hoch','atoll'], bt:16, cost:{}, r:5, hy:6, plant:true, beauty:1, info:'Rote Blüten für Haar und Kränze.', vb:'-9 -14 18 16'},
  blumen:{n:'Blumenbeet', s:'Blumen', on:['hoch','atoll'], bt:12, cost:{holz:1}, r:7, hy:3, beauty:2, info:'Duftende Tiare und Hibiskus, eingefasst mit Holz.', vb:'-11 -9 22 14'},
  fackel:{n:'Fackel', s:'Fackel', on:['hoch','atoll'], bt:8, cost:{holz:1}, r:4, hy:14, beauty:1, info:'Leuchtet bei Festen am Abend.', vb:'-6 -19 12 21'},
  pfosten:{n:'Ahnenpfosten', s:'Pfosten', on:['hoch','atoll'], bt:24, cost:{holz:2}, r:6, hy:18, beauty:3, info:'Ein geschnitzter Pfosten mit dem Gesicht der Ahnen.', vb:'-7 -26 14 28'},
  trommel:{n:'Schlitztrommel', s:'Trommel', on:['hoch','atoll'], bt:24, cost:{holz:3}, r:8, hy:5, beauty:3, info:'Ein ausgehöhlter Stamm. Ruft das Dorf und gibt den Takt.', vb:'-13 -10 26 14'},
  tanzplatz:{n:'Tanzplatz', s:'Tanzplatz', on:['hoch','atoll'], bt:30, cost:{holz:1, beile:1}, r:18, hy:2, beauty:4, info:'Festgestampfte Erde, mit Steinen eingefasst. Hier wird getanzt.', vb:'-21 -12 42 22'}
};
const ORDER = ['haus','ernte','faeller','quelle','brunnen','fisch','taro','yams','pulaka','pansammler','schnur','umu','pflanzer','speicher','huehnerhof','taucher','schnitzer','toepfer','hakenmacher','beil','flecht','oelhuette','gaergrube','harzer','kalkbrenner','kurkumagarten','weberin','malerin','duftoel','werft','sternhaus','pfahl','steg','garten','klopf','pferch','bananen','kavagarten','klingen','schmuck','halle','fale','ahnenhaus','palme','baum','nussbaum','pandanus','hibiskus','blumen','fackel','pfosten','trommel','tanzplatz','platz'];
/* How the work goes with fewer hands than the place has room for. Zu zweit: one cuts while the other pulls the trunk aside,
   one steers the canoe while the other fishes; alone one gets a third done of what two do (felling trials with stone
   axes: with a helper bending the stem a tree needs three quarters fewer strokes). Hand in Hand: one prepares while the
   other works, alone a little slower. Jeder für sich: each does a share of their own. */
const TEAM = {
  pair:{n:'Zu zweit', alone:.3, text:'Zu zweit. Allein nur ⅓.'},
  hand:{n:'Hand in Hand', alone:.4, text:'Hand in Hand. Zwei schaffen mehr als doppelt.'},
  solo:{n:'Jeder für sich', alone:null, text:''}
};
const teamUnits = (t, n) => t === 'pair' ? Math.floor(n / 2) + (n % 2) * TEAM.pair.alone : t === 'hand' ? (n === 1 ? TEAM.hand.alone * 2 : n) : n;
/* the share of the full crew's work that n people get done */
const teamF = (K, n) => { if (!K.crew) return 1; n = Math.min(n, K.crew); return n <= 0 ? 0 : teamUnits(K.team || 'solo', n) / teamUnits(K.team || 'solo', K.crew); };
/* What grows and lives on an island only where people have brought it: the canoe plants and the pigs. Coconut palms and
   pandanus drift ashore by themselves, the forest is there. A new island has none of these; what is not in the canoe that
   founds the village is missing there until a canoe brings it. take: what leaves the store with it. */
const LIFE = {
  yams:{n:'Yams', no:'noch keine Yams', s:'Yams-Knollen', kinds:['yams'], text:'Knollenstücke, trocken im Korb. Yams halten sich monatelang und reisen gut.'},
  taro:{n:'Taro', no:'noch keinen Taro', s:'Taro-Setzlinge', kinds:['taro', 'pulaka'], text:'Knollenspitzen in nassen Blättern. Auf Atollen wird daraus Sumpftaro.'},
  brot:{n:'Brotfrucht', no:'noch keine Brotfrucht', s:'Brotfrucht-Schösslinge', kinds:['baum'], text:'Schösslinge in feuchtem Moos. Ohne Brotfrucht kein Proviant.'},
  maulbeer:{n:'Papiermaulbeere', no:'noch keine Papiermaulbeere', s:'Maulbeer-Stecklinge', kinds:['garten'], text:'Stecklinge für Tapa. Er wächst nur, wo Menschen ihn setzen.'},
  kava:{n:'Kava', no:'noch keine Kava', s:'Kava-Stecklinge', kinds:['kavagarten'], late:true, text:'Kava hat keine Samen und reist nur im Kanu.'},
  banane:{n:'Bananen', no:'noch keine Bananen', s:'Bananen-Schösslinge', kinds:['bananen'], from:'alte', text:'Ein Geschenk der Alten vom Großen Land.'},
  kurkuma:{n:'Kurkuma', no:'noch keine Kurkuma', s:'Kurkuma-Wurzeln', kinds:['kurkumagarten'], text:'Wurzelstücke für Farbe und Salbe.'},
  huhn:{n:'Hühner', no:'noch keine Hühner', s:'ein paar Hühner', kinds:['huehnerhof'], text:'Hühner reisen in Körben mit.'},
  schwein:{n:'Schweine', no:'noch keine Schweine', s:'ein Paar Schweine', kinds:['pferch'], take:{schweine:2}, text:'Ein Zuchtpaar aus dem Lager.'}
};
const LIFE_IDS = Object.keys(LIFE), LIFE_LOAD = 2;   // each takes two places in the canoe
const LIFE_BASE = LIFE_IDS.filter(id => !LIFE[id].from && !LIFE[id].late);   // what the clan brought from the old land; the rest comes from other peoples, kava with Hawaiki
for (const [id, L] of Object.entries(LIFE)) for (const k of L.kinds) KINDS[k].life = id;
/* Household crafts (homes.js): work a family did at home, not in a workshop. They are not built on their own any more;
   a house takes one of them up. CRAFT_DO is how the advice says it. */
const CRAFTS = {schnur:'Sennit drehen', flecht:'Matten flechten', toepfer:'Töpfern', hakenmacher:'Angelhaken schleifen', schnitzer:'Schalen schnitzen', oelhuette:'Öl pressen', klopf:'Tapa klopfen', weberin:'Feine Matten flechten', malerin:'Tapa bemalen', duftoel:'Duftöl ansetzen'};
const CRAFT_DO = {toepfer:'töpfern', weberin:'feine Matten flechten'};
for (const [k, n] of Object.entries(CRAFTS)) KINDS[k].craft = n;
const CRAFT_KINDS = Object.keys(CRAFTS);
/* What only some islands have: a ground that one plant needs, or shells found on one reef. The fine goods of the master
   and chief families come from these, so a clan needs a net of islands, as the Lapita net really was. The home island
   has none of them. */
const SPECS = {
  kurkuma:{n:'roter Erde', s:'Rote Erde', text:'Rote, lockere Erde: Hier gedeiht Kurkuma für Farbe und Salbe.', kinds:['kurkumagarten']},
  kava:{n:'feuchten Hängen', s:'Feuchte Hänge', text:'Schattige, feuchte Hänge: Hier wächst Kava.', kinds:['kavagarten']},
  conus:{n:'Kegelschnecken am Riff', s:'Kegelschnecken', text:'Am Riff liegen Kegelschnecken; aus ihnen werden Armringe geschliffen.', kinds:['schmuck']},
  feinpandanus:{n:'feinem Pandanus', s:'Feiner Pandanus', text:'Eine Pandanus-Art mit langen, weichen Blättern für die Ehrenmatten.', kinds:['weberin']}
};
const SPEC_OF_KIND = Object.fromEntries(Object.entries(SPECS).flatMap(([id, S]) => S.kinds.map(k => [k, id])));
const FELL_WOOD = {palme:2, baum:3, nussbaum:4};   // a grown palm or breadfruit tree felled gives wood once, and what it bore is gone
const DECO = ['hibiskus', 'blumen', 'fackel', 'pfosten', 'trommel', 'tanzplatz'];   // only adorn the village: their own menu
/* Canoes are built in the canoe house, take time, and then belong to the fleet. Free ones you steer yourself,
   others work a trade chain. Only the double canoe sails into the fog and eats provisions out there. */
const SHIPS = {
  oc:{n:'Auslegerkanu', cost:{holz:5, beile:1, schnur:3, harz:1}, bt:110, cap:12, people:4, speed:20, vision:150, fog:false, crew:2, crewN:'Paddler'},
  dc:{n:'Doppelkanu', cost:{holz:8, beile:2, matten:3, schnur:5, harz:2}, bt:220, cap:24, people:8, speed:25, vision:230, fog:true, crew:4, crewN:'Seefahrer'},
  // the voyaging canoe of the second great voyage: bigger, faster, with a crab-claw sail; only it crosses the Leere See
  vaka:{n:'Reisekanu', cost:{holz:14, beile:3, matten:6, schnur:8, harz:3, feinmatten:2}, bt:320, cap:36, people:10, speed:32, vision:300, fog:true, crew:5, crewN:'Seefahrer'}
};
const SITE_CREW = 2, YARD_CREW = 3;   // people at each building site and at a canoe being built
const SITE_K = {crew:SITE_CREW, team:'pair'}, YARD_K = {crew:YARD_CREW, team:'pair'};   // building goes as work in pairs
const STUMP_TICKS = 360, GROW_TICKS = 150;   // a stump sprouts again after twelve minutes by itself, a young tree needs five to grow
const CANOE = SHIPS.dc.cost;
const SETTLE = {people:4, keep:4};   // a new village needs at least 4 settlers, and 4 must stay behind
const VOYAGE_DAY = 5, MANA_PER_COLONY = 8;   // at sea a double canoe eats 1 provision every 5 ticks; each colony after the first two needs 8 more standing

/* What people use up, per resident and minute. Food is food: taro, breadfruit and pulaka from the fields, fish, seafood
   and coconuts all count, and people eat what there is most of. lvl: who wants it, by the step of their house: 1 every
   family, 2 the families in a house bound with sennit (cooked food), 3 the master families (pots, mats, oil), 4 the
   chief's family (the finest). Pots come from high islands, mats from atolls. */
const FOODS = ['nahrung', 'fisch', 'meeres', 'wild', 'kokos', 'eier', 'speisen'];
const NEEDS = [
  {k:'essen', lvl:1, rate:1.2, hint:{hoch:'Das Erntehaus bringt Kokosnüsse, die Fischerhütte Fisch und Meeresfrüchte, später Tarofelder und Brotfrucht.', atoll:'Das Erntehaus bringt Kokosnüsse, die Fischerhütte Fisch und Meeresfrüchte, später Pulakagruben.'}},
  {k:'wasser', lvl:1, rate:.5, hint:{hoch:'Baue eine Quelle am Bach. Grüne Kokosnüsse vom Erntehaus geben auch Wasser.', atoll:'Baue einen Brunnen in der Mitte des Motus. Grüne Kokosnüsse vom Erntehaus geben auch Wasser.'}},
  {k:'speisen', lvl:2, rate:.3, hint:{hoch:'Baue einen Erdofen. Er braucht rohe Speisen, Brennstoff und Blätter.', atoll:'Baue einen Erdofen. Er braucht rohe Speisen, Brennstoff und Blätter.'}},
  {k:'toepfe', lvl:3, rate:.07, hint:{hoch:'Lass eine Familie am Ton töpfern.', atoll:'Töpfe gibt es nur auf hohen Inseln. Schick sie mit einem Kanu her.'}},
  {k:'matten', lvl:3, rate:.06, hint:{hoch:'Matten gibt es nur auf Atollen. Schick sie mit einem Kanu her.', atoll:'Lass eine Familie bei den Pandanus Matten flechten.'}},
  {k:'oel', lvl:3, rate:.04, hint:{hoch:'Das Erntehaus bringt Kokosnüsse, eine Familie presst Öl daraus.', atoll:'Das Erntehaus bringt Kokosnüsse, eine Familie presst Öl daraus.'}},
  {k:'tapa', lvl:4, rate:.3, hint:{hoch:'Pflanze einen Maulbeergarten an ein Haus; die Familie dort klopft Tapa.', atoll:'Tapa kommt von hohen Inseln.'}},
  {k:'schweine', lvl:4, rate:.2, hint:{hoch:'Baue einen Schweinepferch und gib den Tieren Futter.', atoll:'Schweine kommen von hohen Inseln.'}},
  {k:'kava', lvl:4, rate:.2, hint:{hoch:'Baue einen Kavagarten, oder tausche Kava beim Clan vom Maulbeerhain.', atoll:'Kava wächst auf hohen Inseln.'}},
  {k:'schmuck', lvl:4, rate:.1, hint:{hoch:'Muschelschmuck entsteht auf Atollen oder kommt von einem Clan.', atoll:'Baue eine Schmuckschleiferei am Strand.'}},
  {k:'feinmatten', lvl:4, rate:.1, hint:{hoch:'Eine Familie flicht feine Matten. Sie braucht Matten.', atoll:'Eine Familie flicht feine Matten. Sie braucht Matten.'}},
  {k:'bemtapa', lvl:4, rate:.15, hint:{hoch:'Eine Familie bemalt Tapa. Sie braucht Tapa und Kurkuma.', atoll:'Bemalte Tapa kommt von hohen Inseln.'}},
  {k:'duftoel', lvl:4, rate:.15, hint:{hoch:'Eine Familie bei Blumen setzt Duftöl an.', atoll:'Eine Familie bei Blumen setzt Duftöl an.'}}
];
const LEVEL_NAMES = ['', 'Weiler', 'Dorf', 'Häuptlingsdorf'];
const VILLAGE_POP = 30;   // a hamlet up to about thirty, then a village
const CHIEF = {pop:50, mana:20, beauty:10, isle:80};   // a chief's village: people, standing, beauty, and an island that carries at least 80

/* Standing (mana) comes from feasts and gifts and fades slowly */
const FEASTS = [
  {id:'klein', n:'Kleines Fest', cost:{nahrung:10, fisch:4, toepfe:2}, mana:5},
  {id:'gross', n:'Großes Fest', cost:{schweine:4, nahrung:12, meeres:4, tapa:2}, mana:15},
  // tatau: the young who have come of age get their patterns, cut with obsidian and coloured with soot, as the tools
  // found at Lapita places show; every one of them adds to the standing
  {id:'tatau', n:'Tatau', cost:{nahrung:8, speisen:4, klingen:1}, mana:3, per:2},
  // with the treasures of the far islands: the greatest feast, the village grows twice as fast for a while
  {id:'schatz', n:'Fest der Schätze', cost:{perlmutt:2, federn:2, tabua:1, schweine:2}, mana:30, joy:40}
];
const FEAST_PAUSE = 45, FEAST_LEN = 12, MANA_FADE = 30;   // ticks between feasts on one island, how long it lasts, ticks per point lost

/* Gifts to other clans: what a good is worth, the return comes later and grows with trust (knots) */
const VALUE = {haken:.8, kumete:1.5, eier:.3, speisen:.5, blaetter:.1, steine:.2, kalk:.5, kurkuma:.8, hauer:1, reste:.05, feinmatten:4, bemtapa:4, duftoel:3, nahrung:.2, fisch:.4, meeres:.5, wild:.4, kokos:.3, wasser:.1, holz:.3, dach:.5, faser:.2, schalen:.1, harz:.8, muschel:.4, proviant:1, toepfe:1, beile:1.5, klingen:2, matten:1, schnur:1, tapa:2, oel:1.5, schweine:3, kava:2, schmuck:6, perlmutt:7, federn:10, tabua:12};
const CLANS = {
  feuer:{name:'Clan vom Feuerberg', motif:'zahn', on:'vulkan', makes:['klingen', 'schweine'], wants:['matten', 'schnur', 'schmuck', 'oel', 'feinmatten'], pop:30},
  riff:{name:'Clan vom Riff', motif:'boegen', on:'atoll', makes:['schmuck', 'matten', 'schnur'], wants:['toepfe', 'beile', 'klingen', 'duftoel'], pop:22},
  hain:{name:'Clan vom Maulbeerhain', motif:'kreis', on:'hoch', makes:['kava', 'tapa'], wants:['matten', 'schmuck', 'klingen', 'oel', 'harz', 'bemtapa'], pop:26}
};
/* Other peoples, at the edges of the sea. They answer gifts like a clan, but they are not of your kind: another language,
   other ways, and something to teach that no clan knows. */
const CULTURES = {
  alte:{name:'Die Alten vom Großen Land', dat:'den Alten vom Großen Land', isle:'Tanobada', kind:'hoch', size:184, pop:70, motif:null, makes:['klingen', 'tapa'], wants:['toepfe', 'schmuck', 'matten'], life:'banane',
    text:'Tanobada heißt das Große Land. Sie leben hier seit vierzigtausend Jahren, sprechen eine ganz andere Sprache und machen keine Töpfe. Sie legten die ersten Gärten der Welt an.',
    gift:'Ihre erste Gegengabe: Bananen-Schösslinge.'},
  nord:{name:'Die Seefahrer vom Nordmeer', dat:'den Seefahrern vom Nordmeer', isle:'Matagi', kind:'vulkan', size:118, pop:45, motif:'punkte', makes:['matten', 'schnur'], wants:['toepfe', 'beile', 'tapa'], teach:'nav',
    text:'Matagi heißt Wind. Sie kamen auf anderen Wegen übers Meer und kennen Sternwege, von denen ihr nichts wisst.',
    gift:'Ihre erste Gegengabe: ihre Sternwege. Eure Navigatoren lernen eine Stufe mehr.'}
};
/* how to speak of a clan or another people in a sentence */
const clanDer = C => C.culture ? C.name : `Der ${C.name}`;
const clanBeim = C => C.culture ? `bei ${C.dat}` : `beim ${C.name}`;
const clanVom = C => C.culture ? `von ${C.dat}` : `vom ${C.name}`;
const clanZum = C => C.culture ? `zu ${C.dat}` : `zum ${C.name}`;
const giftValue = (C, cargo) => Object.entries(cargo).reduce((s, [k, v]) => s + v * VALUE[k] * (clanWants(C).includes(k) ? 1.5 : clanMakes(C).includes(k) ? .3 : 1), 0);
const returnRate = knots => Math.min(1.2, .6 + .06 * knots);
/* What a clan sends back for a debt: their most valuable good first, as soon as the debt covers one, the rest in the cheaper one */
function returnGoods(C, worth){
  const cargo = {}; let left = worth, load = 0;
  const ks = clanMakes(C).slice().sort((a, b) => VALUE[b] - VALUE[a]);
  ks.forEach((k, i) => { const q = Math.min(LOAD - load, Math.max(left >= VALUE[k] ? 1 : 0, Math.floor(left / (ks.length - i) / VALUE[k]))); if (q > 0){ cargo[k] = q; load += q; left -= q * VALUE[k]; } });
  return {cargo, left, load};
}

/* ---------- the year: twelve moons, counted from the evening the Pleiades first stand above the horizon after sunset */
const MOON = 30, YEAR = 12 * MOON, YEAR_START = 5 * MOON;   // ticks per moon; a new game begins in the trade wind season
const SEASONS = [
  {id:'plejaden', n:'Zeit der Plejaden', from:0, to:2, baum:1.5, sea:1, text:'Die Plejaden gehen auf. Das Jahr beginnt mit dem Fest der ersten Früchte.'},
  {id:'sturm', n:'Sturmzeit', from:2, to:5, baum:1, sea:.8, text:'Regen und Böen. Die Yams werden gepflanzt, Schildkröten legen ihre Eier am Strand.'},
  {id:'passat', n:'Passatzeit', from:5, to:9, baum:1, sea:1.2, text:'Stetiger Wind aus Südost. Gute Zeit für weite Fahrten.'},
  {id:'mager', n:'Magere Zeit', from:9, to:12, baum:0, sea:1, text:'Die Brotfrucht trägt nicht. Jetzt werden die Yams geerntet; Proviant hilft, ein Rāhui bringt reichen Fang zum Fest.'}
];
const PALOLO = {moon:0, from:20, to:23};   // a week after full moon in the first moon the palolo worm rises from the reef, for three ticks
/* The feast of the first fruits when the Pleiades rise: the offering is needed, the rest adds to it */
const FESTIVAL = {
  offering:{nahrung:12, fisch:6, schweine:2}, mana:10,
  parts:[
    {id:'kava', n:'Kava-Runde', cost:{kava:3}, mana:5, text:'Die Ältesten trinken Kava. Gäste der Clans knüpfen einen Knoten mehr.'},
    {id:'tanz', n:'Tanz zur Schlitztrommel', needs:['trommel', 'tanzplatz'], mana:4, text:'Braucht eine Schlitztrommel und einen Tanzplatz auf der Insel.'},
    {id:'salbung', n:'Salbung mit Kokosöl', cost:{oel:2}, mana:3, text:'Die Tänzer glänzen vom Öl.'},
    {id:'rennen', n:'Kanurennen in der Lagune', ships:2, mana:2, text:'Mindestens zwei Kanus im Hafen. Jedes bringt Ansehen, höchstens vier.'}
  ]
};

const costOf = (kind, I) => { const c = KINDS[kind].cost; return (c.hoch || c.atoll) ? (c[I.type] || {}) : c; };
const groupHave = (I, k) => GROUPS[k] ? GROUPS[k].reduce((t, q) => t + (I.stock[q] || 0), 0) : I.stock[k] || 0;
const canPay = (I, c) => Object.entries(c).every(([k, v]) => groupHave(I, k) >= v);
const lacking = (I, c) => { const m = Object.entries(c).find(([k, v]) => groupHave(I, k) < v); return m ? GN[m[0]] : ''; };
const pay = (I, c, f = 1) => { for (const [k, v] of Object.entries(c)){
  if (!GROUPS[k]){ I.stock[k] = Math.max(0, (I.stock[k] || 0) - v * f); continue; }
  let left = v * f; for (const q of GROUPS[k]){ const t = Math.min(left, I.stock[q] || 0); I.stock[q] -= t; left -= t; if (left <= 0) break; } } };
/* which good of a group would go next */
const groupNext = (I, k) => GROUPS[k] ? GROUPS[k].find(q => (I.stock[q] || 0) > 0) || GROUPS[k][0] : k;
const amount = (k, v) => `${v} ${v === 1 ? G1[k] : GN[k]}`;
const costText = c => { const e = Object.entries(c); return e.length ? e.map(([k, v]) => amount(k, v)).join(' + ') : 'nichts'; };
const emptyStock = () => Object.fromEntries(GOODS.map(k => [k, 0]));

/* ---------- patterns on the pots. Lapita potters pressed rows of tiny teeth into the wet clay and filled the marks with
   white lime. Each village with a pottery finds its own pattern; pots carry the patterns of the place they come from, and
   where pots travel the patterns go too. A borrowed pattern that no pot has brought again for two years is forgotten. */
const MOTIFS = {
  gesicht:{n:'Gesicht', t:'Das Gesicht mit der langen Nase und den großen Augen, das Gesicht der Ahnen.'},
  zahn:{n:'Zickzack', t:'Ein Zickzackband aus vielen kleinen Zahnstempeln.'},
  kreis:{n:'Kreise', t:'Ringe in Ringen, wie Wellen um einen Stein.'},
  maeander:{n:'Mäander', t:'Ein Band, das sich in Stufen hin und her windet.'},
  boegen:{n:'Bögen', t:'Bögen übereinander wie Fischschuppen.'},
  rauten:{n:'Rauten', t:'Eine Kette von Rauten, wie Flechtwerk.'},
  spirale:{n:'Spirale', t:'Eine Spirale wie das junge Farnblatt.'},
  leiter:{n:'Leiter', t:'Zwei Linien mit Sprossen dazwischen.'},
  punkte:{n:'Punktkreise', t:'Kleine Kreise aus Punkten, auf rot bemalten Töpfen. Das Muster der Seefahrer vom Nordmeer.'}
};
const MOTIF_YEARS = 2, KIN_GIFT = 1.2;   // a borrowed pattern lasts two years without new pots; a clan that stamps your pattern values your gifts more
