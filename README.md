# Polinusa

Aufbauspiel fürs Handy. Zeit: die Lapita-Phase der Austronesier, um 1500 v. Chr. Von Anno kommt nur der Gedanke, dass
Häuser mit ihren Bedürfnissen wachsen; alles andere ist Ozeanien (siehe „Eigene Handschrift“).
Ein Clan fährt los, findet leere Inseln, siedelt dort und treibt Handel über das offene Meer.

## Starten

`index.html` im Browser öffnen. Es gibt keinen Build-Schritt, das Spiel läuft auch direkt von der Festplatte.
Der Spielstand liegt im `localStorage` des Browsers.
Mit dem Umbau zu Haushalten und Rohstoffen beginnt das Spiel neu: Ein Spielstand aus der Zeit davor wird nicht
übernommen, das Spiel sagt es beim Start.

Eine einzelne Datei zum Weitergeben erzeugt:

```
node tools/bundle.mjs
```

Sie landet in `dist/polinusa.html`.

### Tests

Die Tests spielen das Spiel in einem Browser ohne Fenster (Playwright mit Chromium):

```
node tests/run.mjs
```

Sie sagen je Test „OK“ oder „FEHLER“: `smoke` (landen wie ein Spieler, auch die gebündelte Datei), `rules` (Regeln),
`play` (Freizeit, Feierabend, jede Animation), `save` (Neuladen, kaputter Spielstand, Laden aus Text), `phone`
(vierfach langsame CPU, kleiner und großer Bildschirm, Knopfgrößen), `fuzz` (jeder Knopf in jedem Blatt) und `bot` (ein
Spieler, der nur dem Rat folgt, eine Stunde lang). Mit `--long` spielt der Bot drei Dörfer statt einem.

### Spielstand

Das Spiel speichert im Browser. Alle fünf Minuten legt es zusätzlich eine Kopie an, drei werden aufbewahrt; ist der
Spielstand einmal kaputt, lädt es die neueste Kopie. Im Menü unter „Spielstand“: **Sichern** lädt eine Datei herunter,
**Laden** liest sie wieder ein (im claude.ai-Artefakt fragt der Betrachter vorher, ob er die Datei speichern will), die Kopien lassen sich antippen, und „Als Text“ zeigt den Spielstand zum Kopieren und
Einfügen, wo Dateien nicht gehen.

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
| `src/dive.js` | Treibgut, Tauchplätze und Tauchgänge |
| `src/koruru.js` | Der tägliche Knöchelwurf |
| `src/homes.js` | Familien, Häuser und ihre Stufen, Zuzug, Arbeit nach Familien |
| `src/game.js` | Wirtschaft, Baustellen, Menschen, Eingabe, Hauptschleife |

Die Dateien sind einfache Skripte mit gemeinsamem globalem Bereich. Sie werden in dieser Reihenfolge geladen.

## Sparsam zeichnen

- Jedes Bild ist ein SVG-Baustein. Er wird einmal pro Größenstufe in ein Bitmap gemalt und danach nur kopiert.
  Selten genutzte Bitmaps fallen aus dem Speicher, wenn mehr als etwa 36 MB belegt sind. Nur was seit Sekunden nicht
  mehr gezeichnet wurde, und jedes Bild behält mindestens eine Größe. Ändert sich das Aussehen eines Gebäudes, bleibt
  das alte Bild stehen, bis das neue fertig gemalt ist. So blinkt nichts.
- Meer, Inseln und Häuser liegen in einer Grundebene, der Nebel in einer zweiten. Beide sind etwas größer als
  der Bildschirm und werden beim Schieben nur verschoben. Neu gemalt wird erst am Rand, nach einer Änderung
  im Dorf oder wenn ein Zoom zur Ruhe kommt.
- Rauch, Menschen und Kanus kommen darüber, höchstens 30-mal pro Sekunde.
- Gezeichnet wird nur, was im Bild ist. Inseln, die noch kein Kanu gesehen hat, gibt es noch gar nicht.
- Neue Lichtungen im Nebel entstehen nur dort, wo die alten nicht schon hinreichen. So bleiben es wenige.
- Die Wirtschaft rechnet alle zwei Sekunden für alle Inseln, getrennt von der Grafik.

## Welt

Die Welt ist 4800 × 7200 groß und in Felder von 800 × 800 geteilt. Am Anfang gibt es nur die hohen Inseln Panua und
Talise und das Atoll Motu, alle in einer Lichtung im Nebel. Alles andere entsteht erst, wenn ein Kanu dorthin schaut:
Dann wird das Feld aus Startwert und Feldnummer gewürfelt, vielleicht mit einer hohen Insel, einem Vulkan oder
einem Atoll, weiter draußen manchmal mit einem fremden Clan. Es gibt keine Markierungen, wo Land liegt.
Insgesamt entstehen etwa 30 Inseln. Hohe Inseln haben Hügel mit Schraffur, einen Wald aus einzelnen Bäumen, oft einen Bach,
der an der Küste in einem kleinen Delta mündet: Die Küste selbst wölbt sich in Sandlappen vor, zwei oder drei Arme
schlängeln sich zwischen Mangroven hindurch und öffnen sich jeder in eine kleine Bucht. Frischer Schwemmsand läuft weich ins
Gras aus, vor den Mündungen ist das Wasser trüb, und manchmal liegt dort eine kleine Sandbank. Dazu kommen Gras, Blumen, Farne, Schilf, Muscheln,
Treibholz und Steine am Strand und Korallenköpfe in der Lagune. Über jeder bekannten Insel kreisen Fregattvögel. Weil das Würfeln nur vom Startwert abhängt, liegt nach dem Laden alles wieder
an derselben Stelle. Gespeichert werden nur Startwert, gesehene Felder und was sich geändert hat, etwa 5 KB.

## Die Ankunft

Ein neues Spiel beginnt auf See. Eine einzige Familie hat das alte Land im Westen verlassen: Mutter, Vater und zwei
halbwüchsige Kinder im Ahnenkanu, mit etwas Holz, Palmwedeln, Nahrung und Wasser, mit Setzlingen von Taro, Brotfrucht,
Papiermaulbeere und Kava und einem Paar Schweine. In der Lichtung im Nebel liegen zwei hohe Inseln, Panua und Talise,
und das Atoll Motu.

- **Wählen:** Das Fenster „Die Ankunft“ vergleicht die beiden hohen Inseln: welche größer ist, wie viele Bäume, Bach, Ton,
  Basalt und wie nah Motu liegt. „Ansehen“ fliegt hin, ein Tipp auf die Karte zeigt die Insel auch. Ein Atoll ist kein
  Anfang: kein Ton, kein Stein, kaum Holz.
- **Landen:** „Hier landen“ schickt das Ahnenkanu los. Wo es anlegt, wählt ihr, wo die **erste Hütte** steht. Davor liegt
  der **Dorfplatz** mit Feuerstelle und Sitzstamm: Er gehört fest zur ersten Hütte, um ihn wächst das Dorf, hier spielen die
  Kinder und hier sitzt man abends. Das Versammlungshaus kommt viel später und muss am Dorfplatz stehen. „Hier bauen“
  gründet das Dorf, erst dann beginnt die Zeit.
- Kein Feld liegt schon da: Die Familie lebt zuerst von Kokos, Fisch und dem Wild, wie die ersten Lapita-Siedler, die
  stark vom Sammeln und Fischen lebten, bis ihre Gärten trugen.
- Vor der Landung läuft keine Zeit, es wird nichts gebaut und nichts gespeichert.
- **Ohne Einführung:** Im Ankunftsfenster „Ohne“ wählen, dann stehen keine Aufgaben über der Bauleiste. In einem laufenden
  Spiel geht das im Menü oder im Aufgabenfenster mit „Ohne Einführung“.

## Die Zeit: Lapita, etwa 1500 bis 500 vor Christus

Das Spiel hält sich an die Zeit der Lapita-Leute, die als Erste von Neuguinea bis Fidschi, Tonga und Samoa fuhren.

- **Kleine Gruppen:** Die ersten Siedler einer Insel waren oft nur die Leute eines Kanus. Genetische Studien zeigen kleine
  Gründergruppen; Lapita-Dörfer waren Weiler aus wenigen Häusern, oft Pfahlhäuser an der Lagune wie in Talepakemalai auf
  Mussau. Eine hohe Insel trägt darum etwa 30 bis 110 Menschen, ein Koralleninselchen 20 bis 50.
- **Erst sammeln, dann pflanzen:** Die ersten Siedler lebten stark von Riff, Fisch, Schildkröten und Vögeln; Taro, Yams,
  Brotfrucht, Bananen, Schweine und Hühner brachten sie mit, und in ein, zwei Generationen trugen die Gärten.
- **Das Netz:** Obsidian aus Talasea und von den Admiralitätsinseln ging Hunderte Kilometer weit; Töpfe wurden zwischen
  verwandten Dörfern getauscht. Der Archäologe Patrick Kirch sah darin eine Lebensader zur alten Heimat.
- **Arbeit:** Männer fischten vom Kanu aus mit Leine, Netz und Speer, Frauen sammelten auf dem Riff Muscheln, Kraken und
  Seeigel; das Dach decken war Familienarbeit, Frauen machten die Wedelmatten, Männer banden sie fest.
- **Was es damals gab:** Töpfe mit gestempelten Mustern und weißer Kalkfüllung, Obsidian aus dem Handel, Steinbeile,
  Muschelschmuck, Auslegerkanus und Doppelkanus mit Mattensegel, Kokospalmen und Pandanus, Sennit aus Kokosfaser, das
  salzwasserfest Kanus, Beile und Häuser zusammenhält, der Erdofen.
- **Spätere Wörter nur als Hinweis:** Aus der Familie der Tufunga wurde die Meisterfamilie (tufunga sagte man später in
  Tonga und Samoa), aus dem Kōruru-Wurf der Knöchelwurf (die Māori nannten das Spiel später Kōruru), aus Taravana die
  Taucherkrankheit. Die Matriarchin folgt dem, was über frühe matrilokale Familien vermutet wird; Tonga mit Fahu und
  Tamahā ist ein späteres Beispiel.

## Anfang

Vorbild sind Anno und Manor Lords: klein anfangen, eine Kette nach der anderen, erst sichern, dann wachsen. Der Aufbau ist
ruhig und braucht Zeit: Ein Spiel-Bot, der nur dem Rat der Ältesten folgt, hat nach einer Stunde 20 bis 30 Menschen,
ohne dass ein Dorf zusammenbricht.

- **Der Finger:** In den ersten Aufgaben hüpft ein gezeichneter Finger über dem Knopf, der als Nächstes dran ist: erst
  „Bauen“, dann das Gebäude, dann „Bauen“ am Bauplatz. Die erste Tafel hat drei Zeilen mit Bildern. Die Chronik meldet
  sich in den ersten Minuten nur still in der Muschel.

- **Vier Menschen, vier Arbeitskräfte:** Jeder in der Familie arbeitet, auch die beiden Kinder. Im Lager liegt Vorrat für
  ein paar Minuten. **In den ersten fünf Minuten zieht niemand fort.**
- **Wenig am Anfang:** Die Bauleiste zeigt nur, was die erste Familie braucht: Hütte, Erntehaus, Holzfäller, Quelle,
  Fischerhütte, Palme und Brotfrucht. Oben stehen nur Nahrung, Wasser, Holz, Palmwedel und Schnur.
- **Stufen wie bei Anno:** Neue Gebäude kommen mit den Menschen, eine Karte sagt, was neu ist, und die neuen Knöpfe tragen
  einen Punkt.

| Ab | Stufe | Neu |
| --- | --- | --- |
| Anfang | Ankunft | Hütte, Erntehaus, Holzfäller, Quelle, Brunnen, Fischerhütte, Pandanusfrüchte, Palme, Brotfrucht |
| 8 Menschen | Gärten | Taro, Pulaka, Baumpflanzer, Speicher, Hühner, Pandanus |
| 12 | Sennit und Erdofen | Seilerei, Erdofen, Kalkbrenner, Kurkuma, Harz |
| 20 | Töpfe und Werkzeug | Töpferei, Beilwerkstatt, Steg, Pfahlhaus, Gärgrube, Flechthütte, Blumen, **Kanuhaus und Auslegerkanu** |
| 30 | Ein Dorf | Ölhütte, Doppelkanu, Navigatoren, Taucher, Versammlungshaus |

Das Kanuhaus kommt mit 20 Menschen, weil die Meisterhäuser Matten wollen, die es nur auf Atollen gibt. Die Stufen stehen
in der Übersicht als **Weg des Dorfes**: eine Schnur mit einem Knoten je Stufe und der großen Fahrt als letztem Knoten;
fest sind die erreichten, locker die nächste (mit der Zahl der Menschen darunter), hell die kommenden.
| 40 | Zeit der Feste | Tapa, Schweine, Kava, Trommel, Tanzplatz, Ahnenhaus, feine Dinge, Klingen, Schmuck |
| 50 | Häuptling | Häuptlingshaus |

- **Rat der Ältesten:** Über der Bauleiste steht immer ein nächster Schritt. Dringendes steht rot als „Jetzt“: kein Dach,
  Wasser fast aus, Nahrung aus, ein fremdes Kanu fragt. Sonst sagt der Rat, was dran ist: Leute verteilen, Palmwedel
  holen, Holz, Fasern und Schnur, ein Familienhaus, Gekochtes, mehr Hütten, neues Blut, die nächste Stufe.
- Jede neue Stufe wird gefeiert: Ansehen +2, Herzen über dem Dorf.

Über der Bauleiste steht immer genau eine Aufgabe. Antippen erklärt sie, „Zeig es mir“ springt zur richtigen Stelle.

1. Erntehaus, 2. Holzfäller, 3. Wasser (Quelle, oder 8 Wasser aus grünen Nüssen, wo kein Bach fließt), 4. Fischerhütte,
5. eine zweite Hütte, 6. eine Familie aus der Ferne aufnehmen, 7. sechs Menschen bei der Arbeit, 8. zwei Tarofelder,
9. 12 Bewohner, 10. Familien aus drei Linien, 11. Seilerei, 12. ein Familienhaus, 13. Erdofen, 14. Baumpflanzer,
15. 20 Bewohner, 16. Töpferei, 17. Steg und Pfahlhaus, 18. Beilwerkstatt, 19. 30 Bewohner, 20. Kanuhaus,
21. Auslegerkanu, 22. Siedler nach Motu, 23. Flechthütte und Seilerei auf Motu, 24. Handelskette, 25. ein Dorf mit einer
Meisterfamilie, 26. 6 Proviant, 27. Doppelkanu, 28. neues Land im Nebel, 29. eine Hochzeit mit einem Clan, 30. ein Fest,
31. das Fest der Plejaden, 32. ein Häuptlingsdorf, 33. Tauchen, 34. das Lapita-Netz, 35. die Weite See, 36. eine
Schatzinsel, 37. ein Dorf in der Ferne, 38. das Fest der Schätze, 39. andere Menschen: ein Volk einer anderen Kultur.

Ist die letzte Aufgabe geschafft, zeigt eine Tafel den Rückblick. Danach geht das Spiel weiter.

## Die Oberfläche

Einfach und nach Bedeutung geordnet:

- **Oben, die Insel:** der Name, Ansehen, Leute ohne Arbeit und die Bewohner mit ihrem Platz. Darunter die wichtigsten
  Vorräte und genau ein Hinweis, der gerade zählt: Essen wird knapp, etwas fehlt, **„2 aufsteigen“** mit einem Knoten, Häuser voll, ein
  Kanu kommt. Antippen öffnet die Übersicht.
- **Unten:** der nächste Schritt in einer Zeile, rot, wenn es dringend ist. Antippen zeigt den Weg. Daneben „Bauen“ und
  „Flotte“.
- **Ein Haus antippen** zeigt fast nur Bilder: die Stufe als Punkte, die Plätze (besetzt, frei, noch zu), die Leute mit
  Namen, Alter und Arbeit, dann **die Schnur der Familie** (siehe unten). Darunter steht nur, was knapp ist oder fehlt,
  jeweils mit einem Knopf, auf dem das Gebäude abgebildet ist, das hilft („Quelle“, „Kanus“). Ganz unten das
  **Aufsteigen**: die nächste Stufe mit ihrem Platz (und einem Kind, wenn dort Kinder kommen), dann jedes Material als
  Bild mit „hat/braucht“, grün oder rot; ein rotes antippen zeigt, wo es herkommt. Daneben der Knopf „Aufsteigen“.
- **Ein Arbeitsplatz** zeigt oben, ob er arbeitet und was er pro Minute macht, darunter die Leute mit − und +, und was sie
  holen sollen.
- **Die Übersicht** (Bewohnerzahl antippen) hat drei Reiter:
  - **Bewohner:** oben eine Zeile, was das Dorf gerade aufhält, mit dem passenden Knopf: ohne Dach, Wasser fehlt, Häuser
    können aufsteigen, für das Familienhaus fehlt Schnur, für das Meisterhaus fehlen Matten von einem Atoll, die Insel ist
    voll. Darunter jede Hausstufe mit Häusern und Menschen und ihrer Schnur: dieselben Knoten wie im Haus; ein Tipp auf
    einen Knoten zeigt, wer die Ware macht. Dazu Zuzug und Kinder und die Verwandtschaft.
  - **Arbeit:** automatisch oder von Hand, wer frei ist, welche Plätze Raum haben oder ruhen, alle Familien.
  - **Insel:** Wald, Felder, Wild, Riff, Pflanzen und Tiere, Muster, Navigatoren, der Weg zum Häuptlingsdorf.
- **Wenig Text:** Bilder statt Sätze. Meldungen sind kurz („Familie Hiva zieht ein, mit 3 Feldfrüchten. Neue Linie.“).
  Mehr steht unter „Mehr dazu“.

- **Lager:** Jede Ware eine Kachel: Bild, Zahl, ein Balken, wie voll es ist, und ▲ oder ▼ pro Minute, grün oder rot.
  Antippen zeigt, wer sie macht. Was stillsteht, steht darunter als Knöpfe mit dem Gebäude.
- **Kalender:** Zwölf Monde als Kreise in den Farben der vier Zeiten, der jetzige hervorgehoben; darunter die Zeiten als
  Bilder und wann das Fest kommt.
- **Erntehaus und Fischer:** Was sie holen, steht als Bilder; was sie von selbst gerade holen, trägt einen grünen Punkt.
- **Waren von anderen Inseln:** Statt eines Satzes eine **Bildkette**: Kanuhaus, Kanu, eine Insel, die es hat, ein Dorf
  oder Handelsweg dorthin, die Ware im Lager. Erledigtes ist grün, das nächste Glied ein Knopf, der hüpft.
- **Das Finale:** Ist die große Fahrt vollbracht, segelt auf der Tafel ein Doppelkanu unter den aufgehenden Plejaden durch
  die Nacht, darunter der ganze Weg des Dorfes.

### Eigene Handschrift

Neben Anno gestellt, sieht und fühlt sich Polinusa anders an:

- **Die Schnur der Familie statt Balken:** Die Bedürfnisse eines Hauses sind Knoten auf einer Schnur aus Sennit, nach den
  geknoteten Ahnenschnüren der Marquesas (taʻo mata). Ein fest gezogener Knoten ist erfüllt, eine lose Schlaufe ist
  knapp, eine ausgefranste Lücke fehlt. Nach einer Muschelperle folgen hell die Knoten, die die nächste Stufe will. Ist
  das Blatt offen, ziehen sich die Knoten nacheinander fest. Jeder Knoten ist ein Knopf: antippen zeigt, woher es kommt.
  Rechts steht, wie viele Knoten halten („2/3“).
- **Ein Knoten statt Pfeil:** Über einem Haus, das aufsteigen kann, schwebt ein Knoten mit einer Tiare-Blüte und wiegt
  sich. Auch der Knopf „Aufsteigen“ trägt ihn; ist alles bereit, zieht der Knoten sich im Takt zusammen und ein
  gestrichelter Ring legt sich um den Knopf.
- **Hausweihe:** Steigt ein Haus auf, regnen Blüten auf sein Dach, wie man bei der Weihe eines neuen Hauses Kränze auflegt,
  und ein Ring geht wie Stimmen über das Dorf.
- **Die Alten raten:** Der Hinweis unten spricht mit der Stimme der Ältesten; vor ihm steht ein kleines geschnitztes
  Gesicht. Dringendes heißt „Jetzt“.
- **Menschen statt Zahlen:** Jede Person hat Namen, Alter, Arbeit und die Linie ihrer Mutter. Neue Familien kommen im Kanu
  aus der Ferne und fragen, ob sie bleiben dürfen. Gegen Inzucht hilft neues Blut von anderen Inseln.
- **Knöpfe aus Rindenstoff:** Jeder Knopf ist von Hand zugeschnitten. Gedrückt gibt er nach wie geflochtener Pandanus und
  federt zurück; ein Tipp schickt Ringe aus wie ein Kiesel in der Lagune. Ein Blatt rollt sich auf wie eine Matte, seine
  Teile kommen nacheinander hoch. Ein neuer Rat oder eine neue Aufgabe gleitet herein. Wer weniger Bewegung wünscht,
  bekommt nichts davon.

## Essen

Alles Essen zählt als **Nahrung**. Oben steht nur eine Zahl, in der Übersicht und im Lager darunter jede Sorte. Jeder
Bewohner isst 1,2 pro Minute, und die Leute essen das, wovon am meisten da ist.

| Sorte | Woher |
| --- | --- |
| Kokosnüsse | Erntehaus: reife Nüsse, dazu Fasern und Schalen |
| Fisch | Fischerhütte: zwei fahren hinaus und hängen den Fang auf |
| Meeresfrüchte | Fischerhütte: bei Ebbe auf dem Riffdach gesammelt, Muscheln, Kraken, Seeigel; Tauchplatz |
| Feldfrüchte | Tarofeld und Brotfruchtbaum (hohe Inseln), Pulakagrube mit Sumpftaro (Atolle); auf neuem Land erst, wenn ein Kanu Setzlinge gebracht hat |
| Wildbeute | Wer keine Arbeit hat, sammelt Eier, Vögel und Krebse; viel auf neuem Land, wenig auf bejagtem (siehe Wild) |

Fehlt Nahrung oder Wasser lange, packt eine Familie ihre Sachen und fährt im Kanu fort, mit ihren Kindern; die letzte
Familie bleibt immer. Unter Rāhui ruht das Riff, nach dem Fest fangen die Fischer dreimal so viel. In der Palolo-Nacht
gibt es Meeresfrüchte für alle.

## Fischfang: die Fischerhütte

Fischgestell und Riffsammler sind eins: die **Fischerhütte** am Strand. Zwei Leute arbeiten dort, und sie fahren **immer zu
zweit** hinaus, in einem Kanu: Einer steuert und paddelt hinten, der andere sitzt vorn und fischt. Erst schnitzen sie ihr
Kanu.

- **Was gebraucht wird:** Sie holen von selbst, was am meisten fehlt. Für **Fisch** paddeln sie hinaus an den Riffrand,
  werfen Netz und Leine aus und hängen den Fang ans Gestell, wo er trocknet. Für **Meeresfrüchte, Muscheln oder
  Kochsteine** fahren sie aufs Riffdach, steigen aus und waten bei Ebbe, das Kanu liegt im Flachen. Auf der Tafel lässt
  sich festlegen, was sie holen.
- **Allein** fischt einer nur mit dem Speer im flachen Wasser, ein Fisch pro Gang.
- **Netze** aus Sennit verdoppeln den Fisch. Am Strand flicken sie die Netze auf dem Schoß.
- **Das Riff wird weniger:** Wo viel gesammelt wird, gibt das Riff weniger her, es erholt sich langsam, unter einem Rāhui
  schneller. Wo zu viel Wald fällt, verschlammt es. So war es auch bei den Lapita: In frühen Muschelhaufen werden die
  Schalen von Schicht zu Schicht kleiner.

## Die Lagune und der Einbaum

Pfahlhäuser stehen in der Lagune. Sie brauchen kein Land, das Wald und Felder belegen. Hin kommt man nur mit
dem Einbaum vom Kanusteg. Ein Steg hat einen Einbaum, der bis zu 4 Plätze anfährt, die ältesten zuerst. Auf einem Atoll gilt
das auch für Arbeitsplätze auf einem Motu, auf dem niemand wohnt. Ohne Einbaum zählt ein Pfahlhaus nicht als Wohnraum, und der
Arbeitsplatz bleibt leer. Über ihm schwebt dann ein Einbaum in der Sprechblase. Die Einbäume paddeln sichtbar hin und her.
Der Steg zeigt beim Bauen von selbst zum Wasser.

## Haushalte und Familien

Wie bei Anno zählt jedes Haus für sich. Ein Haus hat vier Stufen:

| Stufe | Bau | Platz | Will |
| --- | --- | --- | --- |
| Hütte | 4 Holz, 4 Palmwedel | 2 bis 4 | Dach, Nahrung, Wasser |
| Familienhaus | neu gebunden: 2 Holz, 3 Kokosfasern, 2 Schnur | 4 bis 6, **Platz für Kinder** | dazu Gekochtes |
| Meisterhaus | 2 Holz, 2 Matten; Töpfe, Matten und Öl im Lager | 4 bis 8 | dazu Töpfe, Matten, Kokosöl |
| Häuptlingshaus | eigenes Gebäude | 4 bis 10 | dazu das Feinste |

- **Familien:** Jeder Mensch gehört zu einer Familie. Eine Familie trägt den Namen der Frau, die sie gegründet hat; die
  frühen Lapita lebten wohl dort, wo die Familie der Frau lebte.
- **Hütte:** Pfosten und ein Dach aus Palmwedeln, ohne Nägel. Sie ist das Zuhause einer Familie, bis 4 Menschen. In einer
  Hütte kommen **keine Kinder** zur Welt.
- **Aufsteigen:** Ein Haus kann eine Stufe höher, wenn **alle Knoten seiner Schnur fest** sind, also alle Bedürfnisse
  der Familie erfüllt, und das **Material** im Lager liegt; für das Meisterhaus müssen dazu Töpfe, Matten und Kokosöl da
  sein. Dann schwebt ein Knoten mit Blüte über dem Haus, oben steht „aufsteigen“, und auf der Tafel des Hauses ist der
  Knopf „Aufsteigen“ frei. Beim Aufsteigen regnen Blüten aufs Dach. In
  der Übersicht steigen mit „Alle aufsteigen“ alle bereiten Häuser auf einmal auf. Wer will, schaltet dort „Von selbst“
  ein; dann bleibt immer etwas Schnur für Netze und Kanus übrig.
- **Weiterkommen:** Die Tafel zeigt, was fehlt, und woher es kommt. Manches gibt es nicht auf jeder Insel: Matten nur auf
  Atollen, Töpfe nur auf hohen Inseln, feine Dinge nur auf Inseln mit besonderem Boden. Ab dem Meisterhaus muss das Dorf
  also hinaus: siedeln, tauschen, Gaben bringen.
- **Kinder:** Sie kommen in Familienhäusern, wo eine Frau und ein Mann leben, Platz ist und die Ernte mehr als reicht:
  Essen und Wasser kommen mindestens 15 % schneller nach, als sie gebraucht werden, oder das Lager ist gut gefüllt.
  Jedes Kind gehört zur Linie seiner Mutter, isst und trinkt halb so viel wie ein Erwachsener und arbeitet mit sechs
  Jahren mit.
- **Hunger:** Fehlen Essen oder Wasser, wächst der Hunger, und er vergeht doppelt so schnell, wenn wieder etwas da ist.
  Ab einer Minute schaukelt über dem Haus der Familie, die zuerst gehen würde, ein rötliches Kanu, und der Rat nennt sie;
  nach zwei Minuten fährt sie fort. Danach ist eine Weile Ruhe.
- **Baustellen mit Vorrang:** Fehlt Wasser oder Essen, bekommt eine Baustelle, die genau das macht, zuerst Bauleute,
  notfalls auch aus der Arbeit an der anderen knappen Ware. Eine Baustelle behält ihre Leute bis zum Schluss, statt sie
  ständig zu tauschen.
- **Platz nach Bedürfnissen, wie bei Anno:** Jedes erfüllte Bedürfnis bringt Platz für einen Menschen mehr. Ist etwas
  eine halbe Minute lang ganz weg, wird das Haus zu eng, und alle 30 Sekunden zieht von dort jemand fort; kurz leer
  zählt nicht. Die Tafel des Hauses sagt: „Platz für 3 von
  höchstens 4“.
- **Zu voll:** Werden die Kinder groß, gründen die jüngsten Erwachsenen eine eigene Familie und ziehen in die nächste
  leere Hütte.
- **Meisterfamilie:** Meister eines Handwerks; viel später hießen sie in Tonga und Samoa tufunga. Fehlen Töpfe, Matten
  oder Öl eine halbe Minute lang, lebt sie wieder als einfache Familie im Familienhaus.

## Zuzug: Familien aus der Ferne

Neue Leute kommen nicht von selbst ins Dorf. **Steht eine Hütte leer**, geht die Nachricht über die Schnüre zwischen den
Inseln, und nach einer Weile kommt ein fremdes Kanu von weit her, aus Mussau, Emirau, Eloaua, Watom oder einem anderen Dorf
im Westen. Es legt am Strand an, und über ihm steht eine Sprechblase: Eine Familie von zwei bis vier Menschen fragt, ob
sie bleiben darf.

- **Aufnehmen oder weiterschicken:** Ein Tipp aufs Kanu öffnet die Tafel. Sie zeigt die Menschen mit Namen und Alter und
  was sie mitbringen: Nahrung für die ersten Tage, manchmal Schnur oder einen Topf, manchmal Setzlinge, die dem Dorf noch
  fehlen.
- **Gastfreundschaft:** Wer nicht antwortet, nimmt sie nach gut zwei Minuten nach altem Brauch auf.
- Jede Familie aus der Ferne bringt eine **neue Linie** mit (siehe Verwandtschaft), und jeder Erwachsene ist eine
  Arbeitskraft. Es kommt nur jemand, solange niemand ohne Dach ist und Essen und Wasser für die Neuen reichen (wie bei
  den Kindern).

## Verwandtschaft: neues Blut

Die Lapita-Siedler waren kleine Gruppen, oft die Leute eines Kanus. Am Leben hielt sie das Netz, an das sie gebunden
blieben: Kanus fuhren zwischen den Dörfern und den alten Inseln hin und her, mit Obsidian, Töpfen und Menschen, eine
Lebensader, wie der Archäologe Patrick Kirch es nannte. Inseln in Reichweite verheirateten sich über Generationen, und
Neuankömmlinge wurden aufgenommen.

- **Linien:** Jeder Mensch gehört zur Linie seiner Mutter. Die Übersicht zeigt unter „Verwandtschaft“, welche Linien auf
  der Insel leben und wie viele Menschen sie haben; die Tafel einer Familie zeigt ihre Linie.
- **Gesund, eng, zu nah:** Zählt man drei oder mehr gleich große Linien, ist das Dorf gesund. Bei weniger kommen Kinder
  seltener; sind alle zu nah verwandt, kommen kaum Kinder, und manche sind schwach und leben nicht lange.
- **Neues Blut kommt** mit Familien aus der Ferne (eine leere Hütte zieht sie an), mit Siedlern von euren anderen
  Inseln, die ihre Linie im Kanu mitnehmen, und mit einer Hochzeit mit einem Clan oder einem anderen Volk: Der Partner
  zieht zu euch und bringt die Linie seines Volkes. Dafür braucht es Vertrauen, also Gaben und Handel.
- So muss sich das Volk ausbreiten und mit den anderen verstehen: Eine Insel allein wird zu einer einzigen
  Verwandtschaft.

## Arbeit nach Händen

**Jeder Erwachsene ist eine Arbeitskraft**, Kinder unter sechs und die Alten nicht. Jeder Mensch hat seinen eigenen
Arbeitsplatz. **Jeder Mensch ist auf der Karte eine Figur**, und jede Figur geht genau zu ihrem Ort.

- **Automatisch:** Ohne dein Zutun gehen die Leute dorthin, wo sie gebraucht werden: was fehlt zuerst, dann Essen und
  Wasser, das Meer, Holz, Handwerk und Kanus. Ein Ort bekommt erst seine ganze Mannschaft, dann der nächste, damit die
  Arbeit zu zweit auch zwei hat. Wer aus derselben Familie kommt, arbeitet gern zusammen.
- **Von Hand:** Auf der Tafel eines Arbeitsplatzes steht, wer dort arbeitet, mit Namen. Mit „+“ schickst du einen Freien
  hin, mit „−“ rufst du einen ab. Das geht für **jeden** Freien, auch wenn seine Familie schon woanders arbeitet. Dann wird
  die Insel von Hand verteilt; in der Übersicht schaltet „Automatisch“ zurück.
- **Übersicht:** Wer frei ist, mit Namen, welche Plätze noch Raum haben, welche ruhen, weil ihre Leute bauen, und die
  Familien mit dem, was ihnen fehlt.
- **Wie die Arbeit geht, mit wie vielen Händen:**

| Art | Wo | Allein |
| --- | --- | --- |
| Zu zweit | Holzfäller, Erntehaus, Fischerhütte, Tauchplatz, Bauen | ein Drittel von dem, was zwei schaffen |
| Hand in Hand | Töpferei, Klopfhütte, Erdofen, Schmuck | etwas langsamer, 40 % von zweien |
| Jeder für sich | Felder, Quelle, Seilerei, Weben, Beile | jeder seinen Teil |

  Vorbild sind Versuche mit Steinbeilen: Biegt ein Helfer den Stamm mit dem Seil zur Seite, braucht ein Baum fast drei
  Viertel weniger Schläge. Der Weg zählt auch: Je weiter ein Ort vom Lager oder den Häusern steht, desto langsamer.
- **Jede Arbeit sieht anders aus:** Am Holzfäller schlägt einer mit dem Beil, der andere lehnt sich ins Seil. Am Erntehaus
  klettert einer mit der Fußschlinge die Palme hinauf und wirft Nüsse herunter, die andere schält sie am spitzen Pfahl.
  Die Fischer flicken Netze oder fahren zu zweit hinaus und waten übers Riff. An der Quelle wird Wasser in Bambus gefüllt,
  am Harzbaum tropft der Milchsaft in eine Schale, die Tapamalerin malt mit Kurkuma, in der Ölhütte wird Kokos geraspelt,
  in der Duftölhütte rühren Blüten im Öl, am Bananenhain wird eine Staude geschnitten, die Pandanussammlerin greift nach
  den Früchten. Töpferei, Beile, Klingen, Matten, Schnur, Tapa, Kava, Schmuck, Erdofen, Pferch und Gärgrube haben ihre
  eigenen kleinen Handgriffe. Die Leute arbeiten ein paar Runden am Ort, ehe sie eine Last ins Lager tragen.
- **Wer da ist, arbeitet:** Ein Ort erzeugt erst, wenn die Leute angekommen sind. Die Arbeit läuft auch weiter, wenn die
  Karte nicht gezeichnet wird.

## Bauen

- **Kosten:** Jedes Gebäude mit Dach braucht **Holz und Palmwedel**, eine Hütte 4 und 4. Kokosfasern und Sennit braucht
  man erst später: für das Familienhaus, Pfahlhaus, Kanuhaus und Kanus.
- **Bauleute:** Gebaut wird zu zweit: Einer hält den Pfosten, der andere bindet; allein dauert es dreimal so lang. Zuerst
  bauen, wer frei ist. **Ist niemand frei, legen zwei für die Bauzeit ihre Arbeit nieder**, von dem Ort, der am ehesten
  warten kann: ein voller Speicher zuerst, dann Handwerk, dann Holz, Essen und Wasser zuletzt. Ihr Ort steht still, über
  ihm steht „Leute bauen“; ist der Bau fertig, gehen sie zurück.
- Die Bauleute tragen Holz und Palmwedel aus dem Lager herbei, ein Stück pro Gang. Gebaut wird an einer Stelle zugleich,
  je 10 Bewohner an einer mehr.

## Das Erntehaus: der Baum für alles

Die Kokospalme heißt im Pazifik der Baum des Lebens. Das **Erntehaus** nutzt die Palmen ringsum, zu zweit: Einer klettert
mit der Fußschlinge aus Kokosfaser hinauf, wie man es überall in Polynesien tat, der andere sammelt unten und schält die
Faserhülle am spitzen Pfahl ab.

| Was | Gibt |
| --- | --- |
| Reife Nüsse | Nahrung, dazu Kokosfasern und Schalen zum Feuern |
| Grüne Nüsse | Wasser, 2 je Gang; wo kein Bach fließt, trinkt man das |
| Palmwedel | das Dach jedes Gebäudes |
| Alte Stämme | Holz: Eine alte Palme wird gefällt, an ihre Stelle kommt eine keimende Nuss |

- Die Leute holen von selbst, was am meisten fehlt; auf der Tafel lässt es sich festlegen.
- Es braucht 3 Palmen in Reichweite; je mehr Palmen, desto mehr Ernte, bis 8. Holz gibt es nur, wenn mehr als 6 Palmen
  stehen, damit immer genug bleiben.

## Während ihr fort wart

Die Inseln leben weiter, wenn das Spiel geschlossen ist oder im Hintergrund liegt, bis zu acht Stunden.

- **Was weiterläuft:** Baustellen werden fertig, Einbäume geschnitzt, das Kanuhaus baut weiter, Felder, Werkstätten,
  Fischer und Taucher erzeugen, so weit Platz im Lager und Material da ist, Bäume wachsen nach, Menschen ziehen zu, Haus für Haus
  wie sonst auch, und Häuser steigen auf oder fallen zurück. Die Tiere fressen weiter. Die Jahreszeiten gehen weiter. Kanus fahren ihre Kurse, Handelsketten handeln,
  ein Doppelkanu, das von selbst erkundet, erkundet weiter. Clans schicken ihre Gegengaben.
- **Was nicht passiert:** Niemand zieht hungrig fort, kein Wirbelsturm und kein anderes Ereignis kommt, keine Schnur
  verliert Knoten, das Ansehen schwindet nicht (Chronik-Einträge bringen trotzdem ihr Ansehen). Ausgelaugte Felder lassen
  die Leute selbst brachliegen.
- **Der Bericht:** Beim Zurückkommen öffnet sich „Während ihr fort wart“: wie lange, wie viele Jahre auf den Inseln, wer
  zugezogen ist, was fertig gebaut wurde, und für jedes Dorf das Lager vorher und nachher (etwa „Holz 12 → 20 (voll)“),
  die größten Änderungen zuerst, statt riesiger Summen von allem, was zwischendurch entstand und verbraucht wurde. Im Lager
  steht danach noch eine Weile neben jeder Ware, was vorher da war; welche Felder ruhen, welche Inseln entdeckt und welche Kanus vom
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

## Navigatoren

Das Wissen der Seefahrer steckt in Menschen, nicht in Gebäuden. Es wird gelehrt, weitergegeben und kann verloren gehen.

- **Haus der Navigatoren** (mit der Aufgabe „Das große Kanu“): ein Haus mit einem Kreis aus Steinen, an dem die Punkte des
  Sternenkompasses gelernt werden, wie es Mau Piailug von Satawal noch lehrte. Ein Bewohner sitzt dort und lernt; das
  kostet einen Arbeiter.
- **Drei Stufen:** 1 *Wellen und Vögel*: Landvögel fliegen morgens zum Fischen hinaus und abends heim. Auf der Karte
  zeigen sie, in welcher Richtung im Nebel Land liegt. 2 *Wolken über Land*: Über einer Insel bleibt eine Wolke stehen,
  über einer Lagune ist ihre Unterseite grün. Man sieht sie weiter als die Vögel. 3 *Sternenpfad*: Auf See reicht der
  Proviant 40 % länger, und das Doppelkanu sieht ein Viertel weiter.
- **Lernen:** Der Schüler kommt eine Stufe weiter als der beste Lehrer seiner Insel. Was der Lehrer schon weiß, lernt er
  in drei Jahren, Neues allein in sechs. Ist ein Schüler so weit, wie es geht, setzt sich der Nächste an die Steine, so
  bekommt das Wissen einen zweiten Kopf.
- **Was der Clan gesehen hat**, begrenzt das Wissen: Stufe 2 erst nach drei neuen Inseln, Stufe 3 nach sieben oder sobald
  Land jenseits der Weiten See gefunden ist.
- **Das Wissen stirbt mit den Menschen.** Geht der letzte, der eine Stufe kannte, zu den Ahnen, ist sie fort, und eine
  Nachricht sagt es. Siedler nehmen ihr Wissen mit ins neue Dorf.
- Die Übersicht zeigt das Wissen des Clans und wer es trägt; die Chronik hält den ersten Navigator und den Sternenpfad fest.

## Die mitgebrachte Welt

Auf neuem Land wächst nur, was schon da war: Wald, Kokospalmen und auf Atollen Pandanus. Alles andere brachten die Lapita
im Kanu mit, als „transportierte Landschaft“: Setzlinge, Schösslinge und Tiere.

- **Was mitreist:** Taro (auf Atollen als Sumpftaro für die Pulakagrube), Brotfrucht, Papiermaulbeere für Tapa, Kava und
  ein Paar Schweine. Panua und die Clans haben alles, ebenso Dörfer aus älteren Spielständen.
- **Laden:** Im Hafen „Beladen“, dann unter „Leben fürs neue Land“ antippen. Jedes nimmt 2 Plätze im Kanu; die Schweine
  kommen als Paar aus dem Lager. So wird jede Fahrt eine Entscheidung: Setzlinge, Holz, Nahrung oder Siedler.
- **Ankommen:** Beim Gründen eines Dorfes wächst, was an Bord war; gebrachte Brotfrucht wird gleich als junge Bäume
  gesetzt. Kommt ein Kanu später an ein eigenes Dorf, schlägt dort Wurzeln, was neu ist. Was dort nicht wachsen kann
  (Schweine auf einem Atoll), geht ins Lager.
- **Was fehlt:** Gebäude, deren Pflanze oder Tier fehlt, sind in der Bauleiste blass und sagen, was man bringen muss. Ohne
  Brotfrucht gibt es keine Gärgrube und damit keinen Proviant. Die Übersicht zeigt unter „Land“, was mitgebracht ist und
  was noch fehlt.
- Ins Unbekannte fährt man weiter nur mit Proviant: Setzlinge und Tiere fahren erst mit, wenn das Land gefunden ist.

## Wild

Unberührte Inseln sind voller Leben: Seevögel und ihre Eier, Großfußhühner, Schildkröten, Flughunde, Landkrabben. Die
ersten Siedler lebten zum guten Teil davon, und auf Tonga und Fidschi starben viele Arten innerhalb weniger
Generationen aus.

- **Sammeln:** Wer keine Arbeit hat, geht in den Wald und an den Strand und bringt „Wildbeute“ ins Lager. Sie zählt als
  Nahrung. Auf neuem Land ist das viel, auf dem längst bejagten Panua wenig.
- **Weniger werden:** Jeder, der sammelt, nimmt etwas weg. Wild wächst langsam nach, auf bewohnten Inseln langsamer,
  weil mit den Kanus Ratten kamen, die Eier fressen. Drei oder vier Sammler trägt eine Insel auf Dauer; mehr leeren sie.
- **Aussterben:** Fällt das Wild unter ein Drittel, stirbt die erste Art aus (Großfußhühner auf hohen Inseln, die
  Seevogelkolonien auf Atollen), unter ein Achtel die zweite (Riesenleguane und große Tauben, die Eier legenden
  Schildkröten). Das ist für immer: Die Insel gibt danach weniger. Die Chronik hält es fest.
- **Tapu:** In der Übersicht unter „Land“ legt „Tapu“ einen Bann auf das Wild. Dann sammelt niemand, und es erholt sich
  langsam; was ausgestorben ist, kommt nicht zurück. Seid ihr fort, legen die Ältesten selbst ein Tapu, bevor die
  nächste Art stirbt, und heben es auf, wenn das Wild sich erholt hat.
- **Sichtbar:** Über jeder Insel kreisen so viele Vögel, wie es Wild gibt; über leergejagtem Land nur einer.

## Muster auf den Töpfen

Lapita-Töpfe sind berühmt für ihre Muster: Mit gezähnten Stempeln drückten die Töpfer Reihen winziger Punkte in den
feuchten Ton und rieben weißen Kalk hinein. Gleiche Muster von Neuguinea bis Samoa zeigen, wie eng die Inseln verbunden
waren; wo der Kontakt abriss, wurden die Töpfe schlichter.

- **Eigenes Muster:** Ein Dorf findet es mit seiner ersten Töpferei. Panua stempelt das Gesicht der Ahnen mit der langen
  Nase, andere Dörfer Mäander, Rauten, Spirale oder Leiter. Jeder Clan hat sein eigenes (Zickzack, Bögen, Kreise).
  Ansehen +2.
- **Muster wandern mit Töpfen:** Kommt ein Kanu mit Töpfen an ein Dorf oder einen Clan, kennen sie dort von nun an alle
  Muster des Ortes, von dem es kam, auch die geborgten. Siedler nehmen die Muster ihres Dorfes mit. Gegengaben der Clans
  kommen in ihren gestempelten Töpfen. Jedes neue Muster an einem Ort bringt Ansehen +1.
- **Vergessen:** Ein geborgtes Muster, das zwei Jahre lang kein Topf wieder bringt, ist vergessen. Eine Handelskette mit
  Töpfen hält es frisch. Atolle haben keinen Ton; ihre Muster kommen immer von anderswo.
- **Wozu:** Jedes fremde Muster schmückt ein Dorf (Schönheit +1, höchstens 3). Stempelt ein Clan euer Muster, seid ihr
  verwandt: Eure Gaben zählen bei ihm ein Fünftel mehr, und die Gegengabe wird reicher.
- **Sichtbar:** Auf der Karte stehen unter jedem Dorf und Clan die Muster, die man dort stempelt, das eigene zuerst. So
  sieht man, wie weit ein Muster gewandert ist. Töpferei, Übersicht und Clan zeigen sie mit Herkunft und wie lange sie
  noch halten. Die Chronik kennt „Ein eigenes Muster“, „Ein Muster wandert“ (auf vier Inseln) und „Verwandte im Ton“.

## Andere Kulturen

Am Rand der bekannten See leben Menschen, die nicht von euren Ahnen abstammen. Sie antworten auf Gaben wie ein Clan,
haben aber eine eigene Geschichte, und jedes Volk gibt etwas, das kein Clan geben kann.

- **Die Alten vom Großen Land** leben im Westen auf Tanobada, „großes Land“. Sie sind seit vierzigtausend Jahren da,
  sprechen eine ganz andere Sprache und töpfern nicht. In ihren Bergen entstanden die ersten Gärten der Welt: Taro,
  Bananen, Zuckerrohr. Sie machen Klingen aus Obsidian und Tapa und schätzen Töpfe, Muschelschmuck und Matten. Ihre
  Gegengabe bringt **Bananen-Schösslinge**: Damit lässt sich der **Bananenhain** anlegen, der Nahrung gibt, das ganze
  Jahr, auch in der mageren Zeit, ohne am Boden zu zehren.
- **Die Seefahrer vom Nordmeer** leben im Norden auf Matagi, „Wind“. Sie kamen auf anderen Wegen über das Meer, stempeln
  Punktkreise in rot bemalte Töpfe und machen Matten und Schnur. Mit ihrer ersten Gegengabe lehren sie eure Navigatoren
  ihre **Sternwege**: Das Wissen der Navigatoren reicht eine Stufe weiter als sonst. Ihr Muster kommt mit ihren Töpfen.
- Beide liegen diesseits der Weiten See, ein paar Tagesfahrten von der Heimat. Das Doppelkanu findet sie beim Erkunden.
  Bei der ersten Begegnung öffnet sich ihr Fenster mit ihrer Geschichte.
- Die letzte Aufgabe „Andere Menschen“ verlangt, ein solches Volk zu finden und ihm eine Gabe zu bringen. Die Chronik kennt
  „Andere Menschen“, „Bananen vom Großen Land“ und „Sternwege vom Nordmeer“.
- In Spielständen von vorher wohnen sie in einem Feld am Rand, das noch kein Kanu gesehen hat.

## Knöchelwurf

Spiele mit fünf kleinen Knochen gab es im ganzen Pazifik; die Māori nannten sie Kōruru. Hier wird geworfen wie mit Würfeln,
**einmal am Tag** (dem Kalendertag deines Geräts), im Versammlungshaus oder im Menü.

- Drei Schritte stehen oben als Kästchen, das aktuelle leuchtet: 1. Werfen, 2. Knochen antippen und einmal neu werfen
  (wenn du willst), 3. Nehmen.
- Jeder Knochen zeigt oben eines von vier Zeichen: Punkt, Kreuz, Ring oder Striche. Die Knochen fliegen aus der Hand auf
  eine geflochtene Pandanusmatte mit Lapita-Zickzack am Rand, drehen sich und bleiben liegen.
- Gold umrandet sind die Knochen, die gerade zählen; rot gestrichelt die, die du neu werfen willst. Ein Band unter der
  Matte sagt, was das Bild bringt. „Was bringt was?“ klappt die ganze Tabelle auf.
- Fünf gleich: 1 Perlmutt und eine Tauchkarte. Vier gleich: Ansehen +3. Volle Hand: Gekochtes. Drei gleich: Feldfrüchte.
  Zwei Paare: Schnur. Ein Paar: Kokosnüsse. Nichts: 1 Kokosnuss. Die Gaben wachsen mit dem Dorf.

## Wie alles ineinandergreift

- **Erkunden → Wissen → Erkunden:** Neue Inseln heben die Grenze der Navigatoren. Vögel und Wolken zeigen verborgenes
  Land, und „Erkunden lassen“ steuert bevorzugt dorthin. Der Sternenpfad spart Proviant für die große Fahrt nach Osten
  und zu den Schatzinseln.
- **Menschen tragen alles:** Jeder Arbeiter, Taucher, Bauer und Navigator ist ein Mensch mit Namen und Alter. Kinder
  arbeiten erst mit sechs, Alte nicht mehr. Wer stirbt, nimmt sein Wissen mit, und seine Stelle bleibt leer, bis jemand
  nachrückt.
- **Ahnen:** Tote kommen ins Ahnenhaus und bringen Ansehen. Das Fest der Plejaden ehrt sie und wird mit vielen Ahnen
  größer. Ansehen holt Siedler aufs Kanu, und Siedler gründen Dörfer, die das Netz knüpfen.
- **Land und Meer:** Felder zehren am Boden, Wald schützt ihn, zu viel Rodung bringt Erosion, Stürme treffen kahle Inseln
  härter. Fischer, Taucher und Felder füllen dieselbe Nahrung; Wind, Nacht und Rāhui bestimmen, wann aufs Meer gefahren wird.
- **Siedeln:** Was im Kanu war, bestimmt, was auf neuem Land wächst. Bis Taro und Brotfrucht nachkommen, nähren Fisch, Riff
  und Wild die Siedler, und wer keine Arbeit hat, sammelt. Zu viele Untätige leeren das Wild; Arbeit, Tapu oder weniger
  Menschen schonen es. Ohne Brotfrucht kein Proviant, ohne Proviant keine Fahrt ins Unbekannte.
- **Töpfe verbinden:** Wer Töpfe schickt, schickt seine Muster. Sie schmücken die Dörfer, machen Clans zu Verwandten,
  deren Gegengaben reicher ausfallen, und verblassen, wenn die Handelsketten ruhen.
- **Vom Dorf zum Reich:** Vom Landeplatz aus wachsen Dörfer, Handelsketten und Freundschaften, bis an den Rand der
  See, wo Menschen einer anderen Kultur Bananen und Sternwege geben, die wieder das Siedeln und Erkunden stärken.
- **Auch in der Abwesenheit** läuft alles weiter: Ernte, Geburt, Tod, Lernen, Sammeln, Fahrten und Chronik. Der Bericht
  „Während ihr fort wart“ erzählt es.
- Ein langer Prüflauf über vierzig Inseljahre, mit Stürmen, Festen, Abwesenheit, Speichern und Laden, prüft dabei, dass
  Bewohner, Figuren, Vorräte, Arbeiter, Wissen, Wild, mitgebrachte Pflanzen und Muster immer zueinander passen, auf
  mehreren Karten und mit beiden Startinseln. Ein Klick-Test öffnet jedes Fenster in jeder Spielphase und drückt jeden
  Knopf darin, über tausendmal, ohne einen einzigen Fehler.

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

## Das Meer: Wetter, Leben, Treibgut und Tauchen

- **Wolken und Regen:** Regen fällt nur aus Wolken. In der Sturmzeit hängen graue Regenwolken über ihren Schatten, der Regen
  fällt schräg mit dem Wind bis aufs Meer. Sonst ziehen ab und zu helle Wolken. Über einem Wirbelsturm drehen sich schwere
  dunkle Wolken um das Auge.
- **Leben im Meer:** Delfinschulen springen, Schildkröten paddeln, fliegende Fische springen in flachen Bögen, und über den
  Fischgründen jedes Dorfes kreisen und stoßen Seevögel. Wale kommen vor allem in der Passatzeit, wenn die Buckelwale im
  Südwinter nach Norden ziehen.
- **Kanus:** Gischt am Bug, je mehr, desto stärker der Wind; die Kanus schaukeln in der Dünung und neigen sich in der Kurve;
  das Mattensegel des Doppelkanus bläht sich im Wind.
- **Treibgut:** Stämme, Kokosnüsse und Wrackteile treiben mit dem Wind und versinken nach einer Weile. Ein Kanu, das daran
  vorbeifährt, fischt sie auf, so weit Platz an Bord ist: Holz, Kokosnüsse, Holz und Schnur.
- **Tauchplätze:** Wo Vögel über dem offenen Meer kreisen, liegt etwas am Grund: oft unter einem Wrackteil, manchmal vor
  einem Dorf, reich nach einem Knöchelwurf mit fünf gleichen. Ein Kanu fährt hin und hält an, dann „Tauchen lassen“. Alle
  sechs Sekunden ein Tauchgang: meist Meeresfrüchte und Muschelschalen, manchmal Perlmutt oder Schmuck, selten ein Walzahn.
  Nach mehr als sechs Tauchgängen droht die Taucherkrankheit, dann hört die Mannschaft auf. Ein Platz ist nach einigen Gängen leer.

## Taucher

Nach dem Vorbild der Freitaucher im Pazifik, die seit Jahrtausenden ohne Atemgerät tauchen, bis zu den Perltauchern der
Tuamotu. Der **Tauchplatz** kommt mit der Aufgabe „Leben auf dem Wasser“ und steht am Strand.

- **Zu zweit:** Zwei Taucher paddeln im Einbaum hinaus. Einer taucht, der andere wacht im Kanu und hält die Schnur, dann
  tauschen sie; nie sind beide zugleich unten. Wer allein ist, ruht länger, weil niemand wacht.
- **Mit Stein und Schnur:** Ein Stein an einer Schnur zieht den Taucher schnell hinab. Man sieht das leere Kanu, die
  Schnur ins Wasser und aufsteigende Luftblasen. Ohne Brille, mit offenen Augen; ein Tauchgang dauert ein bis zwei
  Minuten (im Spiel ein paar Sekunden), dann wird an der Oberfläche Atem geholt.
- **die Taucherkrankheit:** Nach höchstens fünf Tauchgängen, vor Tifa schon früher, rudern sie zurück und ruhen an Land, bis der Atem
  wieder da ist. Wer zu oft zu tief taucht, bekommt die Taucherkrankheit, die Taucherkrankheit der Tuamotu.
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
  Vor den Flussmündungen wird das Wasser braun, Felder laugen 1,6-mal so schnell aus, das Riff gibt weniger.
  Unter 25 % ist es schlimmer. Die Übersicht zeigt unter „Land“ den Wald und die müden Felder.
- **Wirbelstürme** kommen in der Sturmzeit öfter als alles andere. Wer nicht vorsorgt, verliert Dächer, eine Werkstatt
  und ein bis zwei Häuser (bis sie neu gebaut sind, ziehen Leute fort), Bäume fallen, die Felder werden ausgewaschen,
  und an kahlen Hängen rutscht Erde auf ein Feld.
- **Man sieht ihn kommen:** Mit der Warnung verdunkelt sich der Himmel über der Insel, Regen peitscht schräg im Wind,
  Böen und abgerissene Blätter jagen vorbei, Blitze zucken, auf dem Wasser fliegt Gischt von den Wellenkämmen, die Brandung
  schlägt hoch ans Riff, und die Palmen biegen sich und schlagen hin und her. Er tobt, solange die Leute beraten, und noch
  eine Weile danach. In der Zeit weht der Wind mit voller Kraft, und Fischer und Taucher bleiben an Land.

## Trampelpfade

Pfade legt niemand an, sie entstehen beim Gehen. Wo Menschen oft laufen, liegt zuerst das Gras flach, dann zeigt sich die
Erde, dann ist sie hart und hell getreten. Jede abgelaufene Stelle verbindet sich mit ihren Nachbarn zu einem Band, so
laufen die Pfade als Linien. Die Leute treten gern dorthin, wo der Boden schon begangen ist, darum sammeln sich die Wege
und biegen sich, wie echte. Am Rand stehen Grasbüschel, auf dem nackten Boden liegen Kiesel. Wo lange niemand geht,
wächst der Pfad wieder zu. Ein Pfad, der lange viel begangen wird, wird mit Korallensand und Muschelstückchen bestreut;
darauf geht man schneller.

## Wolken, Wellen und Wind

- **Wolken** sind gezeichnet wie alles andere: eine Tuschelinie, cremefarbene Fläche, eine schattige Unterseite und ein paar
  Striche im Innern, die Mitte am höchsten. Jede wächst, steht eine Weile und löst sich wieder auf; dabei bricht ihre
  Linie auf. Ihr Schatten liegt als dunkler Fleck darunter. Eine große Wolke regnet, solange sie reif ist: Reihen kurzer
  Striche fallen schräg mit dem Wind, auf dem Wasser breiten sich Ringe aus. In der Sturmzeit gibt es mehr, grauere
  Wolken, in der mageren Zeit wenige.
- **Wellen:** Das offene Meer hat zwei Lagen Wellenzeichen, die ruhig und gleichmäßig mit dem Wind ziehen und sich leicht
  heben und senken. Am Riff bricht die Brandung in einem ruhigen, gleichen Takt; im Sturm schneller und höher.
- **Wind:** Aus der Nähe wiegen sich Grasbüschel, Farne, Schilf und Blumen, Palmen, Pandanus, Brotfruchtbäume und der Wald
  leicht im Wind. Böen laufen in Windrichtung über die Insel, bei starkem Wind neigt sich alles mehr.
## Inseln wechseln

Gebaut wird auf der Insel, die man nah vor sich hat. Wer heranzoomt, ist dort; die Leisten zeigen dann diese Insel. Von
weiter weg bringt ein Tipp auf eine Insel die Karte nah heran. So geht es: heranzoomen, bauen, herauszoomen, die nächste
Insel antippen.

## Bauleiste und Wege

- Die Bauleiste hat zwei Reiter: **Bauen** für alles, was das Dorf braucht, und **Schmuck** für Hibiskus, Blumen, Fackeln,
  Ahnenpfosten, Trommel und Tanzplatz.
- **Wege legt niemand von Hand an.** Trampelpfade entstehen dort, wo die Leute wirklich gehen: erst ein heller Schimmer,
  dann ein deutlicher Pfad. Wird ein Pfad lange Zeit viel begangen (etwa sieben Minuten), streuen die Leute zerstoßene
  Muscheln und Korallensand darauf: ein heller Muschelweg mit weißen Schalenstückchen. Darauf geht man schneller, und er
  schmückt das Dorf (je 25 Stücke 1, höchstens 8). Wo lange niemand mehr geht, wächst auch ein Muschelweg wieder zu.

## Flotte

„Flotte“ ist gebaut wie „Bauen“: Der Knopf klappt unten eine Leiste auf, darin jedes Kanu (antippen steuert es, ein
farbiger Punkt sagt grün: in einer Kette, gelb: unterwegs, rot: ohne Proviant), jede Handelskette und „Liste“ für alles
auf einen Blick. Beim Beladen und in den Handelsketten zieht man Schieberegler statt Plus und Minus zu tippen; die Zahl
daneben ist, was wirklich an Bord ging.

## Kanus entstehen

- **Erst das Kanu, dann das Wasser:** Ist eine Fischerhütte gebaut, schnitzen die Fischer zuerst ihr Kanu, etwa eine Minute.
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
- **Nebel:** Wo ein Kanu fährt, lichtet sich der Nebel. Das Doppelkanu sieht weiter als das Auslegerkanu. Kommt eine
  Insel in Sicht, liegt sie sofort ganz frei, nicht nur das Stück am Kanu.
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
  schöpfen alle Inseln Meeresfrüchte, mit Fischerhütten mehr.
- **Rāhui:** In der mageren Zeit kann eine Insel mit Fischerhütte ihr Riff sperren. Bis zum Fest
  ruht der Fang, danach ist er dreimal so reich, und das Ansehen steigt um 3.

## Fest der Plejaden

In der Zeit der Plejaden im Versammlungshaus. Die ersten Früchte (12 Feldfrüchte, 6 Fisch, 2 Schweine) gehören den Ahnen, das bringt
Ansehen 10. Dazu kann man wählen:

- Kava-Runde (3 Kava): +5, Gäste der Clans knüpfen einen Knoten mehr. Kava wächst im Kavagarten oder kommt vom Clan vom Kavahain.
- Tanz zur Schlitztrommel: +4, braucht Schlitztrommel und Tanzplatz. Die Leute tanzen dann im Kreis auf dem Tanzplatz.
- Salbung mit Kokosöl (2 Öl): +3.
- Kanurennen in der Lagune: +2 je Kanu im Hafen, höchstens vier. Die Kanus fahren um das Riff.

Die Schönheit des Dorfes bringt bis zu 8 mehr. Clans mit mindestens 2 Knoten kommen als Gäste mit Gaben, und ihre Schnur
bekommt Knoten dazu. Danach wächst das Dorf einen Mond lang doppelt so schnell. Einmal im Jahr pro Insel.

## Wirtschaft: Gabe und Gegengabe

Waren: Feldfrüchte, Fisch, Meeresfrüchte, Wildbeute, Kokosnüsse, Wasser, Holz, Palmwedel, Schnur (Sennit), Kokosfasern,
Kokosschalen, Brotfruchtharz, Muschelschalen, Proviant, Töpfe, Steinbeile, Klingen, Matten, Tapa, Kokosöl, Schweine, Kava,
Muschelschmuck und die Schätze Perlmutt, rote Federn und Walzähne.
Ketten haben höchstens drei Glieder.

| Gebäude | Insel | Braucht | Macht pro Minute, volle Mannschaft | Leute |
| --- | --- | --- | --- | --- |
| Erntehaus | überall | 3 Kokospalmen daneben, mehr Palmen mehr Ernte | 7,5 Kokosnüsse mit 7,5 Fasern und 3,75 Schalen, oder 15 Wasser, oder 7,5 Palmwedel | 2, zu zweit |
| Holzfäller | hoch | Bäume in Reichweite, Steinbeile machen ihn schneller (1 Beil je 20 Holz) | 5 Holz, ohne Beile 3,3 | 2, zu zweit |
| Fischerhütte | am Strand | Schnur für Netze verdoppelt den Fisch (1 Schnur je 10 Fisch) | etwa 6 bis 8 Fisch oder Meeresfrüchte, Muscheln, Kochsteine | 2, zu zweit |
| Quelle | hohe Insel mit Bach | am Bach | 5 Wasser | 1 |
| Brunnen | Atoll, Mitte eines Motus | | 5 Wasser | 1 |
| Tarofeld | hoch | | 3,75 Feldfrüchte, dazu Blätter | 1 |
| Brotfruchtbaum | hoch | | 3,75 Feldfrüchte, je nach Jahreszeit | |
| Pulakagrube | Atoll, in der Mitte eines Motus | | 3,3 Feldfrüchte | 1 |
| Pandanussammlerin | Atoll | 2 Pandanus daneben | 5 Feldfrüchte | 1 |
| Baumpflanzer | hoch | Stümpfe oder Waldrand in Reichweite | 3,75 junge Bäume | 1 |
| Seilerei | überall | 1 Kokosfaser je Schnur | 5 Schnur | 1 |
| Erdofen | überall | 2 rohe Speisen, Brennstoff, Blätter | 7,5 Gekochtes | 2, Hand in Hand |
| Gärgrube | hoch | 2 Brotfruchtbäume daneben, 1 Feldfrucht je Proviant | 5 Proviant | 1 |
| Töpferei | hoch | Ton in der Nähe, 1 Brennstoff je Topf | 3 Töpfe | 2, Hand in Hand |
| Beilwerkstatt | hoch | Basaltfelsen in der Nähe | 3 Steinbeile | 2 |
| Klingenschläger | Vulkan | Obsidian in der Nähe | 2,5 Klingen | 2 |
| Maulbeergarten + Klopfhütte | hoch | Garten neben der Hütte | 2,5 Tapa | 2, Hand in Hand |
| Schweinepferch | hoch | 2 Feldfrüchte je Schwein | 1,7 Schweine | 1 |
| Flechthütte | Atoll | 2 Pandanus daneben | 3 Matten | 1 |
| Harzsammler | hoch | 2 Brotfruchtbäume daneben | 3 Harz | 1 |
| Ölhütte | überall | 2 Kokosnüsse je Öl | 3 Kokosöl | 1 |
| Schmuckschleiferei | Atoll, am Strand | 1 Klinge und 2 Muschelschalen je Ring | 1,4 Muschelschmuck | 2, Hand in Hand |
| Kavagarten | hoch | | 2,1 Kava | 1 |

Jede Werkstatt reicht für ein kleines Dorf. Wer weiter wächst, braucht eine zweite, also mehr
Arbeitskräfte, mehr Platz und mehr Handel. Schnur und Steinbeile werden dauerhaft verbraucht: Atolle liefern Schnur für die
Netze der hohen Inseln, die hohen Inseln Beile und Holz.

- **Vorkommen:** Ton liegt am Bach, Basalt an den grauen Felsen, Obsidian nur am Vulkan. Beim Bauen zeigen Ringe,
  wo sie liegen. Diese Rohstoffe werden nicht gelagert, die Werkstatt muss daneben stehen.
- **Stillstand:** Fehlt einer Werkstatt etwas, schwebt das fehlende Zeichen über ihr. Die Tafel des Gebäudes und das Lager
  sagen, warum.
- **Lager:** Die Warenleiste oben zeigt bis zu sieben wichtige Waren. Antippen öffnet das Lager mit allem, was pro Minute
  dazukommt und weggeht.

## Rohstoffe: wenig Quellen, viele Nutzungen

Auf den Inseln gibt es nur wenige Quellen, aber jede gibt mehreres her, wie damals. Oft muss man wählen: laufend ernten
oder einmal fällen.

| Quelle | Wer nutzt sie | Was entsteht |
| --- | --- | --- |
| Kokospalme | Erntehaus | reife Nüsse (Nahrung) mit Kokosfasern und Kokosschalen, grüne Nüsse (Wasser), Palmwedel (Dach), alte Stämme (Holz) |
| Kokosfasern | Seilerei | Sennit, die Schnur für Häuser, Kanus und Netze |
| Kokosschalen | Töpferei | Brennstoff: erst die Schalen, dann Holz |
| Kokosnüsse | Ölhütte | Kokosöl, 2 Nüsse je Öl |
| Pandanus | Flechthütte, Pandanussammlerin | Matten und Segel; Früchte als Nahrung (Atoll) |
| Brotfruchtbaum | Gärgrube, Harzsammler | Proviant; Milchsaft, mit dem Kanus abgedichtet werden |
| Bach | Quelle | Wasser, nur auf Inseln mit Bach, am Bach |
| Süßwasser im Sand | Brunnen | Wasser, nur auf Atollen, in der Mitte eines Motus |
| Riff | Fischerhütte | Meeresfrüchte, Muschelschalen für die Schmuckschleiferei, Korallensteine für den Erdofen |

- **Fällen:** Eine Kokospalme (2 Holz) oder ein Brotfruchtbaum (3 Holz) lässt sich auf seiner Tafel fällen. Danach ist
  weg, was er trug.
- **Bauen wie damals:** Gebäude werden ohne Nägel gebaut: Holz und Palmwedel für jedes Dach, Sennit erst für das
  Familienhaus, Pfahlhaus, Versammlungs- und Kanuhaus. Kanus brauchen dazu Brotfruchtharz.
- **Wasser** ist ein Grundbedürfnis: jeder Mensch braucht 0,5 pro Minute. Fehlt es, wächst das Dorf nicht.
- **Kokosöl** wollen die Meisterfamilien. Beim Fest der Plejaden glänzen die Tänzer vom Öl (Salbung, +3), und der
  Clan vom Feuerberg und der Clan vom Kavahain schätzen es als Gabe.
- **Warengruppen:** Eine Werkstatt kann eine Gruppe verlangen, etwa Brennstoff. Dann nimmt sie, was da ist, zuerst die
  Abfälle.
- Das Ahnenkanu bringt 8 Holz, 8 Palmwedel, 24 Nahrung und 12 Wasser. Erntehaus, Holzfäller, Quelle, Brunnen und
  Fischerhütte gibt es vom ersten Tag an.

## Veredelung, Erdofen und Tiere

Aus den Rohstoffen werden die Dinge, die Meisterfamilien und später der Häuptling wollen.

| Ort | Braucht | Macht |
| --- | --- | --- |
| Erdofen (umu) | 2 rohe Speisen (Feldfrüchte, Fisch, Meeresfrüchte, Wild), Brennstoff, Blätter; Kochsteine machen ihn doppelt so schnell (1 Stein je 12) | 3 Gekochtes und Reste |
| Kalkbrenner, am Strand | Brennstoff | Korallenkalk; die Töpferei füllt damit die Muster weiß und arbeitet schneller |
| Kurkumagarten | Kurkuma, mitgebracht im Ahnenkanu | Kurkuma |
| Hühnerhof | Hühner, mitgebracht; Futter | Eier (Nahrung) |
| Tapamalerin | Tapa und Kurkuma | Bemalte Tapa |
| Feinweberin | 2 Matten | Feine Matten, die Ehrenmatten für Hochzeit und Tod |
| Duftölhütte | Kokosöl, Blumen oder Hibiskus in der Nähe | Duftöl |
| Schmuckschleiferei | Klinge, 2 Muschelschalen oder Eberhauer | Muschelschmuck |

- **Nebenprodukte:** Taro- und Pulakafelder geben Blätter, Bananen noch mehr. Die Beilwerkstatt gibt Kochsteine aus Basalt,
  die Fischerhütte vom Riff Korallenbrocken als Kochsteine und Muschelschalen. Der Schweinepferch gibt Eberhauer.
- **Gekochtes** zählt als Nahrung und ist ein Bedürfnis der Meisterfamilien (0,3 pro Kopf und Minute).
- **Tiere fressen:** Jedes Schwein frisst laufend (0,25 pro Minute), jeder Hühnerhof 0,6, aus dem Futter: erst Reste, dann
  Kokosnüsse, dann Feldfrüchte. Ohne Futter legen die Hühner nicht, und jede halbe Minute geht ein Schwein ein.
- Der Erdofen und der Kalkbrenner kommen mit der Töpferei, Kurkuma und Hühner mit dem Tarofeld, Malerin, Weberin und
  Duftöl mit dem ersten neuen Land. Die Clans schätzen die feinen Dinge als Gabe.

## Besondere Böden: warum man viele Inseln braucht

Die feinen Dinge wachsen nicht überall. Jede Insel außer der Heimat kann einen besonderen Boden oder ein besonderes Riff
haben; er steht unter dem Namen der Insel auf der Karte.

| Besonderheit | Wo | Was nur dort geht |
| --- | --- | --- |
| Rote Erde | Talise und manche hohe Inseln | Kurkumagarten: Farbe für bemalte Tapa |
| Feuchte Hänge | manche hohe Inseln | Kavagarten |
| Kegelschnecken | Motu und manche Koralleninseln | Schmuckschleiferei: Armringe |
| Feiner Pandanus | manche Koralleninseln | Feinweberin: Ehrenmatten |

Die Heimat hat keinen davon. Für die Häuptlingsfamilie braucht man darum ein Netz aus Inseln, mit Siedlern oder Handel, so
wie das Lapita-Netz wirklich war. Der Rat sagt, welche Insel den fehlenden Boden hat.

## Dörfer, Stufen und die Häuptlingsfamilie

Lapita-Siedlungen waren meist kleine Weiler aus wenigen Häusern, oft auf Pfählen an der Lagune; später hatten Dörfer in
Samoa oder Fidschi oft hundert und mehr Menschen. Danach richten sich die Stufen:

| Stufe | Ab | Wer braucht was (pro Kopf und Minute) |
| --- | --- | --- |
| Weiler | Anfang | alle: Dach, Nahrung 1,2 (jede Sorte zählt), Wasser 0,5; Familienhäuser dazu Gekochtes 0,3 |
| Dorf | 30 Bewohner | Meisterfamilien dazu: Töpfe 0,07, Matten 0,06, Kokosöl 0,04 |
| Häuptlingsdorf | siehe unten | die Häuptlingsfamilie dazu: Tapa 0,3, Schweine 0,2, Kava 0,2, Muschelschmuck 0,1, Feine Matten 0,1, Bemalte Tapa 0,15, Duftöl 0,15 |

- **Häuptlingshaus:** Ein großes Haus auf einem Steinsockel (8 Holz, 6 Palmwedel, 4 Schnur, 1 feine Matte), eines je
  Insel, nur auf hohen Inseln, mit dem ersten Fest. Die Familie, deren älteste Frau die älteste unter den
  Meisterfamilien ist, zieht ein. Ihre älteste Frau ist die **Matriarchin**, ihr ältester Mann der Häuptling. So war es in Tonga:
  Die Schwester des Häuptlings stand im Rang über ihm (fahu), die Tamahā war die Ranghöchste im Land.
- **Weg zum Häuptlingsdorf**, als Liste in der Übersicht, jeder Schritt mit Haken: eine große hohe Insel, die mindestens
  80 Menschen trägt; das Häuptlingshaus; die Häuptlingsfamilie hat alles; 50 Bewohner; Ansehen 20; Schönheit 10.
- Fehlt der Häuptlingsfamilie 30 Takte lang etwas, wird es wieder ein Dorf.

**Jede Insel trägt nur so viele Menschen, wie ihr Land ernährt.** Hohe Inseln je nach Fläche etwa 30 bis 110, Koralleninselchen 20 bis 50. Ist die Insel voll, sagt das Spiel es einmal: Schickt Familien im Kanu aus und gründet ein neues Dorf. **Siedler
gehen als Familien:** Beim Beladen kommt erst der Rest der Familie an Bord, die schon einsteigt, dann eine Familie, deren
Erwachsene frei sind, Erwachsene zuerst. Wer geht, nimmt seine Linie mit. Die Häuptlingsfamilie bleibt. Auf der neuen Insel bilden sie wieder ihre Familien.

## Das Leben im Dorf

- **Der Tag:** Mittags sitzen die Leute ohne Arbeit beim Erdofen, abends im Versammlungshaus beim Kava, die Alten erzählen
  von den Ahnen, nachts gehen alle nach Hause. Kinder spielen auf dem Platz.
- **Wer was arbeitet:** In jeder Familie gehen zuerst die Frauen zu Tapa, Matten, Töpfen, Hühnern, an Quelle und Brunnen,
  zuerst die Männer zum Fischen auf See, zum Tauchen, Fällen, Klettern, Beilschleifen, zu den Schweinen und zum Erdofen.
- **Ahnen:** Die Liste nennt die letzten 20 mit Namen, alle älteren werden gezählt („und 140 Ahnen der alten Zeit“). Die
  Namen aller Häuptlinge bleiben.
- **Weniger Gedränge:** Höchstens 60 Figuren je Insel sind unterwegs; in einem großen Dorf bleiben die anderen im Haus.

## Freizeit

Wer gerade nichts zu tun hat, Kinder, Alte, Leute ohne Arbeit und am Abend die Arbeiter, tut, was man auf den Inseln immer
getan hat. Man sieht immer wieder etwas anderes:

- **Surfen:** Mit dem Brett unter dem Arm zum Strand, liegend hinauspaddeln, auf dem Brett sitzen und auf die Welle
  warten, dann stehend hereinreiten, die Knie gebeugt, die Arme ausgestreckt, hinter sich die weiße Gischt. Surfen ist
  auf Hawaiʻi (heʻe nalu) und Tahiti (faʻaheʻe) alt; Kinder ritten auf kleinen Brettern. Nur bei Wind, nicht im Sturm,
  und auf Atollen an der Seite zum offenen Meer.
- **Schwimmen:** Kinder rennen hinein und springen mit einem Platscher, dann ein paar Züge hierhin und dorthin, manchmal
  ganz untertauchen, Ringe auf dem Wasser, und zurück an den Strand.
- **Drachen:** Ein Drachen aus Pandanusblatt mit rotem Schwanz steigt am Strand, immer mit dem Wind.
- **Spielzeugkanu:** Ein Kind watet in die Lagune und lässt ein kleines Auslegerkanu mit Krebsscherensegel kreisen.
- **Fadenspiele:** Zwischen den Händen entsteht alle paar Atemzüge eine neue Figur (whai, fai, ʻai).
- **Jonglieren:** Drei Kerzennüsse fliegen über dem Kopf im Kreis, wie beim hiko der Mädchen in Tonga.
- **Blütenkränze:** Blüte um Blüte auf einen Streifen Bast.
- **Mittagsschlaf:** Im Schatten einer Palme auf der Matte liegen und langsam atmen.
- **Geschichten:** Eine Alte erzählt; über ihr erscheint, wovon: Schildkröte, Kanu, Stern, Hai, Fisch. Kinder setzen
  sich dazu und hören zu.
- **Schlitztrommel:** Abends schlägt jemand am Dorfplatz die Schlitztrommel; die Klänge gehen in Ringen hinaus, und die
  Kinder tanzen dazu.

**Feierabend:** Auch wer arbeitet, hat frei. Am Abend gehen viele Arbeiter surfen, schwimmen, zur Trommel oder flechten
Kränze, mittags machen einige eine Pause. Wer an einem Ort arbeitet, der von selbst weiterläuft (Felder, Handwerk, Palmen,
Wald), geht; Fischer, Taucher und Bauleute bleiben, bis ihre Arbeit getan ist. Danach geht jeder zurück an seinen Platz.
Antippen zeigt „Feierabend“.

Bei der Arbeit gibt es kleine Pausen: ein Schluck aus einer grünen Kokosnuss, Strecken, den Schweiß von der Stirn
wischen. Handwerker halten ab und zu hoch, was sie gemacht haben: die Töpferin ihren Topf, die Weberin ihre Matte.
Bauleute schlagen mit dem Beil, binden einen Pfosten mit Sennit fest oder richten einen Pfosten auf. Ein gefällter Baum
kippt erst langsam, dann schnell, schlägt in einer Staubwolke auf und liegt einen Moment da; auch die alte Palme, die das
Erntehaus fällt. Taucher springen mit einem Platscher ab und kommen neben dem Kanu wieder hoch, prusten und halten die Muschel in
die Höhe. Bei den Fischern springt ab und zu ein Fisch ins Kanu, und über ihnen kreisen Seevögel, wie über einem
Schwarm; danach haben sich Fischer immer gerichtet.

Freizeit ist nur fürs Auge: Sie ändert nichts an den Vorräten, und Feierabend und Pausen kosten keine Arbeit.

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

## Hochzeiten zwischen den Völkern

Heiraten verbanden die Inselvölker: Feine Matten, Tapa und Schweine gingen als Brautgaben hin und her, und wer heiratete,
zog in das Dorf des anderen. Gleiche Muster weit verstreut zeigen solche Wege, und das Erbgut der Polynesier erzählt
bis heute, dass Lapita-Leute auch in die alten Völker des Großen Landes eingeheiratet haben.

- **Hochzeit stiften:** Im Fenster eines Clans oder Volkes unter „Heiraten“. Es braucht eine Schnur mit 3 Knoten, einen
  freien jungen Erwachsenen (16 bis 34 Jahre) im eigenen Dorf an der Schnur, Platz im Dorf und als Brautgaben 2 Matten und
  ein Schwein. Der neue Partner zieht zu euch, mit eigenem Namen, und das Dorf feiert drei Tage. Ansehen +4, zwei Knoten mehr.
- **Brautwerbung:** Manchmal kommen Boten eines befreundeten Clans: Jemand von ihnen möchte einen der Euren heiraten,
  der nach ihrem Brauch zu ihnen zieht. Stimmt ihr zu, bleiben ihre Brautgaben bei euch, und ihr werdet verwandt;
  lehnt ihr ab, löst sich ein Knoten.
- **Verwandt sein:** Solange ein Ehepaar lebt (wer fortzog, zählt 40 Jahre), löst sich die Schnur nicht mehr, Gaben zählen
  pro Ehe ein Zehntel mehr (höchstens zwei), und die Verwandten kommen als Gäste zum Fest der Plejaden. Wer aus einem
  Töpfervolk einheiratet, stempelt weiter das Muster seiner Heimat: Es verblasst im Dorf nicht.
- Das Fenster des Clans zeigt die Paare und wer zu ihnen gezogen ist, „Alle Menschen“ zeigt die Verheirateten. Die Chronik
  kennt „Ein Bund durch Heirat“ und „Verwandte in der Fremde“ (mit einem Volk anderer Kultur).

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
- Neu dazu: **Wind**, so laut, wie er weht, mit Böen; ein leises Holzklopfen bei jedem Tipp; aufsteigende Holztöne und
  rasselnde Muscheln, wenn ein Haus aufsteigt; ein knarrender Stamm und ein dumpfer Schlag, wenn ein Baum fällt; ein
  Platschen, wenn ein Kind ins Wasser springt oder ein Taucher abtaucht; abends die Schlitztrommel vom Dorfplatz, leiser
  als beim Fest; drei fallende Töne, wenn eine Familie fortfährt.
- Klang und Tag und Nacht lassen sich im Menü ausschalten.
- **Langsame Geräte:** Das Spiel misst, wie schnell die Bilder kommen. Kommen sie eine Weile zu langsam, stehen erst
  Bäume und Gras still, dann zeichnet es mit weniger Pixeln. Läuft es eine halbe Minute leicht, wird es wieder feiner.

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
- **Am Wasser:** Die Fischer paddeln zu zweit hinaus, werfen ihr Netz, holen ab und zu einen zappelnden Fisch ins Kanu und
  hängen den Fang ans Gestell, oder sie waten mit dem
  Korb im seichten Wasser, nah am Strand. Wo ein Weg übers Wasser führt, über eine Lagune oder eine Bucht, paddeln die
  Leute im Einbaum; niemand läuft übers Riff. Beides ruht unter Rāhui.
- **Im Meer:** Fischschwärme und Schildkröten ziehen durch die Lagunen. Auf offener, schon gesehener See taucht ab und zu
  ein Wal auf, bläst und zeigt beim Abtauchen die Fluke. Neben fahrenden Kanus springen Delfine.
- **Wetter:** Wolkenschatten ziehen mit dem Nordwind über Meer und Inseln, in der Sturmzeit als Regenschauer. Ein
  Wirbelsturm ist voll animiert (siehe Ereignisse).
- **Schiffsverkehr:** Kanus fahren langsam an und gleiten in den Hafen, drehen sich allmählich in die neue Richtung statt
  umzuklappen, ziehen eine weiße Kielwelle hinter sich her, und Kanus auf demselben Weg halten je ihre eigene Spur.
- **In den Kanus** sitzen dieselben Menschen wie an Land: Fischer, Fährleute und Paddler zeigen den Oberkörper über dem
  Rand, das Paddel taucht im Takt ein. Im Auslegerkanu paddeln zwei, auf dem Doppelkanu stehen die Leute auf der Plattform
  unter dem Segel, am Heck der Steuermann.

Diese Kleinigkeiten laufen mit wenigen Bildern pro Sekunde, wenn sonst nichts animiert ist, und gar nicht, wenn das Gerät
weniger Bewegung wünscht.

## Menschen

Kleine Figuren ohne Arme und Beine: Tapa-Wickelrock, Muschelkette, Haarknoten, Hibiskusblüte oder langes Haar,
drei Hauttöne, Alte mit grauem Haar und Stock. Jeder Bewohner ist zu sehen und hat einen Namen. Wer Arbeit hat, trägt sie sichtbar
vom Feld, der Werkstatt oder dem Waldrand zum Speicher: Taro oder Brotfrucht im Korb auf dem Kopf, Töpfe,
Steine, Obsidian, Muscheln, Schnur, Tapa, Proviant, Holz, Fisch an der Stange, Matten. Die anderen schlendern zwischen den
Häusern, die Alten sitzen oft auf Matten. Bauleute tragen Holz zu den Baustellen und hämmern dort, Holzfäller schlagen am
Baum, Pflanzer tragen Setzlinge, Fischer fahren zu zweit hinaus und waten übers Riff.
Die Figuren haben zwei Augen. Auch in den Dörfern der Clans sind Menschen unterwegs.

## Quellen

- Kirch, P. V. (1988), Long-distance exchange and island colonization: the Lapita case; Summerhayes, G. (2004) zu
  Obsidian und Töpfen im Lapita-Tausch; Hogg et al. (2024) zu Lapita-Netzen.
- Genetik früher Pazifik-Siedler: kleine Gründergruppen, Engpässe (Studien in Nature 2021 und PMC 2020–2025).
- Fischerei im Pazifik: Männer im Kanu mit Netz, Leine und Speer, Frauen beim Sammeln auf dem Riff (SPC-Berichte, Cook
  Islands, Hawaiʻi); Lapita-Fischerei vor allem in Riff und Lagune (Walter; Teouma).
- Muschelhaufen auf Tongatapu und in Papua-Neuguinea: Schalen werden kleiner (Anadara), Teouma: nahe Vorkommen erschöpft.
- Kokospalme: Wedel als Dach, Fasern zu Sennit für Kanus, Beile und Häuser, Holz; Fußschlinge zum Klettern (Polynesian
  Cultural Center; PROSEA; Pollex, Proto-Polynesisch *kaafaga).
- Dachdecken in Ozeanien: Pandanus hält länger als Kokoswedel, Familienarbeit (Buck, Material Culture of the Cook Islands).
- Putz, Fletcher und Magee (2023), Tree Felling with Stone Axes: Pre-Bending Matters but Feller Sex Does Not, Forests 14.
- Passatwolken: Lebensdauer von Dutzenden Minuten, Wachsen, Reife mit Regen, Auflösung (Witte et al. 2014; Seelig et al.
  2023).
- Talepakemalai, Mussau: Pfahlhäuser über der Lagune, 1300 bis 1100 v. Chr. (Kirch 2001, 2024).

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
