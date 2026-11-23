/* ===== ai.js : opponent model + Greedy Best-First + Hill Climbing + AI controller ===== */

/* --- Opponent model: learns the human's shot and aim habits (recent shots count more) --- */
const Model = {
  shot: {}, col: [], n: 0,
  reset() { this.shot = { clear: 1, drop: 1, smash: 1, net: 1 }; this.col = [1, 1, 1, 1, 1]; this.n = 0; },
  observe(shot, x) {
    for (const k in this.shot) this.shot[k] *= .9;
    this.col = this.col.map(v => v * .9);
    this.shot[shot]++; this.col[colOf(x)]++; this.n++;
  },
  predict() {
    if (this.n < 3) return null;                     // not enough data yet
    const ks = Object.keys(this.shot), st = ks.reduce((a, b) => this.shot[a] >= this.shot[b] ? a : b);
    const sum = ks.reduce((a, k) => a + this.shot[k], 0), cs = this.col.indexOf(Math.max(...this.col));
    return { shot: st, sp: this.shot[st] / sum, col: cs, cp: this.col[cs] / this.col.reduce((a, b) => a + b, 0) };
  }
};

/* --- Evaluation: how hard is this shot for the defender to return? (higher = better for attacker) --- */
function evalShot(by, shot, x, rich) {
  const atk = G[by], def = G[by === 'you' ? 'ai' : 'you'], sp = SHOTS[shot];
  const land = { x, y: NET + (by === 'you' ? -1 : 1) * sp.dn };
  const speed = by === 'you' ? AISPEED[G.mode] : PSPEED;
  const cover = speed * (.45 + .55 * def.stam / 100) * Math.max(0, sp.dur - .12) + REACH;
  const arrivalMargin = dist(def, land) - cover;
  let s = arrivalMargin / 28 - sp.errP * 10 - sp.cost * .08;
  const tn = (atk.y - NET) / (atk.y - land.y), zn = sp.z0 * (1 - tn) + sp.arc * 4 * tn * (1 - tn);
  if (tn > 0 && tn < 1 && zn < NET_H + 8) s -= 50;
  if (shot === 'net' && Math.abs(atk.y - NET) > 150) s -= 18;
  const sd = sp.err * (1 + (100 - atk.stam) / 150), edge = Math.min(x - SINGLES.x0, SINGLES.x1 - x);
  s -= Math.max(0, sd * 1.5 - edge) / 10;
  if (rich) {
    const home = BASE[by === 'you' ? 'ai' : 'you'];
    s += dist(land, home) / 55 * .55 + Math.abs(land.x - def.x) / 100
      + (Math.abs(land.y - def.y) > 200 ? 1.2 : 0) - (100 - atk.stam) * .012;
  }
  return s;
}
const allCands = () => { const a = []; for (const s in SHOTS) for (let ci = 0; ci < 5; ci++) a.push({ shot: s, ci }); return a; };

/* Greedy Best-First: pick the single best immediate opening */
function greedyPick(by) {
  let best = null, bs = -1e9;
  for (const c of allCands()) { const s = evalShot(by, c.shot, COLX[c.ci], false); if (s > bs) { bs = s; best = c; } }
  return { ...best, sc: bs, steps: 0 };
}
/* Hill Climbing: start random, keep small changes (shift column / change shot) that improve the score */
function hillPick(by) {
  let cur = allCands()[rnd(20)], sc = evalShot(by, cur.shot, COLX[cur.ci], true), steps = 0;
  for (let i = 0; i < 15; i++) {
    const nb = [];
    for (const d of [-1, 1]) if (cur.ci + d >= 0 && cur.ci + d < 5) nb.push({ shot: cur.shot, ci: cur.ci + d });
    for (const s in SHOTS) if (s !== cur.shot) nb.push({ shot: s, ci: cur.ci });
    let best = null, bs = sc;
    for (const n of nb) { const s = evalShot(by, n.shot, COLX[n.ci], true); if (s > bs) { bs = s; best = n; } }
    if (!best) break;                                 // local optimum reached
    cur = best; sc = bs; steps++;
  }
  return { ...cur, sc, steps };
}
function aiPick() {
  if (Math.random() < .1) { log('AI slipped: random shot (10% imperfection)'); return { ...allCands()[rnd(20)] }; }
  const ch = G.mode === 'hill' ? hillPick('ai') : greedyPick('ai');
  log(`${G.mode === 'hill' ? 'Hill Climbing: ' + ch.steps + ' steps → ' : 'Greedy: '}${SHOTS[ch.shot].n} to ${COLN[ch.ci]} (score ${ch.sc.toFixed(1)})`);
  return ch;
}
function coachPick() { return hillPick('you'); }       // suggestion shown to the human

/* --- AI controller: movement uses A*, hitting uses the picks above --- */
function aiHome() {                                    // pre-position toward the column the model expects
  const p = Model.predict();
  return { x: p ? 200 + (COLX[p.col] - 200) * .5 : BASE.ai.x, y: BASE.ai.y };
}
function moveAlong(p, target, speed, dt) {
  p.moving = false;
  if (!target) return;
  const key = Math.floor(target.x / GRID) + ',' + Math.floor(target.y / GRID);
  if (p.tkey !== key) {                                // target cell changed → re-plan with A*
    p.tkey = key; const r = astar(p, target); p.path = r.path; p.nodes = r.n; p.pi = 1;
    if (G.shuttle.fl && G.shuttle.fl.by === 'you') log(`A*: ${r.n} nodes expanded → intercept route of ${r.path.length} cells`);
  }
  const last = p.pi >= p.path.length - 1, wp = last ? target : p.path[p.pi];
  const dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
  if (d < 4) { p.pi++; return; }
  const st = Math.min(d, speed * dt);
  p.x += dx / d * st; p.y += dy / d * st; p.phase += st; p.moving = true; p.stam = Math.max(0, p.stam - st * .03);
}
function aiHit() {
  const ch = aiPick(); G.ai.cool = .5;
  launch('ai', ch.shot, COLX[ch.ci] + gauss() * 8);
}
function aiServe() {
  const receiverX = G.ai.x < 200 ? 300 : 100;
  G.ai.cool = .5;
  launch('ai', 'clear', receiverX, { x: receiverX, y: 520 });
}
function aiUpdate(dt) {
  const a = G.ai, s = G.shuttle, f = s.fl; a.cool = Math.max(0, a.cool - dt);
  let target = null;
  if (G.state === 'serve' && G.server === 'ai') {
    a.serveT = (a.serveT || 0) + dt; target = { x: a.x, y: a.y };
    if (a.serveT > 1.2) { a.serveT = 0; aiServe(); }
  } else if (G.state === 'rally' && f && f.by === 'you') {
    a.react = Math.max(0, a.react - dt);
    target = a.react <= 0 ? { x: clamp(f.tx, SINGLES.x0, SINGLES.x1), y: clamp(f.ty, 30, NET - 30) } : aiHome();
    if (!a.cool && s.y < NET && s.z < 115 && dist(a, s) < REACH && f.t > .4) aiHit();
  } else if (G.state !== 'point' && G.state !== 'over') target = aiHome();
  moveAlong(a, target, AISPEED[G.mode] * a.boost * (.6 + .4 * a.stam / 100), dt);
}
