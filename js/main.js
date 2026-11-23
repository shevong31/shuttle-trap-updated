/* ===== main.js : game loop + DOM panels ===== */
const $ = id => document.getElementById(id);
$('shots').innerHTML = Object.keys(SHOTS).map(k =>
  `<button style="--c:${SHOTS[k].col}" data-s="${k}">${SHOTS[k].n.toUpperCase()}</button>`).join('');
$('shots').addEventListener('pointerdown', e => { const b = e.target.closest('[data-s]'); if (b) { e.preventDefault(); playerSwing(b.dataset.s); } });
$('serve').addEventListener('click', playerServe);
document.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
  G.mode = b.dataset.m; document.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); log('Switched AI to ' + b.textContent); }));
$('newgame').addEventListener('click', newGame);
document.addEventListener('click', e => { if (e.target.id === 'again') newGame(); });

let lastBanner = null;
function ui() {
  $('s0').textContent = G.score[0]; $('s1').textContent = G.score[1]; $('rl').textContent = G.rally;
  for (const i of [0, 1]) { const v = Math.round(G[i ? 'ai' : 'you'].stam); $('v' + i).textContent = v; $('b' + i).style.width = v + '%'; }
  const p = Model.predict();
  $('pred').innerHTML = p ? `AI expects <b class="o">${SHOTS[p.shot].n}</b> (${Math.round(p.sp * 100)}%) aimed <b class="o">${COLN[p.col]}</b> (${Math.round(p.cp * 100)}%). <span style="color:var(--mu)">Vary your pattern to fool it.</span>`
    : '<span style="color:var(--mu)">Observing… hit 3 shots and the AI starts predicting you.</span>';
  const c = G.coachCache; if (c) $('coach').innerHTML = `Coach: <b class="l">${SHOTS[c.shot].n}</b> to <b class="l">${COLN[c.ci]}</b>`;
  const tot = Object.values(Model.shot).reduce((a, b) => a + b, 0);
  $('tend').innerHTML = Object.keys(SHOTS).map(k => { const v = Math.round(Model.shot[k] / tot * 100);
    return `<div class="row"><span>${SHOTS[k].n}</span><div class="bar"><i style="width:${v}%;background:${SHOTS[k].col}"></i></div><b>${v}%</b></div>`; }).join('');
  $('brain').innerHTML = G.brain.map(x => `<div>${x}</div>`).join('');
  syncControls();
  $('status').textContent = G.state === 'serve' ? (G.server === 'you' ? 'Your serve · diagonal service court highlighted' : 'AI is preparing a diagonal serve…')
    : G.state === 'rally' ? (canHit() ? 'SHUTTLE IN REACH · PICK A LANDING SPOT, THEN A SHOT' : (G.shuttle.fl && G.shuttle.fl.by === 'ai' ? 'Moving automatically to receive…' : 'AI is moving to receive…')) : '';
  if (G.banner !== lastBanner) { lastBanner = G.banner; const b = $('banner'); b.innerHTML = G.banner; b.style.display = G.banner ? 'flex' : 'none'; }
}
function syncControls() {
  $('serve').hidden = G.state !== 'serve' || G.server !== 'you';
  document.querySelectorAll('#shots [data-s]').forEach(b => { b.disabled = G.state !== 'rally' || !canHit(); });
}

let last = performance.now(), tick = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); render();
  syncControls();
  if (++tick % 6 === 0) { if (G.state === 'rally' && G.shuttle.fl && G.shuttle.fl.by === 'ai') G.coachCache = coachPick(); ui(); }
  requestAnimationFrame(frame);
}
fitCanvas(); newGame(); G.coachCache = coachPick(); requestAnimationFrame(frame);
