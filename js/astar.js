/* ===== astar.js : A* search, f(n) = g(n) + h(n) =====
   Grid over the AI half (10 x 8 cells). 8-direction moves, cells near the net cost more.
   Returns pixel waypoints + number of nodes expanded (shown in the AI brain log). */
function astar(from, to) {
  const cell = p => ({ c: clamp(Math.floor(p.x / GRID), 0, 9), r: clamp(Math.floor(p.y / GRID), 0, 7) });
  const s = cell(from), g = cell(to);
  const h = a => { const dx = Math.abs(a.c - g.c), dy = Math.abs(a.r - g.r); return Math.max(dx, dy) + .4 * Math.min(dx, dy); };
  const open = [{ ...s, g: 0, f: h(s), par: null }], closed = new Set();
  let n = 0;
  while (open.length) {
    open.sort((a, b) => a.f - b.f);                 // priority queue: lowest f(n) first
    const k = open.shift(), id = k.c + ',' + k.r;
    if (closed.has(id)) continue;
    closed.add(id); n++;
    if (k.c === g.c && k.r === g.r) {
      const path = [];
      for (let q = k; q; q = q.par) path.unshift({ x: (q.c + .5) * GRID, y: (q.r + .5) * GRID });
      return { path, n };
    }
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      if (!dc && !dr) continue;
      const c = k.c + dc, r = k.r + dr;
      if (c < 0 || c > 9 || r < 0 || r > 7 || closed.has(c + ',' + r)) continue;
      const gg = k.g + (dc && dr ? 1.4 : 1) * (r >= 6 ? 1.4 : 1);   // g(n): movement cost so far
      open.push({ c, r, g: gg, f: gg + h({ c, r }), par: k });       // f = g + h
    }
  }
  return { path: [to], n };
}
