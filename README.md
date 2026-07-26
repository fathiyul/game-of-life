# Conway's Game of Life

An interactive [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life)
with a gallery of well-known patterns ("organisms") that you can paint onto the grid.

## Features

- Live simulation with the standard rules and wrap-around (toroidal) edges.
- **Pattern gallery** — pick a brush from still lifes, oscillators, spaceships,
  a glider gun, and methuselahs, then click/drag to stamp them onto the grid.
- **Rotate** the current brush to orient spaceships any way you like.
- Controls: Play/Pause, Randomize, Clear, speed slider, generation counter.
- A verified pattern catalog (see below).

## Run it

Because the code is split into ES modules, you need to serve it over HTTP
(opening `index.html` directly via `file://` will be blocked by the browser).

Pick any one of these:

```bash
# Python (built in on most systems)
python3 -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

## Controls

| Action | Input |
| --- | --- |
| Paint / stamp the current brush | Click + drag on the grid |
| Play / pause | `P` or `Space` |
| Rotate brush 90° | Right-click on grid (or `R`) |
| Clear the grid (also pauses) | `C` |
| Randomize | `Z` |
| Adjust speed | The slider |

The default brush is a single cell (toggle paint). Select any pattern in the
gallery to make it your brush — clicking then stamps that pattern, and dragging
drops a trail of them.

## Project structure

```
.
├── index.html          # Gallery playground page
├── create.html         # Brush editor page
├── css/
│   └── style.css       # Layout & theme
├── src/
│   ├── main.js         # Gallery page entry: input, controls, animation loop
│   ├── create.js       # Editor page entry: draw, evolve, save
│   ├── storage.js      # localStorage persistence for brushes & drafts
│   ├── game.js         # Simulation core (grid, step, stamp) — no DOM
│   ├── renderer.js     # Canvas drawing + pattern icons
│   └── patterns.js     # Built-in pattern catalog + parsers (plaintext & RLE)
└── test/
    └── verify.js       # Validates built-in patterns evolve correctly
```

## Persistence

Brushes and drafts are stored in the browser's **localStorage** (keys
`gol:brushes` and `gol:drafts`) as compact `O`/`.` row strings — the same format
as the built-in catalog, so width & height are implicit. This keeps the project
a dependency-free static site. The storage layer in `src/storage.js` is
isolated, so it could be swapped for a server-backed SQLite database later
without touching the UI.

## Verifying the patterns

Each pattern is checked to behave like real Game of Life: still lifes stay put,
oscillators loop on their period, spaceships translate, and the glider gun keeps
emitting gliders.

```bash
node test/verify.js
```
