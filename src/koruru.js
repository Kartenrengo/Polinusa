'use strict';
/* The five knucklebones of Kōruru, as the Māori of Aotearoa later called the game; small bones or stones were played with
   across the Pacific. For now only the mat and the bones are kept here: they come back as the daily throw (see the plan). */
const BONE = new Path2D('M-9-4.6Q-6-7.4-2.4-5.4Q0-4.4 2.4-5.4Q6-7.4 9-4.6Q11 0 9 4.6Q6 7.4 2.4 5.4Q0 4.4-2.4 5.4Q-6 7.4-9 4.6Q-11 0-9-4.6Z');
function koruruBone(c, x, y, rot, s, alpha = 1){
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = alpha;
  c.fillStyle = '#EADFC4'; c.fill(BONE); c.strokeStyle = '#2B1D14'; c.lineWidth = 1.2; c.stroke(BONE);
  c.beginPath(); c.ellipse(-3.6, 0, 1.6, 2.4, 0, 0, Math.PI * 2); c.ellipse(3.6, 0, 1.6, 2.4, 0, 0, Math.PI * 2); c.fillStyle = '#C9B48A'; c.fill();
  c.restore();
}
/* the mat of plaited pandanus, 340 × 230 */
function koruruMat(x){
  // the mat of plaited pandanus
  x.fillStyle = '#D8C08A'; x.fillRect(8, 8, 324, 214); x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 1;
  x.beginPath(); for (let i = -230; i < 340; i += 12){ x.moveTo(8 + i, 8); x.lineTo(8 + i + 214, 222); x.moveTo(8 + i + 214, 8); x.lineTo(8 + i, 222); } x.save(); x.beginPath(); x.rect(8, 8, 324, 214); x.clip();
  x.beginPath(); for (let i = -230; i < 340; i += 12){ x.moveTo(8 + i, 8); x.lineTo(8 + i + 214, 222); x.moveTo(8 + i + 214, 8); x.lineTo(8 + i, 222); } x.stroke(); x.restore();
  x.strokeStyle = '#6B5030'; x.lineWidth = 2; x.strokeRect(8, 8, 324, 214);
}
