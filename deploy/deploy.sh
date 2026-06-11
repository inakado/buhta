#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")
ENV_FILE=${BUHTA_ENV_FILE:-"$ROOT_DIR/.env.production"}
COMPOSE_FILE=${BUHTA_COMPOSE_FILE:-"$SCRIPT_DIR/compose.prod.yml"}

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing env file: $ENV_FILE" >&2
	exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ "${1:-}" != "" ]; then
	IMAGE_TAG="$1"
fi

if [ "${IMAGE_TAG:-}" = "" ] || [ "$IMAGE_TAG" = "replace-with-git-sha" ]; then
	echo "IMAGE_TAG is required. Usage: ./deploy.sh <git-sha>" >&2
	exit 1
fi

cd "$SCRIPT_DIR"

echo "Deploying Buhta image tag: $IMAGE_TAG"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres

echo "Creating pre-deploy database backup..."
"$SCRIPT_DIR/backup-postgres.sh"

echo "Running database migrations..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm api \
	pnpm --filter @buhta/api prisma:deploy

echo "Restarting application..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Waiting for health check..."
i=0
until curl -fsS "https://${BUHTA_DOMAIN}/health" >/dev/null; do
	i=$((i + 1))
	if [ "$i" -ge 30 ]; then
		echo "Health check failed: https://${BUHTA_DOMAIN}/health" >&2
		docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
		exit 1
	fi
	sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
echo "Deploy complete: $IMAGE_TAG"
