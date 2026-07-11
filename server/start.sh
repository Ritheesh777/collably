#!/usr/bin/env bash
set -e

# Start the embedded MongoDB only in "demo" mode — i.e. when no external
# MONGO_URI is supplied (or it points at localhost). Provide a MongoDB Atlas
# URI via the MONGO_URI env var to use a real, persistent database instead.
if [[ -z "$MONGO_URI" || "$MONGO_URI" == *"127.0.0.1"* || "$MONGO_URI" == *"localhost"* ]]; then
  export MONGO_URI="mongodb://127.0.0.1:27017/influconnect"
  echo "→ starting embedded MongoDB"
  mkdir -p /data/db
  mongod --dbpath /data/db --bind_ip 127.0.0.1 --wiredTigerCacheSizeGB 0.25 --logpath /tmp/mongod.log &

  echo "→ waiting for MongoDB to accept connections"
  for i in $(seq 1 60); do
    if mongosh --quiet --eval "db.runCommand({ping:1})" >/dev/null 2>&1; then
      echo "→ MongoDB ready"; break
    fi
    sleep 1
  done

  echo "→ seeding demo data"
  node src/seed/seed.js || echo "→ seed skipped/failed (continuing)"
fi

echo "→ starting API"
exec node src/index.js
