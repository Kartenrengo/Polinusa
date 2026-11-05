'use strict';
/* Goods, buildings, needs and the rules of exchange */

const TICK = 2000, DAY = 3, AGE_FULL = 150, LOAD = 12, SAVE_KEY = 'polinusa-4', OLD_KEYS = ['polinusa-3'];

const GOODS = ['nahrung','fisch','meeres','wild','kokos','eier','speisen','wasser','holz','dach','schnur','faser','schalen','harz','muschel','blaetter','steine','kalk','kurkuma','hauer','reste','proviant','toepfe','beile','klingen','matten','tapa','oel','feinmatten','bemtapa','duftoel','schweine','kava','schmuck','perlmutt','federn','tabua'];
/* A group stands for any of its goods, the first in the list goes first: fire burns coconut shells before wood */
const GROUPS = {brenn:['schalen', 'holz'], futter:['reste', 'kokos', 'nahrung'], roh:['nahrung', 'fisch', 'meeres', 'wild'], zier:['muschel', 'hauer']};
const TREASURE_GOODS = ['perlmutt', 'federn', 'tabua'];   // found only on the treasure islands
const GN = {essen:'Nahrung', eier:'Eier', speisen:'Gekochtes', blaetter:'Blätter', steine:'Kochsteine', kalk:'Korallenkalk', kurkuma:'Kurkuma', hauer:'Eberhauer', reste:'Reste', feinmatten:'Feine Matten', bemtapa:'Bemalte Tapa', duftoel:'Duftöl', futter:'Futter', roh:'Rohe Speisen', zier:'Schalen oder Hauer', nahrung:'Feldfrüchte', fisch:'Fisch', meeres:'Meeresfrüchte', wild:'Wildbeute', kokos:'Kokosnüsse', wasser:'Wasser', holz:'Holz', dach:'Dachdeckung', faser:'Kokosfasern', schalen:'Kokosschalen', harz:'Brotfruchtharz', muschel:'Muschelschalen', brenn:'Brennstoff', proviant:'Proviant', toepfe:'Töpfe', beile:'Steinbeile', klingen:'Klingen', matten:'Matten', schnur:'Schnur', tapa:'Tapa', oel:'Kokosöl', schweine:'Schweine', kava:'Kava', schmuck:'Muschelschmuck', perlmutt:'Perlmutt', federn:'Rote Federn', tabua:'Walzähne'};
const G1 = {essen:'Nahrung', eier:'Ei', speisen:'Gekochtes', blaetter:'Blatt', steine:'Kochstein', kalk:'Korallenkalk', kurkuma:'Kurkuma', hauer:'Eberhauer', reste:'Rest', feinmatten:'Feine Matte', bemtapa:'Bemalte Tapa', duftoel:'Duftöl', futter:'Futter', roh:'Rohe Speise', zier:'Schale oder Hauer', nahrung:'Feldfrucht', fisch:'Fisch', meeres:'Meeresfrüchte', wild:'Wildbeute', kokos:'Kokosnuss', wasser:'Wasser', holz:'Holz', dach:'Dachdeckung', faser:'Kokosfaser', schalen:'Kokosschale', harz:'Brotfruchtharz', muschel:'Muschelschale', brenn:'Brennstoff', proviant:'Proviant', toepfe:'Topf', beile:'Steinbeil', klingen:'Klinge', matten:'Matte', schnur:'Schnur', tapa:'Tapa', oel:'Kokosöl', schweine:'Schwein', kava:'Kava', schmuck:'Muschelring', perlmutt:'Perlmutt', federn:'rote Feder', tabua:'Walzahn'};

/* Places on the map where raw material lies. Workshops that need one must stand close by. */
const DEPOSITS = {
  ton:{n:'Ton', where:'Ton liegt am Bach oder in feuchten Senken.'},
  basalt:{n:'Basalt', where:'Basalt findest du an den grauen Felsen.'},
  obsidian:{n:'Obsidian', where:'Obsidian gibt es nur am Hang eines Vulkans.'}
};
/* prod: what it makes, every: ticks per piece, use: what each piece uses up, bt: ticks to build (or to grow, for plants),
   crew: people it needs to work; while they work there they do nothing else, boost: a tool that wears out (k, used up every per pieces); without it the work is slow times slower, water: stands in the lagoon, inland: least distance from the beach,
   dep: deposit within depR, near: at least n of a kind within r (plants or a garden), coast: on the beach,
   beauty: how much it adorns the village */
const KINDS = {
  faeller:{n:'Holzfäller', s:'Holz', on:['hoch'], crew:1, bt:8, cost:{holz:2}, r:11, hy:6, prod:'holz', every:2, trees:{r:80}, boost:{k:'beile', per:20, slow:1.5}, roof:true, info:'Fällt Bäume in der Nähe. Mit Steinbeilen geht es schneller, ein Beil hält für 20 Holz.', vb:'-18 -17 36 21'},
  pflanzer:{n:'Baumpflanzer', s:'Pflanzer', on:['hoch'], crew:1, bt:8, cost:{holz:2}, r:11, hy:6, every:4, plants:{r:70}, roof:true, info:'Setzt junge Bäume auf Stümpfe und an den Waldrand.', vb:'-18 -17 36 21'},
  haus:{n:'Haus', s:'Haus', on:['hoch','atoll'], bt:12, cost:{hoch:{holz:2, dach:1, schnur:1}, atoll:{holz:1, dach:2, schnur:1}}, r:10, hy:12, cap:4, roof:true, info:'Ein Zuhause für 4 Menschen, im Häuptlingsdorf für 6. Ohne Nägel gebaut: Pfosten, Dachdeckung, mit Sennit gebunden.', vb:'-17 -29 34 33'},
  taro:{n:'Tarofeld', s:'Taro', on:['hoch'], crew:1, soil:true, bt:6, cost:{holz:1}, r:10, hy:0, prod:'nahrung', by:{blaetter:.5}, every:2, info:'Taro ist das wichtigste Essen der hohen Inseln.', vb:'-13 -11 26 22'},
  pulaka:{n:'Pulakagrube', s:'Pulaka', on:['atoll'], crew:1, soil:true, bt:8, cost:{holz:1}, r:10, hy:3, prod:'nahrung', by:{blaetter:.5}, every:3, inland:9, info:'Eine Grube bis zum Süßwasser im Sand. Darin wächst Sumpftaro. Braucht Platz in der Mitte eines Motus.', vb:'-12 -10 24 16'},
  fisch:{n:'Fischgestell', s:'Fisch', on:['hoch','atoll'], crew:2, bt:6, cost:{holz:1}, r:8, hy:4, prod:'fisch', every:1.2, trip:true, canoe:30, boost:{k:'schnur', per:8, slow:2}, coast:true, info:'Die Fischer fahren im Einbaum hinaus und trocknen den Fang hier. Mit Netzen aus Schnur fangen sie doppelt so viel. Am Strand.', vb:'-12 -14 26 18'},
  taucher:{n:'Tauchplatz', s:'Taucher', on:['hoch','atoll'], crew:2, bt:8, cost:{holz:2}, r:9, hy:5, prod:'meeres', every:3.5, trip:true, dive:true, canoe:30, coast:true, roof:true, info:'Zwei Taucher holen Riesenmuscheln, Kraken und Seegurken. Auf Atollen werden aus den Schalen Beile, vor Tifa holen sie Perlmuscheln. Am Strand.', vb:'-15 -16 32 20'},
  riff:{n:'Riffsammler', s:'Riff', on:['hoch','atoll'], crew:1, bt:8, cost:{holz:1}, r:10, hy:6, prod:'meeres', by:{muschel:.5, steine:.25}, every:4, coast:true, roof:true, info:'Sammelt bei Ebbe Muscheln, Krebse und Seeigel. Die Schalen gehen an die Schmuckschleiferei. Am Strand.', vb:'-17 -17 34 21'},
  steg:{n:'Kanusteg', s:'Steg', on:['hoch','atoll'], bt:8, cost:{holz:3}, r:9, hy:3, coast:true, serves:4, canoe:30, info:'Ein Steg mit Einbaum. Bringt Leute zu bis zu 4 Pfahlhäusern oder auf ein anderes Motu.', vb:'-6 -9 36 16'},
  toepfer:{n:'Töpferei', s:'Töpfe', on:['hoch'], crew:2, bt:14, cost:{holz:2}, r:11, hy:6, prod:'toepfe', every:8, use:{brenn:1}, boost:{k:'kalk', per:4, slow:1.5}, dep:'ton', depR:60, roof:true, info:'Formt Töpfe aus Ton und brennt sie mit Kokosschalen oder Holz. Mit Korallenkalk füllen die Töpfer die gestempelten Muster weiß, wie die Lapita, und es geht schneller. Muss nah am Ton stehen.', vb:'-16 -17 34 21'},
  beil:{n:'Beilwerkstatt', s:'Beile', on:['hoch'], crew:2, bt:14, cost:{holz:2}, r:11, hy:6, prod:'beile', by:{steine:1}, every:8, dep:'basalt', depR:60, roof:true, info:'Schleift Steinbeile aus Basalt. Muss nah am Felsen stehen.', vb:'-18 -17 36 21'},
  klingen:{n:'Klingenschläger', s:'Klingen', on:['hoch'], crew:2, bt:14, cost:{holz:3}, r:11, hy:6, prod:'klingen', every:10, dep:'obsidian', depR:60, roof:true, info:'Schlägt scharfe Klingen aus Obsidian. Nur am Vulkan.', vb:'-18 -17 36 21'},
  flecht:{n:'Flechthütte', s:'Matten', on:['atoll'], crew:1, bt:12, cost:{holz:1}, r:10, hy:6, prod:'matten', every:8, near:{kind:'pandanus', n:2, r:60}, roof:true, info:'Flicht Matten aus Pandanus. Braucht 2 Pandanus in der Nähe.', vb:'-17 -17 34 21'},
  schnur:{n:'Seilerei', s:'Sennit', on:['hoch','atoll'], crew:1, bt:10, cost:{holz:1}, r:10, hy:6, prod:'schnur', every:5, use:{faser:1}, roof:true, info:'Dreht Sennit aus Kokosfasern: die Schnur, mit der Häuser und Kanus gebunden werden, und die Netze der Fischer.', vb:'-14 -17 30 21'},
  schmuck:{n:'Schmuckschleiferei', s:'Schmuck', on:['atoll'], crew:2, bt:14, cost:{holz:2}, r:11, hy:6, prod:'schmuck', every:20, use:{klingen:1, zier:2}, coast:true, roof:true, info:'Schleift Armringe aus Muscheln. Braucht Klingen. Am Strand.', vb:'-17 -17 36 21'},
  kletterer:{n:'Palmenkletterer', s:'Kokos', on:['hoch','atoll'], crew:1, bt:8, cost:{holz:1}, r:10, hy:6, prod:'kokos', by:{faser:1, schalen:1}, green:'wasser', every:3, near:{kind:'palme', n:2, r:80}, roof:true, info:'Holt Kokosnüsse von den Palmen. Reife Nüsse geben Nahrung, Fasern für Sennit und Schalen zum Feuern; grüne Nüsse geben Wasser. Braucht 2 Palmen in der Nähe.', vb:'-17 -17 34 21'},
  deckerin:{n:'Dachflechterin', s:'Dach', on:['hoch','atoll'], crew:1, bt:8, cost:{holz:1}, r:10, hy:6, prod:'dach', every:4, near:{kind:['palme', 'pandanus'], n:2, r:80}, roof:true, info:'Flicht Palmwedel und Pandanusblätter zu Dachdeckung. Braucht 2 Palmen oder Pandanus in der Nähe.', vb:'-17 -17 34 21'},
  pansammler:{n:'Pandanussammlerin', s:'Frucht', on:['atoll'], crew:1, bt:6, cost:{holz:1}, r:9, hy:3, prod:'nahrung', every:4, near:{kind:'pandanus', n:2, r:60}, info:'Sammelt Pandanusfrüchte. Gekocht oder als getrocknete Paste sind sie auf Atollen ein Grundnahrungsmittel. Braucht 2 Pandanus in der Nähe.', vb:'-12 -11 24 16'},
  harzer:{n:'Harzsammler', s:'Harz', on:['hoch'], crew:1, bt:8, cost:{holz:1}, r:9, hy:4, prod:'harz', every:8, near:{kind:'baum', n:2, r:70}, info:'Sammelt den Milchsaft der Brotfruchtbäume. Damit werden die Planken der Kanus abgedichtet. Braucht 2 Brotfruchtbäume in der Nähe.', vb:'-13 -12 26 18'},
  quelle:{n:'Quelle', s:'Quelle', on:['hoch'], crew:1, bt:6, cost:{holz:1}, r:7, hy:4, prod:'wasser', every:2, spring:true, info:'Wasser vom Bach, in Kokosschalen und Bambus getragen. Nur am Bach.', vb:'-12 -12 24 17'},
  brunnen:{n:'Brunnen', s:'Brunnen', on:['atoll'], crew:1, bt:8, cost:{holz:1}, r:7, hy:3, prod:'wasser', every:2, inland:9, info:'Ein Loch bis zum Süßwasser, das im Sand über dem Meerwasser schwimmt. Nur in der Mitte eines Motus.', vb:'-12 -11 24 15'},
  regen:{n:'Regenfang', s:'Regen', on:['hoch','atoll'], bt:4, cost:{holz:1}, r:7, hy:6, prod:'wasser', every:5, rain:true, info:'Ein schräger Stamm und Blätter leiten den Regen in Gefäße. In der Sturmzeit viel, in der mageren Zeit wenig.', vb:'-12 -15 24 19'},
  oelhuette:{n:'Ölhütte', s:'Öl', on:['hoch','atoll'], crew:1, bt:10, cost:{holz:2}, r:10, hy:6, prod:'oel', every:8, use:{kokos:2}, roof:true, info:'Presst Öl aus Kokosfleisch, 2 Nüsse je Öl. Öl pflegt Haut und Haar.', vb:'-17 -17 34 21'},
  umu:{n:'Erdofen', s:'Umu', on:['hoch','atoll'], crew:1, bt:6, cost:{holz:1}, r:9, hy:3, prod:'speisen', out:3, by:{reste:1}, every:4, use:{roh:2, brenn:1, blaetter:1}, boost:{k:'steine', per:12, slow:2}, info:'Heiße Steine in einer Grube, darauf Taro, Fisch und Brotfrucht in Blättern, mit Erde bedeckt. 2 rohe Speisen werden 3 Gekochtes. Meisterfamilien wollen Gekochtes.', vb:'-12 -10 24 15'},
  kalkbrenner:{n:'Kalkbrenner', s:'Kalk', on:['hoch','atoll'], crew:1, bt:8, cost:{holz:1}, r:9, hy:4, prod:'kalk', every:8, use:{brenn:1}, coast:true, info:'Brennt Korallen vom Riff zu weißem Kalk. Damit werden die Muster der Töpfe gefüllt. Am Strand.', vb:'-12 -12 24 17'},
  kurkumagarten:{n:'Kurkumagarten', s:'Kurkuma', on:['hoch'], crew:1, soil:true, bt:6, cost:{holz:1}, r:10, hy:2, prod:'kurkuma', every:10, info:'Aus der Wurzel wird gelbe Farbe für Tapa und Salbe für die Haut.', vb:'-12 -11 24 17'},
  huehnerhof:{n:'Hühnerhof', s:'Hühner', on:['hoch','atoll'], crew:1, bt:6, cost:{holz:1}, r:9, hy:4, prod:'eier', every:5, feed:.6, info:'Hühner kamen mit den Lapita. Sie legen Eier, wenn sie Futter haben: Reste, Kokos oder Taro.', vb:'-12 -11 24 16'},
  weberin:{n:'Feinweberin', s:'Feinmatte', on:['hoch','atoll'], crew:1, bt:10, cost:{holz:2}, r:10, hy:6, prod:'feinmatten', every:14, use:{matten:2}, roof:true, info:'Flicht aus feinsten Pandanusstreifen die Ehrenmatten, wochenlange Arbeit. Sie sind die größten Gaben bei Hochzeit und Tod.', vb:'-17 -17 34 21'},
  malerin:{n:'Tapamalerin', s:'Malerin', on:['hoch'], crew:1, bt:10, cost:{holz:2}, r:10, hy:6, prod:'bemtapa', every:12, use:{tapa:1, kurkuma:1}, roof:true, info:'Bemalt Tapa mit Mustern in Kurkumagelb und Erdbraun.', vb:'-17 -17 34 21'},
  duftoel:{n:'Duftölhütte', s:'Duftöl', on:['hoch','atoll'], crew:1, bt:10, cost:{holz:2}, r:10, hy:6, prod:'duftoel', every:10, use:{oel:1}, near:{kind:['hibiskus', 'blumen'], n:1, r:60}, roof:true, info:'Legt Blüten in Kokosöl, bis es duftet. Braucht Blumen oder Hibiskus in der Nähe.', vb:'-17 -17 34 21'},
  gaergrube:{n:'Gärgrube', s:'Grube', on:['hoch'], crew:1, bt:8, cost:{holz:1}, r:9, hy:2, prod:'proviant', every:4, use:{nahrung:1}, near:{kind:'baum', n:2, r:70}, info:'Brotfrucht gärt hier zu Proviant, 1 Feldfrucht je Proviant. Nur Proviant geht mit ins Unbekannte. Braucht 2 Brotfruchtbäume in der Nähe.', vb:'-12 -9 25 14'},
  garten:{n:'Maulbeergarten', s:'Maulbeer', on:['hoch'], bt:6, cost:{holz:1}, r:10, hy:2, info:'Aus seiner Rinde wird Tapa. Die Klopfhütte muss daneben stehen.', vb:'-12 -10 24 17'},
  klopf:{n:'Klopfhütte', s:'Tapa', on:['hoch'], crew:2, bt:12, cost:{holz:2}, r:11, hy:6, prod:'tapa', every:10, near:{kind:'garten', n:1, r:60}, roof:true, info:'Klopft Rinde zu Tapa. Braucht einen Maulbeergarten in der Nähe.', vb:'-17 -17 36 21'},
  pferch:{n:'Schweinepferch', s:'Schweine', on:['hoch'], crew:1, bt:12, cost:{holz:3}, r:12, hy:4, prod:'schweine', by:{hauer:.3}, every:16, use:{nahrung:2}, feed:.25, info:'Schweine fressen Reste, Kokos und Taro, jedes Tier laufend. Ohne Futter werden es weniger. Sie sind das Festessen, ihre Hauer werden Schmuck.', vb:'-14 -12 28 18'},
  sternhaus:{n:'Haus der Navigatoren', s:'Navigator', on:['hoch','atoll'], crew:1, bt:14, cost:{holz:3, matten:1}, r:11, hy:7, max:1, roof:true, info:'Hier lernt ein Navigator Sterne, Wellen und Vögel. Stirbt er ohne Schüler, ist das Wissen verloren.', vb:'-18 -17 38 22'},
  werft:{n:'Kanuhaus', s:'Kanuhaus', on:['hoch'], bt:18, cost:{holz:4, dach:2, schnur:1}, r:16, hy:6, max:1, coast:true, roof:true, info:'Hier entstehen die Kanus. Es steht am Strand.', vb:'-21 -19 44 24'},
  pfahl:{n:'Pfahlhaus', s:'Pfahlhaus', on:['hoch','atoll'], bt:14, cost:{holz:3, dach:1, schnur:1}, r:11, hy:18, cap:4, water:true, roof:true, info:'Ein Zuhause in der Lagune. Ein Einbaum vom Kanusteg bringt die Leute an Land.', vb:'-17 -34 34 37'},
  speicher:{n:'Speicher', s:'Speicher', on:['hoch','atoll'], bt:10, cost:{holz:2, dach:1}, r:8, hy:12, store:10, roof:true, info:'+10 Platz für jede Ware.', vb:'-12 -28 24 30'},
  ahnenhaus:{n:'Ahnenhaus', s:'Ahnen', on:['hoch','atoll'], bt:16, cost:{holz:3, dach:2}, r:9, hy:15, max:1, roof:true, beauty:2, info:'Hier ruhen die Schädel der Ahnen, wie bei den Lapita in Teouma. Jeder Tote bringt dem Clan Ansehen.', vb:'-14 -32 28 35'},
  fale:{n:'Häuptlingshaus', s:'Häuptling', on:['hoch'], bt:26, cost:{holz:6, dach:4, schnur:3, feinmatten:1}, r:15, hy:20, max:1, cap:8, roof:true, beauty:2, info:'Das große Haus der Häuptlingsfamilie, auf starken Pfosten wie die Häuser der Lapita an der Lagune. Hier lebt die Matriarchin: Wie in Tonga steht die Schwester des Häuptlings im Rang über ihm. Ihre Familie braucht das Feinste.', vb:'-21 -34 42 37'},
  halle:{n:'Versammlungshaus', s:'Dorfhaus', on:['hoch'], bt:30, cost:{holz:6, dach:3, schnur:2}, r:19, hy:16, max:1, roof:true, info:'Das Herz des Dorfes. Hier werden Feste gefeiert. Familien ohne Haus schlafen hier unter Matten.', vb:'-21 -34 42 37'},
  palme:{n:'Kokospalme', s:'Palme', on:['hoch','atoll'], bt:20, cost:{}, r:5, hy:10, beach:true, plant:true, info:'Nüsse, Fasern, Schalen und Wedel. Ein Palmenkletterer erntet sie; gefällt gibt sie einmal Holz.', vb:'-13 -25 26 28'},
  baum:{n:'Brotfruchtbaum', s:'Baum', on:['hoch'], bt:25, cost:{}, r:7, hy:9, prod:'nahrung', every:6, plant:true, info:'Trägt Brotfrucht für Essen und Gärgrube, sein Milchsaft dichtet Kanus; gefällt gibt er Holz für Kanus.', vb:'-10 -21 20 23'},
  pandanus:{n:'Pandanus', s:'Pandanus', on:['atoll'], bt:15, cost:{}, r:5, hy:9, beach:true, plant:true, info:'Die Blätter werden zu Matten, Segeln und Dachdeckung.', vb:'-10 -21 20 23'},
  bananen:{n:'Bananenhain', s:'Bananen', on:['hoch'], crew:1, bt:8, cost:{holz:1}, r:10, hy:8, prod:'nahrung', by:{blaetter:1}, every:3, info:'Bananen vom Großen Land. Sie tragen das ganze Jahr und zehren nicht am Boden.', vb:'-13 -17 26 22'},
  kavagarten:{n:'Kavagarten', s:'Kava', on:['hoch'], crew:1, soil:true, bt:8, cost:{holz:1}, r:10, hy:3, prod:'kava', every:12, info:'Die Wurzel gibt das Getränk der Zeremonien.', vb:'-12 -12 24 19'},
  // things that only make the village beautiful
  hibiskus:{n:'Hibiskus', s:'Hibiskus', on:['hoch','atoll'], bt:8, cost:{}, r:5, hy:6, plant:true, beauty:1, info:'Rote Blüten für Haar und Kränze.', vb:'-9 -14 18 16'},
  blumen:{n:'Blumenbeet', s:'Blumen', on:['hoch','atoll'], bt:5, cost:{holz:1}, r:7, hy:3, beauty:2, info:'Duftende Tiare und Hibiskus, eingefasst mit Holz.', vb:'-11 -9 22 14'},
  fackel:{n:'Fackel', s:'Fackel', on:['hoch','atoll'], bt:4, cost:{holz:1}, r:4, hy:14, beauty:1, info:'Leuchtet bei Festen am Abend.', vb:'-6 -19 12 21'},
  pfosten:{n:'Ahnenpfosten', s:'Pfosten', on:['hoch','atoll'], bt:10, cost:{holz:2}, r:6, hy:18, beauty:3, info:'Ein geschnitzter Pfosten mit dem Gesicht der Ahnen.', vb:'-7 -26 14 28'},
  trommel:{n:'Schlitztrommel', s:'Trommel', on:['hoch','atoll'], bt:10, cost:{holz:3}, r:8, hy:5, beauty:3, info:'Ein ausgehöhlter Stamm. Ruft das Dorf und gibt den Takt.', vb:'-13 -10 26 14'},
  tanzplatz:{n:'Tanzplatz', s:'Tanzplatz', on:['hoch','atoll'], bt:14, cost:{holz:1, beile:1}, r:18, hy:2, beauty:4, info:'Festgestampfte Erde, mit Steinen eingefasst. Hier wird getanzt.', vb:'-21 -12 42 22'}
};
const ORDER = ['haus','faeller','taro','pulaka','pansammler','quelle','brunnen','regen','fisch','riff','kletterer','deckerin','schnur','taucher','toepfer','beil','flecht','oelhuette','gaergrube','harzer','umu','kalkbrenner','kurkumagarten','huehnerhof','weberin','malerin','duftoel','werft','sternhaus','pfahl','steg','speicher','pflanzer','garten','klopf','pferch','bananen','kavagarten','klingen','schmuck','halle','fale','ahnenhaus','palme','baum','pandanus','hibiskus','blumen','fackel','pfosten','trommel','tanzplatz'];
/* What grows and lives on an island only where people have brought it: the canoe plants and the pigs. Coconut palms and
   pandanus drift ashore by themselves, the forest is there. A new island has none of these; what is not in the canoe that
   founds the village is missing there until a canoe brings it. take: what leaves the store with it. */
const LIFE = {
  taro:{n:'Taro', no:'noch keinen Taro', s:'Taro-Setzlinge', kinds:['taro', 'pulaka'], text:'Knollenspitzen in nassen Blättern. Auf Atollen wird daraus Sumpftaro.'},
  brot:{n:'Brotfrucht', no:'noch keine Brotfrucht', s:'Brotfrucht-Schösslinge', kinds:['baum'], text:'Schösslinge in feuchtem Moos. Ohne Brotfrucht kein Proviant.'},
  maulbeer:{n:'Papiermaulbeere', no:'noch keine Papiermaulbeere', s:'Maulbeer-Stecklinge', kinds:['garten'], text:'Stecklinge für Tapa. Er wächst nur, wo Menschen ihn setzen.'},
  kava:{n:'Kava', no:'noch keine Kava', s:'Kava-Stecklinge', kinds:['kavagarten'], text:'Kava hat keine Samen und reist nur im Kanu.'},
  banane:{n:'Bananen', no:'noch keine Bananen', s:'Bananen-Schösslinge', kinds:['bananen'], from:'alte', text:'Ein Geschenk der Alten vom Großen Land.'},
  kurkuma:{n:'Kurkuma', no:'noch keine Kurkuma', s:'Kurkuma-Wurzeln', kinds:['kurkumagarten'], text:'Wurzelstücke für Farbe und Salbe.'},
  huhn:{n:'Hühner', no:'noch keine Hühner', s:'ein paar Hühner', kinds:['huehnerhof'], text:'Hühner reisen in Körben mit.'},
  schwein:{n:'Schweine', no:'noch keine Schweine', s:'ein Paar Schweine', kinds:['pferch'], take:{schweine:2}, text:'Ein Zuchtpaar aus dem Lager.'}
};
const LIFE_IDS = Object.keys(LIFE), LIFE_LOAD = 2;   // each takes two places in the canoe
const LIFE_BASE = LIFE_IDS.filter(id => !LIFE[id].from);   // what the clan brought from the old land; the rest comes from other peoples
for (const [id, L] of Object.entries(LIFE)) for (const k of L.kinds) KINDS[k].life = id;
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
const FELL_WOOD = {palme:2, baum:3};   // a grown palm or breadfruit tree felled gives wood once, and what it bore is gone
const DECO = ['hibiskus', 'blumen', 'fackel', 'pfosten', 'trommel', 'tanzplatz'];   // only adorn the village: their own menu
/* Canoes are built in the canoe house, take time, and then belong to the fleet. Free ones you steer yourself,
   others work a trade chain. Only the double canoe sails into the fog and eats provisions out there. */
const SHIPS = {
  oc:{n:'Auslegerkanu', cost:{holz:4, beile:1, schnur:2, harz:1}, bt:75, cap:12, people:4, speed:20, vision:150, fog:false, crew:2, crewN:'Paddler'},
  dc:{n:'Doppelkanu', cost:{holz:6, beile:2, matten:3, schnur:4, harz:2}, bt:150, cap:24, people:8, speed:25, vision:230, fog:true, crew:4, crewN:'Seefahrer'}
};
const SITE_CREW = 2, YARD_CREW = 3;   // people at each building site and at a canoe being built
const STUMP_TICKS = 240, GROW_TICKS = 90;   // a stump sprouts again after eight minutes by itself, a young tree needs three to grow
const CANOE = SHIPS.dc.cost;
const SETTLE = {people:4, keep:4};   // a new village needs at least 4 settlers, and 4 must stay behind
const VOYAGE_DAY = 5, MANA_PER_COLONY = 8;   // at sea a double canoe eats 1 provision every 5 ticks; each colony after the first two needs 8 more standing

/* What people use up, per resident and minute. Food is food: taro, breadfruit and pulaka from the fields, fish and seafood
   all count, and people eat what there is most of. A village (from 20) wants pots, from 30 mats; a chief's village
   (level 3) also bark cloth, pigs and shell valuables. Pots come from high islands, mats from atolls. */
const FOODS = ['nahrung', 'fisch', 'meeres', 'wild', 'kokos', 'eier', 'speisen'];
const NEEDS = [
  {k:'essen', lvl:1, from:0, rate:1.2, hint:{hoch:'Lege Tarofelder an, pflanze Brotfruchtbäume, baue Fischgestelle und Riffsammler am Strand.', atoll:'Baue Pulakagruben in der Mitte eines Motus, Fischgestelle und Riffsammler am Strand.'}},
  {k:'wasser', lvl:1, from:0, rate:.5, hint:{hoch:'Baue eine Quelle am Bach oder einen Regenfang. Grüne Kokosnüsse geben auch Wasser.', atoll:'Baue einen Brunnen in der Mitte des Motus oder einen Regenfang. Grüne Kokosnüsse geben auch Wasser.'}},
  {k:'toepfe', lvl:2, from:20, rate:.07, hint:{hoch:'Baue eine Töpferei am Ton.', atoll:'Töpfe gibt es nur auf hohen Inseln. Schick sie mit einem Kanu her.'}},
  {k:'matten', lvl:2, from:30, rate:.06, hint:{hoch:'Matten gibt es nur auf Atollen. Schick sie mit einem Kanu her.', atoll:'Baue eine Flechthütte bei den Pandanus.'}},
  {k:'oel', lvl:2, from:50, rate:.04, hint:{hoch:'Baue einen Palmenkletterer und eine Ölhütte.', atoll:'Baue einen Palmenkletterer und eine Ölhütte.'}},
  {k:'speisen', lvl:2, from:0, rate:.3, hint:{hoch:'Baue einen Erdofen. Er braucht rohe Speisen, Brennstoff und Blätter.', atoll:'Baue einen Erdofen. Er braucht rohe Speisen, Brennstoff und Blätter.'}},
  {k:'tapa', lvl:3, from:0, rate:.3, hint:{hoch:'Baue einen Maulbeergarten und daneben eine Klopfhütte.', atoll:'Tapa kommt von hohen Inseln.'}},
  {k:'schweine', lvl:3, from:0, rate:.2, hint:{hoch:'Baue einen Schweinepferch und gib den Tieren Futter.', atoll:'Schweine kommen von hohen Inseln.'}},
  {k:'kava', lvl:3, from:0, rate:.2, hint:{hoch:'Baue einen Kavagarten, oder tausche Kava beim Clan vom Kavahain.', atoll:'Kava wächst auf hohen Inseln.'}},
  {k:'schmuck', lvl:3, from:0, rate:.1, hint:{hoch:'Muschelschmuck entsteht auf Atollen oder kommt von einem Clan.', atoll:'Baue eine Schmuckschleiferei am Strand.'}},
  {k:'feinmatten', lvl:3, from:0, rate:.1, hint:{hoch:'Baue eine Feinweberin. Sie braucht Matten.', atoll:'Baue eine Feinweberin. Sie braucht Matten.'}},
  {k:'bemtapa', lvl:3, from:0, rate:.15, hint:{hoch:'Baue eine Tapamalerin. Sie braucht Tapa und Kurkuma.', atoll:'Bemalte Tapa kommt von hohen Inseln.'}},
  {k:'duftoel', lvl:3, from:0, rate:.15, hint:{hoch:'Baue eine Duftölhütte bei Blumen.', atoll:'Baue eine Duftölhütte bei Blumen.'}}
];
const LEVEL_NAMES = ['', 'Weiler', 'Dorf', 'Häuptlingsdorf'];
const VILLAGE_POP = 30;   // a hamlet up to about thirty, then a village
const CHIEF = {pop:50, mana:20, beauty:10, cap:6, isle:80};   // a chief's village: people, standing, beauty, room per house there, and an island that carries at least 80   // what it takes to become a chief's village, and the room per house there

/* Standing (mana) comes from feasts and gifts and fades slowly */
const FEASTS = [
  {id:'klein', n:'Kleines Fest', cost:{nahrung:10, fisch:4, toepfe:2}, mana:5},
  {id:'gross', n:'Großes Fest', cost:{schweine:4, nahrung:12, meeres:4, tapa:2}, mana:15},
  // with the treasures of the far islands: the greatest feast, the village grows twice as fast for a while
  {id:'schatz', n:'Fest der Schätze', cost:{perlmutt:2, federn:2, tabua:1, schweine:2}, mana:30, joy:40}
];
const FEAST_PAUSE = 45, FEAST_LEN = 12, MANA_FADE = 30;   // ticks between feasts on one island, how long it lasts, ticks per point lost

/* Gifts to other clans: what a good is worth, the return comes later and grows with trust (knots) */
const VALUE = {eier:.3, speisen:.5, blaetter:.1, steine:.2, kalk:.5, kurkuma:.8, hauer:1, reste:.05, feinmatten:4, bemtapa:4, duftoel:3, nahrung:.2, fisch:.4, meeres:.5, wild:.4, kokos:.3, wasser:.1, holz:.3, dach:.5, faser:.2, schalen:.1, harz:.8, muschel:.4, proviant:1, toepfe:1, beile:1.5, klingen:2, matten:1, schnur:1, tapa:2, oel:1.5, schweine:3, kava:2, schmuck:6, perlmutt:7, federn:10, tabua:12};
const CLANS = {
  feuer:{name:'Clan vom Feuerberg', motif:'zahn', on:'vulkan', makes:['klingen', 'schweine'], wants:['matten', 'schnur', 'schmuck', 'oel', 'feinmatten'], pop:30},
  riff:{name:'Clan vom Riff', motif:'boegen', on:'atoll', makes:['schmuck', 'matten', 'schnur'], wants:['toepfe', 'beile', 'klingen', 'duftoel'], pop:22},
  hain:{name:'Clan vom Kavahain', motif:'kreis', on:'hoch', makes:['kava', 'tapa'], wants:['matten', 'schmuck', 'klingen', 'oel', 'harz', 'bemtapa'], pop:26}
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
const giftValue = (C, cargo) => Object.entries(cargo).reduce((s, [k, v]) => s + v * VALUE[k] * (C.wants.includes(k) ? 1.5 : C.makes.includes(k) ? .3 : 1), 0);
const returnRate = knots => Math.min(1.2, .6 + .06 * knots);
/* What a clan sends back for a debt: their most valuable good first, as soon as the debt covers one, the rest in the cheaper one */
function returnGoods(C, worth){
  const cargo = {}; let left = worth, load = 0;
  const ks = C.makes.slice().sort((a, b) => VALUE[b] - VALUE[a]);
  ks.forEach((k, i) => { const q = Math.min(LOAD - load, Math.max(left >= VALUE[k] ? 1 : 0, Math.floor(left / (ks.length - i) / VALUE[k]))); if (q > 0){ cargo[k] = q; load += q; left -= q * VALUE[k]; } });
  return {cargo, left, load};
}

/* ---------- the year: twelve moons, counted from the evening the Pleiades first stand above the horizon after sunset */
const MOON = 30, YEAR = 12 * MOON, YEAR_START = 5 * MOON;   // ticks per moon; a new game begins in the trade wind season
const SEASONS = [
  {id:'plejaden', n:'Zeit der Plejaden', from:0, to:2, baum:1.5, sea:1, text:'Die Plejaden gehen auf. Das Jahr beginnt mit dem Fest der ersten Früchte.'},
  {id:'sturm', n:'Sturmzeit', from:2, to:5, baum:1, sea:.85, text:'Regen, Böen und Wirbelstürme. Kanus kommen nur mühsam voran.'},
  {id:'passat', n:'Passatzeit', from:5, to:9, baum:1, sea:1, text:'Stetiger Wind aus Südost. Gute Zeit für weite Fahrten.'},
  {id:'mager', n:'Magere Zeit', from:9, to:12, baum:0, sea:1, text:'Die Brotfrucht trägt nicht, jetzt hilft Proviant. Ein Rāhui jetzt bringt reichen Fang zum Fest.'}
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
