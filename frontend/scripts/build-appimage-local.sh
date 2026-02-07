#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script only supports Linux." >&2
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)
    ELECTRON_ARCH="x64"
    ;;
  aarch64|arm64)
    ELECTRON_ARCH="arm64"
    ;;
  *)
    echo "Unsupported Linux architecture: $ARCH" >&2
    exit 1
    ;;
esac

cd "$FRONTEND_DIR"

echo "[appimage] Target architecture: $ARCH ($ELECTRON_ARCH)"

npm run build:backend:linux
npm run build:renderer
npm run compile:electron
npx electron-builder --linux AppImage --"$ELECTRON_ARCH"

echo "[appimage] Build complete. Artifacts are in frontend/release/"
