# Übergabe: Version 120 bis 122 in Christian-Thiem/polinusa übernehmen

Das Spiel Polinusa wurde bisher in https://github.com/Kartenrengo/Polinusa auf dem Zweig `claude/tender-brown-y2ccv6`
weiterentwickelt. Ab jetzt wird Christian-Thiem/polinusa genutzt. Die Dev-Seite https://dev.polinusa.isuvag.net/ zeigt
noch Version 119 (sw.js: BUILD 'v119-…', mit manifest.webmanifest und Service Worker).

1. Dieses Repository ansehen: Aufbau, Bundler (setzt BUILD in sw.js), wie die Dev-Seite gebaut und ausgeliefert wird,
   CLAUDE.md und IDEEN.md.
2. Den öffentlichen Zweig holen und vergleichen:
   `git fetch https://github.com/Kartenrengo/Polinusa claude/tender-brown-y2ccv6`
   Nach Version 119 (Commit b2c5ace) kamen dazu:
   - 1532c1c, b4fe7c9 – Version 120: Dorfsteg (anleger) am Hafen, Beladen und Handel dort; Zuzug in Wellen nach
     Zufriedenheit mit sichtbarer Uhr.
   - 3cae7df – Version 121: neue Datei src/hof.js (Hofpflege in freier Zeit, drei Stufen, Häusergruppen mit gemeinsamem
     Platz, nichts überlappt), Regler „Arbeit und Freizeit“ in Bildern (Dorf und Person), Warennamen beim Beladen, Hof und
     Weg im Hausblatt, tests/hof.test.js.
   - f96af89, 82e5531, 4b89c80, 2c61c9f, 22e0235 – Version 122: Nachbarhäuser verbinden sich (Trittsteine, Sennitleine mit
     Tapa und Blüten, nur an festen Teilen: Eckpfosten, Vordachpfosten, Balkenenden, Paddel, Firststangen; nie an
     Tür-Tapa, Netzen, Fransen), federnde Plopp-Animation mit Klängen (sfx pop, twang, tick, pling in audio.js); Felder
     bekommen Erddämme, Werkstätten Muschelstreifen, Strandbauten Planken.
3. Diese Änderungen übernehmen, ohne die eigenen Teile des Repositorys (PWA, Service Worker, Manifest, Icons, Bundler) zu
   verlieren. GAME_V in src/state.js ist jetzt 122; der Bundler muss sw.js passend setzen.
4. Tests laufen lassen (`node tests/run.mjs`, mit `--long` für den langen Bot), bauen, prüfen, dass alles grün ist.
5. Vor dem Pushen kurz erklären, was übernommen wurde und wie die Dev-Seite aktualisiert wird.
