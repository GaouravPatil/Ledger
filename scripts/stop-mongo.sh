#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.data/mongod.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No project MongoDB process is running."
  exit 0
fi

PID="$(cat "$PID_FILE")"

if kill -0 "$PID" >/dev/null 2>&1; then
  kill "$PID"
  echo "Stopped MongoDB process $PID."
else
  echo "MongoDB process $PID is not running."
fi

rm -f "$PID_FILE"
