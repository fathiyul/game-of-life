# Conway's Game of Life

An interactive [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life)
with a pattern gallery of well-known organisms, a brush editor for designing your
own, and SQLite-backed persistence.

## Features

- Live simulation with the standard rules and wrap-around (toroidal) edges.
- **Pattern gallery** — still lifes, oscillators, spaceships, a glider gun, and
  methuselahs. Pick one as a brush and stamp it onto the grid (right-click to
  rotate; `R`).
- **Brush editor** (`create.html`) — draw freely with larger cells, evolve your
  design, revert to the pre-animation state, stash drafts, and save finished
  brushes (auto-cropped to their bounding box).
- Saved brushes and drafts persist in a real SQLite database.

## Architecture

A small full-stack app: a static frontend served by a Node backend.

```
game-of-life/
├── package.json              # npm workspaces + "npm start"
├── frontend/                 # static client (HTML/CSS/ES modules)
│   ├── index.html            # gallery playground
│   ├── create.html           # brush editor
│   ├── css/style.css
│   ├── src/
│   │   ├── main.js           # gallery page entry
│   │   ├── create.js         # editor page entry
│   │   ├── storage.js        # fetch()-based persistence (talks to the API)
│   │   ├── game.js           # simulation core (no DOM)
│   │   ├── renderer.js       # canvas drawing + pattern icons
│   │   └── patterns.js       # built-in catalog + parsers (plaintext & RLE)
│   └── test/verify.js        # validates built-in patterns evolve correctly
├── backend/                  # Node + Express + better-sqlite3
│   ├── server.js             # serves frontend + JSON API
│   ├── db.js                 # SQLite connection, schema, queries
│   └── routes/items.js       # generic CRUD router for brushes & drafts
└── data/                     # gitignored — the SQLite file lives here
    └── game-of-life.sqlite
```

The frontend and backend share one contract: a pattern is an array of `O`/`.`
strings (`rows`), so width & height are implicit.

## Run it

```bash
npm install      # installs backend deps (better-sqlite3, express)
npm start        # starts the server (serves frontend + API on one port)
```

Then open <http://localhost:3000>.

### Development (auto-restart)

During development, run the backend with auto-restart on file changes:

```bash
npm run dev      # nodemon watches backend/ and restarts on edits
```

Note: only backend changes trigger a restart. The frontend is served as static
files, so after editing frontend code just **reload the browser** (`Ctrl+Shift+R`
to bypass the module cache).

- `/` (`index.html`) — the gallery playground.
- `/create.html` — the brush editor.
- `GET / POST / DELETE` on `/api/brushes` and `/api/drafts` — the JSON API.

The database file is created automatically at `data/game-of-life.sqlite` on first
run. Inspect it with any SQLite client, e.g.:

```bash
sqlite3 data/game-of-life.sqlite "SELECT id, name FROM brushes;"
```

To wipe all brushes and drafts and start from an empty database:

```bash
npm run db:reset
```

## Controls (gallery page)

| Action | Input |
| --- | --- |
| Paint / stamp the current brush | Click + drag on the grid |
| Play / pause | `P` or `Space` |
| Rotate brush 90° | Right-click on grid (or `R`) |
| Clear the grid (also pauses) | `C` |
| Randomize | `Z` |

## Creating your own brushes (editor page)

Open **Create Brush** (the `+ Create Brush` link) and draw with single cells, then
press **Play** to evolve it.

- **Revert** (`R`) — restore the board to how it was when Play was last pressed.
- **Save Draft** — stash the whole board; listed in the side panel to re-load.
- **Save Brush** — crop to the live cells (w/h computed automatically) and add it
  to your gallery.

Saved brushes appear under **My Brushes** on the gallery page (right-click to
delete).

## Verify the patterns

The built-in catalog is checked to behave like real Game of Life (still lifes
stable, oscillators on their period, spaceships translate, the gun emits
gliders):

```bash
npm run verify
```

## Deploy to Google Cloud (Compute Engine)

Because the app stores data in a local SQLite file, deploy it to a **single VM
with a persistent disk** (Compute Engine). `startup.sh` provisions the VM for you:
Node + git, your repo, `npm install`, and a systemd service running as an
unprivileged user. The `data/` directory is gitignored, so your database
survives reboots and redeploys.

```bash
# 1. reserve a stable external IP
gcloud compute addresses create gol-ip --region=us-central1

# 2. create the VM (edit the repo-url!)
gcloud compute instances create game-of-life \
  --zone=us-central1-a --machine-type=e2-small --tags=gameoflife \
  --address=gol-ip --image-family=debian-12 --image-project=debian-cloud \
  --metadata repo-url=https://github.com/YOU/game-of-life.git \
  --metadata-from-file startup-script=startup.sh

# 3. open port 3000
gcloud compute firewall-rules create allow-gol \
  --allow tcp:3000 --source-ranges 0.0.0.0/0 --target-tags gameoflife

# 4. get the IP and open it in a browser
gcloud compute addresses describe gol-ip --region=us-central1 --format='value(address)'
```

Then visit **http://THAT_IP:3000**. Watch provisioning with:

```bash
gcloud compute ssh game-of-life --zone=us-central1-a -- 'journalctl -u game-of-life -f'
```

Notes:
- The startup script re-runs on every boot and does `git reset --hard`, so a
  reboot also pulls your latest `main`. Push first, then reboot to redeploy.
- For HTTPS, front it with Caddy (reverse proxy `localhost:3000`) and restrict
  the firewall to 80/443.
- To scale beyond one instance, migrate SQLite to Cloud SQL first.

### Local deployment coordinates

Keep your VM's project, zone, IPs, etc. in `secrets/gcp.env` (gitignored). The
committed `secrets/gcp.env.example` documents the fields. Populate it in one go:

```bash
./scripts/fetch-gcp-env.sh     # or: npm run gcp:env
```

Then `source secrets/gcp.env` to get `$GCP_EXTERNAL_IP`, `$GCP_APP_URL`, etc. in
your shell. (These are operational metadata, not access credentials — but it's a
good place to keep future real secrets like deploy tokens, since the whole
`secrets/` folder is ignored except `*.example` files.)
