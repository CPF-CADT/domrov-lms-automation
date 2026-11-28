#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
temp_dir=$(mktemp -d)
trap 'rm -rf -- "$temp_dir"' EXIT
checkout="$temp_dir/repo"

# Clone Git metadata without carrying over the source repository's extensions.
git clone --quiet --local --no-hardlinks --no-checkout . "$checkout"
git -C "$checkout" read-tree HEAD
if origin=$(git remote get-url origin 2>/dev/null); then
  git -C "$checkout" remote set-url origin "$origin"
fi

# Include pending changes and new workflows while respecting ignore rules.
git ls-files --cached --others --exclude-standard -z |
  while IFS= read -r -d '' path; do
    if [[ -f $path || -L $path ]]; then
      mkdir -p "$checkout/$(dirname -- "$path")"
      cp -pP -- "$path" "$checkout/$path"
    fi
  done

cd "$checkout"
# The local cache server can fail to pick a bind address on macOS.
# These pull-request checks do not depend on the cache.
run_act() {
  local architecture=linux/amd64
  local runner_args=()
  case "$1" in
    */admin-ci.yml|*/react-client-ci.yml|admin-ci.yml|react-client-ci.yml)
      runner_args=(-P ubuntu-latest=node:22-bookworm --env DOMROV_LOCAL_NODE=1)
      if [[ $(uname -m) == arm64 ]]; then
        architecture=linux/arm64
      fi
      ;;
  esac
  shift
  act pull_request --container-architecture "$architecture" --no-cache-server \
    ${runner_args[@]+"${runner_args[@]}"} "$@"
}

args=("$@")
for ((i = 0; i < $#; i++)); do
  arg=${args[i]}
  case "$arg" in
    -W|--workflows)
      run_act "${args[i+1]:-}" "$@"
      exit
      ;;
    --workflows=*|-W=*)
      run_act "${arg#*=}" "$@"
      exit
      ;;
    -W?*)
      run_act "${arg#-W}" "$@"
      exit
      ;;
    -l|--list)
      run_act "" "$@"
      exit
      ;;
  esac
done

# Reusable workflow jobs can get the same Docker resource names in act.
# Wait for each workflow to finish and clean up before starting the next one.
status=0
for workflow in .github/workflows/[a-z]*-ci.yml; do
  printf '\nRunning %s\n' "$workflow"
  run_act "$workflow" --workflows "$workflow" "$@" || status=1
done
exit "$status"
