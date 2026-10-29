'use strict';
/* Goods, buildings and costs */

const TICK = 2000, DAY = 3, AGE_FULL = 150, LOAD = 12, SAVE_KEY = 'polinusa-2';

const GOODS = ['holz','nahrung','toepfe','beile','matten','schnur'];
const GN = {holz:'Holz', nahrung:'Essen', toepfe:'Töpfe', beile:'Steinbeile', matten:'Matten', schnur:'Schnur'};
const G1 = {holz:'Holz', nahrung:'Essen', toepfe:'Topf', beile:'Steinbeil', matten:'Matte', schnur:'Schnur'};
const KINDS = {
  haus:{n:'Haus', s:'Haus', on:['hoch','atoll'], cost:{hoch:{holz:2}, atoll:{holz:1, toepfe:1}}, r:10, hy:12, cap:4, roof:true, info:'+4 Bewohner', vb:'-17 -29 34 33'},
  taro:{n:'Tarofeld', s:'Taro', on:['hoch'], cost:{holz:1}, r:10, hy:0, prod:'nahrung', every:2, info:'Bringt alle 4 Sekunden Essen.', vb:'-13 -11 26 22'},
  fisch:{n:'Fischgestell', s:'Fisch', on:['atoll'], cost:{holz:1}, r:8, hy:4, prod:'nahrung', every:2, info:'Bringt alle 4 Sekunden Essen.', vb:'-12 -14 26 18'},
  toepfer:{n:'Töpferei', s:'Töpfe', on:['hoch'], cost:{holz:2}, r:11, hy:6, prod:'toepfe', every:3, roof:true, info:'Brennt alle 6 Sekunden einen Topf. Ton gibt es nur auf hohen Inseln.', vb:'-16 -17 34 21'},
  beil:{n:'Beilwerkstatt', s:'Beile', on:['hoch'], cost:{holz:2}, r:11, hy:6, prod:'beile', every:4, roof:true, info:'Schleift alle 8 Sekunden ein Steinbeil. Guter Stein liegt nur auf hohen Inseln.', vb:'-18 -17 36 21'},
  flecht:{n:'Flechthütte', s:'Matten', on:['atoll'], cost:{holz:1}, r:10, hy:6, prod:'matten', every:3, roof:true, info:'Flicht alle 6 Sekunden eine Matte aus Pandanus. Für Segel und zum Schlafen.', vb:'-17 -17 34 21'},
  schnur:{n:'Seilerei', s:'Schnur', on:['atoll'], cost:{holz:1}, r:10, hy:6, prod:'schnur', every:3, roof:true, info:'Dreht alle 6 Sekunden Schnur aus Kokosfasern.', vb:'-14 -17 30 21'},
  werft:{n:'Kanuhaus', s:'Kanuhaus', on:['hoch'], cost:{holz:4}, r:16, hy:6, max:1, coast:true, roof:true, info:'Hier entstehen die Kanus. Es steht am Strand.', vb:'-21 -19 44 24'},
  pfahl:{n:'Pfahlhaus', s:'Pfahlhaus', on:['hoch','atoll'], cost:{holz:3}, r:11, hy:18, cap:4, water:true, roof:true, info:'+4 Bewohner. Steht in der Lagune.', vb:'-17 -34 34 37'},
  speicher:{n:'Speicher', s:'Speicher', on:['hoch','atoll'], cost:{holz:2}, r:8, hy:12, store:10, roof:true, info:'+10 Platz für jede Ware.', vb:'-12 -28 24 30'},
  halle:{n:'Versammlungshaus', s:'Dorfhaus', on:['hoch'], cost:{holz:6}, r:19, hy:16, max:1, cap:6, roof:true, info:'Das Herz des Dorfes. +6 Bewohner.', vb:'-21 -34 42 37'},
  palme:{n:'Kokospalme', s:'Palme', on:['hoch','atoll'], cost:{}, r:5, hy:10, beach:true, plant:true, info:'Kostet nichts.', vb:'-13 -25 26 28'},
  baum:{n:'Brotfruchtbaum', s:'Baum', on:['hoch'], cost:{}, r:7, hy:9, prod:'nahrung', every:6, plant:true, info:'Bringt alle 12 Sekunden etwas Essen.', vb:'-10 -21 20 23'},
  pandanus:{n:'Pandanus', s:'Pandanus', on:['atoll'], cost:{}, r:5, hy:9, beach:true, plant:true, info:'Kostet nichts.', vb:'-10 -21 20 23'}
};
const ORDER = ['haus','taro','fisch','toepfer','beil','flecht','schnur','werft','pfahl','speicher','halle','palme','baum','pandanus'];
const CANOE = {holz:6, beile:2, matten:3, schnur:3};
/* What people use up, per resident and minute. Food always, pots from 20 residents, mats from 40.
   Pots come only from high islands, mats only from atolls, so a growing village needs the other kind of island. */
const NEEDS = [
  {k:'nahrung', from:0, rate:1.25, hint:{hoch:'Lege Tarofelder an oder pflanze Brotfruchtbäume.', atoll:'Baue Fischgestelle.'}},
  {k:'toepfe', from:20, rate:.1, hint:{hoch:'Baue eine Töpferei.', atoll:'Töpfe gibt es nur auf hohen Inseln. Schick sie mit einem Kanu her.'}},
  {k:'matten', from:40, rate:.1, hint:{hoch:'Matten gibt es nur auf Atollen. Schick sie mit einem Kanu her.', atoll:'Baue eine Flechthütte.'}}
];
const SETTLE = {cost:{holz:4, nahrung:6, toepfe:1}, people:4, keep:4};   // settlers by outrigger: what they take, how many go, how many must stay

const costOf = (kind, I) => { const c = KINDS[kind].cost; return (c.hoch || c.atoll) ? (c[I.type] || {}) : c; };
const canPay = (I, c) => Object.entries(c).every(([k, v]) => (I.stock[k] || 0) >= v);
const lacking = (I, c) => { const m = Object.entries(c).find(([k, v]) => (I.stock[k] || 0) < v); return m ? GN[m[0]] : ''; };
const pay = (I, c, f = 1) => { for (const [k, v] of Object.entries(c)) I.stock[k] = Math.max(0, (I.stock[k] || 0) - v * f); };
const costText = c => { const e = Object.entries(c); return e.length ? e.map(([k, v]) => `${v} ${v === 1 ? G1[k] : GN[k]}`).join(' + ') : 'nichts'; };
