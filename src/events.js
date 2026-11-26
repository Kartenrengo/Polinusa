'use strict';
/* What keeps a long game going: things that happen and ask for a choice, and a chronicle of what the clan has done.
   - Every five to eight minutes something happens on one of your islands: a cyclone, castaways, a school of tuna,
     a drought, a request from a clan, a wedding, a navigator from far away, a rich breadfruit harvest.
     Each comes with two or three choices; some cost goods, all change something you can see.
   - The chronicle lists twenty milestones for many hours of play. Each one reached brings standing. */

let stats = {gepflanzt:0, gefaellt:0, fisch:0, gaben:0, stuerme:0, ereignisse:0};
let nextEvent = 300, lastEvent = '', eventNow = null, chronik = {};

const villages = () => islands.filter(I => I.settled);
const richest = (k, n) => villages().filter(I => (I.stock[k] || 0) >= n).sort((a, b) => b.stock[k] - a.stock[k])[0] || null;
const pickOf = list => list[Math.floor(Math.random() * list.length)];
const addTo = (I, k, n) => { I.stock[k] = Math.min(storeCap(I), (I.stock[k] || 0) + n); };

/* Each event: when it can happen (returns the island or false), the text, and the choices */
const EVENTS = [
  {id:'sturm', t:'Ein Wirbelsturm zieht auf',
    when:() => seasonOf().id === 'sturm' && pickOf(villages().filter(I => I.buildings.some(b => KINDS[b.kind].crew && !b.bt))),
    text:I => `Die Alten sehen den Himmel über ${I.name} gelb werden, die Vögel fliegen landeinwärts. Ein Wirbelsturm kommt.`,
    choices:[
      {n:'Alle an die Dächer!', text:I => `In einer Minute ist er da. Wer kann, bindet die Dächer fest: je Dach ein Sennit oder zwei Kokosfasern. Im Lager: ${I.stock.schnur || 0} Sennit, ${I.stock.faser || 0} Fasern.`, go:I => { stormWarn(I, true); return `Die Leute laufen zu den Häusern von ${I.name}. Jedes Dach braucht eine Schnur.`; }},
      {n:'Abwarten', text:I => I.stock.talisman > 0 ? 'Der Talisman der Matriarchin hält ihn von den Dächern.' : 'Die Dächer bleiben lose. Festbinden geht auch später noch.', go:I => { stormWarn(I, false); return `Der Sturm kommt in einer Minute über ${I.name}.`; }}]},
  {id:'treibgut', t:'Schiffbrüchige',
    when:() => pickOf(villages().filter(I => I.pop >= 8 && canPay(I, {nahrung:3}))),
    text:I => `Ein fremdes Kanu treibt mit erschöpften Menschen auf den Strand von ${I.name}. Sie haben ihr Ziel auf dem Meer verfehlt.`,
    choices:[
      {n:'Aufnehmen', cost:{nahrung:3}, text:'Sie bekommen Essen und dürfen bleiben.', go:I => { const room = Math.max(0, popCap(I) - I.pop), n = Math.min(4, room); I.pop += n; mana += 1; return n ? `${n} Menschen bleiben auf ${I.name}.` : `Sie bleiben gern, aber es ist kein Platz in den Häusern. Sie ziehen dankbar weiter. Ansehen +1.`; }},
      {n:'Mit Proviant weiterschicken', cost:{proviant:2}, text:'Ein Geschenk für die Reise.', go:() => { mana += 4; return 'Sie fahren weiter und erzählen überall von eurer Großzügigkeit. Ansehen +4.'; }},
      {n:'Nichts geben', text:'Die Vorräte sind knapp.', go:() => { mana = Math.max(0, mana - 2); return 'Sie fahren hungrig weiter. Ansehen −2.'; }}]},
  {id:'thunfisch', t:'Ein Thunfischschwarm',
    when:() => seasonOf().id === 'passat' && pickOf(villages().filter(I => I.buildings.some(b => b.kind === 'fisch' && !b.bt))),
    text:I => `Draußen vor dem Riff von ${I.name} kocht das Wasser. Ein Schwarm Thunfische zieht vorbei, die Vögel stürzen sich hinein.`,
    choices:[
      {n:'Alle Kanus hinaus', text:'Jeder, der paddeln kann, fährt mit.', go:I => { addTo(I, 'fisch', 4); stats.fisch += 4; mana += 1; return `Die Kanus kommen schwer beladen zurück. 4 Fisch für ${I.name}, Ansehen +1.`; }},
      {n:'Weiterarbeiten', text:'Die Arbeit an Land geht vor.', go:() => 'Der Schwarm zieht weiter.'}]},
  {id:'duerre', t:'Dürre',
    when:() => seasonOf().id === 'mager' && pickOf(villages().filter(I => I.buildings.some(b => (b.kind === 'taro' || b.kind === 'pulaka') && !b.bt))),
    text:I => `Seit Wochen fällt kein Regen auf ${I.name}. Die Taroblätter hängen schlaff.`,
    choices:[
      {n:'Regenzeremonie mit Kava', cost:{kava:2}, late:true, text:'Die Ältesten bitten die Ahnen um Regen.', go:() => { mana += 2; return 'Am nächsten Morgen ziehen Wolken auf. Ansehen +2.'; }},
      {n:'Wasser in Töpfen tragen', cost:{toepfe:2}, text:'Ein halber Mond mit halber Ernte.', go:I => { I.drought = tick + MOON / 2; return `Die Felder auf ${I.name} tragen einen halben Mond lang nur halb so viel.`; }},
      {n:'Durchhalten', text:'Ein ganzer Mond mit halber Ernte.', go:I => { I.drought = tick + MOON; return `Die Felder auf ${I.name} tragen einen Mond lang nur halb so viel.`; }}]},
  {id:'bitte', t:'Eine Bitte',
    when:() => { const r = pickOf(routes.filter(q => (isl(q.a).clan || isl(q.b).clan) && q.knots >= 1)); if (!r) return false; const C = (isl(r.a).clan ? isl(r.a) : isl(r.b)), k = clanWants(C.clan).find(k => richest(k, 3)); return k ? {I:richest(k, 3), C, k, r} : false; },
    text:o => `Boten ${clanVom(o.C.clan)} kommen nach ${o.I.name}. Sie bereiten ein Totenfest vor und bitten um ${amount(o.k, 3)}.`,
    who:o => o.C, say:o => `Wir bereiten ein Totenfest vor. Könnt ihr uns ${amount(o.k, 3)} schicken? Wir vergessen es nicht.`,
    cost:o => ({[o.k]:3}), place:o => o.I,
    choices:[
      {n:'Gern schicken', ask:true, text:'Eine Gabe in schwerer Zeit vergisst man nicht.', go:o => { o.r.knots = Math.min(12, o.r.knots + 2); o.C.debt = (o.C.debt || 0) + 3 * VALUE[o.k] * returnRate(o.r.knots); o.C.lastFrom = o.I.id; if (!(o.C.returnAt > tick)) o.C.returnAt = tick + 20; mana += 3; stats.gaben++; invalidate(); return `${clanDer(o.C.clan)} ${o.C.clan.culture ? 'danken' : 'dankt'} euch. Zwei Knoten mehr, Ansehen +3, und eine Gegengabe wird kommen.`; }},
      {n:'Ablehnen', text:'Ihr braucht es selbst.', go:o => { o.r.knots = Math.max(0, o.r.knots - 1); mana = Math.max(0, mana - 1); invalidate(); return `Die Boten fahren enttäuscht heim. Ein Knoten löst sich.`; }}]},
  // a clan asks for a bride or a groom: by their custom the young one would move to them
  {id:'braut', t:'Brautwerbung',
    when:() => pickOf(routes.filter(r => r.knots >= 2).map(r => { const T = clanOfRoute(r), I = T && weddingIsland(T), p = I && I.pop >= 12 && (I.people || []).filter(q => canWed(q) && q.id !== I.chief).sort((a, b) => b.b - a.b)[0]; return p ? {T, I, p, r} : null; }).filter(Boolean)) || false,
    place:o => o.I,
    who:o => o.T, say:o => `Einer von uns möchte ${o.p.n} heiraten. Wir bringen Matten und ein Schwein. Nach unserem Brauch zöge ${o.p.n} zu uns nach ${o.T.name}.`,
    text:o => `Boten ${clanVom(o.T.clan)} kommen nach ${o.I.name}, mit Matten und einem Schwein. Jemand aus ihrem ${o.T.clan.culture ? 'Volk' : 'Clan'} möchte ${o.p.n} heiraten, ${Math.floor(ageOf(o.p))} Jahre alt. Nach ihrem Brauch zöge ${o.p.n} zu ihnen nach ${o.T.name}.`,
    choices:[
      {n:'Zustimmen', text:'Die Hochzeit wird gefeiert, ihre Brautgaben bleiben hier, und ihr werdet verwandt.', go:o => {
        const P = o.I.people || [], i = P.indexOf(o.p); if (i < 0) return 'Die Hochzeit fällt aus, die Boten fahren heim.';
        P.splice(i, 1); o.I.pop = Math.max(1, o.I.pop - 1); o.I.staff = null;
        (o.T.inlaws = o.T.inlaws || []).push({n:o.p.n, from:o.I.name, at:tick});
        for (const [k, v] of Object.entries(BRIDE_GIFTS)) o.I.stock[k] = Math.min(storeCap(o.I), (o.I.stock[k] || 0) + v);
        o.r.knots = Math.min(12, o.r.knots + 2); o.r.lastGift = tick; mana += 3; stats.heirat = (stats.heirat || 0) + 1; if (o.T.clan.culture) stats.fremdheirat = (stats.fremdheirat || 0) + 1;
        o.I.feastEnd = tick + 6; syncWalkers(); invalidate();
        return `${o.p.n} heiratet ${clanBeim(o.T.clan)} ein und zieht nach ${o.T.name}. Ihre Brautgaben bleiben auf ${o.I.name}, zwei Knoten mehr, Ansehen +3. Jetzt seid ihr verwandt.`; }},
      {n:'Ablehnen', text:'Man bleibt Nachbarn, mehr nicht.', go:o => { o.r.knots = Math.max(0, o.r.knots - 1); invalidate(); return 'Die Boten fahren enttäuscht heim. Ein Knoten löst sich.'; }}]},
  {id:'hochzeit', t:'Eine Hochzeit',
    when:() => pickOf(villages().filter(I => I.pop >= 20)),
    text:I => `Zwei Familien auf ${I.name} wollen ihre Kinder verheiraten. Matten und Schweine werden als Brautgaben getauscht.`,
    choices:[
      {n:'Ein Hochzeitsfest', cost:{nahrung:3, matten:1}, text:'Das ganze Dorf feiert.', go:I => { I.joyUntil = tick + 20; I.feastEnd = tick + 6; mana += 2; for (let i = 0; i < 6; i++) heartAt(I); return `Ein fröhliches Fest auf ${I.name}. Ansehen +2, und eine Weile wächst das Dorf doppelt so schnell.`; }},
      {n:'Im Kreis der Familie', text:'Ohne großes Fest.', go:() => 'Eine stille, schöne Hochzeit.'}]},
  {id:'navigator', t:'Ein fremder Navigator',
    when:() => quest > QUESTS.findIndex(Q => Q.id === 'land') && islands.some(I => !I.discovered) && pickOf(villages().filter(I => canPay(I, {nahrung:2}))),
    text:I => `Ein alter Navigator legt mit seinem Kanu an ${I.name} an. Er liest die Sterne, die Dünung und die Vögel und erzählt von einer Insel jenseits des Horizonts.`,
    choices:[
      {n:'Ihn bewirten', cost:{nahrung:2}, text:'Gastfreundschaft öffnet den Mund.', go:I => {
        const far = islands.filter(J => !J.discovered).sort((a, b) => Math.hypot(a.center.x - I.center.x, a.center.y - I.center.y) - Math.hypot(b.center.x - I.center.x, b.center.y - I.center.y))[0];
        if (!far) return 'Er erzählt die ganze Nacht, aber die Insel findet ihr nicht wieder.';
        fogHoles.push({cx:Math.round(far.center.x), cy:Math.round(far.center.y), rx:200, ry:170, seed:7}); discover(far); invalidate(true);
        return `Er zeichnet euch den Weg nach ${far.name} in den Sand. Der Nebel dort ist gelichtet.`; }},
      {n:'Danken und ziehen lassen', text:'', go:() => 'Er paddelt weiter nach Osten.'}]},
  {id:'brotfrucht', t:'Eine reiche Brotfruchternte',
    when:() => seasonOf().id === 'plejaden' && pickOf(villages().filter(I => I.buildings.filter(b => b.kind === 'baum' && !b.bt).length >= 3)),
    text:I => `Die Brotfruchtbäume auf ${I.name} tragen so reich wie lange nicht. Die Zweige biegen sich.`,
    choices:[
      {n:'Alles ernten', text:'Frisch essen und in den Gärgruben einlagern.', go:I => { addTo(I, 'nahrung', 10); const pits = I.buildings.some(b => b.kind === 'gaergrube' && !b.bt); if (pits) addTo(I, 'proviant', 3); return `10 Brotfrüchte${pits ? ' und 3 Proviant' : ''} für ${I.name}.`; }},
      {n:'Den Vögeln lassen', text:'', go:() => 'Die Flughunde freuen sich.'}]}
];

/* Pick and show an event when the time has come and nothing else is open */
/* What a cyclone does to a village that did not prepare: roofs torn, a workshop and one or two houses wrecked (people
   must go until they are rebuilt), trees down, the fields washed out; where the forest is gone a slope slides onto a field */
/* ---------- a cyclone over an island, from the warning until it has passed: the map shows it (drawStorm), the wind blows
   at full strength, and nobody goes out on the water. Only while you watch; while you are away it passes unseen. */
let cyclone = null;
function cycloneStart(I, ticks){
  if (awayQuiet || !I) return;
  const was = cyclone && cyclone.isl === I.id;
  cyclone = {isl:I.id, start:was ? cyclone.start : tick, end:Math.max(was ? cyclone.end : 0, tick + ticks)};
  if (!was){ invalidate(true); I.staff = null; }
}
const cycloneOver = I => !!cyclone && cyclone.isl === I.id;
function cycloneLevel(){
  if (!cyclone) return 0;
  const t = tick + (lastEconAt ? clamp((performance.now() - lastEconAt) * gameSpeed / TICK, 0, 1) : 0);
  return clamp((t - cyclone.start) / 2.5, 0, 1) * clamp((cyclone.end - t) / 3, 0, 1);
}
function cycloneTick(){
  if (!cyclone) return;
  if (eventNow && eventNow.E.id === 'sturm') cyclone.end = Math.max(cyclone.end, tick + 4);   // it rages while the people decide
  { const S = isl(cyclone.isl) && isl(cyclone.isl).storm; if (S && tick < S.at) cyclone.end = Math.max(cyclone.end, S.at + 2); }   // and the sky stays dark until it strikes
  if (tick >= cyclone.end || !isl(cyclone.isl)){ cyclone = null; invalidate(true); }
}
/* ---------- the leader of a clan speaks (version 117): a small head that moves a little, blinks and talks while the words
   stand beside it. Each clan has its own look: the Feuerberg a band of red ochre and a boar's tusk, the Riff a band of
   cowries and a shell disc, the Maulbeerhain a band of bark cloth and a hibiscus flower; the Alten from the Great Land grey
   hair and a beard, the seafarers of the north red dots on the cheeks. Name and whether a man or a woman lead come from the
   island, so they stay the same. */
const LEAD_LOOK = {
  feuer:{bg:'#C9785A', hair:'#1E1410', band:'<path d="M18 22Q32 17 46 22" stroke="#A84A2C" stroke-width="3" fill="none" stroke-linecap="round"/>', neck:'<path d="M27 52q5 4 10 0" stroke="#2B1D14" stroke-width=".8" fill="none"/><path d="M29.5 54.5q2.5 3.6 5 0q-2.5 1.6-5 0Z" fill="#F4ECD8" stroke="#2B1D14" stroke-width=".6"/>'},
  riff:{bg:'#7FB3B0', hair:'#2A1C14', band:'<path d="M18 22Q32 17 46 22" stroke="#E8DFC8" stroke-width="3.2" fill="none" stroke-linecap="round"/>' + [20, 24, 28, 32, 36, 40, 44].map(x => `<ellipse cx="${x}" cy="${21.2 - Math.sin((x - 18) / 28 * Math.PI) * 3.2}" rx="1" ry="1.3" fill="#F8F4E8" stroke="#2B1D14" stroke-width=".35"/>`).join(''), neck:'<circle cx="32" cy="55" r="2.6" fill="#F4ECD8" stroke="#2B1D14" stroke-width=".6"/><path d="M27 51.5Q32 56 37 51.5" stroke="#3B2618" stroke-width=".6" fill="none"/>'},
  hain:{bg:'#9CB07A', hair:'#241812', band:'<path d="M18 22Q32 17 46 22" stroke="#D9B98A" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M21 21.4l1.4-1.6l1.4 1.6M27 19.8l1.4-1.6l1.4 1.6M33 19.5l1.4-1.6l1.4 1.6M39 20.2l1.4-1.6l1.4 1.6" stroke="#7A4A2A" stroke-width=".6" fill="none"/><g transform="translate(46 27)">' + [0, 72, 144, 216, 288].map(a => `<ellipse rx="1.7" ry="2.8" transform="rotate(${a}) translate(0 -2.4)" fill="#D2452E" stroke="#2B1D14" stroke-width=".35"/>`).join('') + '<circle r="1" fill="#F0C040"/></g>', neck:'<path d="M27 52q5 4 10 0" stroke="#7A5634" stroke-width=".9" fill="none"/>'},
  alte:{bg:'#B69A76', hair:'#B8B2A6', band:'', neck:'', beard:true, old:true},
  nord:{bg:'#C79A6A', hair:'#1E1410', band:'<path d="M38 15q4-6 9-6q-3 3-6 8Z" fill="#E0A23A" stroke="#2B1D14" stroke-width=".5"/>', neck:'<path d="M27 52q5 4 10 0" stroke="#2B1D14" stroke-width=".8" fill="none"/>', dots:true}
};
const leadOf = T => { const k = T.clan.id, r = rng((Math.round(T.center.x * 3 + T.center.y * 7) ^ 0x1ead) >>> 0), pool = FOREIGN_NAMES[k] || PEOPLE_NAMES, n = pool[Math.floor(r() * pool.length)], f = r() < .45; return {k, n, f}; };
function leaderSvg(T){
  const L = leadOf(T), K = LEAD_LOOK[L.k] || LEAD_LOOK.hain, skin = '#8A5A3A', ink = '#2B1D14';
  const hair = L.f ? `<path d="M17 30Q15 14 32 12Q49 14 47 30Q48 40 45 46Q46 32 42 24Q32 20 22 24Q18 32 19 46Q16 40 17 30Z" fill="${K.hair}" stroke="${ink}" stroke-width=".8"/>`
    : `<path d="M18 28Q17 13 32 12Q47 13 46 28Q44 21 32 20Q20 21 18 28Z" fill="${K.hair}" stroke="${ink}" stroke-width=".8"/>${L.k === 'feuer' ? `<ellipse cx="32" cy="11" rx="5" ry="3.4" fill="${K.hair}" stroke="${ink}" stroke-width=".8"/>` : ''}`;
  const beard = K.beard && !L.f ? `<path d="M22 38Q23 48 32 49Q41 48 42 38Q38 42 32 42Q26 42 22 38Z" fill="${K.hair}" stroke="${ink}" stroke-width=".7"/>` : '';
  const dots = K.dots ? [[24, 37], [40, 37]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="none" stroke="#B8402A" stroke-width=".7" stroke-dasharray=".7 .9"/>`).join('') : '';
  const lines = K.old ? '<path d="M23 24.5q3-1 5 0M36 24.5q3-1 5 0M26 34q-1 1.5 0 3M38 34q1 1.5 0 3" stroke="#5A3A26" stroke-width=".5" fill="none"/>' : '';
  return `<svg class="lhead" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="${K.bg}" stroke="${ink}" stroke-width="1.4"/>` +
    `<g class="lbob"><path d="M14 64Q16 52 26 50H38Q48 52 50 64Z" fill="${skin}" stroke="${ink}" stroke-width=".9"/>${K.neck}` +
    `<ellipse cx="32" cy="32" rx="13.6" ry="16" fill="${skin}" stroke="${ink}" stroke-width=".9"/><ellipse cx="18.6" cy="33" rx="2" ry="3" fill="${skin}" stroke="${ink}" stroke-width=".7"/><ellipse cx="45.4" cy="33" rx="2" ry="3" fill="${skin}" stroke="${ink}" stroke-width=".7"/>` +
    hair + K.band + lines + dots +
    `<path d="M24 26.6q2.4-1.4 5 0M35 26.6q2.6-1.4 5 0" stroke="${ink}" stroke-width="1" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="26.6" cy="30" rx="1.5" ry="1.7" fill="#1E1410"/><ellipse cx="37.4" cy="30" rx="1.5" ry="1.7" fill="#1E1410"/>` +
    `<g class="llid"><rect x="24.4" y="27.8" width="4.4" height="4.4" fill="${skin}"/><rect x="35.2" y="27.8" width="4.4" height="4.4" fill="${skin}"/></g>` +
    `<path d="M32 31.5q-1.6 4.2-.2 4.8q1.6.4 2.6-.2" stroke="${ink}" stroke-width=".8" fill="none" stroke-linecap="round"/>` +
    `<path class="lm0" d="M28 40.6q4 1.6 8 0" stroke="${ink}" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse class="lm1" cx="32" cy="40.9" rx="3.2" ry="1.9" fill="#4A1E14" stroke="${ink}" stroke-width=".8"/>` +
    beard + '</g></svg>';
}
function leaderSays(T, words){
  const L = leadOf(T), who = `${L.n}, ${L.f ? 'Älteste' : 'Ältester'} ${clanVom(T.clan)}`;
  clearTimeout(leaderSays._t); leaderSays._t = setTimeout(() => { const e = document.querySelector('.leader.talk'); if (e) e.classList.remove('talk'); }, Math.min(6500, 900 + words.length * 45));
  return `<div class="leader talk">${leaderSvg(T)}<div class="say"><b>${esc(who)}</b><span>„${esc(words)}“</span></div></div>`;
}
function eventTick(){
  if (eventNow || tick < nextEvent || tick < YEAR || quest < QUESTS.findIndex(Q => Q.id === 'ausleger')) return;   // the first year is calm
  if (sheetKind || placing){ nextEvent = tick + 5; return; }
  const ok = EVENTS.filter(E => E.id !== lastEvent).map(E => [E, E.when()]).filter(([, o]) => o);
  nextEvent = tick + 360 + Math.floor(Math.random() * 180);   // every 12 to 18 minutes: time to see what happens, and calm between
  if (!ok.length) return;
  // in the storm season a cyclone comes more often than anything else
  const storm = ok.find(([E]) => E.id === 'sturm'), [E, o] = storm && Math.random() < .55 ? storm : pickOf(ok); lastEvent = E.id; eventNow = {E, o}; stats.ereignisse++;
  const I = E.place ? E.place(o) : o; setActive(I.id);
  if (E.id === 'sturm') cycloneStart(I, 8);   // the sky darkens as the warning comes
  sfx('horn'); openSheet('event', {});
}
function eventMarkup(){
  const {E, o} = eventNow, I = E.place ? E.place(o) : o;
  let h = head(E.t, `Auf ${I.name}`);
  const T = E.who && E.who(o);
  h += (T && T.clan ? leaderSays(T, E.say(o)) : `<p>${E.text(o)}</p>`) + '<ul class="list needs">';
  let first = true;
  E.choices.forEach((ch, i) => {
    if (ch.late && !hawaiki()) return;   // a kava ceremony only in the later time
    const cost = ch.ask ? E.cost(o) : ch.cost, ok = !cost || canPay(I, cost), lead = first; first = false;
    h += `<li class="${ok ? '' : 'need'}"><span class="nm">${ch.n}<small>${[typeof ch.text === 'function' ? ch.text(I) : ch.text, cost ? `Kostet ${costText(cost)}.` : ''].filter(Boolean).join(' ')}${ok ? '' : ` Es fehlt ${lacking(I, cost)}.`}</small></span><button class="btn${lead ? ' primary' : ''}" type="button" data-act="choose" data-i="${i}" ${ok ? '' : 'disabled'}>Wählen</button></li>`;
  });
  return h + '</ul>';
}
function eventAct(act, btn){
  if (sheetKind !== 'event' || !eventNow) return false;
  if (act === 'close'){ eventNow = null; closeSheet(); return true; }
  if (act !== 'choose') return false;
  const {E, o} = eventNow, I = E.place ? E.place(o) : o, ch = E.choices[+btn.dataset.i], cost = ch.ask ? E.cost(o) : ch.cost;
  if ((cost && !canPay(I, cost)) || (ch.late && !hawaiki())) return true;
  if (cost) pay(I, cost);
  const msg = ch.go(o); eventNow = null; closeSheet(); updateHUD(); save(); checkQuest(); toast(msg, 5200);
  return true;
}

/* ---------- the chronicle */
const allPop = () => villages().reduce((t, I) => t + I.pop, 0);
const CHRONIK = [
  {id:'haus', t:'Das erste Dach', d:'Ein Haus gebaut.', test:() => islands.some(I => I.settled && I.buildings.some(b => b.kind === 'haus' && !b.bt)), mana:1},
  {id:'dorf', t:'Ein Dorf', d:'Eine Siedlung mit 20 Menschen.', test:() => villages().some(I => I.lvl >= 2), mana:2},
  {id:'motu', t:'Zwei Dörfer', d:'Ein zweites Dorf gegründet.', test:() => villages().length >= 2, mana:2},
  {id:'land', t:'Hinter dem Horizont', d:'Eine Insel im Nebel gefunden.', test:() => newLand() >= 1, mana:2},
  {id:'mitgebracht', t:'Die mitgebrachte Welt', d:'Pflanzen oder Tiere im Kanu auf neues Land gebracht.', test:() => (stats.brought || 0) >= 1, mana:2},
  {id:'kultur', t:'Andere Menschen', d:'Ein Volk einer anderen Kultur gefunden.', test:() => cultureIsles().length >= 1, mana:4},
  {id:'bananen', t:'Bananen vom Großen Land', d:'Bananen wachsen in einem eigenen Dorf.', test:() => lifeKnown('banane'), mana:2},
  {id:'sternwege', t:'Sternwege vom Nordmeer', d:'Die Seefahrer vom Nordmeer haben eure Navigatoren gelehrt.', test:() => !!stats.nordLehre, mana:2},
  {id:'heirat', t:'Ein Bund durch Heirat', d:'Eine Hochzeit mit einem anderen Clan.', test:() => (stats.heirat || 0) >= 1, mana:2},
  {id:'fremdheirat', t:'Verwandte in der Fremde', d:'Eine Hochzeit mit Menschen einer anderen Kultur.', test:() => (stats.fremdheirat || 0) >= 1, mana:3},
  {id:'muster', t:'Ein eigenes Muster', d:'Die Töpfer stempeln ein eigenes Muster in den Ton.', test:() => islands.some(I => I.settled && I.motif), mana:1},
  {id:'musterweit', t:'Ein Muster wandert', d:'Ein Muster ist auf vier Inseln bekannt.', test:() => Object.keys(MOTIFS).some(k => islands.filter(I => (I.settled || I.clan) && motifsOf(I).includes(k)).length >= 4), mana:3},
  {id:'verwandt', t:'Verwandte im Ton', d:'Ein Clan stempelt euer Muster in seine Töpfe.', test:() => islands.some(I => I.clan && kin(I)), mana:2},
  {id:'ausgestorben', t:'Für immer fort', d:'Auf einer Insel ist eine Tierart ausgestorben.', test:() => islands.some(I => I.settled && I.id !== 'heimat' && goneOf(I) > 0), mana:0},
  {id:'clan', t:'Fremde Nachbarn', d:'Einen Clan getroffen.', test:() => routes.some(r => isl(r.a).clan || isl(r.b).clan), mana:2},
  {id:'gabe', t:'Gabe und Gegengabe', d:'Einem Clan eine Gabe gebracht.', test:() => stats.gaben >= 1, mana:2},
  {id:'plejaden', t:'Unter den Plejaden', d:'Das Fest der ersten Früchte gefeiert.', test:() => islands.some(I => I.festYear != null), mana:3},
  {id:'tufunga', t:'Die ersten Handwerker', d:'Eine Familie mit Hauswerk hat ihr Haus zum Handwerkerhaus ausgebaut.', test:() => (stats.tufunga || 0) >= 1, mana:2},
  {id:'seeweg', t:'Die ersten Seefahrer', d:'Eine Familie nah am Strand hat ihr Haus zum Seefahrerhaus ausgebaut.', test:() => (stats.seeweg || 0) >= 1, mana:2},
  {id:'wissende', t:'Die Wissenden', d:'Ein Haus der Wissenden bewahrt Sternenpfad und Ahnenreihen.', test:() => (stats.seeweg || 0) >= 3, mana:3},
  {id:'matriarchin', t:'Die Matriarchin', d:'Eine Häuptlingsfamilie wohnt im Häuptlingshaus.', test:() => villages().some(I => chiefFam(I)), mana:3},
  {id:'treibgut', t:'Was das Meer bringt', d:'Fünfmal Treibgut aufgefischt.', test:() => (stats.treibgut || 0) >= 5, mana:1},
  {id:'taucher', t:'Vom Grund des Meeres', d:'Taucher haben etwas vom Grund heraufgebracht.', test:() => (stats.tauchfund || 0) >= 1, mana:1},
  {id:'wurf', t:'Knöchelwurf', d:'Zum ersten Mal die Knochen geworfen.', test:() => (stats.koruru || 0) >= 1, mana:1},
  {id:'chief', t:'Ein Häuptlingsdorf', d:'Ein Dorf zum Häuptlingsdorf gemacht.', test:() => villages().some(I => I.lvl === 3), mana:4},
  {id:'sturm', t:'Dem Sturm getrotzt', d:'Einen Wirbelsturm überstanden.', test:() => stats.stuerme >= 1, mana:2},
  {id:'wald', t:'Hüter des Waldes', d:'50 junge Bäume gepflanzt.', test:() => stats.gepflanzt >= 50, mana:3},
  {id:'fang', t:'Volle Netze', d:'100 Fisch gefangen.', test:() => stats.fisch >= 100, mana:3},
  {id:'pop50', t:'Fünfzig Menschen', d:'50 Menschen in allen Dörfern.', test:() => allPop() >= 50, mana:3},
  {id:'schoen', t:'Ein schönes Dorf', d:'Schönheit 30 auf einer Insel.', test:() => villages().some(I => beautyOf(I) >= 30), mana:3},
  {id:'flotte', t:'Eine Flotte', d:'6 Kanus.', test:() => own().length >= 6, mana:3},
  {id:'inseln', t:'Zehn Inseln', d:'10 Inseln entdeckt.', test:() => islands.filter(I => I.discovered).length >= 10, mana:4},
  {id:'doerfer', t:'Fünf Dörfer', d:'5 eigene Dörfer.', test:() => villages().length >= 5, mana:4},
  {id:'clans', t:'Alle drei Clans', d:'Schnüre zum Feuerberg, zum Riff und zum Maulbeerhain.', test:() => new Set(routes.map(r => (isl(r.a).clan || isl(r.b).clan || {}).id).filter(Boolean)).size >= 3, mana:5},
  {id:'knoten', t:'Ein dichtes Netz', d:'30 Knoten auf allen Schnüren zusammen.', test:() => routes.reduce((t, r) => t + r.knots, 0) >= 30, mana:5},
  {id:'volk', t:'Ein Volk', d:'150 Menschen in allen Dörfern.', test:() => allPop() >= 150, mana:6},
  {id:'schatzinsel', t:'Eine Schatzinsel', d:'Eine der Schatzinseln gefunden.', test:() => islands.some(I => I.treasure && I.discovered), mana:3},
  {id:'weite', t:'Über die Weite See', d:'Land jenseits der Weiten See gefunden.', test:() => islands.some(I => I.discovered && I.center.x > FAR_X), mana:6},
  {id:'brache', t:'Der Boden ruht', d:'Ein Feld brachliegen lassen.', test:() => (stats.brache || 0) >= 1, mana:2},
  {id:'taucher', t:'Mit offenen Augen', d:'100 Tauchgänge ohne Atemgerät.', test:() => (stats.tauch || 0) >= 100, mana:3},
  {id:'navigator', t:'Der erste Navigator', d:'Jemand liest Wellen und Vögel.', test:() => navLore().lvl >= 1, mana:2},
  {id:'sterne', t:'Der Sternenpfad', d:'Ein Navigator kennt den Sternenpfad.', test:() => navLore().lvl >= 3, mana:5},
  {id:'ahnen10', t:'Zehn Ahnen', d:'Zehn Ahnen auf einer Insel.', test:() => villages().some(I => ancCount(I) >= 10), mana:3},
  {id:'jahre', t:'Fünf Jahre', d:'Fünf Jahre auf den Inseln.', test:() => yearOf() >= 5, mana:5}
];
function chronikTick(){
  for (const M of CHRONIK){
    if (chronik[M.id] != null || !M.test()) continue;
    chronik[M.id] = yearOf() + 1; mana += M.mana; sfx('chronik');
    // in the first minutes only into the conch, so the start stays quiet; later a short line
    const msg = `Chronik: ${M.t}.${M.mana ? ` Ansehen +${M.mana}.` : ''}`; if (tick < 150) note(msg); else toast(msg, 3200); save(); return;   // one at a time, so each one is noticed
  }
}
function chronikMarkup(){
  const done = CHRONIK.filter(M => chronik[M.id] != null).length;
  let h = head('Chronik', `${done} von ${CHRONIK.length} Ereignissen, die man sich noch lange erzählt.`);
  h += `<ul class="list needs">${CHRONIK.map(M => { const y = chronik[M.id]; return `<li class="${y != null ? 'okk' : ''}">${y != null ? '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-mana"/></svg>' : '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"></svg>'}<span class="nm">${M.t}<small>${M.d}${y != null ? ` Im ${y}. Jahr.` : ` Ansehen +${M.mana}.`}</small></span></li>`; }).join('')}</ul>`;
  return h;
}
