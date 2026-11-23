/* ===== game.js : state, rules, shuttle physics, player control (no DOM access here) ===== */
const G = { mode: 'hill', score: [0, 0], state: 'serve', server: 'you', winner: 'you', rally: 0, timer: 0,
  aim: 200, aimY: NET - SHOTS.clear.dn, aimPicked: false, sel: 'clear', brain: [], banner: '', over: false,
  shuttle: { x: 200, y: 520, z: 50, fl: null } };
const log = t => { G.brain.unshift(t); if (G.brain.length > 5) G.brain.length = 5; };

function newPlayer(side) {
  return { side, x: BASE[side].x, y: BASE[side].y, stam: 100, phase: 0, swing: 0, swingShot: 'clear', jump: 0,
    moving: false, path: [], pi: 0, tkey: '', react: 0, boost: 1, cool: 0, nodes: 0 };
}
function newGame() {
  Model.reset(); G.score = [0, 0]; G.over = false; G.you = newPlayer('you'); G.ai = newPlayer('ai'); G.brain = [];
  log('New match · AI strategy: ' + (G.mode === 'hill' ? 'Hill Climbing' : 'Greedy Best-First'));
  startPoint('you');
}
function startPoint(srv) {
  G.server = srv; G.state = 'serve'; G.rally = 0; G.banner = ''; G.aimPicked = false;
  const even = G.score[srv === 'you' ? 0 : 1] % 2 === 0;
  const sx = srv === 'you' ? (even ? 110 : 290) : (even ? 290 : 110);
  const receiverX = 400 - sx;
  G.serviceTarget = { x: receiverX < 200 ? SINGLES.x0 : 200, y: srv === 'you' ? COURT.y0 : NET + 90,
    w: 150, h: 210 };
  for (const k of ['you', 'ai']) { const p = G[k]; p.x = k === srv ? sx : 400 - sx; p.y = k === 'you' ? 550 : 90; p.stam = Math.min(100, p.stam + 15);
    p.path = []; p.tkey = ''; p.react = 0; p.boost = 1; p.cool = .5; }
  G.ai.serveT = 0;
  G.shuttle = { x: G[srv].x, y: G[srv].y, z: 50, fl: null };
}
const canHit = () => { const s = G.shuttle, f = s.fl;
  return G.state === 'rally' && f && f.by === 'ai' && s.y > NET && s.z < 150 && dist(G.you, s) <= REACH; };

/* --- hitting: builds a flight (start, landing point, arc, duration). Mishits get low arc + big noise --- */
function launch(by, shot, aimX, serveTarget) {
  const p = G[by], s = G.shuttle, sp = SHOTS[shot], pre = by === 'you' ? Model.predict() : null;
  const mis = !serveTarget && Math.random() < sp.errP + (p.stam < 35 ? .08 : 0);
  const sd = sp.err * (1 + (100 - p.stam) / 150) * (mis ? 2.5 : 1), dir = by === 'you' ? -1 : 1;
  const tx = (serveTarget ? serveTarget.x : aimX) + gauss() * (serveTarget ? 0 : sd);
  const ty = serveTarget ? serveTarget.y : by === 'you'
    ? (G.aimPicked ? G.aimY : NET - sp.dn) + gauss() * sd * .6
    : NET + dir * sp.dn + gauss() * sd * .6;
  const farNetShot = shot === 'net' && Math.abs(p.y - NET) > 150;
  s.fl = { ax: s.x, ay: s.y, py: s.y, tx, ty, z0: farNetShot ? 45 : sp.z0,
    arc: mis ? sp.arc * .25 : farNetShot ? 8 : sp.arc, dur: serveTarget ? 1 : sp.dur, t: 0, by, shot, net: false };
  p.swing = 1; p.swingShot = shot; p.stam = Math.max(0, p.stam - sp.cost); G.state = 'rally'; G.rally++;
  G.aimPicked = false;
  if (by === 'you' && !serveTarget) {
    Model.observe(shot, aimX);
    const read = pre && colOf(aimX) === pre.col;
    G.ai.react = read ? 0 : .25; G.ai.boost = read ? 1.2 : 1; G.ai.tkey = '';
    log(pre ? (read ? 'AI read your aim → instant reaction' : 'You fooled the AI predictor!') : 'AI is still collecting data on you');
  }
}
function playerSwing(shot) {
  if (G.state === 'point' || G.state === 'over') return;
  const p = G.you; G.sel = shot;
  if (G.state === 'rally' && canHit()) launch('you', shot, G.aim);
}
function playerServe() {
  if (G.state !== 'serve' || G.server !== 'you') return;
  launch('you', 'clear', G.aim, { x: 400 - G.you.x, y: 120 });
}

/* --- scoring --- */
function point(w, why) {
  if (G.state !== 'rally') return;
  const you = w === 'you'; G.score[you ? 0 : 1]++; G.shuttle.fl = null; G.shuttle.z = 0; G.winner = w;
  const lead = G.score[you ? 0 : 1] - G.score[you ? 1 : 0];
  if ((G.score[you ? 0 : 1] >= WIN && lead >= 2) || G.score[you ? 0 : 1] >= MAX_SCORE) {
    G.over = true; G.state = 'over';
    G.banner = `<b>${you ? '🏆 YOU WIN' : '🤖 AI WINS'}</b><small>${why}<br>Final ${G.score[0]}–${G.score[1]}</small><button class="btn" id="again">Play again</button>`;
    return;
  }
  G.state = 'point'; G.timer = 1.8; G.banner = `<b>${you ? 'POINT TO YOU' : 'POINT TO AI'}</b><small>${why}</small>`;
}
const fault = (by, why) => point(by === 'you' ? 'ai' : 'you', (by === 'you' ? 'You: ' : 'AI: ') + why);

function stepShuttle(dt) {
  const s = G.shuttle, f = s.fl;
  if (G.state === 'serve') { const p = G[G.server]; s.x = p.x; s.y = p.y; s.z = 50; return; }
  if (!f || G.state !== 'rally') return;
  if (f.paused) return;
  f.t = Math.min(1, f.t + dt / f.dur); const t = f.t;
  s.x = f.ax + (f.tx - f.ax) * t; s.y = f.ay + (f.ty - f.ay) * t;
  s.z = f.z0 * (1 - t) + f.arc * 4 * t * (1 - t);      // parabola-like height curve
  if (!f.net && (f.py - NET) * (s.y - NET) <= 0) { f.net = true; if (s.z < NET_H) return fault(f.by, 'shot hit the net'); }
  f.py = s.y;
  if (f.by === 'ai' && t < 1 && canHit()) { f.paused = true; log('Shuttle in reach · choose your landing spot and return'); return; }
  if (t >= 1) {
    const inB = s.x >= SINGLES.x0 && s.x <= SINGLES.x1 && s.y >= COURT.y0 && s.y <= COURT.y1;
    const side = f.by === 'you' ? s.y < NET : s.y > NET;
    if (!inB || !side) fault(f.by, 'shot landed out');
    else point(f.by, `Winner! ${SHOTS[f.shot].n} to ${COLN[colOf(s.x)]}`);
  }
}

/* --- automatic player interception; the player stays at the return position --- */
function youUpdate(dt) {
  const p = G.you, f = G.shuttle.fl;
  if (G.state === 'rally' && f && f.by === 'ai') {
    const dx = f.tx - p.x, dy = f.ty - p.y, d = Math.hypot(dx, dy);
    const st = Math.min(d, PSPEED * (.45 + .55 * p.stam / 100) * dt);
    p.moving = st > 0;
    if (st) {
      p.x = clamp(p.x + dx / d * st, SINGLES.x0, SINGLES.x1); p.y = clamp(p.y + dy / d * st, NET + 18, 622);
      p.phase += st; p.stam = Math.max(0, p.stam - st * .055);
    }
  } else { p.moving = false; p.stam = Math.min(100, p.stam + 5 * dt); }
}

function update(dt) {
  for (const k of ['you', 'ai']) { const p = G[k]; p.swing = Math.max(0, p.swing - dt * 3.2);
    p.jump = p.swing > 0 && p.swingShot === 'smash' ? Math.sin((1 - p.swing) * Math.PI) : 0; }
  if (G.state === 'serve' || G.state === 'rally') { youUpdate(dt); aiUpdate(dt); stepShuttle(dt); }
  else { G.you.moving = false; G.ai.moving = false; }
  if (G.state === 'point') { G.timer -= dt; if (G.timer <= 0) startPoint(G.winner); }
}
