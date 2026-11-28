#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
target=${1:?Expected deployment target}
container=backend
health_path=/health/ready

case "$target" in
  user) DEMO_PORT=3001 ;;
  academic-service) DEMO_PORT=3002; health_path=/api/academic/health/ready ;;
  payment-service) DEMO_PORT=3003 ;;
  evaluation-service) DEMO_PORT=3004 ;;
  code-execution) DEMO_PORT=3005 ;;
  admin|client)
    container=frontend
    DEMO_PORT=80
    health_path=/
    DEMO_FRONTEND_DIR=$(cd "${2:?Expected artifact directory}" && pwd)
    test -s "$DEMO_FRONTEND_DIR/index.html"
    DEMO_NGINX_CONFIG="$PWD/apps/admin/nginx.conf"
    if [[ "$target" == client ]]; then
      DEMO_NGINX_CONFIG="$PWD/apps/react-client/nginx.conf"
      printf '%s\n' 'window.__DOMROV_CONFIG__ = { apiBaseUrl: "https://api.example.invalid" };' \
        > "$DEMO_FRONTEND_DIR/runtime-config.js"
    fi
    export DEMO_FRONTEND_DIR DEMO_NGINX_CONFIG
    ;;
  *) printf 'Unknown demo target %s\n' "$target" >&2; exit 2 ;;
esac
export DEMO_PORT

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/domrov-demo.XXXXXXXXXX")
project="domrov-demo-${work_dir##*.}"
project=$(printf '%s' "$project" | tr '[:upper:]' '[:lower:]')
compose() {
  docker compose --env-file /dev/null -p "$project" -f infra/deploy/compose.demo.yml "$@"
}
cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 )); then
    compose logs --no-color --tail 100 >&2 || true
  fi
  compose down --volumes --remove-orphans || status=1
  rm -f "$work_dir/response"
  rmdir "$work_dir"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$container" == backend ]]; then
  : "${DEMO_IMAGE:?Expected the published image}"
  compose pull backend postgres rabbitmq
  compose up -d --no-build --pull never --wait --wait-timeout 120 postgres rabbitmq
  compose exec -T rabbitmq rabbitmqctl import_definitions /etc/rabbitmq/definitions.json
  case "$target" in
    user|academic-service) compose run --rm --no-deps --pull never backend npm run migration:run ;;
  esac
else
  compose pull frontend
fi
compose up -d --no-deps --no-build --pull never "$container"
address=$(compose port "$container" "$DEMO_PORT")
curl --fail --silent --show-error --retry 45 --retry-connrefused --retry-all-errors \
  --retry-delay 2 --retry-max-time 120 --max-time 5 \
  "http://$address$health_path" -o "$work_dir/response"
if [[ "$container" == frontend ]]; then
  cmp "$DEMO_FRONTEND_DIR/index.html" "$work_dir/response"
  if [[ "$target" == client ]]; then
    curl --fail --silent --show-error --max-time 5 "http://$address/runtime-config.js" -o "$work_dir/response"
    cmp "$DEMO_FRONTEND_DIR/runtime-config.js" "$work_dir/response"
  fi
else
  python3 -c 'import json, sys; sys.exit(json.load(sys.stdin).get("status") != "ok")' < "$work_dir/response"
  cat "$work_dir/response"
fi
printf '\n%s passed its HTTP check. Removing the demo stack.\n' "$target"
