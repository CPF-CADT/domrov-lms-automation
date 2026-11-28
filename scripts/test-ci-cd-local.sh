#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
bash scripts/test-ci-local.sh "$@"
python3 scripts/test-cd-local.py
