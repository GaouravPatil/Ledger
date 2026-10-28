#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${MONGO_PORT:-27018}"
DATA_DIR="$ROOT_DIR/.data/mongo"
LOG_FILE="$ROOT_DIR/.data/mongod.log"
PID_FILE="$ROOT_DIR/.data/mongod.pid"

if ! command -v mongod >/dev/null 2>&1; then
  echo "mongod is not installed. Use 'docker compose up -d' instead."
  exit 1
fi

mkdir -p "$DATA_DIR" "$ROOT_DIR/.data"

if mongosh --quiet --port "$PORT" --eval "db.runCommand({ ping: 1 }).ok" >/dev/null 2>&1; then
  if mongosh --quiet --port "$PORT" --eval "try { rs.status().ok } catch (e) { 0 }" | grep -q "1"; then
    echo "MongoDB replica set rs0 is already running on port $PORT."
    exit 0
  fi
  echo "Port $PORT is already in use by a MongoDB instance that is not running replica set rs0."
  echo "Stop that instance or set MONGO_PORT to a free port."
  exit 1
fi

mongod \
  --replSet rs0 \
  --port "$PORT" \
  --dbpath "$DATA_DIR" \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath "$LOG_FILE" \
  --pidfilepath "$PID_FILE"

for _ in $(seq 1 30); do
  if mongosh --quiet --port "$PORT" --eval "db.runCommand({ ping: 1 }).ok" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

mongosh --quiet --port "$PORT" --eval "
  try {
    rs.status();
  } catch (error) {
    rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:$PORT' }] });
  }
" >/dev/null

for _ in $(seq 1 30); do
  if mongosh --quiet --port "$PORT" --eval "db.hello().isWritablePrimary" | grep -q "true"; then
    echo "MongoDB replica set rs0 is ready on mongodb://127.0.0.1:$PORT"
    exit 0
  fi
  sleep 1
done

echo "MongoDB started but did not become primary. Check $LOG_FILE."
exit 1
