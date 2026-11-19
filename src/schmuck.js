/* ======================================================================================================================
   Schönbau: turn and mirror what you place or move, fine decorations in lines (fence, hedge, coral border, stepping
   stones, drying rack), and the photo mode that hides the bars. The pieces themselves are in data.js (K.rot marks a fine
   decoration), their pictures in art.js, the beauty they bring in world.js (fineBeauty). Placing is in ui.js.
   ====================================================================================================================== */
const TURN_STEP = 45;   // degrees per tap of "Drehen"
const canMirror = kind => xformOf(kind, {mirror:1}).m !== 1;
/* the turn buttons of the place bar: "Drehen" (and "Reihe") for fine decorations, "Spiegeln" for what can be mirrored */
function turnBar(){
  const K = placing && !placing.founding && KINDS[placing.kind], rot = !!(K && K.rot), show = !!K && (rot || canMirror(placing.kind));
  $('placeTurn').hidden = !show; if (!show) return;
  $('placeRot').textContent = rot ? 'Drehen' : 'Spiegeln'; $('placeRow').hidden = !rot || mode === 'move';
  $('placeRot').setAttribute('aria-label', rot ? 'Drehen: eine Stufe weiter' : 'Spiegeln: zur anderen Seite');
}
/* one tap: turn a step (fine decorations; the next piece swings round the last one placed) or mirror */
function turnPlacing(){
  if (!placing) return; const K = KINDS[placing.kind], v = placing.v || {};
  if (K.rot){
    const a = placing.anchor; placing.v = {...v, rot:((v.rot || 0) + TURN_STEP) % 180};
    if (a && placing.x === a.gx && placing.y === a.gy) lineStep(a);
  } else placing.v = {...v, mirror:v.mirror ? 0 : 1};
  ghostRender();
}
/* the spot one piece further along the line, from the piece last placed */
function lineStep(a){
  const K = KINDS[placing.kind], r = (placing.v.rot || 0) * Math.PI / 180;
  placing.x = fx(a.x + Math.cos(r) * K.len); placing.y = fx(a.y + Math.sin(r) * K.len); a.gx = placing.x; a.gy = placing.y;
}
/* after a piece was placed: the next one waits at the end of it, turned the same way */
function lineNext(){
  const a = placing.anchor = {x:placing.x, y:placing.y}; lineStep(a); placing.v = {...placing.v}; ghostRender();
}
/* "Reihe": up to six pieces in one go along the line, as far as there is room and goods */
function placeRow(){
  for (let i = 0; i < 6 && placing && placing.ok && KINDS[placing.kind].rot; i++) confirmPlace();
}
$('placeRot').addEventListener('click', turnPlacing);
$('placeRow').addEventListener('click', placeRow);

/* ---------- photo mode: bars away, the village alone; a tap on the map (or Esc) brings them back */
const photoIs = () => photoMode;
function photoOn(){
  if (landing) return;
  closeSheet(); closeNews(); if (placing) endPlace(); selectedId = null; setSideOpen(false);
  photoMode = true; document.body.classList.add('photo'); measure(); invalidate(); requestDraw();
}
function photoOff(){
  if (!photoMode) return;
  photoMode = false; document.body.classList.remove('photo'); measure(); invalidate(); requestDraw();
}
window.addEventListener('keydown', e => { if (photoMode && e.key === 'Escape') photoOff(); });
