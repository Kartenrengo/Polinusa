/* ======================================================================================================================
   Schönheit wird erspielt. beautyOf(I) (world.js) zählt, was ein Dorf schmückt. Hier wird daraus eine Treppe mit fünf
   Stufen, je Mensch gemessen wie die Zufriedenheit: Schlicht, Gepflegt, Geschmückt, Prächtig, Berühmt. Jede neue Stufe wird
   einmal gefeiert (Blütenregen und ein Hinweis) und schaltet etwas Sichtbares im Dorf frei, das bleibt, solange die Stufe
   hält: Blumen an den Wegen, Kränze an den Häusern, mehr Schmetterlinge, Glühwürmchen, am Ende Gäste im Kanu. Manche
   Schmuckstücke gibt es erst ab einer Stufe. Gezeichnet wird alles in hingucker.js.
   ====================================================================================================================== */
const BEAUTY_STEPS = [
  {n:'Schlicht', b:0, r:0, say:''},
  {n:'Gepflegt', b:3, r:.12, say:'Blumen blühen an den Wegen und rund um die Häuser. Neu zu bauen: Ahnenpfosten.'},
  {n:'Geschmückt', b:7, r:.25, say:'Kränze und Bänder hängen an den Häusern, die Kinder spielen mehr auf dem Platz. Neu zu bauen: Tanzplatz.'},
  {n:'Prächtig', b:13, r:.42, say:'Mehr Schmetterlinge am Tag, nachts tanzen Glühwürmchen zwischen den Blumen.'},
  {n:'Berühmt', b:22, r:.65, say:'Gäste kommen im Kanu, um das Dorf zu sehen.'}
];
/* what is only built from a step on (on top of the stage of the people): the post with the ancestors' faces from Gepflegt, the dance floor from Geschmückt */
const BEAUTY_GATE = {pfosten:1, tanzplatz:2};
/* the step of a village: the beauty must reach the step's own mark and, per person (at least 4 people count), its share */
function beautyStepOf(b, pop){
  let s = 0; for (let i = 1; i < BEAUTY_STEPS.length; i++){ const S = BEAUTY_STEPS[i]; if (b >= S.b && b >= S.r * Math.max(4, pop)) s = i; else break; }
  return s;
}
const beautyStep = I => beautyStepOf(beautyOf(I), I.pop);
/* what is still missing for the next step, and how far along the village is (0..1) */
function beautyNext(I){
  const b = beautyOf(I), s = beautyStepOf(b, I.pop), N = BEAUTY_STEPS[s + 1]; if (!N) return {step:s, b, next:null, need:0, f:1};
  const need = Math.max(N.b, Math.ceil(N.r * Math.max(4, I.pop))), from = Math.max(BEAUTY_STEPS[s].b, Math.ceil(BEAUTY_STEPS[s].r * Math.max(4, I.pop)));
  return {step:s, b, next:N, need:Math.max(0, need - b), f:clamp((b - from) / Math.max(1, need - from), 0, 1)};
}
/* the rewards of a step, as plain flags: blooms (flowers by the paths and houses), bunting (wreaths and ribbons),
   kids (more play on the plaza), butterflies (extra ones by day), fireflies (at night), guests (canoes come to look) */
const beautyFxOf = s => ({step:s, blooms:s >= 1, bunting:s >= 2, kids:s >= 2, butterflies:s >= 3 ? 6 : s >= 2 ? 4 : s >= 1 ? 2 : 0, fireflies:s >= 3, guests:s >= 4 ? 2 : 0});
const beautyFx = I => beautyFxOf(I._bs !== undefined ? I._bs : beautyStep(I));
/* every tick: keep the step of each village, celebrate a new one once (a burst of petals, a note), and open what it opens */
function beautyTick(){
  for (const I of islands){
    if (!I.settled){ I._bs = 0; continue; }
    const s = beautyStep(I); I._bs = s;
    if (I.bmax === undefined){ I.bmax = s; stats.bstep = Math.max(stats.bstep || 0, s); continue; }   // an older game: what was reached before is not celebrated again
    if (s > I.bmax && !awayQuiet){
      I.bmax = s; I._bsAt = performance.now(); const S = BEAUTY_STEPS[s];
      for (const k in BEAUTY_GATE) if (BEAUTY_GATE[k] === s && (stats.bstep || 0) < s && KINDS[k]) newKinds.add(k);
      stats.bstep = Math.max(stats.bstep || 0, s);
      petalBurst(I); sfx('quest');
      toast(`${I.name} ist jetzt ${S.n}. ${S.say}`, 6000); note(`Schönheit: ${I.name} ist ${S.n}.`); renderBuildBar();
    }
  }
}
/* the row in the overview: the step, the next one, and a small bar */
function beautyRow(I){
  const N = beautyNext(I), S = BEAUTY_STEPS[N.step];
  const sub = N.next ? `Weiter: ${N.next.n}, noch ${N.need} Schönheit. Blumen, Fackeln, Wege.` : 'Die höchste Stufe: Gäste kommen zu Besuch.';
  return `<li class="beauty">${icon('schoen')}<span class="nm">Schönheit: ${S.n}<small>${sub}</small><span class="mbar" role="img" aria-label="Stufe ${N.step + 1} von ${BEAUTY_STEPS.length}"><i style="width:${Math.round(N.f * 100)}%"></i></span></span><span class="state ${N.step >= 3 ? 'ok' : 'low'}">${N.step + 1}/${BEAUTY_STEPS.length}</span></li>`;
}
