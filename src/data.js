'use strict';
/* Goods, buildings, needs and the rules of exchange */

const TICK = 2000, DAY = 3, AGE_FULL = 150, LOAD = 12, SAVE_KEY = 'polinusa-2';

const GOODS = ['nahrung','holz','proviant','toepfe','beile','klingen','matten','schnur','tapa','schweine','schmuck'];
const GN = {nahrung:'Essen', holz:'Holz', proviant:'Proviant', toepfe:'Töpfe', beile:'Steinbeile', klingen:'Klingen', matten:'Matten', schnur:'Schnur', tapa:'Tapa', schweine:'Schweine', schmuck:'Muschelschmuck'};
const G1 = {nahrung:'Essen', holz:'Holz', proviant:'Proviant', toepfe:'Topf', beile:'Steinbeil', klingen:'Klinge', matten:'Matte', schnur:'Schnur', tapa:'Tapa', schweine:'Schwein', schmuck:'Muschelring'};

/* Places on the map where raw material lies. Workshops that need one must stand close by. */
const DEPOSITS = {
  ton:{n:'Ton', where:'Ton liegt am Bach oder in feuchten Senken.'},
  basalt:{n:'Basalt', where:'Basalt findest du an den grauen Felsen.'},
  obsidian:{n:'Obsidian', where:'Obsidian gibt es nur am Hang eines Vulkans.'}
};
/* prod: what it makes, every: ticks per piece, use: what each piece uses up,
   dep: deposit within depR, near: at least n of a kind within r (plants or a garden), coast: on the beach */
const KINDS = {
  haus:{n:'Haus', s:'Haus', on:['hoch','atoll'], cost:{hoch:{holz:2}, atoll:{holz:1, toepfe:1}}, r:10, hy:12, cap:4, roof:true, info:'Ein Zuhause für 4 Menschen, im Häuptlingsdorf für 6.', vb:'-17 -29 34 33'},
  taro:{n:'Tarofeld', s:'Taro', on:['hoch'], cost:{holz:1}, r:10, hy:0, prod:'nahrung', every:2, info:'Taro ist das wichtigste Essen der hohen Inseln.', vb:'-13 -11 26 22'},
  fisch:{n:'Fischgestell', s:'Fisch', on:['atoll'], cost:{holz:1}, r:8, hy:4, prod:'nahrung', every:2, coast:true, info:'Hier trocknet der Fang aus der Lagune. Steht am Strand.', vb:'-12 -14 26 18'},
  toepfer:{n:'Töpferei', s:'Töpfe', on:['hoch'], cost:{holz:2}, r:11, hy:6, prod:'toepfe', every:3, use:{holz:1}, dep:'ton', depR:60, roof:true, info:'Formt Töpfe aus Ton und brennt sie mit Holz. Muss nah am Ton stehen.', vb:'-16 -17 34 21'},
  beil:{n:'Beilwerkstatt', s:'Beile', on:['hoch'], cost:{holz:2}, r:11, hy:6, prod:'beile', every:4, dep:'basalt', depR:60, roof:true, info:'Schleift Steinbeile aus Basalt. Muss nah am Felsen stehen.', vb:'-18 -17 36 21'},
  klingen:{n:'Klingenschläger', s:'Klingen', on:['hoch'], cost:{holz:3}, r:11, hy:6, prod:'klingen', every:5, dep:'obsidian', depR:60, roof:true, info:'Schlägt scharfe Klingen aus Obsidian. Nur am Vulkan.', vb:'-18 -17 36 21'},
  flecht:{n:'Flechthütte', s:'Matten', on:['atoll'], cost:{holz:1}, r:10, hy:6, prod:'matten', every:3, near:{kind:'pandanus', n:2, r:60}, roof:true, info:'Flicht Matten aus Pandanusblättern, für Segel und zum Schlafen. Braucht 2 Pandanus in der Nähe.', vb:'-17 -17 34 21'},
  schnur:{n:'Seilerei', s:'Schnur', on:['atoll'], cost:{holz:1}, r:10, hy:6, prod:'schnur', every:3, near:{kind:'palme', n:3, r:60}, roof:true, info:'Dreht Schnur aus Kokosfasern. Braucht 3 Kokospalmen in der Nähe.', vb:'-14 -17 30 21'},
  schmuck:{n:'Schmuckschleiferei', s:'Schmuck', on:['atoll'], cost:{holz:2}, r:11, hy:6, prod:'schmuck', every:6, use:{klingen:1}, coast:true, roof:true, info:'Schleift Armringe aus Conus-Muscheln vom Riff. Zum Bohren braucht sie Klingen. Steht am Strand.', vb:'-17 -17 36 21'},
  gaergrube:{n:'Gärgrube', s:'Grube', on:['hoch'], cost:{holz:1}, r:9, hy:2, prod:'proviant', every:4, use:{nahrung:1}, near:{kind:'baum', n:2, r:70}, info:'Brotfrucht gärt hier unter Blättern und hält monatelang. Proviant für weite Fahrten. Braucht 2 Brotfruchtbäume in der Nähe.', vb:'-12 -9 25 14'},
  garten:{n:'Maulbeergarten', s:'Maulbeer', on:['hoch'], cost:{holz:1}, r:10, hy:2, info:'Aus der Rinde des Papiermaulbeerbaums entsteht Tapa. Die Klopfhütte muss daneben stehen.', vb:'-12 -10 24 17'},
  klopf:{n:'Klopfhütte', s:'Tapa', on:['hoch'], cost:{holz:2}, r:11, hy:6, prod:'tapa', every:4, near:{kind:'garten', n:1, r:60}, roof:true, info:'Klopft Rinde zu Tapa, dem Stoff für Kleidung. Braucht einen Maulbeergarten in der Nähe.', vb:'-17 -17 36 21'},
  pferch:{n:'Schweinepferch', s:'Schweine', on:['hoch'], cost:{holz:3}, r:12, hy:4, prod:'schweine', every:8, use:{nahrung:2}, info:'Schweine fressen Taro und Kokos. Sie sind das Festessen.', vb:'-14 -12 28 18'},
  werft:{n:'Kanuhaus', s:'Kanuhaus', on:['hoch'], cost:{holz:4}, r:16, hy:6, max:1, coast:true, roof:true, info:'Hier entstehen die Kanus. Es steht am Strand.', vb:'-21 -19 44 24'},
  pfahl:{n:'Pfahlhaus', s:'Pfahlhaus', on:['hoch','atoll'], cost:{holz:3}, r:11, hy:18, cap:4, water:true, roof:true, info:'Ein Zuhause in der Lagune.', vb:'-17 -34 34 37'},
  speicher:{n:'Speicher', s:'Speicher', on:['hoch','atoll'], cost:{holz:2}, r:8, hy:12, store:10, roof:true, info:'+10 Platz für jede Ware.', vb:'-12 -28 24 30'},
  halle:{n:'Versammlungshaus', s:'Dorfhaus', on:['hoch'], cost:{holz:6}, r:19, hy:16, max:1, cap:6, roof:true, info:'Das Herz des Dorfes. +6 Bewohner. Hier werden Feste gefeiert.', vb:'-21 -34 42 37'},
  palme:{n:'Kokospalme', s:'Palme', on:['hoch','atoll'], cost:{}, r:5, hy:10, beach:true, plant:true, info:'Kokosfasern für die Seilerei.', vb:'-13 -25 26 28'},
  baum:{n:'Brotfruchtbaum', s:'Baum', on:['hoch'], cost:{}, r:7, hy:9, prod:'nahrung', every:6, plant:true, info:'Trägt Brotfrucht, frisch zum Essen oder für die Gärgrube.', vb:'-10 -21 20 23'},
  pandanus:{n:'Pandanus', s:'Pandanus', on:['atoll'], cost:{}, r:5, hy:9, beach:true, plant:true, info:'Die Blätter werden zu Matten geflochten.', vb:'-10 -21 20 23'}
};
const ORDER = ['haus','taro','fisch','toepfer','beil','flecht','schnur','gaergrube','werft','pfahl','speicher','garten','klopf','pferch','klingen','schmuck','halle','palme','baum','pandanus'];
const CANOE = {holz:6, beile:2, matten:3, schnur:3};
const SETTLE = {cost:{holz:4, nahrung:6, toepfe:1}, people:4, keep:4};   // settlers by outrigger: what they take, how many go, how many must stay
const PROVIANT_PER_DAY = 2, MANA_PER_COLONY = 8;   // a voyage eats 2 provisions a day; each new colony after the first needs 8 more standing

/* What people use up, per resident and minute. Level 1 families need food; a village (from 20) pots, from 30 mats;
   a chief's village (level 3) also bark cloth, pigs and shell valuables. Pots come from high islands, mats from atolls. */
const NEEDS = [
  {k:'nahrung', lvl:1, from:0, rate:1.25, hint:{hoch:'Lege Tarofelder an oder pflanze Brotfruchtbäume.', atoll:'Baue Fischgestelle am Strand.'}},
  {k:'toepfe', lvl:2, from:20, rate:.1, hint:{hoch:'Baue eine Töpferei am Ton.', atoll:'Töpfe gibt es nur auf hohen Inseln. Schick sie mit einem Kanu her.'}},
  {k:'matten', lvl:2, from:30, rate:.1, hint:{hoch:'Matten gibt es nur auf Atollen. Schick sie mit einem Kanu her.', atoll:'Baue eine Flechthütte bei den Pandanus.'}},
  {k:'tapa', lvl:3, from:40, rate:.1, hint:{hoch:'Baue einen Maulbeergarten und daneben eine Klopfhütte.', atoll:'Tapa kommt von hohen Inseln. Schick es mit einem Kanu her.'}},
  {k:'schweine', lvl:3, from:40, rate:.04, hint:{hoch:'Baue einen Schweinepferch.', atoll:'Schweine kommen von hohen Inseln. Schick sie mit einem Kanu her.'}},
  {k:'schmuck', lvl:3, from:40, rate:.02, hint:{hoch:'Muschelschmuck entsteht auf Atollen oder kommt als Gegengabe vom Clan vom Riff.', atoll:'Baue eine Schmuckschleiferei am Strand. Sie braucht Klingen.'}}
];
const LEVEL_NAMES = ['', 'Weiler', 'Dorf', 'Häuptlingsdorf'];
const CHIEF = {pop:40, mana:20, cap:6};   // what it takes to become a chief's village, and the room per house there

/* Standing (mana) comes from feasts and gifts and fades slowly */
const FEASTS = [
  {id:'klein', n:'Kleines Fest', cost:{nahrung:12, toepfe:2}, mana:5},
  {id:'gross', n:'Großes Fest', cost:{schweine:4, nahrung:15, tapa:2}, mana:15}
];
const FEAST_PAUSE = 45, FEAST_LEN = 12, MANA_FADE = 30;   // ticks between feasts on one island, how long it lasts, ticks per point lost

/* Gifts to other clans: what a good is worth, the return comes later and grows with trust (knots) */
const VALUE = {nahrung:.2, holz:.3, proviant:1, toepfe:1, beile:1.5, klingen:2, matten:1, schnur:1, tapa:2, schweine:3, schmuck:6};
const CLANS = {
  feuer:{name:'Clan vom Feuerberg', on:'vulkan', makes:['klingen', 'schweine'], wants:['matten', 'schnur', 'schmuck'], pop:30},
  riff:{name:'Clan vom Riff', on:'atoll', makes:['schmuck', 'matten'], wants:['toepfe', 'beile', 'klingen'], pop:22}
};
const giftValue = (C, cargo) => Object.entries(cargo).reduce((s, [k, v]) => s + v * VALUE[k] * (C.wants.includes(k) ? 1.5 : C.makes.includes(k) ? .3 : 1), 0);
const returnRate = knots => Math.min(1.2, .6 + .06 * knots);
/* What a clan sends back for a debt: their most valuable good first, as soon as the debt covers one, the rest in the cheaper one */
function returnGoods(C, worth){
  const cargo = {}; let left = worth, load = 0;
  const ks = C.makes.slice().sort((a, b) => VALUE[b] - VALUE[a]);
  ks.forEach((k, i) => { const q = Math.min(LOAD - load, Math.max(left >= VALUE[k] ? 1 : 0, Math.floor(left / (ks.length - i) / VALUE[k]))); if (q > 0){ cargo[k] = q; load += q; left -= q * VALUE[k]; } });
  return {cargo, left, load};
}

const costOf = (kind, I) => { const c = KINDS[kind].cost; return (c.hoch || c.atoll) ? (c[I.type] || {}) : c; };
const canPay = (I, c) => Object.entries(c).every(([k, v]) => (I.stock[k] || 0) >= v);
const lacking = (I, c) => { const m = Object.entries(c).find(([k, v]) => (I.stock[k] || 0) < v); return m ? GN[m[0]] : ''; };
const pay = (I, c, f = 1) => { for (const [k, v] of Object.entries(c)) I.stock[k] = Math.max(0, (I.stock[k] || 0) - v * f); };
const amount = (k, v) => `${v} ${v === 1 ? G1[k] : GN[k]}`;
const costText = c => { const e = Object.entries(c); return e.length ? e.map(([k, v]) => amount(k, v)).join(' + ') : 'nichts'; };
const emptyStock = () => Object.fromEntries(GOODS.map(k => [k, 0]));
