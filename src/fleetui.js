'use strict';
/* Sheets for the fleet, trade chains, the canoe house, the calendar and the feast of the Pleiades */

const icon = k => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><use href="#ic-${k}"/></svg>`;
const shipIcon = kind => kind === 'oc' ? '<svg class="ic ship" viewBox="-13 -10 26 14" aria-hidden="true"><use href="#oc"/></svg>' : '<svg class="ic ship" viewBox="-24 -28 46 36" aria-hidden="true"><use href="#dc"/></svg>';
const stepper = (act, k, n, canMinus, canPlus, label) => `<span class="step"><button type="button" data-act="${act}-" data-k="${k}" aria-label="${label} weniger" ${canMinus ? '' : 'disabled'}>−</button><output aria-live="polite">${n}</output><button type="button" data-act="${act}+" data-k="${k}" aria-label="${label} mehr" ${canPlus ? '' : 'disabled'}>+</button></span>`;
function shipStatus(s){
  const r = s.route != null ? routes[s.route] : null;
  if (r) return `In der Handelskette ${isl(r.a).name} – ${isl(r.b).name}.`;
  if (s.state === 'sail') return s.dest && s.dest.isl ? `Unterwegs nach ${isl(s.dest.isl).name}.` : 'Unterwegs auf See.';
  if (s.state === 'sea') return 'Liegt auf offener See vor Anker.';
  const P = isl(s.port); return P.clan ? `Liegt beim ${P.clan.name} auf ${P.name}.` : P.settled ? `Liegt im Hafen von ${P.name}.` : `Liegt vor ${P.name}, das noch unbewohnt ist.`;
}
/* The canoe sheet: what it carries, loading in a port of ours, and what it can do where it is */
function shipMarkup(s){
  const S = SHIPS[s.kind], P = s.port && s.state !== 'sail' ? isl(s.port) : null, load = cargoLoad(s);
  let h = head(s.name, shipStatus(s));
  h += `<p class="sub"><b>Besatzung:</b> ${S.crew} ${S.crewN}${s.kind === 'dc' ? ', darunter ein Navigator, der nach Sternen und Wellen steuert' : ''}.${s.people ? ` Dazu ${s.people} Siedler.` : ''}</p>`;
  h += `<p class="sub">Tippe auf das Meer oder eine Insel, dann fährt es dorthin.${S.fog ? ' Ins Unbekannte nur mit Proviant an Bord, 1 pro Reisetag.' : ' Ins Unbekannte fährt es nicht.'}</p>`;
  if (s.hungry) h += `<p><b>Kein Proviant mehr.</b> Die Mannschaft fährt langsam heim.</p>`;
  const aboard = `An Bord: ${[s.people ? `${s.people} Siedler` : '', load ? giftText(s.cargo) : ''].filter(Boolean).join(', ') || 'nichts'}.`;
  // the loading list is folded away by default, so the map stays free for steering
  if (P && P.settled && s.route == null && !sheetData.load) h += `<div class="rowx"><span class="sub">${aboard}</span><button class="btn primary" type="button" data-act="load">Beladen</button></div>`;
  else if (P && P.settled && s.route == null){
    const goods = GOODS.filter(k => (P.stock[k] || 0) > 0 || s.cargo[k]);
    h += `<ul class="list needs">`;
    h += `<li>${icon('pop')}<span class="nm">Siedler<small>Auf ${P.name}: ${P.pop}</small></span>${stepper('pp', 'pop', s.people, s.people > 0, s.people < S.people && P.pop > SETTLE.keep, 'Siedler')}</li>`;
    h += goods.map(k => `<li>${icon(k)}<span class="nm">${GN[k]}<small>Lager ${P.stock[k] || 0}</small></span>${stepper('cg', k, s.cargo[k] || 0, (s.cargo[k] || 0) > 0, load < S.cap && (P.stock[k] || 0) > 0, GN[k])}</li>`).join('');
    h += `</ul>${s.people ? `<p class="sub">Siedler an Bord. Nimm auch Holz und Essen mit, damit sie am neuen Ort gleich bauen können.</p>` : ''}<div class="rowx"><span class="sub">Ladung ${load} von ${S.cap}, Siedler ${s.people} von ${S.people}</span><span class="chips"><button class="btn" type="button" data-act="unload" ${load || s.people ? '' : 'disabled'}>Alles ausladen</button><button class="btn primary" type="button" data-act="fold">Fertig</button></span></div>`;
    const here = routes.map((r, i) => [r, i]).filter(([r]) => r.a === P.id || r.b === P.id);
    if (here.length) h += `<div class="rowx"><span class="sub">In eine Handelskette einsetzen:</span><span class="chips">${here.map(([r, i]) => `<button class="chip" type="button" data-act="assign" data-r="${i}">${isl(r.a === P.id ? r.b : r.a).name}</button>`).join('')}</span></div>`;
  } else if (load || s.people) h += `<p class="sub">${aboard}</p>`;
  if (s.route != null) h += `<div class="rowx"><span></span><button class="btn" type="button" data-act="unassign">Aus der Kette nehmen</button></div>`;
  if (P && !P.settled && !P.clan) h += `<div class="rowx"><span class="sub">${s.people >= SETTLE.people ? (mana >= manaNeeded() ? 'Hier kann ein Dorf entstehen.' : `Es braucht Ansehen ${manaNeeded()}, jetzt ${Math.floor(mana)}.`) : `Für ein Dorf braucht es ${SETTLE.people} Siedler an Bord.`}</span><button class="btn primary" type="button" data-act="settle" ${s.people >= SETTLE.people && mana >= manaNeeded() ? '' : 'disabled'}>Dorf gründen</button></div>`;
  if (P && P.clan) h += `<div class="rowx"><span class="sub">${load ? `Diese Gabe bringt später etwa ${giftGuess(P.clan, giftValue(P.clan, s.cargo) * returnRate((routes[routeIndex(s.last, P.id)] || {knots:0}).knots))} zurück.` : 'Lade in einem eigenen Hafen etwas ein, das sie schätzen.'}</span><button class="btn primary" type="button" data-act="gift" ${load ? '' : 'disabled'}>Gabe übergeben</button></div>`;
  return h;
}
/* A trade chain: canoes on it, and what each end sends to the other */
function routeMarkup(ri){
  const r = routes[ri], A = isl(r.a), B = isl(r.b), on = ships.filter(s => s.own && s.route === ri);
  const C = A.clan || B.clan, mineEnd = A.clan ? B : A;
  let h = head(C ? `Schnur zum ${C.name}` : `Handelskette ${A.name} – ${B.name}`, `${r.knots} Knoten. Jede Fahrt knüpft einen dazu, dann geht es schneller.`);
  const all = routes.map((q, i) => [q, i]).filter(([q]) => q.a === active || q.b === active);
  if (all.length > 1) h += `<div class="chips" role="group" aria-label="Kette">${all.map(([q, i]) => `<button class="chip" type="button" data-act="route" data-r="${i}" aria-pressed="${i === ri}">${isl(q.a === active ? q.b : q.a).name}</button>`).join('')}</div>`;
  h += on.length ? `<ul class="list needs">${on.map(s => `<li>${shipIcon(s.kind)}<span class="nm">${s.name}<small>${shipStatus(s)}</small></span><button class="btn small" type="button" data-act="unassign" data-s="${s.id}">Abziehen</button></li>`).join('')}</ul>` : `<p class="sub">Noch fährt hier kein Kanu.</p>`;
  const free = ships.filter(s => s.own && s.route == null && s.state !== 'sail' && (s.port === r.a || s.port === r.b));
  if (free.length) h += `<div class="rowx"><span class="sub">Freie Kanus im Hafen:</span><span class="chips">${free.map(s => `<button class="chip" type="button" data-act="assignS" data-s="${s.id}">${s.name}</button>`).join('')}</span></div>`;
  else if (!on.length) h += `<p class="sub">Bau im Kanuhaus ein Auslegerkanu und bring es nach ${mineEnd.name}, dann kannst du es hier einsetzen.</p>`;
  const side = (from, to, key) => {
    const plan = r.plan[key] || (r.plan[key] = {}), goods = GOODS.filter(k => (from.stock[k] || 0) > 0 || plan[k]), cap = 24, sum = Object.values(plan).reduce((a, b) => a + b, 0);
    return `<p><b>Von ${from.name} nach ${to.name}</b> <span class="sub">${to.clan ? 'als Gabe' : ''}</span></p>` + (goods.length ? `<ul class="list needs">${goods.map(k => `<li>${icon(k)}<span class="nm">${GN[k]}<small>Lager ${from.stock[k] || 0}</small></span>${stepper('pl', key + ':' + k, plan[k] || 0, (plan[k] || 0) > 0, sum < cap, GN[k])}</li>`).join('')}</ul>` : `<p class="sub">Auf ${from.name} liegt gerade nichts.</p>`);
  };
  if (A.settled) h += side(A, B, 'a');
  if (B.settled) h += side(B, A, 'b');
  if (C) h += `<p class="sub">Sie antworten später mit ${C.makes.map(k => GN[k]).join(' und ')}. Was sie schätzen: ${C.wants.map(k => GN[k]).join(', ')}.</p>`;
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
function yardMarkup(I){
  if (I.yard){
    const S = SHIPS[I.yard.kind], f = 1 - I.yard.left / S.bt;
    return (staffOf(I).yard ? `<p><b>Hier entsteht ein ${S.n}.</b> ${YARD_CREW} Leute bauen noch etwa ${Math.ceil(I.yard.left * TICK / 1000)} Sekunden. In der Zeit kannst du das Dorf schmücken oder die Handelsketten einrichten.</p>` :
      `<p><b>Der Bau des ${S.n}s ruht.</b> Es fehlen ${YARD_CREW} freie Leute. Baustellen gehen vor.</p>`) + `<span class="mbar big"><i style="width:${f * 100}%"></i></span>`;
  }
  return Object.entries(SHIPS).filter(([k]) => k === 'oc' || unlocked('dc')).map(([k, S]) => `<div class="rowx"><span><b>${S.n}</b><br><span class="sub">${costText(S.cost)}, etwa ${S.bt * TICK / 1000} Sekunden. ${k === 'oc' ? `Trägt ${S.cap} Waren und ${S.people} Menschen, bleibt im Bekannten.` : `Trägt ${S.cap} Waren und ${S.people} Menschen, fährt ins Unbekannte.`}</span></span><button class="btn${canPay(I, S.cost) ? ' primary' : ''}" type="button" data-act="yard" data-k="${k}" ${canPay(I, S.cost) ? '' : 'disabled'}>Bauen</button></div>`).join('') +
    `<p class="sub">Kanus im Hafen: ${shipAt(I.id).map(s => s.name).join(', ') || 'keine'}.</p>`;
}
/* The calendar: the seasons, the palolo night, the rāhui and the next feast */
function calendarMarkup(){
  const S = seasonOf(), I = isl(active);
  let h = head(`${S.n}, ${moonOf() + 1}. Mond`, S.text);
  h += `<ul class="list needs">${SEASONS.map(Q => `<li class="${Q === S ? 'okk' : ''}">${icon(Q.id)}<span class="nm">${Q.n}<small>${Q.to - Q.from} Monde${Q.baum !== 1 ? `, Brotfrucht ${Q.baum ? 'reichlich' : 'keine'}` : ''}${Q.sea !== 1 ? `, Kanus ${Q.sea < 1 ? 'langsamer' : 'schneller'}` : ''}</small></span></li>`).join('')}</ul>`;
  h += `<p class="sub">${festivalTime() ? 'Jetzt ist Festzeit. Feiert das Fest der ersten Früchte im Versammlungshaus.' : `Das Fest der Plejaden beginnt in etwa ${minutes(untilFestival())} Minuten.`} Eine Woche nach Vollmond im ersten Mond steigt der Palolo aus dem Riff.</p>`;
  if (S.id === 'mager' && I.buildings.some(b => b.kind === 'fisch')) h += I.rahui ? `<p class="sub">Auf ${I.name} gilt Rāhui. Der Fischfang ruht bis zum Fest.</p>` : `<div class="rowx"><span class="sub">Rāhui auf ${I.name}: Fischfang bis zum Fest sperren, dann doppelter Fang und Ansehen +3.</span><button class="btn" type="button" data-act="rahui">Rāhui ausrufen</button></div>`;
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
  h += `<p class="sub">Schönheit des Dorfes: +${Math.min(8, Math.floor(beautyOf(I) / 3))}.${guests.length ? ` Als Gäste kommen ${guests.map(T => T.clan.name).join(', ')}, mit Gaben.` : ' Clans mit mindestens 2 Knoten kommen als Gäste.'}</p>`;
  h += `<div class="rowx"><span>Ansehen +${festivalGain(I, chosen)}</span><button class="btn primary" type="button" data-act="festival">Fest feiern</button></div>`;
  return h;
}
/* Buttons in these sheets. Returns true when it handled the tap. */
function fleetAct(act, btn){
  if (sheetKind === 'ship'){
    const s = ships.find(q => q.id === sheetData.id); if (!s) return false;
    const P = s.port ? isl(s.port) : null, k = btn.dataset.k;
    if (act === 'pp+' && P && P.pop > SETTLE.keep && s.people < SHIPS[s.kind].people){ s.people++; P.pop--; }
    else if (act === 'pp-' && P && s.people > 0){ s.people--; P.pop++; }
    else if (act === 'cg+' && P && (P.stock[k] || 0) > 0 && cargoLoad(s) < SHIPS[s.kind].cap){ s.cargo[k] = (s.cargo[k] || 0) + 1; P.stock[k]--; }
    else if (act === 'cg-' && P && s.cargo[k] > 0){ s.cargo[k]--; if (!s.cargo[k]) delete s.cargo[k]; P.stock[k] = Math.min(storeCap(P), (P.stock[k] || 0) + 1); }
    else if (act === 'unload') unloadAll(s);
    else if (act === 'load' || act === 'fold'){ sheetData.load = act === 'load'; renderSheet(); measure(); return true; }
    else if (act === 'assign'){ assignRoute(s, +btn.dataset.r); }
    else if (act === 'unassign') unassign(s);
    else if (act === 'settle'){ settleFrom(s); closeSheet(); return true; }
    else if (act === 'gift') giveGift(s);
    else return false;
    updateHUD(); renderSheet(); save(); return true;
  }
  if (sheetKind === 'route'){
    const r = routes[sheetData.r];
    if (act === 'route'){ sheetData.r = +btn.dataset.r; }
    else if (act === 'assignS'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) assignRoute(s, sheetData.r); }
    else if (act === 'unassign'){ const s = ships.find(q => q.id === +btn.dataset.s); if (s) unassign(s); }
    else if (act === 'pl+' || act === 'pl-'){ const [key, k] = btn.dataset.k.split(':'), plan = r.plan[key] || (r.plan[key] = {}); plan[k] = Math.max(0, (plan[k] || 0) + (act === 'pl+' ? 1 : -1)); if (!plan[k]) delete plan[k]; }
    else return false;
    renderSheet(); save(); return true;
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
