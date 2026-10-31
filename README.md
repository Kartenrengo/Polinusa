# Polinusa

Aufbauspiel fürs Handy im Stil von Anno. Zeit: die Lapita-Phase der Austronesier, um 1500 v. Chr.
Ein Clan fährt los, findet leere Inseln, siedelt dort und treibt Handel über das offene Meer.

## Starten

`index.html` im Browser öffnen. Es gibt keinen Build-Schritt, das Spiel läuft auch direkt von der Festplatte.
Der Spielstand liegt im `localStorage` des Browsers.

Eine einzelne Datei zum Weitergeben erzeugt:

```
node tools/bundle.mjs
```

Sie landet in `dist/polinusa.html`.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html`, `style.css` | Leisten, Tafeln und Knöpfe über der Karte |
| `src/util.js` | Zufall mit Startwert, Geometrie, Kurven |
| `src/data.js` | Waren, Gebäude, Kanus, Jahreszeiten, Feste, Kosten |
| `src/art.js` | Alle Bilder als kleine SVG-Bausteine |
| `src/world.js` | Inseln aus Startwert und Meeresfeld erzeugen, Bauregeln |
| `src/state.js` | Spielstand, Startdörfer, Speichern und Laden |
| `src/render.js` | Zeichnen auf Canvas |
| `src/ui.js` | Bedienung, Bauen, Tafeln |
| `src/quests.js` | Aufgaben für den Anfang, was sie freischalten |
| `src/fleet.js` | Kanus: Wege um Land herum, Nebel lichten, Handelsketten, Kanuhaus, Proviant |
| `src/calendar.js` | Zwölf Monde, Jahreszeiten, Palolo, Rāhui, Fest der Plejaden |
| `src/fleetui.js` | Tafeln für Kanu, Flotte, Handelskette, Kanuhaus, Kalender und Fest |
| `src/game.js` | Wirtschaft, Baustellen, Menschen, Eingabe, Hauptschleife |

Die Dateien sind einfache Skripte mit gemeinsamem globalem Bereich. Sie werden in dieser Reihenfolge geladen.

## Sparsam zeichnen

- Jedes Bild ist ein SVG-Baustein. Er wird einmal pro Größenstufe in ein Bitmap gemalt und danach nur kopiert.
  Selten genutzte Bitmaps fallen aus dem Speicher, wenn mehr als etwa 24 MB belegt sind.
- Meer, Inseln und Häuser liegen in einer Grundebene, der Nebel in einer zweiten. Beide sind etwas größer als
  der Bildschirm und werden beim Schieben nur verschoben. Neu gemalt wird erst am Rand, nach einer Änderung
  im Dorf oder wenn ein Zoom zur Ruhe kommt.
- Rauch, Menschen und Kanus kommen darüber, höchstens 30-mal pro Sekunde.
- Gezeichnet wird nur, was im Bild ist. Inseln, die noch kein Kanu gesehen hat, gibt es noch gar nicht.
- Neue Lichtungen im Nebel entstehen nur dort, wo die alten nicht schon hinreichen. So bleiben es wenige.
- Die Wirtschaft rechnet alle zwei Sekunden für alle Inseln, getrennt von der Grafik.

## Welt

Die Welt ist 4800 × 7200 groß und in Felder von 800 × 800 geteilt. Am Anfang gibt es nur die Heimat Panua und
das Atoll Motu, beide in einer Lichtung im Nebel. Alles andere entsteht erst, wenn ein Kanu dorthin schaut:
Dann wird das Feld aus Startwert und Feldnummer gewürfelt, vielleicht mit einer hohen Insel, einem Vulkan oder
einem Atoll, weiter draußen manchmal mit einem fremden Clan. Es gibt keine Markierungen, wo Land liegt.
Insgesamt entstehen etwa 30 Inseln. Hohe Inseln haben Hügel mit Schraffur, einen Wald aus einzelnen Bäumen, oft einen Bach,
der an der Küste in einem kleinen Delta mündet: Die Küste selbst wölbt sich in Sandlappen vor, zwei oder drei Arme
schlängeln sich zwischen Mangroven hindurch und öffnen sich jeder in eine kleine Bucht. Frischer Schwemmsand läuft weich ins
Gras aus, vor den Mündungen ist das Wasser trüb, und manchmal liegt dort eine kleine Sandbank. Dazu kommen Gras, Blumen, Farne, Schilf, Muscheln,
Treibholz und Steine am Strand und Korallenköpfe in der Lagune. Über jeder bekannten Insel kreisen Fregattvögel. Weil das Würfeln nur vom Startwert abhängt, liegt nach dem Laden alles wieder
an derselben Stelle. Gespeichert werden nur Startwert, gesehene Felder und was sich geändert hat, etwa 5 KB.

## Anfang

Wie bei Age of Empires steht am Anfang nur das Versammlungshaus auf Panua. Motu ist zu sehen, aber unbewohnt.
Über der Bauleiste steht immer genau eine Aufgabe. Antippen erklärt sie, „Zeig es mir“ springt zur richtigen
Stelle. Jede erledigte Aufgabe schaltet neue Gebäude frei, so bleibt die Bauleiste am Anfang klein.

1. Holzfäller am Waldrand, 2. zwei Häuser, 3. zwei Tarofelder, 4. Fischgestell, 5. 15 Bewohner, 6. Baumpflanzer,
7. Töpferei am Ton, 8. Riffsammler, 9. Kanusteg und Pfahlhaus, 10. Beilwerkstatt am Felsen, 11. Kanuhaus (dann Blumen,
Muschelwege, Fackeln und Hibiskus), 12. Auslegerkanu bauen, 13. vier Siedler nach Motu fahren und ein Dorf gründen,
14. Flechthütte und Seilerei auf Motu, 15. Handelskette: Matten und Schnur nach Panua, 16. 6 Proviant aus der Gärgrube
(dann Doppelkanu und Ahnenpfosten), 17. Doppelkanu bauen, 18. im Nebel neues Land finden, 19. ein Fest, 20. das Fest der
Plejaden, 21. ein Häuptlingsdorf, 22. das Lapita-Netz: 4 eigene Dörfer und 2 Clans mit mindestens 4 Knoten.

Ist das Netz geknüpft, zeigt eine Tafel den Rückblick: Dörfer, Menschen, Clans, Knoten, Kanus, Ansehen und entdeckte Inseln.
Danach geht das Spiel weiter. Im Menü lässt sich der Rückblick wieder öffnen.

## Essen

Alles Essen zählt als **Nahrung**. Oben steht nur eine Zahl, in der Übersicht und im Lager darunter jede Sorte. Jeder
Bewohner isst 1,2 pro Minute, und die Leute essen das, wovon am meisten da ist.

| Sorte | Woher |
| --- | --- |
| Feldfrüchte | Tarofeld und Brotfruchtbaum (hohe Inseln), Pulakagrube mit Sumpftaro in der Mitte eines Motus (Atolle) |
| Fisch | Fischgestell am Strand: die Fischer paddeln hinaus und hängen den Fang auf |
| Meeresfrüchte | Riffsammler am Strand: Muscheln, Krebse, Seeigel, Tintenfisch |

Fehlt Nahrung, ziehen Leute fort. Werkstätten und Feste brauchen bestimmte Sorten: Gärgrube und Schweinepferch
Feldfrüchte, das Kleine Fest Fisch, das Große Meeresfrüchte, die ersten Früchte beim Fest der Plejaden Feldfrüchte, Fisch
und Schweine. Unter Rāhui ruhen Fischgestell und Riffsammler, nach dem Fest fangen sie dreimal so viel. In der
Palolo-Nacht gibt es Meeresfrüchte für alle.

## Fischfang

Steinreusen gibt es nicht mehr; das Fischgestell ist alles in einem. Zwei Fischer gehen zum Strand, schieben ihren Einbaum
ins Wasser und paddeln in einem Bogen hinaus. Draußen werfen sie Netz und Leine mit Muschelhaken aus, dann paddeln sie
zurück und hängen den Fang ans Gestell, wo man ihn trocknen sieht. Erst wenn die Gestelle voll sind, tragen sie getrockneten
Fisch ins Lager. Ein Fang bringt 2 Fische, mit Netzen aus Schnur 4. Liegt niemand draußen, liegt der Einbaum am Strand.

## Die Lagune und der Einbaum

Pfahlhäuser stehen in der Lagune. Sie brauchen kein Land, das Wald und Felder belegen. Hin kommt man nur mit
dem Einbaum vom Kanusteg. Ein Steg hat einen Einbaum, der bis zu 4 Plätze anfährt, die ältesten zuerst. Auf einem Atoll gilt
das auch für Arbeitsplätze auf einem Motu, auf dem niemand wohnt. Ohne Einbaum zählt ein Pfahlhaus nicht als Wohnraum, und der
Arbeitsplatz bleibt leer. Über ihm schwebt dann ein Einbaum in der Sprechblase. Die Einbäume paddeln sichtbar hin und her.
Der Steg zeigt beim Bauen von selbst zum Wasser.

## Arbeit, Bauleute und die Übersicht

Vorbild sind Manor Lords und Foundation. Etwa sieben von zehn Bewohnern können arbeiten, Kinder und Alte nicht. Jede
Arbeitskraft wird einer Aufgabe zugeteilt, und **jeder Bewohner ist auf der Karte eine Figur**: 16 Bewohner sind 16 Figuren.
Erst ab 80 Menschen auf einer Insel bleiben einige zu Hause, die Übersicht sagt dann, wie viele.

- **Wer wo arbeitet:** Über jedem Arbeitsplatz hängt nah herangezoomt ein kleines Schild mit einer Figur je Platz: dunkel
  bei der Arbeit, gelb auf dem Weg, leer für einen freien Platz, durchgestrichen, wo du den Platz geschlossen hast. Wer
  arbeitet, hält sein Werkzeug: Steinbeil für Bauleute, Holzfäller und Kanubauer, Grabstock für Feld und Pflanzer, Speer
  für Fischer. Alte gehen mit Stock und haben graues Haar, Kinder sind kleiner.
- **Ohne Arbeit:** Neben der Bewohnerzahl oben steht, wie viele keine Arbeit haben. Antippen zeigt sie nacheinander auf
  der Karte, mit Namen.
- **Jede Arbeit sieht anders aus:** Wer am Arbeitsplatz ist, arbeitet sichtbar. Am Feld stößt der Grabstock in die Erde,
  der Holzfäller schlägt Späne, die Bauleute hämmern mit dem Steinbeil, in der Töpferei wächst ein Topf unter den Händen,
  in der Beilwerkstatt wird ein Beil auf Sandstein geschliffen, der Klingenschläger schlägt Splitter vom Obsidian, in der
  Flechthütte wächst eine Matte auf dem Schoß, in der Seilerei wird Kokosfaser zu Schnur gerollt, in der Klopfhütte schlägt
  der Klöppel Rinde dünn, im Kavagarten wird die Wurzel gestampft, in der Schmuckschleiferei läuft der Bogenbohrer, am Pferch
  fliegt Taro zu den Schweinen, an der Gärgrube werden Bananenblätter ausgelegt, der Pflanzer kniet, die Riffsammler waten.
  Handwerk geschieht im Sitzen auf einer Matte.
- **Antippen:** Eine Figur antippen zeigt ihren Namen und was sie tut („Lupe · Bau Haus · holt Holz“) und öffnet ihren
  Arbeitsplatz. Ist ein Gebäude gewählt, tragen seine Leute eine kleine Marke über dem Kopf.
- **Reihenfolge:** In der Übersicht (Bewohnerzahl oder die Zeile darunter antippen) legst du fest, welche Arbeit zuerst
  Leute bekommt: Bauen, Feldfrüchte, Fisch und Meer, Holz, Kanubau, Handwerk. Innerhalb jeder Gruppe zuerst das Älteste.
  Unter jeder Gruppe stehen ihre Arbeitsplätze mit denselben Figuren wie auf den Schildern.
- **Bauleute:** Jede Baustelle braucht 2 Leute. Sie kommen aus der Arbeit, die weiter unten steht, und gehen sichtbar
  hinüber. Erst holen sie das Holz aus dem Lager, ein Stück pro Gang, dann bauen sie. **Gebaut wird nur, solange Bauleute an
  der Baustelle sind, und nur so weit, wie Holz da ist.** Ein Speicher in der Nähe spart Wege. Ist die Baustelle fertig,
  kehren sie zurück.
- **Baustellen:** Erst markieren Pflöcke und eine Schnur den Platz. Daneben liegt das Holz, das schon gebracht wurde. Dann
  wächst das Gebäude vom Boden nach oben, und der Holzstapel wird kleiner. Ein Haus dauert etwa 40 bis 50 Sekunden mit den
  Wegen, das Versammlungshaus gut zwei Minuten.
- **Wer da ist, arbeitet:** Eine Werkstatt oder ein Feld erzeugt erst, wenn die Leute angekommen sind. Fischer paddeln im
  Einbaum hinaus und kommen mit dem Fang zurück, Riffsammler waten im flachen Wasser. Auf einem Atoll paddeln die Leute
  im Einbaum über die Lagune zu ihrem Motu.
- **Weniger Arbeiter:** In jedem Gebäude lässt sich die Zahl der Arbeiter begrenzen, bis auf null. Mit halber Besetzung geht
  die Arbeit halb so schnell.
- **Die Arbeit läuft weiter,** auch wenn die Karte nicht gezeichnet wird: Die Schritte der Leute werden dann nachgeholt.
- **Gebäude-Tafeln** sind kurz: oben die Leute mit Namen, eine Zeile mit Zustand und Ertrag, alles Weitere unter „Mehr dazu“.
- **Die Zeile oben** zeigt immer: wie viele arbeiten und wie viele bauen, wie lange das knappste Essen noch reicht, und wann
  der Nächste zuzieht.
- **Die Übersicht** zeigt Bewohner (arbeiten, ohne Arbeit, Kinder, Alte), den Zuzug (alle 6 Sekunden jemand, solange Platz
  ist und nichts fehlt), die Arbeit nach Reihenfolge mit allen Arbeitsplätzen, für jedes Essen Lager, Erzeugung, Verbrauch
  und Reichweite, und den weiteren Bedarf.

## Während ihr fort wart

Die Inseln leben weiter, wenn das Spiel geschlossen ist oder im Hintergrund liegt, bis zu acht Stunden.

- **Was weiterläuft:** Baustellen werden fertig, Einbäume geschnitzt, das Kanuhaus baut weiter, Felder, Werkstätten,
  Fischer und Taucher erzeugen, so weit Platz im Lager und Material da ist, Bäume wachsen nach, Menschen ziehen zu, solange
  Häuser frei sind und nichts fehlt. Die Jahreszeiten gehen weiter. Kanus fahren ihre Kurse, Handelsketten handeln,
  ein Doppelkanu, das von selbst erkundet, erkundet weiter. Clans schicken ihre Gegengaben.
- **Was nicht passiert:** Niemand zieht hungrig fort, kein Wirbelsturm und kein anderes Ereignis kommt, keine Schnur
  verliert Knoten, das Ansehen schwindet nicht (Chronik-Einträge bringen trotzdem ihr Ansehen). Ausgelaugte Felder lassen
  die Leute selbst brachliegen.
- **Der Bericht:** Beim Zurückkommen öffnet sich „Während ihr fort wart“: wie lange, wie viele Jahre auf den Inseln, wer
  zugezogen ist, was fertig gebaut und erzeugt wurde, welche Felder ruhen, welche Inseln entdeckt und welche Kanus vom
  Stapel gelaufen sind, neue Chronik-Einträge und geschaffte Aufgaben. Dasselbe steht in den Nachrichten der Muschel.
- Das gilt beim Öffnen eines gespeicherten Spiels und beim Zurückkehren in einen Tab, der im Hintergrund lag. Gespeichert
  wird auch beim Schließen, damit die Zeit stimmt. Acht Stunden rechnet das Spiel in einer Viertelsekunde nach: das Dorf
  Minute für Minute, das Meer Tick für Tick.

## Generationen und Ahnen

Jeder Bewohner ist ein Mensch mit Namen, Geburt und Lebensspanne, und jede Figur im Dorf ist genau dieser Mensch.

- **Lebenslauf:** Kinder wachsen in sechs Jahren heran und arbeiten dann. Ab vierzig sind die Leute alt und arbeiten
  nicht mehr. Zwischen 44 und 58 sterben sie und gehen zu den Ahnen. Ein Jahr auf den Inseln dauert zwölf Minuten:
  nah dran sieht man Kinder groß werden, und wer nach einem Tag wiederkommt, findet eine neue Generation.
- **Neue Menschen:** Wächst das Dorf, ziehen Leute zu, und ab zehn Bewohnern wird gut jedes dritte Kind im Dorf geboren.
  Kinder bekommen oft den Namen eines Ahnen, wie es in Polynesien üblich ist.
- **Siedler** gehen mit ihrem Namen an Bord und gründen das neue Dorf selbst.
- **Häuptlinge:** Im Häuptlingsdorf führt der Älteste, der kein Kind mehr ist. Stirbt er, folgt der nächste. Die Reihe
  der Häuptlinge wird festgehalten, wie Häuptlingsgenealogien vorgetragen wurden.
- **Ahnenhaus** (mit der Aufgabe „Ein Fest“): Hier werden die Schädel der Ahnen verwahrt, wie es die Lapita in Teouma vor
  dreitausend Jahren taten, die ihre Toten bestatteten und später den Schädel an besonderem Ort niederlegten. Stirbt
  jemand, bringt das Ansehen +1, ein Häuptling +3.
- **Alle Menschen:** In der Übersicht unter den Bewohnern, oder im Ahnenhaus unter „Ahnenreihe“: Erwachsene, Kinder und
  Alte mit Alter, die Häuptlinge und die Ahnen mit ihrem Lebensalter. Eine Figur antippen zeigt Namen und Alter.
- **Nachrichten:** Ein Tod rollt aus der Muschel; dass ein Kind erwachsen geworden ist, kommt still in die Liste. Der
  Bericht „Während ihr fort wart“ sagt, wie viele geboren wurden, zugezogen und erwachsen geworden sind, wer zu den Ahnen
  gegangen ist und wer Häuptling wurde.
- Ältere Spielstände bekommen beim Laden Menschen mit gemischtem Alter für ihre Bewohnerzahl.

## Die große Fahrt

Nach dem Lapita-Netz ruft die Ferne, wie bei den Lapita, die vor dreitausend Jahren bis Fidschi, Tonga und Samoa fuhren.

- **Die Weite See:** Östlich der Heimat liegt offenes Meer ohne Land, auf der Seekarte beschriftet. Mitten darin liegt
  nur **Tifa**, ein Atoll mit Perlmuscheln, ein Halt auf halbem Weg. Dahinter beginnen die **Fernen Inseln**, dichter
  besiedelt mit Inseln und Clans. Hinüber fährt nur das Doppelkanu; das Auslegerkanu bleibt diesseits.
- **Schatzinseln:** Tifa (Perlmutt), Kula (rote Federn, im Wald leben rote Papageien) und Tabua (Walzähne, in der Bucht
  stranden Pottwale). Liegt ein Kanu dort vor Anker, sammelt die Mannschaft, ein Stück alle paar Sekunden; die Insel
  bringt es langsam wieder hervor. Ein eigenes Dorf dort sammelt auch. Schätze sind die wertvollsten Gaben für Clans
  und gehören auf das **Fest der Schätze** (2 Perlmutt, 2 rote Federn, 1 Walzahn, 2 Schweine): Ansehen +30, und das Dorf
  wächst eine Weile doppelt so schnell. Auf der Karte stehen sie mit ihrem Schatz unter dem Namen.
- **Neue Aufgaben:** Die Weite See überqueren, alle drei Schätze heimbringen, ein Dorf in der Ferne gründen, das Fest der
  Schätze feiern. Danach kommt der Rückblick. Ältere Spielstände, die schon fertig waren, machen hier weiter.
- **Von selbst erkunden:** In der Tafel des Doppelkanus „Erkunden lassen“. Es fährt an den Rand des Bekannten, wohin es
  mit dem Proviant hin und zurück kommt, eher nach Osten. Wird der Proviant knapp, kehrt es zum nächsten eigenen Hafen
  zurück, lädt alles aus, nimmt bis zu 24 Proviant an Bord und fährt wieder los, bis du es anhältst oder das Lager leer
  ist. Steuert man es selbst, hört es auf. Über die ganze Weite See steuerst du selbst: Erkunden geht nur mit Proviant,
  erst danach folgen Siedler und Waren.
- **Vor Anker essen** die Seefahrer an Land; Proviant brauchen sie nur auf See.
- Ältere Spielstände behalten ihr Meer; bei ihnen liegen alle drei Schatzinseln bei den Fernen Inseln.

## Taucher

Nach dem Vorbild der Freitaucher im Pazifik, die seit Jahrtausenden ohne Atemgerät tauchen, bis zu den Perltauchern der
Tuamotu. Der **Tauchplatz** kommt mit der Aufgabe „Leben auf dem Wasser“ und steht am Strand.

- **Zu zweit:** Zwei Taucher paddeln im Einbaum hinaus. Einer taucht, der andere wacht im Kanu und hält die Schnur, dann
  tauschen sie; nie sind beide zugleich unten. Wer allein ist, ruht länger, weil niemand wacht.
- **Mit Stein und Schnur:** Ein Stein an einer Schnur zieht den Taucher schnell hinab. Man sieht das leere Kanu, die
  Schnur ins Wasser und aufsteigende Luftblasen. Ohne Brille, mit offenen Augen; ein Tauchgang dauert ein bis zwei
  Minuten (im Spiel ein paar Sekunden), dann wird an der Oberfläche Atem geholt.
- **Taravana:** Nach höchstens fünf Tauchgängen, vor Tifa schon früher, rudern sie zurück und ruhen an Land, bis der Atem
  wieder da ist. Wer zu oft zu tief taucht, bekommt Taravana, die Taucherkrankheit der Tuamotu.
- **Wetter:** Bei starkem Wind ist das Wasser aufgewühlt und trüb, nachts dunkel, unter Rāhui ruht das Riff. Dann
  bleiben sie an Land, eine Blase zeigt warum. Je klarer das Wasser, desto öfter finden sie etwas.
- **Was sie bringen:** Riesenmuscheln, Kraken und Seegurken als Meeresfrüchte (eine Riesenmuschel reicht für zwei). Auf
  Atollen, wo es keinen Stein gibt, schleifen sie aus der dicken Schale der Riesenmuschel ab und zu ein Beil, wie es auf
  den Atollen Mikronesiens und Polynesiens üblich war. Vor Tifa holen sie Perlmutt aus der Tiefe. Liegt ein Kanu vor
  Tifa, taucht auch seine Mannschaft nach Perlmuscheln.
- Die Tafel zeigt, ob gerade Tauchwetter ist; unter „Mehr dazu“ steht, wie Taucher wirklich arbeiteten, auch der alte
  Brauch, zerkaute Kokosnuss aufs Wasser zu spucken, damit die Oberfläche glatt wird und man den Grund sieht.
- Chronik: „Mit offenen Augen“ nach 100 Tauchgängen.

## Der Boden und der Wald

- **Felder laugen aus:** Jede Ernte auf Tarofeld, Pulakagrube und Kavagarten zehrt am Boden. Unter 45 % wird das Feld
  blass und rissig, die Arbeit geht langsamer, unter 35 % zeigt eine Blase den müden Boden. Stehen Bäume daneben
  (Brotfrucht, Kokos, Waldrand), laugt es nur halb so schnell aus, wie in den alten Baumgärten.
- **Brache:** Im Feld „Brachliegen lassen“. Dann wächst Gras darüber, die Arbeiter werden frei, und in gut zwei Minuten
  ist der Boden ausgeruht; danach wird es von selbst wieder bestellt.
- **Erosion:** Steht auf einer hohen Insel weniger als 45 % des ursprünglichen Waldes, spült der Regen die Erde ins Meer:
  Vor den Flussmündungen wird das Wasser braun, Felder laugen 1,6-mal so schnell aus, Riffsammler arbeiten langsamer.
  Unter 25 % ist es schlimmer. Die Übersicht zeigt unter „Land“ den Wald und die müden Felder.
- **Wirbelstürme** kommen in der Sturmzeit öfter als alles andere. Wer nicht vorsorgt, verliert Dächer, eine Werkstatt
  und ein bis zwei Häuser (bis sie neu gebaut sind, ziehen Leute fort), Bäume fallen, die Felder werden ausgewaschen,
  und an kahlen Hängen rutscht Erde auf ein Feld.

## Inseln wechseln

Gebaut wird auf der Insel, die man nah vor sich hat. Wer heranzoomt, ist dort; die Leisten zeigen dann diese Insel. Von
weiter weg bringt ein Tipp auf eine Insel die Karte nah heran. So geht es: heranzoomen, bauen, herauszoomen, die nächste
Insel antippen.

## Bauleiste und Wege

- Die Bauleiste hat zwei Reiter: **Bauen** für alles, was das Dorf braucht, und **Schmuck** für Hibiskus, Blumen, Fackeln,
  Ahnenpfosten, Trommel und Tanzplatz.
- **Trampelpfade entstehen von selbst** dort, wo die Leute wirklich gehen: Die Füße treten das Gras weg, erst ein heller
  Schimmer, dann ein deutlicher Pfad. Wo niemand mehr geht, wächst er langsam wieder zu.
- **Wege anlegen:** Ganz am Ende der Leiste steht „Weg“. Auf der Insel Punkt für Punkt tippen, den letzten Punkt noch einmal
  antippen nimmt ihn zurück, „Anlegen“ legt den Weg an, „Fertig“ beendet. Wege aus Muschelsand und Korallenkies kosten
  nichts, die Leute gehen darauf schneller, und sie schmücken das Dorf (je 60 Schritte 1, höchstens 8).
- **Wege entfernen:** Daneben steht „Weg weg“. Jeder Tipp auf ein Stück Weg nimmt das Stück zwischen zwei Punkten fort.
  Einen Weg sonst antippen, dann lässt er sich ganz entfernen.

## Kanus entstehen

- **Erst das Kanu, dann das Wasser:** Ist ein Fischgestell gebaut, schnitzt der Fischer zuerst seinen Einbaum, etwa eine Minute.
  Man sieht den Stamm, das Aushöhlen mit Spänen und das fertige Kanu am Strand. Erst dann fährt er hinaus. Ebenso am Kanusteg:
  Er bedient Pfahlhäuser erst, wenn sein Einbaum fertig ist.
- **Im Kanuhaus** entsteht ein Auslegerkanu in etwa zweieinhalb Minuten, ein Doppelkanu in etwa fünf, mit 3 Bauleuten,
  die vorher das Holz herbeitragen.
  Sechs Schritte: Holz holen, Stamm auf Böcken, Aushöhlen mit Steinbeil und Glut, Bordplanken mit Kokosschnur angenäht,
  Ausleger oder zweiter Rumpf mit Plattform, Paddel oder Mast und Mattensegel. Die Tafel des Kanuhauses zeigt sie in einer
  Zeile („Schritt 3/6 · Aushöhlen“) mit Balken, Holz und Restzeit; auf der Karte steht der Schritt neben den Bauleuten.

## Holz und Wald

Holz gibt es nur noch vom Holzfäller. Er fällt die Bäume in seiner Reichweite, den nächsten zuerst. Jeder Baum hat 3 Holz,
danach bleibt ein Stumpf. Von selbst treibt er erst nach acht Minuten wieder aus, dann wächst der junge Baum drei Minuten.
Der Baumpflanzer setzt sofort Setzlinge auf Stümpfe und an den Waldrand, aber nur neben stehende Bäume. Wo Bäume stehen,
kann nichts gebaut werden. Auf einem Stumpf darf man bauen, dann ist er weg. Der Platz auf einer Insel reicht also nicht für
alles: Wald, Felder und Dorf teilen sich das Land. Atolle haben keinen Wald, ihr Holz kommt mit dem Kanu.

## Kanus

Kanus entstehen im Kanuhaus, eins nach dem anderen. Am Strand liegt dann der halbfertige Rumpf im Gerüst.

| Kanu | Kosten | Bauzeit | Trägt | Darf |
| --- | --- | --- | --- | --- |
| Auslegerkanu | 4 Holz, 1 Steinbeil | etwa 3 min | 12 Waren, 4 Menschen | nur ins Bekannte |
| Doppelkanu | 6 Holz, 2 Steinbeile, 3 Matten, 3 Schnur | etwa 6 min | 24 Waren, 8 Menschen | auch in den Nebel |

- **Gemächlich und in Bögen:** Kanus fahren langsamer als früher und nie mit dem Lineal. Lange Strecken schwingen in Bögen
  aus, mal links, mal rechts, und werden gerundet, solange kein Land im Weg ist. Auf der Dünung schaukeln sie. Auch die
  Einbäume am Kanusteg fahren in einem Bogen.
- **Steuern:** Kanu antippen, dann auf das Meer oder eine Insel tippen. Es sucht sich den Weg um das Land herum.
  Der restliche Weg ist gepunktet zu sehen. Unten öffnet sich die Tafel des Kanus, „Beladen“ klappt die Ladeliste auf.
- **Nebel:** Wo ein Kanu fährt, lichtet sich der Nebel. Das Doppelkanu sieht weiter als das Auslegerkanu.
- **Proviant** entsteht in der Gärgrube: Brotfrucht gärt unter Bananenblättern und hält monatelang, 1 Feldfrucht je
  Proviant, mit 2 Brotfruchtbäumen daneben. **Ins Unbekannte nimmt das Doppelkanu nur Proviant mit**, keine Siedler und
  keine anderen Waren; die folgen, wenn Land gefunden ist. Die Mannschaft isst jeden Reisetag (10 Sekunden) 1 Proviant.
  Die Tafel des Kanus sagt, ob es bereit zum Erkunden ist und wie lange der Proviant reicht. Geht er aus, kehrt die
  Mannschaft langsam zur nächsten eigenen Insel zurück.
- **Siedeln:** Mit 4 Siedlern an Bord vor einer leeren Insel „Dorf gründen“. Mitgebrachtes Holz und Essen kommt ins Lager.
- **Wind:** Er folgt dem Jahr wie im Südwestpazifik: zur Zeit der Plejaden leicht aus Ost, in der Sturmzeit böig aus
  Nordwest, in der Passatzeit beständig aus Südost, in der mageren Zeit mäßig aus Ostsüdost. Innerhalb einer Zeit dreht
  und frischt er langsam, von einer Zeit zur nächsten geht er sacht über. Mit dem Wind fahren Kanus schneller, gegen ihn
  langsamer, das Doppelkanu mit seinem großen Segel stärker als das Auslegerkanu. Die Wolken ziehen mit ihm, der Regen
  fällt schräg. Am Kompass dreht sich das Federband in seine Richtung und flattert, je stärker er weht; darunter steht,
  woher er kommt. In der Sturmzeit ist die See zudem rau.
- **Flotte:** Der Knopf rechts in der Bauleiste listet alle Kanus und Handelsketten.
- **Wer und was an Bord ist:** Über jedem Kanu steht eine kleine Tafel mit Zahlen: die Besatzung (Paddler oder Seefahrer,
  blau mit Paddel), Siedler (rot), dann jede Ware. Kanus der Clans haben eine gelbe Tafel mit Boten oder Festgästen.
  Antippen zeigt mehr.
- **Wege:** Kanus fahren nie über Land. Das Meer ist in ein Raster von 20 × 20 geteilt, Felder nahe der Küste sind gesperrt,
  und das Ablegen und Anlegen wird genau gegen die Küstenlinie geprüft.

## Handelsketten

Sobald ein Kanu von einer eigenen Insel zu einer anderen eigenen Insel oder zu einem Clan gefahren ist, verbindet sie
eine Schnur. Tippt man sie an, kann man Kanus in die Kette setzen und für jede Richtung einstellen, was mitfahren soll.
Ein Kanu in der Kette fährt dann allein hin und her, lädt aus, lädt ein und wartet kurz. Jede Fahrt knüpft einen Knoten,
mit mehr Knoten geht es schneller. Bei einem Clan wird die Ladung zur Gabe. Steuert man ein Kanu selbst, verlässt es die Kette.

## Schmuck im Dorf

Eigener Reiter in der Bauleiste. Hibiskus, Blumenbeet, Fackel, Ahnenpfosten (wie die Gesichter auf der Lapita-Keramik), Schlitztrommel und
Tanzplatz. Jedes Stück hat einen Schmuckwert. Alle halbe Minute bringt die Schönheit des Dorfes etwas Ansehen, so weit
die Bewohner sie genießen können, höchstens 2 pro Minute und Insel. Ein Häuptlingsdorf braucht Schönheit 10. Beim Fest der Plejaden zählt sie mit.

## Das Jahr

Ein Mond dauert eine Minute, das Jahr hat zwölf. Es beginnt, wenn die Plejaden nach Sonnenuntergang aufgehen, wie
beim Makahiki auf Hawaiʻi oder bei Matariki in Aotearoa. Das Spiel beginnt im 6. Mond. Der Mond steht unter dem Kompass,
Antippen öffnet den Kalender.

| Zeit | Monde | Wirkung |
| --- | --- | --- |
| Zeit der Plejaden | 1–2 | Neujahr und Fest, Brotfrucht reichlich |
| Sturmzeit | 3–5 | Kanus langsamer |
| Passatzeit | 6–9 | Kanus schneller |
| Magere Zeit | 10–12 | Brotfrucht trägt nicht, Proviant aus der Gärgrube hilft |

- **Palolo:** Eine Woche nach Vollmond im ersten Mond steigt der Palolo-Wurm aus dem Riff. Drei Takte lang
  schöpfen alle Inseln Meeresfrüchte, mit Fischgestellen und Riffsammlern mehr.
- **Rāhui:** In der mageren Zeit kann eine Insel mit Fischgestell oder Riffsammler ihr Riff sperren. Bis zum Fest
  ruht der Fang, danach ist er dreimal so reich, und das Ansehen steigt um 3.

## Fest der Plejaden

In der Zeit der Plejaden im Versammlungshaus. Die ersten Früchte (12 Feldfrüchte, 6 Fisch, 2 Schweine) gehören den Ahnen, das bringt
Ansehen 10. Dazu kann man wählen:

- Kava-Runde (3 Kava): +5, Gäste der Clans knüpfen einen Knoten mehr. Kava wächst im Kavagarten oder kommt vom Clan vom Kavahain.
- Tanz zur Schlitztrommel: +4, braucht Schlitztrommel und Tanzplatz. Die Leute tanzen dann im Kreis auf dem Tanzplatz.
- Kanurennen in der Lagune: +2 je Kanu im Hafen, höchstens vier. Die Kanus fahren um das Riff.

Die Schönheit des Dorfes bringt bis zu 8 mehr. Clans mit mindestens 2 Knoten kommen als Gäste mit Gaben, und ihre Schnur
bekommt Knoten dazu. Danach wächst das Dorf einen Mond lang doppelt so schnell. Einmal im Jahr pro Insel.

## Wirtschaft: Gabe und Gegengabe

Vierzehn Waren: Feldfrüchte, Fisch, Meeresfrüchte, Holz, Proviant, Töpfe, Steinbeile, Klingen, Matten, Schnur, Tapa,
Schweine, Kava, Muschelschmuck.
Ketten haben höchstens drei Glieder.

| Gebäude | Insel | Braucht | Macht pro Minute | reicht für etwa |
| --- | --- | --- | --- | --- |
| Holzfäller | hoch | Bäume in Reichweite, Steinbeile machen ihn schneller (1 Beil je 20 Holz) | 15 Holz, ohne Beile 10 | |
| Baumpflanzer | hoch | Stümpfe oder Waldrand in Reichweite | 7,5 junge Bäume | einen Holzfäller |
| Tarofeld | hoch | | 15 Feldfrüchte | 12 Menschen |
| Brotfruchtbaum | hoch | | 5 Feldfrüchte, je nach Jahreszeit | 4 Menschen |
| Pulakagrube | Atoll, in der Mitte eines Motus | | 10 Feldfrüchte | 8 Menschen |
| Fischgestell | am Strand | 2 Fischer, Schnur für Netze verdoppelt den Fang (1 Schnur je 8 Fisch) | etwa 25 Fisch, ohne Netze 12 | 20, ohne Netze 10 |
| Riffsammler | am Strand | | 7,5 Meeresfrüchte | 6 |
| Gärgrube | hoch | 2 Brotfruchtbäume daneben, 1 Feldfrucht je Proviant | 7,5 Proviant | |
| Töpferei | hoch | Ton in der Nähe, 1 Holz je Topf | 3,75 Töpfe | 53 |
| Beilwerkstatt | hoch | Basaltfelsen in der Nähe | 3,75 Steinbeile | 5 Holzfäller |
| Klingenschläger | Vulkan | Obsidian in der Nähe | 3 Klingen | 2 Schmuckschleifereien |
| Maulbeergarten + Klopfhütte | hoch | Garten neben der Hütte | 3 Tapa | 50 |
| Schweinepferch | hoch | 2 Feldfrüchte je Schwein | 1,9 Schweine | 47 |
| Flechthütte | Atoll | 2 Pandanus daneben | 3,75 Matten | 62 |
| Seilerei | Atoll | 3 Kokospalmen daneben | 5 Schnur | 4 Fischgestelle |
| Schmuckschleiferei | Atoll, am Strand | 1 Klinge je Ring | 1,5 Muschelschmuck | 75 |
| Kavagarten | hoch | | 2,5 Kava | 83 |

Jede Werkstatt reicht für ein Dorf von etwa 50 bis 80 Menschen. Wer weiter wächst, braucht eine zweite, also mehr
Arbeitskräfte, mehr Platz und mehr Handel. Schnur und Steinbeile werden dauerhaft verbraucht: Atolle liefern Schnur für die
Netze der hohen Inseln, die hohen Inseln Beile und Holz.

- **Vorkommen:** Ton liegt am Bach, Basalt an den grauen Felsen, Obsidian nur am Vulkan. Beim Bauen zeigen Ringe,
  wo sie liegen. Diese Rohstoffe werden nicht gelagert, die Werkstatt muss daneben stehen.
- **Stillstand:** Fehlt einer Werkstatt etwas, schwebt das fehlende Zeichen über ihr. Die Tafel des Gebäudes und das Lager
  sagen, warum.
- **Lager:** Die Warenleiste oben zeigt bis zu sieben wichtige Waren. Antippen öffnet das Lager mit allem, was pro Minute
  dazukommt und weggeht.

## Bedarf und Stufen

| Stufe | Ab | Braucht pro Bewohner und Minute |
| --- | --- | --- |
| Weiler | Anfang | Nahrung 1,2 (jede Sorte zählt) |
| Dorf | 20 Bewohner | dazu Töpfe 0,07, ab 30 Bewohnern Matten 0,06 |
| Häuptlingsdorf | 40 Bewohner, Ansehen 20, Schönheit 10, Nahrung, Töpfe und Matten reichen, Tapa, Schweine, Kava und Schmuck im Lager | dazu Tapa 0,06, Schweine 0,04, Kava 0,03, Muschelschmuck 0,02 |

Im Häuptlingsdorf wohnen 6 statt 4 Menschen in jedem Haus. Die Häuser bekommen geschnitzte Pfosten und Muschelschmuck.
Fehlt dort 30 Takte lang etwas, wird es wieder ein Dorf, und die Leute ziehen nach und nach aus.
Ein Dorf wächst, solange Platz in den Häusern ist und nichts fehlt. Ohne Nahrung ziehen langsam Leute fort.

- Die Bewohnerzahl oben öffnet die Tafel „Bedarf“. Der Punkt daneben: grün wächst, gelb Häuser voll, rot es fehlt etwas.
- Fehlt etwas, schwebt das Zeichen der Ware über einigen Häusern. Zieht jemand ein, steigt ein Herz auf.

## Ansehen

Das Ansehen des Clans wächst mit Festen im Versammlungshaus (Kleines Fest: 10 Feldfrüchte, 4 Fisch und 2 Töpfe, +5;
Großes Fest: 4 Schweine, 12 Feldfrüchte, 4 Meeresfrüchte und 2 Tapa, +15), mit dem Fest der Plejaden, mit Gaben an andere Clans und mit einem
schönen Dorf. Es sinkt um etwa 1 pro Minute.
Gebraucht wird es für jede weitere Siedlungsfahrt (8 mehr pro Siedlung nach den ersten beiden) und für ein Häuptlingsdorf.
Beim Fest versammelt sich das Dorf am Feuer vor dem Versammlungshaus.

## Fremde Clans

Weiter draußen leben schon Menschen: der Clan vom Feuerberg auf Vulkanen (macht Klingen und Schweine, schätzt Matten,
Schnur und Muschelschmuck), der Clan vom Riff auf Atollen (macht Muschelschmuck und Matten, schätzt Töpfe, Steinbeile
und Klingen) und der Clan vom Kavahain auf hohen Inseln (macht Kava und Tapa, schätzt Matten, Muschelschmuck und Klingen).
Erreicht ein Kanu einen Clan, entsteht eine Schnur. Waren an einen Clan sind Gaben: „Gabe übergeben“ im Kanu oder
eine Handelskette. Sie antworten später mit einem eigenen Kanu voller Waren. Wie reich die Gegengabe ausfällt,
hängt von den Knoten auf der Schnur ab. Muschelschmuck knüpft einen Knoten extra, ohne Gaben löst sich alle drei Minuten einer.
So funktionierten Wertgegenstände im Pazifik: als Gaben, die Beziehungen stiften, nicht als Geld.

## Ereignisse und Chronik

Alle fünf bis acht Minuten geschieht auf einer eigenen Insel etwas, angekündigt vom Muschelhorn. Jedes Ereignis hat zwei oder
drei Antworten, manche kosten Waren:

| Ereignis | Wann | Antworten |
| --- | --- | --- |
| Wirbelsturm | Sturmzeit | Dächer mit Schnur und Holz festbinden, oder abwarten: Dächer vergrauen, eine Werkstatt muss neu gebaut werden |
| Schiffbrüchige | jederzeit | aufnehmen (bis zu 4 neue Bewohner), mit Proviant weiterschicken (Ansehen), nichts geben |
| Thunfischschwarm | Passatzeit | alle Kanus hinaus (12 Fisch) oder weiterarbeiten |
| Dürre | Magere Zeit | Regenzeremonie mit Kava, Wasser in Töpfen tragen (halber Mond halbe Ernte), durchhalten (ein Mond) |
| Bitte eines Clans | mit einer Schnur zu einem Clan | schicken, was sie brauchen (zwei Knoten, spätere Gegengabe) oder ablehnen (ein Knoten weniger) |
| Hochzeit | ab 20 Bewohnern | ein Fest (das Dorf wächst eine Weile doppelt) oder im kleinen Kreis |
| Fremder Navigator | nach der ersten Fahrt ins Unbekannte | bewirten: er zeigt den Weg zur nächsten unbekannten Insel |
| Brotfruchternte | Zeit der Plejaden | alles ernten (Feldfrüchte und Proviant) |

Wer ein Ereignis schließt, ohne zu wählen, lässt es vorübergehen. Die **Chronik** im Menü hält zwanzig Meilensteine fest,
vom ersten Dach bis zu fünf Jahren auf den Inseln, darunter fünf Dörfer, alle drei Clans, 30 Knoten, 150 Menschen,
50 gepflanzte Bäume und 500 gefangene Fische. Jeder bringt Ansehen und wird mit dem Jahr eingetragen.

## Tag, Nacht und Klang

- **Schatten:** Jedes Haus, jeder Baum, jede Figur, jedes Tier und jedes Kanu wirft seinen eigenen Umriss als Schatten.
  Die Sonne geht im Osten auf, steht mittags hoch im Norden (die Inseln liegen südlich des Äquators) und geht im Westen
  unter: morgens fallen lange Schatten nach Westen, mittags kurze nach Süden, abends lange nach Osten, nachts keine.
  Flaches wie Felder und Wege wirft keinen. Ohne Tag und Nacht steht die Sonne am späten Nachmittag. Dazu ziehen
  Wolkenschatten mit dem Wind übers Land.
- Ein Tag dauert sechs Minuten. Am Abend wird das Licht warm, die Nacht ist tiefblau. Fackeln, das Feuer vor dem
  Versammlungshaus, Türen, Töpferöfen und Vulkane leuchten.
- Brandung läuft am Riff entlang und schwillt an, auf den Lagunen glitzert die Sonne. In der mageren Zeit wird das Gras
  trocken, in der Sturmzeit dunkler.
- Das Versammlungshaus bekommt im Dorf Tapa-Fahnen und im Häuptlingsdorf eine Muschelgirlande.
- Der Klang entsteht im Browser, ohne Tondateien: Brandung, die beim Heranzoomen lauter wird, Vögel am Tag, Grillen in der
  Nacht, Schlitztrommeln beim Fest, das Muschelhorn bei Ereignissen und am Fest der Plejaden, Holztöne bei Aufgaben und
  Chronik, ein Klopfen, wenn etwas fertig gebaut ist, ein Platschen beim Stapellauf, klappernde Muscheln bei Gegengaben.
- Klang und Tag und Nacht lassen sich im Menü ausschalten.

## Von Hand gemacht

Nichts soll aussehen wie mit dem Lineal oder dem Zirkel gezogen:

- Der Dorfplatz ist festgetretene Erde ohne Rand, mit ein paar Steinen. Vor dem Versammlungshaus liegt eine Feuerstelle aus
  Asche, Holzkohle und einem Ring von Hand gelegter Steine.
- Tarofelder, Gärten, Pulakagruben, Gärgruben, Tanzplatz, Blumenbeete und Schweinepferch haben unregelmäßige Ränder,
  Steine unterschiedlicher Größe und Zäune aus einzeln gesetzten Pfosten.
- Der Riffring eines Atolls und die Durchfahrt sind keine Ellipsen mehr. Auswahl und Bauvorschau sind wie mit der Hand
  gezogen, Reichweiten Punkte auf dem Boden, das Ziel eines Kanus ein eingeritztes Kreuz. Baustellen zeigen eine gespannte
  Schnur zwischen Pflöcken statt eines Balkens.
- Die Oberfläche hat handgeschnittene Ränder wie Rindenbaststoff. Rechts hängen nur zwei Tapa-Flicken an einer Schnur,
  jeder schief aufgenäht: die Muschel für Nachrichten, doppelte Geschwindigkeit und das Menü. Gezoomt wird mit zwei
  Fingern oder dem Mausrad, Knöpfe dafür gibt es nicht.
- **Doppelte Geschwindigkeit:** Der Flicken mit den zwei Spitzen lässt alles doppelt so schnell gehen: Wirtschaft, Leute,
  Kanus. Er wird gelb, solange er an ist.
- **Inseln umbenennen:** Den Namen der Insel oben antippen.
- **Nachrichten** rollen wie ein Streifen Rindenbaststoff aus der Muschel aus und rollen sich wieder ein. Was in der Welt
  geschieht, wird aufbewahrt; eine Zahl an der Muschel sagt, wie viele neu sind. Die Muschel antippen klappt die letzten
  40 Nachrichten auf, mit der Zeit seit jeder. Kurze Antworten auf ein Antippen („Zu wenig Holz“) werden nur gezeigt. Der Kompass ist ein Ring aus Steinen und Kaurimuscheln, ein dunkler Stein zeigt, woher der Wind
  kommt, und ein Band mit Federn weht in seine Richtung.

## Lebendige Welt

- **Tiere:** Die Lapita-Siedler brachten Schwein, Hund und Huhn in ihren Kanus mit. In jedem Dorf laufen Hühner, die
  zwischendurch picken, Hunde, die manchmal jemandem hinterhertraben, und mit einem Schweinepferch auch Schweine frei herum.
- **Dorf:** Kinder rennen und spielen, Erwachsene setzen sich zwischendurch auf eine Matte vor die Häuser. Über manchen
  Häusern steigt Kochrauch auf. Neben den Häusern liegt Feuerholz, stehen Töpfe, trocknet eine Matte oder dampft ein Erdofen.
  Trampelpfade entstehen dort, wo die Leute laufen.
- **Am Wasser:** Die Fischer paddeln hinaus, werfen ihr Netz und hängen den Fang ans Gestell. Riffsammler waten mit dem
  Korb im seichten Wasser, nah am Strand. Wo ein Weg übers Wasser führt, über eine Lagune oder eine Bucht, paddeln die
  Leute im Einbaum; niemand läuft übers Riff. Beides ruht unter Rāhui.
- **Im Meer:** Fischschwärme und Schildkröten ziehen durch die Lagunen. Auf offener, schon gesehener See taucht ab und zu
  ein Wal auf, bläst und zeigt beim Abtauchen die Fluke. Neben fahrenden Kanus springen Delfine.
- **Wetter:** Wolkenschatten ziehen mit dem Nordwind über Meer und Inseln, in der Sturmzeit als Regenschauer.

Diese Kleinigkeiten laufen mit wenigen Bildern pro Sekunde, wenn sonst nichts animiert ist, und gar nicht, wenn das Gerät
weniger Bewegung wünscht.

## Menschen

Kleine Figuren ohne Arme und Beine: Tapa-Wickelrock, Muschelkette, Haarknoten, Hibiskusblüte oder langes Haar,
drei Hauttöne, Alte mit grauem Haar und Stock. Jeder Bewohner ist zu sehen und hat einen Namen. Wer Arbeit hat, trägt sie sichtbar
vom Feld, der Werkstatt oder dem Waldrand zum Speicher: Taro oder Brotfrucht im Korb auf dem Kopf, Töpfe,
Steine, Obsidian, Muscheln, Schnur, Tapa, Proviant, Holz, Fisch an der Stange, Matten. Die anderen schlendern zwischen den
Häusern, die Alten sitzen oft auf Matten. Bauleute tragen Holz zu den Baustellen und hämmern dort, Holzfäller schlagen am
Baum, Pflanzer tragen Setzlinge, Fischer fahren hinaus, Riffsammler waten.
Die Figuren haben zwei Augen. Auch in den Dörfern der Clans sind Menschen unterwegs.

## Nächste Schritte

1. ~~Fundament: Dateien, Canvas, Welt aus Startwert~~
2. ~~Start wie bei Age of Empires: nur das Dorfzentrum, geführte erste Aufgaben~~
3. ~~Bedürfnisse auf einen Blick~~
4. ~~Menschen neu zeichnen~~ (Feinschliff nach dem Vorlagebild)
5. ~~Kleine Kanus in der Lagune~~
6. ~~Handel mit kleinen Kanus~~
7. ~~Erkunden mit dem Hochseekanu, ohne Markierungen~~
8. ~~Bauzeiten, gesteuerte Kanus, Inseln aus dem Nebel, Schmuck, Jahr und Fest der Plejaden~~
9. ~~Wald mit Holzfäller und Pflanzer, Arbeitskräfte, Flussdelta, Inseldetails~~
10. ~~Fisch und Meeresfrüchte, Einbäume in der Lagune, Lapita-Netz als Ziel~~
11. Android-App mit Capacitor
