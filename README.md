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

## Bauen braucht Zeit und Leute

Jedes Gebäude kostet Holz und steht nicht sofort. Erst ist es eine Baustelle mit Gerüst und Fortschrittsbalken.
An jeder Baustelle arbeiten 2 Leute, sie tragen Holz vom Speicher hin und hämmern. Ein Haus dauert etwa 24 Sekunden,
eine Werkstatt 28, das Versammlungshaus eine Minute. Gleichzeitig wird an einer Stelle gebaut, je 10 Bewohner an einer mehr.
Pflanzen kosten nichts, wachsen aber erst langsam heran. Was noch nicht fertig ist, arbeitet nicht und zählt nicht für die Aufgaben.

**Arbeitskräfte:** Jeder Bewohner kann arbeiten. Felder, Fischgestelle, Holzfäller und Pflanzer brauchen eine Person,
die meisten Werkstätten zwei, ein Kanu im Bau drei. Verteilt wird so: zuerst die Baustellen, dann das Kanuhaus, dann
Essen, dann Holz, dann die übrigen Arbeitsplätze nach Alter. Wer baut, arbeitet nirgends sonst. Fehlen Leute, steht ein
Arbeitsplatz still und zeigt eine Figur in der Sprechblase. Die Tafel „Bedarf“ zeigt, wie viele bauen, arbeiten und frei sind.

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
die Bewohner sie genießen können. Ein Häuptlingsdorf braucht Schönheit 10. Beim Fest der Plejaden zählt sie mit.

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

| Gebäude | Insel | Braucht | Macht |
| --- | --- | --- | --- |
| Holzfäller | hoch | Bäume in Reichweite | Holz |
| Baumpflanzer | hoch | Stümpfe oder Waldrand in Reichweite | junge Bäume |
| Tarofeld, Brotfruchtbaum | hoch | | Grundnahrung |
| Pulakagrube | Atoll, in der Mitte eines Motus | | Grundnahrung |
| Fischgestell | am Strand | | Fisch |
| Steinreuse | in der Lagune | Einbaum, 1 Steinbeil beim Bau | Fisch |
| Riffsammler | am Strand | | Meeresfrüchte |
| Gärgrube | hoch | 2 Brotfruchtbäume daneben, Grundnahrung | Proviant |
| Töpferei | hoch | Ton in der Nähe, Holz | Töpfe |
| Beilwerkstatt | hoch | Basaltfelsen in der Nähe | Steinbeile |
| Klingenschläger | Vulkan | Obsidian in der Nähe | Klingen |
| Maulbeergarten + Klopfhütte | hoch | Garten neben der Hütte | Tapa |
| Schweinepferch | hoch | Grundnahrung als Futter | Schweine |
| Flechthütte | Atoll | 2 Pandanus daneben | Matten |
| Seilerei | Atoll | 3 Kokospalmen daneben | Schnur |
| Schmuckschleiferei | Atoll, am Strand | Klingen | Muschelschmuck |
| Kavagarten | hoch | | Kava |

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
| Dorf | 20 Bewohner | dazu Töpfe 0,1, ab 25 Bewohnern Meeresfrüchte 0,2, ab 30 Bewohnern Matten 0,1 |
| Häuptlingsdorf | 40 Bewohner, Ansehen 20, Schönheit 10, Töpfe und Matten reichen, Tapa, Schweine und Schmuck im Lager | dazu Tapa 0,1, Schweine 0,04, Muschelschmuck 0,02 |

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

## Menschen

Kleine Figuren ohne Arme und Beine: Tapa-Wickelrock, Muschelkette, Haarknoten, Hibiskusblüte oder langes Haar,
drei Hauttöne. Etwa ein Viertel der Bewohner ist zu sehen. Zwei von dreien haben Arbeit und tragen sie sichtbar
vom Feld, der Werkstatt oder dem Waldrand zum Speicher: Taro oder Brotfrucht im Korb auf dem Kopf, Töpfe,
Steine, Obsidian, Muscheln, Schnur, Tapa, Proviant, Holz, Fisch an der Stange, Matten. Die anderen schlendern zwischen den
Häusern. Bauleute tragen Holz zu den Baustellen und hämmern dort, Holzfäller schlagen am Baum, Pflanzer tragen Setzlinge.
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
