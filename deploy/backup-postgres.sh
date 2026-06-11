#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")
ENV_FILE=${BUHTA_ENV_FILE:-"$ROOT_DIR/.env.production"}
COMPOSE_FILE=${BUHTA_COMPOSE_FILE:-"$SCRIPT_DIR/compose.prod.yml"}
BACKUP_DIR=${BUHTA_BACKUP_DIR:-"$ROOT_DIR/backups/postgres"}

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing env file: $ENV_FILE" >&2
	exit 1
fi

set -a
. "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"

STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUT="$BACKUP_DIR/buhta-${POSTGRES_DB}-${STAMP}.dump"

cd "$SCRIPT_DIR"

i=0
until docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
	pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
	i=$((i + 1))
	if [ "$i" -ge 30 ]; then
		echo "Postgres is not ready for backup" >&2
		docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
		exit 1
	fi
	sleep 2
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
	pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT"

chmod 600 "$OUT"
echo "$OUT"
