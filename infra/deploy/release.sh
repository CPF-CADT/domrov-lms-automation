#!/usr/bin/env bash
set -euo pipefail
umask 077

target=${1:?deployment target required}
sha=${2:?commit SHA required}
run_number=${3:?CI run number required}
[[ $sha =~ ^[0-9a-f]{40}$ && $run_number =~ ^[1-9][0-9]{0,15}$ ]] || exit 2

case "$target" in
  user) tag_key=USER_IMAGE_TAG ;;
  academic-service) tag_key=ACADEMIC_IMAGE_TAG ;;
  payment-service) tag_key=PAYMENT_IMAGE_TAG ;;
  evaluation-service) tag_key=EVALUATION_IMAGE_TAG ;;
  client|admin) tag_key= ;;
  *) echo "Unknown deployment target: $target" >&2; exit 2 ;;
esac

exec 9>.deploy.lock
flock -w 300 9
state_dir=.deploy-state
mkdir -p "$state_dir"
state="$state_dir/$target"
if [[ -f $state ]]; then
  read -r deployed_run deployed_sha < "$state"
  if (( run_number < deployed_run )); then
    echo "Skipping older CI run $run_number for $target."
    exit 0
  fi
fi

compose() {
  docker compose --env-file "$1" -f compose.prod.yml "${@:2}"
}

stage=
link_dir=
cleanup() {
  if [[ -n $link_dir ]]; then rm -rf -- "$link_dir"; fi
  if [[ -n $stage ]]; then rm -rf -- "$stage"; fi
}
trap cleanup EXIT

if [[ -n $tag_key ]]; then
  # Compose gives exported variables precedence over --env-file.
  unset USER_IMAGE_TAG ACADEMIC_IMAGE_TAG PAYMENT_IMAGE_TAG EVALUATION_IMAGE_TAG
  previous_tag=$(awk -F= -v key="$tag_key" '$1 == key { sub(/^[^=]*=/, ""); value=$0 } END { print value }' .env.production)
  stage=$(mktemp .env.production.staged.XXXXXX)
  awk -F= -v key="$tag_key" -v sha="$sha" '
    $1 == key { if (!seen++) print key "=" sha; next }
    { print }
    END { if (!seen) print key "=" sha }
  ' .env.production > "$stage"

  compose "$stage" config --quiet
  compose "$stage" pull "$target"
  case "$target" in
    user|academic-service)
      compose "$stage" run --rm --no-deps --pull never "$target" npm run migration:run
      ;;
  esac
  if ! compose "$stage" up -d --no-deps --no-build --pull never --wait --wait-timeout 180 "$target"; then
    echo "Rollout failed for $target. Recorded release tags are unchanged. Check the running container and schema before rolling back." >&2
    exit 1
  fi
  printf '%s=%s\n' "$tag_key" "$previous_tag" > "$state_dir/$target.previous-tag"
  mv -f -- "$stage" .env.production
  stage=
else
  [[ -d frontend ]]
  mkdir -p frontend/.releases
  chmod a+x frontend/.releases
  stage=$(mktemp -d "frontend/.releases/$target-$sha.XXXXXX")
  tar --extract --no-same-owner --no-same-permissions -C "$stage"
  [[ -s $stage/index.html ]]
  chmod -R a+rX "$stage"
  link_dir=$(mktemp -d frontend/.deploy-link.XXXXXX)
  ln -s "${stage#frontend/}" "$link_dir/current"
  destination="frontend/$target"
  previous=
  if [[ -L $destination ]]; then
    previous=$(readlink "$destination")
  elif [[ -d $destination ]]; then
    previous=".releases/$target-bootstrap-$(basename "$link_dir")"
    mv -- "$destination" "frontend/$previous"
  fi
  mv -Tf -- "$link_dir/current" "$destination"
  stage=
  if ! compose .env.production exec -T gateway cmp -s "/srv/domrov/$target/index.html" - < "$destination/index.html"; then
    if [[ -n $previous ]]; then
      ln -s "$previous" "$link_dir/rollback"
      mv -Tf -- "$link_dir/rollback" "$destination"
    else
      rm -- "$destination"
    fi
    echo "Gateway could not read the new $target build. Check its frontend mount." >&2
    exit 1
  fi
  if [[ -n $previous ]]; then
    printf '%s\n' "$previous" > "$state_dir/$target.previous-frontend"
  fi
fi

printf '%s %s\n' "$run_number" "$sha" > "$state.tmp"
mv -f -- "$state.tmp" "$state"
echo "Deployed $target at $sha."
