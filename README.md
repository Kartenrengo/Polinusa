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
(hohe Inseln, Vulkane, Atolle). Lage, Küsten, Wald, Bach und Riff entstehen aus dem Startwert.
Gespeichert wird nur der Startwert und was sich geändert hat, ein Spielstand hat etwa 5 KB.
Die Weltnummer steht im Menü.

## Nächste Schritte

1. ~~Fundament: Dateien, Canvas, Welt aus Startwert~~
2. Start wie bei Age of Empires: nur das Dorfzentrum, geführte erste Aufgaben
3. Bedürfnisse auf einen Blick
4. Menschen neu zeichnen
5. Kleine Kanus in der Lagune
6. Handel mit kleinen Kanus
7. Erkunden mit dem Hochseekanu, ohne Markierungen
8. Android-App mit Capacitor
