/* ===== config.js : constants, shot table, helpers (loaded first) ===== */
const W = 400, H = 640;              // logical canvas size (top-down court)
const NET = 320, NET_H = 55;         // net line (y) and net height (z)
const REACH = 58;                    // racket reach radius (px)
const GRID = 40;                     // A* cell size
const WIN = 11;                      // points to win; win by two, capped at 15
const MAX_SCORE = 15;
const COURT = { x0: 20, x1: 380, y0: 20, y1: 620 };
const SINGLES = { x0: 50, x1: 350 };
const PSPEED = 230;                  // player speed px/s
const AISPEED = { hill: 215, greedy: 190 };
const BASE = { you: { x: 200, y: 520 }, ai: { x: 200, y: 120 } };
const COLX = [60, 130, 200, 270, 340];
const COLN = ['far left', 'left', 'centre', 'right', 'far right'];

// dn = landing distance from the net, z0 = contact height, arc = extra lift, dur = flight time (s)
const SHOTS = {
  clear: { n: 'Clear',    dn: 285, z0: 60,  arc: 130, dur: 1.15, err: 10, errP: .04, cost: 5,  col: '#2dd4bf' },
  drop:  { n: 'Drop',     dn: 75,  z0: 60,  arc: 70,  dur: .85,  err: 10, errP: .07, cost: 4,  col: '#c6f432' },
  smash: { n: 'Smash',    dn: 190, z0: 100, arc: 30,  dur: .42,  err: 22, errP: .16, cost: 10, col: '#fb923c' },
  net:   { n: 'Net shot', dn: 28,  z0: 100, arc: 40, dur: .70, err: 8,  errP: .08, cost: 3,  col: '#f87171' }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const colOf = x => clamp(Math.floor(x / 80), 0, 4);
const rnd = n => Math.floor(Math.random() * n);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
