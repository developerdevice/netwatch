#!/bin/sh
set -e
cd /app
if [ ! -x node_modules/.bin/next ]; then
  echo "netwatch dev: node_modules ausente no volume, a correr npm ci..."
  npm ci
fi
exec "$@"
