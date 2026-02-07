#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script only supports Linux." >&2
  exit 1
fi

cd "$BACKEND_DIR"

echo "[backend] Building standalone backend binary (PyInstaller)..."
rm -rf build dist

uv run --with pyinstaller pyinstaller \
  --noconfirm \
  --clean \
  --onedir \
  --specpath build \
  --name tpi-redes-backend \
  --paths src \
  --collect-all scapy \
  src/tpi_redes/cli/main.py

BACKEND_BIN="$BACKEND_DIR/dist/tpi-redes-backend/tpi-redes-backend"
if [[ ! -f "$BACKEND_BIN" ]]; then
  echo "Backend binary not found at $BACKEND_BIN" >&2
  exit 1
fi

chmod +x "$BACKEND_BIN"

echo "[backend] OK -> $BACKEND_BIN"
