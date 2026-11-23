"""
Shuttle Trap - AI algorithms in Python (headless).
Same ideas as js/ai.js + js/astar.js, on a 5x4 tactical grid, so you can benchmark them for your report.

Run:  python python/ai_algorithms.py
"""
import heapq
import random

COLS, DEP = 5, 4
BASE = (2, 1)
SHOTS = {  # d = landing depth (0 back .. 3 net), reach = time-to-react budget, err = error risk, cost = stamina
    "clear": dict(d=0, reach=3.2, err=.04, cost=5),
    "drop":  dict(d=2, reach=2.6, err=.09, cost=4),
    "smash": dict(d=1, reach=1.8, err=.22, cost=10),
    "net":   dict(d=3, reach=2.4, err=.08, cost=3),
}


def dist(a, b):
    dx, dy = abs(a[0] - b[0]), abs(a[1] - b[1])
    return max(dx, dy) + .4 * min(dx, dy)


# ---------- A*  :  f(n) = g(n) + h(n) ----------
def astar(start, goal):
    open_, seen, n = [(dist(start, goal), 0, start, [start])], set(), 0
    while open_:
        f, g, cur, path = heapq.heappop(open_)
        if cur in seen:
            continue
        seen.add(cur); n += 1
        if cur == goal:
            return path, n
        for dc in (-1, 0, 1):
            for dd in (-1, 0, 1):
                nxt = (cur[0] + dc, cur[1] + dd)
                if (dc or dd) and 0 <= nxt[0] < COLS and 0 <= nxt[1] < DEP and nxt not in seen:
                    ng = g + (1.4 if dc and dd else 1) * (1.3 if nxt[1] == 3 else 1)
                    heapq.heappush(open_, (ng + dist(nxt, goal), ng, nxt, path + [nxt]))
    return [start], n


def recover(pos, steps=2):
    path, _ = astar(tuple(pos), BASE)
    return path[min(steps, len(path) - 1)]


# ---------- evaluation ----------
def reach(stam, shot):
    return SHOTS[shot]["reach"] - (.8 if stam < 35 else 0)


def evaluate(def_pos, def_stam, atk_stam, shot, col, rich):
    sp = SHOTS[shot]; land = (col, sp["d"])
    s = (dist(def_pos, land) - reach(def_stam, shot)) * 2 - sp["err"] * 8 - (sp["cost"] * .1 if atk_stam < 35 else 0)
    if rich:  # hill climbing also values setup: pull opponent out of position, alternate front/back
        s += dist(land, BASE) * .7 + (1.2 if abs(land[1] - def_pos[1]) >= 2 else 0) - sp["cost"] * .05
    return s


def greedy(def_pos, def_stam, atk_stam):
    return max(((s, c) for s in SHOTS for c in range(COLS)),
               key=lambda x: evaluate(def_pos, def_stam, atk_stam, x[0], x[1], False))


def hill_climb(def_pos, def_stam, atk_stam, rng):
    cur = (rng.choice(list(SHOTS)), rng.randrange(COLS))
    score = evaluate(def_pos, def_stam, atk_stam, *cur, True)
    for _ in range(15):
        nbrs = [(cur[0], cur[1] + d) for d in (-1, 1) if 0 <= cur[1] + d < COLS] + [(s, cur[1]) for s in SHOTS if s != cur[0]]
        best = max(nbrs, key=lambda x: evaluate(def_pos, def_stam, atk_stam, *x, True))
        bs = evaluate(def_pos, def_stam, atk_stam, *best, True)
        if bs <= score:
            break  # local optimum
        cur, score = best, bs
    return cur


# ---------- opponent model ----------
class OpponentModel:
    def __init__(self):
        self.shot = {k: 1.0 for k in SHOTS}; self.col = [1.0] * COLS; self.n = 0

    def observe(self, shot, col):
        self.shot = {k: v * .9 for k, v in self.shot.items()}; self.col = [v * .9 for v in self.col]
        self.shot[shot] += 1; self.col[col] += 1; self.n += 1

    def predict(self):
        if self.n < 3:
            return None
        return max(self.shot, key=self.shot.get), self.col.index(max(self.col))


# ---------- headless match to compare strategies ----------
def choose(strategy, def_pos, def_stam, atk_stam, rng):
    if rng.random() < .1:
        return rng.choice(list(SHOTS)), rng.randrange(COLS)
    return greedy(def_pos, def_stam, atk_stam) if strategy == "greedy" else hill_climb(def_pos, def_stam, atk_stam, rng)


def play_point(strats, rng, server=0):
    pos, stam, hitter = [list(BASE), list(BASE)], [100.0, 100.0], server
    for _ in range(80):
        d = 1 - hitter
        shot, col = choose(strats[hitter], tuple(pos[d]), stam[d], stam[hitter], rng)
        sp = SHOTS[shot]; stam[hitter] = max(0, stam[hitter] - sp["cost"])
        if rng.random() < sp["err"] + (.08 if stam[hitter] < 35 else 0):
            return d                                   # unforced error
        land = (col, sp["d"]); dd = dist(pos[d], land)
        pos[hitter] = list(recover(pos[hitter]))
        if dd > reach(stam[d], shot):
            return hitter                              # winner
        pos[d] = list(land); stam[d] = max(0, stam[d] - dd * 1.5); hitter = d
    return rng.randrange(2)


def play_match(strats, rng, target=7):
    sc, server = [0, 0], 0
    while max(sc) < target:
        server = play_point(strats, rng, server)       # winner of a point serves the next one
        sc[server] += 1
    return 0 if sc[0] > sc[1] else 1


if __name__ == "__main__":
    rng, N = random.Random(42), 200
    a = sum(play_match(("hill", "greedy"), rng) == 0 for _ in range(N))        # hill on side 0
    b = sum(play_match(("greedy", "hill"), rng) == 1 for _ in range(N))        # hill on side 1
    print(f"Hill Climbing vs Greedy ({2 * N} matches, sides swapped): Hill wins {a + b} ({(a + b) / (2 * N):.0%})")
    path, n = astar((0, 3), BASE)
    print("A* from front-left corner to base:", path, f"({n} nodes expanded)")
