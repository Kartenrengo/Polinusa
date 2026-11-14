'use strict';
/* Sheets for the fleet, trade chains, the canoe house, the calendar and the feast of the Pleiades */

const icon = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>`;
const shipIcon = kind => kind === 'oc' ? '<svg class="ic ship" viewBox="-13 -10 26 14" aria-hidden="true"><use href="#oc"/></svg>' : '<svg class="ic ship" viewBox="-24 -28 46 36" aria-hidden="true"><use href="#dc"/></svg>';
const stepper = (act, k, n, canMinus, canPlus, label) => `<span class="step"><button type="button" data-act="${act}-" data-k="${k}" aria-label="${label} weniger" ${canMinus ? '' : 'disabled'}>−</button><output aria-live="polite">${n}</output><button type="button" data-act="${act}+" data-k="${k}" aria-label="${label} mehr" ${canPlus ? '' : 'disabled'}>+</button></span>`;
/* a slider for amounts: drag to load or unload; the number beside it is what really went aboard */
const slider = (act, k, n, max, label) => `<span class="slide"><input type="range" min="0" max="${Math.max(max, n, 1)}" step="1" value="${n}" data-act="${act}" data-k="${k}" data-v="${n}" aria-label="${label}"${max > 0 || n > 0 ? '' : ' disabled'}><output>${n}</output></span>`;
function shipStatus(s){
  const r = s.route != null ? routes[s.route] : null;
  if (s.auto) return s.state === 'sail' && s.dest && s.dest.isl ? `Erkundet von selbst, holt Proviant auf ${isl(s.dest.isl).name}.` : 'Erkundet von selbst.';
  if (r) return `In der Handelskette ${isl(r.a).name} – ${isl(r.b).name}.${s.full ? ` An Bord: ${giftText(s.cargo)}. Lager auf ${s.fullAt} voll.` : ''}`;
  if (s.state === 'sail') return s.dest && s.dest.isl ? `Unterwegs nach ${isl(s.dest.isl).name}.` : 'Unterwegs auf See.';
  if (s.state === 'sea') return 'Liegt auf offener See vor Anker.';
  const P = isl(s.port); return P.clan ? `Liegt ${clanBeim(P.clan)} auf ${P.name}.` : P.settled ? `Liegt im Hafen von ${P.name}.` : `Liegt vor ${P.name}, das noch unbewohnt ist.${giftOf(P) ? ` Gabe: ${GIFTS[giftOf(P)].n}. ${GIFTS[giftOf(P)].does}` : ''}`;
}
/* The canoe sheet: what it carries, loading in a port of ours, and what it can do where it is */
function shipMarkup(s){
  const S = SHIPS[s.kind], P = s.port && s.state !== 'sail' ? isl(s.port) : null, load = roomUsed(s), life = s.life || [];
  // under way the sheet stays small, so the sea is free to tap; "Mehr" opens all of it
  const mini = sheetData.mini ?? (s.state === 'sail' || s.state === 'sea' || s.route != null);
  if (mini) return head(s.name, shipStatus(s)) + `<div class="rowx"><span class="sub">Tippe aufs Meer oder eine Insel.</span><span class="chips">${s.route != null ? '<button class="chip" type="button" data-act="unassign">Aus der Kette</button>' : ''}<button class="chip" type="button" data-act="shipmore">Mehr</button></span></div>`;
  let h = head(s.name, shipStatus(s));
  { const sw = sailWord(s); if (sw) h += `<p class="sub">${icon('wind')}<b>${sw}.</b></p>`; }
  h += `<p class="sub"><b>Besatzung:</b> ${S.crew} ${S.crewN}${s.kind !== 'oc' ? ', darunter ein Navigator, der nach Sternen und Wellen steuert' : ''}.${s.people ? ` Dazu ${s.people} Siedler.` : ''}${seaCrew(s) ? ` Seefahrerfamilien: ${Math.round((seaF(s) - 1) * 100)} % schneller, weniger Böen.` : ''}</p>`;
  h += `<div class="rowx"><span class="sub">Tippe auf das Meer oder eine Insel, dann fährt es dorthin.${S.fog ? '' : ' Ins Unbekannte fährt es nicht.'}</span><button class="chip" type="button" data-act="shipless">Weniger</button></div>`;
  if (S.fog && s.route == null) h += `<div class="rowx"><span class="sub">${s.auto ? 'Es fährt an den Rand des Bekannten, kehrt rechtzeitig um, holt im nächsten eigenen Hafen Proviant und fährt wieder los.' : 'Von selbst erkunden: an den Rand des Bekannten und rechtzeitig zurück, mit Proviant aus dem eigenen Lager.'}</span><button class="btn${s.auto ? '' : ' primary'}" type="button" data-act="auto">${s.auto ? 'Anhalten' : 'Erkunden lassen'}</button></div>`;
  if (S.fog) h += provisionNote(s, P);
  // a treasure island: what the crew can gather here
  if (P && P.treasure){ const T = P.treasure; h += `<div class="stat">${icon(T.k)}<span>${GN[T.k]}: ${T.left} bereit</span><span class="sub">${s.auto ? '' : 'Solange das Kanu hier liegt, sammelt die Mannschaft.'}</span></div>`; }
  if (s.hungry) h += `<p><b>Kein Proviant mehr.</b> Die Mannschaft fährt langsam heim.</p>`;
  if (s.full && cargoLoad(s) && s.route == null && !(P && P.settled)) h += `<p class="sub">An Bord: ${giftText(s.cargo)}. Lager auf ${s.fullAt || 'dem Hafen'} voll.</p>`;   // on a chain the status says it
  h += shipDiveMarkup(s);
  const aboard = `An Bord: ${[s.people ? `${s.people} Siedler` : '', cargoLoad(s) ? giftText(s.cargo) : '', life.length ? andList(life.map(id => LIFE[id].s)) : ''].filter(Boolean).join(', ') || 'nichts'}.`;
  // the loading list is folded away by default, so the map stays free for steering
  if (P && P.settled && s.route == null && !sheetData.load) h += `<div class="rowx"><span class="sub">${aboard}</span><button class="btn primary" type="button" data-act="load">Beladen</button></div>`;
  else if (P && P.settled && s.route == null){
    const goods = GOODS.filter(k => (P.stock[k] || 0) > 0 || s.cargo[k] || (S.fog && k === 'proviant')).sort((a, b) => S.fog ? (b === 'proviant') - (a === 'proviant') : 0);   // provisions first on the double canoe
    h += `<ul class="list needs">`;
    h += `<li>${icon('pop')}<span class="nm">Siedler<small>Auf ${P.name}: ${P.pop}</small></span>${slider('pp', 'pop', s.people, s.people + Math.max(0, Math.min(S.people - s.people, P.pop - SETTLE.keep)), 'Siedler')}</li>`;
    h += goods.map(k => `<li>${icon(k)}<span class="nm">${GN[k]}<small>Lager ${P.stock[k] || 0}</small></span>${slider('cg', k, s.cargo[k] || 0, (s.cargo[k] || 0) + Math.max(0, Math.min(S.cap - load, P.stock[k] || 0)), GN[k])}</li>`).join('');
    h += `</ul>` + lifeMarkup(s, P, load) + `${s.people ? `<p class="sub">Siedler an Bord. Nimm auch Holz und Nahrung mit, damit sie am neuen Ort gleich bauen und essen können.</p>` : ''}<div class="rowx"><span class="sub">Ladung ${load} von ${S.cap}, Siedler ${s.people} von ${S.people}</span><span class="chips"><button class="btn" type="button" data-act="unload" ${load || s.people ? '' : 'disabled'}>Alles ausladen</button><button class="btn primary" type="button" data-act="fold">Fertig</button></span></div>`;
    const here = routes.map((r, i) => [r, i]).filter(([r]) => r.a === P.id || r.b === P.id);
    if (here.length) h += `<div class="rowx"><span class="sub">In eine Handelskette einsetzen:</span><span class="chips">${here.map(([r, i]) => `<button class="chip" type="button" data-act="assign" data-r="${i}">${isl(r.a === P.id ? r.b : r.a).name}</button>`).join('')}</span></div>`;
  } else if ((load || s.people) && !(s.route != null && s.full)) h += `<p class="sub">${aboard}</p>`;
  if (s.route != null) h += `<div class="rowx"><span></span><button class="btn" type="button" data-act="unassign">Aus der Kette nehmen</button></div>`;
  if (P && !P.settled && !P.clan){ const hl = hutLack(s, P), hut = !Object.keys(hl).length, ok = s.people >= SETTLE.people && mana >= manaNeeded() && hut;
    h += `<div class="rowx"><span class="sub">${s.people < SETTLE.people ? `Für ein Dorf braucht es ${SETTLE.people} Siedler an Bord.` : !hut ? `Für das erste Haus fehlen an Bord ${giftText(hl)}.` : mana >= manaNeeded() ? 'Hier kann ein Dorf entstehen.' : `Es braucht Ansehen ${manaNeeded()}, jetzt ${Math.floor(mana)}.`}</span><button class="btn primary" type="button" data-act="settle" ${ok ? '' : 'disabled'}>Dorf gründen</button></div>`; }
  if (P && P.clan) h += `<div class="rowx"><span class="sub">${load ? `Diese Gabe bringt später etwa ${giftGuess(P.clan, giftWorth(P, s.cargo) * returnRate((routes[routeIndex(s.last, P.id)] || {knots:0}).knots))} zurück.` : 'Lade in einem eigenen Hafen etwas ein, das sie schätzen.'}</span><button class="btn primary" type="button" data-act="gift" ${load ? '' : 'disabled'}>Gabe übergeben</button></div>`;
  return h;
}
/* Life for new land: the canoe plants and a pair of pigs, each taking two places. Whatever grows on this island can go. */
function lifeMarkup(s, P, load){
  const S = SHIPS[s.kind], life = s.life || [], have = lifeOf(P);
  const chips = LIFE_IDS.filter(id => have.includes(id) || life.includes(id)).map(id => {
    const on = life.includes(id), L = LIFE[id], short = !on && (load + LIFE_LOAD > S.cap || Object.entries(L.take || {}).some(([g, v]) => (P.stock[g] || 0) < v));
    return `<button class="chip" type="button" data-act="life" data-k="${id}" aria-pressed="${on}" ${short ? 'disabled' : ''} title="${L.text}">${L.n}</button>`; }).join('');
  if (!chips) return '';
  return `<p class="sec">Leben fürs neue Land</p><div class="chips">${chips}</div><p class="sub">Was auf einer neuen Insel nicht im Kanu war, wächst dort nicht. Jedes nimmt 2 Plätze; die Schweine sind ein Paar aus dem Lager. In einem eigenen Dorf schlägt es gleich Wurzeln.</p>`;
}
function toggleLife(s, P, id){
  const life = s.life || (s.life = []), L = LIFE[id], i = life.indexOf(id);
  if (i >= 0){ life.splice(i, 1); for (const [g, v] of Object.entries(L.take || {})) P.stock[g] = Math.min(storeCap(P), (P.stock[g] || 0) + v); return; }
  if (!lifeOf(P).includes(id) || roomUsed(s) + LIFE_LOAD > SHIPS[s.kind].cap || !canPay(P, L.take || {})) return;
  pay(P, L.take || {}); life.push(id);
}
/* Provisions, plainly: where they come from, how long they last, and whether the canoe is ready for the unknown */
function provisionNote(s, P){
  const pv = s.cargo.proviant || 0, other = s.people || (s.life && s.life.length) || GOODS.some(k => k !== 'proviant' && s.cargo[k] > 0), secs = voyageDay() * TICK / 1000;
  const ready = pv > 0 && !other ? '<span class="state ok">bereit zum Erkunden</span>' : pv > 0 ? '<span class="state low">nur Proviant mitnehmen</span>' : '<span class="state out">kein Proviant</span>';
  const pits = P && P.settled ? P.buildings.some(b => b.kind === 'gaergrube' && !b.bt) : true;
  return `<div class="stat">${ready}${pv ? `<span>${icon('proviant')}${pv}, reicht etwa ${secsText(pv * secs)} auf See</span>` : ''}</div>` +
    `<p class="sub"><b>Proviant</b> kommt aus der Gärgrube, gegorene Brotfrucht, die monatelang hält. Ins Unbekannte fährt man nur damit, ohne Siedler und Waren; alle ${secs} s isst die Mannschaft 1.${pits ? '' : ' Hier gibt es noch keine Gärgrube (sie braucht 2 Brotfruchtbäume daneben).'}</p>`;
}
/* A trade chain: canoes on it, and what each end sends to the other */
function routeMarkup(ri){
  const r = routes[ri], A = isl(r.a), B = isl(r.b), on = ships.filter(s => s.own && s.route === ri);
  const C = A.clan || B.clan, mineEnd = A.clan ? B : A;
  let h = head(C ? `Schnur ${clanZum(C)}` : `Handelskette ${A.name} – ${B.name}`, `${r.knots} Knoten. Jede Fahrt knüpft einen dazu, dann geht es schneller.`);
  const all = routes.map((q, i) => [q, i]).filter(([q]) => q.a === active || q.b === active);
  if (all.length > 1) h += `<div class="chips" role="group" aria-label="Kette">${all.map(([q, i]) => `<button class="chip" type="button" data-act="route" data-r="${i}" aria-pressed="${i === ri}">${isl(q.a === active ? q.b : q.a).name}</button>`).join('')}</div>`;
  h += on.length ? `<ul class="list needs">${on.map(s => `<li>${shipIcon(s.kind)}<span class="nm">${s.name}<small>${shipStatus(s)}</small></span><button class="btn small" type="button" data-act="unassign" data-s="${s.id}">Abziehen</button></li>`).join('')}</ul>` : `<p class="sub">Noch fährt hier kein Kanu.</p>`;
  const free = ships.filter(s => s.own && s.route == null && s.state !== 'sail' && (s.port === r.a || s.port === r.b));
  if (free.length) h += `<div class="rowx"><span class="sub">Freie Kanus im Hafen:</span><span class="chips">${free.map(s => `<button class="chip" type="button" data-act="assignS" data-s="${s.id}">${s.name}</button>`).join('')}</span></div>`;
  else if (!on.length) h += `<p class="sub">Bau im Kanuhaus ein Auslegerkanu und bring es nach ${mineEnd.name}, dann kannst du es hier einsetzen.</p>`;
  const side = (from, to, key) => {
    const plan = r.plan[key] || (r.plan[key] = {}), goods = GOODS.filter(k => (from.stock[k] || 0) > 0 || plan[k]), cap = 24, sum = Object.values(plan).reduce((a, b) => a + b, 0);
    return `<p><b>Von ${from.name} nach ${to.name}</b> <span class="sub">${to.clan ? 'als Gabe' : ''}</span></p>` + (goods.length ? `<ul class="list needs">${goods.map(k => `<li>${icon(k)}<span class="nm">${GN[k]}<small>Lager ${from.stock[k] || 0}</small></span>${slider('pl', key + ':' + k, plan[k] || 0, (plan[k] || 0) + Math.max(0, cap - sum), GN[k])}</li>`).join('')}</ul>` : `<p class="sub">Auf ${from.name} liegt gerade nichts.</p>`);
  };
  if (A.settled) h += side(A, B, 'a');
  if (B.settled) h += side(B, A, 'b');
  if (C) h += `<p class="sub">Sie antworten später mit ${clanMakes(C).map(k => GN[k]).join(' und ')}. Was sie schätzen: ${clanWants(C).map(k => GN[k]).join(', ')}. ${kin(A.clan ? A : B) ? 'Sie stempeln euer Muster: Eure Gaben zählen mehr.' : 'Töpfe in der Gabe bringen ihnen euer Muster, dann zählen eure Gaben mehr.'}</p>`;
  return h;
}
function openRoute(ri){ const r = routes[ri]; if (isl(r.a).settled && r.a !== active && r.b !== active) setActive(r.a); selectedId = null; invalidate(); openSheet('route', {r:ri}); }
/* All canoes and trade chains at a glance */
function fleetMarkup(){
  const mine = own();
  let h = head('Flotte', mine.length ? 'Tippe auf Steuern, dann auf das Meer oder eine Insel.' : 'Kanus entstehen im Kanuhaus.');
  h += mine.length ? `<ul class="list needs">${mine.map(s => `<li>${shipIcon(s.kind)}<span class="nm">${s.name}<small>${SHIPS[s.kind].crew} ${SHIPS[s.kind].crewN}${s.people ? `, ${s.people} Siedler` : ''}${cargoLoad(s) ? `, ${giftText(s.cargo)}` : ''}. ${shipStatus(s)}${s.hungry ? ' Kein Proviant.' : ''}</small></span><button class="btn small" type="button" data-act="steer" data-s="${s.id}">Steuern</button></li>`).join('')}</ul>` : '';
  if (routes.length) h += `<p><b>Handelsketten</b></p><ul class="list needs">${routes.map((r, i) => { const A = isl(r.a), B = isl(r.b), n = ships.filter(s => s.own && s.route === i).length;
    return `<li>${icon('schnur')}<span class="nm">${A.name} – ${B.name}<small>${r.knots} Knoten, ${n ? `${n} ${n === 1 ? 'Kanu' : 'Kanus'}` : 'kein Kanu'}</small></span><button class="btn small" type="button" data-act="chain" data-r="${i}">Ansehen</button></li>`; }).join('')}</ul>`;
  return h;
}
function steerShip(s){ closeSheet(); selectShip(s); flyTo(s.x, s.y, Math.max(cam.z, 1)); }

/* The canoe house: one canoe at a time, it takes a while */
/* The canoe house in one glance: which of the six steps, how far, and the wood; the choice of canoes when it is free */
function yardMarkup(I){
  if (I.yard){
    const S = SHIPS[I.yard.kind], f = 1 - I.yard.left / S.bt, w = staffOf(I).yard, here = presentAt(I).get(I.buildings.find(b => b.kind === 'werft')) || 0, k = yardStep(I.yard), [n, t] = k ? YARD_STEPS[I.yard.kind][k - 1] : YARD_WOOD, secs = here ? I.yard.left * YARD_CREW / here * TICK / 1000 : 0;
    const state = !w ? '<span class="state out">ruht, keine Leute</span>' : !here ? '<span class="state low">Bauleute kommen</span>' : '';
    return `<div class="stat"><b>${S.n} · Schritt ${k + 1}/6 · ${n}</b>${state}</div><span class="mbar big"><i style="width:${f * 100}%"></i></span>` +
      `<div class="stat"><span class="sub">${t}</span>${here ? `<span>noch ${secsText(secs)}</span>` : ''}</div>` + `<div class="rtiles"><span class="rtile ${(I.yard.got || 0) >= S.cost.holz ? 'ok' : 'out'}" role="img" aria-label="Holz am Platz: ${I.yard.got || 0} von ${S.cost.holz}">${icon('holz')}<small>Holz am Platz</small><b>${I.yard.got || 0}/${S.cost.holz}</b></span></div>`;
  }
  // each canoe: what it can do, and what it takes as tiles with names, green when it lies in store, red when it is missing
  return Object.entries(SHIPS).filter(([k]) => k === 'oc' || unlocked(k)).map(([k, S]) => `<div class="shiprow"><div class="rowx"><span><b>${S.n}</b><br><span class="sub">etwa ${String(Math.round(S.bt * TICK / 60000 * 2) / 2).replace('.', ',')} min · ${S.cap} Waren, ${S.people} Menschen${k === 'vaka' ? ' · fährt über die Leere See' : ''}${k === 'dc' ? ' · fährt ins Unbekannte' : ''}</span></span><button class="btn${canPay(I, S.cost) ? ' primary' : ''}" type="button" data-act="yard" data-k="${k}" ${canPay(I, S.cost) ? '' : 'disabled'}>Bauen</button></div>${costTiles(I, S.cost)}</div>`).join('') +
    `<p class="sub">Im Hafen: ${shipAt(I.id).map(s => s.name).join(', ') || 'kein Kanu'}.</p>`;
}
/* The calendar: the seasons, the palolo night, the rāhui and the next feast */
function calendarMarkup(){
  const S = seasonOf(), I = isl(active), m = moonOf();
  let h = head(`${S.n}, ${m + 1}. Mond`, '');
  // the year as twelve moons in a ring of seasons; this moon marked
  h += `<div class="moons" role="img" aria-label="${S.n}, ${m + 1}. von 12 Monden">${Array.from({length:12}, (_, i) => { const Q = SEASONS.find(q => i >= q.from && i < q.to); return `<i class="moon-d ${Q.id}${i === m ? ' now' : ''}${i === Q.from ? ' start' : ''}"></i>`; }).join('')}</div>`;
  h += `<div class="seasons">${SEASONS.map(Q => `<span class="season-t ${Q.id}${Q === S ? ' now' : ''}" aria-label="${Q.n}: ${Q.text}">${icon(Q.id)}<small>${Q.n.replace('Zeit der ', '').replace('zeit', '')}</small></span>`).join('')}</div>`;
  h += `<p class="sub">${S.text}</p>`;
  h += `<div class="sfx">${SEASON_FX[S.id].map(([k, d, t]) => `<span class="sfx-i ${d > 0 ? 'up' : 'down'}" role="img" aria-label="${t}">${icon(k)}<b>${d > 0 ? '▲' : '▼'}</b><small>${t}</small></span>`).join('')}</div>`;
  h += `<div class="rowx"><span class="fest">${icon('plejaden')}${festivalTime() ? '<b>Festzeit</b>' : `Fest in ${minutes(untilFestival())} min`}</span></div>`;
  if (S.id === 'mager' && I.buildings.some(b => SEA_KINDS.has(b.kind))) h += I.rahui ? `<p class="sub">Auf ${I.name} gilt Rāhui. Fischfang und Riff ruhen bis zum Fest.</p>` : `<div class="rowx"><span class="sub">Rāhui auf ${I.name}: Fischfang und Riff bis zum Fest sperren, dann dreifacher Fang und Ansehen +3.</span><button class="btn" type="button" data-act="rahui">Rāhui ausrufen</button></div>`;
  return h;
}
/* The feast of the first fruits, in the meeting house when the Pleiades rise */
function festivalMarkup(I){
  const no = festivalState(I);
  let h = `<p><b>Fest der Plejaden</b> <span class="sub">Erste Früchte: ${costText(FESTIVAL.offering)}, Ansehen +${FESTIVAL.mana}</span></p>`;
  if (no) return h + `<p class="sub">${no}</p>`;
  const parts = festivalParts(I), chosen = sheetData.fest || (sheetData.fest = parts.filter(p => p.ok).map(p => p.P.id));
  h += `<ul class="list needs">${parts.map(p => `<li class="${p.ok ? (chosen.includes(p.P.id) ? 'okk' : '') : 'need'}"><span class="nm">${p.P.n}<small>${p.ok ? p.P.text : p.why}</small></span>${p.ok ? `<button class="chip" type="button" data-act="part" data-p="${p.P.id}" aria-pressed="${chosen.includes(p.P.id)}">+${p.gain}</button>` : ''}</li>`).join('')}</ul>`;
  const guests = guestsFor();
  h += `<p class="sub">Schönheit des Dorfes: +${Math.min(8, Math.floor(beautyOf(I) / 3))}.${ancestorsHonour(I) ? ` Die Ahnen: +${ancestorsHonour(I)}.` : ''}${guests.length ? ` Als Gäste kommen ${guests.map(T => T.clan.name).join(', ')}, mit Gaben.` : ' Clans mit mindestens 2 Knoten kommen als Gäste.'}</p>`;
  h += `<div class="rowx"><span>Ansehen +${festivalGain(I, chosen)}</span><button class="btn primary" type="button" data-act="festival">Fest feiern</button></div>`;
  return h;
}
/* Settlers go as families: first the rest of the family already aboard, then a family whose grown-ups are free, grown-ups
   first; the chief's family stays. Whoever goes takes their line along. */
function nextSettler(P, s){
  const last = (s.folk || []).slice(-1)[0], cf = chiefFam(P), busy = new Set(P.people.filter(p => p.job).map(p => p.h));
  const pool = P.people.filter(p => !(cf && p.h === cf.id));
  const same = last && pool.filter(p => p.h === last.h);
  const list = same && same.length ? same : pool.filter(p => !busy.has(p.h)).length ? pool.filter(p => !busy.has(p.h)) : pool;
  return list.slice().sort((a, b) => (stageOf(a) === 'adult' ? 0 : 1) - (stageOf(b) === 'adult' ? 0 : 1) || a.h - b.h || b.b - a.b)[0] || null;
}
/* What a slider stands for right now */
function slideValue(act, k){
  if (sheetKind === 'ship'){ const s = ships.find(q => q.id === sheetData.id); if (!s) return 0; return act === 'pp' ? s.people : s.cargo[k] || 0; }
  if (sheetKind === 'route'){ const r = routes[sheetData.r], [key, g] = k.split(':'), plan = r && r.plan[key]; return plan && plan[g] || 0; }
  return 0;
}
/* Dragging a slider loads or unloads one at a time, as the buttons did, until it gets there or nothing more fits */
function slideTo(el){
  const act = el.dataset.act, k = el.dataset.k, want = +el.value, fake = {dataset:{k}};
  for (let n = slideValue(act, k), guard = 0; n !== want && guard < 200; guard++){
    fleetAct(act + (want > n ? '+' : '-'), fake, true); const m = slideValue(act, k); if (m === n) break; n = m;
  }
  const v = slideValue(act, k); el.value = v; el.dataset.v = v; const o = el.nextElementSibling; if (o) o.textContent = v;
}
/* Buttons in these sheets. Returns true when it handled the tap. */
function fleetAct(act, btn, quiet = false){
  if (sheetKind === 'ship'){
    const s = ships.find(q => q.id === sheetData.id); if (!s) return false;
    const P = s.port ? isl(s.port) : null, k = btn.dataset.k;
    if (act === 'auto'){ setAuto(s, !s.auto); return true; }
    if (act === 'dive'){ startDive(s); renderSheet(); return true; }
    if (act === 'undive'){ stopDive(s, 'Die Mannschaft hört auf.'); renderSheet(); return true; }
    if (act === 'pp+' && P && P.pop > SETTLE.keep && s.people < SHIPS[s.kind].people){ syncPeople(P); const q = nextSettler(P, s); if (q){ P.people.splice(P.people.indexOf(q), 1); (s.folk = s.folk || []).push(q); } s.people++; P.pop--; P.staff = null; syncWalkers(); }
    else if (act === 'pp-' && P && s.people > 0){ const q = (s.folk || []).pop(); if (q){ syncPeople(P); P.people.push(q); } s.people--; P.pop++; P.staff = null; syncWalkers(); }
    else if (act === 'life' && P && P.settled) toggleLife(s, P, k);
    else if (act === 'cg+' && P && (P.stock[k] || 0) > 0 && roomUsed(s) < SHIPS[s.kind].cap){ s.cargo[k] = (s.cargo[k] || 0) + 1; P.stock[k]--; }
    else if (act === 'cg-' && P && s.cargo[k] > 0 && (P.stock[k] || 0) < storeCap(P)){ s.cargo[k]--; if (!s.cargo[k]) delete s.cargo[k]; P.stock[k] = Math.min(storeCap(P), (P.stock[k] || 0) + 1); }
    else if (act === 'unload') unloadAll(s);
    else if (act === 'shipmore' || act === 'shipless'){ sheetData = {...sheetData, mini:act === 'shipless'}; renderSheet(); measure(); return true; }
    else if (act === 'load' || act === 'fold'){ sheetData.load = act === 'load'; renderSheet(); measure(); return true; }
    else if (act === 'assign'){ assignRoute(s, +btn.dataset.r); }
    else if (act === 'unassign') unassign(s);
    else if (act === 'settle'){ settleFrom(s); closeSheet(); return true; }
    else if (act === 'gift') giveGift(s);
    else return false;
    if (!quiet){ updateHUD(); renderSheet(); save(); } return true;
  }
  if (sheetKind === 'route'){
    const r = routes[sheetData.r];
    if (act === 'route'){ sheetData.r = +btn.dataset.r; }
    else if (act === 'assignS'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) assignRoute(s, sheetData.r); }
    else if (act === 'unassign'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) unassign(s); }
    else if (act === 'pl+' || act === 'pl-'){ const [key, k] = btn.dataset.k.split(':'), plan = r.plan[key] || (r.plan[key] = {}); plan[k] = Math.max(0, (plan[k] || 0) + (act === 'pl+' ? 1 : -1)); if (!plan[k]) delete plan[k]; }
    else return false;
    if (!quiet){ renderSheet(); save(); } return true;
  }
  if (sheetKind === 'fleet'){
    if (act === 'steer'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) steerShip(s); return true; }
    if (act === 'chain'){ openRoute(+btn.dataset.r); return true; }
    return false;
  }
  if (sheetKind === 'calendar' && act === 'rahui'){ declareRahui(isl(active)); renderSheet(); return true; }
  if (sheetKind === 'info'){
    const b = findB(sheetData.id); if (!b) return false; const I = islOfB(b.id);
    if (act === 'yard'){ startYard(I, btn.dataset.k); renderSheet(); return true; }
    if (act === 'part'){ const id = btn.dataset.p, c = sheetData.fest; const i = c.indexOf(id); if (i >= 0) c.splice(i, 1); else c.push(id); renderSheet(); return true; }
    if (act === 'festival'){ holdFestival(I, sheetData.fest || []); return true; }
  }
  return false;
}
