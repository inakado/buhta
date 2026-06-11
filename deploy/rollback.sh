#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ "${1:-}" = "" ]; then
	echo "Usage: ./rollback.sh <previous-git-sha>" >&2
	exit 1
fi

echo "Rolling back Buhta to image tag: $1"
"$SCRIPT_DIR/deploy.sh" "$1"
