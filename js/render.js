/* ===== render.js : canvas drawing – court, net, shuttle and animated human figures ===== */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function fitCanvas() { const d = window.devicePixelRatio || 1; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
const circ = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
const limb = (x1, y1, x2, y2, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

function drawCourt() {
  ctx.fillStyle = '#0d3b37'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#117a6c'; ctx.fillRect(COURT.x0, COURT.y0, COURT.x1 - COURT.x0, COURT.y1 - COURT.y0);
  ctx.strokeStyle = 'rgba(232,236,248,.9)'; ctx.lineWidth = 2;
  ctx.strokeRect(COURT.x0, COURT.y0, COURT.x1 - COURT.x0, COURT.y1 - COURT.y0);
  line(50, COURT.y0, 50, COURT.y1); line(350, COURT.y0, 350, COURT.y1);                 // side lines
  line(COURT.x0, NET - 90, COURT.x1, NET - 90); line(COURT.x0, NET + 90, COURT.x1, NET + 90); // service lines
  line(200, COURT.y0, 200, NET - 90); line(200, NET + 90, 200, COURT.y1);                // centre lines
  if (G.state === 'serve' && G.serviceTarget) {
    ctx.fillStyle = 'rgba(251,146,60,.16)'; ctx.fillRect(G.serviceTarget.x, G.serviceTarget.y, G.serviceTarget.w, G.serviceTarget.h);
    ctx.strokeStyle = 'rgba(251,146,60,.9)'; ctx.lineWidth = 2;
    ctx.strokeRect(G.serviceTarget.x, G.serviceTarget.y, G.serviceTarget.w, G.serviceTarget.h);
  }
}
function drawNet() {
  ctx.fillStyle = 'rgba(232,236,248,.88)'; ctx.fillRect(8, NET - 4, W - 16, 8);
  ctx.strokeStyle = 'rgba(11,16,32,.45)'; ctx.lineWidth = 1;
  for (let x = 14; x < W - 8; x += 8) line(x, NET - 4, x, NET + 4);
  circ(8, NET, 5, '#fb923c'); circ(W - 8, NET, 5, '#fb923c');
}
function drawOverlays() {
  if (canHit()) {
    const ay = G.aimPicked ? G.aimY : NET - SHOTS[G.sel].dn;
    ctx.strokeStyle = 'rgba(251,146,60,.95)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(G.aim, ay, 13, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    line(G.aim - 18, ay, G.aim + 18, ay); line(G.aim, ay - 18, G.aim, ay + 18);
  }
  const a = G.ai;                                                                          // A* route of the AI
  if (a.path && a.path.length > 1 && G.state === 'rally') {
    ctx.strokeStyle = 'rgba(45,212,191,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.beginPath();
    ctx.moveTo(a.x, a.y); for (let i = Math.max(1, a.pi); i < a.path.length; i++) ctx.lineTo(a.path[i].x, a.path[i].y);
    ctx.stroke(); ctx.setLineDash([]);
  }
  const hit = canHit();                                                                    // reach ring
  ctx.strokeStyle = hit ? 'rgba(198,244,50,.95)' : 'rgba(198,244,50,.22)'; ctx.lineWidth = hit ? 3 : 1.5;
  ctx.beginPath(); ctx.arc(G.you.x, G.you.y, REACH, 0, 7); ctx.stroke();
}

/* Animated figure: run cycle (legs + arms driven by distance travelled), racket swing arc, smash jump */
function drawFigure(p, col, isYou) {
  const run = p.moving ? Math.sin(p.phase * .06) : 0, bob = p.moving ? Math.abs(run) * 2.5 : 0, jump = p.jump * 26;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 14 - jump * .15, 5, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(p.x, p.y - jump - bob); if (!isYou) ctx.scale(-1, 1);
  const skin = '#f1c9a5', leg = '#1b2547';
  limb(-4, -20, -4 + run * 9, -3, 5, leg); limb(4, -20, 4 - run * 9, -3, 5, leg);        // legs
  circ(-4 + run * 9, -2, 3, '#fff'); circ(4 - run * 9, -2, 3, '#fff');                    // shoes
  limb(-8, -38, -10 - run * 7, -25, 4, skin);                                             // off arm
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-9, -43, 18, 25, 5); ctx.fill();    // torso
  circ(0, -51, 7.5, skin);
  if (isYou) { ctx.fillStyle = '#2a1d12'; ctx.beginPath(); ctx.arc(0, -52, 7.8, Math.PI, 0); ctx.fill(); }  // back of head
  else { circ(-2.6, -51, 1.1, '#0b1020'); circ(2.6, -51, 1.1, '#0b1020'); ctx.fillStyle = col; ctx.fillRect(-8, -57, 16, 3); }
  const th = p.swing > 0 ? -2.2 + (1 - p.swing) * 2.8 : .9;                               // racket arm angle
  const hx = 9 + Math.cos(th) * 14, hy = -38 + Math.sin(th) * 14;
  limb(9, -38, hx, hy, 4, skin);
  limb(hx, hy, hx + Math.cos(th) * 14, hy + Math.sin(th) * 14, 2, '#cfd6ec');             // shaft
  ctx.save(); ctx.translate(hx + Math.cos(th) * 25, hy + Math.sin(th) * 25); ctx.rotate(th);
  ctx.strokeStyle = '#e8ecf8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, 7); ctx.stroke();
  ctx.lineWidth = .6; line(-8, 0, 8, 0); line(0, -5, 0, 5); ctx.restore();
  ctx.restore();
}
function drawShuttle() {
  const s = G.shuttle, f = s.fl, hy = s.y - s.z * .75;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 6, 3, 0, 0, 7); ctx.fill();
  const ang = f ? Math.atan2(f.ty - f.ay, f.tx - f.ax) : Math.PI / 2, tx = s.x - Math.cos(ang) * 13, ty = hy - Math.sin(ang) * 13;
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(s.x, hy);
  ctx.lineTo(tx - Math.sin(ang) * 5, ty + Math.cos(ang) * 5); ctx.lineTo(tx + Math.sin(ang) * 5, ty - Math.cos(ang) * 5); ctx.fill();
  circ(s.x, hy, 4.5, '#ffe9a8');
}
function render() {
  ctx.clearRect(0, 0, W, H); drawCourt(); drawOverlays();
  drawFigure(G.ai, '#fb923c', false); drawNet(); drawFigure(G.you, '#c6f432', true); drawShuttle();
  if (canHit()) { ctx.fillStyle = '#c6f432'; ctx.font = '800 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('HIT!', G.you.x, G.you.y - 82); }
}
