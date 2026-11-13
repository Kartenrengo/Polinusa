'use strict';
/* Game logic: economy, building sites, people, input, main loop and start */

/* ---------- settling, clans and gifts (the canoes themselves live in fleet.js) */
const routeIndex = (a, b) => routes.findIndex(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
/* Each colony after the first two needs more standing: people follow a chief they respect */
const manaNeeded = () => Math.max(0, islands.filter(I => I.settled).length - 2) * MANA_PER_COLONY;
/* Settlers land: the island gets its first house and a cord to where they came from */
function settle(T, S, o){
  T.discovered = true; T.settled = true; T.pop = o.pop; T.lvl = 1; T.stock = {...emptyStock(), ...o.stock}; T.people = (o.folk || []).slice(0, o.pop); syncPeople(T);
  // only what came in the canoe grows here; the wild is as the island kept it
  T.life = []; T.wild = wildOf(T); const fresh = landLife(T, {life:o.life || []}, true);
  if (S) T.mot = Object.fromEntries(motifsOf(S).map(k => [k, tick]));   // and their patterns, in the pots they carry
  const r = rng(T.center.x | 0);
  if (!T.buildings.length){
    if (T.atoll) seedAtollPlants(T, r);
    else { palmsAlong(T, r, 16);
      // the breadfruit shoots from the canoe are set out first and grow up by themselves
      for (let i = 0; i < 3; i++){ const a = r() * TAU, p = {x:T.center.x + Math.cos(a) * 64, y:T.center.y + Math.sin(a) * 46}; if (!check('baum', T, p.x, p.y)) addB(T, 'baum', p, {scale:fx(.9 + r() * .15)}, tick).bt = KINDS.baum.bt; } }
  }
  // the first house is built from the wood and fronds the canoe brought (settleFrom checks there is enough)
  const hs = findSpot(T, 'haus', homeSpot(T)); if (hs){ addB(T, 'haus', hs, variant('haus'), tick); pay(T, costOf('haus', T)); placePlaza(T, hs); }
  if (S && routeIndex(S.id, T.id) < 0) routes.push({a:S.id, b:T.id, knots:1, lastGift:tick, plan:{a:{}, b:{}}});
  renderAll(); setActive(T.id); renderBuildBar(); flyTo(T.center.x, T.center.y, 1.3); save(); checkQuest();
  toast(`Auf ${T.name} steht das erste Haus.${S ? ` Eine Schnur führt nach ${S.name}.` : ''} ${fresh.length ? `Mitgebracht: ${andList(fresh.map(id => LIFE[id].n))}.` : 'Noch ohne Setzlinge: Fischer, Kokos und Wild nähren die Leute.'}${(T.stock.wasser || 0) < 4 ? ' Zuerst Wasser: ' + (T.atoll ? 'ein Brunnen oder grüne Nüsse vom Erntehaus.' : T.river ? 'eine Quelle oder grüne Nüsse vom Erntehaus.' : 'grüne Nüsse vom Erntehaus.') : ''}`, 5200);
}
const giftWorth = (T, cargo) => giftValue(T.clan, cargo) * (kin(T) ? KIN_GIFT : 1) * (1 + .1 * Math.min(2, bondsWith(T)));   // shared patterns and marriages make gifts count for more
/* A gift is not paid for. The clan remembers it and answers later with what they make; trust (knots) makes the answer richer. */
function receiveGift(T, cargo, from, r){
  const C = T.clan, worth = giftWorth(T, cargo);
  T.debt = (T.debt || 0) + worth * returnRate(r.knots);
  r.knots = Math.min(12, r.knots + 1 + (cargo.schmuck ? 1 : 0)); r.lastGift = tick; stats.gaben++;
  T.lastFrom = from; if (!(T.returnAt > tick)) T.returnAt = tick + 15 + Math.round(Math.random() * 10);
  mana += Math.min(4, Math.round(worth / 4)) + 1; invalidate();
  toast(`${clanDer(C)} ${C.culture ? 'nehmen' : 'nimmt'} eure Gabe an. Die Gegengabe kommt später. ${r.knots} Knoten Vertrauen.`, 4200);
}
function answerGifts(){
  for (const T of islands){
    if (!T.clan || !T.discovered || !(T.debt >= 1) || tick < (T.returnAt || 0) || !isl(T.lastFrom)) continue;
    const {cargo, left, load} = returnGoods(T.clan, T.debt);
    if (!load){ T.returnAt = 0; continue; }
    T.debt = Math.max(0, left); T.returnAt = T.debt >= 1 ? tick + 20 : 0;
    // another people answers with what only they have: bananas from the Great Land, the star paths of the north
    const C = T.clan, life = C.life && !lifeKnown(C.life) ? [C.life] : [];
    if (C.teach === 'nav' && !stats.nordLehre){ stats.nordLehre = 1; loreCache = null; if (lifeLog) lifeLog.nav.push({id:'nord', t:`die Sternwege vom Nordmeer`}); else toast(`${C.name} lehren eure Navigatoren ihre Sternwege. Euer Wissen reicht eine Stufe weiter.`, 5200); }
    clanShip(T, T.lastFrom, cargo, false, life);
  }
}

/* ---------- people. Every resident is a figure: the workers at their places, those without work about the village,
   children and the old. You see them close up only, but the work goes on when you look away. */
/* What each kind of work looks like (see workFx). Every activity has at least two looks, taken in turn, one per bout:
   the field is dug and the taro lifted, the pot built up in coils, beaten with paddle and anvil and stamped with the toothed
   stamp of Lapita, the bark peeled and beaten, the nut husked and opened. */
const WORK_FX = {hakenmacher:['drill', 'file'], schnitzer:['hollow', 'polish'], yams:['dig', 'mound'], umu:['leaf', 'stones', 'wrap'], kalkbrenner:['pound', 'fire'],
  kurkumagarten:['dig', 'lift'], huehnerhof:['feed', 'eggs'], weberin:['weave', 'strip'], malerin:['paint', 'rub'], duftoel:['stir', 'squeeze'], harzer:['tap', 'scrape'],
  quelle:['water', 'pour'], brunnen:['water', 'pour'], sternhaus:['stars', 'point'], ernte:['husk', 'split'], oelhuette:['grate', 'squeeze'], bananen:['cut', 'trim'],
  taro:['dig', 'lift'], pulaka:['dig', 'mulch'], kavagarten:['dig', 'pound'], toepfer:['pot', 'paddle', 'stamp'], beil:['grind', 'chip'], klingen:['knap', 'flake'],
  flecht:['weave', 'strip'], schnur:['cord', 'braid'], klopf:['beat', 'peel'], schmuck:['drill', 'polish'], pferch:['feed', 'herd'], gaergrube:['leaf', 'wrap'],
  pansammler:['pick', 'gather'], pflanzer:['plant', 'tamp']};
/* the looks of the other kinds of work: in the forest, up the palm, in the shallows, at the fishers' hut, after a dive */
const JOB_FX = {chop:['chop', 'wedge'], pull:['pull', 'coil'], climb:['climb', 'twist'], wade:['scoop', 'grope'], tie:['thatch', 'lash'], mend:['braid', 'thatch']};
const FISH_FX = {net:['net', 'gut'], spear:['spear', 'stalk'], hang:['hang', 'turn']}, DIVE_FX = ['wring', 'coil'];
const CLIMB_FX = new Set(['climb', 'twist']);
/* one look after the other, now and then one skipped, so neighbours do not move in step */
const lookOf = (L, w) => Array.isArray(L) ? L[(w.lk = (w.lk || 0) + 1 + (Math.random() < .25 ? 1 : 0)) % L.length] : L;
const SIT_FX = new Set(['stars', 'pot', 'grind', 'knap', 'weave', 'cord', 'drill', 'pound', 'husk', 'grate', 'paint', 'stir', 'net', 'file', 'polish', 'hollow', 'strip', 'rub', 'squeeze', 'braid', 'peel',
  'paddle', 'stamp', 'flake', 'chip', 'wrap', 'fire', 'gut', 'burn', 'wring', 'sand', 'split', 'stringshow', 'string', 'garland', 'story', 'drum', 'doze', 'nod', 'clap', 'kava', 'chat', 'eat', 'fan'])
const JOB_LOAD = {hakenmacher:'muschel', schnitzer:'schale', umu:'paket', kalkbrenner:'stein', kurkumagarten:'taro', huehnerhof:'eier', weberin:'matte', malerin:'tapa', duftoel:'schale', pansammler:'frucht', harzer:'schale', quelle:'schale', brunnen:'schale', bananen:'frucht', ernte:'nuss', oelhuette:'schale', taro:'taro', pulaka:'taro', kavagarten:'taro', baum:'frucht', fisch:'fisch', toepfer:'topf', beil:'stein', flecht:'matte', schnur:'rolle', gaergrube:'paket', klingen:'obsidian', klopf:'tapa', pferch:'taro', schmuck:'muschel'};
/* what someone carries from a place that gets what is needed: the load follows the pick */
const PICK_LOAD = {kokos:'nuss', wasser:'schale', dach:'matte', holz:'holz', fisch:'fisch', meeres:'muschel', muschel:'muschel', steine:'stein'};
const landOf = (I, p) => I.lands.indexOf(landAt(I, p));
const landOfB = (I, b) => b._lk === b.x + b.y ? b._l : (b._lk = b.x + b.y, b._l = landOf(I, b));   // buildings stay put, so this is kept
const lived = I => I.settled || (I.clan && I.discovered);
const popOf = I => I.settled ? I.pop : I.clan ? I.clan.pop : 0;
const rnd = r => (Math.random() - .5) * 2 * r;
/* What one worker at a place does: builders fetch wood and fronds from the store and then build, the canoe builders too,
   fishers first carve their canoe, at the woodcutter one swings the adze while the other pulls the trunk aside with a
   rope, at the Erntehaus one climbs the palms while the other husks the nuts below, planters carry a sapling, fishers
   go out together, everyone else works at the place and carries what it makes to the store now and then. */
function jobFor(I, b, i){
  const K = KINDS[b.kind], side = i % 2 ? -1 : 1, job = (type, x, y, more) => ({key:type + ':' + b.id + '#' + i, type, b, i, x, y, ...more});
  if (HOME_KINDS.has(b.kind) && !b.bt) return job(I.storm && I.storm.tie && tick < I.storm.at ? 'tie' : 'mend', b.x + side * (K.r * .6), b.y + 4, {});   // a storm is coming: the roof tied down; else a worn roof covered anew
  if (b.bt) return job('site', b.x + 6 * side, b.y + 5, {tool:groundSite(b.kind) ? 'ko' : 'toki'});   // a field is dug with the digging stick, a house built with the adze
  if (b.kind === 'werft' && I.yard){ const h = yardSpot(b); return job('yard', h.x + (i - 1) * 7, h.y + 3, {tool:'toki'}); }
  if (b.boat > 0){ const h = dugSpot(b); return job('carve', h.x + 3 - i * 6, h.y + 2, {tool:'toki'}); }
  if (b.kind === 'faeller'){ const t = b.cutAt && b.cutAt.st === 0 && I.trees.includes(b.cutAt) ? b.cutAt : nearestTree(I, b); return t ? (i % 2 ? job('pull', t.x - 7, t.y + 2, {tree:t}) : job('chop', t.x + 4, t.y + 3, {load:'holz', tool:'toki', tree:t})) : job('wait', b.x + 5 * side, b.y + 6, {tool:'toki'}); }
  if (b.kind === 'ernte' && i % 2 === 0){ const pl = palmFor(I, b); if (pl) return job('climb', pl.x + 1.5, pl.y + 2, {palm:pl, load:PICK_LOAD[prodOf(b)] || 'nuss', drop:{x:b.x + 4, y:b.y + 5}}); }
  if (b.kind === 'pflanzer'){ const t = b.plantAt && b.plantAt.st === 2 ? b.plantAt : null; return job('plant', b.x, b.y + 4, {drop:t ? {x:t.x + 3, y:t.y + 2} : {x:b.x + 26, y:b.y + 8}, load:'setzling', tool:'ko'}); }
  if (b.kind === 'fisch') return job('fish', b.x + 3 * side, b.y + 4, {load:'fisch', tool:'speer'});
  if (b.kind === 'taucher') return job('dive', b.x + 3 * side, b.y + 5, {load:'muschel'});
  if (b.kind === 'sternhaus') return job('learn', b.x + 11, b.y + 5, {});
  return job('carry', b.x + side * (3 + 2 * i), b.y + 4, {load:(K.picks ? PICK_LOAD[prodOf(b)] : JOB_LOAD[b.kind]) || null, tool:catOf(b) === 'essen' && b.kind !== 'ernte' ? 'ko' : null});
}
/* the tree the woodcutters work on, the nearest first; the palm a climber goes up next, one after the other */
const nearestTree = (I, b) => treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0] || null;
const palmsNear = (I, b) => I.buildings.filter(q => q.kind === 'palme' && !q.bt && Math.hypot(q.x - b.x, q.y - b.y) < KINDS[b.kind].near.r).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
function palmFor(I, b){ const P = palmsNear(I, b).slice(0, 6); return P.length ? P[(b._pi || 0) % P.length] : null; }
const yardSpot = b => ({x:b.x + 11, y:b.y + 12});
/* Reef gatherers stay in the shallows, a few steps off the beach */
function wadeSpot(I, b){
  const w = waterNear(I, b), L = I.lands.reduce((m, q) => polyDist(w, q.poly) < polyDist(w, m.poly) ? q : m), s = nearestOn(L.poly, w), d = Math.hypot(w.x - s.x, w.y - s.y) || 1;
  return {x:s.x + (w.x - s.x) / d * 5, y:s.y + (w.y - s.y) / d * 5};
}
const dugSpot = b => b.kind === 'steg' ? {x:b.x + 2, y:b.y + 7} : {x:b.x - 9, y:b.y + 7};
/* A clan's village: its people carry from their workshops, about one figure for six people */
function clanJobs(I){
  const jobs = []; for (const b of I.buildings) if (JOB_LOAD[b.kind] && !b.bt) jobs.push({key:'carry:' + b.id, type:'carry', b, x:b.x, y:b.y + 4, load:JOB_LOAD[b.kind]});
  return jobs.slice(0, Math.round(popOf(I) / 6));
}
/* ---------- the lagoon: stilt houses, fish traps and workplaces on an islet without houses are reached by dugout.
   Each jetty has one dugout and serves four of them, the oldest first. A jetty serves only once its dugout is carved. */
function lagoonOf(I){
  const key = I.buildings.map(b => b.bt ? 0 : b.x + b.y + (b.boat > 0 ? .5 : 0)).join();
  if (I._lg && I._lg.key === key) return I._lg;
  const homes = new Set(I.buildings.filter(b => !b.bt && (b.kind === 'haus' || b.kind === 'halle')).map(b => landOf(I, b)));
  const far = b => !!I.atoll && !KINDS[b.kind].water && !!KINDS[b.kind].crew && homes.size > 0 && !homes.has(landOf(I, b));
  const need = I.buildings.filter(b => !b.bt && (KINDS[b.kind].water || far(b)));
  const jetties = I.buildings.filter(b => b.kind === 'steg' && !b.bt && !(b.boat > 0));
  return I._lg = {key, need, jetties, served:new Set(need.slice(0, jetties.length * KINDS.steg.serves)), far:new Set(need.filter(far))};
}
const unserved = (I, b) => { const lg = lagoonOf(I); return lg.need.includes(b) && !lg.served.has(b); };
/* ---------- work force. Every grown-up works, children and the old do not. Each person has a place (homes.js); whoever
   builds is missing there and goes back once the site is done. */
const WORK_SHARE = .7;
const workers = I => I.people ? I.people.filter(isAdult).length : Math.round(I.pop * WORK_SHARE);
const builders = I => 1 + Math.floor(I.pop / 10);   // sites worked at the same time
const catOf = b => { const K = KINDS[b.kind]; return ['nahrung', 'kokos', 'wasser', 'speisen', 'eier'].includes(K.prod) ? 'essen' : K.prod === 'fisch' || K.prod === 'meeres' ? 'meer' : b.kind === 'faeller' || b.kind === 'pflanzer' ? 'holz' : b.kind === 'steg' || b.kind === 'werft' || b.kind === 'sternhaus' ? 'boot' : 'handwerk'; };
const capOf = b => KINDS[b.kind].crew || 0;
/* staff() is in homes.js: work goes by family */
/* the work is handed out anew every tick, and at once when something changes it: people, buildings, sites, the canoe house,
   the way work is given out; a change of someone's place by hand clears the cache itself (I.staff = null) */
const staffKey = I => { let a = 0, s = 0, d = 0; if (I.people) for (const p of I.people) if (isAdult(p)) a++; for (const b of I.buildings){ if (b.bt) s++; if (b.boat > 0) d++; } return tick + '|' + I.pop + '|' + a + '|' + I.buildings.length + '|' + s + '|' + d + '|' + (I.yard ? 1 : 0) + (I.handWork ? 1 : 0) + '|' + famsOf(I).length; };
const staffOf = I => I.staff && I.staff.key === staffKey(I) ? I.staff : staff(I);
const activeSites = I => staffOf(I).sites;
const crewAt = (I, b) => staffOf(I).crew.get(b) || 0;
function storeNear(I, p){
  // the nearest store or meeting house on the same piece of land, else a house there; on an atoll the lagoon is in the way,
  // so only when there is none they paddle over to another islet
  const L = landOf(I, p), st = I.buildings.filter(b => !b.bt && (b.kind === 'speicher' || b.kind === 'halle')), hs = I.buildings.filter(b => !b.bt && b.kind === 'haus');
  const pool = [st.filter(b => landOfB(I, b) === L), hs.filter(b => landOfB(I, b) === L), st, hs].find(l => l.length);
  if (!pool) return null;
  const b = pool.reduce((m, q) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(m.x - p.x, m.y - p.y) ? q : m);
  return {x:b.x + rnd(5), y:b.y + 4 + Math.random() * 4};
}
/* What builders work on: a building site, the canoe at the canoe house, or a dugout. The material comes first: each
   builder carries one piece from the store, wood and fronds and cord, and the work only gets as far as what is already
   there. Building goes as work in pairs does: one holds the post while the other lashes it, alone it is slow. */
const siteNeed = (I, b) => Object.values(costOf(b.kind, I)).reduce((t, v) => t + v, 0);
// what a builder carries to a site: wood, fronds, cord, or for a field the shoots to set
const siteLoad = (I, b) => { if (KINDS[b.kind].soil) return 'setzling'; const c = costOf(b.kind, I), got = b.got || 0; let n = 0; for (const [k, v] of Object.entries(c)){ n += v; if (got < n) return k === 'holz' ? 'holz' : k === 'dach' ? 'matte' : k === 'schnur' || k === 'faser' ? 'rolle' : 'paket'; } return 'holz'; };
function workOf(I, j){
  let W = null;
  if (j.type === 'site' && j.b.bt) W = {o:j.b, f:'bt', all:KINDS[j.b.kind].bt, need:siteNeed(I, j.b), crew:SITE_CREW};
  else if (j.type === 'yard' && I.yard) W = {o:I.yard, f:'left', all:SHIPS[I.yard.kind].bt, need:SHIPS[I.yard.kind].cost.holz || 0, crew:YARD_CREW};
  else if (j.type === 'carve' && j.b.boat > 0) W = {o:j.b, f:'boat', all:KINDS[j.b.kind].canoe, need:0, crew:KINDS[j.b.kind].crew || 1};
  if (W && W.o.got == null) W.o.got = Math.max(0, Math.ceil(W.need * (1 - W.o[W.f] / W.all) - 1e-6));   // a site from an older game
  return W;
}
const BUILD_JOBS = new Set(['site', 'yard', 'carve']);
const woodFloor = W => W.need ? W.all * (1 - Math.min(1, W.o.got / W.need)) : 0;
const woodOnWay = (I, j) => walkers.reduce((t, w) => t + (w.isl === I.id && w.job && w.job.type === j.type && w.job.b === j.b && (w.leg === 'fetch' || w.leg === 'bring') ? 1 : 0), 0);
/* Who is really there: a worker counts once they have reached their place */
function presentAt(I){
  const m = new Map(); for (const w of walkers) if (w.isl === I.id && (w.on || w.asleep) && w.job) m.set(w.job.b, (m.get(w.job.b) || 0) + 1);   // asleep counts as at work: the night changes nothing in the stores
  return m;
}
/* ---------- people as figures. On your islands every resident is one: each worker stands for one place at one workplace;
   when work moves, the same person walks over. The rest of the grown-ups have no work and stroll about, children play,
   the old sit in front of the houses. Only in a very big village do some stay at home. */
const MAX_FIG = 60, ANC_NAMED = 20;
const ancCount = I => I.ahnenN || (I.ahnen || []).length;
const PEOPLE_NAMES = ['Tama', 'Hina', 'Manu', 'Lupe', 'Fetu', 'Lagi', 'Vai', 'Niu', 'Ula', 'Talo', 'Moana', 'Nalu', 'Pua', 'Toa', 'Ata', 'Ao', 'Kula', 'Mahina', 'Tane', 'Ika', 'Fala', 'Tui', 'Sina', 'Lani', 'Kai', 'Ola', 'Rua', 'Tasi', 'Koa', 'Lea', 'Hoku', 'Malu', 'Fai', 'Rehu', 'Tiare', 'Nohea', 'Siva'];
let nameNo = 0, initSync = false;
/* ---------- the people themselves. Every resident of your villages is a person with a name, a birth and a span of life.
   Children grow up in six years and then work; from forty they are old, and between 44 and 58 they die and join the
   ancestors. A year on the islands is twelve minutes, so close up you see children grow, and coming back after a day a
   generation has passed. Newcomers are born to the village or move in; children are often named after an ancestor, as is
   done across Polynesia. In a chief's village the eldest leads, and the line of chiefs is remembered, as chiefly
   genealogies were recited. With an ancestor house the dead lend the clan their standing, as at Teouma, where the Lapita
   people took up the skulls of their dead and laid them anew. */
const CHILD_Y = 6, OLD_Y = 40, MORE_NAMES = ['Ngaru', 'Hau', 'Marama', 'Ahi', 'Ua', 'Masina', 'Matagi', 'Sau', 'Tala', 'Hiva', 'Kahu', 'Atea', 'Fetu', 'Moe', 'Rongo', 'Tavake', 'Ngaio', 'Peka', 'Uru', 'Vailea', 'Toki', 'Lino', 'Tiki', 'Ono', 'Fiti'];
const ageOf = p => (tick - p.b) / YEAR, stageOf = p => { const a = ageOf(p); return a < CHILD_Y ? 'kid' : a < OLD_Y ? 'adult' : 'old'; };
let nextPid = 1, lifeLog = null;   // lifeLog: while missed time is made up, births and deaths are counted here
function person(I, age, name, sex){
  const pool = PEOPLE_NAMES.concat(MORE_NAMES);
  return {id:nextPid++, n:name || pool[Math.floor(Math.random() * pool.length)], b:tick - Math.round(age * YEAR), l:Math.round((44 + Math.random() * 14) * YEAR), a:age >= CHILD_Y ? 1 : 0, s:sex || (Math.random() < .5 ? 'f' : 'm'), h:0};
}
/* a village's first people: mostly grown-ups, some children, a few old ones */
function seedPeople(I, n){ if (I.settled) return seedFamilies(I, n); const P = []; for (let i = 0; i < n; i++){ const k = i % 7; P.push(person(I, k === 4 ? 1 + Math.random() * 6 : k === 6 ? 40 + Math.random() * 6 : 14 + Math.random() * 24)); } return P; }
/* someone new: a child born into a family house, of its mother's line, often with an ancestor's name; otherwise a
   grown-up from elsewhere with a line of their own */
function newcomer(I){
  const g = I._growTo && findB(I._growTo), f = g && famOfHome(I, g);
  if (I._birth && f){
    const mother = membersOf(I, f).filter(p => p.s === 'f' && isAdult(p)).sort((a, b) => b.b - a.b)[0] || membersOf(I, f)[0];
    const anc = I.ahnen || [], name = anc.length && Math.random() < .4 ? anc[Math.floor(Math.random() * anc.length)][0] : null;
    const p = person(I, 0, name); p.ln = mother ? mother.ln : 0; weakBirth(I, p); lifeEvent(p, 'geb'); lifeEvent(mother, 'kind', p.n);
    if (lifeLog) lifeLog.born++; else if (I.id === active && !p.wk) note(`${famName(f)} hat ein Kind bekommen: ${p.n}.`);
    return p;
  }
  if (lifeLog) lifeLog.came++;
  const p = person(I, 14 + Math.random() * 20); p.ln = newLine(p.n, 'von weit her'); lifeEvent(p, 'kam', 'von weit her'); return p;
}
/* the number of people is what the economy counts; the records follow it: the newest arrive, those who leave go */
function syncPeople(I){
  if (!I.settled) return;
  if (!I.people) I.people = seedPeople(I, I.pop);
  while (I.people.length < I.pop){ const p = newcomer(I); placePerson(I, p); I.people.push(p); }
  while (I.people.length > I.pop){
    // those without a roof go first, then a grown-up of the biggest family; the married stay with their family
    const roof = new Set(famsOf(I).filter(f => f.home).map(f => f.id)), ad = I.people.filter(p => stageOf(p) === 'adult' && !p.w);
    const out = I.people.filter(p => !roof.has(p.h)), size = p => I.people.filter(q => q.h === p.h).length;
    const crowd = I._leaveFrom ? I.people.filter(p => p.h === I._leaveFrom && !p.w && stageOf(p) !== 'kid') : [];
    const list = crowd.length ? crowd : out.length && (I._leaveRoofless || !ad.length) ? out : ad.length ? ad.sort((a, b) => size(b) - size(a)).slice(0, 3) : I.people;
    const p = list[Math.floor(Math.random() * list.length)]; I.people.splice(I.people.indexOf(p), 1);
  }
  I._leaveRoofless = false;
  syncFamilies(I);
}
const isAdult = p => stageOf(p) === 'adult';
/* Growing up, growing old, dying, and the chief */
function lifeTick(I){
  if (!I.settled || !I.people) return;
  let changed = false;
  for (const p of I.people.slice()){
    if (!p.a && ageOf(p) >= CHILD_Y){ p.a = 1; changed = true; if (lifeLog) lifeLog.grown++; else if (I.id === active) note(`${p.n} ist erwachsen und kann jetzt arbeiten.`); }
    if (tick - p.b < p.l || I.pop <= 2) continue;
    // a death: the name goes to the ancestors; with an ancestor house the dead add to the clan's standing
    const lore0 = (p.nv || 0) >= 1 ? navLore().lvl : 0;
    I.people.splice(I.people.indexOf(p), 1); I.pop--; changed = true; loreCache = null;
    if (lore0 && navLore().lvl < lore0){ const msg = `Mit ${p.n} ist Wissen der Navigatoren verloren: ${NAV_N[lore0]}. Ein Schüler im Haus der Navigatoren muss es neu lernen.`; if (lifeLog) lifeLog.lost.push(p.n); else toast(msg, 5200); }
    const chief = I.chief === p.id, house = I.buildings.some(b => b.kind === 'ahnenhaus' && !b.bt);
    (I.ahnen = I.ahnen || []).push([p.n, p.b, tick, chief ? 1 : 0]); I.ahnenN = (I.ahnenN || I.ahnen.length - 1) + 1; if (I.ahnen.length > ANC_NAMED) I.ahnen.shift();   // the last ones by name, the rest counted
    if (house) mana += chief ? 3 : 1;
    if (chief) I.chief = 0;
    if (lifeLog) lifeLog.died.push(p.n);
    else toast(`${chief ? 'Häuptling ' : ''}${p.n} ist mit ${Math.floor(ageOf(p))} Jahren gestorben. ${house ? 'Im Ahnenhaus wacht der Schädel nun über das Dorf.' : `${I.name} bestattet ${p.n} bei den Ahnen.`}`, 4200);
  }
  // in a chief's village the eldest who is not a child leads
  // the matriarch and the chief: the eldest woman and the eldest man of the chief's family
  { const f = chiefFam(I), m = f && eldest(I, f, 'f'); I.mat = m ? m.id : 0; }
  if (I.lvl === 3 && !I.people.some(p => p.id === I.chief)){
    const f = chiefFam(I), c = f && (eldest(I, f, 'm') || eldest(I, f, 'f'));
    if (c){ lifeEvent(c, 'haupt'); I.chief = c.id; (I.chiefs = I.chiefs || []).push(c.n); if (lifeLog) lifeLog.chiefs.push(c.n); else toast(`${c.n} ist jetzt Häuptling von ${I.name}.`, 3600); changed = true; }
  }
  if (changed){ I.staff = null; if (!lifeLog) syncWalkers(); }
}
/* ---------- navigators. Their knowledge lives in people (p.nv, a level and its fraction) and dies with them. In the house of
   the navigators one learns from the best other navigator of the island: up to one level beyond the master, fast where
   the master already knows it, slowly where it is new. How far anyone can get depends on what the clan has seen at sea:
   level 2 after three new islands, level 3 after seven or once land beyond the Weite See is found. The levels:
   1 the swells and the birds that fly out from land at dawn and home at dusk, 2 the clouds that stand over land, the
   lagoon showing green on their underside, 3 the star path: on the open sea provisions last longer and one sees further. */
const NAV_N = ['', 'Wellen und Vögel', 'Wolken über Land', 'Sternenpfad'];
const navCap = () => { const n = newLand(), far = islands.some(I => I.discovered && I.center.x > FAR_X); return Math.min(3, (n >= 7 || far ? 3 : n >= 3 ? 2 : 1) + (stats.nordLehre ? 1 : 0)); };   // the seafarers of the north teach one level more
let loreCache = null;
function navLore(){
  if (loreCache && loreCache.t === tick) return loreCache;
  let best = null, lvl = 0;
  for (const I of islands) if (I.settled && I.people) for (const p of I.people){ const l = Math.floor(p.nv || 0); if (l > lvl){ lvl = l; best = {p, I}; } }
  return loreCache = {t:tick, lvl, best};
}
/* who learns in the house: the one sent to the stones, or the one who learnt last, or the grown-up who knows most and can
   still go further. Whoever has reached what the best teacher can give makes room, so the knowledge passes to a second head. */
function navPupil(I, H){
  const P = I.people || [], top = q => P.reduce((m, r) => r === q ? m : Math.max(m, Math.floor(r.nv || 0)), 0), goal = q => Math.min(navCap(), top(q) + 1);
  const alive = id => P.find(p => p.id === id && isAdult(p)), can = q => q && (q.nv || 0) < goal(q), at = walkers.find(w => w.isl === I.id && w.job && w.job.b === H);
  const p = [at && alive(at.pid), alive(H.pupil)].find(can) || P.filter(q => isAdult(q) && can(q)).sort((a, b) => (b.nv || 0) - (a.nv || 0) || b.b - a.b)[0] || alive(H.pupil) || null;
  return p ? {p, master:top(p), goal:goal(p), who:P.filter(q => q !== p).sort((a, b) => (b.nv || 0) - (a.nv || 0))[0]} : null;
}
function navTick(I, n = 1){
  const H = I.buildings.find(b => b.kind === 'sternhaus' && !b.bt); if (!H || !I.people || !crewAt(I, H)) return;
  const L = navPupil(I, H); if (!L) return;
  const {p, master, goal} = L, now = p.nv || 0; H.pupil = p.id;
  if (now >= goal) return;
  const lvl0 = Math.floor(now), lore0 = navLore().lvl;
  p.nv = Math.min(goal, now + n * (I.str === 'navigator' ? 1.5 : 1) / ((master > lvl0 ? 3 : 6) * YEAR));
  if (Math.floor(p.nv) > lvl0){
    loreCache = null;
    lifeEvent(p, 'nav', NAV_N[Math.floor(p.nv)]);
    if (lifeLog){ const t = `${p.n} (${NAV_N[Math.floor(p.nv)]})`, e = lifeLog.nav.find(x => x.id === p.id); if (e) e.t = t; else lifeLog.nav.push({id:p.id, t}); }   // each one once, with the level reached
    else toast(`${p.n} ist jetzt Navigator: ${NAV_N[Math.floor(p.nv)]}.${navLore().lvl > lore0 ? ' ' + navGain(navLore().lvl) : ''}`, 4600);
  }
}
const navGain = l => l === 1 ? 'Jetzt liest man die Dünung, die sich an fernem Land bricht, und folgt den Vögeln weiter hinaus.' : l === 2 ? 'Jetzt sieht man auch die Wolken, die über fernem Land stehen.' : 'Auf dem Sternenpfad reicht der Proviant länger, und das Doppelkanu sieht weiter.';
/* Finding land without a chart, as the voyagers did: seabirds that fly out from land at dawn and home at dusk, seen by
   everyone close to the known sea; the swell that bends and breaks around an island, read by a navigator, who also
   follows the birds further out; a cloud that stands still over land, from the second level on. */
const navRange = L => L >= 2 ? 1150 : L >= 1 ? 800 : 450;
let hintCache = null;
function navHints(){
  const L = navLore().lvl;
  if (hintCache && hintCache.t > tick - 10 && hintCache.l === L) return hintCache.list;
  const range = navRange(L), list = [];
  for (const I of islands){
    if (I.discovered) continue;
    let d = Infinity; for (const h of fogHoles) d = Math.min(d, Math.hypot(I.center.x - h.cx, I.center.y - h.cy) - Math.max(h.rx, h.ry));
    if (d < range) list.push({I, near:fogHoles.reduce((m, h) => Math.hypot(I.center.x - h.cx, I.center.y - h.cy) < Math.hypot(I.center.x - m.cx, I.center.y - m.cy) ? h : m, fogHoles[0]), cloud:L >= 2, swell:L >= 1});
  }
  return (hintCache = {t:tick, l:L, list}).list;
}
/* the sea next to the known one is rolled in advance, so the birds have somewhere to fly from */
function rollAhead(){
  const L = navLore().lvl;
  const r = navRange(L);
  for (const h of fogHoles) for (let cy = Math.floor((h.cy - h.ry - r) / CELL); cy <= Math.floor((h.cy + h.ry + r) / CELL); cy++) for (let cx = Math.floor((h.cx - h.rx - r) / CELL); cx <= Math.floor((h.cx + h.rx + r) / CELL); cx++) ensureCell(cx, cy, true);
}
const voyageDay = () => Math.round(VOYAGE_DAY * (navLore().lvl >= 3 ? 1.4 : 1));
/* ---------- the brought world. Taro, breadfruit, paper mulberry, kava and pigs live on an island only where people have
   brought them in a canoe; the home island and the clans have them all, and so do villages from older saves. */
const lifeOf = I => I.life || (I.clan ? LIFE_IDS : I.settled ? LIFE_BASE : []);
const lifeKnown = id => LIFE[id].late ? hawaiki() : !LIFE[id].from || islands.some(J => J.settled && (J.life || LIFE_BASE).includes(id));   // bananas only once another people has given them, kava with Hawaiki
const hasLife = (I, kind) => { const l = KINDS[kind].life; return !l || lifeOf(I).includes(l); };
const lifeFits = (I, id) => LIFE[id].kinds.some(k => KINDS[k].on.includes(I.type));   // would it grow here at all
const lifeMissing = (I, kind) => { const L = LIFE[KINDS[kind].life]; return `Auf ${I.name} gibt es ${L.no}. Bring ${L.s} im Kanu mit.`; };
const andList = a => a.length > 1 ? `${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}` : a[0] || '';
/* A canoe lands what it carries alive: what is new to the island takes root there, pigs that are not needed for breeding go
   into the store, plants the island has already go back into its gardens. Returns what is new. */
function landLife(I, s, quiet){
  if (!s.life || !s.life.length) return [];
  const L = I.life || (I.life = lifeOf(I).slice()), fresh = [];
  for (const id of s.life){
    if (!L.includes(id) && lifeFits(I, id)){ L.push(id); fresh.push(id); continue; }
    for (const [g, v] of Object.entries(LIFE[id].take || {})) I.stock[g] = Math.min(storeCap(I), (I.stock[g] || 0) + v);
  }
  s.life = [];
  if (fresh.length){
    stats.brought = (stats.brought || 0) + fresh.length;
    const can = fresh.flatMap(id => LIFE[id].kinds.filter(k => KINDS[k].on.includes(I.type) && unlocked(k)).map(k => KINDS[k].n));
    if (!quiet) toast(`Neu auf ${I.name}: ${andList(fresh.map(id => LIFE[id].n))}.${can.length ? ` Jetzt lässt sich ${andList(can)} anlegen.` : ''}`, 4600);
    if (I.id === active) renderBuildBar();
  }
  return fresh;
}

/* ---------- wild food: birds and their eggs, megapodes, turtles, fruit bats and land crabs on an island no one has hunted
   yet. Grown-ups without work gather it, much at first and less as it grows scarce. It comes back slowly, slower still
   where the rats that came in the canoes eat the eggs. Hunted below a third, the first kinds die out for good, as they did
   on Tonga and Fiji within a few generations of the first settlers; below an eighth the next. A tapu spares the rest. */
const WILD_G = .002, WILD_AT = [.3, .12], WILD_PER = 72;   // regrowth, where kinds die out, ticks per food a gatherer needs in untouched wild
const wildK = I => I.type === 'atoll' ? 420 : 560;   // how much the wild of an island holds, in food: three or four gatherers it bears for good
const wildOf = I => I.wild ?? (I.id === 'heimat' || I.clan ? .25 : 1);
const goneOf = I => I.gone ?? (I.id === 'heimat' ? 1 : 0);   // on the home island the first kinds went long ago
const wildKeep = I => 1 - .3 * goneOf(I);
const foragers = I => !I.settled || I.tapu || wildOf(I) < .03 || (I.stock.wild || 0) >= storeCap(I) ? 0 : staffOf(I).free;
/* The wild by the year: in the rains the turtles come up the beaches to lay their eggs and the seabirds nest, in the lean
   time there is little; on an atoll the turtles and birds count for even more */
const wildSeason = I => { const id = seasonOf().id, a = I && I.type === 'atoll'; return id === 'sturm' ? (a ? 1.6 : 1.4) : id === 'mager' ? .7 : 1; };
const forageRate = I => foragers(I) * wildOf(I) * wildKeep(I) * wildSeason(I) / WILD_PER * PER_MIN;   // food per minute
const wildWord = W => W > .7 ? 'reich' : W > .45 ? 'weniger' : W > .25 ? 'knapp' : W > .1 ? 'fast leer' : 'leer';
const EXTINCT = {
  hoch:['Die Großfußhühner, die ihre Eier in warmer Erde vergruben, sind ausgestorben.', 'Die Riesenleguane und die großen Tauben sind fort, für immer.'],
  atoll:['Die Seevögel brüten hier nicht mehr in Kolonien.', 'Die Meeresschildkröten kommen nicht mehr zum Eierlegen an den Strand.']
};
function wildTick(I, n = 1){
  const F = foragers(I), K = wildK(I), g = WILD_G * (I.settled ? .5 : 1), keep = wildKeep(I);   // where people live, the rats they brought eat eggs and seeds: the wild comes back slowly
  let W = wildOf(I), got = I._wf || 0;
  const sea = wildSeason(I);
  for (let i = 0; i < n; i++){ const y = F * W / WILD_PER; got += y * keep * sea; W = clamp(W - y / K + g * Math.max(W, .03) * (1 - W), 0, 1); }
  I.wild = W;
  // a tapu the elders laid while you were away is lifted once the wild has come back
  if (I.tapuAway && W > .7 && !lifeLog){ I.tapu = I.tapuAway = false; I.staff = null; note(`Auf ${I.name} hat sich das Wild erholt. Die Ältesten heben ihr Tapu auf.`); }
  const whole = Math.min(Math.floor(got), Math.max(0, storeCap(I) - (I.stock.wild || 0))); I._wf = got - Math.floor(got);
  if (whole > 0) I.stock.wild = (I.stock.wild || 0) + whole;
  WILD_AT.forEach((at, i) => { if (W < at && goneOf(I) < i + 1){ I.gone = i + 1; extinct(I, i + 1); } });
  return whole;
}
function extinct(I, lvl){
  const t = EXTINCT[I.type === 'atoll' ? 'atoll' : 'hoch'][lvl - 1];
  if (lifeLog) lifeLog.gone.push(`${I.name}: ${t}`);
  else toast(`${I.name}: ${t}${lvl === 1 ? ' Was zu viel gejagt wird, fehlt den Enkeln. Ein Tapu auf das Wild schont den Rest.' : ''}`, 6000);
  invalidate();
}
function setTapu(I, on){
  I.tapu = on; I.tapuAway = false; I.staff = null; save();
  toast(on ? `Tapu auf das Wild von ${I.name}: Niemand jagt, das Wild erholt sich.` : `Das Tapu auf ${I.name} ist aufgehoben. Wer keine Arbeit hat, sammelt wieder.`, 4600);
}
/* Children from three and the old without a household craft gather dry wood at the forest edge (on an atoll driftwood and
   dry fronds along the beach) and carry a bundle home: Brennholz for the hearths, once there is a hearth or an earth oven.
   It burns after the coconut shells and before the wood the woodcutters fell. */
const GATHER = {rate:.12, age:3, atoll:.7};
const gatherOn = I => I.settled && (I.stock.reisig || 0) < storeCap(I);   // every house burns a fire at night (fireTick)
const canGather = p => { const st = stageOf(p); return st === 'kid' ? ageOf(p) >= GATHER.age : st === 'old' && !p.job; };
const gatherers = I => gatherOn(I) ? (I.people || []).filter(canGather).length : 0;
const gatherRate = I => gatherers(I) * GATHER.rate * (I.type === 'atoll' ? GATHER.atoll : 1);   // per minute
function gatherTick(I, n = 1){
  const g = (I._gg || 0) + gatherRate(I) / PER_MIN * n, whole = Math.min(Math.floor(g), Math.max(0, storeCap(I) - (I.stock.reisig || 0)));
  I._gg = g - Math.floor(g); if (whole > 0) I.stock.reisig = (I.stock.reisig || 0) + whole;
}
/* where someone without work goes gathering: into the forest to the nests, or along the shore for eggs and crabs */
function forageSpot(I, w){
  const L = I.lands[landOf(I, w)]; if (!L) return null;
  if (Math.random() < .5){ for (let k = 0; k < 6; k++){ const t = I.trees[Math.floor(Math.random() * I.trees.length)]; if (t && t.st === 0 && landAt(I, t) === L) return {x:t.x + rnd(6), y:t.y + 7}; } }
  const v = L.poly[Math.floor(Math.random() * L.poly.length)], c = L._c || (L._c = L.poly.reduce((m, q) => ({x:m.x + q.x / L.poly.length, y:m.y + q.y / L.poly.length}), {x:0, y:0}));
  return {x:v.x + (c.x - v.x) * .1, y:v.y + (c.y - v.y) * .1};
}

/* ---------- patterns on the pots (see MOTIFS). An island's own pattern comes with its first pottery, a clan has its own;
   the others it knows came with pots and are kept with the tick they last came. */
const motifOf = I => I.clan ? I.clan.motif : I.motif || null;
const motifsOf = I => { const o = motifOf(I), m = Object.keys(I.mot || {}).filter(k => k !== o); return o ? [o, ...m] : m; };
const motifFrom = k => islands.find(J => (J.settled || J.clan) && motifOf(J) === k);
const kin = T => { const m = T.mot || {}; return islands.some(I => I.settled && I.motif && m[I.motif] != null); };   // a clan stamping one of your patterns
function newMotif(I){
  const clans = new Set([...Object.values(CLANS), ...Object.values(CULTURES)].map(C => C.motif).filter(Boolean)), ids = Object.keys(MOTIFS).filter(k => !clans.has(k)), used = new Set(islands.filter(J => J.settled).map(motifOf).filter(Boolean)), free = ids.filter(k => !used.has(k));   // the clans' patterns stay theirs
  I.motif = I.id === 'heimat' && !used.has('gesicht') ? 'gesicht' : (free.length ? free : ids)[(I.center.x | 0) % (free.length || ids.length)];
  if (I.mot) delete I.mot[I.motif];
  mana += 2; invalidate();
  if (lifeLog) lifeLog.mot.push(`${MOTIFS[I.motif].n}, das eigene Muster von ${I.name}`);
  else toast(`Die Töpfer von ${I.name} stempeln ein eigenes Muster in den Ton: ${MOTIFS[I.motif].n}. Wohin ihre Töpfe kommen, dahin wandert es. Ansehen +2.`, 5200);
}
/* pots arrive: the patterns they carry are known here from now on, and the ones known already are fresh again */
function bringMotifs(from, to){
  if (!from || !to || from === to || !(to.settled || to.clan)) return [];
  const m = to.mot || (to.mot = {}), got = [];
  for (const k of motifsOf(from)){ if (k === motifOf(to)) continue; if (m[k] == null) got.push(k); m[k] = tick; }
  if (!got.length) return got;
  mana += got.length; stats.muster = (stats.muster || 0) + got.length; invalidate();
  const txt = andList(got.map(k => MOTIFS[k].n));
  if (lifeLog) lifeLog.mot.push(`${txt} nach ${to.name}`);
  else toast(to.clan ? `${clanDer(to.clan)} ${to.clan.culture ? 'stempeln' : 'stempelt'} jetzt auch ${txt} in ${to.clan.culture ? 'ihre' : 'seine'} Töpfe und schätzt eure Gaben mehr. Ansehen +${got.length}.` : `Auf ${to.name} stempeln sie jetzt auch ${txt}, wie auf den Töpfen aus ${from.name}. Ansehen +${got.length}.`, 4800);
  return got;
}
function motifTick(I){
  if (I.settled && !I.motif && I.buildings.some(b => b.kind === 'toepfer' && !b.bt)) newMotif(I);
  // whoever married in from a clan that makes pots keeps stamping the pattern of home
  for (const p of I.people || []){ const T = p.f && isl(p.f), k = T && T.clan && T.clan.motif; if (k && k !== motifOf(I)){ if (!(I.mot || (I.mot = {}))[k]) bringMotifs(T, I); I.mot[k] = tick; } }
  for (const [k, t] of Object.entries(I.mot || {})){
    if (k === motifOf(I) || tick - t <= MOTIF_YEARS * YEAR) continue;
    delete I.mot[k]; invalidate();
    if (lifeLog) lifeLog.fade.push(`${MOTIFS[k].n} auf ${I.name}`);
    else if (I.settled) note(`Auf ${I.name} ist das Muster ${MOTIFS[k].n} vergessen. Seit zwei Jahren kamen keine Töpfe damit.`);
  }
}

/* ---------- marriage between peoples. A wedding binds two clans: bride gifts of fine mats and a pig go across, the partner
   moves to the other village, and as long as the couple lives the cord does not slacken, gifts count for more, the in-laws
   come to the feast as guests, and a potter who married in keeps stamping the pattern of home. So the Lapita villages
   stayed bound to each other, and so, as the genes still tell, they married into the old peoples of the Great Land. */
const BRIDE_GIFTS = {matten:2, schweine:1}, WED_KNOTS = 3, KIN_YEARS = 40;
const FOREIGN_NAMES = {alte:['Kaimo', 'Waiyu', 'Biromo', 'Siwan', 'Tamugu', 'Ilaga', 'Owari', 'Nupa'], nord:['Malo', 'Sapi', 'Rilo', 'Fena', 'Lahi', 'Kiri', 'Toma', 'Ulai']};
const inlawsOf = T => (T.inlaws || []).filter(x => tick - x.at < KIN_YEARS * YEAR);   // yours who went to live with them
const bondsWith = T => islands.reduce((n, I) => n + (I.settled && I.people ? I.people.filter(p => p.w === T.id && !p.f).length : 0), 0) + inlawsOf(T).length;
const canWed = p => isAdult(p) && !p.w && ageOf(p) >= 16 && ageOf(p) <= 34;
const clanOfRoute = r => isl(r.a).clan ? isl(r.a) : isl(r.b).clan ? isl(r.b) : null;
function weddingIsland(T){
  const ends = routes.filter(r => r.a === T.id || r.b === T.id).map(r => isl(r.a === T.id ? r.b : r.a)).filter(I => I && I.settled);
  return ends.find(I => I.id === active) || ends[0] || null;
}
function weddingCheck(T){
  const r = routes.find(q => q.a === T.id || q.b === T.id), I = weddingIsland(T);
  if (!r || !I) return {why:'Erst braucht es eine Schnur zu ihnen.'};
  if (r.knots < WED_KNOTS) return {why:`Erst braucht es ${WED_KNOTS} Knoten Vertrauen, jetzt sind es ${r.knots}.`};
  const p = (I.people || []).filter(q => canWed(q) && q.id !== I.chief).sort((a, b) => b.b - a.b)[0];   // the youngest grown-up who is free, never the chief
  if (!p) return {why:`Auf ${I.name} ist gerade niemand frei, der heiraten könnte.`};
  if (I.pop >= popCap(I)) return {why:`Auf ${I.name} ist kein Platz für noch jemanden.`};
  if (!canPay(I, BRIDE_GIFTS)) return {why:`Für die Brautgaben fehlt ${lacking(I, BRIDE_GIFTS)} auf ${I.name}.`};
  return {ok:true, I, p, r};
}
function wedClan(T){
  const c = weddingCheck(T); if (!c.ok) return false;
  const {I, p, r} = c, C = T.clan, pool = FOREIGN_NAMES[C.id] || PEOPLE_NAMES.concat(MORE_NAMES), name = pool[Math.floor(Math.random() * pool.length)];
  pay(I, BRIDE_GIFTS);
  const q = person(I, 18 + Math.random() * 8, name, p.s === 'f' ? 'm' : 'f'); Object.assign(q, {w:T.id, f:T.id, sp:p.n, ln:'c' + T.id}); Object.assign(p, {w:T.id, sp:q.n}); lifeEvent(p, 'hoch', q.n); lifeEvent(q, 'kam', clanVom(C)); lifeEvent(q, 'hoch', p.n);   // the partner brings a line of their own
  I.people.push(q); I.pop++; I.staff = null;
  r.knots = Math.min(12, r.knots + 2); r.lastGift = tick; mana += 4; stats.heirat = (stats.heirat || 0) + 1; if (C.culture) stats.fremdheirat = (stats.fremdheirat || 0) + 1;
  if (C.motif) bringMotifs(T, I);   // the pots of the new family's home come along
  I.feastEnd = tick + 6; for (let i = 0; i < 6; i++) heartAt(I);   // the whole village gathers to dance
  syncWalkers(); invalidate(); save();
  toast(`Hochzeit auf ${I.name}: ${p.n} heiratet ${q.n} ${clanVom(C)}. ${q.n} zieht nach ${I.name} und bringt eine neue Linie mit. Jetzt seid ihr verwandt. Ansehen +4.`, 6800);
  return true;
}
/* a whole family leaves the island, children and all */
const HUNGER_GO = 3;   // mornings in a row with too little before a family packs up (see mealTick)
const leaverOf = I => famsOf(I).filter(q => q.id !== chiefFam(I)?.id).sort((a, b) => b.id - a.id)[0];
function famLeaves(I, why){
  const f = leaverOf(I); if (!f) return;
  const m = new Set(membersOf(I, f).map(p => p.id)); I.people = I.people.filter(p => !m.has(p.id)); I.pop = I.people.length; syncPeople(I); I.staff = null; syncWalkers();
  stats.fortgezogen = (stats.fortgezogen || 0) + 1;
  if (!awayQuiet){ toast(`${famName(f)} fährt fort: kein ${GN[why]}.`, 3600); sfx('leave'); }
}
/* a quiet message: into the list of the conch, without unrolling */
function note(msg){ news.unshift({msg, at:Date.now()}); if (news.length > 40) news.length = 40; if (newsOpen()) renderNews(); else { unread++; newsBadge(); } }

function spawnFig(I, homes, role, at, p){
  const h = homes[Math.floor(Math.random() * homes.length)], n = nameNo++;
  const w = {isl:I.id, name:p ? p.n : PEOPLE_NAMES[(n * 7 + (I.center.x | 0)) % PEOPLE_NAMES.length], look:figureLook(p ? p.id * 7919 + 13 : n * 7919 + I.center.x | 0) + (p && p.tt ? 't' : ''), pid:p ? p.id : 0, role, child:role === 'kid', old:role === 'old',
    x:h.x + 4, y:h.y + 5, tx:h.x + 4, ty:h.y + 5, job:null, leg:'free', carry:null, wait:Math.random() * 800, phase:0, left:false, moving:false, on:false, bout:false};
  // at the start everyone is already about the village
  const q = at || (initSync && homes[Math.floor(Math.random() * homes.length)]);
  if (q){ w.x = w.tx = q.x + rnd(8); w.y = w.ty = q.y + 5 + Math.random() * 4; }
  walkers.push(w); return w;
}
function setJob(I, w, j){
  if (w.play) endPlay(w);   // new work ends free time: the walk to the work must not be overwritten when the game is over
  if (w.mate && w.mate.ride === w){ w.mate.ride = null; w.mate.boat = false; }
  Object.assign(w, {job:j, role:'work', carry:null, bout:false, busy:null, fx:null, rest:false, sit:false, boat:false, fishing:0, glean:0, under:0, catch:[], wait:0, forage:0, ride:null, mate:null});
  if (initSync){ w.on = true; w.leg = 'work'; w.wait = Math.random() * 1500; return; }   // already at work
  w.on = false; w.leg = 'go'; goTo(I, w, j.x, j.y);
}
function freeFig(w){ if (w.mate && w.mate.ride === w){ w.mate.ride = null; w.mate.boat = false; } Object.assign(w, {job:null, role:'idle', on:false, leg:'free', carry:null, bout:false, busy:null, boat:false, fishing:0, glean:0, under:0, catch:[], forage:0, gather:0, ride:null, mate:null}); }
function syncWalkers(){
  for (const I of islands){
    const mine = walkers.filter(w => w.isl === I.id);
    const homes = lived(I) ? I.buildings.filter(b => !KINDS[b.kind].water && (KINDS[b.kind].roof || b.kind === 'platz') && !b.bt && !b.at) : [];   // without a roof people stay by the plaza
    if (!homes.length){ if (mine.length) walkers = walkers.filter(w => w.isl !== I.id); I.inside = 0; continue; }
    if (I.settled){ syncFolk(I, homes, mine); continue; }
    let slots = [], idle, kids, old;
    if (I.settled){
      const sf = staffOf(I);
      for (const [b, n] of sf.crew) for (let i = 0; i < n; i++) slots.push(jobFor(I, b, i));
      const rest = Math.max(0, I.pop - sf.total); idle = sf.free; kids = Math.round(rest * .6); old = rest - kids;
    } else { slots = clanJobs(I); const p = popOf(I); idle = Math.max(1, Math.round(p / 9)); kids = clamp(Math.round(p / 9), 0, 4); old = Math.min(2, Math.round(p / 15)); }
    // a very big village: some stay in their houses, the old first
    let over = slots.length + idle + kids + old - MAX_FIG; I.inside = Math.max(0, over);
    const cut = n => { const d = clamp(over, 0, n); over -= d; return n - d; };
    old = cut(old); idle = cut(idle); kids = cut(kids); if (over > 0) slots.length -= over;
    const keep = new Set(), want = new Map(slots.map(j => [j.key, j])), loose = [];
    for (const w of mine){ if (w.child || w.old) continue; const j = w.job && want.get(w.job.key); if (j){ w.job = j; want.delete(j.key); keep.add(w); } else loose.push(w); }
    // a new place takes someone who has just lost theirs, from the same place if there is one, else the nearest, so you see them walk over
    for (const j of want.values()){
      let bi = -1, bd = Infinity;
      loose.forEach((w, i) => { const d = (w.job && w.job.b === j.b ? 0 : 1e6) + Math.hypot(w.x - j.x, w.y - j.y); if (d < bd){ bd = d; bi = i; } });
      const w = bi >= 0 ? loose.splice(bi, 1)[0] : spawnFig(I, homes, 'work', initSync && j);
      setJob(I, w, j); keep.add(w);
    }
    for (let i = 0; i < idle; i++){ const w = loose.shift() || spawnFig(I, homes, 'idle'); if (w.role !== 'idle') freeFig(w); keep.add(w); }
    const fit = (list, n, role) => { list.slice(0, n).forEach(w => keep.add(w)); for (let i = list.length; i < n; i++) keep.add(spawnFig(I, homes, role)); };
    fit(mine.filter(w => w.child), kids, 'kid'); fit(mine.filter(w => w.old), old, 'old');
    if (mine.some(w => !keep.has(w))) walkers = walkers.filter(w => w.isl !== I.id || keep.has(w));   // the dead and those who left go, even when others came at the same time
  }
  syncCritters();
}
/* Your villages: one figure for each person, workers at their places, the rest about the village */
function syncFolk(I, homes, mine){
  syncPeople(I);
  const sf = staffOf(I);
  // a very big village: some stay in their houses, the old first, then children, then those without work
  const stage = new Map(I.people.map(p => [p.id, stageOf(p)])), order = I.people.slice().sort((a, b) => ({adult:0, kid:1, old:2})[stage.get(a.id)] - ({adult:0, kid:1, old:2})[stage.get(b.id)]);
  const shown = new Set(order.slice(0, MAX_FIG).map(p => p.id)); I.inside = I.people.length - shown.size;
  const byPid = new Map(), keep = new Set(), pidJob = new Map();
  for (const [b, ids] of sf.crewP || []) ids.forEach((id, i) => pidJob.set(id, jobFor(I, b, i)));
  for (const w of mine){ if (w.pid && shown.has(w.pid) && !byPid.has(w.pid)) byPid.set(w.pid, w); }
  for (const p of I.people){
    if (!shown.has(p.id)) continue;
    const st = stage.get(p.id), w = byPid.get(p.id) || spawnFig(I, homes, st === 'adult' ? 'idle' : st, null, p);
    w.name = p.n; keep.add(w);
    if (st === 'kid' || (st === 'old' && !pidJob.has(p.id))){ if (w.job || w.role !== st) freeFig(w); w.role = st; w.child = st === 'kid'; w.old = st === 'old'; }
    else { w.child = false; w.old = st === 'old'; if (w.role === 'kid' || w.role === 'old') freeFig(w); }   // an old one at the household craft walks there like the rest
  }
  // each place is worked by the people of the family sent there: the figure of each person walks to their own place
  const adults = [...keep].filter(w => !w.child && (!w.old || pidJob.has(w.pid)));
  for (const w of adults){
    const j = pidJob.get(w.pid);
    if (!j){ if (w.job || w.role !== 'idle') freeFig(w); continue; }
    if (w.job && w.job.key === j.key){ w.job = j; continue; }
    if (initSync){ w.x = w.tx = j.x + rnd(6); w.y = w.ty = j.y + rnd(3); } setJob(I, w, j);
  }
  if (mine.some(w => !keep.has(w))) walkers = walkers.filter(w => w.isl !== I.id || keep.has(w));   // the dead and those who left go, even when others came at the same time
}
function spawnWalkers(){ walkers = []; critters = []; initSync = true; try { syncWalkers(); } finally { initSync = false; } }
/* Who someone is and what they do, for a tap on a figure */
const personOf = w => { const I = isl(w.isl); return w.pid && I.people ? I.people.find(p => p.id === w.pid) : null; };
const whoIs = w => { const p = personOf(w), I = isl(w.isl), f = p && famOf(I, p.h); return p ? `${I.mat === p.id ? 'Matriarchin ' : I.chief === p.id ? 'Häuptling ' : ''}${p.n}, ${Math.floor(ageOf(p))} Jahre${p.tt ? ', mit Tatau' : ''}${f ? ` · ${famName(f)}${f.home ? '' : ', ohne Dach'}` : ''}` : w.name; };
function whatDoes(w){
  const I = isl(w.isl), j = w.job;
  if (w.asleep || w.toBed) return w.asleep ? 'schläft' : 'geht schlafen';
  if (j && w.play) return `${KINDS[j.b.kind].n} · Feierabend, ${PLAY[w.play.k].n}`;
  const pl = w.play && !j ? ' · ' + PLAY[w.play.k].n : '';
  if (w.gather) return `${w.child ? 'Kind' : 'alt'} · ${w.gather === 3 ? 'bringt Brennholz heim' : 'sammelt Brennholz'}`;
  if (w.child) return 'Kind' + pl; if (w.old && !j) return 'alt, arbeitet nicht mehr' + pl; if (!j && pl) return 'hat gerade frei' + pl; if (!j) return foragers(isl(w.isl)) ? (w.forage ? 'sammelt Eier, Krebse und Vögel' : 'hat keine Arbeit und sammelt im Wald und am Strand') : 'hat gerade keine Arbeit';
  const K = KINDS[j.b.kind], way = j.type === 'dive' && w.under ? 'taucht' : j.type === 'dive' && w.leg === 'spot' ? 'wacht im Kanu und hält die Schnur' : j.type === 'dive' && w.leg === 'work' && w.strain > 2 ? 'ruht nach vielen Tauchgängen' : !w.on ? 'auf dem Weg' : w.leg === 'fetch' ? 'holt Holz' : w.leg === 'bring' ? 'bringt Holz' : w.fishing ? 'fischt' : w.boat ? 'auf dem Wasser' : w.leg === 'store' && w.carry && j.type !== 'plant' ? 'bringt es ins Lager' : '';
  if (j.type === 'tie' || j.type === 'mend') return `${K.n} · ${!w.on ? 'auf dem Weg' : j.type === 'tie' ? 'bindet das Dach fest' : 'deckt das Dach neu'}`;
  const what = j.type === 'site' ? `Bau ${K.n}` : j.type === 'yard' && I.yard ? `Kanuhaus, ${SHIPS[I.yard.kind].n}` : j.type === 'carve' ? `${K.n}, schnitzt den Einbaum` : K.n;
  return what + (way ? ' · ' + way : '');
}
function hitWalker(p){
  if (cam.z <= PEOPLE_Z) return null;
  let best = null, bd = Math.max(4, 12 / cam.z);
  for (const w of walkers){ if (!isl(w.isl).settled) continue; const d = Math.hypot(p.x - w.x, p.y - (w.y - 5)); if (d < bd){ bd = d; best = w; } }
  return best;
}
let markW = null, markUntil = 0;   // the person you tapped wears a small mark for a while
/* ---------- the animals the Lapita settlers brought in their canoes: pigs, dogs and chickens. They roam the village. */
let critters = [];
const CRITTER = {dog:{v:.011, wait:[900, 2800], r:36}, chicken:{v:.005, wait:[300, 1500], r:26}, pig:{v:.0032, wait:[1600, 4200], r:30}};
function syncCritters(){
  for (const I of islands){
    const mine = critters.filter(a => a.isl === I.id), homes = lived(I) ? I.buildings.filter(b => !b.bt && (b.kind === 'haus' || b.kind === 'halle')) : [];
    const pens = lived(I) ? I.buildings.filter(b => b.kind === 'pferch' && !b.bt).length : 0, pop = popOf(I);
    const want = homes.length ? {dog:clamp(Math.ceil(pop / 12), 1, 3), chicken:clamp(Math.ceil(pop / 6), 1, 6), pig:Math.min(4, pens + (I.clan ? 1 : 0))} : {dog:0, chicken:0, pig:0};
    for (const kind of Object.keys(CRITTER)){
      const have = mine.filter(a => a.kind === kind);
      for (let i = have.length; i < want[kind]; i++){ const h = homes[Math.floor(Math.random() * homes.length)]; critters.push({isl:I.id, kind, home:h, x:h.x + (Math.random() - .5) * 12, y:h.y + 7, tx:h.x, ty:h.y + 7, wait:Math.random() * 2000, left:Math.random() < .5, moving:false, phase:0, peck:0}); }
      if (have.length > want[kind]){ const drop = new Set(have.slice(want[kind])); critters = critters.filter(a => !drop.has(a)); }
    }
  }
  critters = critters.filter(a => { const I = isl(a.isl); return !!I && I.buildings.includes(a.home); });
}
function stepCritters(dt){
  for (const a of critters){
    const C = CRITTER[a.kind]; a.moving = false;
    if (a.wait > 0){ a.wait -= dt; if (a.kind === 'chicken' && a.peck <= 0 && Math.random() < dt / 600) a.peck = 260; a.peck -= dt; continue; }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
    if (d < 1){
      const I = isl(a.isl), L = landOf(I, a.home); let p = null;
      // now and then a dog trots after someone
      if (a.kind === 'dog' && Math.random() < .4){ const w = walkers.find(q => q.isl === a.isl && !q.boat && !q.paddle && Math.hypot(q.x - a.x, q.y - a.y) < 70); if (w) p = {x:w.x - 6, y:w.y + 2}; }
      for (let i = 0; !p && i < 6; i++){ const q = {x:a.home.x + (Math.random() - .5) * 2 * C.r, y:a.home.y + 7 + (Math.random() - .5) * C.r}; if (landOf(I, q) === L) p = q; }
      if (p && landOf(I, p) === L){ a.tx = p.x; a.ty = p.y; }
      a.wait = C.wait[0] + Math.random() * (C.wait[1] - C.wait[0]); continue;
    }
    const v = Math.min(d, dt * C.v); a.x += dx / d * v; a.y += dy / d * v; a.moving = true; a.left = dx < 0; a.phase += v * 1.6;
  }
}
/* Where to next. Wherever the way leaves the land, across a lagoon or a bay, they paddle a dugout; a few steps into
   the shallows at either end they wade. */
function goTo(I, w, x, y, wait = 0){
  w.tx = x; w.ty = y; w.wait = wait; w.sx = w.x; w.sy = w.y; w.swim = false;
  w.paddle = !w.boat && wetWay(I, w, {x, y});
}
function wetWay(I, a, b){
  const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < 24) return false;
  for (let s = 10; s < d - 10; s += 6){ const f = s / d; if (!landAt(I, {x:a.x + (b.x - a.x) * f, y:a.y + (b.y - a.y) * f})) return true; }
  return false;
}
/* Fishers: out past the shallows, where nothing but water lies between */
function fishingSpot(I, L, b){
  const a0 = Math.atan2(L.y - b.y, L.x - b.x);   // away from the beach
  for (let i = 0; i < 10; i++){
    const a = a0 + (Math.random() - .5) * 2.2, d = 22 + Math.random() * 34, p = {x:L.x + Math.cos(a) * d, y:L.y + Math.sin(a) * d * .8};
    if ([.25, .5, .75, 1].every(f => !landAt(I, {x:L.x + (p.x - L.x) * f, y:L.y + (p.y - L.y) * f}))) return p;
  }
  return {x:L.x + rnd(8), y:L.y + rnd(5)};
}
const HOOK = {per:8, more:1.5};   // a shell hook lasts for about eight fish; with hooks a catch is half as big again
/* What the fishers bring in: two in the canoe bring a full catch, with nets twice the fish, after the rāhui three times;
   one alone with the spear a single fish. The reef gives less where it has been gleaned bare or is silted up. */
function landCatch(I, b, crew, k){
  const K = KINDS[b.kind]; b.idle = workState(I, b); if (b.idle) return 0;
  const reef = I.reefLife ?? 1, rf = k === 'fisch' ? (reef > .3 ? 1 : .7) : reef > .55 ? 1 : reef > .3 ? .7 : .4, silt = k === 'fisch' ? 1 : [1, .8, .6][erosionOf(I)];
  const hook = k === 'fisch' && (I.stock.haken || 0) > 0;   // with hooks of shell the line catches more
  let n = crew >= 2 ? ((K.picks && K.picks[k]) || {out:2}).out * (k === 'fisch' && tooled(I, K) ? 2 : 1) * (hook ? HOOK.more : 1) : hook ? 2 : 1;
  n *= rf * silt * (I.rahuiDone === yearOf() && festivalTime() ? 3 : 1);
  // fish and sea food are a day's meal now: what a trip brings adds up over the trips (see DAILY)
  if (dailyPace(k) > 1){ b._cf = (b._cf || 0) + n / dailyPace(k); n = Math.floor(b._cf); b._cf -= n; } else n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
  const reefPer = dailyPace(k);   // the reef feels a portion as much as six fish before
  let got = 0;
  while (got < n && (I.stock[k] || 0) < storeCap(I)){
    I.stock[k] = (I.stock[k] || 0) + 1; got++; if (k === 'fisch') stats.fisch++;
    I.reefLife = Math.max(0, reef - got * reefPer * (k === 'fisch' ? .003 : .008));
    if (k === 'fisch' && K.boost && tooled(I, K) && (b.worn = (b.worn || 0) + 1) >= K.boost.per){ b.worn = 0; I.stock[K.boost.k]--; }   // the net tears
    if (hook && (I.stock.haken || 0) > 0 && (b.hookWorn = (b.hookWorn || 0) + 1) >= HOOK.per){ b.hookWorn = 0; I.stock.haken--; }   // a hook breaks or is lost
  }
  if (k === 'fisch') b.hung = Math.min(7, (b.hung || 0) + got);
  return got;
}
/* ---------- free time. Whoever has nothing to do just now (children, the old, grown-ups without work) does what people
   on the islands have always done: surfing on a board in the break (heʻe nalu in Hawaiʻi, faʻaheʻe in Tahiti, children on
   small boards), swimming and jumping into the lagoon, a kite of pandanus leaf on the beach, string figures (whai, fai,
   ʻai), juggling candlenuts (hiko, a game of Tongan girls), a nap in the shade, the slit drum on the plaza in the evening,
   a toy outrigger in the shallows, garlands of blossoms, and the old telling of the ancestors. Only for the eye: free time
   changes nothing in the stores. */
const PLAY = {
  surf:{n:'reitet auf einem Brett die Wellen'}, swim:{n:'schwimmt in der Lagune'}, kite:{n:'lässt einen Drachen aus Pandanusblatt steigen'},
  string:{n:'legt Fadenfiguren'}, hiko:{n:'jongliert mit Kerzennüssen'}, nap:{n:'döst im Schatten'}, drum:{n:'schlägt die Schlitztrommel'},
  toy:{n:'lässt ein kleines Auslegerkanu schwimmen'}, garland:{n:'flicht einen Blütenkranz'}, story:{n:'erzählt von den Ahnen'}, listen:{n:'hört den Geschichten der Alten zu'},
};
const onScreen = w => typeof cam !== 'undefined' && cam.z > PEOPLE_Z && ptIn(w.x, w.y, view(10));
/* each game has at least two looks: a string figure made and then held up to be guessed; three nuts in a loop, or two in one
   hand and one thrown high; a kite of leaf flown steady, or a bird kite swooping; a garland threaded, then worn; the old tell
   with their hands, or draw in the sand; the slit drum beaten fast with two sticks, or slow with the big beater */
const PLAY_FX = {string:['string', 'stringshow'], hiko:['hiko', 'hiko2'], garland:['garland', 'wear'], story:['story', 'sand'], drum:['drum', 'drum2'], kite:['kite', 'kitepull'], toy:['toy', 'toyline'], nap:['~lie', 'doze'], listen:['nod', 'clap']};
const STAND_FX = new Set(['hiko', 'hiko2', 'kite', 'kitepull', 'drum2', 'wear']);
/* gathering without work: grubbing on the ground, a crab caught on the shore, eggs from the nests */
const FORAGE_FX = ['plant', 'crab', 'eggs'], GATHER_FX = ['twigs', 'snap'];
/* the village sitting together: kava in the evening, a meal by the earth oven, talk and fanning on a mat; and the dance */
const TALK_FX = {halle:['kava', 'chat'], umu:['eat', 'chat'], mat:['chat', 'fan']}, DANCE_FX = ['siva', 'clapd'], HOP_FX = ['hop', 'clap'];
/* Every activity and its looks, at least two each (the tests check it). Looks with ~ are drawn elsewhere: in the water, in
   the canoe, under a load. */
const LOOKS = () => ({
  ...Object.fromEntries(Object.entries(WORK_FX).map(([k, v]) => [KINDS[k].craft || KINDS[k].n, v])),
  'Dächer festbinden':JOB_FX.tie, 'Dach neu decken':JOB_FX.mend, 'Holz fällen':JOB_FX.chop, 'Stamm ziehen':JOB_FX.pull, 'Palme ernten':JOB_FX.climb, 'Riff absuchen':JOB_FX.wade,
  'Fischer an Land':FISH_FX.net, 'Speerfischen':FISH_FX.spear, 'Fang aufhängen':FISH_FX.hang, 'Fischen im Kanu':['~line', '~castnet'], 'Auf dem Riff sammeln':['~scoop', '~poke'],
  'Taucher an Land':DIVE_FX, 'Tauchen':['~clam', '~octopus'],
  'Bauen':SITE_FX, 'Feld anlegen':GROUND_FX('taro'), 'Platz anlegen':GROUND_FX('platz'), 'Kanu bauen':YARD_FX, 'Baumaterial holen':['~shoulder', '~drag'], 'Tragen':['~head', '~pole'],
  'Pause':REST_FX, 'Sammeln':FORAGE_FX, 'Brennholz sammeln':GATHER_FX, 'Surfen':['~paddle', '~wait', '~ride', '~fall'], 'Schwimmen':['~jump', '~crawl', '~duck', '~float'],
  ...Object.fromEntries(Object.entries(PLAY_FX).map(([k, v]) => [PLAY[k].n, v])),
  'Kava am Abend':TALK_FX.halle, 'Essen am Erdofen':TALK_FX.umu, 'Auf der Matte':TALK_FX.mat, 'Tanz beim Fest':DANCE_FX, 'Kinder zur Trommel':HOP_FX
});
const landC = L => L._c || (L._c = L.poly.reduce((m, q) => ({x:m.x + q.x / L.poly.length, y:m.y + q.y / L.poly.length}), {x:0, y:0}));
/* a place on the beach and a spot out in the water before it, with only water between; for surf on the ocean side */
function shoreSpot(I, w, out0, out1, open){
  const L = I.lands[landOf(I, w)]; if (!L) return null;
  const c = landC(L);
  for (let k = 0; k < 14; k++){
    const v = L.poly[Math.floor(Math.random() * L.poly.length)], dx = v.x - c.x, dy = v.y - c.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (Math.hypot(v.x - w.x, v.y - w.y) > 150) continue;
    if (open && I.atoll && (v.x - I.atoll.cx) * ux + (v.y - I.atoll.cy) * uy < 0) continue;
    const b = {x:v.x - ux * 2.5, y:v.y - uy * 2.5}; if (landAt(I, b) !== L) continue;
    const m = out0 + Math.random() * (out1 - out0), s = {x:v.x + ux * m, y:v.y + uy * m * .8};
    if (landAt(I, s) || I.lands.some(q => polyDist(s, q.poly) < 3)) continue;
    if ([.35, .6, .85].some(f => landAt(I, {x:v.x + (s.x - v.x) * f, y:v.y + (s.y - v.y) * f}))) continue;
    return {b, s, ux, uy};
  }
  return null;
}
/* somewhere to sit: in the shade of a palm or a tree, or in front of a house, on the land one stands on */
function restSpot(I, w, shade){
  const L = landOf(I, w);
  if (shade){
    const P = I.buildings.filter(b => SWAY_KINDS.has(b.kind) && !b.bt && landOfB(I, b) === L && Math.hypot(b.x - w.x, b.y - w.y) < 130);
    if (P.length){ const b = P[Math.floor(Math.random() * P.length)]; return {x:b.x + 4 + Math.random() * 3, y:b.y + 3 + Math.random() * 2}; }
    for (let k = 0; k < 8; k++){ const t = I.trees[Math.floor(Math.random() * I.trees.length)]; if (t && t.st === 0 && landAt(I, t) === I.lands[L] && Math.hypot(t.x - w.x, t.y - w.y) < 130) return {x:t.x + 4, y:t.y + 4}; }
  }
  const H = I.buildings.filter(b => KINDS[b.kind].roof && !b.bt && !b.at && landOfB(I, b) === L); if (!H.length) return null;
  const b = H[Math.floor(Math.random() * H.length)]; return {x:b.x + rnd(9), y:b.y + 6 + Math.random() * 6};
}
const playersOf = (I, k) => walkers.filter(q => q.isl === I.id && q.play && q.play.k === k);
function startPlay(I, w, force){
  const W = wind(), ph = dayPhase(), kid = w.child, old = w.old, ch = [];
  const add = (k, wt) => { if (wt > 0) ch.push([k, wt]); };
  if (!old){ add('swim', kid ? 2.4 : 1); if (W.str > .22 && W.str < .86) add('surf', kid ? .9 : 1.5); }
  if (kid){ add('kite', W.str > .3 ? 2 : .3); add('toy', 1.1); add('hiko', .9); add('string', .9); if (playersOf(I, 'story').some(q => q.play.ph === 'do')) add('listen', 3); }
  else if (old){ add('story', playersOf(I, 'story').length ? 0 : 2.4); add('nap', 2); add('string', .8); add('garland', 1.1); }
  else { add('nap', .7); add('hiko', .5); add('garland', .7); add('string', .6); }
  if (ph > .45 && ph < .66 && !kid && !playersOf(I, 'drum').length) add('drum', 2.6);
  let r = Math.random() * ch.reduce((s, o) => s + o[1], 0), k = force || null; if (!k) for (const [q, wt] of ch) if ((r -= wt) <= 0){ k = q; break; }
  if (!k) return false;
  const P = {k, ph:'go', n:0, max:2 + Math.floor(Math.random() * 3)};
  let to = null;
  if (k === 'surf' || k === 'swim' || k === 'toy' || k === 'kite'){
    const sp = shoreSpot(I, w, k === 'surf' ? 14 : 6, k === 'surf' ? 24 : 12, k === 'surf'); if (!sp) return false;
    Object.assign(P, sp); to = sp.b;
  } else if (k === 'listen'){ const s = playersOf(I, 'story').find(q => q.play.ph === 'do'); if (!s) return false; const a = Math.random() * Math.PI; P.teller = s; to = {x:s.x + Math.cos(a) * 7, y:s.y + 2 + Math.sin(a) * 3}; }
  else if (k === 'drum'){ const h = I.buildings.find(b => b.kind === 'halle' && !b.bt) || I.buildings.find(b => b.kind === 'platz'); if (!h || landOfB(I, h) !== landOf(I, w)) return false; to = {x:h.x + 12 + rnd(3), y:h.y + 10 + rnd(2)}; }
  else to = restSpot(I, w, k === 'nap' || k === 'story' || Math.random() < .5);
  if (!to || landAt(I, to) !== landAt(I, w)) return false;
  w.play = P; goTo(I, w, to.x, to.y); return true;
}
function endPlay(w){ w.play = null; w.swim = false; w.lie = false; w.hop = false; }
/* the next step of what someone does in free time; false when it is over */
function playLeg(I, w){
  const P = w.play, now = performance.now();
  const swimTo = (x, y, wait = 0) => { goTo(I, w, x, y, wait); w.paddle = false; w.swim = true; };
  if (P.ph === 'done'){ endPlay(w); return false; }
  if (P.k === 'surf'){
    // out lying on the board, paddling with the arms; sitting up, waiting for the right wave; then standing, riding it in
    if (P.ph === 'go' || P.ph === 'ride' && ++P.n < P.max){ P.ph = 'out'; swimTo(P.s.x + rnd(4), P.s.y + rnd(3)); return true; }
    if (P.ph === 'out'){ P.ph = 'sit'; w.swim = true; w.wait = 900 + Math.random() * 2400; return true; }
    if (P.ph === 'sit'){ P.ph = 'ride'; P.at = now; P.fall = Math.random() < .3; swimTo(P.b.x + P.ux * 4 + rnd(7), P.b.y + P.uy * 3 + rnd(4)); return true; }
    P.ph = 'done'; goTo(I, w, P.b.x, P.b.y, 500); return true;
  }
  if (P.k === 'swim'){
    // children run in and jump; then a few strokes here and there, now and then under water, and back to the beach
    if (P.ph === 'go'){ P.ph = 'in'; P.at = now; P.jump = w.child || Math.random() < .3; if (P.jump && onScreen(w)) setTimeout(() => sfx('plop'), 650); swimTo(P.b.x + P.ux * 6, P.b.y + P.uy * 5); return true; }
    if (P.n++ < P.max + 1){ P.ph = 'paddle'; const s = {x:P.s.x + rnd(7), y:P.s.y + rnd(4)}; if (!landAt(I, s)){ const wait = Math.random() < .5 ? 700 + Math.random() * 1600 : 0; swimTo(s.x, s.y, wait); P.duck = Math.random() < .4 ? now + 300 : 0; P.float = wait > 0 && Math.random() < .5; return true; } }   // between strokes, now and then floating on the back
    P.ph = 'done'; goTo(I, w, P.b.x, P.b.y, 400); return true;
  }
  if (P.ph === 'go'){
    P.ph = 'do'; P.at = now;
    if (P.k === 'toy'){ goTo(I, w, P.b.x + P.ux * 3.5, P.b.y + P.uy * 3); P.ph = 'wade'; return true; }
    if (P.k === 'nap'){ if (lookOf(PLAY_FX.nap, w) === 'doze'){ w.sit = true; w.busy = {x:w.x, y:w.y}; w.fx = 'doze'; } else w.lie = true; w.wait = 7000 + Math.random() * 8000; return true; }   // lying on a mat, or dozing against the trunk
    if (P.k === 'listen'){ w.sit = true; w.left = !!P.teller && P.teller.x < w.x; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(PLAY_FX.listen, w); w.wait = 5000 + Math.random() * 5000; return true; }
    w.busy = {x:w.x, y:w.y}; w.fx = lookOf(PLAY_FX[P.k], w); w.sit = !STAND_FX.has(w.fx);
    if (P.k === 'kite') w.left = wind().tx < 0;   // the back to the wind, the kite flies off downwind
    w.wait = (P.k === 'story' || P.k === 'drum' ? 9000 : P.k === 'kite' ? 8000 : 5000) + Math.random() * 5000; return true;
  }
  if (P.ph === 'wade'){ P.ph = 'do'; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(PLAY_FX.toy, w); w.wait = 5000 + Math.random() * 4000; return true; }
  if (P.ph === 'do'){ P.ph = 'done'; w.lie = false; w.sit = false; if (P.k === 'toy') { goTo(I, w, P.b.x, P.b.y, 300); return true; } }
  endPlay(w); return false;
}
/* The day in the village: at midday people gather by the earth oven, in the evening the grown-ups sit in the meeting house
   for kava while the old tell the stories of the ancestors, at night everyone goes home. Children play on the plaza. */
function villageLife(I, w){
  const ph = dayPhase(), near = (b, r, k) => { const a = Math.random() * TAU; goTo(I, w, b.x + Math.cos(a) * r, b.y + 6 + Math.sin(a) * r * k); };
  const p = personOf(w), f = p && famOf(I, p.h), home = f && f.home && findB(f.home), hall = I.buildings.find(b => b.kind === 'halle' && !b.bt) || I.buildings.find(b => b.kind === 'platz');
  const there = L => { w.busy = {x:w.tx, y:w.ty}; w.fx = lookOf(L, w); };   // what they do once they sit there
  if (opts.night && ph > .66){ if (home){ goTo(I, w, home.x + rnd(6), home.y + 6); w.sit = true; w.wait = 6000 + Math.random() * 6000; return true; } return false; }
  if (ph > .5 && hall && !w.child && Math.random() < .7){ near(hall, w.old ? 9 : 16, .5); w.sit = true; w.wait = 5000 + Math.random() * 5000; there(TALK_FX.halle); return true; }
  if (ph > .25 && ph < .4 && !w.child && Math.random() < .6){ const u = I.buildings.filter(b => b.kind === 'umu' && !b.bt); if (u.length){ near(u[Math.floor(Math.random() * u.length)], 10, .5); w.sit = true; w.wait = 4000 + Math.random() * 3000; there(TALK_FX.umu); return true; } }
  if (w.child && hall && playersOf(I, 'drum').some(q => q.play.ph === 'do') && Math.random() < .7){ near(hall, 14, .45); w.hop = true; w.fx = lookOf(HOP_FX, w); w.wait = 2500 + Math.random() * 2500; return true; }   // the drum sounds: the children dance
  if (w.child && hall && Math.random() < .5){ near(hall, 22, .45); w.wait = 300 + Math.random() * 600; return true; }
  return false;
}
/* Night: everyone sleeps in their house; only the fishers go out with torches, as people on the islands fished the reef
   at night by torchlight. Sleep changes nothing in the stores (people count as at their work), and builders build faster
   by day to make up for the night. In the morning each goes back to their work. */
const sleepTime = () => opts.night && (p => p > .7 || p < .03)(dayPhase());
function sleepLeg(I, w){
  const p = personOf(w), f = p && famOf(I, p.h), home = (f && f.home && findB(f.home)) || I.buildings.find(b => b.kind === 'halle' && !b.bt) || I.buildings.find(b => b.kind === 'platz');
  if (!home){ w.asleep = true; w.wait = 3000; return; }
  const hx = home.x + 2, hy = home.y + 5;
  if (Math.hypot(w.x - hx, w.y - hy) > 4){ goTo(I, w, hx + rnd(2), hy + rnd(1)); w.toBed = true; return; }
  w.asleep = true; w.toBed = false; w.sit = false; w.wait = 2500 + Math.random() * 1500;
}
function nextLeg(w){
  const I = isl(w.isl);
  // during a feast everyone gathers in front of the meeting house; at the feast of the Pleiades they dance in a ring on the dance ground
  w.dance = false; w.cheer = false; w.busy = null; w.fx = null; w.hurry = I.feastEnd > tick; w.paddle = false; w.hop = false;   // people hurry to a feast
  if (w.play && (w.job && !w.play.off || w.boat || I.feastEnd > tick)) endPlay(w);
  if (I.feastEnd > tick && !w.boat){
    const d = I.festYear === yearOf() && I.buildings.find(b => b.kind === 'tanzplatz' && !b.bt), h = I.buildings.find(b => b.kind === 'halle' && !b.bt) || I.buildings.find(b => b.kind === 'platz');
    if (d || h){ if (w.job){ w.leg = 'go'; w.bout = false; } w.carry = null; w.sit = false; }
    if (d){ const a = Math.random() * TAU; goTo(I, w, d.x + Math.cos(a) * 15, d.y + Math.sin(a) * 6, 1800 + Math.random() * 1400); w.dance = d; w.fx = lookOf(DANCE_FX, w); return; }
    if (h){ goTo(I, w, h.x + (Math.random() - .5) * 40, h.y + 14 + Math.random() * 16, 700 + Math.random() * 1400); w.cheer = true; w.fx = lookOf(DANCE_FX, w); return; }
  }
  // night: to bed; morning: back to work
  if (I.settled && sleepTime() && !(I.feastEnd > tick) && !w.boat && !w.ride && !w.swim && !(w.job && (w.job.type === 'fish' || w.job.type === 'tie'))){ if (w.play) endPlay(w); w.carry = null; sleepLeg(I, w); return; }
  if (w.asleep || w.toBed){ w.asleep = false; w.toBed = false; if (w.job){ w.leg = 'back'; w.bout = false; } }
  if (w.job){
    if (w.play && !OFF_OK.has(w.job.type)){ endPlay(w); if (w.leg !== 'go'){ w.on = false; w.leg = 'go'; goTo(I, w, w.job.x, w.job.y); return; } }   // sent to other work meanwhile: go there now
    if (w.play){ if (playLeg(I, w)) return; if (offNow(I, w, w.job.type) && startPlay(I, w)){ w.play.off = true; return; } if (!w.on){ w.leg = 'go'; goTo(I, w, w.job.x, w.job.y); return; } w.leg = 'back'; w.bout = false; }
    jobLeg(I, w, w.job); return;
  }
  if (w.play && playLeg(I, w)) return;
  // without work, grown-ups gather what the wild gives: out to the nests and the shore, bent down a while, the basket to the store
  if (w.role === 'idle' && !w.boat){
    if (w.forage === 1){ w.forage = 2; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(FORAGE_FX, w); w.sit = w.fx === 'plant'; w.wait = 2600 + Math.random() * 2400; return; }
    if (w.forage === 2){ w.forage = 3; w.sit = false; w.carry = 'eier'; w.pole = !w.pole; const st = storeNear(I, w); if (st){ goTo(I, w, st.x + rnd(6), st.y + 5); return; } }
    if (w.forage === 3){ w.forage = 0; w.carry = null; }
    if (foragers(I) && Math.random() < .55){ const p = forageSpot(I, w); if (p){ w.forage = 1; w.sit = false; goTo(I, w, p.x, p.y, 300); return; } }
  } else if (w.forage){ w.forage = 0; if (w.carry === 'eier') w.carry = null; }
  // children and the old gather dry wood and carry a bundle home (what they bring is counted in gatherTick)
  if ((w.role === 'kid' || w.role === 'old') && !w.boat){
    if (w.gather === 1){ w.gather = 2; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(GATHER_FX, w); w.sit = false; w.wait = 2200 + Math.random() * 2000; return; }
    if (w.gather === 2){ w.gather = 3; w.busy = null; w.fx = null; w.carry = 'reisig'; const st = storeNear(I, w); if (st){ goTo(I, w, st.x + rnd(6), st.y + 5); return; } }
    if (w.gather === 3){ w.gather = 0; w.carry = null; }
    const p = personOf(w);
    if (p && canGather(p) && gatherOn(I) && !(opts.night && dayPhase() > .66) && Math.random() < (w.child ? .3 : .35)){ const q = forageSpot(I, w); if (q){ w.gather = 1; w.sit = false; goTo(I, w, q.x, q.y, 300); return; } }
  } else if (w.gather){ w.gather = 0; if (w.carry === 'reisig') w.carry = null; }
  // free time: children often, the old and those without work now and then; at night all are at home
  if (I.settled && !w.boat && !w.forage && !w.gather && !(opts.night && dayPhase() > .66) && Math.random() < (w.child ? .5 : w.old ? .4 : .42) && startPlay(I, w)) return;
  if (I.settled && villageLife(I, w)) return;
  const L = landOf(I, w), sp = I.buildings.filter(b => !KINDS[b.kind].water && b.kind !== 'palme' && b.kind !== 'pandanus' && (!w.old || KINDS[b.kind].roof) && !b.at && landOfB(I, b) === L), t = sp[Math.floor(Math.random() * sp.length)];
  if (t) goTo(I, w, t.x + rnd(w.old ? 8 : 11), t.y + 4 + Math.random() * 8);
  // grown-ups who stroll sometimes sit down on a mat for a while, the old more often; children are off again quickly
  w.sit = !w.child && Math.random() < (w.old ? .65 : .35);
  if (w.sit && t){ w.busy = {x:w.tx, y:w.ty}; w.fx = lookOf(TALK_FX.mat, w); }   // on the mat: talk, or fanning in the heat
  w.wait = w.child ? 200 + Math.random() * 700 : w.sit ? 3500 + Math.random() * 4500 : 600 + Math.random() * 1800;
}
/* One step of the work. Builders: fetch wood or fronds, bring it, build a while at the site, until it is done.
   Everyone else: a while at the place (felling, climbing, at the craft), and after a few rounds the load to the store. */
const REST_FX = ['drink', 'stretch', 'wipe', 'drink'];
const SITE_FX = ['build', 'lash', 'build', 'raise', 'thatch'];   // at a site: the adze, binding a post with sennit, setting a post upright, tying the thatch
/* a canoe: hewn with the adze, hollowed with fire, the outrigger lashed on */
const YARD_FX = ['carve', 'burn', 'lash'];
/* fields, pits, springs and plazas are not built but dug: the ground is broken with the digging stick, and in a field the
   shoots are set */
const groundSite = k => !!(KINDS[k].soil || FLAT.has(k));
const GROUND_FX = k => KINDS[k].soil ? ['dig', 'dig', 'plant'] : ['dig', 'tamp'];   // a field is dug and planted, a plaza or a well dug and stamped firm
/* Evening off, and now and then a rest at noon: whoever works where the work goes on by itself (fields, crafts, palms,
   the forest) takes part of the evening free and goes surfing, swimming or to the drum. Fishers, divers and builders stay
   until their work is done. Only for the eye: the place goes on making what it makes. */
const OFF_OK = new Set(['carry', 'learn', 'chop', 'pull', 'climb', 'wade']);
function offNow(I, w, T){
  if (!OFF_OK.has(T) || I.feastEnd > tick || w.carry || w.boat || (w.job && w.job.b && w.job.b.prio)) return false;   // a place called with the conch has no evening off
  const ph = dayPhase(), day = Math.floor((tick + 30) / DAY_TICKS), id = w.pid || (w.x | 0);
  const Z = zealOf(I);
  if (ph > .5 && ph < .64) return hsh(day, id) < Z.off[0];
  if (ph > .27 && ph < .34) return hsh(day + .37, id) < Z.off[1];
  return false;
}
const BOUT = {chop:[2400, 1200], pull:[2600, 1400], climb:[5600, 2200], wade:[2600, 2400], plant:[500, 0], wait:[2500, 3000]};
function jobLeg(I, w, j){
  const T = j.type;
  if (w.leg === 'go'){ w.on = true; w.leg = 'work'; w.bout = false; }
  // whoever is at work counts as there; someone who lost the way to it walks there first
  else if (!w.on && !w.boat && !w.ride){ if (Math.hypot(w.x - j.x, w.y - j.y) < 16) w.on = true; else { w.leg = 'go'; goTo(I, w, j.x, j.y); return; } }
  if (BUILD_JOBS.has(T)){
    const W = workOf(I, j);
    if (w.leg !== 'fetch' && w.leg !== 'bring' && w.leg !== 'work'){ w.on = false; w.leg = 'go'; goTo(I, w, j.x + rnd(4), j.y + rnd(2)); return; }   // not yet at the site: walk there first
    if (w.leg === 'fetch'){ w.carry = T === 'site' ? siteLoad(I, j.b) : 'holz'; w.pole = !w.pole; w.leg = 'bring'; goTo(I, w, j.x + rnd(5), j.y + rnd(2), 300); return; }
    if (w.leg === 'bring'){ w.carry = null; w.leg = 'work'; w.bout = false; if (W){ W.o.got = Math.min(W.need, W.o.got + 2); invalidate(); } }   // a bundle: two loads a trip
    if (!w.bout && W){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(T === 'site' ? groundSite(j.b.kind) ? GROUND_FX(j.b.kind) : SITE_FX : YARD_FX, w); w.sit = w.fx === 'plant' || SIT_FX.has(w.fx); w.wait = 2200 + Math.random() * 1400; w.boutT = w.wait; return; }
    w.bout = false;
    if (W && W.need && W.o.got + woodOnWay(I, j) < W.need && W.o[W.f] <= woodFloor(W) + .01){
      const s = storeNear(I, w); if (s){ w.leg = 'fetch'; goTo(I, w, s.x, s.y); return; }
      W.o.got = W.need;   // no store left: they take what lies about
    }
    const r = T === 'site' ? KINDS[j.b.kind].r * .7 : 5, cx = T === 'site' ? j.b.x : j.x, cy = T === 'site' ? j.b.y + 4 : j.y;
    goTo(I, w, cx + rnd(r), cy + rnd(r * .4), W ? 0 : 900);
    return;
  }
  if (T === 'fish'){ fishLeg(I, w, j); return; }
  if (T === 'dive'){ diveLeg(I, w, j); return; }
  if (w.leg === 'work'){
    if (!w.bout){
      w.bout = true;
      // each kind of work looks its own (see workFx): crafts are done sitting on a mat, facing the workplace
      w.fx = JOB_FX[T] ? lookOf(JOB_FX[T], w) : T === 'carry' || T === 'learn' ? lookOf(WORK_FX[j.b.kind], w) || null : null;
      w.busy = w.fx ? {x:w.x, y:w.y} : null; w.sit = T === 'wait' ? Math.random() < .5 : SIT_FX.has(w.fx); if (w.fx && T === 'carry') w.left = j.b.x < w.x - 1;
      if ((T === 'pull' || T === 'chop') && j.tree) w.left = j.tree.x < w.x;
      const bt = BOUT[T]; w.wait = bt ? bt[0] + Math.random() * bt[1] : w.fx ? 2800 + Math.random() * 2200 : 900 + Math.random() * 1600; w.boutT = w.wait;
      return;
    }
    w.bout = false;
    // now and then a short rest at the place: a drink from a green nut, a stretch, the sweat off the brow
    if (w.rest) w.rest = false;
    else if (offNow(I, w, T) && startPlay(I, w)){ w.play.off = true; w.leg = 'back'; return; }
    // a craftswoman holds up what she has made, the potter her pot, the weaver her mat
    else if (T === 'carry' && j.load && WORK_FX[j.b.kind] && Math.random() < .16){ w.rest = true; w.bout = true; w.fx = 'show'; w.show = j.load; w.busy = {x:w.x, y:w.y}; w.sit = false; w.wait = 1500 + Math.random() * 600; w.boutT = w.wait; return; }
    else if (T !== 'wait' && T !== 'plant' && Math.random() < .1){ w.rest = true; w.bout = true; w.fx = REST_FX[Math.floor(Math.random() * REST_FX.length)]; w.busy = {x:w.x, y:w.y}; w.sit = w.fx === 'drink' && Math.random() < .5; w.wait = 1800 + Math.random() * 1400; w.boutT = w.wait; return; }
    if (T === 'wait' || T === 'learn' || T === 'tie' || T === 'mend'){ const near = T === 'tie' || T === 'mend'; goTo(I, w, j.x + rnd(T === 'learn' ? 3 : near ? 2 : 8), j.y + rnd(T === 'learn' ? 2 : near ? 1 : 4)); return; }
    // at a craft or with the rope they work a few rounds before a load goes to the store; a felled piece goes at once
    if (T === 'carry' || T === 'pull'){ w.nb = (w.nb || 0) + 1; if (w.nb < (T === 'pull' ? 3 : 2) || !j.load){ w.wait = 200 + Math.random() * 500; if (!j.load) w.nb = 0; return; } w.nb = 0; }
    if (T === 'climb'){ j.b._pi = (j.b._pi || 0) + 1; w.carry = j.load; w.pole = !w.pole; w.leg = 'store'; goTo(I, w, j.drop.x + rnd(3), j.drop.y + rnd(2)); return; }   // the nuts down to the house, then the next palm
    const s = j.drop || storeNear(I, w); if (!s){ w.wait = 1500; return; }
    w.carry = j.load || (T === 'pull' ? 'holz' : null); w.pole = !w.pole; w.leg = 'store'; goTo(I, w, s.x + rnd(3), s.y);
    return;
  }
  // where the load goes: a planter kneels to set the sapling, then all go back
  if (T === 'plant' && !w.bout){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.fx = 'plant'; w.wait = 2200 + Math.random() * 1000; return; }
  if (T === 'plant' && w.bout === true){ w.bout = 2; w.carry = null; w.busy = {x:w.x, y:w.y}; w.fx = 'tamp'; w.wait = 1300 + Math.random() * 700; return; }   // then the earth stamped firm round it
  w.bout = false; w.carry = null; w.leg = 'work'; goTo(I, w, j.x + rnd(T === 'climb' ? 1 : 4), j.y + Math.random() * (T === 'climb' ? 1 : 3), 300 + Math.random() * 500);
}
/* The fishers go out together in one canoe: the first steers, the second fishes. Outside the reef they cast nets and
   lines; for seafood, shells and stones they wade over the reef flat at low tide. Back at the hut the catch is hung on the
   rack, and some of the dried fish goes to the store. Alone one stands in the shallows with the spear. Under a rāhui they
   mend nets ashore. */
const reefSpot = (I, b) => { const L = waterNear(I, b), dx = L.x - b.x, dy = L.y - b.y, l = Math.hypot(dx, dy) || 1, p = {x:L.x + dx / l * 9 + rnd(7), y:L.y + dy / l * 6 + rnd(3)}; return landAt(I, p) ? L : p; };
function fishLeg(I, w, j){
  const b = j.b, L = waterNear(I, b), mate = walkers.find(q => q !== w && q.isl === w.isl && q.job && q.job.b === b && q.on) || null, lead = !mate || j.i % 2 === 0;
  switch (w.leg){
    case 'work':
      if (!w.bout){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(FISH_FX.net, w); w.sit = true; w.wait = 1500 + Math.random() * 1500; w.boutT = w.wait; return; }
      w.bout = false; w.fx = null; w.busy = null;
      if (I.rahui || workState(I, b)){ w.sit = true; w.wait = 3000 + Math.random() * 2000; return; }
      if (!mate){ w.leg = 'spear'; const s = wadeSpot(I, b); goTo(I, w, s.x + rnd(3), s.y + rnd(2)); return; }   // alone: the spear in the shallows
      if (!lead){ w.leg = 'board'; goTo(I, w, L.x + rnd(2), L.y + rnd(1.5)); return; }   // waits at the water for the canoe
      w.leg = 'launch'; goTo(I, w, L.x, L.y); return;
    case 'board': w.wait = 500; if ((w.waited = (w.waited || 0) + 1) > 30){ w.waited = 0; w.leg = 'work'; w.bout = false; } return;
    case 'launch': {
      const m = mate && mate.leg === 'board' && Math.hypot(mate.x - w.x, mate.y - w.y) < 12 ? mate : null;
      if (!m && mate && (w.waited = (w.waited || 0) + 1) < 14){ w.wait = 450; return; }   // waits a little for the mate
      w.waited = 0; w.boat = true; w.paddle = false; w.mate = m; if (m){ m.ride = w; m.boat = true; m.leg = 'ride'; m.waited = 0; }
      w.pick = prodOf(b) || 'fisch'; w.leg = 'out'; const s = w.pick === 'fisch' ? fishingSpot(I, L, b) : reefSpot(I, b); goTo(I, w, s.x, s.y); return;
    }
    case 'ride': w.wait = 400; return;
    case 'out':
      if (w.pick === 'fisch'){ w.leg = 'fishing'; w.fishing = performance.now(); w.wait = 4200 + Math.random() * 2600; return; }
      w.leg = 'glean'; w.glean = performance.now(); w.wait = 4600 + Math.random() * 2600; return;
    case 'fishing': case 'glean': w.fishing = 0; w.glean = 0; w.leg = 'back'; goTo(I, w, L.x + rnd(3), L.y + rnd(2)); return;
    case 'back': {
      w.boat = false; const m = w.mate; w.mate = null;
      if (m && m.ride === w){ m.ride = null; m.boat = false; m.x = w.x + 3; m.y = w.y + 1; m.leg = 'ashore'; goTo(I, m, j.x + 5, j.y, 200); }
      w.leg = 'hang'; w.crew2 = !!m; goTo(I, w, j.x, j.y - 1, 200); return;
    }
    case 'ashore': w.leg = 'work'; w.bout = false; w.wait = 300; return;
    case 'spear':
      if (!w.bout){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(FISH_FX.spear, w); w.wait = 3400 + Math.random() * 2600; w.boutT = w.wait; return; }
      w.bout = false; w.fx = null; w.busy = null; w.pick = 'fisch'; w.crew2 = false; w.leg = 'hang'; goTo(I, w, j.x, j.y - 1, 200); return;
    case 'hang':
      if (!w.bout){ w.bout = true; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(FISH_FX.hang, w); w.wait = 1300; w.caughtK = w.pick || 'fisch'; w.caught = landCatch(I, b, w.crew2 ? 2 : 1, w.caughtK); w.pick = null; return; }
      // when the racks are full, the dried fish goes to the store; seafood and shells go at once
      w.bout = false; { const s = (b.hung >= 5 || w.caught && w.caughtK !== 'fisch') && storeNear(I, w); if (!s){ w.leg = 'work'; w.bout = true; w.wait = 300; return; }
        w.carry = w.caughtK === 'fisch' || !w.caughtK ? 'fisch' : PICK_LOAD[w.caughtK]; w.pole = !w.pole; w.leg = 'store'; if (w.carry === 'fisch') b.hung = Math.max(0, b.hung - 3); goTo(I, w, s.x + rnd(3), s.y); }
      return;
    default: w.carry = null; w.leg = 'work'; goTo(I, w, j.x + rnd(4), j.y + Math.random() * 3, 300);
  }
}
/* ---------- divers, as islanders have dived for thousands of years. Two go out together in a dugout: one dives, the
   other keeps watch in the canoe and holds the cord; a stone on the cord takes the diver down fast. No goggles, eyes open in
   the salt water, a dive of a minute or two, then breath at the surface. Many deep dives without rest bring taravana, the
   sickness known from the pearl divers of the Tuamotu, so after a few dives they rest ashore. In strong wind the water is
   rough and murky, at night dark, under a rāhui the reef rests. In the lagoon they bring giant clams, octopus and sea
   cucumbers; on an atoll, where there is no stone, the thick shell of a giant clam is ground into an adze; off Tifa the
   pearl shell lies deep. */
function diveBlock(I){
  if (I.rahui) return {why:'rahui', text:'Rāhui: Das Riff ruht bis zum Fest.'};
  const W = wind(); if (W.str > .8) return {why:'wind', text:`Zu viel Wind aus ${W.dir}: Das Wasser ist aufgewühlt und trüb. Die Taucher bleiben an Land.`};
  if (opts.night && nightLevel() > .3) return {why:'night', text:'Es ist dunkel. Unter Wasser sieht man nichts, die Taucher warten auf den Tag.'};
  return null;
}
function diveSpot(I, b){ if (b._ds && b._ds.k === b.x + b.y) return b._ds; const p = fishingSpot(I, waterNear(I, b), b); return b._ds = {x:p.x, y:p.y, k:b.x + b.y}; }
function diveLeg(I, w, j){
  const b = j.b, L = waterNear(I, b), deep = !!(I.treasure && I.treasure.k === 'perlmutt'), partner = walkers.find(q => q !== w && q.job && q.job.b === b);
  switch (w.leg){
    case 'work':   // ashore: breath comes back slowly; out again only when rested and the water allows
      w.strain = Math.max(0, (w.strain || 0) - 1);
      if (!w.bout){ w.bout = true; w.sit = true; w.busy = {x:w.x, y:w.y}; w.fx = lookOf(DIVE_FX, w); w.wait = 900 + Math.random() * 900; return; }   // hair wrung out, the cord coiled
      w.bout = false;
      if ((w.strain || 0) > 2 || diveBlock(I) || workState(I, b)){ w.sit = true; w.wait = 2500; return; }
      w.leg = 'launch'; goTo(I, w, L.x + rnd(3), L.y + rnd(2)); return;
    case 'launch': { w.boat = true; w.paddle = false; w.leg = 'out'; w.dives = 0; w.catch = []; const s = diveSpot(I, b), side = j.key.endsWith('#1') ? -1 : 1; goTo(I, w, s.x + side * 6, s.y + side * 2); return; }
    case 'out': w.leg = 'spot'; w.wait = 400; return;
    case 'spot':
      if (w.under){
        // up again: breath, and what the hands found; the clearer the water, the better the luck
        w.under = 0; w.upAt = performance.now(); w.dives++; w.strain = (w.strain || 0) + (deep ? 2 : 1); stats.tauch = (stats.tauch || 0) + 1;
        if (Math.random() < .55 + .3 * (1 - wind().str * .6)){ const k = deep && I.treasure.left > 0 && Math.random() < .5 ? (I.treasure.left--, 'perlmutt') : I.atoll && Math.random() < .14 ? 'beile' : 'meeres'; w.catch.push(k); if (k === 'meeres') w.catch.push(k); }   // a giant clam is a meal for two
        w.wait = (partner && partner.on && partner.leg === 'spot' ? 3000 : 6000) + Math.random() * 1500;   // alone nobody keeps watch: a longer rest
        return;
      }
      if (w.dives >= 5 || (w.strain || 0) >= 7 || diveBlock(I)){ w.leg = 'back'; goTo(I, w, L.x + rnd(3), L.y + rnd(2)); return; }
      if (partner && partner.under){ w.wait = 700; return; }   // the other is down: keep watch and hold the cord
      w.under = performance.now(); if (onScreen(w)) sfx('plop'); w.wait = (deep ? 5200 : 3800) + Math.random() * 1600; return;   // down with the stone
    case 'back': w.boat = false; w.leg = 'land'; goTo(I, w, j.x, j.y - 1, 200); return;
    case 'land': {
      const got = {};
      for (const k of w.catch || []){ let q = 1; if (dailyPace(k) > 1){ j.b._cd = (j.b._cd || 0) + 1 / dailyPace(k); q = Math.floor(j.b._cd); j.b._cd -= q; }
        if (q && (I.stock[k] || 0) < storeCap(I)){ I.stock[k] = (I.stock[k] || 0) + 1; got[k] = (got[k] || 0) + 1; } }
      w.catch = [];
      if (I.id === active && (got.perlmutt || got.beile)) toast(got.perlmutt ? `Die Taucher von ${I.name} bringen ${got.perlmutt} Perlmutt aus der Tiefe.` : 'Aus der dicken Schale einer Riesenmuschel ist ein Beil geschliffen.', 2800);
      const s = Object.keys(got).length && storeNear(I, w); if (!s){ w.leg = 'work'; w.bout = false; w.wait = 300; return; }
      w.carry = 'muschel'; w.leg = 'store'; goTo(I, w, s.x + rnd(3), s.y); return;
    }
    default: w.carry = null; w.leg = 'work'; w.bout = false; goTo(I, w, j.x + rnd(4), j.y + Math.random() * 3, 300);
  }
}
/* Builders who are at their site move the work on, a little with every moment they are there */
function buildBit(w, dt, m){
  const W = workOf(isl(w.isl), w.job); if (!W) return;
  const left = W.o[W.f], floor = Math.max(1e-4, woodFloor(W)), K = w.job.type === 'site' ? SITE_K : w.job.type === 'yard' ? YARD_K : null;
  const f = (K ? teamF(K, m) * K.crew / Math.max(1, m) : 1) * (opts.night ? 1.5 : 1) * (w.pid ? mealOf(isl(w.isl), w.pid) : 1);   // in pairs: alone one gets a third of it done; by day faster, for the night they sleep
  if (left > floor) W.o[W.f] = Math.max(floor, left - dt / TICK / W.crew * f);
}
function stepWalkers(dt){
  const G = {}, at = new Map();
  for (const w of walkers) if (w.on && w.leg === 'work' && w.job && BUILD_JOBS.has(w.job.type) && !w.hurry){ const k = w.job.type === 'yard' ? 'y' + w.isl : w.job.b.id; at.set(k, (at.get(k) || 0) + 1); }
  for (const w of walkers){
    w.moving = false;
    // the second fisher sits in the canoe of the first
    if (w.ride){ const L = w.ride; if (L.boat && L.mate === w && walkers.includes(L)){ w.x = L.x; w.y = L.y; w.left = L.left; continue; } w.ride = null; w.boat = false; w.leg = 'work'; w.bout = false; w.wait = 200; }
    if (w.on && w.leg === 'work' && w.job && BUILD_JOBS.has(w.job.type) && !w.hurry) buildBit(w, dt, at.get(w.job.type === 'yard' ? 'y' + w.isl : w.job.b.id) || 1);
    if (w.wait > 0){
      w.wait -= dt;
      if (w.dance && Math.hypot(w.x - w.dance.x, (w.y - w.dance.y) * 2) < 26 || w.hop){ w.moving = true; w.phase += dt * .008; }
      else if (w.busy && !w.rest && !(w.play && w.fx !== 'drum') && Math.hypot(w.x - w.busy.x, w.y - w.busy.y) < 3){ w.moving = true; w.phase += dt * .014; }
      continue;
    }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 1.5){ nextLeg(w); continue; }
    w.sit = false; w.lie = false;
    // feet wear the ground, children less as they run everywhere; on a laid path people walk faster
    const g = G[w.isl] || (G[w.isl] = wearGrid(isl(w.isl))), ci = w.boat || w.paddle || w.swim ? -1 : wearAt(g, w.x, w.y);
    const v = Math.min(d, dt * (w.swim ? (w.play && w.play.ph === 'ride' ? .0085 : .0042) : w.boat || w.paddle ? .011 : w.carry ? .006 : w.old ? .0045 : .007) * (w.hurry ? 2.4 : w.child ? 1.7 : 1) * (w.job && w.job.b && w.job.b.prio ? 1.7 : 1) * (ci >= 0 && g.road[ci] ? 1.4 : 1)); w.x += dx / d * v; w.y += dy / d * v;
    // feet find the trodden way: a little to the side where the ground is more worn, so paths gather and bend as real ones do
    if (ci >= 0 && d > 14 && !w.child){
      const ux = dx / d, uy = dy / d, ax = w.x + ux * 7, ay = w.y + uy * 7, l = wearAt(g, ax - uy * 4.5, ay + ux * 4.5), r = wearAt(g, ax + uy * 4.5, ay - ux * 4.5);
      const lv = l >= 0 ? g.v[l] : 0, rv = r >= 0 ? g.v[r] : 0, side = (lv - rv) / (lv + rv + g.v[ci] + 5);
      if (side){ w.x += -uy * side * v * .6; w.y += ux * side * v * .6; }
    }
    if (ci >= 0) g.v[ci] = Math.min(60, g.v[ci] + v * (w.child ? .05 : .14));
    w.moving = true; w.left = dx < 0; w.phase += v * .9;
  }
}
/* ---------- paths. Where people walk often the grass wears away and a path appears by itself, as in any village;
   where nobody walks any more it grows over again. A path trodden hard for a long time is strewn with crushed shell and
   coral sand, as villages did: people walk faster there, and it adorns the village. Nobody lays paths by hand. */
const WEAR_CELL = 6, WEAR_UP = [3, 9, 20, 38], WEAR_VAL = [0, 5, 13, 28, 46], WEAR_TOP = 4, ROAD_AGE = 40, ROAD_MAX = 255;   // four steps from flattened grass to bare packed earth; checks (every 5 ticks) at the deepest wear before shell is strewn; checks it lasts unused
function wearGrid(I){
  if (I._wg) return I._wg;
  const b = I.box, w = Math.ceil((b.x1 - b.x0) / WEAR_CELL) + 1, h = Math.ceil((b.y1 - b.y0) / WEAR_CELL) + 1;
  const g = I._wg = {x0:b.x0, y0:b.y0, w, h, v:new Float32Array(w * h), lv:new Uint8Array(w * h), road:new Uint8Array(w * h), age:new Uint8Array(w * h)};
  // saved as runs of the same level; 5 is a shell path
  if (I.wearSaved){ let i = 0; const c = I.wearSaved; for (let k = 0; k + 1 < c.length; k += 2) for (let n = 0; n < c[k + 1] && i < g.v.length; n++, i++){ const l = Math.min(WEAR_TOP, c[k]); g.lv[i] = l; g.v[i] = WEAR_VAL[l]; if (c[k] === WEAR_TOP + 1){ g.road[i] = 1; g.age[i] = ROAD_MAX; } } I.wearSaved = null; }
  return g;
}
const wearAt = (g, x, y) => { const cx = Math.floor((x - g.x0) / WEAR_CELL), cy = Math.floor((y - g.y0) / WEAR_CELL); return cx < 0 || cy < 0 || cx >= g.w || cy >= g.h ? -1 : cy * g.w + cx; };
/* Every tick the paths fade a little; every few ticks the drawn ones follow, with some slack so they do not flicker.
   Shell is strewn where the path has been deep for a long while, and goes again only after a long time unused. */
function stepWear(I){
  const g = I._wg; if (!g) return;
  for (let i = 0; i < g.v.length; i++) if (g.v[i]) g.v[i] = g.v[i] < .05 ? 0 : g.v[i] * .997;
  if (tick % 5) return;
  let changed = false;
  for (let i = 0; i < g.v.length; i++){
    const v = g.v[i]; let l = g.lv[i];
    while (l < WEAR_TOP && v >= WEAR_UP[l]) l++;
    while (l > 0 && v < WEAR_UP[l - 1] * .75) l--;
    if (l !== g.lv[i]){ g.lv[i] = l; changed = true; }
    if (l === WEAR_TOP){ if (g.age[i] < ROAD_MAX) g.age[i]++; if (!g.road[i] && g.age[i] >= ROAD_AGE){ g.road[i] = 1; g.age[i] = ROAD_MAX; changed = true; } }
    else if (g.age[i] && l < WEAR_TOP - 1){ g.age[i]--; if (g.road[i] && !g.age[i]){ g.road[i] = 0; changed = true; } }
  }
  if (changed){ I._wp = null; invalidate(); }
}
function wearCode(g){ const out = []; for (let i = 0; i < g.lv.length; i++){ const l = g.road[i] ? WEAR_TOP + 1 : g.lv[i]; if (out.length && out[out.length - 2] === l) out[out.length - 1]++; else out.push(l, 1); } return out; }
/* how much shell path a village has, in cells */
const roadCells = I => { const g = I._wg; if (!g) return I.wearSaved ? I.wearSaved.reduce((t, v, k) => k % 2 === 0 && v === WEAR_TOP + 1 ? t + I.wearSaved[k + 1] : t, 0) : 0; let n = 0; for (let i = 0; i < g.road.length; i++) n += g.road[i]; return n; };

/* People keep working while the map is not drawn: the steps are made up in small pieces */
let walkAt = 0;
function walkUntil(now){
  let gap = walkAt ? Math.min(3000, now - walkAt) * gameSpeed : 0; walkAt = now;
  while (gap > 0){ const s = Math.min(50, gap); stepWalkers(s); gap -= s; }
}

/* ---------- work: a workshop runs only with its deposit, its plants nearby and its input goods */
const NEAR_PL_ONE = {pandanus:'Pandanus', palme:'Kokospalmen', baum:'Brotfruchtbäume', garten:'Maulbeergärten', wald:'Bäume'};
const NEAR_PL = new Proxy(NEAR_PL_ONE, {get:(t, k) => String(k).includes(',') ? String(k).split(',').map(q => t[q]).join(' oder ') : t[k]});
function workState(I, b){
  const K = KINDS[b.kind];
  if (b.kind === 'ernte' && NUT_PICKS.has(prodOf(b)) && nutsOf(I, b) < 1) return {why:'nuts', kind:'palme', text:`Die Palmen ringsum sind abgeerntet. Jede Palme trägt etwa eine Nuss pro Minute: Pflanzt mehr Palmen, oder holt Essen vom Meer und vom Feld.`};
  if (SEA_KINDS.has(b.kind) && cycloneOver(I)) return {why:'storm', text:'Sturm: Niemand fährt hinaus, die Kanus liegen an Land.'};
  if (I.settled && unserved(I, b)) return {why:'boat', text:'Kein Einbaum fährt hierher. Ein Kanusteg bringt die Leute hin, jeder Steg für bis zu 4 Plätze.'};
  if (K.crew && I.settled && !crewAt(I, b)){
    const site = staffOf(I).pulled.get(b);
    if (site) return {why:'bau', site:site.id, text:`Die Leute von hier bauen gerade: ${site.bt ? KINDS[site.kind].n : I.yard ? SHIPS[I.yard.kind].n : KINDS[site.kind].n}. Danach geht die Arbeit hier weiter.`};
    return {why:'crew', text:autoWork(I) ? 'Niemand ist frei. Vorrang holt Leute von anderer Arbeit; mehr Hütten bringen neue Familien.' : 'Niemand arbeitet hier. Tippe auf + oder Vorrang.'};
  }
  if (K.trees && !treesNear(I, b.x, b.y, K.trees.r).length) return {why:'trees', text:'Keine Bäume mehr in der Nähe. Ein Baumpflanzer lässt den Wald nachwachsen.'};
  if (K.near){ const n = nearCount(I, K.near.kind, b.x, b.y, K.near.r); if (n < K.near.n) return {why:'near', kind:K.near.kind, text:`Zu wenig ${NEAR_PL[K.near.kind]} in der Nähe, ${n} von ${K.near.n}.`}; }
  if (b.kind === 'ernte' && prodOf(b) === 'holz' && palmsNear(I, b).length <= K.near.n + 3) return {why:'near', kind:'palme', text:`Zum Fällen braucht es mehr als ${K.near.n + 3} Palmen in der Nähe: Es bleiben immer genug stehen.`};
  if (K.prod && (I.stock[prodOf(b)] || 0) >= storeCap(I) && !(K.picks && !(b.v && b.v.pick) && Object.keys(K.picks).some(k => (I.stock[k] || 0) < storeCap(I)))) return {why:'full', text:'Das Lager ist voll. Baue einen Speicher oder schick Waren weg.'};
  if (K.feed === .6 && groupHave(I, 'futter') <= 0) return {why:'use', k:'reste', text:'Die Hühner haben kein Futter: Reste, Kokos oder Feldfrüchte.'};
  if (K.use && !canPay(I, K.use)){ const k = Object.keys(K.use).find(q => groupHave(I, q) < K.use[q]); return {why:'use', k:groupNext(I, k), text:`Es fehlt: ${GN[k]}. Ohne das steht die Arbeit still.`}; }
  return null;
}
/* Every island with a stream has its spring where the stream comes closest to the village; it is part of the island and
   cannot be built or taken away. Islands without a stream drink from green coconuts. */
function ensureSpring(I){
  if (!I.settled || !I.river || I.buildings.some(b => b.kind === 'quelle')) return;
  const at = startSpot(I, KINDS.quelle), p = at && findSpot(I, 'quelle', at); if (!p) return;
  addB(I, 'quelle', p, {}, tick); I.staff = null; syncWalkers(); invalidate();
}
/* ---------- rats. The Pacific rat (kiore) came along in every canoe. On the islands it ate birds' eggs and seeds, and in
   the villages the stores: every minute a twentieth of the field crops, half as much with one storehouse on posts (their
   rat guards keep them off), nothing with two. */
const RAT_SHARE = .05, ratGuard = I => { const n = I.buildings.filter(b => b.kind === 'speicher' && !b.bt).length; return n >= 2 ? 0 : n ? .5 : 1; };
const ratRate = I => (I.stock.nahrung || 0) * RAT_SHARE * ratGuard(I);   // field crops a minute
function ratTick(I){
  if (tick % 30 || tick < (I.grace || 0)) return;
  I.ratAcc = (I.ratAcc || 0) + ratRate(I); const n = Math.min(Math.floor(I.ratAcc), I.stock.nahrung || 0); if (n <= 0) return;
  I.ratAcc -= n; I.stock.nahrung -= n; I.ratAte = (I.ratAte || 0) + n;
  if (!stats.rats && !awayQuiet && I.id === active){ stats.rats = 1; toast(`Ratten sind mit den Kanus gekommen und fressen am Vorrat von ${I.name}. Ein Speicher auf Pfosten hält sie fern.`, 5200); }
}
/* ---------- animals eat all the time: pigs and hens take from the feed (scraps first, then coconut and taro). Without
   feed the hens stop laying and, after a while, a pig is lost. */
const feedNeed = I => ((I.stock.schweine || 0) * KINDS.pferch.feed + I.buildings.filter(b => b.kind === 'huehnerhof' && !b.bt).length * KINDS.huehnerhof.feed) / PER_MIN / DAILY.food;
function feedAnimals(I, ticks){
  const want = feedNeed(I) * ticks; if (!want) return;
  I.oweFeed = (I.oweFeed || 0) + want; const take = Math.floor(I.oweFeed);
  if (take > 0){ pay(I, {futter:Math.min(take, groupHave(I, 'futter'))}); I.oweFeed -= take; }
  // with nothing to eat, every half minute one pig is lost
  if (groupHave(I, 'futter') > 0){ I.starve = 0; return; }
  I.starve = (I.starve || 0) + ticks;
  while (I.starve >= 30 && (I.stock.schweine || 0) > 0){ I.starve -= 30; I.stock.schweine--; if (!awayQuiet && I.id === active) note(`Auf ${I.name} ist ein Schwein eingegangen. Es fehlt Futter.`); }
}
/* ---------- needs: what each island uses, makes and lacks, per minute */
const PER_MIN = 60000 / TICK;
/* A tool that wears out: with it the work goes at full speed, without it slower */
const tooled = (I, K) => !K.boost || (I.stock[K.boost.k] || 0) > 0;
const pace = (I, K) => tooled(I, K) ? 1 : K.boost.slow;
/* What a workplace makes: its good, and what falls off besides (fibre and shells from a ripe nut). The Erntehaus and the
   fishers get what is needed most (choiceOf): ripe nuts, green nuts for water, fronds or an old trunk; fish, seafood, shells
   or cooking stones. The player can hold them to one. */
const choiceOf = b => { const P = KINDS[b.kind].picks; return P ? (b.v && P[b.v.pick] ? b.v.pick : P[b.want] ? b.want : KINDS[b.kind].prod) : null; };
const prodOf = b => KINDS[b.kind].picks ? choiceOf(b) : KINDS[b.kind].prod;
/* People eat and drink once a day, at the morning meal (see mealTick): one portion each. So food and water are made at
   the pace of days: a field gives a sixth of what it gave when people ate all day long, a spring a third. What falls off
   besides (fibre, shells and fronds from the nuts, provisions from the canarium) keeps its pace; leaves and leftovers go
   with the food, as the earth oven that wants them is just as much slower. */
const DAILY = {food:6, water:3}, FOOD_CHAIN = new Set([...FOODS, 'wasser', 'blaetter', 'reste']);
const dailyPace = k => FOODS.includes(k) ? DAILY.food : k === 'wasser' ? DAILY.water : 1;
const BY_CACHE = new Map();
const byOf = b => { const K = KINDS[b.kind], c = choiceOf(b), by = K.picks ? K.picks[c].by || null : K.by || null; if (!by) return null;
  const f = dailyPace(prodOf(b)); if (f === 1) return by;
  const key = b.kind + '|' + c; let o = BY_CACHE.get(key); if (!o){ o = {}; for (const [k, v] of Object.entries(by)) o[k] = FOOD_CHAIN.has(k) ? v : v * f; BY_CACHE.set(key, o); } return o; };
const outOf = b => { const K = KINDS[b.kind]; return K.picks ? K.picks[choiceOf(b)].out || 1 : K.out || 1; };
const slowOf = b => { const K = KINDS[b.kind]; return (K.picks ? K.picks[choiceOf(b)].slow || 1 : 1) * dailyPace(prodOf(b)); };
/* how much each pick is wanted now: what is missing once all the other places have made theirs, against what is in store.
   Fronds are always wanted a little, every roof needs them. */
function pickScores(I, b){
  const K = KINDS[b.kind], st = k => I.stock[k] || 0, cap = storeCap(I), nd = needsOf(I), sc = {};
  const short = k => { const n = nd.list.find(q => q.k === k); if (!n) return workUse(I, k) - makeRate(I, k) * .5; return n.use + n.work - n.make; };
  const want = (k, have) => (Math.max(0, short(k)) + .25) / (have / 4 + 1);
  const has = k => I.buildings.some(q => q.kind === k && !q.bt);
  for (const k of Object.keys(K.picks)){
    let v = 0;
    if (k === 'kokos') v = Math.max(want('essen', haveOf(I, 'essen')) * .9, want('faser', st('faser')) * .7, use0('oel', I) ? want('kokos', st('kokos')) : 0);
    else if (k === 'wasser') v = want('wasser', st('wasser')) * 1.3;
    else if (k === 'dach') v = .8 / (st('dach') / 3 + 1);
    else if (k === 'holz') v = palmsNear(I, b).length > K.near.n + 3 ? (I.type === 'atoll' || !has('faeller') ? .7 : .15) / (st('holz') / 3 + 1) : -1;
    else if (k === 'fisch' || k === 'meeres') v = want('essen', haveOf(I, 'essen')) * (st(k) < st(k === 'fisch' ? 'meeres' : 'fisch') ? 1.05 : 1);
    else if (k === 'muschel') v = has('schmuck') ? (.4 + workUse(I, 'muschel')) / (st('muschel') / 3 + 1) : .02;
    else if (k === 'steine') v = has('umu') ? (.3 + workUse(I, 'steine')) / (st('steine') / 3 + 1) : -1;
    if (st(k) >= cap) v = -1;
    if (b.kind === 'ernte' && NUT_PICKS.has(k) && nutsOf(I, b) < 1 && v > 0) v *= .05;   // picked clean: fronds meanwhile
    sc[k] = v;
  }
  return sc;
}
const use0 = (k, I) => I.buildings.some(q => !q.bt && KINDS[q.kind].use && KINDS[q.kind].use[k]);
function choosePick(I, b){
  const K = KINDS[b.kind]; if (!K.picks || (b.v && K.picks[b.v.pick])) return;
  const sc = pickScores(I, b), best = Object.keys(sc).reduce((m, k) => sc[k] > sc[m] ? k : m);
  if (!K.picks[b.want] || sc[best] > (sc[b.want] ?? -1) * 1.25 + .01){ if (b.want && b.want !== best) b._by = null; b.want = best; }
}
/* the Erntehaus does more with more palms around it, and the work is slower when the store is far away */
/* Palms bear only so many nuts: each palm ripens about one a day, ripe or green. An Erntehaus takes them from the palms
   around it and shares them with every other Erntehaus that reaches the same grove; when they are picked clean it waits
   (or cuts fronds meanwhile). So a palm feeds about one person, and more people want more palms, or fish and fields. */
const NUTS = {every:DAY_TICKS, keep:3}, NUT_PICKS = new Set(['kokos', 'wasser']);
const nutPalms = (I, b) => { const P = palmsNear(I, b).length, sh = I.buildings.filter(q => q.kind === 'ernte' && !q.bt && Math.hypot(q.x - b.x, q.y - b.y) < KINDS.ernte.near.r).length || 1; return P / sh; };
const nutsOf = (I, b) => b.nuts == null ? nutPalms(I, b) * NUTS.keep : b.nuts;
function nutTick(I, n = 1){ for (const b of I.buildings) if (b.kind === 'ernte' && !b.bt){ const p = nutPalms(I, b); b.nuts = Math.min(p * NUTS.keep, nutsOf(I, b) + n * p / NUTS.every);
  // picked clean, the harvesters rest until a few nuts have ripened again, and help elsewhere meanwhile (placesOf)
  const was = !!b.nutRest; b.nutRest = b.nuts < 1 || (was && b.nuts < Math.min(3, p * NUTS.keep * .5)); if (was !== b.nutRest) I.staff = null; } }
const nutRate = (I, b) => nutPalms(I, b) * PER_MIN / NUTS.every;   // nuts a minute this house can count on
const palmF = (I, b) => b.kind === 'ernte' ? clamp(palmsNear(I, b).length / 6, .5, 1.25) : 1;
function wayF(I, b){
  if (b._way && b._way.t > tick - 30) return b._way.v;
  const st = I.buildings.filter(q => !q.bt && (q.kind === 'speicher' || q.kind === 'halle' || HOME_KINDS.has(q.kind)) && q !== b);
  const d = st.length ? Math.min(...st.map(q => Math.hypot(q.x - b.x, q.y - b.y))) : 0;
  return (b._way = {t:tick, v:clamp(1 + (d - 60) / 260, 1, 1.5)}).v;
}
/* the share of a place's full speed it works at now: its people, the palms, the way */
/* How the village shares its day (I.zeal): 0 much free time, 1 balanced, 2 work comes first. More free time makes every
   workplace slower and brings children more often; when workers are needed badly, the work goes faster, nobody takes the
   evening off, and fewer children come, there is no time for them. */
const ZEAL = [{n:'Viel Freizeit', work:.85, birth:1.25, off:[.9, .45]}, {n:'Ausgewogen', work:1, birth:1, off:[.65, .22]}, {n:'Dringend Arbeit', work:1.25, birth:.5, off:[0, 0]}];
const zealOf = I => ZEAL[I && I.zeal != null ? I.zeal : 1];
/* the share of a grown-up's day: sleep at night, the evening off and the rest at noon by the village's choice, the rest work */
function dayShares(I, p){
  const sleep = opts.night ? .33 : 0, Z = zealOf(I), free = !p || !p.job ? null : .14 * Z.off[0] + .07 * Z.off[1];
  if (free == null) return {sleep, free:1 - sleep, work:0};
  return {sleep, free, work:1 - sleep - free};
}
const oldF = (I, b, n) => { const o = b.at ? (staffOf(I).oldAt.get(b) || 0) : 0; return o && n ? 1 - .5 * Math.min(o, n) / n : 1; };   // the old work at half strength
const masterF = b => { const h = b.at && findB(b.at); return h && tierOf(h) >= 3 ? 1.25 : 1; };   // a master family works its craft faster
const workSpeed = (I, b, n) => { const K = KINDS[b.kind]; return (K.crew ? teamF(K, n) : 1) * oldF(I, b, n) * masterF(b) * palmF(I, b) / wayF(I, b) * zealOf(I).work * strengthF(I, b) * (K.crew ? mealF(I, b) : 1); };
/* The yam year. Bare mounds wait for the rains; then the people set the tubers (b.ys 1, b.sown up to 1); the vines grow
   (b.ys 2) until the lean time, when the whole field is dug up at once and the yams go into the store, where they keep.
   A field only half set yields half. Each harvest takes from the soil; a worn field rests. */
const SEASON_IN = id => ({plejaden:'Zeit der Plejaden', sturm:'Sturmzeit', passat:'Passatzeit', mager:'mageren Zeit'})[id] || id;
function yamTick(I, b, K, n, mult = 1){
  const Y = K.yam, S = seasonOf().id;
  // the harvest is kept on racks by the field (a yam house) and goes into the store as there is room, all year long
  if (b.kept > 0){ const room = Math.max(0, storeCap(I) - (I.stock.nahrung || 0)), m = Math.min(b.kept, room, 2 * mult); if (m > 0){ I.stock.nahrung = (I.stock.nahrung || 0) + m; b.kept -= m; } }
  if (!b.ys){ if (S === Y.plant){ b.ys = 1; b.sown = 0; I.staff = null; invalidate(); } else { b.idle = {why:'yam', text:`Gepflanzt wird in der ${SEASON_IN(Y.plant)}.`}; return; } }
  if (b.ys === 1){
    if (S !== Y.plant){ b.ys = b.sown >= .25 ? 2 : 0; if (!b.ys) b.sown = 0; I.staff = null; invalidate(); return; }
    b.sown = Math.min(1, (b.sown || 0) + workSpeed(I, b, n) * mult / Y.work); b.idle = n ? null : {why:'crew', text:'Niemand legt die Knollen.'};
    if (b.sown >= 1){ b.ys = 2; I.staff = null; invalidate(); }
    return;
  }
  b.idle = {why:'grow', text:`Die Ranken wachsen. Geerntet wird, wenn die ${SEASON_IN(Y.harvest)} beginnt.`};
  if (S !== Y.harvest) return;
  const got = Math.round(Y.out * (b.sown || 1) * Math.max(.4, b.soil ?? 1) / DAILY.food);
  b.kept = (b.kept || 0) + got; stats.yams = (stats.yams || 0) + got; if (got > 0) I.yamAt = tick;
  b.ys = 0; b.sown = 0; b.soil = Math.max(0, (b.soil ?? 1) - .22); b.idle = null; if (b.soil < .3){ b.fallow = true; } I.staff = null; invalidate();
  if (!awayQuiet && I.id === active){ toast(`Yamsernte: ${got} Feldfrüchte. Sie halten sich auf dem Gestell am Feld.`, 3200); sfx('rise'); }
}
function makeRate(I, k){
  let m = k === 'wild' ? forageRate(I) : k === 'reisig' ? gatherRate(I) : 0;
  for (const b of I.buildings){ const K = KINDS[b.kind]; if (!K.prod || b.bt || b.boat > 0 || (b.idle && b.idle.why !== 'full')) continue;
    if (K.yam) continue;   // the yam field gives once a year (see yamTick)
    const f = prodOf(b) === k ? 1 : (byOf(b) || {})[k] || 0; if (!f) continue;
    let r = PER_MIN / K.every / slowOf(b) / pace(I, K) / (K.soil ? soilPace(b) : 1) * workSpeed(I, b, crewAt(I, b));
    if (b.kind === 'ernte' && NUT_PICKS.has(prodOf(b))) r = Math.min(r, nutRate(I, b));   // no more than the palms bear
    m += f * (prodOf(b) === k ? outOf(b) : 1) * r; }
  return m;
}
/* one piece made: the good, and the bits that fall off, which add up until a whole one is there */
function makePiece(I, b, add){
  if (b.kind === 'ernte' && prodOf(b) === 'holz' && !fellPalm(I, b)) return;
  add(prodOf(b), outOf(b)); const by = byOf(b); if (!by) return;
  b._by = b._by || {}; for (const [k, v] of Object.entries(by)){ b._by[k] = (b._by[k] || 0) + v; const n = Math.floor(b._by[k] + 1e-9); if (n){ b._by[k] -= n; add(k, n); } }
}
/* an old palm is felled for its trunk, and a sprouting nut is set in its place */
function fellPalm(I, b){
  const P = palmsNear(I, b); if (P.length <= KINDS[b.kind].near.n + 3) return false;
  const old = P.reduce((m, q) => q.born < m.born ? q : m), i = I.buildings.indexOf(old); if (i < 0) return false;
  falling(old.x, old.y, {palm:{...old}, isl:I.id}, b); I.buildings.splice(i, 1); const y = addB(I, 'palme', old, variant('palme'), tick); y.bt = KINDS.palme.bt; stats.palmholz = (stats.palmholz || 0) + 1; invalidate(); return true;
}
function workUse(I, k){
  let u = 0;
  for (const b of I.buildings){
    const K = KINDS[b.kind]; if (b.bt || (b.idle && b.idle.why !== 'full')) continue;
    if (K.use) for (const [q, v] of Object.entries(K.use)) if (q === k || groupNext(I, q) === k && GROUPS[q]) u += PER_MIN / K.every * v;
    if (K.boost && K.boost.k === k && tooled(I, K)) u += PER_MIN / K.every / K.boost.per;
    if (k === 'haken' && b.kind === 'fisch' && crewAt(I, b) && (I.stock.haken || 0) > 0) u += PER_MIN / K.every / HOOK.per;
  }
  return u;
}
/* basic needs hold for everyone, the others for the families whose house has reached that step */
const needActive = (I, N) => N.lvl === 1 || popTier(I, N.lvl) > 0;
// at the morning meal everyone eats and drinks one portion, children too
const eaters = I => (I.people || []).length || I.pop;
const needPop = (I, N) => N.k === 'brenn' ? fireHomes(I).length : N.lvl === 1 ? eaters(I) : popTier(I, N.lvl);   // the fire is counted by houses
/* Food is everything people eat; any other need is one good */
/* the goods that meet a need: food of every kind; pots, and from Hawaiki on wooden bowls as well */
const needGoods = k => k === 'essen' ? FOODS : k === 'brenn' ? GROUPS.brenn : k === 'toepfe' && stats.hawaiki ? ['toepfe', 'kumete'] : [k];
/* the hearth fire takes the coconut shells first, which are left over anyway, and only then wood, which is built with */
const burnFirst = (k, st) => k === 'brenn' ? GROUPS.brenn.find(q => (st[q] || 0) > 0) : null;
const ofNeed = (k, f) => needGoods(k).reduce((t, q) => t + f(q), 0);
const haveOf = (I, k) => ofNeed(k, q => I.stock[q] || 0);
function needsOf(I){
  const list = NEEDS.filter(N => needActive(I, N)).map(N => {
    const use = needPop(I, N) * N.rate, work = ofNeed(N.k, q => workUse(I, q)), make = ofNeed(N.k, q => makeRate(I, q)), stock = haveOf(I, N.k), all = use + work;
    const state = make >= all ? 'ok' : stock > 0 ? 'low' : 'out';
    return {N, k:N.k, use, work, make, stock, state, mins:make < all ? stock / (all - make) : Infinity};
  });
  const cap = popCap(I), missing = list.filter(n => n.state === 'out'), roomy = homesOf(I).some(b => !famOfHome(I, b) || membersOf(I, famOfHome(I, b)).length < homeCap(I, b));
  return {list, cap, missing, full:!roomy, atMax:I.pop >= islandMax(I), roofless:roofless(I), next:NEEDS.find(N => !needActive(I, N)), growing:!!growTarget(I, list)};
}
/* ---------- the morning meal. At dawn everyone eats one portion and drinks one, and then nothing more that day. Whoever
   lives in a family house or better gets a cooked meal from the earth oven while there is one, the others what there is
   most of. The children and the old are served first, then the families by how long they have lived here. Whoever gets
   nothing works slower that day (MEAL); is it too little on HUNGER_GO mornings in a row, the family that came last packs
   up and leaves, never the last one (and never while you are away). */
const MEAL = {slow:.75, both:.55}, MEAL_NEEDS = new Set(['essen', 'wasser', 'speisen', 'brenn']);   // eaten at the morning meal; the fuel burns at the night fire
const mealFx = [];   // bowls over the houses at dawn, for the eye (render.js)
const RAW_FOODS = FOODS.filter(k => k !== 'speisen');
function mealTick(I){
  syncPeople(I);
  const P = (I.people || []).slice(), st = I.stock; if (!P.length) return;
  const rank = p => { const a = stageOf(p); return a === 'kid' ? 0 : a === 'old' ? 1 : 2; };
  P.sort((a, b) => rank(a) - rank(b) || (a.h || 0) - (b.h || 0) || a.id - b.id);
  const tierP = new Map(); for (const f of famsOf(I)){ const h = f.home && findB(f.home); tierP.set(f.id, h ? tierOf(h) : 1); }
  let hungry = 0, thirsty = 0; const famShort = new Set();
  for (const p of P){
    let ate = false;
    if ((tierP.get(p.h) || 1) >= 2 && (st.speisen || 0) > 0){ st.speisen--; ate = true; }
    else { const k = RAW_FOODS.reduce((m, q) => (st[q] || 0) > (st[m] || 0) ? q : m, RAW_FOODS[0]); if ((st[k] || 0) > 0){ st[k]--; ate = true; } else if ((st.speisen || 0) > 0){ st.speisen--; ate = true; } }
    const drank = (st.wasser || 0) > 0; if (drank) st.wasser--;
    p.meal = (ate ? 0 : 1) + (drank ? 0 : 2);
    if (!ate) hungry++; if (!drank) thirsty++; if (p.meal) famShort.add(p.h);
  }
  I._mf = null; I._fore = null; I.meal = {at:tick, n:P.length, hungry, thirsty};
  if (!awayQuiet && I.id === active) mealFx.push({isl:I.id, t0:performance.now(), short:famShort});
  if (!hungry && !thirsty){ I.hunger = 0; if (!stats.meal && !awayQuiet && I.id === active){ stats.meal = 1; toast('Morgenmahl: Jeder isst und trinkt am Morgen eine Portion, dann nichts mehr. Fehlt etwas, arbeiten die Leute an dem Tag langsamer.', 6500); } return; }
  I.hunger = (I.hunger || 0) + 1; stats.meal = 1;
  const what = [hungry ? `${hungry} ohne Essen` : '', thirsty ? `${thirsty} ohne Wasser` : ''].filter(Boolean).join(', ');
  if (I.hunger >= HUNGER_GO && famsOf(I).length > 1 && !awayQuiet){ I.hunger = 0; famLeaves(I, hungry >= thirsty ? 'essen' : 'wasser'); return; }
  if (awayQuiet || I.id !== active) return;
  const f = leaverOf(I), warn = I.hunger === HUNGER_GO - 1 && f && famsOf(I).length > 1 ? ` Reicht es morgen wieder nicht, fährt ${famName(f)} fort.` : '';
  toast(`Morgenmahl auf ${I.name}: ${what}. Sie arbeiten heute langsamer.${warn}`, 4200);
}
/* how fast someone works after the morning meal: 1 fed, slower hungry or thirsty, slower still both */
const mealOf = (I, id) => { if (!I._mf){ I._mf = new Map(); const S = I._sat;
    for (const p of I.people || []){ let f = p.meal === 3 ? MEAL.both : p.meal ? MEAL.slow : 1; if (p.cold) f *= FIRE.slow;
      const v = S && S.by.get(p.id); if (v != null) f *= v < SAT.low ? .9 : v >= SAT.high ? 1.05 : 1; if (f !== 1) I._mf.set(p.id, f); } }
  return I._mf.get(id) ?? 1; };
const mealF = (I, b) => { const ids = staffOf(I).crewP.get(b); if (!ids || !ids.length) return 1; let t = 0; for (const id of ids) t += mealOf(I, id); return t / ids.length; };
/* the next morning: what there will be by then (the store now and what is made until dawn, as far as the store holds
   it) against one portion for everyone */
// (kept for a few ticks: the work is shared out by it, and the rates it reads depend on who works where)
function mealFore(I){
  if (I._fore && tick - I._fore.t < 5) return I._fore.v;
  const n = eaters(I);
  if (I._foreBusy) return I._fore ? I._fore.v : {n, left:0, food:haveOf(I, 'essen'), water:I.stock.wasser || 0};
  I._foreBusy = true;
  try {
    const left = (DAY_TICKS - (tick + 30) % DAY_TICKS) / PER_MIN, cap = storeCap(I);
    const by = k => Math.min(cap, (I.stock[k] || 0) + Math.max(0, makeRate(I, k) - workUse(I, k)) * left);
    return (I._fore = {t:tick, v:{n, left, food:Math.floor(FOODS.reduce((t, k) => t + by(k), 0)), water:Math.floor(by('wasser'))}}).v;
  } finally { I._foreBusy = false; }
}
/* ---------- the night fire. At dusk every house where a family lives lights its hearth for the night: light, warmth,
   smoke against the mosquitoes. It burns one piece of fuel: coconut shells first, which are left over anyway, then twigs
   the children and the old gather, then wood (burnFirst). The families who came first light first; where nothing is
   left, the house stays dark, the family sleeps cold and works slower the next day (FIRE.slow). */
const FIRE = {slow:.85}, DUSK_AT = Math.round(.66 * DAY_TICKS);   // .66: where the night begins (DAY_END in ui.js)
const fireHomes = I => homesOf(I).filter(b => !b.bt && famOfHome(I, b));
function fireTick(I){
  const H = fireHomes(I).sort((a, b) => famOfHome(I, a).id - famOfHome(I, b).id), coldFam = new Set();
  for (const b of H){ const k = burnFirst('brenn', I.stock); if (k){ I.stock[k]--; b.fire = true; } else { b.fire = false; coldFam.add(famOfHome(I, b).id); } }
  for (const p of I.people || []) p.cold = coldFam.has(p.h);
  I._mf = null; I.fire = {at:tick, n:H.length, cold:coldFam.size};
  if (awayQuiet || I.id !== active) return;
  if (!coldFam.size){ if (!stats.fire){ stats.fire = 1; toast('Nachtfeuer: Jedes Haus brennt nachts ein Feuer, aus Kokosschalen, Reisig oder Holz. Ohne Feuer frieren die Leute und arbeiten am Tag darauf langsamer.', 6500); } return; }
  stats.fire = 1; toast(`Nachtfeuer auf ${I.name}: ${coldFam.size === 1 ? 'Ein Haus bleibt' : `${coldFam.size} Häuser bleiben`} ohne Feuer. Dort frieren die Leute und arbeiten morgen langsamer.`, 4200);
}
/* the coming night: fuel by dusk (the store and what comes in until then) against one fire for every house */
function fireFore(I){   // cached and guarded like mealFore: makeRate asks the staff, the staff asks needOf, needOf asks this
  if (I._ffore && tick - I._ffore.t < 5) return I._ffore.v;
  const n = fireHomes(I).length;
  if (I._ffBusy) return I._ffore ? I._ffore.v : {n, fuel:GROUPS.brenn.reduce((t, k) => t + (I.stock[k] || 0), 0), left:0};
  I._ffBusy = true;
  try {
    const p = ((tick + 30) % DAY_TICKS), left = ((DUSK_AT - p + DAY_TICKS) % DAY_TICKS || DAY_TICKS) / PER_MIN, cap = storeCap(I);
    const fuel = GROUPS.brenn.reduce((t, k) => t + Math.min(cap, (I.stock[k] || 0) + Math.max(0, makeRate(I, k) - workUse(I, k)) * left), 0);
    return (I._ffore = {t:tick, v:{n, fuel:Math.floor(fuel), left}}).v;
  } finally { I._ffBusy = false; }
}
const fireShort = I => { const F = fireFore(I); return F.n > 0 && F.fuel < F.n; };
/* ---------- contentment. Every person has a value from 0 to 100: what they had this morning and tonight, the roof over
   them, what their house step wants, room, the village's share of work and free time, a feast, a beautiful village.
   Very content people work a little faster, discontent ones slower (mealOf). The top bar shows the village's average;
   a tap shows the least content person, why, and what helps. */
const SAT = {base:72, low:35, high:85, hungry:-20, thirsty:-20, cold:-12, roofless:-25, leak:-5, broken:-12, needOut:-7, needLow:-2, crowded:-8, zeal:[8, 0, -15], feast:10, beauty:8};
const ZEAL_SAT_TXT = ['viel Freizeit', '', 'viel Arbeit'];
function satOf(I, p, nd = needsOf(I)){
  const why = []; let v = SAT.base; const add = (k, d, t) => { if (!d) return; v += d; why.push({k, d, t}); };
  if (p.meal & 1) add('essen', SAT.hungry, 'ohne Essen');
  if (p.meal & 2) add('wasser', SAT.thirsty, 'ohne Wasser');
  if (p.cold) add('feuer', SAT.cold, 'friert nachts');
  const f = famOf(I, p.h), h = f && f.home && findB(f.home);
  if (!h) add('dach', SAT.roofless, 'ohne Dach');
  else {
    const r = roofState(h); if (r === 'out') add('dach', SAT.broken, 'Dach kaputt'); else if (r === 'low') add('dach', SAT.leak, 'Dach undicht');
    for (const n of famNeeds(I, f, nd.list)) if (!['dach', 'essen', 'wasser', 'brenn'].includes(n.k)){ if (n.state === 'out') add(n.k, SAT.needOut, `${GN[n.k]} fehlt`); else if (n.state === 'low') add(n.k, SAT.needLow, `${GN[n.k]} knapp`); }
    if (membersOf(I, f).length > homeCap(I, h)) add('enge', SAT.crowded, 'zu eng');
  }
  const z = I.zeal != null ? I.zeal : 1, a = stageOf(p); if (a !== 'kid' && z !== 1) add('zeit', a === 'old' ? Math.round(SAT.zeal[z] / 2) : SAT.zeal[z], ZEAL_SAT_TXT[z]);
  if (I.joyUntil > tick) add('fest', SAT.feast, 'Fest');
  add('schoen', Math.round(clamp(beautyOf(I) / Math.max(4, I.pop) * 2, 0, 1) * SAT.beauty), 'schönes Dorf');
  return {v:clamp(Math.round(v), 0, 100), why};
}
function satTick(I){
  syncPeople(I); const nd = needsOf(I), by = new Map(), all = [];
  for (const p of I.people || []){ const s = satOf(I, p, nd); by.set(p.id, s.v); all.push([p, s]); }
  all.sort((x, y) => x[1].v - y[1].v);
  I._sat = {t:tick, by, all, avg:all.length ? Math.round(all.reduce((t, x) => t + x[1].v, 0) / all.length) : 0}; I._mf = null;
  return I._sat;
}
const satOfIsle = I => I._sat && tick - I._sat.t < 15 ? I._sat : satTick(I);
/* Levels: a hamlet, a village from thirty, and a chief's village. That needs a big high island, the chief's house with
   its family, everything that family wants, people, standing and beauty. It stays one while the chief's family lacks nothing. */
function chiefSteps(I, nd){
  const f = chiefFam(I), lack = f ? famNeeds(I, f, nd.list).filter(n => n.state === 'out').map(n => n.k === 'dach' ? 'Dach' : GN[n.k]) : [];
  return [
    {t:'Die große Fahrt: ein Dorf auf den Fernen Inseln', ok:hawaiki(), now:hawaiki() ? 'ja' : 'noch nicht'},
    {t:`Eine große hohe Insel, die ${CHIEF.isle} Menschen trägt`, ok:I.type === 'hoch' && islandMax(I) >= CHIEF.isle, now:`${islandMax(I)}`},
    {t:'Ein Häuptlingshaus', ok:I.buildings.some(b => b.kind === 'fale' && !b.bt), now:I.buildings.some(b => b.kind === 'fale' && !b.bt) ? 'steht' : I.buildings.some(b => b.kind === 'fale') ? 'im Bau' : 'fehlt'},
    {t:'Die Häuptlingsfamilie hat alles', ok:!!f && !lack.length, now:f ? (lack.length ? `es fehlt ${andList(lack)}` : 'ja') : 'noch keine'},
    {t:`${CHIEF.pop} Bewohner`, ok:I.pop >= CHIEF.pop, now:`${I.pop}`},
    {t:`Ansehen ${CHIEF.mana}`, ok:mana >= CHIEF.mana, now:`${Math.floor(mana)}`},
    {t:`Schönheit ${CHIEF.beauty}`, ok:beautyOf(I) >= CHIEF.beauty, now:`${beautyOf(I)}`}
  ];
}
function updateLevel(I, nd){
  const f = chiefFam(I), lack = f ? famNeeds(I, f, nd.list).some(n => n.state === 'out') : true;
  if (I.lvl === 3){
    I.chiefMiss = lack ? (I.chiefMiss || 0) + 1 : 0;
    if (I.chiefMiss >= 30 || !f){ I.lvl = I.pop >= VILLAGE_POP ? 2 : 1; I.chiefMiss = 0; I.chiefBan = tick + 60; invalidate(); toast(`${I.name} ist kein Häuptlingsdorf mehr. Der Häuptlingsfamilie fehlt etwas.`, 4200); }
    return;
  }
  if (tick >= (I.chiefBan || 0) && chiefSteps(I, nd).every(s => s.ok)){
    I.lvl = 3; invalidate(); const m = eldest(I, f, 'f'), c = eldest(I, f, 'm');
    toast(`${I.name} ist jetzt ein Häuptlingsdorf.${m ? ` ${m.n} führt die Häuptlingsfamilie${c ? `, ihr Bruder ${c.n} ist Häuptling` : ''}.` : ''}`, 5200); return;
  }
  I.lvl = I.pop >= VILLAGE_POP ? 2 : 1;
}
const chiefGoods = I => CHIEF_GOODS.every(k => (I.stock[k] || 0) > 0);
/* ---------- feasts: food, pots, pigs and bark cloth for standing */
/* who has come of age and carries no pattern yet */
const youthsOf = I => (I.people || []).filter(p => isAdult(p) && ageOf(p) < 20 && !p.tt);
function feastState(I, F){
  if (!centerOf(I) && !I.buildings.some(b => b.kind === 'halle')) return 'Feste feiert man am Dorfzentrum.';
  if (F.per && !youthsOf(I).length) return 'Niemand ist gerade erwachsen geworden.';
  const wait = (I.feastAt || -FEAST_PAUSE) + FEAST_PAUSE - tick; if (I.feastAt && wait > 0) return `Das nächste Fest geht in ${Math.ceil(wait * TICK / 1000)} Sekunden.`;
  if (!canPay(I, F.cost)) return `Fehlt: ${lacking(I, F.cost)}.`;
  return '';
}
function holdFeast(I, F){
  const no = feastState(I, F); if (no){ toast(no, 2600, false); return; }
  const gain = feastMana(I, F), young = F.per ? youthsOf(I) : []; pay(I, F.cost); mana += gain; I.feastAt = tick;
  for (const p of young){ p.tt = 1; lifeEvent(p, 'tat'); for (const w of walkers) if (w.isl === I.id && w.pid === p.id && !w.look.endsWith('t')) w.look += 't'; }
  if (young.length) stats.tatau = (stats.tatau || 0) + young.length; I.feastEnd = tick + FEAST_LEN; if (F.joy) I.joyUntil = tick + F.joy; if (F.id === 'schatz') stats.schatzfest = (stats.schatzfest || 0) + 1;
  for (const w of walkers) if (w.isl === I.id){ nextLeg(w); w.wait = 0; }
  for (let i = 0; i < 6; i++) heartAt(I);
  updateHUD(); if (sheetKind) renderSheet(); save(); checkQuest();
  toast(young.length ? `Tatau auf ${I.name}: ${andList(young.map(p => p.n))} ${young.length === 1 ? 'trägt' : 'tragen'} jetzt ${young.length === 1 ? 'ihr Muster' : 'ihre Muster'}. Ansehen +${gain}.` : `${F.n} auf ${I.name}. Ansehen +${gain}${afterHarvest(I) ? ', nach der Yamsernte' : ''}.`, 4200);
}
/* The rain dance: in the dry time the village dances on the plaza by the village centre and calls the rain, as people on
   the islands asked the gods and the ancestors for rain (known from later accounts). Once a moon; the dancers are fed.
   After the dance a rain cloud stands over the village: the water vessels fill, a drought ends, the fields drink. */
const RAIN = {cost:{roh:2}, dance:8, len:24, water:1};
const raining = I => I.rainUntil > tick && tick >= (I.rainAt || 0) + RAIN.dance;
function rainState(I){
  if (!centerOf(I)) return 'Getanzt wird am Dorfzentrum.';
  if (I.rainUntil > tick) return raining(I) ? 'Es regnet.' : 'Das Dorf tanzt.';
  if (seasonOf().id === 'sturm' && !(I.drought > tick)) return 'In der Sturmzeit regnet es von selbst.';
  const wait = (I.rainUntil || 0) + MOON - tick; if (I.rainUntil && wait > 0) return `Wieder in ${Math.ceil(wait * TICK / 1000)} Sekunden.`;   // a moon after the rain
  if (!canPay(I, RAIN.cost)) return 'Fehlt: Essen für die Tänzer.';
  return '';
}
function rainDance(I){
  const no = rainState(I); if (no){ toast(no, 2400, false); return false; }
  pay(I, RAIN.cost); I.rainAt = tick; I.rainUntil = tick + RAIN.dance + RAIN.len; I.feastEnd = Math.max(I.feastEnd || 0, tick + RAIN.dance); I.drought = 0;
  for (const w of walkers) if (w.isl === I.id){ nextLeg(w); w.wait = 0; }
  stats.regentanz = (stats.regentanz || 0) + 1;
  updateHUD(); if (sheetKind) renderSheet(); save();
  if (I.id === active) toast(`${I.name} tanzt am Dorfplatz und ruft den Regen.`, 3600);
  return true;
}
let hearts = [], sunKey = '';   // a heart rises over a house when someone moves in
function econ(){
  if (landing){ lastEconAt = performance.now(); requestDraw(); return; }   // time begins when the clan has landed
  tick++; lastEconAt = performance.now();
  for (const I of islands){
    if (!I.settled) continue;
    const st = I.stock, cap = storeCap(I), add = (k, n) => { st[k] = Math.min(cap, (st[k] || 0) + n); };
    syncPeople(I); lifeTick(I); navTick(I); if (tick % 20 === 0) storyTick(I); cleanCrafts(I); oldShops(I); if (tick % 15 === 0) ensureSpring(I);
    roofTick(I); mendTick(I); stormTick(I); gatherTick(I); nutTick(I); if (tick % 5 === 0) payRebuilds(I);
    if (raining(I)){ I._rw = (I._rw || 0) + RAIN.water / DAILY.water; if (I._rw >= 1){ add('wasser', Math.floor(I._rw)); I._rw -= Math.floor(I._rw); } if (tick === I.rainAt + RAIN.dance && I.id === active) toast(`Regen über ${I.name}: Die Gefäße füllen sich, die Felder trinken.`, 3600); }
    // young plants grow by themselves; building sites and dugouts move on only while their builders are there (see buildBit)
    const sf = staff(I), on = presentAt(I);
    for (const b of I.buildings){
      if (!b.bt) continue;
      if (KINDS[b.kind].plant) b.bt -= 1;
      if (b.bt <= .001){ delete b.bt; delete b.got; done(I, b); }
    }
    // a dugout is carved before anyone goes out on the water
    for (const b of I.buildings){
      if (!(b.boat > 0)) continue;
      const q = Math.floor((1 - b.boat / KINDS[b.kind].canoe) * 3); if (q !== b._q){ b._q = q; invalidate(); }
      if (b.boat <= .001){ delete b.boat; invalidate(); syncWalkers(); if (I.id === active) toast(`Der Einbaum ${b.kind === 'steg' ? 'am Kanusteg' : 'der Fischer'} ist fertig.${b.kind === 'fisch' ? ' Jetzt fahren sie hinaus.' : ''}`, 2600); }
    }
    for (const b of I.buildings) if (b.bt){ const q = Math.floor((1 - b.bt / KINDS[b.kind].bt) * 10); if (q !== b._q){ b._q = q; invalidate(); } }
    for (const b of I.buildings){
      const K = KINDS[b.kind]; if (!(K.prod || K.plants) || b.bt) continue;
      if (b.boat > 0){ b.idle = {why:'carving', text:'Erst wird der Einbaum geschnitzt, dann geht es aufs Wasser.'}; continue; }
      // a field lying fallow rests: its soil comes back, and it is tilled again once it has
      if (b.fallow){ b.soil = Math.min(1, (b.soil ?? 1) + .012); b.idle = {why:'fallow', text:'Das Feld liegt brach. Der Boden erholt sich.'};
        if (b.soil >= .98){ b.fallow = false; b.idle = null; if (K.grow) b.grow = Math.round(K.grow / 2); I.staff = null; invalidate(); if (I.id === active) toast(`Ein ${K.n} ist ausgeruht und wird neu bepflanzt.`, 2600); } continue; }
      if (K.yam){ yamTick(I, b, K, Math.min(sf.crew.get(b) || 0, on.get(b) || 0)); continue; }
      // still growing: nobody is needed, nothing to harvest yet
      if (b.grow > 0){ b.grow -= 1; b.idle = {why:'grow', text:`Wächst noch ${secsText(b.grow * TICK / 1000)}.`}; if (b.grow <= 0){ delete b.grow; b.idle = null; I.staff = null; invalidate(); } continue; }
      if (K.picks && tick % 5 === 0) choosePick(I, b);
      // only those who have got there work; with fewer than there is room for the work goes slower, and in pairs
      // much slower alone; the work moves on bit by bit, so slow places still make something
      const n = K.crew ? Math.min(sf.crew.get(b) || 0, on.get(b) || 0) : 1;
      if (K.crew && !n){ b.idle = workState(I, b) || {why:'way', text:'Die Leute sind auf dem Weg hierher.'}; continue; }
      if (K.trip){ if (K.dive) b.idle = workState(I, b) || diveBlock(I); else b.idle = workState(I, b); if (tick % 20 === 0 && b.hung > 0) b.hung--; continue; }   // fishers bring the catch themselves
      const ev = seasonalEvery(I, b, K); if (!ev){ b.idle = null; continue; }
      b.work = (b.work || 0) + workSpeed(I, b, n) / (ev * slowOf(b) * pace(I, K) * (K.soil ? soilPace(b) : 1));
      if (b.work < 1){ if (b.idle && b.idle.why === 'way') b.idle = null; continue; }
      b.idle = workState(I, b); if (b.idle){ b.work = Math.min(b.work, 1); continue; }
      b.work -= 1;
      if (K.plants){ if (!plantTree(I, b)) b.idle = {why:'space', text:'In der Nähe ist kein Platz mehr für junge Bäume.'}; continue; }
      if (K.use) pay(I, K.use);
      if (K.trees) fellTree(I, b);
      if (prodOf(b) === 'fisch') stats.fisch++;
      if (K.soil) drainSoil(I, b);
      if (K.boost && tooled(I, K) && (b.worn = (b.worn || 0) + 1) >= K.boost.per){ b.worn = 0; st[K.boost.k]--; }   // the net tears, the adze breaks
      if (b.kind === 'ernte' && NUT_PICKS.has(prodOf(b))) b.nuts = Math.max(0, nutsOf(I, b) - 1);
      makePiece(I, b, add);
    }
    growTrees(I); stepWear(I); wildTick(I); I.reefLife = Math.min(1, (I.reefLife ?? 1) + .0012 * (I.rahui ? 3 : 1));
    // use up what people need; fractions carry over so small villages use little. Food and water are eaten only at
    // the morning meal (mealTick); the fire, the pots, the mats and the rest are used all day.
    if ((tick + 30) % DAY_TICKS === 0){ mealTick(I); packTick(I); }
    if ((tick + 30) % DAY_TICKS === DUSK_AT) fireTick(I);
    if (tick % 15 === 0) satTick(I);
    eldersTick(I);   // a daughter village led by its elders
    I.owe = I.owe || {};
    for (const N of NEEDS){
      if (!needActive(I, N) || MEAL_NEEDS.has(N.k)) continue;
      I.owe[N.k] = (I.owe[N.k] || 0) + needPop(I, N) * N.rate / PER_MIN;
      const take = Math.floor(I.owe[N.k]); if (take <= 0) continue; I.owe[N.k] -= take;
      const ks = needGoods(N.k); if (ks.length < 2){ st[N.k] = Math.max(0, (st[N.k] || 0) - take); continue; }
      // people eat what there is most of, and use the bowl or the pot there is more of; the hearth burns shells before wood
      for (let i = 0; i < take; i++){ const k = burnFirst(N.k, st) || ks.reduce((m, q) => (st[q] || 0) > (st[m] || 0) ? q : m); if (st[k] > 0) st[k]--; }
    }
    feedAnimals(I, 1); ratTick(I);
    let nd = needsOf(I);
    updateLevel(I, nd); nd = needsOf(I);
    // the village grows: children in the family houses, families by canoe from far away into empty huts
    birthTick(I); immigTick(I);
    tierTick(I, nd.list); rooflessTick(I); crowdTick(I); prioTick(I);
    if (nd.atMax && !I.fullSaid && I.id === active && !awayQuiet){ I.fullSaid = true; toast(`${I.name} ist voll: Mehr als ${islandMax(I)} Menschen trägt die Insel nicht. Schickt Familien im Kanu aus und gründet ein neues Dorf.`, 6000); } else if (!nd.atMax) I.fullSaid = false;
    // (hunger is counted in mornings, see mealTick.) Room in the houses shrinks only after half a minute of nothing.
    { const d = I.dry || (I.dry = {}); for (const n of nd.list) d[n.k] = n.stock > 0 ? 0 : (d[n.k] || 0) + 1; }
  }
  stageTick();
  if (tick % 2 === 0){ const was = $('quest').hidden; renderQuest(); if (was !== $('quest').hidden) measure(); }   // the elders' advice follows the village
  if (tick % MANA_FADE === 0) mana = Math.max(0, mana - 1);
  // a beautiful village adds to the clan's standing, every half minute, as far as its people can enjoy it, at most 2 a minute
  if (tick % 15 === 0) for (const I of islands) if (I.settled) mana += Math.min(1, Math.floor(Math.min(beautyOf(I), I.pop / 2) / 6));
  for (const I of islands) if (!I.settled && I._wg) stepWear(I);   // the clans' paths too
  if (tick % 20 === 0) rollAhead();
  if (tick % 10 === 0 && !stats.signs && !awayQuiet && dayPhase() < .62 && navHints().some(h => boxIn(h.I.box, view(200)))){ stats.signs = 1; toast('Seevögel fliegen aus dem Nebel und wieder hinein: Dort liegt Land. Tippe auf die Vögel.', 6000); }
  cycloneTick();
  if (tick % 10 === 0) for (const I of islands) if (I.settled || (I.clan && I.discovered)) motifTick(I);
  answerGifts(); stepYards(); feedCrews(); stepTreasure(); driftTick(); calendarTick(); eventTick(); if (tick % 5 === 0) chronikTick();
  // a cord to a clan slackens when no gift has gone along it for a long time
  for (const r of routes){ const T = clanOfRoute(r); if (T && r.knots > 0 && tick - (r.lastGift || 0) > 90){ r.lastGift = tick; if (!bondsWith(T)){ r.knots--; invalidate(); } } }   // kin by marriage: the cord holds
  if (tick % 8 === 0) invalidate();   // roofs age
  { const k = sunShadow().key; if (k !== sunKey){ sunKey = k; invalidate(); } }   // the shadows follow the sun
  syncWalkers(); if (performance.now() - walkAt > 400) walkUntil(performance.now());   // the map is not drawn, so the people walk on from here
  requestDraw(); updateHUD(); if (placing) ghostRender(); checkQuest();
  if (sheetKind && sheetSig() !== lastSig) renderSheet();
  if (tick % 3 === 0) save();
}
/* ---------- the land wears out. Every harvest takes from a field's soil and the work goes slower; trees standing close by
   (breadfruit, coconut, the forest edge) shelter it, so it tires half as fast, as in the old tree gardens. A field left fallow
   recovers in two minutes or so. Where too much forest is cut, the rain washes the earth into the sea: fields tire faster
   and silt chokes the reef. */
const soilPace = b => 1 / clamp((b.soil ?? 1) + .3, .45, 1);
function sheltered(I, b){
  if (b._agro && b._agro.t > tick - 20) return b._agro.v;
  const n = I.trees.filter(t => t.st === 0 && Math.hypot(t.x - b.x, t.y - b.y) < 55).length + I.buildings.filter(q => (q.kind === 'baum' || q.kind === 'palme') && !q.bt && Math.hypot(q.x - b.x, q.y - b.y) < 55).length;
  return (b._agro = {t:tick, v:n >= 2}).v;
}
function drainSoil(I, b){
  const before = b.soil ?? 1; b.soil = Math.max(.12, before - .005 * [1, 1.6, 2.6][erosionOf(I)] * (sheltered(I, b) ? .5 : 1));
  if ((before >= .45) !== (b.soil >= .45)) invalidate();   // the field turns pale
}
const forestShare = I => I.type === 'hoch' && I.trees0 >= 25 ? I.trees.filter(t => t.st === 0).length / I.trees0 : 1;
function erosionOf(I){
  if (I._eroT === tick) return I._ero || 0;
  const f = forestShare(I), e = f < .25 ? 2 : f < .45 ? 1 : 0; I._eroT = tick;
  if (e !== (I._ero || 0)){
    if (e > (I._ero || 0) && I.settled) toast(`Auf ${I.name} ist zu viel Wald gefallen. Der Regen spült Erde ins Meer: Felder laugen schneller aus, das Riff verschlammt. Pflanzt Bäume.`, 5200);
    I._ero = e; invalidate();
  }
  return e;
}

/* ---------- trees: each holds a little wood. Felled, it leaves a stump that sprouts again only after a long while;
   a planter sets saplings on stumps and free ground at once. */
function fellTree(I, b){
  const t = b.cutAt && b.cutAt.st === 0 && b.cutAt.w > 0 && I.trees.includes(b.cutAt) ? b.cutAt : treesNear(I, b.x, b.y, KINDS[b.kind].trees.r).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
  if (!t) return; b.cutAt = t;
  if (--t.w <= 0){ falling(t.x, t.y, {tree:{...t, st:0}, isl:I.id}, b); t.st = 1; t.g = STUMP_TICKS; t.w = 0; b.cutAt = null; stats.gefaellt++; }
  treesChanged(I);
}
function plantable(I, p){
  const L = landAt(I, p); if (!L || polyDist(p, L.poly) < 9) return false;
  if ((I.river && polyDist(p, I.river, false) < 9) || inDelta(I, p, 8)) return false;
  if (I.blocked.some(z => Math.hypot(p.x - z.x, p.y - z.y) < z.r + 6)) return false;
  if (I.buildings.some(q => Math.hypot(q.x - p.x, q.y - p.y) < KINDS[q.kind].r + 8)) return false;
  return !I.trees.some(t => Math.hypot(t.x - p.x, t.y - p.y) < 10);
}
function plantTree(I, b){
  const R = KINDS[b.kind].plants.r, T = I.trees, dist = t => Math.hypot(t.x - b.x, (t.y - b.y) * 1.25);
  const stump = T.filter(t => t.st === 1 && dist(t) < R).sort((p, q) => dist(p) - dist(q))[0];
  if (stump){ stump.st = 2; stump.g = GROW_TICKS; b.plantAt = stump; stats.gepflanzt++; treesChanged(I); return true; }
  if (T.filter(t => dist(t) < R).length >= 36) return false;   // the forest here is dense enough
  // new trees go where others already stand, so the forest grows at its edge and not across the village
  let best = null, bs = -1;
  for (let i = 0; i < 18; i++){
    const a = Math.random() * TAU, d = 14 + Math.random() * (R - 14), p = {x:b.x + Math.cos(a) * d, y:b.y + Math.sin(a) * d * .8};
    if (!plantable(I, p)) continue;
    const sc = T.filter(t => Math.hypot(t.x - p.x, t.y - p.y) < 32).length; if (sc >= 2 && sc > bs){ bs = sc; best = p; }   // only next to standing trees
  }
  if (!best) return false;
  const k = Math.random(), t = {x:fx(best.x), y:fx(best.y), v:k < .55 ? 0 : k < .85 ? 1 : 2, m:Math.random() < .5 ? 1 : 0, s:fx(.86 + Math.random() * .24), st:2, w:0, g:GROW_TICKS};
  T.push(t); b.plantAt = t; stats.gepflanzt++; treesChanged(I); return true;
}
function growTrees(I){
  if (!I.treeWork) return;
  let n = 0;
  for (const t of I.trees){
    if (t.st === 0) continue; n++;
    if (--t.g > 0) continue;
    if (t.st === 1){ t.st = 2; t.g = GROW_TICKS; } else { t.st = 0; t.w = TREE_WOOD; }
    treesChanged(I);
  }
  if (tick % 5 === 0 && n) invalidate();   // young trees grow a little
  I.treeWork = n > 0;
}
function treesChanged(I){ I.treeWork = true; I.treesSaved = true; I._tp = null; invalidate(); }
/* A building on stumps clears them */
function clearStumps(I, b){ const r = (KINDS[b.kind].r + TREE_R) * .8, n = I.trees.length; I.trees = I.trees.filter(t => !(t.st === 1 && Math.hypot(t.x - b.x, t.y - b.y) < r)); if (I.trees.length !== n) treesChanged(I); }
function done(I, b){
  const K = KINDS[b.kind];
  if (K.canoe) b.boat = K.canoe;   // fishers and the jetty need their dugout first
  if (K.grow) b.grow = K.grow;   // planted now, it bears later
  if (b.prio && !(b.boat > 0)) b.prio = false;   // the call was for the building
  if (!K.plant && !K.path && I.id === active){ toast(`${K.n} ist fertig.`, 1600); sfx('knock'); }
  syncWalkers(); checkQuest();
}
function heartAt(I, at){
  if (lod === 'far' || !boxIn(I.box, view(60))) return;
  const hs = I.buildings.filter(b => b.kind === 'haus' || b.kind === 'pfahl' || b.kind === 'halle'); if (!hs.length) return;
  const b = at || hs[Math.floor(Math.random() * hs.length)];
  hearts.push({x:b.x + (Math.random() - .5) * 8, y:b.y - KINDS[b.kind].hy - 10, t0:performance.now() + Math.random() * 600});
}

/* ---------- hit tests and input */
function hitBuilding(p){
  if (lod === 'far') return null; let best = null, bd = Infinity;
  for (const I of islands){ if (!I.settled) continue; for (const b of I.buildings){ if (b.at) continue; const K = KINDS[b.kind]; const d = Math.hypot(p.x - b.x, p.y - (b.y - K.hy * .6)); const lim = Math.max(K.r + 3, 14 / cam.z); if (d < lim && d < bd){ bd = d; best = b; } } }
  return best;
}
function hitCord(p){ const lim = Math.max(9, 16 / cam.z); for (let i = 0; i < routes.length; i++){ for (const q of routeCurve(routes[i]).pts) if (Math.hypot(p.x - q.x, p.y - q.y) < lim) return i; } return -1; }
function hitIsland(p){ return islands.find(I => I.discovered && onIsland(I, p)) || null; }
function onTap(p){
  if (landing && !landing.found){ landingTap(p); return; }
  if (mode === 'place' || mode === 'move'){ placing.x = p.x; placing.y = p.y; ghostRender(); return; }
  // a bubble over a house or a workplace: what it lacks, and where that comes from
  { const q = hitBubble(p); if (q){ q.go(); return; } }
  const sh = hitShip(p);
  if (sh && !sh.own && sh.pack){ const F = isl(sh.pack.from); toast(`Ein Kanu aus ${F ? F.name : 'einem Tochterdorf'} bringt ${packText(sh.pack.g)} nach ${isl(sh.to).name}.`, 3400, false); return; }
  if (sh && !sh.own && (sh.immig || sh.leaving)){ if (sh.immig && sh.state === 'moored') openSheet('immig', {ship:sh.id}); else toast(sh.immig ? `Ein Kanu ${sh.immig.from}: Familie ${sh.immig.n} sucht ein Zuhause auf ${isl(sh.to).name}.` : 'Das Kanu fährt weiter, zurück übers Meer.', 3400, false); return; }
  if (sh && !sh.own){ const C = isl(sh.clan).clan; toast(`Kanu ${clanVom(C)}. An Bord ${sh.guest ? '4 Gäste für das Fest' : '2 Boten'} mit ${giftText(sh.cargo) || 'leeren Händen'}. Es fährt nach ${isl(sh.to).name}.`, 4200, false); return; }
  if (sh){ if (sh === selShip){ closeSheet(); return; } closeSheet(); selectShip(sh); return; }
  // something floating by the shore: somebody paddles out for it (while steering, the canoe goes there instead)
  if (mode !== 'steer'){ const d = hitDrift(p); if (d){ collectDrift(d); return; } }
  if (mode === 'steer'){ steerTap(p); return; }
  // a tap on someone: who it is and what they do, and their workplace opens
  const w = hitWalker(p);
  if (w){ markW = w; markUntil = performance.now() + 5000; if (w.pid && personOf(w)){ openSheet('person', {id:w.isl, p:w.pid}); requestDraw(); return; } toast(`${whoIs(w)} · ${whatDoes(w)}`, 3200, false); if (w.job && findB(w.job.b.id)) select(w.job.b); else requestDraw(); return; }
  const b = hitBuilding(p); if (b){ select(b); return; }
  const ri = hitCord(p); if (ri >= 0){ openRoute(ri); return; }
  const I = hitIsland(p);
  // from further out a tap on an island takes you close to it, and you build there
  if (I && I.clan){ closeSheet(); openSheet('clan', {id:I.id}); if (lod === 'far') flyTo(I.center.x, I.center.y, 1.4); return; }
  if (I && !I.settled){ toast(`${I.name} ist noch unbewohnt. Bring ${SETTLE.people} Siedler mit einem Kanu her.`, 3600, false); if (lod === 'far') flyTo(I.center.x, I.center.y, 1.4); return; }
  if (I){ closeSheet(); setActive(I.id); updateHUD(); if (lod !== 'near'){ const c = villageCenter(I); flyTo(c.x, c.y, 1.8); } return; }
  { const t = signAt(p); if (t){ toast(t, 5200, false); return; } }
  closeSheet(); if (barMode) setBar(null);   // a tap on empty sea folds the bar away
}
/* what a tap on a sign in the fog reads from it */
function signAt(p){
  if (revealed(p)) return '';
  const h = navHints().find(q => Math.hypot(q.I.center.x - p.x, q.I.center.y - p.y) < 300 / Math.min(1, cam.z) + 80); if (!h) return '';
  const say = ['Seevögel fliegen morgens hinaus und abends heim'];
  if (h.swell) say.push('die Dünung bricht sich');
  if (h.cloud) say.push('eine Wolke steht still');
  return `${andList(say)}: Dort im Nebel liegt Land. Fahr mit dem Doppelkanu hin.`;
}
const ptrs = new Map(); let ges = null;
mapC.addEventListener('pointerdown', e => {
  closeNews();
  try { mapC.setPointerCapture(e.pointerId); } catch (err){} ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); camAnim = null;
  if (ptrs.size === 1){
    const wp = toWorld(e.clientX, e.clientY);
    const onGhost = placing && Math.hypot(wp.x - placing.x, wp.y - (placing.y - KINDS[placing.kind].hy * .6)) < Math.max(KINDS[placing.kind].r + 8, 26 / cam.z);
    ges = {type:onGhost ? 'ghost' : 'tap', sx:e.clientX, sy:e.clientY, t:performance.now(), cx:cam.x, cy:cam.y, gx:onGhost ? placing.x - wp.x : 0, gy:onGhost ? placing.y - wp.y : 0};
  } else if (ptrs.size === 2){
    const [a, b] = [...ptrs.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ges = {type:'pinch', d0:Math.hypot(a.x - b.x, a.y - b.y) || 1, z0:cam.z, w0:toWorld(mx, my)};
  }
});
mapC.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); if (!ges) return;
  if (ges.type === 'pinch' && ptrs.size >= 2){ const [a, b] = [...ptrs.values()]; zoomAt(ges.z0 * Math.hypot(a.x - b.x, a.y - b.y) / ges.d0, (a.x + b.x) / 2, (a.y + b.y) / 2, ges.w0); return; }
  if (ges.type === 'ghost'){ const wp = toWorld(e.clientX, e.clientY); placing.x = wp.x + ges.gx; placing.y = wp.y + ges.gy; ghostRender(); return; }
  const dx = e.clientX - ges.sx, dy = e.clientY - ges.sy;
  if (ges.type === 'tap' && Math.hypot(dx, dy) > 8) ges.type = 'pan';
  if (ges.type === 'pan'){ cam.x = ges.cx - dx / cam.z; cam.y = ges.cy - dy / cam.z; clampCam(); applyCam(); }
});
function endPtr(e){
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (ges && ges.type === 'tap' && ptrs.size === 0 && performance.now() - ges.t < 600) onTap(toWorld(e.clientX, e.clientY));
  if (ptrs.size === 0) ges = null;
  else if (ges && ges.type === 'pinch'){ const [q] = [...ptrs.values()]; ges = {type:'pan', sx:q.x, sy:q.y, cx:cam.x, cy:cam.y}; }
}
mapC.addEventListener('pointerup', endPtr); mapC.addEventListener('pointercancel', endPtr);
mapC.addEventListener('wheel', e => { e.preventDefault(); zoomAt(cam.z * Math.exp(-e.deltaY * .0016), e.clientX, e.clientY, toWorld(e.clientX, e.clientY)); }, {passive:false});
mapC.addEventListener('keydown', e => {
  const s = 70 / cam.z, vc = visCenter();
  if (e.key === 'ArrowLeft') cam.x -= s; else if (e.key === 'ArrowRight') cam.x += s; else if (e.key === 'ArrowUp') cam.y -= s; else if (e.key === 'ArrowDown') cam.y += s;
  else if (e.key === '+' || e.key === '=') { zoomAt(cam.z * 1.3, vc.sx, vc.sy, toWorld(vc.sx, vc.sy)); return; }
  else if (e.key === '-') { zoomAt(cam.z / 1.3, vc.sx, vc.sy, toWorld(vc.sx, vc.sy)); return; }
  else if (e.key === 'Escape'){ if (newsOpen()) closeNews(); else if (placing) endPlace(); else closeSheet(); return; }
  else return;
  e.preventDefault(); clampCam(); applyCam();
});
$('menuBtn').addEventListener('click', () => { setSideOpen(false); openSheet('menu', {}); });
$('popBtn').addEventListener('click', () => openSheet('needs'));
$('vitalBtn').addEventListener('click', () => openSheet('needs'));
$('storeBtn').addEventListener('click', () => openSheet('store'));
$('manaBtn').addEventListener('click', () => openSheet('mana'));
$('buildList').addEventListener('click', e => { const b = e.target.closest('.bbtn'); if (!b) return;
  if (b.dataset.ship){ const sh = ships.find(q => q.id === +b.dataset.ship || q.id === b.dataset.ship); if (sh) steerShip(sh); return; }
  if (b.dataset.route){ openRoute(+b.dataset.route); return; }
  if (b.dataset.fleet){ openSheet('fleet'); return; }
  newKinds.delete(b.dataset.kind); b.classList.remove('new', 'hint'); startPlace(b.dataset.kind); });
$('tabBau').addEventListener('click', () => { buildTab = 'bau'; renderBuildBar(); });
$('tabDeco').addEventListener('click', () => { buildTab = 'deco'; renderBuildBar(); });
$('satBtn').addEventListener('click', () => openSheet('sat', {id:active}));
$('isleName').addEventListener('click', () => { if (landing){ if (!landing.found) openSheet('landing', {}); return; } openSheet('rename', {id:active}); const i = $('nameIn'); if (i){ i.focus(); i.select(); } });
$('sheetBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'nameIn'){ e.preventDefault(); renameIsland(isl(sheetData.id), e.target.value); } });
$('tradeBtn').addEventListener('click', () => { closeSheet(); closeNews(); setBar(barMode === 'fleet' ? null : 'fleet'); });
$('moreBtn').addEventListener('click', () => setSideOpen(!sideOpen));
$('compass').addEventListener('click', () => openSheet('calendar'));
$('compass').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openSheet('calendar'); } });
$('buildBtn').addEventListener('click', () => { closeSheet(); closeNews(); setBar(barMode === 'build' ? null : 'build'); });
$('seasonBtn').addEventListener('click', () => openSheet('calendar'));
$('placeOk').addEventListener('click', confirmPlace);
$('placeDone').addEventListener('click', endPlace);
window.addEventListener('resize', () => { measure(); applyCam(); });
if (document.fonts) document.fonts.ready.then(() => invalidate());

/* ---------- loop and start */
function renderAll(){ invalidate(true); spawnWalkers(); renderBuildBar(); }
/* ---------- the arrival: before there is a village, a tap on a start island shows what it offers, and the canoe sails
   to the one chosen; on arrival the village is founded */
const landingChoices = () => islands.filter(I => I.start && I.type === 'hoch');
function landingTap(p){
  const I = hitIsland(p) || (hitShip(p) ? null : islands.find(J => J.start && Math.hypot(J.center.x - p.x, J.center.y - p.y) < 160));
  openSheet('landing', {id:I && I.start ? I.id : null});
}
function chooseHome(I){
  const sh = ships.find(s => s.founder); if (!landing || !I || !landingChoices().includes(I)) return;
  landing.target = I.id; closeSheet();
  if (sh && sh.state !== 'sail' && sailTo(sh, {isl:I.id}, true)){ toast(`Das Ahnenkanu nimmt Kurs auf ${I.name}.`, 3000, false); flyTo(I.center.x, I.center.y, Math.max(cam.z, .9)); return; }
  landHome(I, false);
}
function beginLanding(){
  if (placing && placing.founding){ placing = null; mode = 'idle'; $('placeDone').hidden = false; $('place').hidden = true; $('bottom').hidden = false; }
  setBar(null);
  if (mode === 'place' || mode === 'move') endPlace();   // a building half placed in the old game goes with it
  document.body.classList.add('landing'); closeSheet(); renderAll(); updateHUD();
  const sh = ships.find(s => s.founder), b = boxOf(islands.filter(I => I.start));
  if (sh){ b.x0 = Math.min(b.x0, sh.x - 30); b.x1 = Math.max(b.x1, sh.x + 30); }
  fitBox(b, 1.2); openSheet('landing', {});
}
/* The canoe lands: the family chooses where its first hut stands, the plaza goes in front of it (auto: near the harbour
   at once, as in tests and saves) */
function landHome(I, auto = true){
  if (!foundHome(I)) return;
  if (auto){ const skip = landing.skip; foundAt(null); finishLanding(skip); return; }
  const Hm = isl('heimat'), K = KINDS.haus, at = findSpot(Hm, 'haus', homeSpot(Hm)) || Hm.anchor;
  closeSheet(); mode = 'place'; placing = {kind:'haus', island:Hm.id, x:at.x, y:at.y, v:variant('haus'), founding:true};
  $('placeName').textContent = 'Die erste Hütte'; $('placeIc').setAttribute('viewBox', K.vb); $('placeIc').innerHTML = iconMarkup('haus');
  $('placeInfo').textContent = `Wo soll eure erste Hütte auf ${Hm.name} stehen? Davor liegt der Dorfplatz mit der Feuerstelle, um ihn wächst das Dorf. Tippe auf die Insel oder ziehe sie hin.`;
  $('placeOk').textContent = 'Hier bauen'; $('placeDone').hidden = true; $('bottom').hidden = true; $('place').hidden = false;
  invalidate(true); updateHUD(); ghostRender(); measure(); flyTo(at.x, at.y, 1.5);
}
function confirmFounding(){
  if (!placing || !placing.founding || !placing.ok) return;
  const skip = landing && landing.skip, p = {x:placing.x, y:placing.y};
  mode = 'idle'; placing = null; ghostRender(); $('placeDone').hidden = false; $('place').hidden = true; $('bottom').hidden = false;
  if (foundAt(p)) finishLanding(skip);
}
function finishLanding(skip){
  if (skip) skipTutorial(true);   // chosen at the arrival: no introduction
  document.body.classList.remove('landing');
  invalidate(true); renderAll(); updateHUD();
  const Hm = isl('heimat'); flyTo(Hm.anchor.x, Hm.anchor.y, 1.6);
  openSheet('intro', {first:true}); save(); checkQuest();
}
let last = performance.now(), lastDraw = 0;
/* The game's own clock: a tick every two seconds, at double speed every second */
let gameSpeed = 1, clockAt = 0, clockAcc = 0;
function gameClock(){
  const now = performance.now(); clockAcc += Math.min(10000, now - (clockAt || now)) * gameSpeed; clockAt = now;
  let n = 0; while (clockAcc >= TICK && n < 4){ clockAcc -= TICK; try { econ(); } catch (e){ frameErr(e, 'econ'); } n++; }
  if (n === 4) clockAcc = Math.min(clockAcc, TICK);
}
function setSpeed(v){
  gameSpeed = v; const b = $('speedBtn'); b.setAttribute('aria-pressed', v > 1); b.setAttribute('aria-label', v > 1 ? 'Doppelte Geschwindigkeit, an' : 'Doppelte Geschwindigkeit');
  toast(v > 1 ? 'Doppelte Geschwindigkeit.' : 'Normale Geschwindigkeit.', 1400, false); $('speedMark').hidden = sideOpen || v === 1;
}
$('speedBtn').addEventListener('click', () => { setSpeed(gameSpeed > 1 ? 1 : 2); setSideOpen(false); });   // folded again; a mark shows double speed
/* One picture. Whatever goes wrong inside, the next picture is asked for all the same: before, one error in drawing or in
   the sound stopped the game for good, with only the sea left on screen. The error is kept for the menu (lastErr), the
   layers are painted anew, and a camera that has lost its place goes back to the village. */
let lastErr = '', errN = 0;
function frameErr(e, where){
  errN++; lastErr = `${where}: ${e && e.message || e} ${((e && e.stack) || '').split('\n').slice(1, 3).join(' ').replace(/file:\S*\//g, '')}`.slice(0, 300);
  try { localStorage.setItem('polinusa-err', `${new Date().toISOString()} ${lastErr}`); } catch (x){}
  try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.setLineDash([]); invalidate(true); } catch (x){}
}
function camGuard(){
  if (cam.x === cam.x && cam.y === cam.y && cam.z > 0 && isFinite(cam.z)) return;
  const I = isl(active) || islands.find(J => J.settled), c = I ? I.center : {x:W / 2, y:H / 2};
  cam.x = c.x; cam.y = c.y; cam.z = 1.4; camAnim = null; applyCam(); frameErr('Kamera ohne Ort', 'cam');
}
function frame(now){
  requestAnimationFrame(frame);
  try { frameBody(now); } catch (e){ frameErr(e, 'frame'); }
}
function frameBody(now){
  const dt = Math.min(64, now - last); last = now;
  stepCam(now); camGuard(); if (ships.length){ stepShips(now, dt * gameSpeed); driftTouch(); } walkUntil(now); if (cam.z > PEOPLE_Z) stepCritters(dt * gameSpeed);
  try { audioTick(now); } catch (e){ frameErr(e, 'audio'); }
  if (now - ringAt > 500){ ringAt = now; dayRing(); }   // the day moves round the bar twice a second
  // clouds, whales and fish move all the time, but slowly: a few frames a second are enough when nothing else moves
  let drew = false;
  if (needDraw || stale(now) || (animating() && now - lastDraw > (quality ? 32 : 48)) || (!reduced && now - lastDraw > 140)){ if (animating() && lastDraw) govern(now - lastDraw); draw(now); lastDraw = now; drew = true; }
  if (opts.meter) meterTick(now, drew);
}
/* the meter, switched on in the menu: how many pictures a second this device really draws, the longest gap between two,
   the quality step and the pixel density. For checking the game on a phone. */
let mN = 0, mT = 0, mMax = 0, mLast = 0;
function meterTick(now, drew){
  const el = $('meter'); if (!el) return;
  if (mLast && now - mLast < 2000) mMax = Math.max(mMax, now - mLast); mLast = now; if (drew) mN++;
  if (now - mT < 1000) return;
  const fps = mT ? Math.round(mN * 1000 / (now - mT)) : 0;
  el.textContent = `${fps} Bilder/s · längstes ${Math.round(mMax)} ms · Stufe ${quality} · ${DPR}× · ${walkers.length} Figuren`;
  mN = 0; mMax = 0; mT = now;
}
/* the frame governor: when the device cannot keep up (frames come slower than about 18 a second for a while), the picture
   gets simpler; after half a minute of easy frames it gets finer again */
let gAvg = 0, gN = 0, gEasy = 0;
function govern(dt){
  if (document.hidden || dt > 1000) return;
  gAvg = gAvg ? gAvg * .94 + dt * .06 : dt; if (++gN < 45) return;
  if (gAvg > 55 && quality > 0){ setQuality(quality - 1); gN = 0; gAvg = 0; gEasy = 0; }
  else if (gAvg < 36){ if (++gEasy > 900 && quality < 2){ setQuality(quality + 1); gEasy = 0; gN = 0; gAvg = 0; } }
  else gEasy = 0;
}
/* ---------- while you were away. The islands live on when the game is closed or out of sight, up to eight hours: canoes
   are finished and sail on, building sites are completed, the workshops make what they make, people move in while there is
   room and food. Nothing is lost in that time: nobody leaves hungry, no cyclone comes, no cord slackens, standing neither
   grows nor fades, and where a field is worn out the people let it lie fallow themselves. Afterwards a report says what
   happened. The village is reckoned in whole minutes, the sea tick by tick, so canoes still find their way. */
const AWAY_MAX = 8 * 3600 * 1000;
function awayMinute(I, R){
  roofTick(I, 30); stormTick(I); gatherTick(I, 30); nutTick(I, 30); payRebuilds(I);
  eldersTick(I, true);   // the elders of a daughter village go on leading it
  const sf = staff(I), st = I.stock, cap = storeCap(I);
  // building sites and canoes: the builders work as if they were there
  for (const b of I.buildings){
    if (!b.bt) continue;
    b.bt -= KINDS[b.kind].plant ? 30 : 30 * teamF(SITE_K, sf.crew.get(b) || 0);
    if (b.bt <= .001){ delete b.bt; delete b.got; done(I, b); if (!KINDS[b.kind].plant) R.built.push(KINDS[b.kind].n); }
  }
  for (const b of I.buildings) if (b.boat > 0 && sf.crew.get(b)){ b.boat -= 30 * sf.crew.get(b) / (KINDS[b.kind].crew || 1); if (b.boat <= .001) delete b.boat; }
  if (I.yard && sf.yard){ I.yard.got = SHIPS[I.yard.kind].cost.holz; I.yard.left = Math.max(1e-4, I.yard.left - 30 * teamF(YARD_K, sf.yard)); }
  // the workshops, fields and fishers: what they make in a minute, as far as there is room and material
  for (const b of I.buildings){
    const K = KINDS[b.kind]; if (!(K.prod || K.plants) || b.bt || b.boat > 0) continue;
    if (K.yam){ yamTick(I, b, K, sf.crew.get(b) || 0, 30); continue; }
    if (b.grow > 0){ b.grow -= 30; if (b.grow <= 0){ delete b.grow; I.staff = null; } continue; }
    if (b.fallow){ b.soil = Math.min(1, (b.soil ?? 1) + .36); if (b.soil >= .98){ b.fallow = false; if (K.grow) b.grow = Math.round(K.grow / 2); I.staff = null; } continue; }
    if (K.picks) choosePick(I, b);
    const n = K.crew ? sf.crew.get(b) || 0 : 1, ev = seasonalEvery(I, b, K); if (!n || !ev) continue;
    const w = workState(I, b); if (w) continue;
    b._away = (b._away || 0) + 30 / ev / slowOf(b) / pace(I, K) / (K.soil ? soilPace(b) : 1) * workSpeed(I, b, n);
    let whole = Math.floor(b._away); b._away -= whole;
    if (b.kind === 'ernte' && NUT_PICKS.has(prodOf(b))){ whole = Math.min(whole, Math.floor(nutsOf(I, b))); b.nuts = nutsOf(I, b) - whole; }
    if (K.plants){ while (whole-- > 0 && plantTree(I, b)); continue; }
    for (; whole > 0 && (st[prodOf(b)] || 0) < cap; whole--){
      if (K.use){ if (!canPay(I, K.use)) break; pay(I, K.use); }
      if (K.trees){ if (!treesNear(I, b.x, b.y, K.trees.r).length) break; fellTree(I, b); }
      if (K.soil) drainSoil(I, b);
      if (K.boost && tooled(I, K) && (b.worn = (b.worn || 0) + 1) >= K.boost.per){ b.worn = 0; st[K.boost.k]--; }
      makePiece(I, b, (k, n) => { st[k] = Math.min(cap, (st[k] || 0) + n); R.made[k] = (R.made[k] || 0) + n; }); if (prodOf(b) === 'fisch') stats.fisch++;
    }
    if (K.soil && (b.soil ?? 1) < .3){ b.fallow = true; I.staff = null; R.fallow.add(b); }   // the people rest a worn-out field themselves
  }
  // the trees grow on, a minute at a time
  let grew = false;
  for (const t of I.trees){ if (t.st === 0) continue; t.g -= 30; if (t.g > 0) continue; grew = true; if (t.st === 1){ t.st = 2; t.g += GROW_TICKS; } else { t.st = 0; t.w = TREE_WOOD; } }
  if (grew) treesChanged(I);
  const wg = wildTick(I, 30); if (wg) R.made.wild = (R.made.wild || 0) + wg;   // those without work gather on
  // as with the fields, the elders look after the wild themselves: a tapu when it grows scarce, lifted when it has come back
  if (!I.tapu && goneOf(I) < 2 && wildOf(I) < Math.min(.35, Math.max((R.w0[I.id] ?? 1) - .05, WILD_AT[goneOf(I)] + .03))){ I.tapu = I.tapuAway = true; I.staff = null; R.tapu.add(I.name); }
  else if (I.tapuAway && wildOf(I) > .7){ I.tapu = I.tapuAway = false; I.staff = null; }
  // what people use; when something runs out nobody leaves, the village only stops growing
  I.owe = I.owe || {};
  for (const N of NEEDS){
    if (!needActive(I, N) || MEAL_NEEDS.has(N.k)) continue;
    I.owe[N.k] = (I.owe[N.k] || 0) + needPop(I, N) * N.rate; const take = Math.floor(I.owe[N.k]); I.owe[N.k] -= take;
    const ks = needGoods(N.k); if (ks.length < 2){ st[N.k] = Math.max(0, (st[N.k] || 0) - take); continue; }
    for (let i = 0; i < take; i++){ const k = burnFirst(N.k, st) || ks.reduce((m, q) => (st[q] || 0) > (st[m] || 0) ? q : m); if (st[k] > 0) st[k]--; }
  }
  let nd = needsOf(I); updateLevel(I, nd); nd = needsOf(I);
  feedAnimals(I, 30);
  // a minute away: children are born, families come to empty huts, the houses rise or fall
  birthTick(I, 30); immigTick(I); I.reefLife = Math.min(1, (I.reefLife ?? 1) + .0012 * 30);
  for (let k = 0; k < 3; k++) tierTick(I, needsOf(I).list, true);   // while you are away nobody leaves a crowded house
  syncPeople(I); lifeTick(I); navTick(I, 30);
}
function catchUp(ms){
  if (landing) return null;   // before the landing no time passes
  ms = Math.min(AWAY_MAX, ms); const n = Math.floor(ms / TICK); if (n < 30) return null;
  const mine = islands.filter(I => I.settled), R = {ms, ticks:n, built:[], made:{}, fallow:new Set(), tapu:new Set(), w0:Object.fromEntries(mine.map(I => [I.id, wildOf(I)])), pop:mine.map(I => [I.id, I.pop]), found:islands.filter(I => I.discovered).length, ships:own().length, quest, chronik:Object.keys(chronik).length, years:yearOf()};
  const mana0 = mana, knots = routes.map(r => r.knots); R.st0 = Object.fromEntries(mine.map(I => [I.id, {...I.stock}]));
  awayQuiet = true; lifeLog = R.life = {born:0, came:0, grown:0, died:[], chiefs:[], nav:[], lost:[], gone:[], mot:[], fade:[]};
  try {
    for (let i = 1; i <= n; i++){
      tick++; if ((tick + 30) % DAY_TICKS === 0) for (const I of islands) if (I.settled){ mealTick(I); packTick(I); }
      if ((tick + 30) % DAY_TICKS === DUSK_AT) for (const I of islands) if (I.settled) fireTick(I);
      if (ships.length){ stepShips(performance.now(), TICK); driftTouch(); } driftTick();
      feedCrews(); stepTreasure(); stepYards(); answerGifts(); calendarTick();
      if (i % 30 === 0){ for (const I of islands) if (I.settled) awayMinute(I, R); rollAhead(); for (const I of islands) if (I.settled || (I.clan && I.discovered)) motifTick(I); }
      if (i % 150 === 0){ chronikTick(); checkQuest(); }
    }
    chronikTick(); checkQuest();
  } finally { awayQuiet = false; lifeLog = null; }
  mana = Math.max(mana0, mana);   // standing does not fade while you are away; the chronicle may add to it
  routes.forEach((r, i) => { if (knots[i] != null) r.knots = Math.max(r.knots, knots[i]); });
  lastEconAt = performance.now(); walkAt = performance.now(); for (const I of islands){ I.staff = null; I._eroT = -1; }
  invalidate(true); syncWalkers(); updateHUD(); renderBuildBar(); save();
  return R;
}
const awayTime = ms => { const m = Math.round(ms / 60000), h = Math.floor(m / 60); return h ? `${h} ${h === 1 ? 'Stunde' : 'Stunden'}${m % 60 ? ` ${m % 60} Minuten` : ''}` : `${m} Minuten`; };
/* The report: what became of each village, what the canoes found, what the chronicle gained */
function awayReport(R){
  const lines = [], mine = islands.filter(I => I.settled);
  for (const I of mine){
    const before = (R.pop.find(p => p[0] === I.id) || [0, 0])[1];
    if (!before){ lines.push(['pop', `${I.name}: ein neues Dorf`, `${I.pop} Bewohner`]); continue; }
    if (I.pop !== before) lines.push(['pop', `${I.name}: ${I.pop} Menschen`, `vorher ${before}`]);
  }
  // the generations: who was born, who grew up, who went to the ancestors, who leads now
  const L = R.life || {born:0, came:0, grown:0, died:[], chiefs:[], nav:[], lost:[], gone:[], mot:[], fade:[]}, names = list => list.length > 3 ? `${list.slice(0, 3).join(', ')} und ${list.length - 3} weitere` : list.join(' und ');
  if (L.born || L.came) lines.push(['pop', [L.born && `${L.born} ${L.born === 1 ? 'Kind geboren' : 'Kinder geboren'}`, L.came && `${L.came} zugezogen`].filter(Boolean).join(', '), '']);
  if (L.grown) lines.push(['pop', `${L.grown} ${L.grown === 1 ? 'Kind ist' : 'Kinder sind'} erwachsen geworden`, '']);
  if (L.died.length) lines.push(['mana', `Zu den Ahnen gegangen: ${names(L.died)}`, '']);
  if (L.chiefs.length) lines.push(['mana', `Häuptling geworden: ${names(L.chiefs)}`, '']);
  if (L.nav && L.nav.length) lines.push(['einbaum', `Navigator geworden: ${names(L.nav.map(x => x.t))}`, '']);
  if (L.lost && L.lost.length) lines.push(['einbaum', `Mit ${names(L.lost)} ging Wissen der Navigatoren verloren`, '']);
  for (const t of L.gone || []) lines.push(['wild', `Ausgestorben auf ${t}`, '']);
  if (L.mot && L.mot.length) lines.push(['toepfe', `Muster gewandert: ${names(L.mot)}`, '']);
  if (L.fade && L.fade.length) lines.push(['toepfe', `Vergessen, weil keine Töpfe kamen: ${names(L.fade)}`, '']);
  const built = R.built.reduce((m, n) => (m[n] = (m[n] || 0) + 1, m), {});
  if (R.built.length) lines.push(['beile', `Fertig gebaut: ${Object.entries(built).map(([n, c]) => c > 1 ? `${c}× ${n}` : n).join(', ')}`, '']);
  // the stores: what there was and what there is now, the biggest changes first; what was made was also used up
  for (const I of mine){
    const s0 = (R.st0 || {})[I.id]; if (!s0) continue;
    const ch = GOODS.map(k => [k, s0[k] || 0, I.stock[k] || 0]).filter(([, a, b]) => a !== b).sort((x, y) => Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1]));
    I._back = {at:tick, d:Object.fromEntries(ch.map(([k, a, b]) => [k, [a, b]]))};
    if (ch.length) lines.push(['essen', `Lager ${I.name}: ${ch.slice(0, 5).map(([k, a, b]) => `${GN[k]} ${a} → ${b}${b >= storeCap(I) ? ' (voll)' : ''}`).join(', ')}`, '']);
  }
  if (R.tapu && R.tapu.size) lines.push(['wild', `Auf ${andList([...R.tapu])} haben die Ältesten ein Tapu auf das Wild gelegt, damit es sich erholt`, '']);
  const fal = R.fallow.size; if (fal) lines.push(['soil', `${fal === 1 ? 'Ein ausgelaugtes Feld haben' : `${fal} ausgelaugte Felder haben`} die Leute brachliegen lassen`, '']);
  const found = islands.filter(I => I.discovered).length - R.found; if (found > 0) lines.push(['einbaum', `${found} ${found === 1 ? 'neue Insel' : 'neue Inseln'} entdeckt`, '']);
  const canoes = own().length - R.ships; if (canoes > 0) lines.push(['einbaum', `${canoes} ${canoes === 1 ? 'neues Kanu' : 'neue Kanus'} vom Stapel gelaufen`, '']);
  const ch = CHRONIK.filter(M => chronik[M.id] != null).length - R.chronik; if (ch > 0) lines.push(['mana', `${ch} ${ch === 1 ? 'neuer Eintrag' : 'neue Einträge'} in der Chronik`, '']);
  if (quest > R.quest) lines.push(['mana', `Geschafft: ${QUESTS.slice(R.quest, quest).map(Q => qn(Q.t)).join(', ')}`, '']);
  return lines;
}
let hiddenAt = 0, hiddenTick = 0;
function welcomeBack(R){
  if (!R || R.ms < 3 * 60000) return;
  const lines = awayReport(R), years = yearOf() - R.years;
  news.unshift({msg:`Ihr wart ${awayTime(R.ms)} fort.${lines.length ? ' ' + lines.map(l => l[1]).join('. ') + '.' : ' Alles ist ruhig geblieben.'}`, at:Date.now()}); unread++; newsBadge();
  openSheet('away', {R, lines, years});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden){ hiddenAt = Date.now(); hiddenTick = tick; save(); return; }
  if (!hiddenAt) return;
  // back again: what the throttled clock did not manage while out of sight is made up now
  const el = Date.now() - hiddenAt, missing = Math.min(AWAY_MAX, el) - (tick - hiddenTick) * TICK; hiddenAt = 0;
  if (el > 60000 && missing > 60000){ const R = catchUp(missing); if (R) welcomeBack(R); }
});
addEventListener('pagehide', () => save());
/* a new game opens close to the landing place, a saved one shows home and the first atoll */
function homeView(ok){
  const b = boxOf(ok ? [isl('heimat'), isl('tochter')] : islands.filter(I => I.start)), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const z = clampZ(Math.min((vw - 50) / bw, (vh - topH - botH - 40) / bh, ok ? 1 : 1.4));
  camAnim = null; Object.assign(cam, camFor((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, z)); clampCam(); applyCam();
}
/* Play the other slot, or begin one anew. The game you leave is kept; the other one has gone on while you were away, as
   when the page opens. An empty slot, or one begun anew, starts with the canoe at sea. The copies of a slot begun anew
   stay in the menu for a while, so a slip can be undone. */
function switchSlot(n, fresh){
  if (!fresh && n === curSlot) return;
  save(); closeSheet(); endSteer(); if (mode === 'place' || mode === 'move') endPlace(); setBar(null);
  curSlot = n; try { localStorage.setItem('polinusa-slot', String(n)); if (fresh) localStorage.removeItem(slotKey(n)); } catch (e){}
  let ok = false, raw = null; try { raw = fresh ? null : localStorage.getItem(slotKey(n)); if (raw) ok = restore(raw); if (raw && !ok) ok = restoreBackup(); } catch (e){ ok = false; }
  if (!ok){ newGame(); beginLanding(); toast(`Spielstand ${n}: ein neues Spiel mit neuen Inseln.`, 3000, false); return; }
  landing = null; document.body.classList.remove('landing');
  const away = savedAt && Date.now() > savedAt ? catchUp(Date.now() - savedAt) : null;
  invalidate(true); renderAll(); updateHUD(); homeView(true); toast(`Spielstand ${n}: ${isl('heimat').name}.`, 2400, false);
  if (away && away.ms >= 3 * 60000) welcomeBack(away);
}
function start(data){
  injectDefs();
  let ok = false;
  try { const raw = (data && data.save) || localStorage.getItem(slotKey(curSlot)); if (raw) ok = restore(raw); if (raw && !ok) ok = restoreBackup(); } catch (e){}   // a broken save: the newest copy
  // a game from the old rules is not carried over: the island economy works differently now
  let oldGame = false; try { for (const k of OLD_KEYS) if (localStorage.getItem(k)){ oldGame = true; localStorage.removeItem(k); } } catch (e){}
  if (!ok) newGame();
  const away = ok && savedAt && Date.now() > savedAt ? catchUp(Date.now() - savedAt) : null;
  renderAll(); measure(); homeView(ok);
  // fonts, patterns and the first bitmaps load before the first frame, so nothing pops in
  const fonts = document.fonts ? Promise.all([document.fonts.load(NAME_FONT), document.fonts.load(SUB_FONT)]).catch(() => {}) : null;
  const ready = loadPatterns().then(() => { draw(performance.now()); return Promise.all(pendingSprites()); });
  Promise.race([Promise.all([fonts, ready]), new Promise(res => setTimeout(res, 2500))]).then(() => {
    invalidate(true); requestAnimationFrame(frame); setInterval(gameClock, 100);
    if (!ok){ beginLanding(); if (oldGame) toast('Neue Regeln für Haushalte und Rohstoffe: Das Spiel beginnt neu.', 6000); }
    else if (away && away.ms >= 3 * 60000) welcomeBack(away);
    else if (!islands.some(I => I.settled && I.buildings.some(b => b.kind === 'faeller'))) toast('Neu: Holz kommt jetzt vom Holzfäller. Bau einen am Waldrand.', 6000);
  });
}
try { window.claude?.hot?.snapshot?.(() => ({save:serialize()})); } catch (e){}
const hot = window.claude?.hot;
if (hot && hot.ready) hot.ready(start); else start(hot?.data ?? {});
