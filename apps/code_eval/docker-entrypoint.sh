#!/bin/sh
set -eu

# Bind mounts hide image-layer ownership. Repair only the shared storage mount,
# then drop privileges before starting the evaluator.
mkdir -p /data/files/permanent /data/files/evaluation-cache
chown -R appuser:appgroup /data/files
chmod 0750 /data/files /data/files/permanent /data/files/evaluation-cache
exec su-exec appuser:appgroup "$@"
