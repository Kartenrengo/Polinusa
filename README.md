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
| `src/data.js` | Waren, Gebäude, Kosten |
| `src/art.js` | Alle Bilder als kleine SVG-Bausteine |
| `src/world.js` | Inseln aus einem Startwert erzeugen, Bauregeln |
| `src/state.js` | Spielstand, Startdörfer, Speichern und Laden |
| `src/render.js` | Zeichnen auf Canvas |
| `src/ui.js` | Bedienung, Bauen, Tafeln |
| `src/quests.js` | Aufgaben für den Anfang, was sie freischalten |
| `src/game.js` | Wirtschaft, Boote, Eingabe, Hauptschleife |

Die Dateien sind einfache Skripte mit gemeinsamem globalem Bereich. Sie werden in dieser Reihenfolge geladen.

## Sparsam zeichnen

- Jedes Bild ist ein SVG-Baustein. Er wird einmal pro Größenstufe in ein Bitmap gemalt und danach nur kopiert.
  Selten genutzte Bitmaps fallen aus dem Speicher, wenn mehr als etwa 24 MB belegt sind.
- Meer, Inseln und Häuser liegen in einer Grundebene, der Nebel in einer zweiten. Beide sind etwas größer als
  der Bildschirm und werden beim Schieben nur verschoben. Neu gemalt wird erst am Rand, nach einer Änderung
  im Dorf oder wenn ein Zoom zur Ruhe kommt.
- Rauch, Menschen und Boote kommen darüber, höchstens 30-mal pro Sekunde.
- Gezeichnet wird nur, was im Bild ist. Unentdeckte Inseln unter dem Nebel gar nicht.
- Die Wirtschaft rechnet alle zwei Sekunden für alle Inseln, getrennt von der Grafik.

## Welt

Die Welt ist 2400 × 3600 groß und hat neun Inseln: die Heimat Panua, das Atoll Motu und sieben weitere
(hohe Inseln, Vulkane, Atolle), zwei davon mit fremden Clans. Lage, Küsten, Wald, Bach, Riff und Vorkommen
entstehen aus dem Startwert.
Gespeichert wird nur der Startwert und was sich geändert hat, ein Spielstand hat etwa 5 KB.
Die Weltnummer steht im Menü.

## Anfang

Wie bei Age of Empires steht am Anfang nur das Versammlungshaus auf Panua. Motu ist zu sehen, aber unbewohnt.
Über der Bauleiste steht immer genau eine Aufgabe. Antippen erklärt sie, „Zeig es mir“ springt zur richtigen
Stelle. Jede erledigte Aufgabe schaltet neue Gebäude frei, so bleibt die Bauleiste am Anfang klein.

1. Zwei Häuser, 2. zwei Tarofelder, 3. 15 Bewohner, 4. Töpferei am Ton, 5. Beilwerkstatt am Felsen, 6. Kanuhaus,
7. Siedler im Auslegerkanu nach Motu, 8. Flechthütte und Seilerei auf Motu, 9. Matten und Schnur nach Panua,
10. 6 Proviant aus der Gärgrube, 11. Doppelkanu, 12. neues Land finden, 13. ein Fest, 14. ein Häuptlingsdorf.

Kleine Auslegerkanus bringen Siedler, Waren und Gaben zwischen den Inseln. Das Doppelkanu fährt ins Unbekannte.

## Wirtschaft: Gabe und Gegengabe

Elf Waren: Essen, Holz, Proviant, Töpfe, Steinbeile, Klingen, Matten, Schnur, Tapa, Schweine, Muschelschmuck.
Ketten haben höchstens drei Glieder.

| Gebäude | Insel | Braucht | Macht |
| --- | --- | --- | --- |
| Tarofeld, Brotfruchtbaum | hoch | | Essen |
| Fischgestell | Atoll, am Strand | | Essen |
| Gärgrube | hoch | 2 Brotfruchtbäume daneben, Essen | Proviant |
| Töpferei | hoch | Ton in der Nähe, Holz | Töpfe |
| Beilwerkstatt | hoch | Basaltfelsen in der Nähe | Steinbeile |
| Klingenschläger | Vulkan | Obsidian in der Nähe | Klingen |
| Maulbeergarten + Klopfhütte | hoch | Garten neben der Hütte | Tapa |
| Schweinepferch | hoch | Essen als Futter | Schweine |
| Flechthütte | Atoll | 2 Pandanus daneben | Matten |
| Seilerei | Atoll | 3 Kokospalmen daneben | Schnur |
| Schmuckschleiferei | Atoll, am Strand | Klingen | Muschelschmuck |

- **Vorkommen:** Ton liegt am Bach, Basalt an den grauen Felsen, Obsidian nur am Vulkan. Beim Bauen zeigen Ringe,
  wo sie liegen. Diese Rohstoffe werden nicht gelagert, die Werkstatt muss daneben stehen.
- **Stillstand:** Fehlt einer Werkstatt etwas, schwebt das fehlende Zeichen über ihr. Die Tafel des Gebäudes und das Lager
  sagen, warum.
- **Lager:** Die Warenleiste oben zeigt bis zu sieben wichtige Waren. Antippen öffnet das Lager mit allem, was pro Minute
  dazukommt und weggeht.

## Bedarf und Stufen

| Stufe | Ab | Braucht pro Bewohner und Minute |
| --- | --- | --- |
| Weiler | Anfang | Essen 1,25 |
| Dorf | 20 Bewohner | dazu Töpfe 0,1, ab 30 Bewohnern Matten 0,1 |
| Häuptlingsdorf | 40 Bewohner, Ansehen 20, Töpfe und Matten reichen, Tapa, Schweine und Schmuck im Lager | dazu Tapa 0,1, Schweine 0,04, Muschelschmuck 0,02 |

Im Häuptlingsdorf wohnen 6 statt 4 Menschen in jedem Haus. Die Häuser bekommen geschnitzte Pfosten und Muschelschmuck.
Fehlt dort 30 Takte lang etwas, wird es wieder ein Dorf, und die Leute ziehen nach und nach aus.
Ein Dorf wächst, solange Platz in den Häusern ist und nichts fehlt. Ohne Essen ziehen langsam Leute fort.

- Die Bewohnerzahl oben öffnet die Tafel „Bedarf“. Der Punkt daneben: grün wächst, gelb Häuser voll, rot es fehlt etwas.
- Fehlt etwas, schwebt das Zeichen der Ware über einigen Häusern. Zieht jemand ein, steigt ein Herz auf.

## Ansehen

Das Ansehen des Clans wächst mit Festen im Versammlungshaus (Kleines Fest: 12 Essen und 2 Töpfe, +5;
Großes Fest: 4 Schweine, 15 Essen und 2 Tapa, +15) und mit Gaben an andere Clans. Es sinkt um etwa 1 pro Minute.
Gebraucht wird es für jede weitere Siedlungsfahrt (8 mehr pro Siedlung nach den ersten beiden) und für ein Häuptlingsdorf.
Beim Fest versammelt sich das Dorf am Feuer vor dem Versammlungshaus.

## Fremde Clans

Auf zwei der unentdeckten Inseln lebt schon jemand: der Clan vom Feuerberg auf einem Vulkan (macht Klingen und Schweine,
schätzt Matten, Schnur und Muschelschmuck) und der Clan vom Riff auf einem Atoll (macht Muschelschmuck und Matten,
schätzt Töpfe, Steinbeile und Klingen). Erreicht das Doppelkanu einen Clan, gibt es eine Schnur dorthin, und das Kanu
fährt heim. Waren an einen Clan sind Gaben: Sie antworten später mit ihren Waren. Wie reich die Gegengabe ausfällt,
hängt von den Knoten auf der Schnur ab. Muschelschmuck knüpft einen Knoten extra, ohne Gaben löst sich alle drei Minuten einer.
So funktionierten Wertgegenstände im Pazifik: als Gaben, die Beziehungen stiften, nicht als Geld.

## Proviant

Das Doppelkanu verbraucht 2 Proviant pro Reisetag. Die Fahrt startet nur, wenn genug im Lager ist.

## Menschen

Kleine Figuren ohne Arme und Beine: Tapa-Wickelrock, Muschelkette, Haarknoten, Hibiskusblüte oder langes Haar,
drei Hauttöne. Etwa ein Viertel der Bewohner ist zu sehen. Zwei von dreien haben Arbeit und tragen sie sichtbar
vom Feld, der Werkstatt oder dem Waldrand zum Speicher: Taro oder Brotfrucht im Korb auf dem Kopf, Töpfe,
Steine, Obsidian, Muscheln, Schnur, Tapa, Proviant, Holz, Fisch an der Stange, Matten. Die anderen schlendern zwischen den
Häusern. Auch in den Dörfern der Clans sind Menschen unterwegs.

## Nächste Schritte

1. ~~Fundament: Dateien, Canvas, Welt aus Startwert~~
2. ~~Start wie bei Age of Empires: nur das Dorfzentrum, geführte erste Aufgaben~~
3. ~~Bedürfnisse auf einen Blick~~
4. ~~Menschen neu zeichnen~~ (Feinschliff nach dem Vorlagebild)
5. Kleine Kanus in der Lagune
6. Handel mit kleinen Kanus
7. Erkunden mit dem Hochseekanu, ohne Markierungen
8. Android-App mit Capacitor
