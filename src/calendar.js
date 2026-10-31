'use strict';
/* The year in twelve moons. It begins when the Pleiades stand above the horizon after sunset, as for the Makahiki
   in Hawaiʻi and the two seasons of Tahiti. Breadfruit does not bear all year; the fermenting pits bridge the lean
   months. A week after full moon in the first moon the palolo worm rises from the reef. Before the feast a chief can
   close a reef with a rāhui so that it recovers and gives a rich catch at the feast of the first fruits. */

const yearTick = (t = tick) => (t + YEAR_START) % YEAR;
const moonOf = (t = tick) => Math.floor(yearTick(t) / MOON);
const yearOf = (t = tick) => Math.floor((t + YEAR_START) / YEAR);
const dayOf = (t = tick) => yearTick(t) % MOON;
const seasonOf = (t = tick) => SEASONS.find(S => moonOf(t) >= S.from && moonOf(t) < S.to);
const isPalolo = (t = tick) => moonOf(t) === PALOLO.moon && dayOf(t) >= PALOLO.from && dayOf(t) < PALOLO.to;
const festivalTime = () => moonOf() < 2;   // the feast can be held while the Pleiades season lasts, two moons
const untilFestival = () => festivalTime() ? 0 : YEAR - yearTick();
const minutes = ticks => Math.max(1, Math.round(ticks * TICK / 60000));
const SEASON_ICON = {plejaden:'ic-plejaden', sturm:'ic-sturm', passat:'ic-passat', mager:'ic-mager'};

/* Production that follows the year: breadfruit by season, fish and reef under rāhui, the palolo night */
const SEA_KINDS = new Set(['fisch', 'riff']);
function seasonalEvery(I, b, K){
  const dry = I.drought > tick && (b.kind === 'taro' || b.kind === 'pulaka' || b.kind === 'baum') ? 2 : 1;   // a drought halves what the fields give
  if (b.kind === 'baum'){ const m = seasonOf().baum; return m ? Math.round(K.every * dry / m) : 0; }
  if (dry > 1) return K.every * 2;
  if (SEA_KINDS.has(b.kind)){
    if (I.rahui && seasonOf().id === 'mager') return 0;   // the reef rests
    if (I.rahuiDone === yearOf() && festivalTime()) return Math.max(1, Math.round(K.every / 3));   // after the rāhui the lagoon is full
  }
  return K.every;
}
function calendarTick(){
  const t = yearTick();
  if (t % MOON === 0){
    const S = seasonOf();
    if (moonOf() === S.from){ toast(`${S.n}. ${S.text}`, 6000); invalidate(true); }   // the land changes colour with the season
    if (moonOf() === 0){
      // the rāhui is lifted at the feast: the reef opens again
      for (const I of islands) if (I.settled && I.rahui){ I.rahui = false; I.rahuiDone = yearOf(); mana += 3; }
    }
    if (moonOf() === 11) toast('Nur noch ein Mond, dann stehen die Plejaden am Abendhimmel. Bereitet das Fest der ersten Früchte vor.', 5000);
  }
  if (isPalolo()){
    if (dayOf() === PALOLO.from) toast('Palolo-Nacht: Eine Woche nach Vollmond steigt der Riffwurm aus dem Riff. Alle schöpfen ihn am Ufer mit Körben, eine Köstlichkeit.', 5000);
    for (const I of islands){
      if (!I.settled) continue;
      const reef = I.buildings.filter(b => SEA_KINDS.has(b.kind) && !b.bt).length, gain = Math.ceil(I.pop / 8) + reef * 2;
      I.stock.meeres = Math.min(storeCap(I), (I.stock.meeres || 0) + gain * (I.rahuiDone === yearOf() ? 2 : 1));
    }
  }
}
function declareRahui(I){
  if (seasonOf().id !== 'mager' || I.rahui || !I.buildings.some(b => SEA_KINDS.has(b.kind))) return;
  I.rahui = true; save(); toast(`Rāhui auf ${I.name}: Bis zum Fest der Plejaden ruhen Fischfang und Riff. Dann ist der Fang dreimal so reich.`, 4600);
}

/* ---------- the feast of the first fruits */
function festivalParts(I){
  return FESTIVAL.parts.map(P => {
    let ok = true, why = '';
    if (P.cost && !canPay(I, P.cost)){ ok = false; why = `Es fehlt ${lacking(I, P.cost)}.`; }
    if (P.needs){ const miss = P.needs.filter(k => !I.buildings.some(b => b.kind === k && !b.bt)); if (miss.length){ ok = false; why = `Es fehlt ${miss.map(k => KINDS[k].n).join(' und ')}.`; } }
    if (P.ships && shipAt(I.id).length < P.ships){ ok = false; why = `Es liegen ${shipAt(I.id).length} Kanus im Hafen.`; }
    const gain = P.id === 'rennen' ? P.mana * Math.min(4, shipAt(I.id).length) : P.mana;
    return {P, ok, why, gain};
  });
}
function festivalState(I){
  if (!I.buildings.some(b => b.kind === 'halle' && !b.bt)) return 'Das Fest feiert man im Versammlungshaus.';
  if (!festivalTime()) return `Die Plejaden erscheinen in etwa ${minutes(untilFestival())} Minuten.`;
  if (I.festYear === yearOf()) return 'Dieses Jahr ist das Fest hier schon gefeiert.';
  if (!canPay(I, FESTIVAL.offering)) return `Für die ersten Früchte fehlt ${lacking(I, FESTIVAL.offering)}.`;
  return '';
}
const guestsFor = () => islands.filter(T => T.clan && T.discovered && routes.some(r => (r.a === T.id || r.b === T.id) && r.knots >= 2));
function festivalGain(I, chosen){
  const parts = festivalParts(I).filter(p => p.ok && chosen.includes(p.P.id));
  return FESTIVAL.mana + parts.reduce((s, p) => s + p.gain, 0) + Math.min(8, Math.floor(beautyOf(I) / 3)) + guestsFor().length * 2;
}
function holdFestival(I, chosen){
  const no = festivalState(I); if (no){ toast(no, 2600, false); return; }
  const parts = festivalParts(I).filter(p => p.ok && chosen.includes(p.P.id)), gain = festivalGain(I, chosen);
  pay(I, FESTIVAL.offering); for (const p of parts) if (p.P.cost) pay(I, p.P.cost); sfx('horn');
  mana += gain; I.festYear = yearOf(); I.feastAt = tick; I.feastEnd = tick + FEAST_LEN; I.joyUntil = tick + MOON;
  if (parts.some(p => p.P.id === 'rennen')) startRace(I, shipAt(I.id).slice(0, 4));
  // clans who trust us come as guests, with gifts; after a kava round they leave as closer friends
  const kava = parts.some(p => p.P.id === 'kava');
  for (const T of guestsFor()){
    const r = routes.find(q => q.a === T.id || q.b === T.id); r.knots = Math.min(12, r.knots + 1 + (kava ? 1 : 0)); r.lastGift = tick;
    clanShip(T, I.id, returnGoods(T.clan, 4 + r.knots).cargo, true);
  }
  for (const w of walkers) if (w.isl === I.id){ nextLeg(w); w.wait = 0; }
  for (let i = 0; i < 10; i++) heartAt(I);
  updateHUD(); if (sheetKind) renderSheet(); save(); checkQuest();
  toast(`Fest der Plejaden auf ${I.name}. Die ersten Früchte sind dargebracht. Ansehen +${gain}. Bis zum nächsten Mond wächst das Dorf doppelt so schnell.`, 6000);
}
