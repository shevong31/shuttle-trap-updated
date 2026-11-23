/* ===== input.js : keyboard, mouse, touch ===== */
const KEYMAP = { z: 'clear', x: 'drop', c: 'smash', v: 'net', '1': 'clear', '2': 'drop', '3': 'smash', '4': 'net' };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (KEYMAP[k]) { if (!e.repeat) playerSwing(KEYMAP[k]); e.preventDefault(); return; }
  if (k.startsWith('arrow') || 'wasd'.includes(k)) e.preventDefault();
});

const toCourt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
function pointer(e) {
  const p = toCourt(e);
  if (G.state === 'rally' && canHit() && p.y < NET) {
    G.aim = clamp(p.x, SINGLES.x0 + 10, SINGLES.x1 - 10);
    G.aimY = clamp(p.y, COURT.y0 + 10, NET - 10);
    G.aimPicked = true;
  }
}
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pointer(e); });
cv.addEventListener('pointermove', pointer);
