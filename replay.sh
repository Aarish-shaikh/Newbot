#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not installed. Installing Node.js..."
    sudo apt-get update && sudo apt-get install -y nodejs
fi

echo "[*] Running Evolution API Replay Script..."
node "$SCRIPT_DIR/replay.js"
