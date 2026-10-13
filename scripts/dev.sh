#!/bin/sh
# Local Docker launcher; does not modify your shell or system installation.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if ! command -v docker >/dev/null 2>&1; then
  if [ -x /Applications/Docker.app/Contents/Resources/bin/docker ]; then
    PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
    export PATH
  else
    echo 'Install and start Docker Desktop, then try again.' >&2
    exit 1
  fi
fi
case "${1:-up}" in
  up)
    if [ ! -f .env ]; then python3 scripts/setup-env.py; fi
    docker info >/dev/null
    docker compose up -d --build --wait
    echo 'Margin Memory is ready at http://localhost:3000'
    ;;
  stop) docker compose stop ;;
  status) docker compose ps ;;
  logs) docker compose logs --tail=100 --follow ;;
  *) echo 'Usage: ./scripts/dev.sh [up|stop|status|logs]' >&2; exit 2 ;;
esac
