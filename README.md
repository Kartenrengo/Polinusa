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

Eine Mahlzeit ist Grundnahrung und etwas aus dem Meer dazu, wie auf Fidschi (kakana und i coi) oder in Tonga
(me'akai und kiki).

| Ware | Woher | Gebraucht ab |
| --- | --- | --- |
| Grundnahrung | Tarofeld und Brotfruchtbaum (hohe Inseln), Pulakagrube mit Sumpftaro in der Mitte eines Motus (Atolle) | Anfang |
| Fisch | Fischgestell am Strand, Steinreuse in der Lagune | 10 Bewohnern |
| Meeresfrüchte | Riffsammler am Strand: Muscheln, Krebse, Seeigel, Tintenfisch | 25 Bewohnern |

Fehlt Grundnahrung, ziehen Leute fort. Fehlen Fisch oder Meeresfrüchte, wächst das Dorf nicht mehr. Das Kleine Fest braucht
Fisch, das Große Meeresfrüchte, die ersten Früchte beim Fest der Plejaden Grundnahrung, Fisch und Schweine. Unter Rāhui
ruhen Fischgestell, Reuse und Riffsammler, nach dem Fest fangen sie dreimal so viel. In der Palolo-Nacht gibt es
Meeresfrüchte für alle.

## Die Lagune und der Einbaum

Pfahlhäuser und Steinreusen stehen in der Lagune. Sie brauchen kein Land, das Wald und Felder belegen. Hin kommt man nur mit
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
- **Antippen:** Eine Figur antippen zeigt ihren Namen und was sie tut („Lupe · Bau Haus · holt Holz“) und öffnet ihren
  Arbeitsplatz. Ist ein Gebäude gewählt, tragen seine Leute eine kleine Marke über dem Kopf.
- **Reihenfolge:** In der Übersicht (Bewohnerzahl oder die Zeile darunter antippen) legst du fest, welche Arbeit zuerst
  Leute bekommt: Bauen, Grundnahrung, Fisch und Meer, Holz, Kanubau, Handwerk. Innerhalb jeder Gruppe zuerst das Älteste.
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

## Kanus entstehen

- **Erst das Kanu, dann das Wasser:** Ist ein Fischgestell gebaut, schnitzt der Fischer zuerst seinen Einbaum, etwa eine Minute.
  Man sieht den Stamm, das Aushöhlen mit Spänen und das fertige Kanu am Strand. Erst dann fährt er hinaus. Ebenso am Kanusteg:
  Er bedient Pfahlhäuser und Reusen erst, wenn sein Einbaum fertig ist.
- **Im Kanuhaus** entsteht ein Auslegerkanu in etwa zweieinhalb Minuten, ein Doppelkanu in etwa fünf, mit 3 Bauleuten,
  die vorher das Holz herbeitragen.
  Fünf Schritte sind zu sehen und werden gemeldet: Stamm auf Böcken, Aushöhlen mit Steinbeil und Glut, Bordplanken mit
  Kokosschnur angenäht, Ausleger oder zweiter Rumpf mit Plattform, Paddel oder Mast und Mattensegel. Die Tafel des
  Kanuhauses zeigt, welcher Schritt dran ist.

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
| Auslegerkanu | 4 Holz, 1 Steinbeil | 30 s | 12 Waren, 4 Menschen | nur ins Bekannte |
| Doppelkanu | 6 Holz, 2 Steinbeile, 3 Matten, 3 Schnur | 80 s | 24 Waren, 8 Menschen | auch in den Nebel |

- **Steuern:** Kanu antippen, dann auf das Meer oder eine Insel tippen. Es sucht sich den Weg um das Land herum.
  Der restliche Weg ist gepunktet zu sehen. Unten öffnet sich die Tafel des Kanus, „Beladen“ klappt die Ladeliste auf.
- **Nebel:** Wo ein Kanu fährt, lichtet sich der Nebel. Das Doppelkanu sieht weiter als das Auslegerkanu.
- **Proviant:** Auf freier Fahrt isst die Mannschaft des Doppelkanus jeden Reisetag (6 Sekunden) 1 Proviant.
  Ohne Proviant fährt sie nicht ins Unbekannte, und geht er aus, kehrt sie langsam zur nächsten eigenen Insel zurück.
- **Siedeln:** Mit 4 Siedlern an Bord vor einer leeren Insel „Dorf gründen“. Mitgebrachtes Holz und Essen kommt ins Lager.
- **Wind und Jahreszeit:** Gegen den Nordwind geht es langsamer, in der Sturmzeit auch. In der Passatzeit schneller.
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

Hibiskus, Blumenbeet, Muschelweg, Fackel, Ahnenpfosten (wie die Gesichter auf der Lapita-Keramik), Schlitztrommel und
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
  schöpfen alle Inseln Meeresfrüchte, mit Fischgestellen, Reusen und Riffsammlern mehr.
- **Rāhui:** In der mageren Zeit kann eine Insel mit Fischgestell, Reuse oder Riffsammler ihr Riff sperren. Bis zum Fest
  ruht der Fang, danach ist er dreimal so reich, und das Ansehen steigt um 3.

## Fest der Plejaden

In der Zeit der Plejaden im Versammlungshaus. Die ersten Früchte (12 Grundnahrung, 6 Fisch, 2 Schweine) gehören den Ahnen, das bringt
Ansehen 10. Dazu kann man wählen:

- Kava-Runde (3 Kava): +5, Gäste der Clans knüpfen einen Knoten mehr. Kava wächst im Kavagarten oder kommt vom Clan vom Kavahain.
- Tanz zur Schlitztrommel: +4, braucht Schlitztrommel und Tanzplatz. Die Leute tanzen dann im Kreis auf dem Tanzplatz.
- Kanurennen in der Lagune: +2 je Kanu im Hafen, höchstens vier. Die Kanus fahren um das Riff.

Die Schönheit des Dorfes bringt bis zu 8 mehr. Clans mit mindestens 2 Knoten kommen als Gäste mit Gaben, und ihre Schnur
bekommt Knoten dazu. Danach wächst das Dorf einen Mond lang doppelt so schnell. Einmal im Jahr pro Insel.

## Wirtschaft: Gabe und Gegengabe

Vierzehn Waren: Grundnahrung, Fisch, Meeresfrüchte, Holz, Proviant, Töpfe, Steinbeile, Klingen, Matten, Schnur, Tapa,
Schweine, Kava, Muschelschmuck.
Ketten haben höchstens drei Glieder.

| Gebäude | Insel | Braucht | Macht pro Minute | reicht für etwa |
| --- | --- | --- | --- | --- |
| Holzfäller | hoch | Bäume in Reichweite, Steinbeile machen ihn schneller (1 Beil je 20 Holz) | 15 Holz, ohne Beile 10 | |
| Baumpflanzer | hoch | Stümpfe oder Waldrand in Reichweite | 7,5 junge Bäume | einen Holzfäller |
| Tarofeld | hoch | | 15 Grundnahrung | 15 Menschen |
| Brotfruchtbaum | hoch | | 5 Grundnahrung, je nach Jahreszeit | 5 Menschen |
| Pulakagrube | Atoll, in der Mitte eines Motus | | 10 Grundnahrung | 10 Menschen |
| Fischgestell | am Strand | Schnur für Netze verdoppelt den Fang (1 Schnur je 8 Fisch) | 10 Fisch, ohne Netze 5 | 33, ohne Netze 16 |
| Steinreuse | in der Lagune | Einbaum, 1 Steinbeil beim Bau | 6 Fisch | 20 |
| Riffsammler | am Strand | | 7,5 Meeresfrüchte | 50 |
| Gärgrube | hoch | 2 Brotfruchtbäume daneben, 1 Grundnahrung je Proviant | 7,5 Proviant | |
| Töpferei | hoch | Ton in der Nähe, 1 Holz je Topf | 3,75 Töpfe | 53 |
| Beilwerkstatt | hoch | Basaltfelsen in der Nähe | 3,75 Steinbeile | 5 Holzfäller |
| Klingenschläger | Vulkan | Obsidian in der Nähe | 3 Klingen | 2 Schmuckschleifereien |
| Maulbeergarten + Klopfhütte | hoch | Garten neben der Hütte | 3 Tapa | 50 |
| Schweinepferch | hoch | 2 Grundnahrung je Schwein | 1,9 Schweine | 47 |
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
| Weiler | Anfang | Grundnahrung 1, ab 10 Bewohnern Fisch 0,3 |
| Dorf | 20 Bewohner | dazu Töpfe 0,07, ab 25 Bewohnern Meeresfrüchte 0,15, ab 30 Bewohnern Matten 0,06 |
| Häuptlingsdorf | 40 Bewohner, Ansehen 20, Schönheit 10, Töpfe, Matten und Meeresfrüchte reichen, Tapa, Schweine, Kava und Schmuck im Lager | dazu Tapa 0,06, Schweine 0,04, Kava 0,03, Muschelschmuck 0,02 |

Im Häuptlingsdorf wohnen 6 statt 4 Menschen in jedem Haus. Die Häuser bekommen geschnitzte Pfosten und Muschelschmuck.
Fehlt dort 30 Takte lang etwas, wird es wieder ein Dorf, und die Leute ziehen nach und nach aus.
Ein Dorf wächst, solange Platz in den Häusern ist und nichts fehlt. Ohne Grundnahrung ziehen langsam Leute fort.

- Die Bewohnerzahl oben öffnet die Tafel „Bedarf“. Der Punkt daneben: grün wächst, gelb Häuser voll, rot es fehlt etwas.
- Fehlt etwas, schwebt das Zeichen der Ware über einigen Häusern. Zieht jemand ein, steigt ein Herz auf.

## Ansehen

Das Ansehen des Clans wächst mit Festen im Versammlungshaus (Kleines Fest: 10 Grundnahrung, 4 Fisch und 2 Töpfe, +5;
Großes Fest: 4 Schweine, 12 Grundnahrung, 4 Meeresfrüchte und 2 Tapa, +15), mit dem Fest der Plejaden, mit Gaben an andere Clans und mit einem
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
| Brotfruchternte | Zeit der Plejaden | alles ernten (Grundnahrung und Proviant) |

Wer ein Ereignis schließt, ohne zu wählen, lässt es vorübergehen. Die **Chronik** im Menü hält zwanzig Meilensteine fest,
vom ersten Dach bis zu fünf Jahren auf den Inseln, darunter fünf Dörfer, alle drei Clans, 30 Knoten, 150 Menschen,
50 gepflanzte Bäume und 500 gefangene Fische. Jeder bringt Ansehen und wird mit dem Jahr eingetragen.

## Tag, Nacht und Klang

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
  jeder schief aufgenäht: die Muschel für Nachrichten und das Menü. Gezoomt wird mit zwei Fingern oder dem Mausrad,
  Knöpfe dafür gibt es nicht.
- **Nachrichten** rollen wie ein Streifen Rindenbaststoff aus der Muschel aus und rollen sich wieder ein. Was in der Welt
  geschieht, wird aufbewahrt; eine Zahl an der Muschel sagt, wie viele neu sind. Die Muschel antippen klappt die letzten
  40 Nachrichten auf, mit der Zeit seit jeder. Kurze Antworten auf ein Antippen („Zu wenig Holz“) werden nur gezeigt. Der Kompass ist ein Ring aus Steinen und Kaurimuscheln, ein dunkler Stein zeigt, woher der Wind
  kommt, und ein Band mit Federn weht in seine Richtung.

## Lebendige Welt

- **Tiere:** Die Lapita-Siedler brachten Schwein, Hund und Huhn in ihren Kanus mit. In jedem Dorf laufen Hühner, die
  zwischendurch picken, Hunde, die manchmal jemandem hinterhertraben, und mit einem Schweinepferch auch Schweine frei herum.
- **Dorf:** Kinder rennen und spielen, Erwachsene setzen sich zwischendurch auf eine Matte vor die Häuser. Über manchen
  Häusern steigt Kochrauch auf. Neben den Häusern liegt Feuerholz, stehen Töpfe, trocknet eine Matte oder dampft ein Erdofen.
  Trampelpfade führen von jedem Haus zum Versammlungshaus und von jeder Werkstatt zum nächsten Haus.
- **Am Wasser:** Neben dem Fischgestell liegt ein Kanu am Strand, ein Fischer paddelt in der Lagune und wirft ab und zu
  sein Netz. Riffsammler waten mit dem Korb im seichten Wasser. Beides ruht unter Rāhui.
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
