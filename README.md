# The Shuttle Trap – AI Badminton

Real-time badminton game where your player automatically moves to intercept incoming
shuttles. Choose a shot and landing spot when a return is reachable; the AI uses A*,
Greedy Best-First / Hill Climbing, stamina, court position, and learned shot patterns.

## File structure
```
shuttle-trap/
├── index.html            page layout (canvas + panels)
├── css/style.css         dark theme styling
├── js/
│   ├── config.js         constants, SHOTS table, helpers      (loaded 1st)
│   ├── astar.js          A* search  f(n)=g(n)+h(n)
│   ├── ai.js             opponent model, greedy, hill climbing, AI controller
│   ├── game.js           state, rules, shuttle physics, human movement
│   ├── render.js         court, net, shuttle, animated figures
│   ├── input.js          keyboard / mouse / touch
│   └── main.js           game loop + UI panels                (loaded last)
├── python/ai_algorithms.py   same algorithms in Python + benchmark
└── .vscode/              recommended extensions + Live Server settings
```

## Run in VS Code
1. File → Open Folder → `shuttle-trap`
2. Install **Live Server** (suggested automatically) → right-click `index.html` → *Open with Live Server*
   (or just double-click `index.html`; no build step, no npm needed)
3. Python part: `python python/ai_algorithms.py`

## Controls
| Action | Desktop | Phone |
|---|---|---|
| Serve | Click **Serve diagonally** when serving | Tap **Serve diagonally** |
| Place a return | Move mouse or tap the opponent's half while the shuttle is reachable | Tap the opponent's half |
| Choose shot | Z Clear · X Drop · C Smash · V Net (or 1-4), or click a shot button | Shot buttons |

The player moves automatically and remains where the shuttle was received. Shot controls
are enabled only while the shuttle is within reach. Serves target the diagonal service
court selected by the server's score. Matches use rally scoring to 11, require a two-point
lead, and are capped at 15. Smash is fast but risky; a net shot played far from the net
falls short. Movement distance reduces stamina and slows recovery.

## Where each slide lives in the code
| Slide | Code |
|---|---|
| A* search | `js/astar.js` (AI interception route = teal dotted line) |
| Greedy / Hill Climbing | `greedyPick`, `hillPick` in `js/ai.js` |
| Adaptive opponent | `Model` in `js/ai.js` (decayed shot/aim counts → prediction → reaction) |
| State-space / evaluation | `evalShot` in `js/ai.js`, `SHOTS` in `js/config.js` |
| Stamina, automatic receiving, shot error and scoring | `launch`, `youUpdate`, `point` in `js/game.js` |

## Tuning knobs (js/config.js)
`PSPEED`, `AISPEED` (difficulty), `REACH`, `SHOTS.*.errP / dur / arc`, `WIN`.
