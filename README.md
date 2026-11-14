# Polinusa

Aufbauspiel fürs Handy. Zeit: die Lapita-Phase der Austronesier, um 1500 v. Chr. Von Anno kommt nur der Gedanke, dass
Häuser mit ihren Bedürfnissen wachsen; alles andere ist Ozeanien (siehe „Eigene Handschrift“).
Ein Clan fährt los, findet leere Inseln, siedelt dort und treibt Handel über das offene Meer.

**Ideen für später:** [IDEEN.md](IDEEN.md)

**Inhalt:** [Starten und Tests](#starten) · [Anfang](#anfang) · [Oberfläche](#die-oberfläche) · [Haushalte und Ausbau](#haushalte-und-familien) ·
[Zuzug](#zuzug-familien-aus-der-ferne) · [Bauen und Vorrang](#bauen) · [Arbeit](#arbeit-nach-händen) · [Leben der ersten Seefahrer](#das-leben-der-ersten-seefahrer) · [Freizeit](#freizeit) ·
[Die große Fahrt](#die-große-fahrt) · [Klang](#tag-nacht-und-klang) · [Was belegt ist und was nicht](#was-belegt-ist-und-was-später) ·
[Quellen](#quellen)

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

Zuerst prüft es, ob jede Datei fehlerfrei lesbar ist (eine kaputte Zeile hält das ganze Spiel an), ob in `style.css`
jede Klammer zu ist (eine Klammer zu viel ließ den Browser still eine Regel verwerfen, eine zu wenig schluckt alles
danach) und ob keine Funktion zweimal heißt (die Dateien teilen sich einen Namensraum, die spätere ersetzt still die
frühere). Dann sagen die
Tests je „OK“ oder „FEHLER“: `data` (jedes Bild, auf das etwas zeigt, ist da; jede Aufgabe und Stufe nennt Gebäude, die
es gibt; jede Art von Arbeit hat eine Zeichnung), `smoke` (landen wie ein Spieler, auch die gebündelte Datei), `rules` (Regeln, dazu Hauswerk, das Jahr und Hawaiki), `tiere` (jedes Tier zeichnet in jedem Abstand, bei jeder Qualität, an jedem Tageszeitpunkt und mit weniger Bewegung ohne Fehler; nur Hund, Schwein und Huhn im Dorf),
`build` (sechs Baustellen zugleich werden in 20 Minuten fertig, auch mit Nächten, Vorrang, Felder werden gegraben), `life` (Wachszeit, Yamsjahr,
Schlaf und Fackelfischen, Wild nach Jahreszeit, alles gespeichert), `play` (Freizeit, Feierabend,
jede Animation), `music` (die Töne der Musik und echte Klangknoten, siehe „Der Soundtrack“), `soak` (Stürme, Stärken, Stammplätze, Handel, Speichern und Laden, Musik, alles durcheinander 1500 Takte lang), `save` (Neuladen, kaputter Spielstand, Laden aus Text, zwei Spielstände), `phone`
(vierfach langsame CPU, drei Bildschirme von 320×568 bis 390×844, Knopfgrößen, die Hausansicht scrollt nicht, auch nicht bei einem vollen Haus), `fuzz` (jeder Knopf in jedem Blatt) und `bot` (ein
Spieler, der nur dem Rat folgt, eine Stunde lang). Mit `--long` spielt der Bot drei Dörfer je anderthalb Stunden.

Der Bot hat **Wächter** für das, was ein Spieler sehen würde: eine Baustelle, die mit Bauleuten drei Minuten nicht
vorankommt; Bauleute, die mehr als dreimal wechseln; ein Platz, der zehn Minuten leer bleibt, während jemand frei ist;
eine Figur, die auf dem Weg zur Arbeit anderthalb Minuten nicht vorankommt; jemand, der arbeitet, aber nicht als
anwesend zählt. Dazu schreibt er **Meilensteine** auf: wann die erste Familie aus der Ferne kommt, das erste
Familienhaus steht, 20 und 30 Menschen da sind, das erste Kanu fährt.

**Messwerte:** Im Menü zeigt „Messwerte“ unten links, wie viele Bilder pro Sekunde das Gerät wirklich zeichnet, die
längste Lücke zwischen zwei Bildern, die Qualitätsstufe (2 alles, 1 ohne Wiegen, 0 weniger Pixel), die Pixeldichte und
die Zahl der Figuren. Damit lässt sich das Spiel auf einem echten Handy prüfen.

### Spielstand

Das Spiel speichert im Browser. Es gibt **zwei Spielstände**. Im Menü unter „Spielstände“ steht jeder mit der
Heimatinsel, der Zahl der Menschen, dem Jahr und wann zuletzt gespielt. **Spielen** wechselt: Das laufende Spiel bleibt
gespeichert, das andere ist inzwischen weitergelaufen, wie nach einer Pause. Ein leerer Spielstand beginnt mit dem Kanu
auf See. **Neu** beginnt einen Spielstand neu, mit neuen Inseln, nach einer Rückfrage; das gilt auch für den, der gerade
läuft. Welcher Spielstand zuletzt lief, merkt sich das Spiel. Der bisherige Spielstand ist Spielstand 1.

Alle fünf Minuten legt das Spiel zusätzlich eine Kopie an, drei je Spielstand werden aufbewahrt; ist der
Spielstand einmal kaputt, lädt es die neueste Kopie. Auch nach „Neu“ bleiben die Kopien des alten Spiels eine Weile im
Menü, so lässt sich ein Versehen zurücknehmen. Im Menü unter „Als Datei“: **Sichern** lädt eine Datei herunter,
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
| `src/worldmotion.js` | Bewegte Welt: Segel, Dünung, Leinen, Tiere, Rauch, Regen, Fahnen, Festfeuer |
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
- **Spätere Wörter nur als Hinweis:** Aus der Familie der Tufunga wurde die Handwerkerfamilie (tufunga sagte man später in
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
| 8 Menschen | Gärten | Taro, Pulaka, Kanarinussbaum, Baumpflanzer, Speicher, Hühner, Pandanus |
| 12 | Sennit und Erdofen | Sennit drehen (Hauswerk), Erdofen, Kalkbrenner, Kurkuma, Harz |
| 20 | Töpfe und Werkzeug | Töpfern, Angelhaken schleifen und Matten flechten (Hauswerk), Beilwerkstatt, Steg, Pfahlhaus, Gärgrube, Blumen, **Kanuhaus und Auslegerkanu** |
| 30 | Ein Dorf | Öl pressen (Hauswerk), Doppelkanu, Navigatoren, Taucher, Versammlungshaus |
| 40 | Zeit der Feste | Tapa klopfen (Hauswerk), Maulbeergarten, Schweine, Trommel, Tanzplatz, Ahnenhaus, Klingen, Schmuck, Bananen |
| nach der großen Fahrt | **Hawaiki** | Kavagarten, Häuptlingshaus; als Hauswerk feine Matten, bemalte Tapa, Duftöl, Holzschalen |
| in Hawaiki, mit dem Sternenpfad | **Die lange Pause** | Reisekanu |

Das Kanuhaus kommt mit 20 Menschen, weil die Handwerkerhäuser Matten wollen, die es nur auf Atollen gibt. Die Stufen stehen
in der Übersicht als **Weg des Dorfes**: eine Schnur mit einem Knoten je Stufe, dann der Knoten der großen Fahrt und
dann Hawaiki, die lange Pause und zuletzt die zweite Fahrt; fest sind die erreichten, locker die nächste (mit der Zahl der Menschen darunter), hell die kommenden.

**Hawaiki, die spätere Zeit.** Kava, feine Matten, bemalte Tapa, Duftöl und das Haus des Häuptlings kennt man erst aus
viel späterer Zeit, aus dem Polynesien, das in Tonga und Samoa aus den Lapita-Leuten entstand. Darum kommen sie im Spiel
erst mit dem **ersten Dorf auf den Fernen Inseln**: Dann beginnt eine neue Zeit, Hawaiki, auf allen Inseln des Clans.
Jedes Dorf hat von da an Kava-Stecklinge. Vorher bietet auch kein Clan Kava an, keiner fragt nach den feinen Dingen, beim
Fest der Plejaden gibt es keine Kava-Runde und bei der Dürre keine Kava-Zeremonie. Das Häuptlingsdorf ist die Aufgabe
nach dem Fest der Schätze; der Weg zum Häuptlingsdorf beginnt mit der großen Fahrt. Ein Spielstand, der beim
Häuptlingsdorf stand, macht mit dem Tauchen und der großen Fahrt weiter.

**Die lange Pause und die zweite Fahrt.** Von Tonga und Samoa aus fuhren die Kanus etwa 1500 Jahre lang nicht weiter
nach Osten; erst um 1000 n. Chr. erreichten sie Tahiti und die Marquesas, danach Hawaiʻi, Rapa Nui und Aotearoa. Im Spiel
liegt hinter den Fernen Inseln die **Leere See**, drei Felder offenes Meer ohne eine Insel, und dahinter die **Inseln
des Morgens**, auf denen noch niemand lebt (keine Clans). Die lange Pause endet, wenn in Hawaiki ein Navigator den
**Sternenpfad** kennt (Stufe 3). Dann lässt sich im Kanuhaus das **Reisekanu** bauen: 14 Holz, 3 Steinbeile, 6 Matten,
8 Schnur, 3 Harz und 2 feine Matten, etwa elf Minuten, 36 Waren und 10 Menschen, schneller als das Doppelkanu und mit
einem großen Segel. Nur das Reisekanu fährt über die Leere See; Doppelkanus und Handelsketten kehren dort um. Die Namen
Leere See und Inseln des Morgens stehen erst ab Hawaiki auf der Karte. Der Weg des Dorfes endet mit dem Knoten
**Die zweite Fahrt**: einem Dorf auf den Inseln des Morgens.

**Hauswerk statt Werkstätten.** Sennit drehen, Matten flechten, töpfern, Öl pressen, Tapa klopfen, später auch feine
Matten flechten, Tapa bemalen und Duftöl ansetzen: Das machten die Familien bei sich zu Hause, nicht in eigenen Hütten.
Darum stehen diese Dinge nicht mehr in der Bauleiste. Auf der Tafel eines Hauses gibt es die Zeile **Hauswerk** mit einem
Bild je Ware. Ein Tippen wählt das Hauswerk dieses Hauses, noch ein Tippen nimmt es weg. Ein Haus hat höchstens ein
Hauswerk. Gearbeitet wird auf einer Matte vor dem Haus; zuerst arbeitet die eigene Familie, sonst hilft jemand, der frei
ist. Auf dem gewählten Bild steht, wie viele arbeiten („1/1“), fehlt etwas, steht das Bild davon daneben. Der Ort zählt
weiter: Töpfern geht nur in einem Haus nah am Ton, Matten flechten nur mit 2 Pandanus nah am Haus, Tapa klopfen nur bei
einem Maulbeergarten, Duftöl nur bei Blumen. Ein Bild, das hier nicht geht, ist blass und sagt beim Tippen, warum.
Knöpfe wie „Hauswerk“ beim Rat oder bei einem fehlenden Knoten öffnen das passende Haus. Steht keines am richtigen Ort,
öffnet sich die Bauleiste mit einer Hütte genau dort, etwa am Ton. Auch eine leere Hütte kann schon ihr Hauswerk wählen;
dann arbeiten Leute aus anderen Familien dort, bis eine Familie einzieht. Wird das Haus versetzt, geht die Matte mit;
wird es entfernt, ist auch das Hauswerk weg.

**Hauswerk geht vor, entweder oder.** Wer im Hauswerk arbeitet, arbeitet nirgends sonst. Die Hände kommen zuerst aus der
eigenen Familie: Ein freies Familienmitglied, sonst eines, das woanders arbeitet und dort ganz abgezogen wird (nicht von
einem Platz, der mit dem Muschelhorn gerufen ist). Erst wenn die Familie niemanden hat, kommt jemand ohne Arbeit, sonst
jemand von dem Platz, der am besten warten kann. Baustellen und das Muschelhorn ziehen niemanden aus dem Hauswerk ab.
Werkstätten für Hauswerk-Waren gibt es nicht mehr: Eine alte Werkstatt aus einem früheren Spielstand wird zum Hauswerk
im nächsten Haus ohne Hauswerk, am liebsten in einem, wo es am Ort geht. Die Werkstatt verschwindet, eine Nachricht sagt,
welche Familie es jetzt macht.

**Angelhaken und Holzschalen.** Ab 20 Menschen kann eine Familie **Angelhaken schleifen**, aus Muschelschalen vom Riff
(1 Muschel je Haken), wie die einteiligen Haken und Schleppköder aus Muschel und Perlmutt, die man an Lapita-Orten findet.
Liegen Haken im Lager, fangen die Fischer anderthalbmal so viel Fisch; ein Haken hält für etwa 8 Fische. Ab **Hawaiki**
kann eine Familie **Schalen schnitzen** (1 Holz je Schale). Holzschalen erfüllen dann das Bedürfnis nach Töpfen: In Tonga
und Samoa wurden die Muster der Töpfe immer einfacher, vor etwa 2000 Jahren hörte das Töpfern auf, Schalen aus Holz und
Kokos traten an ihre Stelle. Darum heißt der Knoten dann „Töpfe oder Holzschalen“, und auch Atolle ohne Ton können ihn
fest knüpfen.

**Arbeit und Freizeit.** Ein Tippen auf eine Person öffnet ihr Blatt: Name, Alter, Familie, was sie gerade tut, wo sie
arbeitet (mit „Hingehen“) und wie ihr Tag geteilt ist, als Balken: Arbeit, Freizeit, Schlaf. Darunter ein **Regler für
das ganze Dorf**, auch oben im Reiter „Arbeit“ der Übersicht:

| Stellung | Arbeit | Feierabend | Kinder |
| --- | --- | --- | --- |
| Viel Freizeit | 85 % so schnell | die meisten abends, viele mittags | kommen öfter (125 %) |
| Ausgewogen | wie bisher | ein Teil abends, einige mittags | wie bisher |
| Dringend Arbeit | 125 % so schnell | niemand | kommen halb so oft |

**Warum Mangel trotz vieler Bewohner?** Gemessen: Wer einen Arbeitsplatz hat, ist dort 98 % der Zeit, Freizeit kostet
also kaum etwas. Ein Mangel kommt fast immer daher, dass jeder Platz besetzt ist: Freie Leute arbeiten nur, wo ein Platz
frei ist, sonst sammeln sie Wild, und das wird weniger. Ein Arbeiter im Feld ernährt etwa 3 Menschen (Feldfrüchte 3,75 pro
Minute, jeder isst 1,0), einer an der Quelle tränkt etwa 10. Der Rat sagt es jetzt: „3 sind frei, doch jeder Platz für
Nahrung ist besetzt: Ein Feld oder eine Fischerhütte mehr gibt Arbeit.“

**Arbeit nach Stand, wie bei Anno.** Die Erwachsenen einer **Handwerkerfamilie** gehen nicht mehr aufs Feld, aufs Meer
oder in den Wald. Sie arbeiten im Hauswerk, im Handwerk, im Kanuhaus und auf Baustellen. Ihr eigenes Hauswerk geht ein
Viertel schneller. Wer Handwerker macht, braucht also weiter einfache Familien für Essen, Wasser und Holz. Fehlt Essen oder
Wasser ganz, packen alle wieder mit an. Hat eine Handwerkerfamilie freie Hände und kein Hauswerk, sagt der Rat
„Handwerkerfamilie ohne Werk“ und zeigt das Haus.

**Verhältnisse und Ketten.** Die Tafel eines Arbeitsplatzes zeigt „≈3,1“ mit dem Bild für Menschen: so viele versorgt der
Platz, voll besetzt. Darunter in Worten, etwa „Voll besetzt 3,8 Nahrung pro Minute: genug für etwa 3,1 Menschen. Jeder
braucht 1,0 pro Minute.“ Das Blatt einer Ware zeigt ihre Kette in Bildern: was hineingeht, die Ware, wohin sie weiter
geht, zum Beispiel „Kokosfasern → Schnur → Fischerhütte schneller · Ausbau Familienhaus“.

**Der Rat und das Wachsen.** Reicht Essen oder Wasser nur gerade, rät der Rat nicht mehr zu Hütten, sondern
„Mehr Essen als gebraucht“, mit dem, was noch fehlt, etwa „+9 pro Minute“. Der Rat „Auf 40 Menschen wachsen“ baut nur
noch eine Hütte, wenn alle Häuser voll sind, sonst öffnet er die Übersicht.

**Helfer statt Herumstehen.** Bleiben nach allen Plätzen und Baustellen Leute übrig, gehen sie von selbst als **Helfer**
an einen Platz: zuerst dorthin, wo eine Ware knapp ist, dann, wo das Lager noch Platz hat; nie ins Hauswerk, an Fischer-
und Taucherfahrten, den Yamsgarten oder einen Platz mit vollem Lager. Ein Platz nimmt höchstens so viele Helfer, wie er
Leute hat. Jeder Helfer bringt halb so viel wie einer der Mannschaft: Ein Fällplatz für 2 mit 1 Helfer schafft 125 %, mit
2 Helfern 150 %. Wird das Lager voll, gehen die Helfer weiter. Über dem Platz hat jeder Helfer eine eigene Marke, das
Personenblatt sagt „dazu 1 als Helfer“. Wer auch so keinen Platz findet, sammelt Wild und zählt oben als ohne Arbeit.
Steht der Regler auf **Viel Freizeit**, helfen die Übrigen nicht, sie haben Freizeit: Oben zählen sie nicht als ohne
Arbeit, und die Übersicht nennt sie „in Freizeit“. Wer Arbeit von Hand verteilt, bekommt keine Helfer.

**Wasser.** Die Quelle wird nicht mehr gebaut: Jede Insel mit einem Bach hat ihre Quelle von selbst, dort, wo der Bach
dem Dorf am nächsten ist, mit einem Wasserträger (genug für etwa 10 Menschen). Inseln ohne Bach, auch die Atolle, trinken
das Wasser grüner Kokosnüsse aus dem Erntehaus; Brunnen gibt es nicht mehr in der Bauleiste. Die Aufgabe „Wasser holen“
heißt jetzt überall: 8 Wasser lagern.

**Aufgaben und Bewohner.** Keine Aufgabe verlangt ein Gebäude, bevor das Dorf sicher die Menschen dafür hat; ein Test prüft
die Reihenfolge. Vor „Gärten anlegen“ kommt darum „Acht Menschen“. Wäre ein Gebäude doch noch gesperrt, sagt die Karte
„… gibt es erst ab N Menschen. Baut bis dahin Hütten“, und „Zeigen“ führt zur Hütte.

**Häuser, Vögel, Wellenreiten.** Hütten haben vier Formen: mit runden Enden, ganz rund, mit hohem Giebel und gekreuzten
Firststangen, und lang und niedrig mit zwei Türen. Über den Inseln kreisen drei Arten Vögel im selben Strich: die bisherigen
Seevögel, Fregattvögel mit langen, eckigen Flügeln und gegabeltem Schwanz, die fast nur segeln, und kleine Seeschwalben,
die schnell schlagen. Wer surft, gleitet jetzt ruhiger auf der Welle (etwas langsamer als vorher das Doppelte des Gehens).

**Das Jahr steuert die Arbeit.** Im Kalender stehen zu jeder Zeit Bilder mit ▲ oder ▼:

| Zeit | Was sie bewirkt |
| --- | --- |
| Zeit der Plejaden | Fest der ersten Früchte, die Brotfrucht trägt reich |
| Sturmzeit | raue See, Kanus langsamer (0,8), doch der Wind aus Nordwest schiebt nach Osten; ein Doppelkanu auf freier Fahrt gerät an jedem Fahrtag mit 16 % Wahrscheinlichkeit in Böen und verliert 2 Proviant, mit einem Navigator ab Stufe 2 nur mit 7 %; Töpfe, Tapa und Öl trocknen schlecht und brauchen 1,7-mal so lange; Yams werden gepflanzt |
| Passatzeit | ruhige See, Kanus schneller (1,2), also weniger Proviant, nur nach Osten geht es gegen den Wind aus Südost; Töpfe, Tapa und Öl trocknen gut (0,8-mal so lange) |
| Magere Zeit | keine Brotfrucht; die Yamsernte |

Nach der Yamsernte einer Insel bringen dort drei Monde lang das kleine und das große Fest anderthalbmal so viel Ansehen
(beim großen Fest 23 statt 15). Der Rat der Ältesten sagt es dann („Fest nach der Yamsernte“). Die Aufgabe „Die Weite See“
sagt: Nach Osten geht es gegen den Passat, in der Sturmzeit schiebt der Westwind, doch es drohen Stürme. So erkundeten
auch die Lapita-Leute: gegen den Wind hinaus, damit der Weg zurück leicht war (Irwin 1992). Im Sturm trägt das gewählte Hauswerk-Bild von Töpfen, Tapa und Öl eine kleine Regenwolke.

- **Rat der Ältesten:** Über der Bauleiste steht immer ein nächster Schritt. Dringendes steht rot als „Jetzt“: kein Dach,
  Wasser fast aus, Nahrung aus, ein fremdes Kanu fragt. Sonst sagt der Rat, was dran ist: Leute verteilen, Palmwedel
  holen, Holz, Fasern und Schnur, ein Familienhaus, Gekochtes, mehr Hütten, neues Blut, die nächste Stufe.
- Jede neue Stufe wird gefeiert: Ansehen +2, Herzen über dem Dorf.

Über der Bauleiste steht immer genau eine Aufgabe. Antippen erklärt sie, „Zeig es mir“ springt zur richtigen Stelle.

1. Erntehaus, 2. Holzfäller, 3. 8 Wasser (von der Quelle oder aus grünen Nüssen), 4. Fischerhütte,
5. eine zweite Hütte, 6. eine Familie aus der Ferne aufnehmen, 7. sechs Menschen bei der Arbeit, 8. acht Menschen, 8a. zwei Tarofelder,
9. 12 Bewohner, 10. Familien aus drei Linien, 11. Sennit drehen im Haus, 12. ein Familienhaus, 13. Erdofen, 14. Baumpflanzer,
15. 20 Bewohner, 16. eine Familie am Ton töpfert, 17. Steg und Pfahlhaus, 18. Beilwerkstatt, 19. 30 Bewohner, 20. Kanuhaus,
21. Auslegerkanu, 22. Siedler nach Motu, 23. Matten flechten und Sennit drehen auf Motu, 24. Handelskette, 25. ein Dorf mit einer
Handwerkerfamilie, 26. 6 Proviant, 27. Doppelkanu, 28. neues Land im Nebel, 29. eine Hochzeit mit einem Clan, 30. ein Fest,
31. das Fest der Plejaden, 32. Tauchen, 33. das Lapita-Netz, 34. die Weite See, 35. eine Schatzinsel, 36. ein Dorf in
der Ferne, 37. das Fest der Schätze, 38. Hawaiki: ein Häuptlingsdorf, 39. die lange Pause: ein Navigator mit dem
Sternenpfad, 40. das Reisekanu, 41. die Inseln des Morgens, 42. ein Dorf am Morgen, 43. andere Menschen: ein Volk einer
anderen Kultur. Ein Spielstand, der schon alle Aufgaben hatte, macht mit der langen Pause weiter.

Ist die letzte Aufgabe geschafft, zeigt eine Tafel den Rückblick. Danach geht das Spiel weiter.

## Die Oberfläche

Einfach und nach Bedeutung geordnet:

- **Oben, die Insel:** der Name, Ansehen, Leute ohne Arbeit und die Bewohner mit ihrem Platz. Darunter die wichtigsten
  Vorräte, jede mit ihrem Namen klein unter Bild und Zahl (Essen, Wasser, Holz, Wedel, Schnur …), und genau ein Hinweis, der gerade zählt: Essen wird knapp, etwas fehlt, **„2 Ausbau“** mit einem Knoten, Häuser voll, ein
  Kanu kommt. Antippen öffnet die Übersicht.
- **Unten:** der nächste Schritt in einer Zeile, rot, wenn es dringend ist. Antippen zeigt den Weg. Daneben „Bauen“ und
  „Flotte“.
- **Die Leiste mit Wind, Muschel und Menü** (seit Version 74): Um ihren Rand läuft der Tag. Was vorbei ist, ist blass; was
  kommt, ist golden für den Tag und blau für die Nacht; eine Sonne oder ein Mond wandert mit. Darunter steht „Tag noch
  2:43“ oder „Nacht noch 0:51“ (bei doppelter Geschwindigkeit halb so lang). Jede Nachricht rollt kurz aus, schrumpft
  dann und fliegt in die Muschel, die nickt. Dort bleiben die letzten 120, auch nach dem Schließen des Spiels, mit Jahr,
  Mond und wie oft sie kam.
- **Bauen:** Wer etwas zum Bauen wählt, sieht unten neben den Kosten eine Reihe Kacheln: **Braucht** (grün, wenn im Lager,
  rot, wenn nicht) → **Macht**, und wie viele dort arbeiten. In der Übersicht zeigt der Reiter **Werk** jede Werkstätte in
  einer Zeile: was sie braucht, was sie macht und ob sie läuft („läuft“, „fehlt Holz“, „Lager voll“, „keine Leute“).
  Antippen führt hin.
- **Ein Haus antippen** zeigt alles auf einem Blatt, **ohne Scrollen**, auch auf kleinen Handys (320×568 bis 390×844
  werden im Handy-Test gemessen), und **in Worten statt Zeichen** (seit Version 66):
  - Oben der Name der Familie, darunter in einer Zeile „Familienhaus · 4 von 6 Plätzen“.
  - Die Leute als Kacheln: Name und Alter, darunter, was sie tun („Erntehaus“, „Sennit drehen“, „baut“, „Kind“). Am
    Ende die Kachel **Hauswerk**: das gewählte Hauswerk mit seinen Händen („Sennit drehen 1/1“) oder „Hauswerk wählen“.
    Ein Tippen öffnet die Auswahl mit Namen; was hier nicht geht, ist blass und sagt beim Tippen, warum.
  - **Was die Familie braucht:** eine Kachel je Bedürfnis mit Bild, Namen und einem Wort: **da** (grün), **knapp**
    (gelb), **fehlt** (rot). Ein Tippen zeigt, woher es kommt. Das Dach hat eigene Wörter: **hält**, **undicht**,
    **kaputt**, im Sturm **fest**. Ab dem Familienhaus kommt **Feuer** dazu (siehe „Dächer, Sturm und Herdfeuer“); bei
    fünf Bedürfnissen stehen fünf Kacheln in einer Reihe. Kommt ein Sturm, steht statt „Als Nächstes“ die Zeile „Sturm in
    40 s: Das Dach ist lose“ mit „Dächer festbinden“.
  - **Eine Zeile „Als Nächstes“:** das Erste, was fehlt (sonst knapp ist), mit dem Gebäude, das hilft: „Essen knapp →
    Tarofeld“, oder in Worten: „Gekochtes fehlt: Erdofen kommt ab 12 Menschen.“
  - **Ausbau:** „Ausbau: Handwerkerhaus“, darunter „Platz für 8 · will dann auch Töpfe, Matten und Öl“, daneben der Knopf
    „Ausbauen“. Darunter jede Bedingung als Kachel mit Namen und „hat/braucht“: Bedarf 3/4, Töpfe 0/1, Matten 0/2, Öl
    0/1, Holz 2/2, grün oder rot. Muss etwas per Kanu kommen, trägt die Kachel ein kleines „Kanu“ und führt zu den Kanus.
  - Unten die Linie der Familie und „Versetzen“, „Entfernen“.
  Die Knotenschnur und die Bildkette sind aus dem Haus verschwunden: Sie waren schön, aber man musste sie erst lernen.
- **Ein Arbeitsplatz** zeigt oben, ob er arbeitet, darunter **„Braucht“ und „Macht“ als Kacheln** (seit Version 67): jede
  Ware mit Bild, **Namen**, wie viel pro Minute und wie viel im Lager ist. **Grün**, was da ist, **rot**, was fehlt. Am
  Erdofen etwa: Braucht Rohes Essen, Brennstoff und Blätter, jedes mit „pro Minute“ und „Lager 14“ oder „fehlt“; Macht
  Gekochtes. Ein Werkzeug, das schneller macht, steht als eigene Kachel dabei („macht schneller“ oder „wäre schneller“).
  Eine rote Kachel führt beim Tippen zu dem, was die Ware macht. So sieht jede Werkstatt, jedes Feld und jedes Haus mit
  Hauswerk gleich aus. Die alte Bildreihe mit Pfeilen und „≈“ ist weg. Auch **die Kanus im Kanuhaus** zeigen ihre Kosten
  so: Holz 6/6 grün, Schnur 1/3 rot. Darunter die Leute mit − und +, und was sie
  holen sollen. Erst die **festen Plätze** (das Erntehaus hat immer 2), dann die **Helfer**, kleiner, mit einem Plus und
  „hilft“; darunter in Worten „2 feste Plätze, dazu 2 Helfer“. Auch die Marken über dem Gebäude zeigen erst die festen
  Plätze, dann die Helfer mit Plus. So sieht ein Platz nicht mal nach 2, mal nach 4 Plätzen aus.
- **Blasen auf der Karte antippen** (seit Version 67): Jede Sprechblase über einem Haus oder Ort führt zu dem, was hilft.
  Fehlt einem Haus Wasser, öffnet ein Tipp das Bauen mit dem Erntehaus; fehlt einem Ort eine Ware, kommt das Gebäude,
  das sie macht, das Hauswerk oder die Kanus. Ein Haus zum Ausbau, ein Ort ohne Leute, das Muschelhorn, eine Familie,
  die fortwill, und ein Kanu mit Zuzug öffnen ihr Blatt.
- **Die Übersicht** (Bewohnerzahl antippen) hat drei Reiter:
  - **Bewohner:** oben eine Zeile, was das Dorf gerade aufhält, mit dem passenden Knopf: ohne Dach, Wasser fehlt, Häuser
    sind zum Ausbau bereit, für das Familienhaus fehlt Schnur, für das Handwerkerhaus fehlen Matten von einem Atoll, die Insel ist
    voll. Darunter jede Hausstufe mit Häusern und Menschen und **Kacheln wie im Haus** (seit Version 68): Bild, Name und
    ein Wort, da, knapp, fehlt, beim Dach hält, undicht, kaputt. Eine Stufe, die noch kein Haus erreicht hat, zeigt ihre
    Bedürfnisse blass mit „später“. Ein Tipp führt zu dem, was hilft. Dazu Zuzug und Kinder und die Verwandtschaft.
  - **Arbeit:** automatisch oder von Hand, wer frei ist, welche Plätze Raum haben oder ruhen, alle Familien.
  - **Insel:** Wald, Felder, Wild, Riff, Pflanzen und Tiere, Muster, Navigatoren, der Weg zum Häuptlingsdorf.
- **Wenig Text:** Bilder statt Sätze. Meldungen sind kurz („Familie Hiva zieht ein, mit 3 Feldfrüchten. Neue Linie.“).
  Mehr steht unter „Mehr dazu“.

- **Lager:** Jede Ware eine Kachel: Bild, Zahl, **darunter ihr Name** (Feldfrüchte, Wildbeute, Kokosfasern …), ein Balken,
  wie voll es ist, und ▲ oder ▼ pro Minute, grün oder rot.
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

- **Die Knotenschnur:** Der Weg des Dorfes oben in der Übersicht ist eine Schnur aus Sennit mit Knoten, nach den
  geknoteten Ahnenschnüren der Marquesas (taʻo mata): fest gezogen erreicht, eine lose Schlaufe als Nächstes. Die
  Bedürfnisse stehen seit Version 66 im Haus und seit Version 68 auch in der Übersicht als Kacheln mit Wörtern.
- **Ein Knoten statt Pfeil:** Über einem Haus, das ausgebaut werden kann, schwebt ein Knoten mit einer Tiare-Blüte und
  wiegt sich. Auch der Knopf „Ausbauen“ trägt ihn; ist alles bereit, zieht der Knoten sich im Takt zusammen und ein
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

Alles Essen zählt als **Nahrung**. Oben steht nur eine Zahl, in der Übersicht und im Lager darunter jede Sorte.

**Das Morgenmahl** (seit Version 74). Bei Tagesanbruch isst und trinkt **jeder Mensch eine Portion**, auch die Kinder,
und dann nichts mehr bis zum nächsten Morgen. Wer im Familienhaus oder besser wohnt, bekommt Gekochtes aus dem Erdofen,
solange es reicht; die anderen essen, wovon am meisten da ist. Zuerst die Kinder und die Alten, dann die Familien nach der
Zeit, die sie schon hier leben. Wer leer ausgeht, **arbeitet an dem Tag langsamer**: ohne Essen oder ohne Wasser mit drei
Vierteln der Kraft, ohne beides mit gut der Hälfte (auch beim Bauen). Fehlt es drei Morgen hintereinander, fährt die
Familie fort, die zuletzt kam; die letzte bleibt immer, und während ihr fort seid, geht niemand.
- **Sehen:** Oben werden Essen oder Wasser **rot**, wenn es am nächsten Morgen nicht für alle reicht (der Vorrat und was
  bis dahin noch dazukommt). Im Lager steht „Morgenmahl: 14 Menschen … bis dahin etwa 18 Essen und 12 Wasser“. Bei
  Tagesanbruch steigt über jedem Haus eine Schale auf: voll, mit Dampf, oder leer mit rotem Kreuz. Auf der Personentafel
  steht „Heute früh ohne Wasser: arbeitet langsamer“, und die Muschel meldet „Morgenmahl auf Panua: 3 ohne Wasser“.
- **Im Tagestakt:** Weil eine Portion für einen ganzen Tag reicht, kommt Essen langsamer herein: Felder, Fischer, Bäume,
  Hühner, Wild und Erdofen bringen ein Sechstel, Quelle und Regen ein Drittel von vorher. Eine Palme reift **eine Nuss am
  Tag**; grüne Nüsse geben je 4 Wasser. Das Verhältnis bleibt: ein Feld ernährt etwa 4, eine Palme einen Menschen, ein
  Wasserträger an der Quelle etwa 10. An der Quelle tragen jetzt **zwei**. Was nebenbei abfällt (Fasern, Schalen und
  Wedel von den Nüssen, Proviant von den Kanarinüssen), kommt so schnell wie zuvor. Ölhütte, Gärgrube und Pferch machen
  aus einer Nuss oder Feldfrucht sechsmal so viel wie vorher, die Feste kosten weniger Portionen.
- **Der Speicher zählt:** Wasser ist eine einzige Ware, und ins Lager passen 20 je Ware (+10 je Speicher). Mehr als
  16 Menschen brauchen darum einen Speicher; der Rat sagt rechtzeitig „Speicher bauen“.
- **Wachsen:** Familien ziehen zu und Kinder kommen nur, wenn das Morgenmahl heute für alle reichte und am nächsten Morgen
  genug für alle und eine Familie mehr da ist. Reicht es nicht, holt ein leerer Platz, der Wasser oder Essen macht, Hände
  von einem Platz, der warten kann (einmal in der Minute geprüft, damit niemand hin und her läuft). Ein Erntehaus, dessen
  Palmen leer sind, ruht, und seine Leute helfen woanders, bis wieder ein paar Nüsse reif sind.
- **Der Bot** (der nur dem Rat folgt) kommt nach 90 Minuten auf 26 bis 47 Menschen, im Mittel 35 (vorher 29 bis 36, im
  Mittel 31). Wasser und Platz im Lager sind die neuen Engpässe.

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

**Palmen tragen nicht endlos** (seit Version 73). Jede Palme reift etwa eine Nuss am Tag (bis Version 73 eine pro Minute), reif oder grün. Ein
Erntehaus bekommt nur, was die Palmen in seiner Reichweite tragen, und teilt sie mit jedem anderen Erntehaus am selben Hain.
Sind sie abgeerntet, wartet es („Palmen abgeerntet“) und schneidet solange Wedel. Eine Palme nährt also etwa einen
Menschen: Wer wachsen will, pflanzt Palmen oder holt Essen vom Meer und vom Feld. Vorher konnten Erntehäuser allein ein
ganzes Dorf ernähren; der Fischer war kaum nötig. Der Bot kommt damit nach 90 Minuten auf etwa 37 Menschen (vorher 63).

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

**Ins Atoll erst mit Steg und Einbaum** (seit Version 74). Die Pässe durchs Riff sind flach. Kanus fahren zu einem Atoll,
auf dem ihr noch nicht lebt, und in seine Lagune erst, wenn irgendwo ein Kanusteg mit fertigem Einbaum steht; vorher sagt
eine Nachricht, warum nicht. Handelsketten zu solchen Atollen gehen erst dann, das Doppelkanu erkundet dort erst dann, und
die Aufgabe „Hinüber nach Motu“ zeigt zuerst den Steg. Wo ihr schon wohnt, fahrt ihr immer hin.

## Haushalte und Familien

Wie bei Anno zählt jedes Haus für sich. Ein Haus hat vier Stufen, ab dem Familienhaus mit zwei Wegen (siehe „Zwei Wege: Handwerker und Seefahrer“ am Ende):

| Stufe | Bau | Platz | Will |
| --- | --- | --- | --- |
| Hütte | 4 Holz, 4 Palmwedel | 2 bis 4 | Dach, Nahrung, Wasser |
| Familienhaus | neu gebunden: 2 Holz, 3 Kokosfasern, 2 Schnur | 4 bis 6, **Platz für Kinder** | dazu Gekochtes |
| Handwerkerhaus | die Familie hat ein Hauswerk; 2 Holz, 2 Matten; Töpfe, Matten und Öl im Lager | 4 bis 8 | dazu Töpfe, Matten, Kokosöl |
| Seefahrerhaus (nur nah am Strand) | 3 Holz, 2 Palmwedel, 2 Schnur; Fisch, Proviant, Schnur im Lager | 4 bis 7 | dazu Fisch, Proviant, Schnur |
| Häuptlingshaus | eigenes Gebäude | 4 bis 10 | dazu das Feinste |

- **Familien:** Jeder Mensch gehört zu einer Familie. Eine Familie trägt den Namen der Frau, die sie gegründet hat; die
  frühen Lapita lebten wohl dort, wo die Familie der Frau lebte.
- **Hütte:** Pfosten und ein Dach aus Palmwedeln, ohne Nägel. Sie ist das Zuhause einer Familie, bis 4 Menschen. In einer
  Hütte kommen **keine Kinder** zur Welt.
- **Ausbau:** Ein Haus kann eine Stufe höher, wenn **alle Bedürfnisse da** sind und das **Material** im Lager liegt; für das Handwerkerhaus müssen dazu Töpfe, Matten und Kokosöl da sein.
  Dann schwebt ein Knoten mit Blüte über dem Haus, oben steht „Ausbau“, und auf der Tafel des Hauses ist der Knopf
  „Ausbauen“ frei. Beim Ausbau regnen Blüten aufs Dach. In der Übersicht baut „Alle ausbauen“ alle bereiten Häuser auf
  einmal aus. Wer will, schaltet dort „Von selbst ausbauen“ ein; dann bleibt immer etwas Schnur für Netze und Kanus übrig.
- **So sieht man die Stufe:** Das Familienhaus hat Tapa an der Tür und zwei geschnitzte Pfosten, das Handwerkerhaus dazu
  Töpfe und eine gerollte Matte davor und einen Blütenkranz über der Tür.
- **Weiterkommen:** Die Tafel zeigt, was fehlt, und woher es kommt. Manches gibt es nicht auf jeder Insel: Matten nur auf
  Atollen, Töpfe nur auf hohen Inseln, feine Dinge nur auf Inseln mit besonderem Boden. Ab dem Handwerkerhaus muss das Dorf
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
- **Handwerkerfamilie:** Meister eines Handwerks; viel später hießen sie in Tonga und Samoa tufunga. Fehlen Töpfe, Matten
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
- **Jeder hat seinen Stammplatz** (seit Version 67): Wer einmal an einem Ort arbeitet, gehört dorthin und bleibt. Früher
  rechnete das Spiel die Plätze jeden Takt neu aus; wuchs ein Feld noch, lag es brach oder war keine Pflanzzeit, liefen
  die Leute weg, und man musste sie von Hand zurückholen. Jetzt gilt:
  - **Ausleihen statt umziehen:** Eine Baustelle, ein Kanu, das Muschelhorn, ein Helfer anderswo oder ein Dach im Sturm
    leiht sich jemanden aus. Der Platz bleibt ihm, und ist die Arbeit getan, geht er von selbst zurück.
  - **Ruht sein Ort,** etwa weil das Feld wächst oder brach liegt, behält er den Platz und hilft solange woanders. Auf
    der Tafel steht dann „Tarofeld · wächst noch“ oder „Fischerhütte · baut Hütte“. Über dem Ort zeigt eine gestrichelte
    Marke mit Pfeil, dass er wiederkommt.
  - **Ausgeliehen wird mit Ruhe:** Erst wer frei ist oder wessen Ort ruht, dann vom Ort, der am ehesten warten kann. Ein
    kurzer Mangel zieht niemanden sofort ab; erst wenn er 20 Sekunden anhält.
  - **„Bleiben“:** Auf der Tafel eines Arbeitsplatzes hält ein Schalter die Leute dort fest. Von diesem Ort wird
    niemand ausgeliehen.
  - **Stammplatz wählen** (seit Version 68): Auf der Tafel einer Person steht „Stammplatz: Erntehaus“ mit „Ändern“. Dann
    stehen alle Arbeitsplätze als Kacheln da, mit Namen und wie viele dort ihren Platz haben. Ist einer voll, tauscht
    der Letzte dort mit dir: Er bekommt deinen alten Platz. Was nicht passt (eine Handwerkerfamilie auf dem Feld), ist blass
    und sagt warum. Die Insel bleibt dabei automatisch.
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
- Die Bauleute tragen Holz und Palmwedel aus dem Lager herbei, **zwei Stück pro Gang**. Gebaut wird an einer Stelle
  zugleich, je 10 Bewohner an einer mehr; die anderen Baustellen zeigen, der wievielte sie in der Reihe sind.
- **Dieselben Leute bis zum Schluss:** Eine Baustelle behält ihre Bauleute, bis sie steht. Vorher konnten sie bei jeder
  Zählung wechseln, und wer gerade eine Last trug, ließ sie fallen; manche Baustellen kamen so kaum voran.
- **Felder werden gegraben, nicht gezimmert:** Bei Tarofeld, Pulakagrube, Gärten, Quelle, Brunnen und Plätzen brechen die
  Leute mit dem Grabstock den Boden auf und setzen im Feld Taroschösslinge. Statt eines Gerüsts erscheinen Reihe um Reihe
  frisch gegrabene Furchen, und das Feld kommt aus dem Boden. Die Tafel sagt „wird angelegt“.

### Vorrang: das Muschelhorn

Mit dem Muschelhorn (pū) rief man auf den Inseln die Leute zusammen. Auf der Tafel jeder Baustelle und jedes
Arbeitsplatzes sitzt in der Reihe der Leute der Knopf **Vorrang** mit dem Horn:

- **Baustelle:** Sie bekommt sofort Bauleute, zusätzlich zu den Baustellen, an denen schon gearbeitet wird, auch wenn
  sie noch weit hinten in der Reihe war.
- **Arbeitsplatz:** Er wird sofort voll besetzt, erst mit Freien, dann mit Leuten von dem Ort, der am ehesten warten
  kann. Die automatische Verteilung nimmt ihm niemanden mehr weg.
- Gerufene Leute **eilen** hin, und ein Ort mit Vorrang hat keinen Feierabend.
- Über dem Ort schwebt das Horn. Höchstens **zwei Orte** zugleich; ein dritter Ruf nimmt den ältesten zurück.
- Der Ruf endet von selbst, wenn die Baustelle steht oder der Speicher des Arbeitsplatzes wieder gut gefüllt ist; er
  wird gespeichert.
- Hat ein Ort niemanden, leuchtet der Knopf auf.

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

- **Lebenslauf:** Kinder wachsen in sechs Jahren heran und arbeiten dann. Ab vierzig sind die Leute alt und gehen
  nicht mehr aufs Feld, aufs Meer oder in den Wald. Sie sitzen aber noch beim **Hauswerk** vor dem Haus ihrer Familie,
  halb so schnell wie die Jüngeren; das Hauswerk nimmt zuerst die Alten des Hauses. Zwischen 44 und 58 sterben sie und gehen zu den Ahnen. Ein Jahr auf den Inseln dauert zwölf Minuten:
  nah dran sieht man Kinder groß werden, und wer nach einem Tag wiederkommt, findet eine neue Generation.
- **Neue Menschen:** Wächst das Dorf, ziehen Leute zu, und ab zehn Bewohnern wird gut jedes dritte Kind im Dorf geboren.
  Am schnellsten kommen Kinder, wenn mehr Essen und Wasser da ist, als gebraucht wird (15 % darüber, oder volle Lager).
  Reicht es nur gerade, kommen sie trotzdem, aber seltener (30 %). Nur wenn Essen oder Wasser ganz fehlt, kommt keines.
  Früher blieben Kinder ohne Überschuss ganz aus. Ein Probelauf über 50 Spieljahre zeigte das Ende: ab Jahr 12 kein
  Kind mehr, das Dorf wurde alt, in Jahr 50 lebte noch einer. Mit der neuen Regel lebten im selben Lauf durchgehend
  27 bis 39 Menschen.
- **Warnung und Altersleiste:** Kam drei Jahre lang kein Kind, sagt der Rat „Seit 4 Jahren kein Kind“ und warum: kein
  Familienhaus, kein junges Paar, Häuser voll, zu nah verwandt, Essen fehlt. Dazu, wie viele in fünf Jahren alt werden.
  In der Übersicht, Reiter Arbeit, zeigt ein Balken Kinder, Erwachsene und Alte, wie viele Alte im Hauswerk sitzen und
  wann das letzte Kind kam.
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
- **Land finden ohne Karte:** Seevögel fliegen morgens von verborgenem Land zum Fischen hinaus und abends heim. Das sieht
  jeder, auch ohne Navigator, für Land nahe am bekannten Meer (bis 450 Schritte). Beim ersten Mal sagen es die Ältesten.
  Ein Tippen auf die Zeichen im Nebel sagt, was man liest: „Dort im Nebel liegt Land.“ Auch das Doppelkanu, das von selbst
  erkundet, fährt lieber dorthin.
- **Drei Stufen:** 1 *Wellen und Vögel*: Der Navigator folgt den Vögeln weiter hinaus (bis 800) und liest die Dünung:
  Braune Bögen laufen von verborgenem Land auf das bekannte Meer zu, wie Wellen, die sich an einer Insel brechen und
  biegen. 2 *Wolken über Land*: Über einer Insel bleibt eine Wolke stehen,
  über einer Lagune ist ihre Unterseite grün. Man sieht sie weiter als die Vögel (bis 1150). 3 *Sternenpfad*: Auf See reicht der
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
- **Weniger werden:** Jeder, der sammelt, nimmt etwas weg. Wild wächst langsam nach, auf bewohnten Inseln nur halb so
  schnell, weil mit den Kanus Ratten kamen, die Eier fressen.
- **Ratten im Vorrat:** Die Pazifische Ratte (kiore) fährt in jedem Kanu mit. In jedem Dorf frisst sie jede Minute ein
  Zwanzigstel der Feldfrüchte im Lager. Ein Speicher auf Pfosten mit Rattenschutz halbiert das, zwei halten sie ganz fern.
  Die Übersicht (Reiter Insel) zeigt, wie viel sie fressen; fressen sie viel, raten die Ältesten zu einem Speicher. Drei oder vier Sammler trägt eine Insel auf Dauer; mehr leeren sie.
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

- **Eigenes Muster:** Ein Dorf findet es mit den ersten Töpfen, die eine Familie dort brennt. Panua stempelt das Gesicht der Ahnen mit der langen
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
- **Was sie lehren** (seit Version 83). Die Lapita-Kultur ist aus Begegnungen entstanden; das soll das Spiel zeigen. Außer
  der ersten Gegengabe lehrt jedes Volk dem Clan bei viel Vertrauen (6 Knoten) etwas, das für immer bleibt:
  **Gartenwissen vom Großen Land** (Felder laugen halb so schnell aus) und **Wetterzeichen vom Nordmeer** (Böen auf See
  kosten nur halb so viel Proviant). Jede Lehre bringt Ansehen 3. In der Übersicht unter „Netz“ steht „Was andere Völker
  lehrten“, mit Herkunft und wie weit das Vertrauen schon reicht.

## Raum für Fantasie: der Lichtwal (seit Version 83)

Nicht alles im Spiel ist Geschichte. In manchen Nächten zieht **ein Wal aus weichem Licht** an einem Dorf vorbei, weit
draußen auf dem offenen Wasser, mit einer Reihe Punkte auf dem Rücken wie auf den Töpfen. Wer ihn antippt, dem bringt er
Ansehen 2, und einer aus dem Dorf hat ihn in seiner Lebensgeschichte („sieht in der Nacht den Lichtwal“). Der Lichtwal ist
**erfunden**: eine Gestalt dieses Spiels, keine Überlieferung eines wirklichen Volkes. Heilige Gestalten lebender Kulturen
(Götter, Ahnen, Helden aus Sagen) nimmt das Spiel bewusst nicht als Spielfiguren.

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
- **Treibgut am Ufer antippen** (seit Version 67, für ruhige Minuten): Vor dem Dorf, das du ansiehst, treibt immer
  wieder etwas, höchstens drei Stück zugleich. Ein langsamer Ring geht davon aus. Ein Tipp, und jemand paddelt hinaus:
  Es spritzt, die Ware steigt auf und kommt ins Lager (ein Stamm 3 Holz, Nüsse 4 Kokosnüsse, ein Wrackteil 2 Holz und
  1 Schnur). Was den Strand erreicht oder vier Minuten treibt, ist fort. **Ganz selten (etwa jedes 16. Stück) ist es
  ein Klumpen Kauri-Harz** (seit Version 68, vorher Bernstein): golden, ein wenig trüb, mit schimmerndem Ring. Es stammt
  von den Kauri-Bäumen (Agathis) der großen Inseln. Daraus schnitzt die Matriarchin einen Talisman (siehe „Das
  Dorfzentrum“).
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

**Volles Lager drüben** (seit Version 74). Ein Kanu lädt nur so viel aus, wie ins Lager passt; der Rest **bleibt an Bord**
und geht beim nächsten Mal von Bord, statt zu verschwinden. Was ein Hafen selbst verschickt, wird dort nicht wieder
ausgeladen. Die Ladung zählt dann mit: Es wird nur bis zur Menge der Kette nachgeladen. Einmal meldet die Muschel „Lager auf
Motu voll: 5 Holz bleiben an Bord“, und auf der Tafel des Kanus steht dasselbe. Auch „Ausladen“ und das Heimkehren der
Erkunder werfen nichts mehr weg.

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
- **Siedeln:** Mit 4 Siedlern an Bord vor einer leeren Insel „Dorf gründen“. Das erste Haus wird aus dem gebaut, was im
  Kanu liegt (seit Version 75): auf einer hohen Insel 4 Holz und 4 Palmwedel, auf einem Atoll 3 Holz und 5 Palmwedel.
  Fehlt es, sagt die Kanutafel, was fehlt, und „Dorf gründen“ bleibt aus. Vorher stand das Haus auch ohne Holz. Der Rest
  der Ladung kommt ins Lager. Ein Auslegerkanu fasst 12: Haus zuerst, dann Essen und Wasser für die ersten Morgen.
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
| Sturmzeit | 3–5 | Kanus langsamer, Töpfe, Tapa und Öl trocknen schlecht |
| Passatzeit | 6–9 | Kanus schneller, Töpfe, Tapa und Öl trocknen gut |
| Magere Zeit | 10–12 | Brotfrucht trägt nicht, Proviant aus der Gärgrube hilft; Yamsernte, danach bringen Feste mehr |

- **Palolo:** Eine Woche nach Vollmond im ersten Mond steigt der Palolo-Wurm aus dem Riff. Drei Takte lang
  schöpfen alle Inseln Meeresfrüchte, mit Fischerhütten mehr.
- **Rāhui:** In der mageren Zeit kann eine Insel mit Fischerhütte ihr Riff sperren. Bis zum Fest
  ruht der Fang, danach ist er dreimal so reich, und das Ansehen steigt um 3.

## Fest der Plejaden

In der Zeit der Plejaden im Versammlungshaus. Die ersten Früchte (12 Feldfrüchte, 6 Fisch, 2 Schweine) gehören den Ahnen, das bringt
Ansehen 10. Dazu kann man wählen:

- Kava-Runde (3 Kava, erst ab Hawaiki): +5, Gäste der Clans knüpfen einen Knoten mehr. Kava wächst im Kavagarten oder
  kommt vom Clan vom Maulbeerhain.
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
| Kanarinussbaum | hoch | wächst 14 Minuten | 3 Feldfrüchte, dazu 1 Proviant | |
| Pulakagrube | Atoll, in der Mitte eines Motus | | 3,3 Feldfrüchte | 1 |
| Pandanussammlerin | Atoll | 2 Pandanus daneben | 5 Feldfrüchte | 1 |
| Baumpflanzer | hoch | Stümpfe oder Waldrand in Reichweite | 3,75 junge Bäume | 1 |
| Sennit drehen (Hauswerk) | überall | 1 Kokosfaser je Schnur | 5 Schnur | 1 |
| Erdofen | überall | 2 rohe Speisen, Brennstoff, Blätter | 7,5 Gekochtes | 2, Hand in Hand |
| Gärgrube | hoch | 2 Brotfruchtbäume daneben, 1 Feldfrucht je Proviant | 5 Proviant | 1 |
| Töpfern (Hauswerk) | hoch | Haus nah am Ton, 1 Brennstoff je Topf | 3 Töpfe, in der Sturmzeit weniger | 2, Hand in Hand |
| Beilwerkstatt | hoch | Basaltfelsen in der Nähe | 3 Steinbeile | 2 |
| Klingenschläger | Vulkan | Obsidian in der Nähe | 2,5 Klingen | 2 |
| Tapa klopfen (Hauswerk) | hoch | Maulbeergarten nah am Haus | 2,5 Tapa, in der Sturmzeit weniger | 2, Hand in Hand |
| Schweinepferch | hoch | 2 Feldfrüchte je Schwein | 1,7 Schweine | 1 |
| Matten flechten (Hauswerk) | Atoll | 2 Pandanus nah am Haus | 3 Matten | 1 |
| Harzsammler | hoch | 2 Brotfruchtbäume daneben | 3 Harz | 1 |
| Öl pressen (Hauswerk) | überall | 2 Kokosnüsse je Öl | 3 Kokosöl, in der Sturmzeit weniger | 1 |
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
| Kokospalme | Erntehaus | reife Nüsse (Nahrung) mit Kokosfasern, Kokosschalen und einem halben Wedel (der fällt beim Klettern mit herunter), grüne Nüsse (Wasser), Palmwedel (Dach), alte Stämme (Holz) |
| Kokosfasern | Sennit drehen | Sennit, die Schnur für Häuser, Kanus und Netze |
| Kokosschalen | Herdfeuer, Erdofen, Töpfern | Brennstoff: erst die Schalen, dann Holz. Jede reife Nuss gibt eine Schale (seit Version 67, vorher eine halbe) |
| Kokosnüsse | Öl pressen | Kokosöl, 2 Nüsse je Öl |
| Pandanus | Matten flechten, Pandanussammlerin | Matten und Segel; Früchte als Nahrung (Atoll) |
| Brotfruchtbaum | Gärgrube, Harzsammler | Proviant; Milchsaft, mit dem Kanus abgedichtet werden |
| Bach | Quelle | Wasser, nur auf Inseln mit Bach, am Bach |
| Süßwasser im Sand | Brunnen | Wasser, nur auf Atollen, in der Mitte eines Motus |
| Riff | Fischerhütte | Meeresfrüchte, Muschelschalen für die Schmuckschleiferei, Korallensteine für den Erdofen |

- **Fällen:** Eine Kokospalme (2 Holz) oder ein Brotfruchtbaum (3 Holz) lässt sich auf seiner Tafel fällen. Danach ist
  weg, was er trug.
- **Bauen wie damals:** Gebäude werden ohne Nägel gebaut: Holz und Palmwedel für jedes Dach, Sennit erst für das
  Familienhaus, Pfahlhaus, Versammlungs- und Kanuhaus. Kanus brauchen dazu Brotfruchtharz.
- **Wasser** ist ein Grundbedürfnis: jeder Mensch braucht 0,5 pro Minute. Fehlt es, wächst das Dorf nicht.
- **Kokosöl** wollen die Handwerkerfamilien. Beim Fest der Plejaden glänzen die Tänzer vom Öl (Salbung, +3), und der
  Clan vom Feuerberg und der Clan vom Maulbeerhain schätzen es als Gabe.
- **Warengruppen:** Eine Werkstatt kann eine Gruppe verlangen, etwa Brennstoff. Dann nimmt sie, was da ist, zuerst die
  Abfälle.
- Das Ahnenkanu bringt 8 Holz, 8 Palmwedel, 24 Nahrung und 12 Wasser. Erntehaus, Holzfäller, Quelle, Brunnen und
  Fischerhütte gibt es vom ersten Tag an.

## Veredelung, Erdofen und Tiere

Aus den Rohstoffen werden die Dinge, die Handwerkerfamilien und später der Häuptling wollen.

| Ort | Braucht | Macht |
| --- | --- | --- |
| Erdofen (umu) | 2 rohe Speisen (Feldfrüchte, Fisch, Meeresfrüchte, Wild), Brennstoff, Blätter; Kochsteine machen ihn doppelt so schnell (1 Stein je 12) | 3 Gekochtes und Reste |
| Kalkbrenner, am Strand | Brennstoff | Korallenkalk; die Töpferei füllt damit die Muster weiß und arbeitet schneller |
| Kurkumagarten | Kurkuma, mitgebracht im Ahnenkanu | Kurkuma |
| Hühnerhof | Hühner, mitgebracht; Futter | Eier (Nahrung) |
| Tapa bemalen (Hauswerk) | Tapa und Kurkuma | Bemalte Tapa |
| Feine Matten flechten (Hauswerk) | 2 Matten | Feine Matten, die Ehrenmatten für Hochzeit und Tod |
| Duftöl ansetzen (Hauswerk) | Kokosöl, Blumen oder Hibiskus nah am Haus | Duftöl |
| Schmuckschleiferei | Klinge, 2 Muschelschalen oder Eberhauer | Muschelschmuck |

- **Nebenprodukte:** Taro- und Pulakafelder geben Blätter, Bananen noch mehr. Die Beilwerkstatt gibt Kochsteine aus Basalt,
  die Fischerhütte vom Riff Korallenbrocken als Kochsteine und Muschelschalen. Der Schweinepferch gibt Eberhauer.
- **Gekochtes** zählt als Nahrung und ist ein Bedürfnis der Handwerkerfamilien (0,3 pro Kopf und Minute).
- **Tiere fressen:** Jedes Schwein frisst laufend (0,25 pro Minute), jeder Hühnerhof 0,6, aus dem Futter: erst Reste, dann
  Kokosnüsse, dann Feldfrüchte. Ohne Futter legen die Hühner nicht, und jede halbe Minute geht ein Schwein ein.
- Der Erdofen und der Kalkbrenner kommen mit der Töpferei, Kurkuma und Hühner mit dem Tarofeld, Malerin, Weberin und
  Duftöl mit Hawaiki, nach der großen Fahrt. Dann schätzen die Clans die feinen Dinge als Gabe.

## Besondere Böden: warum man viele Inseln braucht

Die feinen Dinge wachsen nicht überall. Jede Insel außer der Heimat kann einen besonderen Boden oder ein besonderes Riff
haben; er steht unter dem Namen der Insel auf der Karte.

| Besonderheit | Wo | Was nur dort geht |
| --- | --- | --- |
| Rote Erde | Talise und manche hohe Inseln | Kurkumagarten: Farbe für bemalte Tapa |
| Feuchte Hänge | manche hohe Inseln | Kavagarten |
| Kegelschnecken | Motu und manche Koralleninseln | Schmuckschleiferei: Armringe |
| Feiner Pandanus | manche Koralleninseln | feine Matten flechten: Ehrenmatten |

Die Heimat hat keinen davon. Für die Häuptlingsfamilie braucht man darum ein Netz aus Inseln, mit Siedlern oder Handel, so
wie das Lapita-Netz wirklich war. Der Rat sagt, welche Insel den fehlenden Boden hat.

## Dörfer, Stufen und die Häuptlingsfamilie

Lapita-Siedlungen waren meist kleine Weiler aus wenigen Häusern, oft auf Pfählen an der Lagune; später hatten Dörfer in
Samoa oder Fidschi oft hundert und mehr Menschen. Danach richten sich die Stufen:

| Stufe | Ab | Wer braucht was (pro Kopf und Minute) |
| --- | --- | --- |
| Weiler | Anfang | alle: Dach, Nahrung 1,0 (jede Sorte zählt), Wasser 0,5; Familienhäuser dazu Gekochtes 0,3 |
| Dorf | 30 Bewohner | Handwerkerfamilien dazu: Töpfe 0,07, Matten 0,06, Kokosöl 0,04 |
| Häuptlingsdorf | siehe unten | die Häuptlingsfamilie dazu: Tapa 0,3, Schweine 0,2, Kava 0,2, Muschelschmuck 0,1, Feine Matten 0,1, Bemalte Tapa 0,15, Duftöl 0,15 |

- **Häuptlingshaus:** Ein großes Haus auf einem Steinsockel (8 Holz, 6 Palmwedel, 4 Schnur, 1 feine Matte), eines je
  Insel, nur auf hohen Inseln, mit Hawaiki. Die Familie, deren älteste Frau die älteste unter den
  Handwerkerfamilien ist, zieht ein. Ihre älteste Frau ist die **Matriarchin**, ihr ältester Mann der Häuptling. So war es in Tonga:
  Die Schwester des Häuptlings stand im Rang über ihm (fahu), die Tamahā war die Ranghöchste im Land.
- **Weg zum Häuptlingsdorf**, als Liste in der Übersicht, jeder Schritt mit Haken: die große Fahrt (ein Dorf auf den
  Fernen Inseln); eine große hohe Insel, die mindestens
  80 Menschen trägt; das Häuptlingshaus; die Häuptlingsfamilie hat alles; 50 Bewohner; Ansehen 20; Schönheit 10.
- Fehlt der Häuptlingsfamilie 30 Takte lang etwas, wird es wieder ein Dorf.

**Jede Insel trägt nur so viele Menschen, wie ihr Land ernährt.** Hohe Inseln je nach Fläche etwa 30 bis 110, Koralleninselchen 20 bis 50. Ist die Insel voll, sagt das Spiel es einmal: Schickt Familien im Kanu aus und gründet ein neues Dorf. **Siedler
gehen als Familien:** Beim Beladen kommt erst der Rest der Familie an Bord, die schon einsteigt, dann eine Familie, deren
Erwachsene frei sind, Erwachsene zuerst. Wer geht, nimmt seine Linie mit. Die Häuptlingsfamilie bleibt. Auf der neuen Insel bilden sie wieder ihre Familien.

## Das Leben der ersten Seefahrer

So lebten die Lapita-Leute, als sie neue Inseln besiedelten, und so lebt das Dorf im Spiel:

- **Zuerst das Meer und das Wilde.** Auf einer neuen Insel gibt es Fisch, Muscheln, Vögel, Eier und die Kokospalmen, die
  schon am Strand stehen. Davon leben die ersten Familien. Was sie im Kanu mitbringen, muss erst wachsen.
- **Was gepflanzt ist, trägt erst nach einer Weile.** Ein Garten ist schnell angelegt, aber dann wächst er, und so lange
  braucht er niemanden (die Leute arbeiten woanders). Die Tafel zeigt „wächst“ und wann er trägt; im Bild ist frisch
  gegrabene Erde mit kleinen Trieben zu sehen. Nach dem Brachliegen wird ein Feld neu bepflanzt und wächst wieder.

  | Was | im Leben | im Spiel bis zur ersten Ernte |
  | --- | --- | --- |
  | Taro, Kurkuma | knapp ein Jahr | 5 Minuten |
  | Bananen | ein Jahr | 6 Minuten |
  | Pulaka (Sumpftaro) | zwei bis drei Jahre | 7 Minuten |
  | Brotfruchtbaum | drei bis fünf Jahre | 8 Minuten |
  | Kava | drei Jahre und mehr | 10 Minuten |
  | Kokospalme aus einer Nuss | sechs bis zehn Jahre | 10 Minuten |

  Ein Spieljahr dauert 12 Minuten; die Zeiten sind also verkürzt, die Reihenfolge bleibt.
- **Das Jahr der Yams.** Yams (neu im Kanu und im Bauen, ab den Gärten) werden in der Sturmzeit in Hügel gelegt, die
  Ranken klettern an Stangen. Gepflanzt wird nur in der Sturmzeit; danach braucht das Feld niemanden. Wenn die magere Zeit
  beginnt, in der die Brotfrucht nicht trägt, wird alles auf einmal geerntet: 16 Feldfrüchte. Sie halten sich auf einem
  Gestell am Feld und gehen ins Lager, sobald dort Platz ist. Die Tafel zeigt das Jahr als Bilder: Sturm → magere Zeit,
  +16, und wie viele Monde es noch bis zum Pflanzen oder zur Ernte sind.
- **Nachts schlafen alle.** Wenn es dunkel wird, gehen die Leute in ihre Häuser; an den Türen glimmt Licht. Nur die
  Fischer fahren mit einer Fackel aus Kokoswedeln am Bug hinaus, wie man auf den Inseln nachts am Riff fischte. Morgens
  geht jeder zurück an seine Arbeit. Der Schlaf ändert nichts an den Vorräten; die Bauleute bauen dafür am Tag schneller.
  Ohne „Tag und Nacht“ im Menü schläft niemand.
- **Das Wilde folgt dem Jahr.** In der Sturmzeit kommen die Schildkröten zum Eierlegen an den Strand und die Seevögel
  brüten: Wer sammelt, findet 1,4-mal so viel, auf Atollen 1,6-mal. In der mageren Zeit ist es weniger (0,7).

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
getan hat. Man sieht immer wieder etwas anderes. (Die meisten dieser Spiele kennt man erst aus späteren Berichten,
siehe [Was belegt ist](#was-belegt-ist-und-was-später).)

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

### Jede Tätigkeit mit mindestens zwei Bewegungen

Seit Version 65 hat jede Tätigkeit mindestens zwei eigene Bewegungen, die sich abwechseln: 66 Tätigkeiten mit zusammen
116 Bewegungen. Wer an einem Platz arbeitet, nimmt bei jedem Arbeitsgang die nächste, manchmal wird eine übersprungen,
damit Nachbarn nicht im Gleichtakt arbeiten. Bei manchen Arbeiten beugt sich die Figur vor (Knollen ziehen, Eier sammeln,
unter Steinen tasten). Wer etwas anderes in den Händen hat, legt das Werkzeug ab. Der Test prüft, dass jede Tätigkeit
zwei verschiedene Bewegungen hat und dass jede davon gezeichnet wird.

| Bereich | Erste Bewegung | Dazu jetzt |
| --- | --- | --- |
| Töpfern | Wulst auf Wulst aufbauen | mit Paddel und Amboss dünn klopfen; der **Zahnstempel** drückt Reihe um Reihe das Lapita-Muster in den feuchten Ton |
| Sennit, Matten, feine Matten | auf dem Schenkel rollen, flechten | drei Stränge zum Zopf flechten; Pandanusblätter mit der Muschel in feine Streifen teilen |
| Tapa klopfen, bemalen | Rinde klopfen, mit Pinsel malen | die weiße Innenrinde vom Maulbeerstock abziehen; den Stoff über ein geschnitztes Musterbrett reiben |
| Öl, Duftöl | Kokos raspeln, Blüten rühren | im Faserbeutel auspressen, das Öl tropft in die Schale |
| Angelhaken, Schmuck | mit dem Bogenbohrer bohren | den Haken mit Korallenfeile formen; Muschel glattreiben |
| Schalen schnitzen | | den Block mit dem Beil aushöhlen; mit Koralle und Bimsstein glätten |
| Beile, Klingen | schleifen, abschlagen | mit dem Klopfstein grob zuschlagen; feine Abschläge mit der Knochenspitze |
| Felder | graben | Taro und Kurkuma an den Blättern ziehen und abschütteln; beim Yams Erde anhäufeln; in die Pulakagrube Laub werfen |
| Erdofen, Gärgrube | Blätter auflegen | heiße Steine mit der Holzzange heben, Rauch; Speisen in Bananenblätter wickeln |
| Bananen, Pandanus, Palmen | schneiden, pflücken, schälen | dürre Blätter abschneiden; Früchte auflesen; eine grüne Nuss mit dem Stein öffnen; oben in der Krone Nüsse abdrehen, ein trockener Wedel fällt |
| Holz | hacken, am Seil ziehen | einen Keil mit der Keule in den Schnitt treiben; das Seil aufschießen |
| Hühner, Schweine | füttern | Eier in den Korb sammeln; Schweine mit dem Stock zurücktreiben |
| Wasser, Harz, Kalk | schöpfen, zapfen, stampfen | in das Bambusrohr gießen; getrocknetes Harz abkratzen; das Feuer schüren, Funken |
| Navigatoren | Steine des Sternkompasses | auf einen Stern über dem Meer zeigen und seinen Weg nachziehen |
| Fischer | Netz flicken, Speer, aufhängen | Fisch auf dem Brett ausnehmen; mit gesenktem Speer anschleichen; Fische am Gestell wenden |
| Im Kanu, auf dem Riff | Leine und Ringe | ein rundes **Wurfnetz** fliegt, öffnet sich und sinkt; einer schöpft, der andere stochert mit dem Stock unter den Steinen |
| Taucher | Muschel hochhalten | auch eine Krake, die sich um den Arm legt; an Land Haare auswringen, die Leine aufschießen |
| Bauen | behauen, binden, Pfosten aufrichten | **Dach decken**: Wedel in Reihen anbinden; ein Platz oder Brunnen wird festgestampft |
| Kanu bauen | aushauen | mit **Feuer aushöhlen**, Glut und Rauch; den Ausleger anbinden |
| Tragen | auf dem Kopf, Holz auf der Schulter | zwei Körbe an der **Tragestange**; Bauleute schleifen einen Stamm am Seil hinter sich her, Staub steigt auf |
| Baumpflanzer | Setzling einsetzen | die Erde rundum feststampfen |
| Sammeln ohne Arbeit | am Boden suchen | eine Krabbe jagen und am Bein fangen; Eier aus den Nestern |
| Surfen, Schwimmen | paddeln, warten, reiten; springen, kraulen, tauchen | manchmal wirft die Welle den Reiter ab, das Brett fliegt; auf dem Rücken treiben |
| Spiele | Drachen, Fadenfigur, Jonglieren, Kranz, Spielkanu | ein Vogeldrachen stößt herab und steigt; die fertige Figur hochhalten; zwei Nüsse in einer Hand, die dritte hoch; den Kranz aufsetzen; das Kanu an der Schnur hinterherziehen |
| Alte, Zuhörer | erzählen mit Bildern, Mittagsschlaf | in den Sand zeichnen; am Stamm sitzend einnicken; zuhören mit Nicken oder Klatschen |
| Trommel | zwei Stöcke, schnell | stehend mit dem großen Schlägel, langsam und weit hallend |
| Dorfleben | sitzen | am Abend Kava aus der Kokosschale, mittags essen vom Blatt am Erdofen, reden mit den Händen, sich Luft zufächeln |
| Fest und Tanz | im Kreis wiegen | Arme in weichen Wellen (Siva); über dem Kopf klatschen; Kinder springen mit hochgeworfenen Armen zur Trommel |

Belegt sind davon für die Lapita-Zeit vor allem: Zahnstempel und Paddel-und-Amboss beim Töpfern, Bogenbohrer, Muschelhaken
mit Korallenfeilen, Erdöfen mit Kochsteinen, Ausbrennen und Behauen beim Kanubau. Sennitzöpfe, Tapa mit Musterbrett und
Tanz kennt man aus späteren Berichten.

## Eine Leiste, um die der Tag läuft (seit Version 73)

Wind und Mond, die Muschel mit den Nachrichten und das Menü waren drei Kästchen. Jetzt sind sie **eine Leiste** oben links;
Meldungen und Nachrichten hängen darunter und haben die ganze Breite. **Um ihren Rand läuft der Tag:** der Rand ist golden
für den Tag, orange zum Abend und blau für die Nacht, und ein heller Strahl steht dort, wo die Sonne (oder der Mond) gerade
ist. So sieht man, wie lange Tag oder Nacht noch dauern (ein Tag sind sechs Minuten). Ohne „Tag und Nacht“ ist der Rand
einfach braun. Seit Version 74 läuft der Rand sichtbar mit (zweimal in der Sekunde neu gezeichnet): was vorbei ist, wird
blass, eine kleine Sonne oder ein Mond wandert um die Leiste, und darunter steht die Restzeit in Minuten und Sekunden.
Seit Version 77 ist der Rand einfacher: **ein heller Teil für den Tag, ein dunkler für die Nacht**, und keine Uhrzeit mehr.
Eine kleine Sonne läuft den hellen Teil entlang; in der Dämmerung wird sie zum Mond, und der Mond läuft den dunklen Teil
ab. Am Morgen wird der Mond wieder zur Sonne.

**Kanus lenken** (seit Version 83): Ist ein Kanu unterwegs oder in einer Handelskette, zeigt seine Tafel nur Name, Lage und
„Mehr“, damit das Meer frei zum Antippen bleibt; „Weniger“ klappt sie wieder ein.

**Weniger leerer Platz:** Die Tafel eines Arbeitsplatzes zeigt den Zustand, „Vorrang“ und „Bleiben“ in einer Zeile, darunter
links „Braucht“ und „Macht“ und rechts daneben die Leute mit − und +. Der Knöchelwurf passt mit flacher Matte und kurzen
Schritten auf ein Blatt, ohne Scrollen.

**Der Ausbau eines Hauses ist zu sehen:** Ein Gerüst aus Bambus lehnt am Haus, ein Bündel Fasern fährt an einer Schnur
hinauf, die neue Bindung wächst um das Haus, Späne fliegen, es klopft. Dann fällt das Gerüst, und die Blüten regnen.

**Wenn etwas schiefgeht, läuft das Spiel weiter.** Früher hielt ein einziger Fehler beim Zeichnen oder im Klang das Spiel
für immer an; man sah nur noch das Meer. Jetzt wird das nächste Bild trotzdem gezeichnet, die Karte neu aufgebaut, und eine
Kamera ohne Ort springt zurück ins Dorf. Den letzten Fehler zeigt das Menü unter „Letzter Fehler“, damit man ihn melden kann.

## Das Dorfzentrum

Seit Version 66 ist **das erste Haus das Dorfzentrum**: das Haus am Dorfplatz, in dem die Familie wohnt, die das Dorf
gegründet hat. Man erkennt es an einem geschnitzten Pfosten mit einem roten Tapa-Wimpel, der mit dem Wind weht. Wird es
versetzt oder entfernt, wird das nächste Haus am Platz zum Dorfzentrum; jedes Dorf hat seines. Ein Tippen öffnet vier
Reiter (Dorf, Lager, Stärke, Familie):

- **Dorf:** die **Feste** (Kleines Fest und Tatau immer, das Große Fest, sobald es Schweine und Tapa gibt, das Fest der
  Schätze, sobald ein Schatz gesehen ist), jeweils mit dem, was es kostet oder was noch fehlt, und „Feiern“. Darunter
  der **Regentanz** und der **Knöchelwurf** (einmal am Tag). Ist einmal Kauri-Harz gefunden, steht dort auch der
  **Talisman der Matriarchin**: Die älteste Frau der Gründerfamilie (sonst die älteste Frau im Dorf) schnitzt aus 1
  Kauri-Harz und 1 Schnur einen Talisman. Ansehen +3. Liegt ein Talisman im Lager, hält er **einen** Sturm von allen
  Dächern ab und ist dann verbraucht.
- **Lager:** alle Waren als Kacheln mit Namen, wie im Lager oben.
- **Stärke:** die Stärke des Dorfes (siehe unten, bei „Menschen“).
- **Familie:** das Haus der Gründerfamilie, wie jedes andere Haus.

**Feste** brauchen kein Versammlungshaus mehr: Sie gehen am Dorfzentrum, die Aufgabe „Ein Fest“ zeigt dorthin. Das
Versammlungshaus bleibt für das Fest der Plejaden, den Kava am Abend und als Schlafplatz für Familien ohne Dach.

**Regentanz.** Außerhalb der Sturmzeit, oder bei einer Dürre, tanzt das Dorf am Dorfplatz und ruft den Regen. Die Tänzer
essen 6 vom Vorrat (Feldfrüchte, Fisch, Meeresfrüchte oder Wild). Alle kommen zum Platz und tanzen (8 Takte), dann
steht eine große graue Wolke über dem Dorf und es regnet 24 Takte lang: jeden Takt 1 Wasser, eine Dürre ist vorbei, und
Felder, Gärten und Bananen tragen ein Viertel schneller. Danach geht es erst nach einem Mond wieder. Geht das Wasser aus
(weniger als 4) und ein Tanz ist möglich, rät der Rat zum Regentanz. Belegt ist das so nicht für die Lapita-Zeit:
Zeremonien um Regen kennt man aus späteren Berichten von vielen Inseln, auch die Ereigniskarte „Dürre“ hat eine
Regenzeremonie mit Kava.

## Dächer, Sturm und Herdfeuer

Seit Version 67 müssen die Häuser in Schuss gehalten werden, Stürme kündigen sich an, und ab dem Familienhaus brennt ein
Herdfeuer.

**Wie die Häuser in Schuss bleiben.** Vorher gar nicht: Ein Dach war einfach da, nur ein Sturm machte es alt oder riss
ein Haus um. Jetzt nutzt sich jedes Dach ab. Ein Dach aus Palmwedeln hält einige Jahre (vier Spieljahre, 48
Minuten). Dann deckt die Familie es selbst neu: **2 Palmwedel**, ein Familienhaus oder höher dazu **1 Holz** für die
Pfosten. Seit Version 68 sieht man es: Jemand aus der Familie, die darunter wohnt, legt seine Arbeit kurz nieder, flicht
am Haus Wedel zu Matten und bindet sie Reihe um Reihe aufs Dach; nach ein paar Augenblicken geht er zurück an seinen
Platz. Höchstens zwei Dächer zugleich, das älteste zuerst. Ein Dach, das noch dicht ist, wartet, bis ein paar Wedel für
das Bauen übrig bleiben. Während ihr fort wart, geschieht es einfach. Fehlen Wedel zu lange, wird das Dach **undicht**, und später **kaputt**: Dann regnet es hinein,
die Familie hat kein Dach mehr (die Hauskachel wird rot, kein Ausbau), und es ist ein Platz weniger im Haus. Ein Tipp auf
die Dachkachel sagt, wie lange es noch hält und was es braucht; ist es undicht, führt er zu dem, was Wedel bringt (das Erntehaus).

**Der Sturm.** In der Sturmzeit sehen die Alten den Himmel gelb werden. Die Karte „Ein Wirbelsturm zieht auf“ lässt
wählen:

- **„Alle an die Dächer!“** In einer Minute ist er da. Je Haus läuft ein Mensch hin, die nächsten Häuser am Dorfzentrum
  zuerst, vier zugleich, und **bindet das Dach fest**: ein paar Augenblicke Arbeit (Wedel stopfen, Seile über das Dach
  werfen und anziehen) und **1 Schnur oder 2 Kokosfasern** je Dach. Die Leute werden dafür kurz von ihrer Arbeit
  ausgeliehen und gehen danach zurück.
- **„Abwarten“:** Die Dächer bleiben lose. Festbinden geht auch später noch: mit dem Rat unten („Festbinden ›“), mit der
  Zeile im Haus oder mit einem Tipp auf das zitternde Seil über einem losen Dach.

Bis er kommt, bleibt der Himmel dunkel, die Kanus bleiben an Land, und unten zählt der Rat herunter: „Sturm in 40 s! 3
von 5 Dächern fest.“ Fehlen Schnur und Fasern, sagt er es. Dann kommt der Sturm: **Festgebundene Dächer halten.** Lose
Dächer werden undicht und brauchen neue Wedel; jedes lose Haus kann einstürzen (höchstens zwei), und waren die meisten
Dächer lose, trifft es auch einen Arbeitsplatz. Bäume fallen, die Felder werden ausgewaschen, von kahlen Hängen rutscht
Erde. Ein **Talisman der Matriarchin** im Lager hält einmal alle Dächer. Was einstürzt, wird **mit der Hälfte seines Holzes
und seiner Wedel aus dem Lager** neu gebaut (seit Version 75; vorher gratis). Fehlt das, wartet die Baustelle: Auf ihrer
Tafel steht „wartet auf Holz und Wedel“ mit den Kacheln, und niemand baut, bis es im Lager ist.

**Herdfeuer und Holzwirtschaft.** Jedes bewohnte Haus will ein Feuer: das Bedürfnis **Feuer** (bis Version 76 erst ab
dem Familienhaus; seit Version 77 brennt es als **Nachtfeuer**, siehe unten). Es brennt mit **Brennstoff**: Kokosschalen (jede reife Nuss aus dem Erntehaus gibt eine) oder Holz (vom Holzfäller, auf Atollen
aus Treibholz und Palmholz). Erst brennen die Schalen, die ohnehin übrig sind, dann Brennholz, zuletzt Holz. So zieht
der Wald jetzt dreifach: Holz zum Bauen, Holz für die Dächer der Familienhäuser, Holz und Schalen für Herd, Erdofen und
Töpferei. Fehlt Brennstoff, ist die Kachel „Feuer“ rot, und das Familienhaus hat weniger Platz.

**Brennholz sammeln** (seit Version 68). Kinder ab drei Jahren und Alte ohne Hauswerk gehen an den Waldrand (auf
einem Atoll den Strand entlang), heben dürre Äste auf, brechen sie übers Knie und tragen ein Bündel heim. Das gibt die
neue Ware **Brennholz**, je Sammler etwa 0,12 pro Minute (auf Atollen etwas weniger). Seit Version 77 sammeln sie von
Anfang an, bis das Lager voll ist, denn jedes Haus brennt nachts ein Feuer. So bleibt das Bauholz des Holzfällers für
Häuser und Kanus. In der Übersicht unter „Arbeit“ steht, wie viele sammeln.

## Ansehen

Das Ansehen des Clans wächst mit Festen am Dorfzentrum (Kleines Fest: 10 Feldfrüchte, 4 Fisch und 2 Töpfe, +5;
Großes Fest: 4 Schweine, 12 Feldfrüchte, 4 Meeresfrüchte und 2 Tapa, +15), mit dem Fest der Plejaden, mit Gaben an andere Clans und mit einem
schönen Dorf. Es sinkt um etwa 1 pro Minute.

**Tatau.** Wer erwachsen geworden ist (jünger als 20 Jahre) und noch kein Muster trägt, bekommt es beim Tatau im
Versammlungshaus: 8 Feldfrüchte, 4 Gekochtes und 1 Obsidianklinge, Ansehen +3 und +2 für jeden jungen Menschen (höchstens
+12 dazu). Die Klinge erinnert an die Werkzeuge aus Obsidian, mit denen man an Lapita-Orten tätowierte. Danach tragen die
Figuren ein Zickzack und eine Reihe Punkte auf der Brust, wie die Bänder auf den Töpfen; wer sie antippt, liest „mit
Tatau“. Sind es drei oder mehr, sagen es die Ältesten. Das Muster bleibt beim Speichern.
Gebraucht wird es für jede weitere Siedlungsfahrt (8 mehr pro Siedlung nach den ersten beiden) und für ein Häuptlingsdorf.
Beim Fest versammelt sich das Dorf am Feuer vor dem Versammlungshaus, oder am Dorfplatz, solange es keines gibt.

## Fremde Clans

Weiter draußen leben schon Menschen: der Clan vom Feuerberg auf Vulkanen (macht Klingen und Schweine, schätzt Matten,
Schnur und Muschelschmuck), der Clan vom Riff auf Atollen (macht Muschelschmuck und Matten, schätzt Töpfe, Steinbeile
und Klingen) und der Clan vom Maulbeerhain auf hohen Inseln (macht Tapa, ab Hawaiki auch Kava, schätzt Matten,
Muschelschmuck und Klingen).
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
  rasselnde Muscheln, wenn ein Haus ausgebaut wird; ein knarrender Stamm und ein dumpfer Schlag, wenn ein Baum fällt; ein
  Platschen, wenn ein Kind ins Wasser springt oder ein Taucher abtaucht; abends die Schlitztrommel vom Dorfplatz, leiser
  als beim Fest; drei fallende Töne, wenn eine Familie fortfährt.
- Klang, Musik und Tag und Nacht lassen sich im Menü einzeln ausschalten; die Musik hat dazu eine eigene Lautstärke
  (leise, mittel, laut).

### Brandung statt Trommeln (seit Version 73)

Die Musik des Alltags ist jetzt **die Brandung**: Jede Welle zieht an (ein tiefes Rauschen, das ein paar Sekunden
anschwillt), bricht (ein kurzes helles Zischen) und läuft den Sand hinauf aus. Keine zwei Wellen sind gleich, sie kommen
alle 7 bis 12 Sekunden, in der Sturmzeit und vor einem Sturm schwerer und dichter. Darunter summt leise eine Stimme, ab und
zu fällt ein einzelner Holzton; nachts hört man nur das Meer. Trommeln, Rohre und Rasseln gibt es nur noch beim Fest und
beim Regentanz. Was unten über Tageszeit, Jahr und Tonart steht, gilt weiter, nur leiser und langsamer (36 bis 44
Schläge).

**Klang auf dem iPhone.** Ein iPhone lässt Klang nur in einer fertigen Berührung beginnen und hält ihn an, wenn ein Anruf
oder eine andere App dazwischenkommt. Bisher fragte das Spiel nur beim Aufsetzen des Fingers; darum lief die Musik oft
nicht. Jetzt fragt es bei jeder Berührung (auch beim Loslassen und beim Klick), bis der Klang läuft, und stellt ihn so, dass
der Stummschalter ihn nicht abstellt (wo das Gerät es erlaubt). Im Menü steht hinter „Klang“, ob er läuft.

### Der Soundtrack (seit Version 70)

Die Musik entsteht wie der Klang im Browser, ohne Tondateien (Datei `src/music.js`). Sie folgt dem Leben des Dorfes:

- **Instrumente:** eine hohle Holztrommel, Bambusrohre, die auf den Boden gestampft werden, Rasseln aus Samenkapseln,
  summende Stimmen, ein Holzspiel (wie eine Marimba). Erst nach der großen Fahrt, in Hawaiki, kommt die Nasenflöte dazu,
  ein langer, hauchiger Ton.
- **Der Tag:** morgens ruhig und langsam (58 Schläge), tagsüber ein Arbeitsrhythmus (74), abends langsam (54), nachts
  fast still (nur ein leiser Summton). Mit „Tag und Nacht“ aus bleibt es beim Tag.
- **Der Anlass:** beim Fest schnelle Trommeln (112) mit Rasseln auf jedem Schlag, beim Regentanz Stampfen (96), vor dem
  Sturm ein tiefes Dröhnen und langsame, schwere Trommelschläge, auf einer Fahrt ein weiter, offener Klang (eine Tonleiter
  mit gehobener Quarte) mit langen Tönen.
- **Das Jahr:** Die Tonart wechselt mit der Zeit: Plejaden und Passat in Dur (hell), Sturmzeit und magere Zeit in Moll
  (dunkler, in der mageren Zeit spärlicher). Fünf Töne wie bei den Pentatoniken, die man von den Inseln kennt.
- **Das Dorf:** Je größer es ist, desto mehr Stimmen summen den Akkord: eine bis vier.
- **Technik:** Die Töne eines Takts kommen aus einer reinen Funktion (`musicBar`), die der Test prüft, ohne dass man etwas
  hören muss: jeder Ton liegt im Bereich, die Nacht ist leiser als der Tag, das Fest lauter, die Flöte erst in Hawaiki. Dann
  stellt der Test die echten Klangknoten für viele Minuten ein. Der Pegel ist gemessen (im Mittel etwa −23 dB, die Spitzen fängt ein weicher Begrenzer;
  Nacht fast still). Töne und Akkorde liegen eher hoch, weil Handylautsprecher unter 200 Hz kaum etwas wiedergeben. Pause, wenn das Spiel nicht zu sehen ist.
- **Belegt?** Musik der Lapita-Zeit ist nicht überliefert. Die Instrumente (Trommeln, Bambusstampfer, Rasseln, Muschelhorn,
  Gesang) kennt man aus Melanesien und Polynesien, aus viel späteren Berichten; die Nasenflöte ist ein Instrument des
  späteren Polynesiens und darum erst in Hawaiki dabei.
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

## Mehr Leben in den Bewegungen (seit Version 76)

Der Stil bleibt: flache Farben, feine Tuschelinien, Figuren ohne Arme und Beine. Neu ist, wie sie sich bewegen.

- **Gehen:** Der Wickelrock wiegt bei jedem Schritt, der Oberkörper federt ein wenig nach und neigt sich nach vorn.
  Kinder hüpfen, Alte gehen kleiner und setzen den Stock mit dem Schritt. Lasten auf dem Kopf schaukeln gegen den
  Schritt, die Körbe an der Tragestange schwingen. Wer stehen bleibt, federt kurz nach; wer umkehrt, dreht sich in
  einem Augenblick um, statt umzuspringen.
- **Stehen:** Die Leute atmen, blinzeln alle paar Sekunden (jeder zu seiner Zeit) und schauen sich ab und zu um.
- **Arbeiten:** Jeder Schlag hat einen Takt: langsam ausholen, schnell zuschlagen, kurz halten, wieder aufrichten.
  Gerät und Körper gehen zusammen, beim Aufschlag staucht sich der Körper ein wenig. Dazu fliegen Erdklumpen und Staub
  beim Graben, drehende Späne beim Fällen, Locken beim Schnitzen, Splitter und ein Funkeln am Stein, Staubringe beim
  Stampfen und Tropfen beim Schöpfen. Etwa jeder achte Schlag ist eine Pause: Die Leute richten sich auf und strecken
  sich, damit sie nicht wie Maschinen wirken.
- **Dorf:** Bei Tagesanbruch, zum Morgenmahl, steigt aus jedem bewohnten Haus Herdrauch: weiche Wölkchen, die sich
  weiten und mit dem Wind treiben; tagsüber aus einigen. Schmetterlinge flattern über Blumen, Hibiskus und Gärten und
  setzen sich ab und zu. Vom Paddelblatt laufen Tropfen, wenn es aus dem Wasser kommt.
- **Sparsam:** Die feinen Bewegungen gibt es nur nah herangezoomt; ein langsames Gerät (Bildqualität 0) zeichnet die
  Figuren wie bisher, ein mittleres die nächsten 14, ein schnelles 28. Wer „weniger Bewegung“ eingestellt hat, sieht
  alles ruhig wie früher.

## Nachtfeuer, Zufriedenheit, Nachrichten (seit Version 77)

- **Nachtfeuer:** Wie beim Morgenmahl gibt es einen festen Augenblick. Bei Einbruch der Nacht brennt **jedes bewohnte Haus
  ein Feuer** und verbraucht dafür einen Brennstoff: erst Kokosschalen, dann Brennholz, zuletzt Holz. Häuser mit Feuer
  leuchten in der Nacht, Häuser ohne bleiben dunkel. Wer ohne Feuer schläft, **friert**: Er arbeitet am nächsten Tag
  langsamer (85 %), ist unzufrieden, und auf seiner Tafel steht „Letzte Nacht ohne Feuer: friert“. Die Muschel meldet
  „Nachtfeuer auf Panua: 2 Häuser bleiben ohne Feuer“. Reicht der Brennstoff bis zur Dämmerung nicht für alle Häuser
  (gerechnet wie beim Morgenmahl: Lager plus was bis dahin dazukommt), wird **Holz oben rot**, die Holzfäller und Sammler
  bekommen Vorrang, und der Rat sagt **„Brennholz für die Nacht“**. Kinder und Alte sammeln dafür von Anfang an Brennholz.
- **Zufriedenheit statt Arbeitslosen-Anzeige:** Wer keinen Platz hat, hilft ohnehin mit; ein Zähler für Freie sagt also
  wenig. Oben steht jetzt ein **Gesicht mit einer Zahl von 0 bis 100**: der Mittelwert aller Menschen der Insel. Jeder
  Mensch beginnt bei 72. Es zieht ab: ohne Essen oder ohne Wasser am Morgen (je −20), ohne Feuer in der Nacht (−12), ohne
  Dach (−25), ein kaputtes (−12) oder undichtes Dach (−5), was dem Haus fehlt (−7) oder knapp ist (−2), ein zu volles Haus
  (−8) und viel Arbeit (−15, bei Alten die Hälfte). Es hilft: viel Freizeit (+8), ein Fest (+10) und ein schönes Dorf
  (bis +8). Ein Tipp auf das Gesicht zeigt **die am wenigsten zufriedene Person** mit ihren Gründen als rote und grüne
  Kacheln, bis zu drei Knöpfe, was hilft („Mehr Wasser“, „Zum Haus“), den **Regler Arbeit und Freizeit** für alle und
  darunter die nächsten vier. Ein Band zeigt, wie viele zufrieden sind, wie viele es so geht und wie viele unzufrieden.
  Unter 35 arbeitet man etwas langsamer (90 %), ab 85 etwas schneller (105 %).
- **Nachrichten:** Die schwarzen Kästchen sind jetzt **Streifen aus hellem Rindenbaststoff** mit Tuschekante, einer farbigen
  Kante oben, einer gezackten unten und einem kleinen Bild: rot mit Warnzeichen für schlechte Nachrichten (fehlt, Hunger,
  Sturm, ohne Feuer), grün mit Stern für gute (Fest, Kind, Chronik), sonst die Muschel. Sie fliegen wie bisher in die
  Muschel und bleiben dort.
- **Tagesrand:** siehe „Eine Leiste, um die der Tag läuft“: hell und dunkel, Sonne und Mond, keine Uhrzeit.
- **Feinschliff (Version 78):** Die Nachrichten schließen sich, sobald eine Tafel, das Bauen oder die Flotte aufgeht.
  Im Lager steht bei jedem stillen Platz der Grund („keine Leute“, „Lager voll“ …). Über leeren Plätzen zeigt die Karte
  höchstens zwei Leute-Blasen je Insel statt einer über jedem. Wer einen Arbeitsplatz setzt, während niemand frei ist,
  liest das schon beim Setzen. „Ohne Einführung“ steht nur bei den ersten Aufgaben. Die Hilfe spricht von Kacheln statt
  Knoten und erklärt das Gesicht oben.

## Der Rat in der Not und Kanus zwischen den Dörfern (seit Version 79)

In jedem Dorf außer dem ersten hilft **der Rat in der Not** (seit Version 80; in Version 79 führte er das ganze Dorf, das
nahm zu viel aus der Hand). Einmal in der Minute schaut er nach: Reicht Wasser oder Essen nicht bis zum Morgen, baut er
das Erntehaus, ein zweites für grüne Nüsse oder einen Platz für Essen; schlafen Leute ohne Dach, eine Hütte; kommt ein
Sturm, bindet er die Dächer; fehlt Regen, ruft er ihn. Immer nur eine Baustelle, nie einen Platz, für den niemand frei ist.
**Alles andere baust du:** Wachsen, Ausbau, Hauswerk, Werkstätten. In der Übersicht unter „Netz“ steht „Rat in der Not“
oder „Ohne Rat“; ein Tipp schaltet ihn um, auch in der Mutterstadt.

**Kanus zwischen Mutter und Töchtern.** Jeden Morgen schickt ein Tochterdorf ein kleines Kanu zur Mutter mit dem, was es
übrig hat (bis 8 Stück; zuerst, was der Mutter fehlt, und die feinen Dinge der besonderen Böden; nie Wasser, nie Essen
oder Brennstoff, die es selbst braucht). Solange eine Tochter klein ist (unter 15 Menschen), hilft die Mutter ihr am
Morgen mit Holz, Wedeln, Wasser und Essen aus ihrem Überfluss (bis 16 Stück). Die Kanus fahren sichtbar; die Waren gehen
erst bei der Ankunft vom einen ins andere Lager. Dort steht auch, was das letzte Kanu brachte.

## Gaben der Inseln und das Netz der Dörfer (seit Version 82)

**Jede Insel hat eine Gabe** (außer der Heimat). Sie steht unter dem Namen auf der Karte, sobald die Insel entdeckt ist,
und am Kanu, das davor liegt. Die Gabe gilt **für alle Dörfer des Clans, solange dort ein eigenes Dorf lebt**; per
Handel kommt nur die Ware, nicht die Gabe.

| Gabe | Wo | Was sie dem Clan gibt |
| --- | --- | --- |
| Obsidian | Vulkaninseln | Kanubau und Schnitzen ein Viertel schneller |
| Feiner Pandanus | manche Koralleninseln | Segelmatten: alle eigenen Kanus ein Fünftel schneller |
| Kegelschnecken | Motu, manche Koralleninseln | Armringe als Brautgabe: Familien von weit her kommen öfter |
| Rote Erde | Talise, manche hohe Inseln | Kurkuma für die Tänzer: Feste ein Viertel mehr Ansehen |
| Feuchte Hänge | manche hohe Inseln | Taro wächst dort anderthalbmal so gut (und Kava ab Hawaiki) |
| Vogelfelsen (neu) | Inseln ohne andere Gabe | Navigatoren lernen anderthalbmal so schnell |
| Schildkrötenstrand (neu) | Inseln ohne andere Gabe | Auf langer Fahrt reicht der Proviant länger (jeden vierten Tag aus dem Meer) |

Alte Spielstände behalten ihre Inseln; nur Inseln, die bisher nichts hatten, bekommen einen Vogelfelsen oder einen
Schildkrötenstrand. Jede neue Gabe bringt einmal Ansehen 2. In der Übersicht unter „Netz“ stehen die **Gaben des Clans**:
welche er hat, welche bekannt sind (mit Insel) und welche noch fehlen. Der Rat schlägt vor: „Dorf auf Kula gründen“.

**Die Mutterstadt wächst nach oben.** Bringt ein Kanu einer Tochter etwas, das die Heimat selbst nicht machen kann, freuen
sich dort zwei Tage lang alle („Feines aus der Ferne“, Zufriedenheit +6). Jede Gabe des Clans macht alle etwas zufriedener
(+1, höchstens +5). Jedes Kanu zwischen den Dörfern bringt ein wenig Ansehen (+0,5).

**Druck von innen.** Ist die Heimat voll, wollen junge Paare fort: Die Erwachsenen sind unzufrieden („Insel voll: will
fort“, −4), und der Rat sagt „Junge Paare wollen fort“. Wer ein neues Dorf gründet, hat das in seiner Lebensgeschichte
(„gründet das Dorf … und wird ein Ahn des Dorfes“), und die Muschel meldet die Gründer. Schwindet der Wald der Heimat, bringen
die Kanus der Töchter Brennholz für das Nachtfeuer (sie schicken zuerst, was der Mutter fehlt).

## Schöner bewegt: Licht, Wasser, Übergänge (seit Version 81)

- **Licht über den Tag:** Ein weicher Farbverlauf ohne Stufen: pfirsichfarbener Morgen, klarer Tag, goldener Nachmittag,
  ein orange-rosa Abend mit leichtem Glühen, tiefblaue Nacht. Nachts funkeln Sterne über dem tiefen Wasser, ein Mondpfad
  flimmert auf dem Meer; am Tag blitzen Sonnenglitzer. Vor jedem Haus mit Nachtfeuer brennt ein kleines Feuer im
  Steinring, das flackert, atmet und ab und zu einen Funken steigen lässt; Fenster flackern mit. Häuser ohne Feuer bleiben
  dunkel. **Seit Version 86** brennt das Feuer der Nacht auf dem **Dorfplatz**, groß, mit Funken und Lichtschein; die Hütten
  haben ihr Feuer drinnen: Aus jeder zweiten steigt ein Rauchwölkchen, die Fenster leuchten.
- **Wasser und Natur:** Die Wellenreihen des Meeres steigen und vergehen nacheinander; am Riff rollt die Brandung stückweise
  heran, schäumt und vergeht; am Strand läuft Wasser hinauf, gleitet zurück und lässt eine nasse Linie. Kanus ziehen ein
  V-Kielwasser, das Paddel taucht mit Ring und Tropfen ein. Böen laufen über die Insel, die Kronen der Palmen folgen dem
  Stamm einen Augenblick später, Gras kräuselt sich. Vögel schlagen in Schüben mit den Flügeln und gleiten dazwischen,
  Fische in der Lagune flitzen und verharren.
- **Weiche Übergänge:** Blasen wachsen mit kleinem Überschwingen und vergehen sanft, ein neues Zeichen blendet über das
  alte. Bauplätze wachsen aus dem Boden, fertige und ausgebaute Häuser setzen sich mit Federn, Staub und Spänen. Leute
  gleiten aus dem Haus und hinein, setzen beim Gehen weich an und halten weich an. Kanus reffen vor dem Anlegen das Segel
  und setzen es nach dem Ablegen.
- **Noch feiner (Version 84):** Bei den Menschen schwingen Haarknoten, Blume, Muschelkette und die Fransen am Rocksaum
  nach. Bei der Arbeit ducken sie sich beim Ausholen, die Hüfte geht im Schlag mit, die Knie federn beim Aufprall. Lasten
  auf dem Kopf und an der Stange federn gegen den Schritt; schwere Lasten machen den Gang tiefer und langsamer. Wer
  plaudert, dreht sich zum Nachbarn, und ein kleiner Mund öffnet sich beim Reden und Singen; Hinsetzen, Aufstehen und
  Hinlegen sind weiche Bewegungen. Fischer zu Fuß tragen nachts eine flackernde Fackel. In der Welt füllen sich die
  Segel mit dem Wind oder schlagen, ein Wimpel weht, Kanus nicken mit der Dünung und ziehen am Anlegeplatz an der Leine.
  Hunde traben, sitzen und kratzen sich, Schweine wühlen, Hühner picken und hüpfen, Krabben huschen am Strand, in der
  Lagune taucht eine Schildkröte auf. Rauch kringelt sich aus dem Dachfirst und legt sich im Wind, Regen fällt schräg und
  macht Ringe auf dem Wasser, Regenwolken rollen, Wolkenschatten sind weich. Am Versammlungshaus flattern Fahnen, beim
  Fest hängt eine Wimpelkette, das Festfeuer flammt auf und sprüht Funken.
- **Sparsam:** Feines nur nah herangezoomt und bei guter Bildrate; das Spiel senkt die Bildqualität von selbst, wenn das
  Handy nicht nachkommt. Mit „weniger Bewegung“ bleibt alles ruhig, ohne „Tag und Nacht“ bleibt der flache Look.

## Ruhiger und verspielter (seit Version 85)

- **Nachrichten** (seit Version 87) sehen aus wie eine kleine Schwester der Tagesleiste: genau gleiche Oberkante und Höhe (seit Version 88), derselbe breite Ring mit Tuscherand, innen Creme, runde Ecken; Ring und rundes Abzeichen tragen die Farbe (gelb, rot Warnung, grün gut). Sie hängen an einer kurzen Schnur rechts an der Leiste, fahren nach rechts heraus und wieder hinein. Gezeigt wird nur der erste Satz in kleiner Schrift (höchstens drei Zeilen), der ganze Text steht in der Muschel. Solange eine Nachricht draußen ist, klappt die Leiste ihren Windtext ein, damit Platz ist. Es kommt
  immer nur eine; was währenddessen geschieht, wartet (höchstens zwei), alles Ältere steht nur in der Muschel. Eine
  Nachricht bleibt mindestens gut zwei Sekunden, lange etwas länger. Antworten auf ein Antippen erscheinen sofort.
- **Weniger auf einmal:** Ereignisse kommen alle 8 bis 12 Minuten statt alle 5 bis 8. Die Kanus der Tochterdörfer melden
  sich nur noch in der Muschel, nicht mehr als Nachricht.
- **Palmen schütteln:** Zweimal schnell auf eine Palme getippt, und sie wackelt: Heraus fällt per Zufall eine Kokosnuss,
  ein Palmwedel, eine Kokosschale oder Fasern, mit einem kleinen „+1“. Danach braucht die Palme anderthalb Minuten, und
  zwischen zwei Schütteln vergehen anderthalb Sekunden.
- **Hunde** sehen aus wie Hunde: Schlappohr, längere Schnauze, tiefer Schwanz; sitzend ruhen sie auf den Hinterbeinen,
  die Vorderbeine gerade vom Brustkorb, beim Kratzen geht eine Hinterpfote zum Ohr.
- **Der Dorfplatz bleibt frei:** Hunde, Schweine und Hühner laufen nicht mehr über den Festplatz.

## Menschen

Kleine Figuren ohne Arme und Beine: Tapa-Wickelrock, Muschelkette, Haarknoten, Hibiskusblüte oder langes Haar,
drei Hauttöne, Alte mit grauem Haar und Stock. Seit Version 75 auch bei der Arbeit ohne Arme: Beil, Grabstock, Speer,
Schale, Korb oder Muschel sitzen direkt am Oberkörper und schwingen von dort aus (die dünnen Strich-Arme sahen zu wenig
nach Armen aus; eine Zeichnung mit drei Arm-Varianten liegt für später bereit). Jeder Bewohner ist zu sehen und hat einen Namen. Wer Arbeit hat, trägt sie sichtbar
vom Feld, der Werkstatt oder dem Waldrand zum Speicher: Taro oder Brotfrucht im Korb auf dem Kopf, Töpfe,
Steine, Obsidian, Muscheln, Schnur, Tapa, Proviant, Holz, Fisch an der Stange, Matten. Die anderen schlendern zwischen den
Häusern, die Alten sitzen oft auf Matten. Bauleute tragen Holz zu den Baustellen und hämmern dort, Holzfäller schlagen am
Baum, Pflanzer tragen Setzlinge, Fischer fahren zu zweit hinaus und waten übers Riff.
Die Figuren haben zwei Augen. Auch in den Dörfern der Clans sind Menschen unterwegs.

**Lebensgeschichten** (seit Version 70). Auf der Tafel einer Person steht unter „Lebensgeschichte“, was in ihrem Leben
geschehen ist, mit dem Jahr: wann sie kam oder geboren wurde, wo sie zu arbeiten anfing, das Tatau, die Hochzeit, ein Kind,
das erste Navigatorwissen, ein überstandener Sturm (die letzten beiden), wann sie Häuptling wurde und wann sie alt wurde. Es
bleiben höchstens zwölf Zeilen, die erste (Ankunft oder Geburt) immer. So erkennt man Leute wieder, und die Tafel erzählt,
warum man an ihnen hängt. Die Geschichten stehen im Spielstand.

**Stärke des Dorfes** (seit Version 70). Am Dorfzentrum, im Reiter „Stärke“, wählt jedes Dorf eine Stärke: Töpfer (Töpferei, Beil, Klingen,
Kalk), Fischer (Fischerhütte, Tauchplatz, Haken), Pflanzer (Erntehaus und Felder), Weberinnen (Flechten, Seil, Weben,
Klopfen) oder Navigatoren (lernen anderthalbmal so schnell). Was zur Stärke gehört, arbeitet ein Viertel schneller. Wechseln
geht alle zwei Jahre (24 Minuten); jede Wahl bringt 1 Ansehen. Ab 12 Menschen rät der Rat dazu. Damit bekommt jedes Dorf
ein Gesicht, und die Dörfer haben einander etwas zu bieten.

**Handel auf einen Tipp.** Fehlt einem Haus für den nächsten Schritt eine Ware, die ein anderes Dorf von dir hat oder macht
(die Matten des Handwerkerhauses kommen von den Atollen), schlägt der Rat vor: „Handel: Matten aus Motu“. Ein Tipp richtet die
Kette ein: Das Kanu im Hafen fährt hin, holt die Ware und bringt dafür mit, was das Dorf im Überfluss hat und das andere
nicht (bis zu zwei Waren, je vier). Gab es noch keine Schnur zwischen den Dörfern, fährt das Kanu erst einmal hin, knüpft sie
und richtet die Kette am Ziel ein. Ohne Kanu im Hafen verweist der Rat auf das Kanuhaus.

## Was belegt ist und was später

Polinusa spielt in der Lapita-Zeit. Manches, was im Spiel zu sehen ist, ist für diese Zeit **durch Funde belegt**, anderes
kennt man **erst aus viel späteren Berichten** (Reisende und Völkerkundler des 18. bis 20. Jahrhunderts, mündliche
Überlieferung), und das Spiel nimmt an, dass die Vorfahren Ähnliches kannten.

| Im Spiel | Belegt für die Lapita-Zeit? |
| --- | --- |
| Töpfe mit Zahnstempel-Mustern, Obsidian, Muschelringe und -beile, Steinbeile | ja, durch Funde |
| Pfahlhäuser über der Lagune (Talepakemalai, Mussau) | ja, durch Funde |
| Schwein, Hund, Huhn, Taro, Brotfrucht, Kokos, Pandanus im Kanu mitgebracht | ja, durch Funde und Genetik |
| Yams | wahrscheinlich; das ozeanische Wort für Yams ist alt, Reste von Knollen sind selten erhalten |
| Zuerst vom Wilden leben: Schildkröten, Seevögel, Großfußhühner, die bald verschwinden | ja, durch Knochen in den frühesten Schichten |
| Wachszeiten der Pflanzen | aus der Botanik; im Spiel verkürzt |
| Delfine am Riff, Riffreiher am Strand, Geckos an den Hauspfosten, springende Fische, Schmetterlinge | Tiere, die auf den Inseln heimisch sind; dass man sie am Dorf sah, ist glaubhaft, im Einzelnen nicht belegt |
| Hund, Schwein, Huhn laufen im Dorf; Maße im Bild: Hund etwa Hüfte, Schwein etwas kleiner, Huhn Knie | belegt, dass die Siedler sie mitbrachten (siehe oben); die Größen im Bild sind Spiel |
| Die Pazifische Ratte (Kiore), nachts am Lager | belegt: Sie kam in den Kanus mit und fraß Eier und Saat. Dass man sie nachts am Speicher sieht, ist glaubhaft, im Einzelnen Spiel |
| Flughunde, die am Abend ausfliegen | belegt als heimisch (Flughunde gibt es seit Urzeiten auf den Inseln Westpolynesiens und Melanesiens); der Flug über dem Dorf ist Spiel |
| Meeresschildkröten, Delfine, Wale, fliegende Fische, Seevögel (Tölpel, Fregattvogel, Seeschwalbe), Landkrabben, Einsiedlerkrebs | belegt als heimisch und als Nahrung (Knochen von Schildkröten und Seevögeln in den frühesten Schichten); wo und wie oft man sie im Bild sieht, ist Spiel |
| Der Lichtwal | **frei erfunden**, nicht aus einer Überlieferung. Er ist Spiel, nur zum Staunen |
| Keine Katzen, Ziegen, Rinder, Pferde, Schafe | Sie kamen erst mit den Europäern. Im Spiel gibt es sie nicht (ein Test prüft, dass im Dorf nur Hund, Schwein und Huhn laufen) |
| Blumen an den Wegen, Blütenkränze an den Häusern | Blüten als Schmuck kennt man aus späteren Berichten (Tonga, Samoa); für die Lapita vermutet |
| Bänder aus Tapa an den Dächern | vermutet; Tapa ist aus Tonga und Samoa gut bekannt, für die frühen Lapita unsicher |
| Glühwürmchen zwischen den Blumen | nur Stimmung, eine Freiheit des Spiels; nicht belegt |
| Regenbogen nach dem Regen, Sternschnuppen | Natur, zu jeder Zeit zu sehen |
| Gäste im Kanu, die das Dorf ansehen | Besuche zwischen Inseln sind belegt (Obsidian reiste über 3000 km); dass man nur zum Ansehen kam, ist erfunden |
| Nachts mit Fackeln fischen | erst später belegt, aber weit verbreitet |
| Fischfang im Riff und in der Lagune, Muschelsammeln, kleiner werdende Muscheln | ja, durch Muschelhaufen |
| Angelhaken und Schleppköder aus Muschel und Perlmutt | ja, typische Funde an Lapita-Orten |
| Tatau mit Werkzeugen aus Obsidian | ja, Gebrauchsspuren an Obsidian von Lapita-Orten (Kononenko u. a. 2016); die Muster der Figuren sind erfunden |
| Pazifische Ratte (kiore) im Kanu, frisst Eier und Vorräte | ja, Knochen in den frühen Schichten; Speicher mit Rattenschutz kennt man aus späterer Zeit |
| Kanarinüsse (Canarium) als Nahrung und Vorrat | ja, Schalen an Lapita-Orten wie Talepakemalai |
| Westwinde der Sturmzeit nach Osten, mit Gefahr | erschlossen (Irwin 1992; Klimastudien zu El Niño) |
| Die lange Pause in Westpolynesien, Besiedlung Ostpolynesiens um 1000 bis 1250 n. Chr. | ja, durch Radiokarbondaten (Wilmshurst u. a. 2011); warum die Pause so lang war, ist umstritten (Kanus, Wind, Wissen) |
| Land finden an Vögeln, stehenden Wolken und der Dünung | aus der überlieferten Navigation (Lewis, Piailug); für Lapita erschlossen |
| Töpfern hört in Tonga und Samoa auf, Holzschalen statt Töpfe | ja, durch Funde: schlichte Ware, dann keine Töpfe mehr (vor etwa 2000 Jahren) |
| Auslegerkanus, Fahrten über offenes Meer | ja, erschlossen aus der Besiedlung; die Kanus selbst sind nicht erhalten |
| Grabstock, Kokosfaser, Sennit, Mattenflechten | wahrscheinlich; Werkzeuge und Fasern selten erhalten |
| Muschelhorn (pū) zum Rufen | Tritonshörner sind im Pazifik alt; für Lapita selbst nicht sicher |
| Surfen auf Brettern | erst später belegt (Hawaiʻi, Tahiti, Berichte ab 1777) |
| Drachen aus Blättern, Fadenspiele, Jonglieren (hiko) | erst später belegt (Melanesien und Polynesien, 19. und 20. Jh.) |
| Geknotete Ahnenschnüre (taʻo mata) als Vorbild der Knotenschnur | erst später belegt (Marquesas, in Museen) |
| Schlitztrommel (lali, pātē), Tapa | erst später belegt; Tapa-Schlegel aus Stein sind älter, aber nicht lapitazeitlich sicher |
| Kava, feine Matten, bemalte Tapa, Duftöl, Häuptlingshaus | erst aus dem späteren Polynesien bekannt; im Spiel darum erst ab **Hawaiki**, nach der großen Fahrt |
| Wörter wie rāhui, tufunga, taravana, fale | spätere polynesische Wörter, im Spiel als Namen genutzt |
| Musik: Holztrommel, Bambusstampfer, Rasseln, Gesang, Muschelhorn | aus späteren Berichten (Melanesien, Polynesien); Lapita-Musik ist nicht überliefert |
| Nasenflöte | spätes Polynesien, im Spiel erst in Hawaiki |
| Dörfer mit besonderer Stärke (Töpfer, Fischer, Weberinnen) | Lapita-Orte tauschten Töpfe, Obsidian und Muscheln über weite Strecken; die Spezialisierung einzelner Dörfer ist erschlossen, die Boni sind Spielregeln |
| Palmdächer halten einige Jahre und werden neu gedeckt | aus späteren Berichten (Buck); die Dächer selbst sind nicht erhalten; im Spiel vier Jahre |
| Vor einem Wirbelsturm die Dächer festbinden | aus späteren Berichten und dem Wissen der Inseln heute; für die Lapita-Zeit angenommen |
| Kinder und Alte sammeln Brennholz | aus späteren Berichten weit verbreitet; für die Lapita-Zeit angenommen |
| Ein Mahl am Morgen, eine Portion für jeden | **Spielregel.** Aus späteren Berichten kennt man meist ein bis zwei Mahlzeiten am Tag, die Hauptmahlzeit aus dem Erdofen oft am Nachmittag oder Abend; Reste am Morgen. Das Spiel legt das Essen auf den Morgen, damit man sieht, ob es für alle reicht |
| Ins Atoll nur mit Kanusteg und Einbaum | erschlossen: Riffpässe sind flach und schmal, Einbäume fahren in der Lagune; als Regel für die Zeit angenommen |
| Herdfeuer und Erdöfen mit Holz und Kokosschalen | Feuerstellen und Erdöfen sind an Lapita-Orten gefunden; Kokosschalen als Brennstoff kennt man aus späterer Zeit |
| Jedes Haus brennt nachts ein Feuer | Feuerstellen in und bei den Häusern sind gefunden. Dass in jedem Haus nachts eines brennt (Wärme, Rauch gegen Mücken), kennt man aus späteren Berichten; die eine Portion Brennstoff je Haus und Nacht ist eine **Spielregel** |
| Zufriedenheit als Zahl | **Spielregel**, keine Aussage über die Menschen damals |
| Obsidian aus wenigen Fundorten weit gehandelt; Obsidian-Werkzeuge für das Tatau | ja, durch Funde (Talasea-Obsidian bis Fidschi; Gebrauchsspuren an Lapita-Abschlägen) |
| Schildkröten und Seevögel als Essen | ja, durch Knochenfunde an Lapita-Orten |
| Segel aus Pandanusmatten | aus späteren Berichten; für Lapita angenommen |
| Lange Fahrten über offenes Meer, von den Bismarck-Inseln bis Fidschi, Tonga und Samoa; Obsidian und Töpfe als Tauschgut | ja, durch Funde (Obsidian aus Talasea auf Fidschi und weiter, Lapita-Orte auf fernen Inseln) |
| Ein eigener Rang von Seefahrern und Navigatoren (Seefahrerhaus, Navigatorenhaus) | **vermutet.** Erschlossen aus den späteren Navigatoren Mikronesiens und Polynesiens, etwa den palu der Karolinen. Ob die Lapita einen eigenen Stand hatten, ist nicht belegt |
| „Wissende“ als Hüter von Sternenpfaden und Ahnenreihen (Haus der Wissenden) | **vermutet, von später angelehnt.** Es gab keine Schrift; Fahrtenwissen und Ahnenreihen gab man mündlich weiter, so kennt man es aus späterer Zeit. Das Wort „Wissende“ ist eine Wahl des Spiels, kein überliefertes Wort. Dass sie das Wissen eines gestorbenen Navigators bewahren und etwas Ansehen bringen, ist eine **Spielregel** |
| Neue Dörfer gründen jüngere Linien, die Gründer werden Ahnen | vermutet (aus späteren Überlieferungen erschlossen) |
| Die Gaben und ihre Zahlen | **Spielregeln** |
| Gärten in Neuguinea, Bananen, Taro, Zuckerrohr von dort | ja (Kuk-Sumpf, Bergland von Neuguinea, Tausende Jahre vor Lapita) |
| Lapita-Leute vermischten sich mit den Menschen, die schon da waren | ja, durch alte DNA (Vorfahren aus Neuguinea und dem Bismarck-Archipel in späteren Generationen) |
| Gartenwissen und Wetterzeichen als Lehre anderer Völker | Spielregel, angelehnt an das Obige |
| Der Lichtwal | **erfunden**, keine Überlieferung |
| Kauri-Harz im Treibgut, Talisman der Matriarchin | Kauri-Bäume (Agathis) wachsen in Melanesien und Fidschi, ihr Harz gab es also in der Region; in Fidschi überzog man Töpfe später mit dem Harz des Dakua-Baums. Dass es am Strand antreibt und ein Talisman gegen den Sturm daraus wird, ist **erfunden**, eine Spielidee. Bernstein (Version 67) war ganz erfunden: Aus Lapita-Fundstellen ist keiner bekannt. Dass Familien nach den Frauen benannt sind, folgt der Vermutung, dass Lapita-Haushalte bei der Familie der Frau lebten |

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
- Kirch, P. V. (2017), On the Road of the Winds: An Archaeological History of the Pacific Islands, 2. Auflage.
- Finney, B. und Houston, J. D. (1996), Surfing: A History of the Ancient Hawaiian Sport.
- Handy, E. S. C. (1923), The Native Culture in the Marquesas (Ahnen, Überlieferung).

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

## Übersichtlicher (Version 89)

- **Eine Leiste oben.** Der Streifen mit allen Waren ist weg. Die Tagesleiste trägt alles: oben Wind, Muschel und Menü, darunter
  die Insel mit Menschen und Zufriedenheit, ganz unten nur, was die Leute **jeden Tag** brauchen: Essen, Wasser, Brennstoff
  und, sobald es ein Familienhaus gibt, Gekochtes. Rot heißt: reicht morgen früh (oder heute Nacht) nicht. Tippen zeigt alle Waren.
  Neben jeder Zahl steht in Klammern, wie viel ein Tag braucht: „147 (16)“ heißt 147 im Lager, 16 am Tag (Essen und Wasser:
  eine Portion je Esser am Morgen; Brennstoff: ein Feuer je Haus in der Nacht; Gekochtes: was die Familienhäuser am Tag essen).
  Unter Ansehen, Zufriedenheit und Menschen steht jetzt ihr Name. Das Bild neben der Zahl 1 ist nicht ein Kanu, sondern das
  Ansehen (Mana). Ein Kanu-Bild ganz rechts heißt „Kanu kommt“: Eine Familie ist unterwegs zu einer leeren Hütte. Was die roten
  Zahlen schon sagen, sagt der Hinweis rechts nicht noch einmal.
- **Dämmerung am Rand:** Kurze orange Streifen zeigen, wo die Nacht in den Tag übergeht (oben) und der Tag in die Nacht. Dort
  wird die Sonne zum Mond und wieder zur Sonne.
- **Bauholz heißt jetzt Bauholz** (vorher „Holz“), damit es nicht mit Brennholz verwechselt wird.
- **Die Leiste sieht aus wie die Bauleiste:** Rindenbaststoff mit Punkten. Zwischen den Reihen liegen Bänder wie auf Lapita-Töpfen:
  eine Reihe kleiner Zahnstempel oben und unten, dazwischen ein gestempelter Zickzack mit roten Punkten in den Spitzen. Auch der
  Rand mit Tag und Nacht ist fein punktiert, wie mit einem Zahnstempel gedrückt.
- **Nachrichten** klappen unter der Leiste nach unten aus, hängen an einer Schnur an der Muschel und fliegen danach klein in
  die Muschel zurück; sie nickt. Jahreszeiten ohne Gefahr, die Palolo-Nacht, der Regen und „Nur noch ein Mond“ gehen still in die
  Muschel. Nur Sturmzeit und magere Zeit springen auf. In 30 Minuten Spiel kommen so etwa 19 statt 32 Meldungen. Größere
  Ereignisse kommen alle 12 bis 18 statt 8 bis 12 Minuten.
- **Sonne und Mond gleiten** gleichmäßig um den Rand der Leiste, jedes Bild neu. Vorher sprangen sie zweimal pro Sekunde und
  krochen in der Mitte der langen Seiten, an den Ecken rasten sie.
- **Das Feuer am Dorfplatz** brennt ruhig: Es atmet langsam, die Flammen wanken sacht, wenige Funken.
- **Holz und Brennholz** sind zwei Waren. Holz kommt vom Holzfäller und ist zum Bauen. Brennholz sammeln Kinder und Alte.
  Brennstoff ist alles, was im Herd brennt: zuerst Kokosschalen, dann Brennholz, erst zuletzt Bauholz.
- **Arbeitsplatz-Blatt** (Tippen auf z. B. den Erdofen): oben nur Name und eine Zeile mit dem Zustand (rot „Fehlt: Blätter“, grün „Arbeitet“) und „Vorrang“. Darunter „Braucht → Macht“ als kleine Kacheln, die immer in die Breite passen: sie werden schmaler, und „Macht“ rutscht erst darunter, wenn es gar nicht anders geht. Ein Werkzeug wie die Kochsteine ist nur noch ein kleines Abzeichen („wäre schneller“) in der Zeile „Braucht“. Die Leute stehen mit − und + in einer einzigen Zeile. Das Blatt scrollt auf dem Handy nicht (getestet bei 390×844).
- **Unter „Mehr dazu“** liegen jetzt: die langen Sätze („2 feste Plätze …“, „Es fehlt …“), „Bleiben“, „Versetzen“, „Entfernen“ und „Fällen“. Die Rückfrage zum Entfernen klappt „Mehr dazu“ von selbst auf. Das Haus-Blatt bleibt, wie es war.
- **Bau-Menü** in Gruppen: Wohnen, Essen (mit Wasser), Rohstoffe, Handwerk, Meer, Schmuck. Es werden nur Gruppen mit etwas Baubarem gezeigt. Jede Kachel ist eine Zeile: Bild, Name, Kosten (fehlendes Material in Ocker). Was noch nicht freigeschaltet ist, bleibt versteckt; was nur ein Lebewesen im Kanu braucht, ist grau mit „Bring Taro mit“. Der Ablauf bleibt: Gebäude wählen, dann Land antippen.

## Zwei Wege: Handwerker und Seefahrer (Version 89)

Der Ausbau der Häuser war „nicht logisch genug“. Jetzt führt er vom Familienhaus aus auf **zwei Wege**. Jeder Schritt
kostet genau das, was man am Haus sieht: Pfosten sind Holz, das Dach sind Palmwedel, die Bindung ist Schnur oder
Fasern, der Boden sind Matten.

Hütte → Familienhaus → entweder **Handwerkerhaus** oder **Seefahrerhaus** → Navigatorenhaus → Haus der Wissenden.
Das Häuptlingshaus bleibt, wie es war.

- **Handwerkerhaus** (früher Meisterhaus; ein altes Haus der dritten Stufe ist jetzt eins). Regel in einer Zeile: *Die
  Familie muss ein Hauswerk haben.* Dazu Töpfe, Matten und Kokosöl im Lager; es kostet 2 Holz und 2 Matten. Das Hauswerk
  arbeitet dort ein Viertel schneller. Die Tafel zeigt die Kachel „Werk“; tippt man darauf, wählt man das Hauswerk.
  Verliert das Haus Töpfe, Matten oder Öl eine halbe Minute lang, ist es wieder ein Familienhaus. Ein Haus, das sein
  Hauswerk später abgibt, bleibt Handwerkerhaus; der Rat erinnert dann an das Werk.
- **Seefahrerhaus** gibt es nur für ein Haus **nah am Strand** (dieselbe Prüfung wie bei Gebäuden, die an den Strand
  gehören). Die Familie will zusätzlich Fisch (Fisch oder Meeresfrüchte), Proviant und Schnur im Lager. Kosten: 3 Holz,
  2 Palmwedel, 2 Schnur; Platz für 7. Die Erwachsenen dieser Familien sind die Kanumannschaften des Dorfes: **Kanus
  dieser Insel fahren je Erwachsenem 3 % schneller (höchstens 12 %) und geraten seltener in Böen** (Chance ein Viertel
  kleiner). Das Kanublatt sagt es. Ein Haus mit Paddel an der Wand und einem Netz zum Trocknen zeigt es auf der Karte.
- **Navigatorenhaus:** ein Seefahrerhaus, in dessen Familie jemand Navigator ist (Stufe 1 oder mehr). Will zusätzlich
  Matten für die Segel; Kosten 2 Holz, 2 Palmwedel, 2 Matten; Platz für 8. Navigatoren dieser Familie **lernen
  anderthalbmal so schnell**, und im Haus der Navigatoren lernt zuerst, wer in einem solchen Haus wohnt. An der Tür liegt
  ein kleiner Ring aus Steinen, der Sternenkompass.
- **Haus der Wissenden:** ein Navigatorenhaus, in dem jemand mindestens Stufe 2 kennt (die Wolkenzeichen). Will zusätzlich
  Tapa für die Gewänder; Kosten 2 Holz, 3 Palmwedel, 2 Schnur; **höchstens eins je Insel.** Weil es keine Schrift gab,
  bewahren die Wissenden Sternenpfade und Ahnenreihen im Gedächtnis: **Stirbt ein Navigator ohne Schüler, geht sein Wissen
  nicht verloren**, solange das Haus steht. Dazu bringt das Haus etwas Ansehen (1 alle halbe Minute). Eine geknotete
  Schnur hängt an der Tür.
- **Zurückfallen:** Fehlt einem Seefahrerhaus ein Gut seiner Stufe eine halbe Minute lang, fällt es eine Stufe zurück
  (Wissende zu Navigatoren, Navigatoren zu Seefahrern, Seefahrer zum Familienhaus). Das Wissen, das die Wissenden
  bewahrt haben, gilt nur, solange das Haus der Wissenden steht.
- **Wahl im Spiel:** Auf der Tafel eines Familienhauses stehen am Strand zwei Knöpfe, „Handwerkerhaus“ und
  „Seefahrerhaus“, mit ihren Kacheln darunter; weiter im Land steht nur: „Seefahrerhaus: nur nah am Strand.“ Jede Kachel
  hat ein Wort, wofür sie gut ist (Fisch: Kost der Fahrer, Matten: für die Segel …). Auf dem Handy scrollt die Tafel
  nicht (der Handytest prüft Handwerker, Seefahrer, Navigatoren und Wissende in drei Größen).
- **Von selbst ausbauen:** Ein Haus wird Handwerkerhaus. Ist es am Strand und hat die Insel weniger Seefahrerhäuser als
  Kanus, wählt es den Seeweg. Die weiteren Stufen des Seewegs folgen dann von selbst.
- **Alte Spielstände:** Ein Haus mit Stufe 3 ist ein Handwerkerhaus. Der Seeweg steht im Haus als `way` (Stufe bleibt 2),
  das gerettete Wissen als Zahl auf der Insel. Beides wird mitgespeichert.
- **Was belegt ist und was vermutet:** Lange Fahrten und Obsidian-Tausch sind für die Lapita belegt. Ein eigener Rang von
  Seefahrern und Navigatoren und die Wissenden sind **vermutet** und von späteren Völkern angelehnt (siehe die Tabelle
  oben, „Was belegt ist und was später“).

## Zufriedenheit neu (Version 90)

- **Was Menschen zufrieden macht:** volle Vorräte (Essen, Wasser und Brennstoff für drei Tage: +5), Zeit für sich (nichts fehlt
  und weniger als 60 % der Erwachsenen haben einen festen Platz: +4), Essen aus drei oder mehr Sorten (+4).
- **Was sie unzufrieden macht:** viele Bauaufträge (mehr als 1 offene Baustelle auf 4 Erwachsene: −4, mehr als 1 auf 2: −8; die
  Bauleute und ihre Familien spüren es), immer dasselbe Essen (nur eine Sorte: −3). Dazu kommt, wie bisher, was fehlt.
- **Eine Sorte zählt**, wenn mindestens eine Portion auf vier Menschen im Lager liegt. Gekochtes („Speisen“) zählt nicht als Sorte.
  Darum lohnt es sich, Fisch, Feldfrüchte, Kokos und Wild nebeneinander zu haben.
- **Arbeit und Freizeit für jeden:** Auf dem Blatt eines Menschen gibt es einen eigenen Regler (Viel Freizeit, Ausgewogen,
  Dringend Arbeit) und „wie alle“. Die eigene Einstellung ändert für diesen Menschen die Freizeit, die Arbeitsgeschwindigkeit
  (ein Arbeitsplatz nimmt den Mittelwert seiner Leute) und die Zufriedenheit. Kinder und Hilfsruhe im Dorf folgen weiter dem
  Dorfregler. Der Dorfregler setzt die Grundeinstellung; darunter steht, wie viele Menschen eine eigene haben. „Alle wie das
  Dorf“ löscht die eigenen. Gespeichert wird sie nur, wenn sie gesetzt ist.
- **Lager:** Alle Essenssorten sind eine Kachel „Essen“ mit der Summe und kleinen Bildern der Sorten im Lager. Antippen zeigt jede
  Sorte einzeln. Darunter steht: „Drei Sorten Essen machen zufrieden.“

## Spielstände sind sicher (Version 91)

- **Keine Version überschreibt einen Spielstand.** Gespeichert wird im Browser unter demselben Namen wie bisher; eine neue
  Version liest die alten Spielstände weiter. Geprüft: Spielstände der Versionen 77, 82, 86 und 88 laden und laufen weiter.
- **Kopie vor dem Update:** Startet eine neue Version zum ersten Mal, legt sie von jedem Spielstand eine Kopie beiseite. Im
  Menü unter „Aufbewahrt“ lässt sie sich laden, falls mit der neuen Version etwas schiefgeht.
- **Unlesbar heißt nicht verloren:** Lässt sich ein Spielstand nicht laden (auch keine der drei Sicherungen), wird er
  aufbewahrt statt überschrieben. Das neue Spiel kommt in einen leeren Platz, und eine Nachricht sagt, wo der alte liegt.
- Wer ganz sicher gehen will: Menü, „Als Datei“, „Sichern“.
- **Im Lager steht oben „Jeden Tag“:** je Tagesware eine Zeile, wofür sie gebraucht wird und wie viel. Beim Feuer steht dabei,
  was zuerst brennt: Kokosschalen, dann Brennholz, zuletzt Bauholz.

## Zwei Stränge, der Rest später (Version 92)

- **Der Hausbau hat jetzt zwei Stränge und endet dort:** Hütte, Familienhaus, dann **Handwerkerhaus** oder (am Strand)
  **Seefahrerhaus**. Navigatorenhaus und Haus der Wissenden sind wieder herausgenommen; sie kommen später (siehe IDEEN.md).
  Ein Spielstand mit so einem Haus lädt es als Seefahrerhaus.
- **Eine Linie:** In der Leiste stehen der Inselname und die Zahlen von Ansehen, Zufriedenheit und Menschen genau auf einer
  Höhe, die kleinen Namen darunter auch. Bei den Tageswaren stehen Zahl und Tagesbedarf auf einer Grundlinie.

## Bilder statt Wörter (Version 93)

- **Nur noch Bilder:** Unter den Waren in der Leiste, unter Ansehen, Zufriedenheit und Menschen, auf den Kacheln im Haus, am
  Arbeitsplatz, im Lager und im Baumenü stehen keine Namen mehr, nur Bild und Zahl.
- **Der Name kommt auf Druck:** Eine kleine Blase zeigt Name und einen Satz dazu.
  - Wo ein Tippen sonst nichts tut (eine Ware in der Leiste, ein Bild ohne Knopf), reicht ein Tippen. Noch ein Tippen schließt sie.
  - Auf Knöpfen, die etwas tun (eine Kachel, die ins Lager führt, ein Gebäude im Baumenü), einen Moment gedrückt halten. Dann
    passiert der Knopf nicht, nur die Blase kommt.
  - Bei einer Ware in der Leiste steht in der Blase auch „Alle Waren ›“.

## Lager mit Reitern, weniger Erklärtext (Version 94)

- **Das Lager hat vier Reiter:** Täglich (Essen, Wasser, Gekochtes, Brennstoff), **Brennmaterial**, Bauen und Handwerk.
  Jeder Reiter passt ohne Scrollen auf den Schirm.
- **Brennmaterial:** Kokosschalen, Brennholz und Bauholz mit den Nummern 1, 2, 3: in dieser Reihenfolge brennen sie. Darunter
  eine Zeile, wie viele Feuer heute Nacht brennen. Die Brennstoff-Kachel unter „Täglich“ führt dorthin.
- **Erklärungen nur noch in der Blase:** Der Block „Jeden Tag“ im Lager und die Zeile unter den Ausbau-Kacheln im Haus sind
  weg. Derselbe Satz steht in der Blase (Kachel halten). So bleibt das Blatt kurz.
- Die Blase bricht lange Wörter um, damit kein Text über ihren Rand läuft.


## Das Volk braucht dich (Version 95)

- **Die Ältesten bauen nichts mehr allein.** In einem Tochterdorf fragen sie dich in der Not: Erntehaus, ein Platz für Essen,
  eine Hütte, Dächer festbinden, Regentanz. Die Bitte steht als gelbe Blase über dem Dorf (Tippen öffnet die Übersicht)
  und als eine Zeile ganz oben in der Übersicht, mit „Ja, bauen“ und „Nein“.
  - **Ja:** Sie tun genau das, was sie früher von selbst taten. Es wird aus dem Lager dieses Dorfes bezahlt.
  - **Nein:** Einen Tag lang fragen sie nicht noch einmal.
  - Ist der Grund weg (Wasser da, Sturm vorbei), ist auch die Bitte weg. Nur ein Satz im Muschelhorn, kein Aufpoppen.
  - Die Pakete am Morgen und die Hilfe der Mutter bleiben, wie sie waren. Im Spielstand steht die Bitte nur, wenn es eine gibt.
- **Wünsche der Familien** (Mutterdorf und eigene Dörfer): Alle sechs bis zehn Minuten wünscht sich eine Familie etwas, wenn
  gerade kein Wunsch offen ist: ein Blumenbeet, Hibiskus, eine Fackel, eine Trommel, einen Tanzplatz, einen Ahnenpfosten,
  ein Fest oder mehr Freizeit.
  - Eine rosa Blase mit dem Bild steht neben dem Dach. In ihrem Haus steht eine Zeile mit dem Knopf „Bauen“ (oder „Feiern“,
    „Ja, Freizeit“). Beim Dorfzentrum steht die Zeile oben im Reiter „Dorf“.
  - **Erfüllt** in zwei Tagen: Die Familie ist drei Tage lang um 6 zufriedener („Wunsch erfüllt“), und einer von ihnen hat es
    in seiner Lebensgeschichte.
  - **Nicht erfüllt:** Der Wunsch verblasst. Keine Strafe, kein Stress. Stellschrauben `WISH` in `kin.js`, `SAT.wish`.
  - „Mehr Freizeit“ stellt den Regler des Dorfes auf „Viel Freizeit“. Zurück stellst du ihn selbst.
- **Was sonst von selbst geschieht (geprüft):** Im Mutterdorf baut nichts neue Häuser oder Plätze allein. Häuser steigen nur mit
  „Von selbst ausbauen“ (`I.autoUp`, am Anfang aus). Der Rat im Mutterdorf ist aus. Es bleiben nur kleine Dinge, die nichts
  Neues hinstellen: Die Quelle erscheint, wo ein Bach fließt (`ensureSpring`). Eine gefällte Palme wächst nach. Ein Haus, das
  der Sturm zerstört hat, wird neu gebaut, sobald das Holz da ist (`payRebuilds`). Die Familien flicken ihre Dächer.
- Die Reise mit dem Kanu zu einer bekannten Insel als Wunsch ist noch nicht gebaut (siehe IDEEN.md).

## Schönheit wird erspielt, neue Hingucker (Version 95)

- **Fünf Stufen der Schönheit:** Schlicht, Gepflegt, Geschmückt, Prächtig, Berühmt. Gezählt wird wie bisher (Blumen, Hibiskus,
  Fackeln, Pfosten, Trommel, Tanzplatz, Wege, Töpfermuster), aber je Mensch: Je größer das Dorf, desto mehr Schmuck braucht
  es. Vier Menschen zählen mindestens. Die Zufriedenheit durch Schönheit bleibt wie sie war (höchstens +8).
- **Jede neue Stufe wird einmal gefeiert:** Blütenblätter wirbeln über dem Platz, ein Hinweis sagt, was neu ist. Fällt die
  Schönheit wieder, gehen die Belohnungen, aber die Stufe wird nicht noch einmal gefeiert.
- **Was man davon sieht, solange die Stufe hält:**
  - *Gepflegt:* Blumen blühen an den Wegen und vor den Häusern, zwei Schmetterlinge mehr. **Ahnenpfosten** gibt es erst jetzt.
  - *Geschmückt:* Kränze und Tapa-Bänder an den Häusern, die Kinder hüpfen und spielen öfter auf dem Platz. **Tanzplatz** gibt es erst jetzt.
  - *Prächtig:* mehr Schmetterlinge am Tag, nachts Glühwürmchen zwischen den Blumen.
  - *Berühmt:* Gäste liegen im Kanu vor dem Riff und schauen.
- **Die Stufe steht in der Übersicht,** Reiter „Insel“, ganz oben: eine Zeile mit kleinem Balken und dem Weg zur nächsten Stufe.
  Gespeichert wird je Dorf die höchste Stufe, die es erreicht hat (Spielstand-Feld `bm`); alte Spielstände feiern nichts nach.
- **Neue Hingucker,** selten und ruhig, nur nah herangezoomt, bei guter Bildrate und nicht bei „weniger Bewegung“:
  Delfine springen vor dem Riff; ein Fischschwarm blitzt aus der Lagune; ein **Riffreiher** steht am Strand, tritt, stößt zu und
  schluckt; ein **Gecko** sitzt am Dach eines Hauses und huscht; nach dem **Regentanz** steht ein Regenbogen über der Insel;
  nachts fällt ab und zu eine Sternschnuppe. Tippt man auf einen Hingucker, steht ein Satz dazu im Hinweis.
- **Technik:** neue Dateien `src/beauty.js` (Stufen, Feier, Zeile in der Übersicht) und `src/hingucker.js` (alles Gezeichnete).
  Gezeichnet wird nur, was im Bild ist; bei „weit“ nichts; mit wenig Bildrate (Stufe 0) nur Blumen und Kränze, still.
  Tests: `tests/rules.test.js` (Stufen, Belohnungen, einmal feiern, Freischaltung, Speichern, alle Hingucker in jedem Abstand
  ohne Fehler); der Handy-Test hat jetzt ein schönes Dorf.

## Das Maskottchen: ein Einsiedlerkrebs (Version 96)

- Ein kleiner **Einsiedlerkrebs** in einer Muschel mit Lapita-Muster spielt etwa alle ein bis zwei Minuten mit der Tagesleiste.
  Drei kleine Stücke wechseln sich ab: Er kommt unter der Leiste hervor, winkt, krabbelt unten entlang, klettert auf die Leiste,
  schaut sich um und verschwindet wieder dahinter. Oder er kommt oben hinter der Leiste hervor, krabbelt über sie hinunter,
  winkt am unteren Rand und hüpft auf die Karte. Oder nur seine Muschel liegt da, er schaut heraus und zieht sich zurück.
- Antippen lässt ihn hüpfen, und eine Blase sagt, wer er ist. Auf See (vor der Landung) und im Menü zeigt er sich nicht. Wer
  weniger Bewegung eingestellt hat, sieht ihn still.
- Einsiedlerkrebse leben an den Stränden aller Inseln Ozeaniens (belegt). Die Muschel mit Lapita-Muster ist Spiel.

## Feinschliff (Version 96)

- **Kleinere Geckos**, und nur an jedem siebten Haus. **Weniger Blumen:** an jedem zweiten Haus eine, an den Wegen nur ein paar.
- **Das Baumenü zeigt wieder die Namen** unter den Bildern.
- **Kacheln erklären sich beim Antippen:** Ein Tippen auf eine Kachel (im Haus, am Arbeitsplatz, im Lager, beim Ausbau) zeigt
  sofort die Blase mit Name und Satz. Was die Kachel vorher tat (ins Lager, Erntehaus bauen, Dach flicken …), ist jetzt ein
  Knopf in der Blase.
- **Das Lager hat fünf Reiter nach dem, wofür etwas da ist:** Täglich (Essen, Wasser, Gekochtes, Brennstoff, Blätter,
  Kochsteine), Feuer (Kokosschalen, Brennholz, Bauholz in der Reihenfolge, in der sie brennen), Bauen (Bauholz, Wedel, Fasern,
  Schnur, Harz, Kalk), Hausrat (Töpfe, Matten, Öl, Tapa, Werkzeug, Tiere) und Meer (Proviant, Muscheln, Haken, Schätze).

## Die Tiere geprüft (Version 97)

**Was ich geprüft habe.** Alle Tiere im Spiel, eins nach dem anderen, in einem Bild mit einem Menschen daneben: Hund, Schwein,
Huhn, Landkrabbe, Seevögel (Tölpel, Fregattvogel, Seeschwalbe), Wal und Lichtwal, Delfine, Schildkröte, fliegende Fische,
Lagunenleben, Schmetterlinge, Glühwürmchen, Riffreiher, Gecko, Einsiedlerkrebs. Dazu: Wo sie stehen, wie sie sich bewegen, wie
oft man sie in zehn Minuten sieht, ob sie bei weniger Bewegung und niedriger Qualität schlank bleiben. Ratten gab es nur als
Zahl im Lager. Flughunde standen nur in einem Ereignistext.

**Was sich geändert hat.**
- **Größen:** Das Huhn ist jetzt kleiner (reicht zum Knie), das Schwein etwas kleiner als der Hund, sein Kopf kleiner
  (erledigt: „Schweineköpfe sind groß“). Die Landkrabbe ist kleiner, der Gecko und der Riffreiher auch, die Schmetterlinge
  ebenso. Der Wal ist größer, so lang wie drei Kanus. Die Schildkröte ist kleiner.
- **Die Schildkröte** ist neu gezeichnet (Tuschelinie, Kopf, Panzer mit Feldern) und taucht in jeder Lagune auf, nicht mehr nur
  in jeder zweiten. Sie ist jetzt im Bild gesehen worden (erledigt).
- **Ratten sind jetzt zu sehen:** In der Dämmerung und nachts huscht eine Ratte (zwei ohne Speicher) zum Speicher, Erntehaus oder
  Feld, knabbert und läuft fort. Mit zwei Speichern sieht man keine mehr. Ein Tippen sagt, was sie ist.
- **Flughunde** fliegen an manchen Abenden in der Dämmerung über das Dorf. Sie sind heimisch, nicht mitgebracht.
- **Seevögel** haben einen kleinen Körper zwischen den Flügeln; der Fregattvogel ist etwas kleiner. Die Vögel an den
  Fischgründen sind feiner gezeichnet.
- **Fliegende Fische** sind kleine Fische mit Flossen, nicht mehr weiße Striche.
- **Tippen:** Hund, Schwein, Huhn, Ratte, Wal, Delfine auf See, Meeresschildkröten und Flughunde geben jetzt ein Wort. Die
  Tippfläche der Dorftiere ist eng, damit sie keine Tipps auf Häuser und Menschen wegnehmen.
- **Plätze:** Tiere laufen nicht mehr über den Festplatz und werden nie im Wasser geboren. Delfine springen am Riff nur noch dort,
  wo der ganze Sprung über Wasser geht.
- **Wie oft (zehn Minuten Spiel, Nahsicht):** Wale zogen vorher alle 25 Sekunden durchs Bild, jetzt etwa fünf- bis sechsmal.
  Delfine am Riff: vorher 1 bis 4, jetzt 4 bis 6. Der Lichtwal kommt etwas öfter (etwa einmal in 25 Minuten). Reiher (3),
  springende Fische (15 bis 18), Gecko (immer am gleichen Haus) sind gleich geblieben.
- **Nur eine Auswahl an Tieren im Dorf:** Hund, Schwein, Huhn. Ein Test hält das fest, damit keine Katze oder Ziege hineinkommt.
- **Neuer Test** `tests/tiere.test.js`: Jedes Tier zeichnet in jedem Abstand, bei jeder Qualität, bei Tag, Dämmerung und Nacht,
  mit und ohne weniger Bewegung, ohne Fehler.

**Belegt oder Spiel.** Siehe „Was belegt ist und was später“: Hund, Schwein, Huhn und Ratte kamen mit den Kanus (belegt). Seevögel,
Flughunde, Geckos, Landkrabben, Schildkröten, Riffische, Delfine, Wale und der Riffreiher sind heimisch (belegt). Der Lichtwal ist
frei erfunden. Wo und wie oft man sie sieht, ist Spiel.

## Der Einsiedlerkrebs, natürlicher (Version 98)

- **Seltener:** das erste Mal nach gut einer Minute, dann etwa alle drei bis vier Minuten (vorher alle ein bis zwei).
- **Scheu wie ein echter Einsiedlerkrebs:** Die Muschel wackelt, er kommt langsam heraus, duckt sich einmal schnell zurück und
  traut sich dann wieder. Hinein geht es immer schnell, heraus langsam.
- **Krabbeln in kleinen Schüben:** Schritt, Schritt, kurze Pause; der Körper hebt sich bei jedem Schritt, die drei Beine
  treten nacheinander, die Muschel schaukelt mit.
- **Augen auf Stielen** schauen jedes für sich umher und zucken manchmal; die Fühler zittern; er blinzelt; die Schere winkt in
  schnellen Schlägen oder pickt am Boden. Beim Klettern dreht er sich weich statt auf einen Schlag.

## Der Einsiedlerkrebs spielt mit der Leiste (Version 99)

- **Mehr Einzelheiten:** eine große rechte Schere (damit verschließt er die Muschel) und eine kleine linke, vier Laufbeine mit
  Gelenken, Augen auf geringelten Stielen, lange Fühler, ein gestreifter Körper mit hellen Punkten, eine Muschel mit Spirale,
  Zahnstempel-Muster, Glanz und einer Kerbe, ein weicher Schatten auf der Karte.
- **Er spielt mit der Leiste:**
  - Er klopft von unten mit der großen Schere an die Leiste; die Leiste hüpft ein wenig. Er lauscht, klopft noch einmal.
  - Er findet die große Muschel der Nachrichten, klettert hinauf, tippt sie an (sie nickt), schaut von ihr zu seiner eigenen
    kleinen Muschel und zurück und entscheidet: zu groß. Dann klettert er wieder hinunter.
  - Kommt eine Nachricht, setzt er sich manchmal oben auf sie und liest mit, dann huscht er weg.
  - Dazu wie bisher: unter der Leiste hervor und auf sie hinauf, von oben über sie hinunter, nur die Muschel, die wackelt.
- **Antippen erschreckt ihn:** Er zieht sich sofort zurück, hält die große Schere vor den Eingang, die Muschel zittert; nach
  einem Moment lugt er vorsichtig heraus und verschwindet. Eine Blase erzählt von ihm.



## Mehr Details (Version 100)

Der Wunsch: mehr Feinheit in allem. Alles im gleichen Tuschestil, ruhig, und das Handy bleibt flüssig.

- **Treibgut:** Jede Art sieht anders aus. Die Kokosnuss hat Fasern und manchmal einen Keim. Der Stamm hat Rinde, Aststummel,
  Seepocken und eine Tangsträhne; manchmal ruht ein Vogel darauf. Ein abgebrochener Ast trägt ein paar Blätter. Das Wrackteil ist
  mit Sennit gebunden. Das Kauri-Harz glänzt weich und funkelt. Neu: ein Bündel Pandanusblätter (gibt Palmwedel) und ein
  Büschel Tang mit Muscheln (gibt Muscheln). Jedes Stück wippt leicht, hat einen kleinen Wellenring und funkelt ab und zu, damit
  man merkt: antippen. Wenn es am Strand ankommt, läuft eine kleine Schaumlinie hoch.
- **Strand:** Spülsaum aus Tang, Schaumspitze am Wasser, Kiesel, Muscheln, Krabbenlöcher mit Sandhäufchen, Kokosnüsse und
  Schalen unter den Palmen, Laub und Brotfrüchte unter den Bäumen, Fußspuren zu den Kanus. Das meiste bleibt bewusst leer,
  damit das Auge ruht. Alles ist fest in die Grundebene gezeichnet (ein Pfad je Insel), kostet pro Bild fast nichts.
- **Häuser und Dorf:** Schnurbindungen an den Pfosten. Manche Häuser haben eine Reuse oder ein Netz am Dachrand, eine
  gerollte Matte an der Tür oder Ruß am Dach über der Feuerstelle; andere nichts. Der Dorfplatz hat einen Steinring und eine
  abgetretene Mitte.
- **Kanus und See:** Schnurbindungen an den Auslegerbalken und an der Plattform, ein Paddel im Boot. In der Lagune treiben ein
  paar Blätter.
- **Gärten:** Ein Grabstock und ein geflochtener Korb am Rand mancher Taro- und Yamsfelder.
- **Schnell bleiben:** Feines kommt nur nah heran (`lod` „near“) und bei guter Bildrate (`quality`); bei weniger Bewegung steht
  alles still. Gleiches Haus, gleiche Details (nach der Nummer des Hauses); nur wenige Spielarten, damit nicht viele Bilder nötig sind.
- **Test:** `tests/rules.test.js` zeichnet alle neuen Details in jedem Abstand und jeder Qualität ohne Fehler.

**Belegt oder Spiel.** Belegt: Kokosnüsse mit Faserhülle, Pandanusblätter für Matten, Sennit-Bindungen an Auslegerkanus, Reusen,
Netze, Grabstock und Korb im Garten. Kauri-Harz als Talisman und der Vogel auf dem Stamm sind Spielidee. Wo genau was liegt, ist Spiel.

## Segeln nach dem Wind (Version 101)

- **Der Wind bestimmt das Tempo:** Halber Wind (von der Seite) ist am schnellsten, Rückenwind etwas langsamer, hart am Wind
  langsamer. Das Doppelkanu mit seinem großen Mattensegel hängt mehr vom Wind ab als das Auslegerkanu mit seinen Paddlern;
  je stärker der Wind, desto größer der Unterschied.
- **Gegen den Wind wird gekreuzt:** Liegt das Ziel im Wind, fährt das Kanu im Zickzack, etwa 50 Grad neben dem Wind, und
  wendet, wenn es zu weit vom Weg abkommt oder Land voraus ist. Bei jeder Wende verliert es kurz Fahrt. So dauert eine Fahrt
  gegen den Wind gut doppelt so lang wie mit halbem Wind. Nahe am Ziel paddelt die Mannschaft das letzte Stück gerade.
- **Flaute:** Bei sehr schwachem Wind paddelt die Mannschaft, gut halb so schnell.
- Im Blatt eines fahrenden Kanus steht, wie es gerade segelt: Rückenwind, halber Wind, hart am Wind, kreuzt, Flaute.
- **Was belegt ist und was Spiel:** Dass Seefahrer in Ozeanien gegen den vorherrschenden Ostwind hinausfuhren und mit ihm
  sicher heimkamen, ist eine gut begründete Annahme aus Fahrtsimulationen (vermutet, Irwin). Wie gut Lapita-Kanus am Wind
  segeln konnten und welche Segel sie hatten, ist nicht belegt; die Werte hier sind Spiel.

## Der Krebs hangelt sich, ein Skink huscht (Version 102)

- **Der Einsiedlerkrebs läuft nicht mehr halb verdeckt unter der Leiste.** Er rutscht hinter der unteren Kante hervor und
  hängt sich kopfüber an sie, die Beine an der Kante, und hangelt sich an ihr entlang. Er schwingt sich hinauf auf die Leiste,
  sitzt, schaut, klettert über die Kante wieder hinunter, hangelt weiter und zieht sich hinter die Kante zurück. Auch das
  Anklopfen und der Weg zur großen Muschel gehen jetzt hängend an der Kante. Er versteckt sich nur noch hinter der Kante,
  nie mehr halb darunter.
- **Neu: ein Blauschwanzskink**, noch seltener als der Krebs: frühestens nach vier Minuten, dann alle acht bis fünfzehn
  Minuten, nie zugleich mit dem Krebs. Er huscht in schnellen Schüben über die Leiste, der Körper schlängelt, die Beine wirbeln;
  er hält an, nickt mit dem Kopf, schlägt mit dem blauen Schwanz, züngelt und ist über den Rand verschwunden. Antippen lässt
  ihn sofort davonflitzen, eine Blase erzählt von ihm.
- Blauschwanzskinke (Emoia) leben auf fast allen Inseln Ozeaniens (belegt).

## Die Leiste in zwei Reihen (Version 103)

- **Oben:** eine kleine Windrose, der Inselname, Ansehen, Zufriedenheit, Menschen, die Muschel und das Menü. Der Windtext ist weg;
  die Fahne der Rose zeigt, woher der Wind weht. Gedrückt halten zeigt Wind und Stärke, Tippen den Kalender.
- **Unten:** die Tageswaren mit dem Tagesbedarf.
- Die Leiste ist so etwa ein Drittel niedriger, und mehr Karte ist zu sehen. Auf sehr kleinen Handys fallen „/Platz“ und der Punkt
  neben den Menschen weg, damit der Inselname Platz hat.

