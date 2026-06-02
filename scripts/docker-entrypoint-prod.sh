#!/bin/sh
set -e

ENV_FILE="${NETWATCH_ENV_FILE:-/app/.env}"
ENSURE_SCRIPT="${NETWATCH_ENSURE_KEY_SCRIPT:-/usr/local/bin/ensure-env-encryption-key.mjs}"

if [ -f "$ENV_FILE" ] && [ -r "$ENSURE_SCRIPT" ]; then
  # shellcheck disable=SC1090
  eval "$(node "$ENSURE_SCRIPT" "$ENV_FILE" --export --quiet)"
fi

if [ "$(id -u)" = "0" ]; then
  exec runuser -u nextjs -- "$@"
fi

exec "$@"
