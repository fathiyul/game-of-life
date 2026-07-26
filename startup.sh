#!/usr/bin/env bash
#
# startup.sh — Compute Engine startup script for Conway's Game of Life.
# Runs as root on (every) boot and is idempotent, so re-running is safe.
#
# It: installs Node + git, clones your repo, runs npm install, and keeps the
# server running under systemd as an unprivileged user. Your SQLite data lives
# in data/ (gitignored), so it survives reboots and redeploys.
#
# Deploy with:
#   gcloud compute addresses create gol-ip --region=us-central1
#
#   gcloud compute instances create game-of-life \
#     --zone=us-central1-a --machine-type=e2-small --tags=gameoflife \
#     --address=gol-ip --image-family=debian-12 --image-project=debian-cloud \
#     --metadata repo-url=https://github.com/YOU/game-of-life.git \
#     --metadata-from-file startup-script=startup.sh
#
# Then open the port:
#   gcloud compute firewall-rules create allow-gol \
#     --allow tcp:3000 --source-ranges 0.0.0.0/0 --target-tags gameoflife

set -euo pipefail

APP_DIR="/opt/game-of-life"
APP_USER="gol"
BRANCH="${BRANCH:-main}"
NODE_MAJOR=20
SERVICE="game-of-life"

# Repo URL: read from instance metadata, else fall back to a constant you can edit.
REPO_URL="$(curl -fsSL -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/attributes/repo-url 2>/dev/null || true)"
REPO_URL="${REPO_URL:-https://github.com/YOU/game-of-life.git}"

if [[ "$REPO_URL" == *"/YOU/"* ]]; then
  echo "[startup] ERROR: repo-url is not set." >&2
  echo "[startup] Pass --metadata repo-url=https://github.com/your-user/your-repo.git" >&2
  echo "[startup] (or edit REPO_URL at the top of startup.sh)" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[startup] installing Node ${NODE_MAJOR}.x + git"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs git

# Dedicated unprivileged user to run the app as.
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "[startup] fetching code from $REPO_URL (branch $BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  sudo -u "$APP_USER" git clone --depth=1 -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "[startup] installing dependencies (better-sqlite3 pulls a prebuilt binary)"
sudo -u "$APP_USER" sh -c "cd '$APP_DIR' && (npm ci || npm install)"
sudo -u "$APP_USER" mkdir -p "$APP_DIR/data"

echo "[startup] installing systemd unit"
cat > "/etc/systemd/system/${SERVICE}.service" <<UNIT
[Unit]
Description=Conway's Game of Life
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node backend/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "${SERVICE}"
systemctl restart "${SERVICE}"

echo "[startup] done."
echo "[startup] Tail logs with: gcloud compute ssh game-of-life --zone=us-central1-a -- 'journalctl -u ${SERVICE} -f'"
