#!/bin/sh
set -eu
: "${BACKEND_HOST:?Set BACKEND_HOST to the backend public hostname (without https:// or a path)}"
# Restrict values inserted into nginx configuration to a DNS hostname.
if ! printf '%s' "$BACKEND_HOST" | LC_ALL=C grep -Eq '^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$'; then
    echo 'BACKEND_HOST must be a hostname without scheme, port, or path' >&2
    exit 1
fi
case "${PORT:-}" in
    ''|*[!0-9]*) echo 'PORT must be an integer between 1 and 65535' >&2; exit 1 ;;
esac
if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo 'PORT must be an integer between 1 and 65535' >&2
    exit 1
fi
